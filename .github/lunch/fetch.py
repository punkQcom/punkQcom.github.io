#!/usr/bin/env python3
"""Fetch today's and tomorrow's lunch menus; write products/lunch/{index.html, feed.xml, lunch.json}.

Standard library only. Every run tops up whatever is still missing for today and the next
weekday, so it does not matter when GitHub's scheduler actually fires: a run at 21.00 fills
the day ahead, a run at 03.00 or 13.30 fills whatever today is still missing. On a Friday
the day ahead is Monday, so the weekend's runs keep trying for it. Results already found are
kept and nothing is written if nothing changed. The day ahead stays off the page and out of
the feed until it has menus. Set LUNCH_DATE=YYYY-MM-DD to fetch one specific day.

Hansasali publishes one picture per week, so it is stored per ISO week and shown once.
"""
import html
import json
import os
import re
import sys
import urllib.request
from datetime import date, datetime, timedelta
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
     "url": "https://www.tbherkku.fi/ravintola/", "kind": "text", "notes": ["Kaikkiin"]},
    {"key": "siskot", "name": "Ravintola Siskot", "hours": "10.30–15.00",
     "url": "https://www.umai.fi/siskot", "kind": "text", "stops": ["L=laktoositon"]},
]

WEEKLY = [r for r in RESTAURANTS if r["kind"] == "image"]
DAILY = [r for r in RESTAURANTS if r["kind"] != "image"]


def week_key(day):
    cal = day.isocalendar()
    return f"{cal.year}-{cal.week:02d}"


def next_weekday(day):
    """The next day that serves lunch — from Friday (or the weekend) that is Monday."""
    day += timedelta(days=1)
    while day.weekday() >= 5:
        day += timedelta(days=1)
    return day


def week_days(day):
    """Mon–Fri of that day's week."""
    monday = day - timedelta(days=day.weekday())
    return [monday + timedelta(days=i) for i in range(5)]


def has_lists(results):
    return any(r.get("lines") for r in results.values())


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
    lines = (re.sub(r"\s+", " ", re.sub("[\u200b\u200d]", "", l)).strip() for l in "".join(parser.parts).split("\n"))
    return [l for l in lines if l]


# colon only: "16.10." is a date, "18:30" is a kick-off time
CLOCK = re.compile(r"\b\d{1,2}:\d{2}\b")


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
        if CLOCK.search(line):
            continue  # a fixture, not a menu: Gatorade lists home games as "Perjantai 16.10. 18:30"
        m = re.search(r"(\d{1,2})\.(\d{1,2})\b", line)
        if m and (int(m.group(1)), int(m.group(2))) != (day.day, day.month):
            continue  # same weekday, other date (e.g. next week or an event list)
        if not m and not r.get("week_check"):
            continue
        # keep extra words in the heading, e.g. "PERJANTAI – STEAK FRIDAY"
        extra = re.sub(r"^\w+\s*|\d{1,2}\.\d{1,2}\.?(\d{4})?|[*–-]", " ", line).strip()
        found = [extra.title()] if extra else []
        for nxt in lines[i + 1:]:
            low = nxt.lower()
            if any(low.startswith(w) for w in WEEKDAYS) or any(nxt.startswith(s) for s in r.get("stops", [])):
                break
            found.append(nxt.lstrip("•· ").strip())
        return structure([l for l in found if l], r.get("notes", [])) or None
    return None


PRICE = re.compile(r"\d+,\d{2}\s*€$")


def structure(lines, notes):
    """Group dishes under price headings ("Noutopöytä 13,80€") and join continuation lines.

    Returns a list of plain strings and {"title", "items"} groups. A line starting in lowercase
    continues the previous line; a line starting with a note prefix ends the current group.
    """
    out = []
    for line in lines:
        if out and line[:1].islower():
            prev = out[-1]
            if isinstance(prev, str):
                out[-1] = f"{prev} {line}"
            elif prev["items"]:
                prev["items"][-1] += f" {line}"
            else:
                prev["title"] += f" {line}"
        elif PRICE.search(line):
            out.append({"title": line, "items": []})
        elif out and isinstance(out[-1], dict) and not any(line.startswith(n) for n in notes):
            out[-1]["items"].append(line)
        else:
            out.append(line)
    return out


def lines_html(lines):
    items = []
    for line in lines:
        if isinstance(line, str):
            items.append(f"<li>{html.escape(line)}</li>")
        else:
            sub = "".join(f"<li>{html.escape(i)}</li>" for i in line["items"])
            items.append(f"<li><strong>{html.escape(line['title'])}</strong>{f'<ul>{sub}</ul>' if sub else ''}</li>")
    return "<ul>" + "".join(items) + "</ul>"


