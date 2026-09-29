#!/usr/bin/env python3
"""Fetch today's lunch menus and write products/lunch/{index.html, feed.xml, lunch.json}.

Standard library only. Run hourly on weekday mornings: restaurants already found today
are kept, only missing ones are fetched again, and nothing is written if nothing changed.
Set LUNCH_DATE=YYYY-MM-DD to test another day.
"""
import html
import json
import os
import re
import sys
import urllib.request
from datetime import date, datetime
from email.utils import format_datetime
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Helsinki")
OUT = Path(__file__).resolve().parents[2] / "products" / "lunch"
SITE_URL = "https://punkq.com/products/lunch/"
FEED_DAYS = 10
WEEKDAYS = ["maanantai", "tiistai", "keskiviikko", "torstai", "perjantai", "lauantai", "sunnuntai"]
SHORT = ["ma", "ti", "ke", "to", "pe", "la", "su"]

RESTAURANTS = [
    {"key": "hansasali", "name": "Pegasus Hansasali", "hours": "10.30–14.30",
     "url": "https://www.pegasus-ravintolat.fi/hansasali#lounaslista", "kind": "image"},
    {"key": "linja", "name": "3. Linja", "hours": "10.30–14.00",
     "url": "https://kolmaslinja.fi/lounas-turku/", "kind": "text",
     "week_check": True, "stops": ["Lihojen alkuperämaat"]},
    {"key": "gatorade", "name": "Gatorade Center (TPS-lounas)", "hours": "11.00–14.00",
     "url": "https://gatoradecenter.fi/fi/lounas", "kind": "text", "stops": ["Hinnat"]},
    {"key": "varikko", "name": "Lounasravinteli Varikko", "hours": "10.30–14.00",
     "url": "https://www.lounasverkko.fi/lounasravintelivarikko", "kind": "text",
     "stops": ["Pidätämme"]},
    {"key": "herkku", "name": "Teboil Herkku", "hours": "10.00–16.00",
     "url": "https://www.tbherkku.fi/ravintola/", "kind": "text"},
]


