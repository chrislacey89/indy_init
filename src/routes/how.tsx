import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Brand } from "#/components/Brand";

export const Route = createFileRoute("/how")({
	head: () => ({ meta: [{ title: "How we built it · Two Hops" }] }),
	component: HowWeBuiltIt,
});

const REPO = "https://github.com/chrislacey89/indy_init";
const THREAD =
	"https://kody.exchange/t/kx_view_deea2e70b8574bdf5e4475bf5b4453c56fd5ac44640e5396";
const TRACE =
	"https://us.cloud.langfuse.com/trace/a47f654f0d4fab35008602af5a36e47b";

/** The peak path: each station is a step in the end-to-end test and a live log event. */
const STATIONS = [
	{ step: "Founder asks", event: "help_requested" },
	{ step: "AI drafts", event: "draft_created" },
	{ step: "Person approves", event: "intro_approved" },
	{ step: "Intro emailed", event: "intro_emailed" },
	{ step: "“Yes, let’s meet”", event: "meeting_agreed" },
	{ step: "Follow-up", event: "follow_up_sent" },
	{ step: "Landed", event: "intro_landed" },
];

/** The day on one axis, 9:25 to the 3:45 freeze. Minutes from 9:25. */
const DAY_START = 9 * 60 + 25;
const DAY_END = 15 * 60 + 45;
const at = (h: number, m: number) =>
	((h * 60 + m - DAY_START) / (DAY_END - DAY_START)) * 100;
const RUNGS: { label: string; t: number; note: string; pending?: boolean }[] = [
	{ label: "0", t: at(10, 15), note: "Repo, CI, live URL" },
	{ label: "1", t: at(10, 27), note: "Record + map" },
	{ label: "2", t: at(10, 51), note: "Front door" },
	{ label: "3", t: at(12, 31), note: "Draft + approve" },
	{ label: "4", t: at(13, 36), note: "The number, email, Langfuse" },
	{ label: "7", t: at(13, 59), note: "Follow-up" },
	{ label: "8·9", t: at(14, 15), note: "E2E in CI, this page" },
];
const CHECKPOINTS = [
	{ t: at(11, 30), note: "12 min/rung: add rungs" },
	{ t: at(12, 51), note: "47 min/rung: cut 5 and 6" },
	{ t: at(13, 59), note: "29 min/rung: add 8 and 9" },
];

/** Trimmed from the Langfuse API for the sample trace (values verbatim; internal ids dropped). */
const TRACE_PROMPT = `You are writing on behalf of Elevate Ventures, an Indiana entrepreneur-support organization in Marion County.
A founder named Riley in Marion County asked for help with: accelerators & incubators.
Write a warm introduction from Elevate Ventures to Riley, 3-4 sentences, plain and friendly like a text from a real person.
Address Riley by first name, name what they asked for, say briefly how Elevate Ventures can help, and end with one concrete next step (for example, a short call or a visit).
Do not invent specific people, phone numbers, emails, dates, prices, or programs. No subject line, no signature block, no emoji. Return only the message text.`;
const TRACE_DRAFT =
	"Hi Riley, thanks for reaching out about accelerators and incubators in Marion County. At Elevate Ventures, we connect founders like you with local programs and resources to help your business grow and succeed. I’d love to set up a quick call to learn more about your startup and share some options that might be a good fit. Let me know a time that works for you!";