# "vko 41", "vko41", "vk_41", "viikko 41"; the number must be followed straight by the
# extension, which keeps out Webflow's -p-500/-p-800 downscaled copies of the same picture
WEEK_IMAGE = re.compile(r'https://[^"\s]+?(?:viikko|vko|vk)(?:%20|[\s_-])*(\d{1,2})\.(?:png|jpe?g|webp)', re.I)


def today_image(page, day):
    """Weekly menu image, only if its 'vko NN' matches the current ISO week.

    A mismatching number is never accepted: showing last week's food as this week's is
    worse than showing nothing and retrying until the new picture appears.
    """
    for m in WEEK_IMAGE.finditer(page):
        if int(m.group(1)) == day.isocalendar().week:
            return m.group(0)
    return None


def fetch_page(r):
    """The restaurant's page, or None. One broken site must never break the run."""
    try:
        return fetch(r["url"])
    except Exception as e:
        print(f"{r['key']}: {e}", file=sys.stderr)
        return None


def found(result):
    return bool(result.get("lines") or result.get("image"))


def menus_html(day, results, images):
    """Feed-item markup for one day: the week's picture plus that day's lists."""
    parts = []
    img = images.get(week_key(day))
    for r in WEEKLY:
        parts.append(f'<h3><a href="{html.escape(r["url"])}">{html.escape(r["name"])}</a></h3>')
        parts.append(f'<p><img src="{html.escape(img)}" alt="{html.escape(r["name"])} viikon lounaslista" style="max-width:100%"></p>'
                     if img else f'<p>Ei löytynyt vielä. <a href="{html.escape(r["url"])}">Katso ravintolan sivu</a></p>')
    for r in DAILY:
        res = results.get(r["key"], {})
        parts.append(f'<h3><a href="{html.escape(r["url"])}">{html.escape(r["name"])}</a></h3>')
        parts.append(lines_html(res["lines"]) if res.get("lines")
                     else f'<p>Ei löytynyt vielä. <a href="{html.escape(r["url"])}">Katso ravintolan sivu</a></p>')
    return "\n".join(parts)


def card(r, body, extra="", cls=""):
    return f"""            <section class="legal-section lunch-card{cls}">
                <h3><a href="{html.escape(r["url"])}">{html.escape(r["name"])}</a></h3>
                <p class="lunch-hours">Lounas {r["hours"]}{extra}</p>
                {body}
            </section>"""


def missing_note(r):
    return (f'<p class="lunch-note">Päivän listaa ei löytynyt. '
            f'<a href="{html.escape(r["url"])}">Katso ravintolan sivu</a></p>')


def week_cards(days, images):
    """The weekly picture, rendered once per distinct ISO week on the page."""
    out = []
    for wk in dict.fromkeys(week_key(d) for d in days):
        num = wk.split("-")[1].lstrip("0")
        img = images.get(wk)
        for r in WEEKLY:
            body = (f'<a href="{html.escape(img)}"><img src="{html.escape(img)}" '
                    f'alt="{html.escape(r["name"])} viikon lounaslista" loading="lazy"></a>'
                    if img else
                    f'<p class="lunch-note">Viikon {num} lista ei ole vielä julkaistu. '
                    f'<a href="{html.escape(r["url"])}">Katso ravintolan sivu</a></p>')
            out.append(card(r, body, f' · koko viikon lista (vko {num})', " lunch-week-card"))
    return out


def day_tabs(days, results_by_day, active):
    buttons = []
    for d in days:
        has = has_lists(results_by_day.get(d.isoformat(), {}))
        buttons.append(
            f'<button type="button" class="lunch-tab" data-date="{d.isoformat()}"'
            f'{" aria-current=\"true\"" if d == active else ""}'
            f'{"" if has else " data-empty=\"true\""}>'
            f'<span class="lunch-tab-day">{SHORT[d.weekday()]}</span>'
            f'<span class="lunch-tab-date">{d.day}.{d.month}.</span></button>')
    return ('        <nav class="lunch-tabs" aria-label="Viikonpäivä">\n'
            f'            {"".join(buttons)}\n        </nav>')


def day_sections(days, results_by_day, active):
    out = []
    for d in days:
        results = results_by_day.get(d.isoformat(), {})
        cards = []
        for r in DAILY:
            res = results.get(r["key"], {})
            cards.append(card(r, lines_html(res["lines"]) if res.get("lines") else missing_note(r)))
        out.append(f"""        <section class="lunch-day" data-date="{d.isoformat()}"{"" if d == active else " hidden"}>
            <h2 class="lunch-day-title">{WEEKDAYS[d.weekday()].capitalize()} {d.day}.{d.month}.</h2>
{chr(10).join(cards)}
        </section>""")
    return out


