# Two Hops: build plan

**211 for Indiana founders, except it counts the handshakes.**

A founder anywhere in Indiana asks for help once and is routed to the nearest listed support organization. The organization approves an AI-drafted warm introduction, and the handshake is recorded. From that record alone, a 92-county map shows how far every founder is from help.

**Peak moment:** a judge enters their own county and need; Ryan approves the drafted intro on his phone; the judge's county lights up on the map.

Stack: TanStack Start, TypeScript, Drizzle, Cloudflare Workers + D1.

## Clock

The build actually started at 9:25 ("the build starts now" at the welcome). Times below are from that start.

| Mark                     | Time                     |
| ------------------------ | ------------------------ |
| Start                    | 9:25                     |
| Kickoff block ends       | 9:20                     |
| Checkpoints              | 11:15 (held 11:30), 12:45, 2:15 |
| Freeze (no new features) | 3:45                     |
| Submit by                | 4:45                     |
| Submissions close        | 5:00                     |

At each checkpoint we take the median minutes per accepted rung and re-plan the rest of the ladder from that number. The freeze and the deadline never move; the ladder does.

## Ladder

A rung is done when Ryan accepts it on the live URL against its done-condition.

| Rung | Adds                                                                                                        | Done when                                                                | Tracer test                                                                                   | Stretch |
| ---- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------- |
| 0    | Kickoff: repo, tests, CI on push, live URL, org data import                                                 | Ryan opens the live URL on laptop and phone                              | Health route returns 200; import rejects rows without a county                                |         |
| 1    | Record one introduction; 92-county map colored by count                                                     | Ryan submits from his phone and the county changes on the laptop         | Posting an intro increments only its county; all 92 counties render at zero                   |         |
| 2    | Front door: need + county in a text-thread page; lookup routes same county, then adjacent; saved as pending | Ryan tries three counties, including one with nothing listed             | Every one of the 92 counties resolves to an organization                                      |         |
| 3    | Approve tap: AI drafts the intro, a human edits and approves on passcode-protected /approve; pending becomes made and the intro appears in the founder's thread                          | Ryan edits one line, approves, and the county turns from pending to made | No intro reaches made without an approval record; every draft stores model and prompt version |         |
| 3.5  | Langfuse traces: every AI draft (prompt, model, output) traced; Ryan's edit or approval logged as a score | Ryan opens Langfuse, finds the trace for a draft he edited, and sees his correction as a score | Every draft call emits one trace with model and prompt version; an approval writes a score to that trace | ~       |
| 4    | The number: landed / cold states; introductions, hops, counties from help, per county                       | Ryan checks the numbers by hand against the demo data                    | Founder to org to person is 2 hops; county totals equal the sum of the record                 |         |
| 5    | Who should meet this founder: ranked shortlist with reasons                                                 | Ryan explains three shortlists without asking Chris                      | Never lists a node without an approved intro                                                  | ~       |
| 6    | Passport stamps per landed intro                                                                            | Ryan earns two stamps on his phone                                       | A stamp exists only for a landed intro                                                        | ~       |
| 7    | Did-it-happen follow-up: after a set time, only if founder and ESO agreed to meet, the ESO rep gets an email (SMS later) asking yes/no and a short what-came-of-it text box; the answer marks landed | Ryan answers a follow-up from his phone and the intro turns landed | No intro becomes landed without a recorded yes | ~       |

**Cut order:** 6, then 5, then 3.5 (Langfuse), then map geometry to a 92-cell grid, then AI need classification to a dropdown, then outcome states to pending/made.
**Never cut:** the record, the map, the approve tap, the live deploy.

## Demo: how we built it (capture for the recap)

- **Two humans, two agents, one shared thread.** Chris's build agent and Ryan's product agent coordinate through a Kody Exchange thread: questions, answers, rung acceptance and pushback. Ryan's agent keeps a clone of the repo and checks each rung against its done-condition; only Ryan's own "accepted" counts.
- **Decisions before code.** Every product call is confirmed by Chris or Ryan (in the thread or the build brief) before it's built, and logged in DECISIONS.md tagged product or technical.
- **Where the AI needed correcting:** it built product calls without asking (fixed with the product/technical rule); it added rung 2 before rung 1 was accepted; it said Effect couldn't reach Gemini natively (wrong; Chris pushed back and the compat route turned up); the Gemini key was out of credits (switched to OpenAI after a 1-minute spike).
- **At the freeze:** export the Kody thread to `docs/alignment-log.md` so judges can read the actual back-and-forth.

## Ticked rungs

_(Ryan ticks each rung here when he accepts it.)_

- [x] Rung 0, accepted by Ryan 10:15 on the live URL.
- [x] Rung 1, accepted by Ryan 10:27 on the live URL.
- [x] Rung 2, accepted by Ryan 10:51 on the live URL.
- [ ] **Rung 3, ready for Ryan (deployed 11:50).** On your phone, open https://two-hops.chrislacey89.workers.dev, send a request from a county with no gold yet, and fill in the new optional "How should they reach you?" field. Tap "Open your conversation" and leave that tab open. Use **Marion County + Accelerators & incubators** so it routes to Elevate Ventures. Then open https://two-hops.chrislacey89.workers.dev/approve and sign in with **your own passcode** (from Chris). You see only Elevate Ventures' requests; the super admin passcode sees every org. Your request is at the top with a gpt-4.1-mini draft and your contact info. Edit one line, then tap "Approve and send". Done when: the intro appears in your conversation tab without a refresh, your county turns from a blue dot to gold, and the other cards still show their drafts. Also re-accept the front door, since it gained the contact field.

