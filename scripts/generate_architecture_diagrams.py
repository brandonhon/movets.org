#!/usr/bin/env python3
"""Generate architecture diagrams for MoVets.org using the diagrams library.

Usage:
    source .venv/bin/activate
    python scripts/generate_architecture_diagrams.py

Outputs PNGs to docs/architecture/
"""

import os

from diagrams import Cluster, Diagram, Edge
from diagrams.aws.storage import S3
from diagrams.onprem.client import User, Users
from diagrams.generic.database import SQL
from diagrams.onprem.network import Internet
from diagrams.programming.flowchart import Document
from diagrams.programming.language import JavaScript, Nodejs
from diagrams.saas.cdn import Cloudflare

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs", "architecture")
os.makedirs(OUT_DIR, exist_ok=True)

GRAPH_ATTR = {
    "fontsize": "14",
    "fontname": "Inter",
    "bgcolor": "white",
    "pad": "0.5",
    "nodesep": "0.8",
    "ranksep": "1.0",
}

NODE_ATTR = {
    "fontsize": "12",
    "fontname": "Inter",
}

EDGE_ATTR = {
    "fontsize": "10",
    "fontname": "Inter",
}


# ---------------------------------------------------------------------------
# Diagram 1: High-Level System Architecture
# ---------------------------------------------------------------------------
def system_architecture():
    with Diagram(
        "MoVets.org - System Architecture",
        filename=os.path.join(OUT_DIR, "system_architecture"),
        show=False,
        direction="LR",
        graph_attr=GRAPH_ATTR,
        node_attr=NODE_ATTR,
        edge_attr=EDGE_ATTR,
    ):
        user = User("Visitor")

        with Cluster("Static Site\n(site/)"):
            pages = Document("6 HTML Pages")
            js = JavaScript("Vanilla JS\n(map, form, lookup)")
            leaflet = Document("Leaflet.js\nInteractive Map")

        with Cluster("Cloudflare"):
            worker = Cloudflare("Worker\n(API)")
            d1 = SQL("D1 Database\n(SQLite)")
            turnstile = Cloudflare("Turnstile\n(CAPTCHA)")

        with Cluster("Email"):
            brevo = Internet("Brevo API\n(Transactional Email)")

        with Cluster("External APIs"):
            nominatim = Internet("Nominatim\n(OpenStreetMap)")
            census = Internet("Census\nGeocoder")

        with Cluster("Data"):
            geojson = Document("GeoJSON\n163 Districts")

        user >> Edge(label="HTTPS") >> pages
        pages >> js
        js >> leaflet
        leaflet >> Edge(label="load") >> geojson
        js >> Edge(label="ZIP lookup", style="dashed") >> nominatim
        js >> Edge(label="fallback", style="dashed") >> census
        js >> Edge(label="verify") >> turnstile
        js >> Edge(label="POST /send-email") >> worker
        worker >> Edge(label="rate limit\n+ log") >> d1
        worker >> Edge(label="send") >> brevo


# ---------------------------------------------------------------------------
# Diagram 2: Contact Form Request Flow
# ---------------------------------------------------------------------------
def request_flow():
    with Diagram(
        "Contact Form - Request Flow",
        filename=os.path.join(OUT_DIR, "request_flow"),
        show=False,
        direction="LR",
        graph_attr=GRAPH_ATTR,
        node_attr=NODE_ATTR,
        edge_attr=EDGE_ATTR,
    ):
        user = User("Constituent")

        with Cluster("Browser"):
            form = Document("Contact Form\n+ Turnstile")
            validate = JavaScript("Client-side\nValidation")

        with Cluster("Cloudflare Worker"):
            with Cluster("Checks"):
                ts_verify = Nodejs("Verify\nTurnstile")
                honeypot = Nodejs("Honeypot\nCheck")
                email_check = Nodejs("1 per email\n(D1 lookup)")
                ip_check = Nodejs("3 per IP\n(D1 count)")

            d1 = SQL("D1\nEmail Log")

        brevo = Internet("Brevo API\nSend Email")
        rep = Users("MO State\nRepresentative")

        user >> Edge(label="fill & submit") >> form
        form >> validate
        validate >> Edge(label="POST JSON\n+ turnstile token") >> ts_verify
        ts_verify >> honeypot >> email_check >> ip_check
        ip_check >> Edge(label="send email") >> brevo
        ip_check >> Edge(label="log") >> d1
        brevo >> Edge(label="email delivered") >> rep