def page_html(days, updated, results_by_day, images):
    today = datetime.now(TZ).date()
    # the tab open on arrival: today when the shown week contains it, else the first day
    # that actually has menus, else Monday
    active = next((d for d in days if d == today),
                  next((d for d in days if has_lists(results_by_day.get(d.isoformat(), {}))), days[0]))
    cards = (day_tabs(days, results_by_day, active)
             + "\n" + "\n".join(day_sections(days, results_by_day, active))
             # the week picture is not per day, so it sits below the tabs rather than in them
             + "\n" + "\n".join(week_cards(days, images)))
    title = f"Lounas {SHORT[active.weekday()]} {active.day}.{active.month}."
    day = active
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
        .lunch-card h3 {{ margin-top: 0; }}
        .lunch-card h3 a {{ color: var(--text); text-decoration: none; }}
        .lunch-card ul {{ margin-bottom: 0; }}
        .lunch-card li {{ margin-bottom: 4px; }}
        .lunch-card li strong {{ color: var(--text); font-weight: 600; }}
        .lunch-card ul ul {{ margin: 4px 0 8px; }}
        .lunch-card img {{ width: 100%; border-radius: 12px; margin-top: 8px; }}
        .lunch-hours, .lunch-note {{ font-size: 14px; }}
        .lunch-day {{ margin-top: 24px; }}
        .lunch-day-title {{ margin-bottom: 12px; }}
        .lunch-week {{ color: var(--glow); font-size: 15px; font-weight: 400; }}
        .lunch-day-when {{ color: var(--glow); font-size: 14px; letter-spacing: .08em;
            text-transform: uppercase; display: block; }}
        .lunch-day[hidden], .lunch-week-card[hidden] {{ display: none; }}
        .lunch-tabs {{ display: flex; gap: 8px; margin-top: 24px; }}
        .lunch-tab {{ flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 10px 4px;
            border: 1px solid rgba(255,255,255,.14); border-radius: 12px; background: transparent;
            color: var(--text); font: inherit; cursor: pointer; opacity: .62; }}
        .lunch-tab:hover {{ opacity: .9; }}
        .lunch-tab[aria-current="true"] {{ opacity: 1; border-color: var(--glow);
            box-shadow: 0 0 0 1px var(--glow) inset; }}
        .lunch-tab[data-empty] .lunch-tab-day {{ text-decoration: line-through; }}
        .lunch-tab-day {{ font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }}
        .lunch-tab-date {{ font-size: 12px; opacity: .75; }}
        .lunch-week-card {{ margin-top: 28px; }}
        @media (max-width: 600px) {{ .legal-page {{ padding: 48px 16px; }} .lunch-card {{ padding: 18px; }} }}
    </style>
</head>
<body>
    <main class="legal-page">
        <div class="legal-header">
            <a class="back-link" href="/products/">← Products</a>
            <h1>{title}</h1>
            <p>Viikko {day.isocalendar().week} · Päivitetty {updated} · <a href="feed.xml" style="color:var(--glow)">RSS</a></p>
        </div>
{cards}
    </main>
    <script>
        // The page is built ahead of the day it is read, so the viewer's own clock decides
        // which tab opens; the week's days are all present, only one panel is shown.
        (function () {{
            var p = function (n) {{ return String(n).padStart(2, "0"); }};
            var now = new Date();
            var iso = function (d) {{
                return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
            }};
            var today = iso(now);
            // from date parts, not +24h: the DST night in October is 25 hours long
            var tomorrow = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
            var tabs = [].slice.call(document.querySelectorAll(".lunch-tab"));
            var panels = [].slice.call(document.querySelectorAll(".lunch-day"));

            function show(date) {{
                tabs.forEach(function (t) {{
                    if (t.dataset.date === date) {{ t.setAttribute("aria-current", "true"); }}
                    else {{ t.removeAttribute("aria-current"); }}
                }});
                panels.forEach(function (sec) {{ sec.hidden = sec.dataset.date !== date; }});
            }}

            // the page is built ahead of time, so the viewer's clock picks the open tab
            var pick = tabs.filter(function (t) {{ return t.dataset.date === today; }})[0]
                || tabs.filter(function (t) {{ return !t.hasAttribute("data-empty"); }})[0]
                || tabs[0];
            if (pick) show(pick.dataset.date);
            tabs.forEach(function (t) {{
                t.addEventListener("click", function () {{ show(t.dataset.date); }});
            }});

            panels.forEach(function (sec) {{
                var when = sec.dataset.date === today ? "Tänään"
                    : sec.dataset.date === tomorrow ? "Huomenna" : "";
                if (!when) return;
                var title = sec.querySelector(".lunch-day-title");
                var tag = document.createElement("span");
                tag.className = "lunch-day-when";
                tag.textContent = when;
                title.insertBefore(tag, title.firstChild);
            }});
        }})();
    </script>
