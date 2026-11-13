# Lunch feed: notes & open items

## Where things stand (13.11.2026)

A status block, so the next person does not have to reconstruct it from the
sections below. Everything here is covered in detail further down.

**Working:** week 46 is complete, 25/25 lists, live. Four of the five text
restaurants and the Hansasali picture come in by themselves on the Sunday
run. The parser is not the weak part — it has not been wrong since the
weekday-typo case below was fixed.

**Broken, knowingly:** gatoradecenter.fi 403s GitHub's runners (since
4.11.2026) and answers a home connection. Decided 10.11. to live with it —
no proxies, no middleman services, no rotating IPs. Gatorade therefore has
to be filled by hand each week, which is what the npm scripts and VS Code
tasks exist for.

**Off:** the Power Automate flow `LounasDaily2` was disabled 13.11. Nothing
is delivered to Teams or by mail until it is switched back on. The page and
feed keep updating regardless. **Re-enable it before a Monday 06:00 if the
message is wanted.**

**Done 13.11.2026:**

- The weekday fallback for a mistyped date — Varikko headed Friday
  `Perjantai 12.11.`, which cost that day's card until it was fixed.
- Measured when Gatorade publishes, from 31 historical versions of
  `lunch.json`: Friday evening to Sunday evening, there by Sunday
  ~20:00–21:45 in 4 of 4 observable weeks. No schedule change warranted.
- Wrote down why the runs still fetch daily when the week is in hand, and
  rejected replacing the daily top-up with one weekly fetch.
- `npm run lunch` / `lunch:gatorade`, the matching VS Code tasks, and
  `--only` / `--strict` / `--list` with a failure summary.
- Corrected the delivery section: three actions in the True branch, two of
  them test targets.

**The weekend ahead:** as of Fri 13.11. 09:00 no restaurant had week 47 up,
Gatorade included, so there is nothing to fetch early. The Sunday evening
run should collect the other five; Gatorade needs a manual run from a home
connection after it appears.

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

Re-measured 26.10.2026, and the weekday lateness is **much tighter than the
"2–7 hours" above suggests** — four consecutive runs off the same `17 4` cron:

| day | cron (UTC) | actually started | late by |
|---|---|---|---|
| Mon 19.10 | 04:17 | 09:02 | +4h45 |
| Wed 21.10 | 04:17 | 09:21 | +5h04 |
| Thu 22.10 | 04:17 | 09:24 | +5h07 |
| Fri 23.10 | 04:17 | 09:20 | +5h03 |

Four samples inside a 22-minute band, all ≈ **+5h**. Two consequences:

- A weekday cron at `17 4` lands ~09:20 UTC — **11:20 Helsinki**, essentially
  at lunchtime. It can never feed an 06:00 delivery, so do not try to tune it
  into doing so.
- Sunday drift is *not* this consistent: +8 min on 25.10. (18:17 → 18:25) but
  +2h51 and +2h30 on 18.10. So the band is a weekday-morning phenomenon and
  cannot be used to aim a Sunday-night run.

**Re-measured again 10.11.2026 — the drift has grown to ≈+8h and the band has
moved past lunch.** Same unchanged `17 4` cron:

| day | cron (UTC) | actually started | late by |
|---|---|---|---|
| Mon 2.11 | 04:17 | 12:22 | +8h05 |
| Tue 3.11 | 04:17 | 11:54 | +7h37 |
| Wed 4.11 | 04:17 | 12:06 | +7h49 |
| Thu 5.11 | 04:17 | 12:18 | +8h01 |
| Fri 6.11 | 04:17 | 12:05 | +7h48 |
| Mon 9.11 | 04:17 | 12:50 | +8h33 |

Still a tight band, but ~3h later than two weeks earlier: runs now land
**14:00–14:50 Helsinki**, and three of the six restaurants stop serving at
14:00–14:30. **The weekday run now finishes after lunch is over.** So the band
being predictable is no longer much use — do not read the +5h figure above as
current, and re-measure before relying on any of these numbers. The drift is
GitHub's to change at will and it has changed once already.

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