const TRACE_JSON = {
	traceId: "a47f654f0d4fab35008602af5a36e47b",
	observations: [
		{
			type: "SPAN",
			name: "draft-intro",
			id: "4db74d0e546e4ce4",
			isRootObservation: true,
			userId: "ryan",
			startTime: "2026-11-07T18:19:12.111Z",
			endTime: "2026-11-07T18:19:13.579Z",
			latency: 1.468,
			input:
				"You are writing on behalf of Elevate Ventures, … A founder named Riley in Marion County asked for help with: accelerators & incubators. …",
			output:
				"Hi Riley, thanks for reaching out about accelerators and incubators in Marion County. …",
		},
		{
			type: "GENERATION",
			name: "LanguageModel.generateText",
			id: "91c8b1c3f57313c8",
			parentObservationId: "4db74d0e546e4ce4",
			model: "gpt-4.1-mini-2025-04-14",
			usageDetails: { input: 146, output: 77, total: 223 },
			costDetails: { input: 0.0000584, output: 0.0001232, total: 0.0001816 },
			latency: 1.468,
		},
	],
	scores: [
		{
			name: "human_review",
			source: "API",
			dataType: "CATEGORICAL",
			value: "approved_as_is",
			timestamp: "2026-11-07T18:19:21.840Z",
		},
	],
};

function Ext({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="inline-flex items-center gap-1.5 rounded-full border border-[var(--th-line-dark)] px-3 py-1 text-[13px] font-semibold text-[var(--th-ink)]! no-underline! transition-colors hover:border-[var(--th-gold)] hover:text-[var(--th-gold)]!"
		>
			{children}
			<span aria-hidden="true">↗</span>
		</a>
	);
}

function Tile({
	n,
	title,
	children,
	links,
	wide,
}: {
	n: string;
	title: string;
	children: ReactNode;
	links?: ReactNode;
	wide?: boolean;
}) {
	return (
		<section
			className={`flex flex-col gap-3 rounded-2xl border border-[var(--th-line-dark)] bg-[var(--th-bg-deep)] p-6 ${wide ? "md:col-span-2" : ""}`}
		>
			<p className="th-kicker m-0">{n}</p>
			<h2 className="m-0 text-[22px] font-extrabold leading-tight tracking-tight text-[var(--th-ink)]">
				{title}
			</h2>
			<div className="space-y-2 text-[15px] leading-relaxed text-[var(--th-muted)]">
				{children}
			</div>
			{links && (
				<div className="mt-auto flex flex-wrap gap-2 pt-2">{links}</div>
			)}
		</section>
	);
}

