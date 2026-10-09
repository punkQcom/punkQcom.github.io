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
| Mon 06.17–10.17 hourly | `17 3-7 * * 1` | the chef may not post until Monday |
| Tue–Fri 07.17 | `17 4 * * 2-5` | late list, or a Monday GitHub skipped |

~11 runs/week. GitHub drops and delays runs, which is why each window has
more than one attempt rather than a single daily trigger.

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

## Open items
- **Not needed unless the above proves insufficient:** an external trigger
  (cron-job.org or similar POSTing to GitHub's `workflow_dispatch` API with a
  fine-grained PAT scoped to this repo, Actions: write). Only worth doing if
  menus still turn up missing at lunchtime.
- Power Automate for that trigger was **ruled out**: it needs the HTTP action,
  a *premium* connector. Microsoft 365 **E3** only includes "Power Automate
  for Office 365" (standard connectors), so it would need Power Automate
  Premium (~$15/user/mo) or a per-flow plan (~$100/mo).
- **The feed arrives as a weekly burst, by choice.** An item is published the
  moment its day is first found, and a run now finds the whole week at once,
  so when the new week appears (Sun/Mon) all five items land together rather
  than one per morning. `pubDate` stays pinned to first appearance, and
  `guid` is stable per day, so correcting a day's content in place does not
  re-notify. If one-per-morning is wanted later, the reliable fix is to hold
  a day's item out of the feed until that day arrives — *not* to set a future
  `pubDate`, which readers handle inconsistently.
- Feed items list the five text menus first and the Hansasali week picture
  last, matching the page.

## Testing locally
No system Python on the dev machine; `uv` is installed, which can fetch an
interpreter on demand. Windows needs `tzdata` (no system zoneinfo):

    uv run --no-project --python 3.12 --with tzdata .github/lunch/fetch.py

`LUNCH_DATE=YYYY-MM-DD` shows the week containing that date instead of the
current one. The script is idempotent, so a **template-only** change will not
rebuild the page until something new is found — drop the `rendered` key from
`products/lunch/lunch.json` to force one rebuild.