**The weekday runs are insurance that has not yet paid out (measured
26.10.2026).** Every bot commit since this design went in on 09.10. was
checked, and no weekday run has ever found new menu data:

| weekday run | what actually changed |
|---|---|
| Mon 12.10. 11:01 | `format` → 2 — a markup change, nothing found |
| Wed 21.10. 09:21 | `format` → 5 — ditto |
| Thu 22.10. 09:24 | `format` → 6 — ditto |

All three committed only because a `FORMAT` bump forced a rewrite. Not one
added a day, a list or an image; `"images"` never changed in any of them. The
Sunday runs have done all the real work every week so far — 25/25 lists on
Sunday evening, week 44 included. Check this yourself with:

    git log --format='%h|%ad|%s' --date=format:'%a %d.%m %H:%M' \
      -- products/lunch/lunch.json

**Keep them anyway.** They cost essentially nothing — zero HTTP requests once
the week is complete, just a few Actions seconds — and the one item that does
arrive at an unpredictable hour is the Hansasali picture. That is the straggler
they insure against.

**10.11.2026: Gatorade blank all week 46 — not late publishing, a 403 block.**
An earlier version of this note blamed a late publish and claimed the Tue
10.11. run picked the menu up. Both were wrong: that run committed nothing, and
the `gatorade: +5 of 10 missing days` line came from a *local* test run, not
from GitHub. The Actions logs show what actually happened:

| run (Helsinki) | Gatorade |
|---|---|
| Mon 2.11. 14:22, Tue 3.11. 13:54 | OK |
| Wed 4.11. 14:06 and **every run since** | `HTTP Error 403: Forbidden` |

From a home connection the same URL with the same User-Agent returns 200, and
the unchanged parser finds all five days of week 46. So gatoradecenter.fi
(nginx) started refusing **GitHub's servers** between 3.11. and 4.11. — an IP
block, not a parser or timing problem. Week 45 escaped only because it had been
fetched on Sun 1.11.

Two causes overlapped, which is what made it confusing. On **Mon 9.11. morning**
Gatorade's own page still showed week 45 (checked by hand), so Monday's blank
card was correct: the dated headings (`Maanantai  9.11.`) did not match and
the parser declined. By **Tuesday** week 46 was up on their site, but the 403
meant no GitHub run could see it, so Tuesday's blank was the block. Without a
fix the rest of the week would have stayed blank too. Filled by hand from a
home connection on 10.11. 21:20 (commit `ebca35b3`).

**10.11.: User-Agent changed** from `punkq-lunch/1.0` to plain Chrome headers
(`fetch()` in `fetch.py`), in case the block is name + cloud address together.
A manual run right after (21:29) still got 403, so it is a **pure address
block** — run times were already irregular (14:06:49, 14:38:05, …), so timing
is not it either.

**Decided 10.11.: live with it.** We do not contact the restaurant, and we do
not route around the block (proxies, reader/middleman services, rotating IPs) —
that is dodging a block they chose to put up. Instead:

- The scheduled runs keep trying, unchanged, so Gatorade fills itself again if
  the block is ever lifted. Until then its card shows the "Katso ravintolan
  sivu" link — the normal fallback, no code change.
- When wanted, fill the week by hand from a home connection (not blocked):
  `git pull`, `python3 .github/lunch/fetch.py`, commit `products/lunch`, push.
  Or transcribe a screenshot of their menu into `lunch.json`
  (`days[date].gatorade = {"lines": [...]}`), drop the `rendered` key so the
  next run rewrites the outputs, run `fetch.py`, push.

**The failure is silent:** `fetch_page` swallows the error, the run ends green,
and no failure email is sent. Check the logs first when a card stays blank:

    gh run view <run id> --log | grep -E "gatorade|Error"

### When does Gatorade publish? (measured 13.11.2026)

