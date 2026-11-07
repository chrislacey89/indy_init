# Two Hops: build plan

**211 for Indiana founders, except it counts the handshakes.**

A founder anywhere in Indiana asks for help once and is routed to the nearest listed support organization. The organization approves an AI-drafted warm introduction, and the handshake is recorded. From that record alone, a 92-county map shows how far every founder is from help.

**Peak moment:** a judge enters their own county and need; Ryan approves the drafted intro on his phone; the judge's county lights up on the map.

Stack: TanStack Start, TypeScript, Drizzle, Cloudflare Workers + D1.

## Clock

Planned on a 9:00 start (the guide says 9:00, the website says 9:30; confirmed at the welcome).

| Mark | Time |
|---|---|
| Start | 9:00 |
| Kickoff block ends | 9:20 |
| Checkpoints | 10:50, 12:20, 1:50, 3:20 |
| Freeze (no new features) | 3:45 |
| Submit by | 4:45 |
| Submissions close | 5:00 |

At each checkpoint we take the median minutes per accepted rung and re-plan the rest of the ladder from that number. The freeze and the deadline never move; the ladder does.

## Ladder

A rung is done when Ryan accepts it on the live URL against its done-condition.

| Rung | Adds | Done when | Tracer test | Stretch |
|---|---|---|---|---|
| 0 | Kickoff: repo, tests, CI on push, live URL, org data import | Ryan opens the live URL on laptop and phone | Health route returns 200; import rejects rows without a county | |
| 1 | Record one introduction; 92-county map colored by count | Ryan submits from his phone and the county changes on the laptop | Posting an intro increments only its county; all 92 counties render at zero | |
| 2 | Front door: need + county in a text-thread page; lookup routes same county, then adjacent; saved as pending | Ryan tries three counties, including one with nothing listed | Every one of the 92 counties resolves to an organization | |
| 3 | Approve tap: AI drafts the intro, a human edits and approves; pending becomes made | Ryan edits one line, approves, and the county turns from pending to made | No intro reaches made without an approval record; every draft stores model and prompt version | |
| 4 | The number: landed / cold states; introductions, hops, counties from help, per county | Ryan checks the numbers by hand against the demo data | Founder to org to person is 2 hops; county totals equal the sum of the record | |
| 5 | Who should meet this founder: ranked shortlist with reasons | Ryan explains three shortlists without asking Chris | Never lists a node without an approved intro | ~ |
| 6 | Passport stamps per landed intro | Ryan earns two stamps on his phone | A stamp exists only for a landed intro | ~ |

**Cut order:** 6, then 5, then map geometry to a 92-cell grid, then AI need classification to a dropdown, then outcome states to pending/made.
**Never cut:** the record, the map, the approve tap, the live deploy.

## Ticked rungs

_(Ryan ticks each rung here when he accepts it.)_
