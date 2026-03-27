#!/usr/bin/env python3
"""
MoVets.org Email Log Visualizer

Syncs email logs from DynamoDB to a local SQLite database,
then generates visualizations of the data.

Usage:
    python3 scripts/visualize.py                  # Sync from DynamoDB + visualize
    python3 scripts/visualize.py --local-only     # Visualize existing local DB only
    python3 scripts/visualize.py --export-csv     # Export DB to CSV

Requires: pip install boto3 matplotlib
"""

import argparse
import csv
import os
import sqlite3
from collections import Counter
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'email_log.db')
DYNAMO_TABLE = 'movets-email-log'

MESSAGE_TYPES = {
    1: 'Base Support',
    2: 'Support + Revisions',
}


def init_db(conn):
    conn.execute('''
        CREATE TABLE IF NOT EXISTS email_log (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            sender_email TEXT NOT NULL,
            sender_zip TEXT NOT NULL,
            rep_email TEXT NOT NULL,
            rep_name TEXT DEFAULT '',
            district TEXT DEFAULT '',
            message_type INTEGER NOT NULL DEFAULT 1
        )
    ''')
    conn.execute('''
        CREATE INDEX IF NOT EXISTS idx_timestamp ON email_log(timestamp)
    ''')
    conn.execute('''
        CREATE INDEX IF NOT EXISTS idx_district ON email_log(district)
    ''')
    conn.execute('''
        CREATE INDEX IF NOT EXISTS idx_rep_email ON email_log(rep_email)
    ''')
    conn.commit()