Mined from all 31 historical versions of `products/lunch/lunch.json` — for
each ISO week, the first commit in which Gatorade had lines, and the last run
before it that had none:

| week | last run with nothing | first run with all 5 days |
|---|---|---|
| 42 | **Fri 9.10. 18:45** | **Sun 11.10. 21:34** |
| 43 | Mon 12.10. 13:01 | Sun 18.10. 20:08 |
| 44 | Thu 22.10. 11:24 | Sun 25.10. 20:25 |
| 45 | Mon 26.10. 08:03 | Sun 1.11. 21:42 |

Week 41 is excluded (system was new, 2 days only) and **week 46 is excluded
because it was filled by hand** on 10.11., which is not an observation of
their publishing.

**Gatorade was never the straggler.** In every week observed it arrived in the
*same run* as everyone else, five days at once, by the Sunday-evening run.
Hansasali is the one that turns up at an unpredictable hour.

Week 42 brackets it tightest — nothing at Friday 18:45, complete by Sunday
21:34 — so **Friday evening to Sunday evening** is consistent with all four
weeks, and week 44 independently rules out anything before Thursday midday.
Two limits: there is no Saturday run (see *Known trade-off* below), so
Friday-evening / Saturday / Sunday cannot be separated; and the "not before
Friday evening" leg rests on week 42 alone. What is solid, 4 of 4, is that it
is **there by Sunday ~20:00–21:45** — which is where the `17 18 * * 0` cron
lands after drift. This corroborates the existing measurement that next week's
lists are never up before Sunday, and means no schedule change is warranted.

### Why the runs still fetch daily, when the week is already in hand

The state file makes it look like a daily re-scrape; it is not. A run only
fetches a restaurant that still has a missing day (`if not missing: continue`),
so week 46's Linja, Varikko, Herkku and Siskot were fetched **once**, on Sun
8.11., and not requested again. Three things keep requests going out:

1. **Next week.** `targets` is the shown week *plus* the one after, so Mon–Fri
   of week N+1 are empty until the chefs publish and every restaurant is
   probed once per run to find out.
2. **Next week's Hansasali picture**, for the same reason.
3. **Gatorade.** The 403 means it is never *found*, so it stays in `missing`
   permanently and is retried every run, for every target day, indefinitely.
   That is the accepted cost of the 10.11. decision to keep trying so it
   refills itself if the block is ever lifted — worth knowing, not a fault.

So the "zero HTTP requests once the week is complete" claim above holds only
when **both** weeks are complete, and while the 403 stands it is never true.

**All five text restaurants publish the whole week on one page** (verified
13.11.2026: Linja by `vko NN` with undated days, Herkku `Maanantai 9.11.2026`,
Siskot `MAANANTAI 09.11`, Varikko and Gatorade `Maanantai 9.11.`). Siskot is
the early one — week 46 was already up on Wed 4.11.

**Considered and rejected 26.10.2026: a Sunday-night `17 22 * * 0` cron.** The
idea was to exploit the ≈+5h weekday band to land ~03:00 UTC (05:00 Helsinki)
and so beat the 06:00 delivery, covering a chef who republishes after Sunday
20:17. Dropped because (a) Sunday drift is not in that band — it was +8 min on
25.10., which would land the run *earlier* than the existing 20:17 one and buy
nothing; (b) the collapse rule would likely merge it into the existing Sunday
crons; and (c) the gap it addresses has never occurred. Both measured weeks had
the picture up well inside the existing window — week 43 at 15:32 and week 44
at 15:49 Helsinki, caught at 21:08 and 20:25. If a Monday message does turn up
short, the fix is the external trigger in *Open items*, not another cron.

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
  `viikko 41`, in .png/.jpg/.jpeg/.webp, optionally with a Webflow
  duplicate-name suffix — `vko 44(1).png`, also percent-encoded as
  `vko%2044%281%29.png`.
