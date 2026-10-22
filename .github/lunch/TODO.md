# Lunch feed: notes & open items

## The original problem (now worked around)
`lunch.yml`'s `schedule:` cron is unreliable — GitHub delays or drops most
scheduled runs. Confirmed by comparing intended cron times vs actual run
timestamps (via the Actions API):

- `lunch.yml`: fired ~once/day, 1–7 hours late. Observed landings ranged from
  21.00 to 03.00 to 13.30.
- `cleanup-runs.yml` (cron 06:00 UTC daily): same pattern, lands 11:26–12:58
  UTC every day — 5–7 hours late, consistently.

There is no setting that fixes this; GitHub does not guarantee cron timing.

Measured again 12.–21.10.2026 via the Actions API, which also turned up a
second rule — **several crons in one morning collapse into a single run**:

| day | cron (UTC) | actually started | late by |
|---|---|---|---|
| Mon 12.10 | 03:17–07:17 (5 crons) | 11:01 | one run only, +3h44 |
| Tue 13.10 | 04:17 | 11:50 | +7h33 |
| Wed 14.10 | 04:17 | 09:32 | +5h15 |
| Thu 15.10 | 04:17 | 09:10 | +4h53 |
| Fri 16.10 | 04:17 | 09:03 | +4h46 |
| Mon 19.10 | 03:17–07:17 (5 crons) | 09:02 | one run only, +1h45 |
| Wed 21.10 | 04:17 | 12:21 | +8h04 |

So piling on crons to "make sure one lands" does not work — six were tried on
20.10. and produced no extra runs. One cron per day is what GitHub gives you,
at an hour of its choosing. Check with:

    curl -s "https://api.github.com/repos/punkQcom/punkQcom.github.io/actions/workflows/lunch.yml/runs?per_page=10" \
      | grep -E '"run_started_at"|"conclusion"'

## How it is solved now (no external trigger needed)
Rather than trying to control *when* the run happens, `fetch.py` was made
indifferent to it:

- All five text restaurants publish their **whole week on one page**, so each
  site is fetched **once per run** and every weekday is parsed out of that one
  page. Filling an empty week costs 6 requests; fetching per day would be 50.
- State is keyed per date (`days: {"YYYY-MM-DD": {...}}`), so one day never
  overwrites another. This was the bug where the page showed Friday's list
  while it was still Thursday.
- Hansasali publishes one picture per week, so it is stored per ISO week
  (`images: {"2026-41": url}`) and rendered **once**, below the day's lists.
- The page is **Mon–Fri tabs**. Every day of the shown week is in the HTML;
  an inline script opens the tab for the current day **using the viewer's
  clock**, so a page built hours earlier still opens on the right day. A day
  with nothing published yet gets a struck-through tab and is skipped when
  choosing which tab to open.
- Each run also parses **next week** from the same pages at no extra cost, so
  Monday is usually in hand before it becomes the shown week.

### Schedule
One successful run fetches the whole week, so the runs cluster where the new
week appears rather than spreading evenly. Once everything is found a run
makes no requests at all — cost is only paid while something is missing.

| when (Helsinki) | cron (UTC) | why |
|---|---|---|
| Sun 18.17, 21.17 | `17 15,18 * * 0` | the new week usually lands here |
| Mon–Fri ~07.17 | `17 4 * * 1-5` | top up whatever Sunday did not get |

7 runs/week, down from ~11 (22.10.2026). The extra Monday-morning and
multi-attempt windows were removed once the measurements above showed they
produce no extra runs. Nothing waits on a precise time any more — see
*Delivery* below — so a run is early or late, never wrong.

**Known trade-off:** there is no Saturday run, and Sunday starts at 18.17.
A restaurant that publishes next week on a Saturday is therefore not seen
until Sunday evening. This was deliberate — next week's lists were measured
as never being up before Sunday, so every Saturday run spent six requests on
the restaurants for nothing. Add a Saturday cron back if that ever changes.

The Monday "chef overslept" case is covered from both sides: Sunday evening
picks the week up early, and Monday morning's hourly runs fill it in if it
was late.