def sync_from_dynamodb(conn):
    try:
        import boto3
    except ImportError:
        print('boto3 not installed. Run: pip install boto3')
        print('Skipping DynamoDB sync.')
        return 0

    client = boto3.resource('dynamodb', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
    table = client.Table(DYNAMO_TABLE)

    print(f'Scanning DynamoDB table: {DYNAMO_TABLE}...')
    items = []
    response = table.scan()
    items.extend(response.get('Items', []))
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response.get('Items', []))

    inserted = 0
    for item in items:
        try:
            conn.execute('''
                INSERT OR IGNORE INTO email_log
                    (id, timestamp, sender_name, sender_email, sender_zip,
                     rep_email, rep_name, district, message_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                item['id'],
                item['timestamp'],
                item.get('sender_name', ''),
                item.get('sender_email', ''),
                item.get('sender_zip', ''),
                item.get('rep_email', ''),
                item.get('rep_name', ''),
                item.get('district', ''),
                int(item.get('message_type', 1)),
            ))
            inserted += conn.total_changes
        except sqlite3.IntegrityError:
            pass

    conn.commit()
    print(f'Synced {len(items)} records from DynamoDB ({inserted} new).')
    return len(items)


def get_stats(conn):
    cur = conn.cursor()

    total = cur.execute('SELECT COUNT(*) FROM email_log').fetchone()[0]
    if total == 0:
        return None

    stats = {'total': total}

    # By message type
    rows = cur.execute(
        'SELECT message_type, COUNT(*) FROM email_log GROUP BY message_type'
    ).fetchall()
    stats['by_type'] = {MESSAGE_TYPES.get(r[0], f'Type {r[0]}'): r[1] for r in rows}

    # By district (top 20)
    rows = cur.execute(
        'SELECT district, COUNT(*) as c FROM email_log '
        'WHERE district != "" GROUP BY district ORDER BY c DESC LIMIT 20'
    ).fetchall()
    stats['top_districts'] = rows

    # By representative (top 20)
    rows = cur.execute(
        'SELECT rep_name, rep_email, COUNT(*) as c FROM email_log '
        'WHERE rep_name != "" GROUP BY rep_email ORDER BY c DESC LIMIT 20'
    ).fetchall()
    stats['top_reps'] = rows

    # By ZIP (top 20)
    rows = cur.execute(
        'SELECT sender_zip, COUNT(*) as c FROM email_log '
        'GROUP BY sender_zip ORDER BY c DESC LIMIT 20'
    ).fetchall()
    stats['top_zips'] = rows

    # By date
    rows = cur.execute(
        'SELECT DATE(timestamp) as d, COUNT(*) as c FROM email_log '
        'GROUP BY d ORDER BY d'
    ).fetchall()
    stats['by_date'] = rows

    # Unique senders
    stats['unique_senders'] = cur.execute(
        'SELECT COUNT(DISTINCT sender_email) FROM email_log'
    ).fetchone()[0]

    # Unique reps contacted
    stats['unique_reps'] = cur.execute(
        'SELECT COUNT(DISTINCT rep_email) FROM email_log'
    ).fetchone()[0]

    # Date range
    stats['first'] = cur.execute(
        'SELECT MIN(timestamp) FROM email_log'
    ).fetchone()[0]
    stats['last'] = cur.execute(
        'SELECT MAX(timestamp) FROM email_log'
    ).fetchone()[0]

    return stats


def print_summary(stats):
    if not stats:
        print('\nNo email records found in the database.')
        return

    print('\n' + '=' * 60)
    print('  MoVets.org Email Log Summary')
    print('=' * 60)
    print(f'  Total emails sent:     {stats["total"]}')
    print(f'  Unique senders:        {stats["unique_senders"]}')
    print(f'  Unique reps contacted: {stats["unique_reps"]}')
    print(f'  Date range:            {stats["first"][:10]} to {stats["last"][:10]}')
    print()

    print('  By Message Type:')
    for mtype, count in stats['by_type'].items():
        pct = count / stats['total'] * 100
        print(f'    {mtype:25s} {count:5d}  ({pct:.1f}%)')
    print()

    if stats['top_districts']:
        print('  Top 10 Districts:')
        for dist, count in stats['top_districts'][:10]:
            print(f'    District {dist:>4s}           {count:5d}')
        print()

    if stats['top_reps']:
        print('  Top 10 Representatives:')
        for name, email, count in stats['top_reps'][:10]:
            print(f'    {name:30s} {count:5d}')
        print()

    if stats['top_zips']:
        print('  Top 10 ZIP Codes:')
        for z, count in stats['top_zips'][:10]:
            print(f'    {z}                      {count:5d}')

    print('=' * 60)


def generate_charts(stats):
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import matplotlib.dates as mdates
    except ImportError:
        print('matplotlib not installed. Run: pip install matplotlib')
        print('Skipping chart generation.')
        return

    if not stats or stats['total'] == 0:
        print('No data to chart.')
        return

    out_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('MoVets.org — Email Campaign Dashboard', fontsize=18, fontweight='bold', y=0.98)
    plt.subplots_adjust(hspace=0.35, wspace=0.3, top=0.92)

    colors = ['#FF344C', '#26385E', '#BEC1C8', '#FFEFF1']

    # 1. Emails over time
    ax = axes[0][0]
    if stats['by_date']:
        dates = [datetime.strptime(d, '%Y-%m-%d') for d, _ in stats['by_date']]
        counts = [c for _, c in stats['by_date']]
        ax.bar(dates, counts, color='#FF344C', width=0.8)
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
        ax.xaxis.set_major_locator(mdates.AutoDateLocator())
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
    ax.set_title('Emails Sent Per Day', fontweight='bold')
    ax.set_xlabel('Date')
    ax.set_ylabel('Emails')

    # 2. Message type breakdown
    ax = axes[0][1]
    types = list(stats['by_type'].keys())
    type_counts = list(stats['by_type'].values())
    ax.pie(type_counts, labels=types, autopct='%1.1f%%', colors=colors[:len(types)],
           startangle=90, textprops={'fontsize': 11})
    ax.set_title('Message Types', fontweight='bold')

    # 3. Top districts
    ax = axes[1][0]
    if stats['top_districts']:
        districts = [f'D-{d}' for d, _ in stats['top_districts'][:15]]
        d_counts = [c for _, c in stats['top_districts'][:15]]
        bar_colors = ['#FF344C'] * len(districts)
        ax.barh(districts[::-1], d_counts[::-1], color=bar_colors[::-1])
    ax.set_title('Top Districts by Email Volume', fontweight='bold')
    ax.set_xlabel('Emails')

    # 4. Top reps
    ax = axes[1][1]
    if stats['top_reps']:
        rep_names = [n[:20] for n, _, _ in stats['top_reps'][:15]]
        r_counts = [c for _, _, c in stats['top_reps'][:15]]
        ax.barh(rep_names[::-1], r_counts[::-1], color='#26385E')
    ax.set_title('Top Representatives by Email Volume', fontweight='bold')
    ax.set_xlabel('Emails')

    chart_path = os.path.join(out_dir, 'email_dashboard.png')
    fig.savefig(chart_path, dpi=150, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    print(f'\nDashboard saved to: {chart_path}')


def export_csv(conn):
    out_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'email_log.csv')
    cur = conn.cursor()
    rows = cur.execute('SELECT * FROM email_log ORDER BY timestamp').fetchall()
    cols = [desc[0] for desc in cur.description]

    with open(out_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(cols)
        writer.writerows(rows)

    print(f'Exported {len(rows)} records to: {out_path}')


def main():
    parser = argparse.ArgumentParser(description='MoVets.org Email Log Visualizer')
    parser.add_argument('--local-only', action='store_true',
                        help='Skip DynamoDB sync, use local DB only')
    parser.add_argument('--export-csv', action='store_true',
                        help='Export database to CSV')
    args = parser.parse_args()

    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)

    if not args.local_only:
        sync_from_dynamodb(conn)

    if args.export_csv:
        export_csv(conn)
    else:
        stats = get_stats(conn)
        print_summary(stats)
        generate_charts(stats)

    conn.close()


if __name__ == '__main__':
    main()