# ---------------------------------------------------------------------------
# Diagram 3: ZIP-to-District Geocoding Flow
# ---------------------------------------------------------------------------
def geocoding_flow():
    with Diagram(
        "ZIP-to-District Geocoding Flow",
        filename=os.path.join(OUT_DIR, "geocoding_flow"),
        show=False,
        direction="TB",
        graph_attr=GRAPH_ATTR,
        node_attr=NODE_ATTR,
        edge_attr=EDGE_ATTR,
    ):
        user = User("User enters ZIP")

        with Cluster("Step 1: ZIP to Coordinates"):
            nominatim = Internet("Nominatim API\n(OpenStreetMap)")
            census_geo = Internet("Census Geocoder\n(fallback)")

        with Cluster("Step 2: Coordinates to District"):
            with Cluster("If map is loaded"):
                pip = JavaScript("Point-in-Polygon\n(client-side GeoJSON)")
            with Cluster("If no map"):
                census_rev = Internet("Census Reverse\nGeocoder (layer 54)")

        with Cluster("Result"):
            result = Document("District + Rep Info\n(name, party, email)")

        user >> Edge(label="5-digit ZIP") >> nominatim
        nominatim >> Edge(label="fail", style="dashed", color="red") >> census_geo
        nominatim >> Edge(label="lat/lon") >> pip
        census_geo >> Edge(label="lat/lon") >> pip
        nominatim >> Edge(label="lat/lon", style="dashed") >> census_rev
        census_geo >> Edge(label="lat/lon", style="dashed") >> census_rev
        pip >> Edge(label="match") >> result
        census_rev >> Edge(label="district #", style="dashed") >> result


# ---------------------------------------------------------------------------
# Diagram 4: Build & Deployment Pipeline
# ---------------------------------------------------------------------------
def build_deploy():
    with Diagram(
        "Build & Deployment Pipeline",
        filename=os.path.join(OUT_DIR, "build_deploy"),
        show=False,
        direction="LR",
        graph_attr=GRAPH_ATTR,
        node_attr=NODE_ATTR,
        edge_attr=EDGE_ATTR,
    ):
        with Cluster("Source (site/)"):
            html = Document("*.html\n(6 pages)")
            tailwind_in = Document("tailwind.css\n+ config")
            js_src = JavaScript("js/*.js\n(3 modules)")
            geojson = Document("GeoJSON\ndistrict data")

        with Cluster("Build Tools"):
            tailwind = Nodejs("Tailwind CSS CLI\nnpm run build")
            docker = Nodejs("Docker Build\n(nginx:alpine)")
            tf = Nodejs("Terraform\n(Cloudflare)")
            wrangler = Nodejs("Wrangler\n(Worker deploy)")

        with Cluster("Deployment"):
            container = S3("Docker Container\n(nginx:8080)")
            cf_worker = Cloudflare("CF Worker\n(API)")

        tailwind_in >> tailwind
        html >> Edge(label="scan classes") >> tailwind
        js_src >> Edge(label="scan classes") >> tailwind

        tailwind >> docker
        html >> docker
        js_src >> docker
        geojson >> docker
        docker >> Edge(label="image") >> container

        tf >> Edge(label="infra") >> cf_worker
        wrangler >> Edge(label="code") >> cf_worker


if __name__ == "__main__":
    print("Generating diagrams...")
    system_architecture()
    print("  [1/4] System Architecture")
    request_flow()
    print("  [2/4] Request Flow")
    geocoding_flow()
    print("  [3/4] Geocoding Flow")
    build_deploy()
    print("  [4/4] Build & Deploy")
    print(f"\nDone! Diagrams saved to {os.path.abspath(OUT_DIR)}/")