## Hansasali weekly picture
The site hosts only one picture at a time (`_Hansa ig vko 41.png`, plus
Webflow's `-p-500`/`-p-800` downscaled copies) and replaces it each week, at
an unpredictable time — Sunday evening, Monday morning, whenever the chef
gets to it. Handling:

- The picture is accepted **only** if its week number matches the ISO week of
  the day being shown, so last week's food is never presented as this week's.
- Until the new one appears the card reads "Viikon NN lista ei ole vielä
  julkaistu" with a link to the restaurant page, and every run retries. How
  fast it is picked up follows the schedule above: within the hour on a
  Monday morning, but only once a day Tue–Fri.
- Recognised name forms: `vko 41`, `vko41`, `vk 41`, `vk_41`, `vko-41`,
  `viikko 41`, in .png/.jpg/.jpeg/.webp.
- **Known gaps** (both leave the card blank for the week, by choice): a
  two-week range name like `vko 41-42`, and the chef uploading the new
  picture under the *old* week number. Blank-and-retrying was preferred over
  risking the wrong week's menu.

## The feed contract (settled 19.–22.10.2026)
The complaint that started this: menus arrived with **no date in them**, five
look-alike messages at once, because one Sunday run found the whole week and
every item carried the same first-appearance `pubDate`.

What the feed guarantees now — each item stands alone:

- `<title>` **Lounas to 22.10.2026** — weekday *and* year.
- The description opens with **Lounaslista torstai 22.10.2026 · viikko 43**,
  so the body names the day even where a reader shows no metadata.
- `<link>` points at that day: `…/products/lunch/#2026-10-22`. The day's
  `<section>` carries `id="<date>"` and the page script honours the hash
  (and `hashchange`) before falling back to the viewer's clock.
- `<guid isPermaLink="false">lounas-2026-10-22</guid>`, stable per day, so
  rewriting a day's content in place never re-notifies.
- `<pubDate>` is **06.00 Helsinki on the lunch day itself**, via ZoneInfo, so
  the stamps are a day apart, order unambiguously, and read `+0300`/`+0200`
  on the right side of the October change.
- `<atom:link rel="self">` on the channel, for validators and for a reader
  handed a copy of the file.

**Days already delivered keep their old stamp.** `lunch.json` holds a
`seen: {date: timestamp}` map, migrated once from the old per-item `pub`
values, so the move to 06.00 stamps did not mail two weeks over again. No new
entries are added; the map empties as those days leave the feed.

**Tried and reverted (19.–22.10.2026): releasing one day at a time.** The feed
held back a day until its own morning and the workflow ran six times a morning
to publish it. That hands the scheduler the decision of *which day you get*,
and the measurements above show it cannot be trusted with it. The page has
never had this problem because it does the opposite — ships every day and lets
the browser's clock pick the tab. The feed now makes the same bargain: it
carries every day that has been scraped and the reader picks. Do not
reintroduce per-day release logic in `fetch.py`; change the Power Automate
recurrence instead.

**A consequence to accept:** days ahead carry a `pubDate` in the future until
that day arrives. Nearly all readers show them anyway; a few clamp or hide
future-dated items. This was judged the lesser evil against a backdated stamp,
which a polling trigger skips entirely — that is how a late Monday list would
have gone silently undelivered.

## Delivery: Power Automate flow `LounasDaily2` (22.10.2026)
Timing lives **outside** the repo. The site publishes data; the flow decides
which day to show and when. Mon–Fri 06:00 Helsinki, posted to Teams by Flow
bot. Four blocks:

1. **Recurrence** — `frequency: Week`, `interval: 1`,
   `timeZone: FLE Standard Time`, `hours: ["6"]`, `minutes: [0]`,
   `weekDays: Monday–Friday`. No `startTime` (a `…Z` value fights the zone).
2. **List all RSS feed items** (connector `shared_rss`, operation
   `ListFeedItems`) on `https://punkq.com/products/lunch/feed.xml`, `since`
   left empty. Keep the action's English display name — expressions address
   actions by display name, and a Finnish one breaks
   `body('List_all_RSS_feed_items')`.
3. **Filter array** — from `@body('List_all_RSS_feed_items')`, where:

       @equals(item()?['id'], concat('lounas-', convertFromUtc(utcNow(),'FLE Standard Time','yyyy-MM-dd')))

   Fallback if the connector ever stops exposing the guid as `id`:

       @contains(join(item()?['links'], ','), convertFromUtc(utcNow(),'FLE Standard Time','yyyy-MM-dd'))

4. **Condition** `@greater(length(body('Filter_array')), 0)` →
   **If yes:** post `@{first(body('Filter_array'))?['summary']}` to Teams.
   **If no:** "Lounaslistaa ei ole vielä julkaistu" + link — a *visible*
   signal that the scrape is behind, which the old RSS trigger never gave.

Gotchas found while building it:

- The Teams **Message** box is a rich-text editor: HTML typed into it is
  escaped and posted as visible tags. Leave the box empty and insert only the
  expression; the editor supplies its own `<p class="editor-paragraph">`.
- Typing a comparison into **Asetukset → Seuratut ominaisuudet** silently
  leaves the condition as `equals("","")`, which is always true and makes the
  If-no branch dead code. Check `"greater"` in the code view.
- `hours` without `minutes` inherits the minute the schedule was created, so
  06:00 can quietly become 06:43. Set `minutes: [0]`.
- The predecessor flow `LounasDaily` used the RSS **trigger** with
  `splitOn: @triggerOutputs()?['body/value']` polling every minute — that
  `splitOn` is literally what fanned a week into five messages. Keep it
  **disabled**, not deleted, as a fallback.

To mail **tomorrow's** menu the evening before instead, move the recurrence to
Sun–Thu 17:00 and use
`convertFromUtc(addDays(utcNow(),1),'FLE Standard Time','yyyy-MM-dd')`.
Nothing on the GitHub side changes — the feed carries every day either way.

## Parser gotchas (don't regress these)
- **Gatorade lists TPS home games with weekday headings** — "Perjantai 16.10.
  18:30" — which `today_text` happily matched as a lunch menu, publishing
  kick-off times as that day's food. Headings containing a clock time are now
  skipped. The test is **colon only** (`18:30`): a dot form would also match
  the date `16.10.` and silently blank every restaurant.
- The weekly-image regex requires the week number to be followed directly by
  the extension, which is what keeps out Webflow's `-p-500` / `-p-800`
  downscaled copies of the same picture.
- A day is only considered found if it has lists; empty days are kept off the
  page and out of the feed rather than published blank.

## Constraint: scheduling must be external
There is no local scheduler available — the dev machine cannot be relied on
to be awake, so every trigger has to run outside it. In practice that means
GitHub Actions (as now) or a cloud cron service. A local cron job / Task
Scheduler entry / always-on PC is not an option, so do not revisit those.

This is why the current design matters: because `fetch.py` no longer cares
when it runs, an external scheduler with no timing guarantee is good enough.
Local Python (via `uv`, see below) is for **testing only**.

Since 22.10.2026 there are two schedulers, and the split is deliberate:
GitHub Actions decides *when the data is fetched* (no guarantee needed, and
none given), while Power Automate decides *when a day is read* (punctual,
DST-aware, and under our control). Anything that needs to happen at a
wall-clock time belongs in the flow, never in `lunch.yml`.

## Open items
- **Not needed unless the above proves insufficient:** an external trigger
  (cron-job.org or similar POSTing to GitHub's `workflow_dispatch` API with a
  fine-grained PAT scoped to this repo, Actions: write). Only worth doing if
  menus still turn up missing at lunchtime.
- Power Automate as a *trigger* for GitHub still needs the premium HTTP
  action, so that remains ruled out. **But the delivery side turned out not
  to need it** (22.10.2026): the **RSS connector is standard**, so a scheduled
  flow can read `feed.xml` on an E3 licence — see *Delivery* above. Reading
  `lunch.json` instead would need HTTP, i.e. premium; the feed avoids that.
- **Resolved 22.10.2026, was: "the feed arrives as a weekly burst".** The old
  note proposed holding a day out of the feed until it arrived, and warned
  against future `pubDate`s. It was tried and reverted — holding days back
  puts GitHub's scheduler in charge of which day you see, which is strictly
  worse than a future stamp. See *The feed contract* above.
- Feed items list the five text menus first and the Hansasali week picture
  last, matching the page.

## Testing locally
No system Python on the dev machine; `uv` is installed, which can fetch an
interpreter on demand. Windows needs `tzdata` (no system zoneinfo):

    uv run --no-project --python 3.12 --with tzdata .github/lunch/fetch.py

`LUNCH_DATE=YYYY-MM-DD` shows the week containing that date instead of the
current one.

The script is idempotent, so a **template-only** change will not rebuild the
page until something new is found. That is what the `FORMAT` constant is for:
bump it whenever the page or feed markup changes and the next run rewrites
everything once. (Dropping the `rendered` key from `products/lunch/lunch.json`
also works, but `FORMAT` is the deliberate route — a week already fetched is
otherwise never rewritten, so the old markup would linger until Monday.)

To try a change without touching the published files, run a copy against a
copy of the state:

    S=/tmp/lunchtest
    mkdir -p $S/.github/lunch $S/products/lunch
    cp .github/lunch/fetch.py $S/.github/lunch/
    cp products/lunch/lunch.json $S/products/lunch/
    uv run --no-project --python 3.12 --with tzdata $S/.github/lunch/fetch.py

`OUT` is derived from `__file__`, so the copy writes into `$S/products/lunch`
and the repo is untouched. Syntax check alone:

    uv run --no-project --python 3.12 --with tzdata python -m py_compile .github/lunch/fetch.py