def fetch(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; punkq-lunch/1.0; +https://punkq.com/products/lunch/)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


class TextLines(HTMLParser):
    BLOCK = {"p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "td", "th",
             "section", "article", "ul", "ol", "table", "span"}
    SKIP = {"script", "style", "noscript", "svg"}

    def __init__(self):
        super().__init__()
        self.parts, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        self.skip += tag in self.SKIP
        if tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP:
            self.skip = max(0, self.skip - 1)
        if tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def page_lines(page):
    parser = TextLines()
    parser.feed(page)
    lines = (re.sub(r"\s+", " ", l.replace("​", "")).strip() for l in "".join(parser.parts).split("\n"))
    return [l for l in lines if l]


def today_text(page, day, r):
    """Lines between today's weekday heading and the next weekday heading (or a stop marker)."""
    lines = page_lines(page)
    if r.get("week_check"):
        weeks = [int(m.group(1)) for l in lines if (m := re.match(r"vko\s*(\d+)$", l, re.I))]
        if day.isocalendar().week not in weeks:
            return None
    name = WEEKDAYS[day.weekday()]
    for i, line in enumerate(lines):
        if not line.lower().startswith(name):
            continue
        m = re.search(r"(\d{1,2})\.(\d{1,2})\.", line)
        if m and (int(m.group(1)), int(m.group(2))) != (day.day, day.month):
            continue  # same weekday, other date (e.g. next week or an event list)
        if not m and not r.get("week_check"):
            continue
        # keep extra words in the heading, e.g. "PERJANTAI – STEAK FRIDAY"
        extra = re.sub(r"^\w+\s*|\d{1,2}\.\d{1,2}\.(\d{4})?|[*–-]", " ", line).strip()
        found = [extra.title()] if extra else []
        for nxt in lines[i + 1:]:
            low = nxt.lower()
            if any(low.startswith(w) for w in WEEKDAYS) or any(nxt.startswith(s) for s in r.get("stops", [])):
                break
            found.append(nxt.lstrip("•· ").strip())
        return [l for l in found if l] or None
    return None


def today_image(page, day):
    """Weekly menu image, only if its 'vko NN' matches the current ISO week."""
    for m in re.finditer(r'https://[^"\s]+?vko(?:%20|\s)*(\d+)\.(?:png|jpe?g|webp)', page, re.I):
        if int(m.group(1)) == day.isocalendar().week:
            return m.group(0)
    return None


def scrape(r, day):
    try:
        page = fetch(r["url"])
        if r["kind"] == "image":
            img = today_image(page, day)
            return {"image": img} if img else {}
        lines = today_text(page, day, r)
        return {"lines": lines} if lines else {}
    except Exception as e:  # one broken site must never break the run
        print(f"{r['key']}: {e}", file=sys.stderr)
        return {}


def found(result):
    return bool(result.get("lines") or result.get("image"))


def menus_html(results):
    parts = []
    for r in RESTAURANTS:
        res = results.get(r["key"], {})
        parts.append(f'<h3><a href="{html.escape(r["url"])}">{html.escape(r["name"])}</a></h3>')
        if res.get("image"):
            parts.append(f'<p><img src="{html.escape(res["image"])}" alt="{html.escape(r["name"])} viikon lounaslista" style="max-width:100%"></p>')
        elif res.get("lines"):
            parts.append("<ul>" + "".join(f"<li>{html.escape(l)}</li>" for l in res["lines"]) + "</ul>")
        else:
            parts.append(f'<p>Ei löytynyt vielä. <a href="{html.escape(r["url"])}">Katso ravintolan sivu</a></p>')
    return "\n".join(parts)


def page_html(day, updated, results):
    cards = []
    for r in RESTAURANTS:
        res = results.get(r["key"], {})
        if res.get("image"):
            body = (f'<a href="{html.escape(res["image"])}"><img src="{html.escape(res["image"])}" '
                    f'alt="{html.escape(r["name"])} viikon lounaslista" loading="lazy"></a>')
        elif res.get("lines"):
            body = "<ul>" + "".join(f"<li>{html.escape(l)}</li>" for l in res["lines"]) + "</ul>"
        else:
            body = f'<p class="lunch-note">Tämän päivän listaa ei löytynyt. <a href="{html.escape(r["url"])}">Katso ravintolan sivu</a></p>'
        cards.append(f"""        <section class="legal-section lunch-card">
            <h2><a href="{html.escape(r["url"])}">{html.escape(r["name"])}</a></h2>
            <p class="lunch-hours">Lounas {r["hours"]}</p>
            {body}
        </section>""")
    title = f"Lounas {SHORT[day.weekday()]} {day.day}.{day.month}."
    return f"""<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <link rel="stylesheet" href="../../style.css">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap">
    <link rel="icon" href="../../favicon.ico" type="image/x-icon">
    <link rel="alternate" type="application/rss+xml" title="Lounas" href="feed.xml">
    <title>{title} | punkQ</title>
    <style>
        .lunch-card {{ margin-bottom: 20px; padding: 24px; }}
        .lunch-card h2 {{ margin-top: 0; }}
        .lunch-card h2 a {{ color: var(--text); text-decoration: none; }}
        .lunch-card ul {{ margin-bottom: 0; }}
        .lunch-card li {{ margin-bottom: 4px; }}
        .lunch-card img {{ width: 100%; border-radius: 12px; margin-top: 8px; }}
        .lunch-hours, .lunch-note {{ font-size: 14px; }}
        @media (max-width: 600px) {{ .legal-page {{ padding: 48px 16px; }} .lunch-card {{ padding: 18px; }} }}
    </style>
</head>
<body>
    <main class="legal-page">
        <div class="legal-header">
            <a class="back-link" href="/products/">← Products</a>
            <h1>{title}</h1>
            <p>Päivitetty {updated} · <a href="feed.xml" style="color:var(--glow)">RSS</a></p>
        </div>
{chr(10).join(cards)}
    </main>
</body>
</html>
"""


def feed_xml(items):
    entries = []
    for it in items:
        d = date.fromisoformat(it["date"])
        pub = format_datetime(datetime(d.year, d.month, d.day, 6, 0, tzinfo=TZ))
        entries.append(f"""  <item>
    <title>{html.escape(it["title"])}</title>
    <link>{SITE_URL}</link>
    <guid isPermaLink="false">lounas-{it["date"]}</guid>
    <pubDate>{pub}</pubDate>
    <description><![CDATA[{it["html"].replace("]]>", "]]&gt;")}]]></description>
  </item>""")
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Lounas – punkQ</title>
  <link>{SITE_URL}</link>
  <description>Päivän lounaslistat lähiravintoloista</description>
  <language>fi</language>
{chr(10).join(entries)}
</channel>
</rss>
"""


def main():
    now = datetime.now(TZ)
    day = date.fromisoformat(os.environ["LUNCH_DATE"]) if os.environ.get("LUNCH_DATE") else now.date()
    if day.weekday() >= 5:
        print("Weekend, nothing to do.")
        return

    state_file = OUT / "lunch.json"
    state = json.loads(state_file.read_text()) if state_file.exists() else {}
    same_day = state.get("date") == day.isoformat()
    results = state.get("restaurants", {}) if same_day else {}

    missing = [r for r in RESTAURANTS if not found(results.get(r["key"], {}))]
    if same_day and not missing:
        print("All menus already found today.")
        return

    new = 0
    for r in missing:
        res = scrape(r, day)
        new += found(res)
        results[r["key"]] = res
        print(f"{r['key']}: {'found' if found(res) else 'missing'}")

    if same_day and not new:
        print("Nothing new, no changes written.")
        return

    updated = now.strftime("%-d.%-m. klo %H.%M")
    title = f"Lounas {SHORT[day.weekday()]} {day.day}.{day.month}."
    feed = [f for f in state.get("feed", []) if f["date"] != day.isoformat()]
    feed = ([{"date": day.isoformat(), "title": title, "html": menus_html(results)}] + feed)[:FEED_DAYS]

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "index.html").write_text(page_html(day, updated, results))
    (OUT / "feed.xml").write_text(feed_xml(feed))
    state_file.write_text(json.dumps(
        {"date": day.isoformat(), "updated": updated, "restaurants": results, "feed": feed},
        ensure_ascii=False, indent=1) + "\n")
    print(f"Wrote {OUT} ({sum(found(v) for v in results.values())}/{len(RESTAURANTS)} found)")


if __name__ == "__main__":
    main()