## Ryan: what to do next (in order)

1. ~~**Accept rung 2 (about 5 min).**~~ Done 10:51. Follow the rung 2 line under Ticked rungs: three requests from your phone (Marion, Allen, Vermillion). Tick it, or write the gap in one sentence.
2. ~~**Confirm or overrule three product calls Chris's agent made without you (about 2 min):**~~ Done 10:50: all three kept; map adds a pending dot over made fill (see DECISIONS.md).
   - (a) Front-door reply wording. It runs about three sentences now; you asked for one or two. Write the version you want, or say "shorten it."
   - (b) Map colors: blue = waiting on a person (pending), gold = introduction made.
   - (c) Ranking inside a county: orgs tagged with the requested help first, then claimed listings, then the rest.
3. ~~**Shape rung 3, the peak moment (about 10 min).**~~ Done 10:50: answers in DECISIONS.md (Product rows) and the build-day thread. Answer under each question below. Rung 3 code waits on these.
   1. What does the AI-drafted intro say? Who is it from, how long is it, and does it name the founder's need?
   2. What does your approve screen show: a list of pending requests, or one at a time?
   3. What happens to a draft you edit, and one you reject?
   4. What counts as "landed" for rung 4, and who marks it?
   5. How does the screen say you're standing in for the org?
4. ~~**At 11:15, call checkpoint 1 out loud.**~~ Held 11:30: about 12 minutes per rung, so we add rungs. Next checkpoints: 12:45 and 2:15. When rung 3 ships, re-accept the front door too (it gains the optional contact field).
5. **Later, before 4:45:** create the Devpost project with both teammates (table 25).

## Open questions for Ryan (shape in parallel; needed before rung 2)

1. Organizers: may we import the ConnectIND dataset gathered before the event? Does pre-installed tooling count as pre-built code?

   **Ryan:** Yes, we may import the ConnectIND datasets. Pre-installed tooling does not count as pre-built code.

2. Accept rung 0 on the live URL (laptop + phone).

   **Ryan:** Accepted (ticked above).

3. The 202 listings with no county: statewide fallback, or missing data?

   **Ryan:** Statewide fallback. After the dead/unrelated exclusions, 186 remain; they have a blank county in `data/organizations.csv`, which `routeFounder` already treats as statewide.

4. Spotcheck: exclude listings flagged dead/unrelated from routing?

   **Ryan:** Exclude all of them, dead and unrelated alike. Done in `data/organizations.csv` (57 dead, 21 more unrelated; 768 kept). Consequence: 5 counties now have no organization (Fountain, Jennings, Posey, Starke, Vermillion), not 3. Fountain lost Attica Main Street (domain now serves gambling spam), Jennings lost North Vernon Main Street (dead). The pitch number changes to 5.

5. "155 dead websites": source? The org file shows 57.

   **Ryan:** Both are right. 155 is all public listings (organizations + resources, 155/1,792 with a website); 57 is organizations only (57/832). Source: Ryan's 2026-10-05 ConnectIND audit. Routing uses organizations, so 57 is the number that applies.

6. Demo: which 2-3 real orgs and counties star, including one empty county?

   **Ryan:** Marion and Allen star, even if the judge does not live there: "pretend an entrepreneur is looking for resources in Fort Wayne (Allen County)." Vermillion is the no-organization county, used to demo routing to an adjacent county. Pick the featured orgs from live, claimed listings.

7. Front door: the founder's reply wording.

   **Ryan:** A picklist, not free text, keyed to the kind of help requested. ConnectIND's goal is the full menu of support visible to the founder; its own Resource Type tags (19 of them) collapse to six choices, carried per org in `support_types`:
   - Funding (funding, grants, equity, pitch competitions, incentives)
   - Mentoring & advising (mentorship, technical assistance, business plans, networking)
   - Training & classes (educational programs, certifications)
   - Space to work (space, coworking, makerspace)
   - Accelerators & incubators
   - Permits & licensing (permits, procurement, site selection)

   Data note: only 340 of 768 orgs carry any tag, so a choice should rank tagged orgs first, not filter untagged ones out, or most counties match nothing. The reply text per choice is one or two plain sentences, like a text from a person.

8. Rung 3: who plays the receiving org in the demo?

   **Ryan:** Ryan taps approve for the receiving organization, in whatever county the judge enters, and the screen says so. Ownership is the weak link everywhere: even Marion has an owner on 74 of 216 listings, and program listings are weaker still (109 of 964 owned). So the demo shows a person standing in for the org rather than claiming a real one responded.

9. Devpost project + teammate; table number.

   **Ryan:** Teammates Ryan Allison and Chris Lacey. Table 25. The Devpost write-up is held and revisited later; the project itself must exist with both teammates before the 4:45 submit mark.