</body>
</html>
"""


def feed_xml(items):
    entries = []
    for it in items:
        d = date.fromisoformat(it["date"])
        # pubDate = when the day's item first appeared, so RSS triggers (Power Automate) that
        # only pick up items newer than their last poll see it even when the run was late
        pub = it.get("pub") or format_datetime(datetime(d.year, d.month, d.day, 6, 0, tzinfo=TZ))
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
  <title>Lounaslista</title>
  <link>{SITE_URL}</link>
  <description>Päivän lounaslistat lähiravintoloista</description>
  <language>fi</language>
{chr(10).join(entries)}
</channel>
</rss>
"""


def main():
    now = datetime.now(TZ)
    if os.environ.get("LUNCH_DATE"):
        shown = week_days(date.fromisoformat(os.environ["LUNCH_DATE"]))
    else:
        # on a weekend the week worth showing is the one starting Monday
        today = now.date()
        shown = week_days(today if today.weekday() < 5 else next_weekday(today))
    # next week costs no extra requests — the same page is parsed for both — and means
    # Monday is already in hand by the time it becomes the shown week
    targets = shown + week_days(shown[0] + timedelta(days=7))

    state_file = OUT / "lunch.json"
    state = json.loads(state_file.read_text(encoding="utf-8")) if state_file.exists() else {}
    # anything older than the shown week is dropped; the days within it are kept, since the
    # tabs cover Mon–Fri including the ones already gone
    results_by_day = {k: v for k, v in state.get("days", {}).items() if k >= shown[0].isoformat()}
    images = dict(state.get("images", {}))

    new = 0
    for d in targets:
        results_by_day.setdefault(d.isoformat(), {})
    for r in DAILY:
        missing = [d for d in targets if not found(results_by_day[d.isoformat()].get(r["key"], {}))]
        if not missing:
            continue
        page = fetch_page(r)  # once per restaurant: every weekday is on the same page
        if page is None:
            continue
        for d in missing:
            lines = today_text(page, d, r)
            got = {"lines": lines} if lines else {}
            new += found(got)
            results_by_day[d.isoformat()][r["key"]] = got
        hits = [str(d.day) for d in missing if found(results_by_day[d.isoformat()][r["key"]])]
        print(f"{r['key']}: +{len(hits)} of {len(missing)} missing days{' (' + ', '.join(hits) + '.)' if hits else ''}")

    for wk in dict.fromkeys(week_key(d) for d in targets):
        if images.get(wk):
            continue
        d = next(x for x in targets if week_key(x) == wk)
        for r in WEEKLY:
            page = fetch_page(r)
            img = today_image(page, d) if page else None
            if img:
                images[wk] = img
                new += 1
            print(f"{wk} {r['key']}: {'found' if img else 'missing'}")

    rendered = [d.isoformat() for d in shown]
    if not new and state.get("rendered") == rendered:
        print("Nothing new, no changes written.")
        return

    updated = f"{now.day}.{now.month}. klo {now:%H.%M}"  # %-d is glibc-only, breaks on Windows
    target_isos = [d.isoformat() for d in targets]
    feed = [f for f in state.get("feed", []) if f["date"] not in target_isos]
    for d in targets:
        iso = d.isoformat()
        # an item is published only once the day has menus: pubDate is pinned to first
        # appearance, so an empty item would notify now and never again when it fills in
        if not has_lists(results_by_day[iso]):
            continue
        old = next((f for f in state.get("feed", []) if f["date"] == iso), {})
        feed.append({"date": iso,
                     "title": f"Lounas {SHORT[d.weekday()]} {d.day}.{d.month}.",
                     # pubDate = when the day's item first appeared, so RSS triggers (Power
                     # Automate) that only pick up items newer than their last poll still see it
                     "pub": old.get("pub") or format_datetime(now.replace(microsecond=0)),
                     "html": menus_html(d, results_by_day[iso], images)})
    feed = sorted(feed, key=lambda f: f["date"], reverse=True)[:FEED_DAYS]
    images = {k: v for k, v in images.items() if k in {week_key(d) for d in targets}}

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "index.html").write_text(page_html(shown, updated, results_by_day, images), encoding="utf-8")
    (OUT / "feed.xml").write_text(feed_xml(feed), encoding="utf-8")
    state_file.write_text(json.dumps(
        {"updated": updated, "rendered": rendered, "images": images,
         "days": results_by_day, "feed": feed}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    got = sum(found(v) for d in rendered for v in results_by_day[d].values())
    print(f"Wrote {OUT} (week {week_key(shown[0])}: {got}/{len(DAILY) * len(shown)} lists, "
          f"{len(images)} week image(s))")


if __name__ == "__main__":
    main()
