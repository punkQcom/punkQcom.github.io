# Lunch feed: reliable morning trigger (in progress)

## Problem
`lunch.yml`'s `schedule:` cron is unreliable — GitHub delays or drops most
scheduled runs. Confirmed by comparing intended cron times vs actual run
timestamps (via the Actions API):

- `lunch.yml` (cron every 30 min, 03:17–08:47 UTC weekdays): only fires
  ~once/day, 1–7 hours late (e.g. Oct 1 run landed at 09:58 UTC instead of
  its ~03:17 slot).
- `cleanup-runs.yml` (cron 06:00 UTC daily): same pattern, lands 11:26–12:58
  UTC every day — 5–7 hours late, consistently.

The scraping logic itself (`fetch.py`) is fine: it already retries only the
restaurants not yet found and is cheap to re-run. The fix is to trigger the
workflow from something other than GitHub's own `schedule:` event.

## Requirement
- Page should be updated by **07:00 Helsinki**.
- Need repeated follow-up checks through the morning, since a restaurant
  (esp. on **Mondays**) may not have posted its weekly menu yet at 07:00.
  Checks should keep retrying only the missing ones.

## Options considered
1. **Power Automate calling GitHub's `workflow_dispatch` API** — ruled out
   for now. Requires the HTTP action, which is a *premium* connector.
   User's Microsoft 365 **E3** license only includes "Power Automate for
   Office 365" (standard connectors only) — would need Power Automate
   Premium/per-user (~$15/mo) or a per-flow plan (~$100/mo) to unlock it.
2. **cron-job.org (or similar free cron service) → POST to GitHub
   `workflow_dispatch`** — recommended, no license needed. Needs:
   - A GitHub fine-grained PAT scoped to just this repo, "Actions: write"
     permission only.
   - Several scheduled jobs (e.g. 06:00 then every ~20 min until ~09:00,
     possibly denser on Mondays) each POSTing to
     `https://api.github.com/repos/punkQcom/punkQcom.github.io/actions/workflows/lunch.yml/dispatches`
     with `Authorization: Bearer <token>` and `{"ref":"main"}` as the body.
3. **Move fetch off GitHub Actions entirely** (e.g. Cloudflare Workers Cron
   Triggers calling the same dispatch API) — more setup, avoids depending
   on a third-party cron website, not otherwise necessary.

## Decision so far
Leaning towards option 2 (cron-job.org). **Not yet decided:**
- Exact check schedule/density (uniform every ~20 min vs. Monday-heavy).
- Whether to create the GitHub PAT and cron-job.org account.

## Next steps when resuming
1. Pick the check schedule (see above).
2. Create a fine-grained GitHub PAT (repo: `punkQcom/punkQcom.github.io`,
   permission: Actions → Read and write).
3. Create free account on cron-job.org, add the scheduled POST jobs with
   that token.
4. Optionally keep `lunch.yml`'s own `schedule:` as a redundant backup
   (harmless since `fetch.py` is a no-op once everything's found).