- **Fixed 26.10.2026: the `(1)` suffix blanked a whole week.** Week 44's
  picture was uploaded as `Hansa ig vko 44(1).png` — Webflow appends `(1)`
  when the chef uploads over a filename that already exists. The regex
  required the week number to be followed *straight* by the extension, so the
  picture was on the restaurant's site from Fri 23.10. 15.52 UTC and still
  rejected by every run after it, including Sun 25.10. 18.25 UTC. The card
  read "Viikon 44 lista ei ole vielä julkaistu" all the way into Monday
  lunchtime, and the Teams message carried five text menus and an empty
  Pegasus block. **This looked exactly like a scheduling problem and was not
  one** — the scrape had run, seen the file, and thrown it away. When the
  picture is missing, check the filename on the restaurant page against
  `WEEK_IMAGE` *before* suspecting the cron.
- **How to find out when the chef actually published** — this is what settled
  the 26.10. diagnosis, and it needs no credentials. Two *different* moments
  matter and they can be days apart:

      # when the picture file landed on the CDN
      curl -sI "<image url>" | grep -iE "last-modified|^date|age"
      # when the page that links it was last republished
      curl -sIL "https://www.pegasus-ravintolat.fi/hansasali" \
        | grep -iE "last-modified|^date|age"

  For week 44 the file was up Fri 23.10. 15:52 UTC but the page did not link
  it until Sun 25.10. 13:49 UTC. **The page timestamp is the one that counts** —
  a file on the CDN that nothing links to is invisible to the scrape, and
  mistaking the upload time for the publish time will make a real timing
  problem look like a parser bug or vice versa.

  Corroborate the upload time three ways if it matters; they agreed within 4
  seconds on 26.10.: the `Last-Modified` header, `Date` minus `Age` (when the
  edge first cached it), and decoding the first 4 bytes of the Webflow asset id
  as a Unix timestamp — `date -u -d "@$((0x6adb82b9))"`.

  Caveat: the page's `Last-Modified` says the HTML changed, not *what* changed
  in it. It is an upper bound — if the page links the picture now and has not
  been touched since that stamp, the link has been there since at least then.
  Mind the DST change, too: 23.10. was EEST (+3), 25.10. onwards EET (+2).