/** Rung 9: the factory tour, for a judge, in 60 seconds. */
function HowWeBuiltIt() {
	return (
		<main className="th-page">
			<header className="th-head">
				<Brand where="How we built it" />
				<h1 className="th-title">
					Two humans, two <em>agents</em>, one thread.
				</h1>
				<p className="th-lede">
					Built from an empty repo at Indy Init on November 7, 2026. Chris Lacey
					builds with Claude Code. Ryan Allison owns the product and works
					through his own agent. Nothing counted as done until Ryan accepted it
					on the live site.
				</p>
				<div className="th-stats grid! grid-cols-2 gap-5! sm:flex!">
					<div>
						<b>42</b>
						<span>tests, run on every push</span>
					</div>
					<div>
						<b>68</b>
						<span>decisions logged, with what we rejected</span>
					</div>
					<div>
						<b>31</b>
						<span>messages between the two agents</span>
					</div>
					<div>
						<b>80+</b>
						<span>commits since 9:25</span>
					</div>
				</div>
			</header>

			{/* The peak path as an assembly line */}
			<section aria-labelledby="line-title" className="grid gap-5">
				<div>
					<p className="th-kicker">The peak path</p>
					<h2
						id="line-title"
						className="m-0 text-[26px] font-extrabold tracking-tight"
					>
						Seven stations. Tested in CI, logged live.
					</h2>
				</div>
				<ol className="relative m-0 grid list-none gap-4 p-0 sm:grid-cols-7 sm:gap-2">
					<span
						aria-hidden="true"
						className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-[var(--th-gold)] sm:left-[7%] sm:right-[7%] sm:top-[11px] sm:bottom-auto sm:h-[2px] sm:w-auto"
					/>
					{STATIONS.map((s, i) => (
						<li
							key={s.event}
							className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:text-center"
						>
							<span
								className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-[var(--th-gold)] text-[11px] font-extrabold ${i === STATIONS.length - 1 ? "bg-[var(--th-gold)] text-[var(--th-ink-dark)]" : "bg-[var(--th-bg)] text-[var(--th-gold)]"}`}
							>
								{i + 1}
							</span>
							<span className="grid gap-1">
								<span className="text-[15px] font-bold leading-tight text-[var(--th-ink)]">
									{s.step}
								</span>
								<span className="break-all font-mono text-[11px] text-[var(--th-muted)]">
									{s.event}
								</span>
							</span>
						</li>
					))}
				</ol>
				<p className="m-0 max-w-[68ch] text-[15px] leading-relaxed text-[var(--th-muted)]">
					One{" "}
					<a
						href={`${REPO}/blob/main/src/e2e/peakPath.test.ts`}
						target="_blank"
						rel="noreferrer"
						className="font-semibold text-[var(--th-ink)]! underline decoration-[var(--th-gold)] underline-offset-4"
					>
						end-to-end test
					</a>{" "}
					walks every station in order: Marion County, an accelerator, Elevate
					Ventures, Ryan's approval, a yes on the follow-up. If any station
					breaks, CI goes red. An intro counts as landed only on a recorded yes.
				</p>
			</section>

			{/* The day on one axis */}
			<section aria-labelledby="day-title" className="grid gap-5">
				<div>
					<p className="th-kicker">The day</p>
					<h2
						id="day-title"
						className="m-0 text-[26px] font-extrabold tracking-tight"
					>
						Re-planned from measured pace, not guesses.
					</h2>
				</div>
				<div className="overflow-x-auto rounded-2xl border border-[var(--th-line-dark)] bg-[var(--th-bg-deep)] px-5 pt-14 pb-6 sm:px-8">
					<div className="relative mx-2 h-[2px] min-w-[600px] bg-[var(--th-line-dark)]">
						{RUNGS.map((r) => (
							<div
								key={r.label}
								className="absolute -translate-x-1/2"
								style={{ left: `${r.t}%`, top: -11 }}
								title={r.note}
							>
								<span
									className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[11px] font-extrabold ${r.pending ? "border-2 border-[var(--th-gold)] bg-[var(--th-bg-deep)] text-[var(--th-gold)]" : "bg-[var(--th-gold)] text-[var(--th-ink-dark)]"}`}
								>
									{r.label}
								</span>
							</div>
						))}
						{CHECKPOINTS.map((c) => (
							<div
								key={c.t}
								className="absolute -translate-x-1/2"
								style={{ left: `${c.t}%`, top: 18 }}
								title={c.note}
							>
								<span className="block h-3 w-3 rotate-45 border-2 border-[var(--th-ink)] bg-[var(--th-bg-deep)]" />
							</div>
						))}
						<span className="absolute -top-9 left-0 font-mono text-[11px] text-[var(--th-muted)]">
							9:25 start
						</span>
						<span className="absolute -top-9 right-0 font-mono text-[11px] text-[var(--th-gold)]">
							3:45 freeze
						</span>
					</div>
					<div className="mt-10 flex min-w-[600px] flex-wrap gap-x-6 gap-y-2 text-[13px] text-[var(--th-muted)]">
						<span className="inline-flex items-center gap-2">
							<span className="h-3 w-3 rounded-full bg-[var(--th-gold)]" />
							Rung accepted by Ryan
						</span>
						<span className="inline-flex items-center gap-2">
							<span className="h-2.5 w-2.5 rotate-45 border-2 border-[var(--th-ink)]" />
							Checkpoint: measure minutes per rung, re-plan
						</span>
					</div>
				</div>
				<ul className="m-0 grid list-none gap-2 p-0 text-[14px] text-[var(--th-muted)] sm:grid-cols-3">
					{CHECKPOINTS.map((c, i) => (
						<li
							key={c.t}
							className="border-l-[3px] border-[var(--th-ink)] pl-3"
						>
							<b className="text-[var(--th-ink)]">Checkpoint {i + 1}.</b>{" "}
							{c.note}
						</li>
					))}
				</ul>
			</section>

			{/* The evidence */}
			<section aria-label="The evidence" className="grid gap-4 md:grid-cols-2">
				<Tile
					n="01 · The thread"
					title="Two agents, one shared thread"
					links={
						<>
							<Ext href={THREAD}>Live thread</Ext>
							<Ext href={`${REPO}/blob/main/docs/alignment-log.md`}>
								Exported log
							</Ext>
						</>
					}
				>
					<p>
						Chris's build agent and Ryan's product agent worked through
						questions, answers, pushback and acceptance in one Kody Exchange
						thread. Ryan's agent relayed his calls but never made them.
					</p>
				</Tile>

				<Tile
					n="02 · Decisions"
					title="Decisions before code"
					links={
						<>
							<Ext href={`${REPO}/blob/main/DECISIONS.md`}>DECISIONS.md</Ext>
							<Ext href={`${REPO}/blob/main/PLAN.md`}>PLAN.md</Ext>
						</>
					}
				>
					<p>
						Every call is tagged Product or Technical. Product calls needed a
						yes from Ryan or Chris before anything was built. The rule exists
						because the AI made product calls on its own early in the day.
					</p>
				</Tile>

				<Tile
					n="03 · Gates"
					title="Tests and gates on every change"
					links={
						<>
							<Ext href={`${REPO}/actions`}>GitHub Actions</Ext>
							<Ext href={`${REPO}/blob/main/lefthook.yml`}>Commit gates</Ext>
						</>
					}
				>
					<p>
						CI runs lint, typecheck, tests and a gitleaks secret scan on every
						push. Each commit runs the same checks, and each push audits
						dependencies. The audit blocked our pushes twice today. Agent hooks
						block code written without tests.
					</p>
				</Tile>

				<Tile n="04 · Security" title="Trust boundaries, built in">
					<ul className="m-0 list-disc space-y-1 pl-5">
						<li>
							Turnstile plus 20 requests a minute per IP at the front door.
						</li>
						<li>
							Each organization sees only its own requests. The server checks
							this on every approve action.
						</li>
						<li>
							A founder's contact details are shown only to the approving
							organization.
						</li>
						<li>Secrets live only in Worker secrets.</li>
					</ul>
				</Tile>

				<Tile
					n="05 · AI you can audit"
					title="The AI drafts. A person approves. The record shows both."
					wide
					links={<Ext href={TRACE}>Sample Langfuse trace</Ext>}
				>
					<p>
						Every draft stores the AI's original text, the person's edit, the
						model and the prompt version. Each draft is a Langfuse trace with
						the prompt, the output, tokens and cost, and Ryan's approvals and
						edits are scores on that trace. The AI never sends, routes or
						changes a record.
					</p>
				</Tile>
			</section>

			{/* Under the hood: one real Langfuse trace */}
			<section aria-labelledby="hood-title" className="grid gap-5">
				<div>
					<p className="th-kicker">06 · Under the hood</p>
					<h2
						id="hood-title"
						className="m-0 text-[26px] font-extrabold tracking-tight"
					>
						One real draft, as Langfuse saw it.
					</h2>
					<p className="mt-2 mb-0 max-w-[68ch] text-[15px] leading-relaxed text-[var(--th-muted)]">
						A founder named Riley (test data) asked for an accelerator in Marion
						County at 1:19 PM. The draft took 1.5 seconds and cost under two
						hundredths of a cent. Ryan approved it as written 8 seconds later,
						and that approval was written back to the trace as a score.
					</p>
				</div>
				<div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<div className="grid content-start gap-3">
						<ol className="m-0 grid list-none gap-2 p-0">
							{[
								{
									kind: "SPAN",
									name: "draft-intro",
									meta: "root · 1.468 s · user ryan",
									indent: false,
								},
								{
									kind: "GENERATION",
									name: "gpt-4.1-mini",
									meta: "146 in · 77 out · $0.00018",
									indent: true,
								},
								{
									kind: "SCORE",
									name: "human_review",
									meta: "approved_as_is · +8 s",
									indent: false,
								},
							].map((n) => (
								<li
									key={n.kind}
									className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[var(--th-line-dark)] bg-[var(--th-bg-deep)] px-4 py-3 ${n.indent ? "ml-6" : ""}`}
								>
									<span
										className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider ${n.kind === "SCORE" ? "bg-[var(--th-gold)] text-[var(--th-ink-dark)]" : "border border-[var(--th-gold)] text-[var(--th-gold)]"}`}
									>
										{n.kind}
									</span>
									<span className="whitespace-nowrap font-mono text-[13px] font-bold text-[var(--th-ink)]">
										{n.name}
									</span>
									<span className="w-full font-mono text-[11px] text-[var(--th-muted)] sm:ml-auto sm:w-auto sm:text-right">
										{n.meta}
									</span>
								</li>
							))}
						</ol>
						<details className="group rounded-xl border border-[var(--th-line-dark)] bg-[var(--th-bg-deep)] px-4 py-3">
							<summary className="cursor-pointer text-[14px] font-bold text-[var(--th-ink)]">
								The prompt (note the guardrails in the last line)
							</summary>
							<p className="mt-3 mb-0 whitespace-pre-line text-[13px] leading-relaxed text-[var(--th-muted)]">
								{TRACE_PROMPT}
							</p>
						</details>
						<div className="rounded-xl border-l-[3px] border-[var(--th-gold)] bg-[var(--th-bg-deep)] px-4 py-3">
							<p className="th-kicker mb-2">The draft Ryan approved</p>
							<p className="m-0 text-[14px] leading-relaxed text-[var(--th-ink)]">
								{TRACE_DRAFT}
							</p>
						</div>
					</div>
					<div className="min-w-0 overflow-hidden rounded-xl border border-[var(--th-line-dark)] bg-[#050f24]">
						<div className="flex items-center justify-between border-b border-[var(--th-line-dark)] px-4 py-2">
							<span className="font-mono text-[11px] text-[var(--th-muted)]">
								GET /api/public/observations?traceId=a47f…6e47b
							</span>
							<span className="font-mono text-[11px] text-[var(--th-gold)]">
								200
							</span>
						</div>
						<pre className="m-0 max-h-[460px] overflow-auto whitespace-pre-wrap break-words bg-transparent! p-4 font-mono text-[12px] leading-[1.55] text-[var(--th-muted)]">
							{JSON.stringify(TRACE_JSON, null, 2)}
						</pre>
					</div>
				</div>
			</section>

			{/* Where the AI needed correcting */}
			<section
				aria-labelledby="fix-title"
				className="rounded-2xl border-2 border-[var(--th-gold)] p-6 sm:p-8"
			>
				<p className="th-kicker">07 · Honest about the AI</p>
				<h2
					id="fix-title"
					className="m-0 mb-4 text-[26px] font-extrabold tracking-tight"
				>
					Where the AI needed correcting
				</h2>
				<ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
					{[
						"It made product calls without asking. We added the Product/Technical rule.",
						"It started rung 2 before Ryan had accepted rung 1.",
						"It said Effect couldn't reach Gemini natively. Chris pushed back, and a compatible route turned up.",
						"The Gemini key ran out of credits. A one-minute spike moved us to OpenAI.",
					].map((t, i) => (
						<li key={t} className="flex gap-3 text-[15px] leading-relaxed">
							<span className="w-6 shrink-0 font-mono text-[13px] font-bold text-[var(--th-gold)]">
								{String(i + 1).padStart(2, "0")}
							</span>
							<span className="text-[var(--th-muted)]">{t}</span>
						</li>
					))}
				</ol>
			</section>
		</main>
	);
}
