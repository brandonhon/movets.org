<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title><xsl:value-of select="/rss/channel/title"/> — RSS Feed</title>
        <meta name="robots" content="noindex"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet"/>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #F7F8F9;
            color: #0E121E;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
          }
          .header {
            background: #FF344C;
            color: #fff;
            padding: 40px 24px;
          }
          .header-inner {
            max-width: 820px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
          }
          .logo {
            width: 48px;
            height: 48px;
            background: #fff;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .header h1 {
            font-size: 26px;
            font-weight: 800;
            margin: 0 0 4px;
            color: #fff;
          }
          .header p {
            font-size: 15px;
            margin: 0;
            color: rgba(255,255,255,0.9);
          }
          .notice {
            background: #FFF5E6;
            border-left: 4px solid #F59E0B;
            padding: 16px 20px;
            margin: 24px auto 0;
            max-width: 780px;
            border-radius: 6px;
            font-size: 14px;
            color: #7A5A00;
          }
          .notice strong { color: #5A4200; }
          main {
            max-width: 820px;
            margin: 0 auto;
            padding: 40px 24px 80px;
          }
          .tag {
            display: inline-block;
            background: #FFEFF1;
            color: #FF344C;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            padding: 5px 12px;
            border-radius: 999px;
            margin-bottom: 12px;
          }
          .item {
            background: #fff;
            border: 1px solid #E6E7EB;
            border-radius: 12px;
            padding: 28px 32px;
            margin-bottom: 20px;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
          }
          .item:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(14, 18, 30, 0.08);
          }
          .item h2 {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 10px;
            line-height: 1.3;
            color: #0E121E;
          }
          .item h2 a {
            color: inherit;
            text-decoration: none;
          }
          .item h2 a:hover { color: #FF344C; }
          .item .meta {
            font-size: 13px;
            color: #717379;
            margin-bottom: 10px;
          }
          .item p {
            font-size: 15px;
            line-height: 25px;
            color: #53565E;
            margin: 0 0 14px;
          }
          .item .read-more {
            color: #FF344C;
            font-weight: 600;
            font-size: 14px;
            text-decoration: none;
          }
          .item .read-more:hover { text-decoration: underline; }
          .cta {
            text-align: center;
            padding: 32px 0 0;
          }
          .cta a {
            display: inline-block;
            background: #FF344C;
            color: #fff;
            font-weight: 600;
            padding: 12px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-size: 15px;
          }
          .cta a:hover { background: #e62940; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-inner">
            <div class="logo">
              <svg width="30" height="30" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="36" height="36" rx="8" fill="#FF344C"/>
                <path d="M10 18L14 10L18 18L22 10L26 18" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 24H28" stroke="#FFF" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <h1><xsl:value-of select="/rss/channel/title"/></h1>
              <p><xsl:value-of select="/rss/channel/description"/></p>
            </div>
          </div>
        </div>

        <div class="notice">
          <strong>This is an RSS feed.</strong> Copy the URL from your browser's address bar into a feed reader (Feedly, NetNewsWire, Inoreader, etc.) to subscribe to updates on Missouri HB2089.
        </div>

        <main>
          <span class="tag">Latest Updates</span>
          <xsl:for-each select="/rss/channel/item">
            <article class="item">
              <h2>
                <a>
                  <xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute>
                  <xsl:value-of select="title"/>
                </a>
              </h2>
              <div class="meta">
                <xsl:value-of select="pubDate"/>
              </div>
              <p><xsl:value-of select="description"/></p>
              <a class="read-more">
                <xsl:attribute name="href"><xsl:value-of select="link"/></xsl:attribute>
                Read more &#8594;
              </a>
            </article>
          </xsl:for-each>

          <div class="cta">
            <a>
              <xsl:attribute name="href"><xsl:value-of select="/rss/channel/link"/></xsl:attribute>
              Visit MoVets.org
            </a>
          </div>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