- **Known gaps that remain** (both leave the card blank for the week, by
  choice): a two-week range name like `vko 41-42`, and the chef uploading the
  new picture under the *old* week number. Blank-and-retrying was preferred
  over risking the wrong week's menu.

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

   **As deployed (seen 13.11.2026) the True branch holds three actions, not
   one:**

   | action | purpose |
   |---|---|
   | `Julkaise viesti keskustelussa tai kanavassa` | the real delivery |
   | `Julkaise viesti keskustelussa tai kanavassa 2` | a test target |
   | `Lähetä sähköpostiviesti (V2)` | a test target |

   The second Teams post and the email are **test fan-out**, not part of the
   intended delivery. Two consequences before touching the flow: a manual
   *Run* sends **three** messages, so re-running to correct a bad morning
   costs three duplicates; and anyone checking "did the 06:00 message
   arrive" should be clear which of the three they mean. Strip the two test
   actions once the flow is trusted.

   **The flow was disabled on 13.11.2026** while the Gatorade block was being
   worked through. Nothing is delivered until it is switched back on — the
   page and feed keep updating regardless.

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
- **A chef mistypes the date and a whole day is lost.** Varikko's week 46 list
  headed Friday `Perjantai 12.11.` — Thursday's date, repeated. The strict
  date match declined it and the Friday card read "Päivän listaa ei löytynyt".
  `heading_for` now falls back to the **weekday name**, but only when all four
  hold, which is what stops it republishing another week's food: no heading on
  the page carries the right date; some *other* heading does carry the correct
  date for its own slot in that week (`this_week`, the proof the page is this
  week's list); that weekday occurs exactly **once** on the page; and the date
  printed is within **3 days** of the target (`off_by`, year-wrap safe), i.e. a
  typo rather than a different week. A rescue prints a line to stderr. A page
  showing only next week fails the anchor test and still yields nothing.

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
- **Gate the next-week probe to Sunday and Monday (13.11.2026, not built).**
  All five text restaurants publish the whole week at once and next week is
  never up before Sunday, so probing week N+1 on a Wednesday buys nothing.
  Worth little while Gatorade's 403 keeps the daily fetch alive regardless —
  revisit if that block is ever lifted.
- **Do not replace the daily top-up with a single weekly fetch.** Considered
  13.11.2026 and rejected. The data would allow it — every page carries the
  whole week — but the top-up is what catches (a) a restaurant publishing
  after the Sunday window, (b) a chef correcting a list mid-week, which is not
  hypothetical: the Varikko `Perjantai 12.11.` typo would have stayed broken
  all week, and (c) a site being down for the one scheduled attempt. If it
  ever *were* cut to one run a week, Sunday ~20:00 is the only defensible
  slot — see *When does Gatorade publish?* above.
- **The external trigger is now the one open lever (re-assessed 10.11.2026).**
  cron-job.org or similar POSTing to GitHub's `workflow_dispatch` API with a
  fine-grained PAT scoped to this repo, Actions: write. It was parked as "only
  worth doing if menus still turn up missing at lunchtime" — they now do, twice
  in a fortnight (Hansasali 26.10., Gatorade 10.11.), and the weekday run has
  drifted to ≈14:30 Helsinki, i.e. past the end of lunch. Nothing else moves a
  run before 06:00: more crons were measured as producing no extra runs, and
  Power Automate cannot trigger GitHub without the premium HTTP action. A
  dispatch at ~05:00 Helsinki would feed the 06:00 delivery the same morning.
  It would have fixed the Hansasali 26.10. case, but **not** Gatorade 10.11.,
  which was a 403 block, not timing. **Not built — decide first**, since it
  means a PAT living outside the repo.
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

## Running it by hand (13.11.2026)

Because Gatorade answers a home connection but not GitHub's runners, filling
a week by hand is a routine job rather than an emergency. Three ways in, all
the same underlying command:

    npm run lunch              # every restaurant
    npm run lunch:gatorade     # just Gatorade
    npm run lunch:list         # the keys --only accepts

In VS Code without node: **Terminal → Run Task → `lunch: fetch all`** (or
`lunch: fetch Gatorade only`), from `.vscode/tasks.json`. Or run it directly:

    uv run --no-project --python 3.12 --with tzdata .github/lunch/fetch.py --strict

**`uv` is the only prerequisite** — it fetches its own Python, so nothing
else needs installing. node is needed for the `npm run` spellings only; the
VS Code tasks and the direct command do not use it.

VS Code's **NPM Scripts** panel (bottom of the Explorer) is contributed by
the built-in npm extension and only renders when node/npm is on PATH — so
the scripts are listed on the home machine and simply absent on one without
node. That is the panel's behaviour, not a missing `package.json`. If node
is installed and the panel still does not appear, it is hidden rather than
missing: Explorer `...` menu → tick **NPM Scripts**, or set
`"npm.autoDetect": "on"`. The VS Code tasks are the node-free route and work
on any machine with `uv`.

Flags on `fetch.py`:

| flag | what it does |
|---|---|
| `--only KEY[,KEY...]` | fetch just these; everything already held is still rendered, so the page and feed stay complete — only the *fetching* is narrowed |
| `--strict` | exit 1 if any site could not be fetched |
| `--list` | print the restaurant keys |
| `--help` | usage |

**`--strict` is deliberately off in `lunch.yml`.** A manual run should go red
when Gatorade 403s, because the person running it wants to know. A scheduled
run should not, because that block is known and accepted (see above) and a
permanently red workflow trains you to ignore it. The npm scripts and the VS
Code tasks all pass `--strict`; CI passes nothing.

A failed fetch now prints a summary last, after the per-restaurant lines, so
it is the thing left on screen — with the 403 explained in place, including
the reminder not to route around it. Nothing is half-written: whatever was
already held is still rendered.

After a successful run, commit and push `products/lunch`.

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
