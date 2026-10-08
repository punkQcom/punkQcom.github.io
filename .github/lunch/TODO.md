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

- Every run tops up **both today and tomorrow**, fetching only what is still
  missing. A run at 21.00 fills tomorrow; a run at 03.00 or 13.30 fills
  whatever today is still missing.
- State is keyed per date (`days: {"YYYY-MM-DD": {...}}`), so a prefetched
  tomorrow no longer overwrites today. This was the bug where the page showed
  Friday's list while it was still Thursday.
- Hansasali publishes one picture per week, so it is stored per ISO week
  (`images: {"2026-41": url}`) and rendered **once**, not per day.
- The page carries both days as dated sections (`Torstai 8.10.`,
  `Perjantai 9.10.`), today first. A small inline script labels them
  Tänään / Huomenna and hides days already past **using the viewer's clock**,
  so a page built the evening before is still correct when read next morning.
- Cron is now daily (so Sunday evening prefetches Monday): every 30 min
  06–12 Helsinki for lists published late that morning, hourly for the rest
  of the day for tomorrow's lists. Runs are no-ops once both days are full.

The Monday "chef overslept" case is covered from both sides: Sunday evening
prefetches it, and Monday morning's dense runs fill it in if it was late.

## Open items
- **Not needed unless the above proves insufficient:** an external trigger
  (cron-job.org or similar POSTing to GitHub's `workflow_dispatch` API with a
  fine-grained PAT scoped to this repo, Actions: write). Only worth doing if
  menus still turn up missing at lunchtime.
- Power Automate for that trigger was **ruled out**: it needs the HTTP action,
  a *premium* connector. Microsoft 365 **E3** only includes "Power Automate
  for Office 365" (standard connectors), so it would need Power Automate
  Premium (~$15/user/mo) or a per-flow plan (~$100/mo).
- RSS semantics left as they were: one item per day, `pubDate` = when the
  day's item first appeared. Note this means the feed delivers tomorrow's
  item the evening before. Revisit only if the Power Automate flow that reads
  the feed should instead notify on the morning it applies.

## Testing locally
No system Python on the dev machine; `uv` is installed, which can fetch an
interpreter on demand. Windows needs `tzdata` (no system zoneinfo):

    uv run --no-project --python 3.12 --with tzdata .github/lunch/fetch.py

`LUNCH_DATE=YYYY-MM-DD` fetches one specific day instead of today+tomorrow.
The script is idempotent, so a **template-only** change will not rebuild the
page until something new is found — drop the `rendered` key from
`products/lunch/lunch.json` to force one rebuild.
