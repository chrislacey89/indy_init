import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/how")({
	head: () => ({ meta: [{ title: "How we built it · Two Hops" }] }),
	component: HowWeBuiltIt,
});

const REPO = "https://github.com/chrislacey89/indy_init";

function Ext({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="font-semibold underline underline-offset-4"
		>
			{children}
		</a>
	);
}

function Section({
	title,
	lede,
	children,
}: {
	title: string;
	lede: string;
	children: ReactNode;
}) {
	return (
		<Card className="max-w-3xl">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{lede}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2 text-sm leading-6">
				{children}
			</CardContent>
		</Card>
	);
}

/** Rung 9: the factory tour, for a judge, in 60 seconds. */
function HowWeBuiltIt() {
	return (
		<main className="th-page">
			<header className="th-head">
				<p className="th-kicker">Two Hops · How we built it</p>
				<h1 className="th-title">Two humans, two agents, one thread.</h1>
				<p className="th-lede">
					Built from an empty repo at Indy Init on November 7, 2026, by Chris
					Lacey (builds with Claude Code) and Ryan Allison (product owner,
					writes no code, works through his own agent).
				</p>
			</header>

			<div className="flex flex-col gap-4">
				<Section
					title="1. The shared agent thread"
					lede="Chris's build agent and Ryan's product agent coordinated in one Kody Exchange thread: questions, answers, pushback and acceptance."
				>
					<p>
						A feature counted as done only when Ryan himself accepted it on the
						live site. His agent relayed it, but it never decided.
					</p>
					<ul className="list-disc space-y-1 pl-5">
						<li>
							<Ext href="https://kody.exchange/t/kx_view_deea2e70b8574bdf5e4475bf5b4453c56fd5ac44640e5396">
								The live thread (read-only)
							</Ext>
						</li>
						<li>
							<Ext href={`${REPO}/blob/main/docs/alignment-log.md`}>
								The thread exported to the repo
							</Ext>
						</li>
					</ul>
				</Section>

				<Section
					title="2. A ladder, re-planned from measured pace"
					lede="We planned the day as rungs. Each one could be demoed on its own and had a written done-condition and a test that proves it."
				>
					<p>
						Every 90 minutes we measured our actual minutes per accepted rung
						and re-planned the rest of the ladder from that number, not from a
						guess. We cut two rungs at 12:45 and added two at 1:59. The freeze
						never moved.
					</p>
					<p>
						<Ext href={`${REPO}/blob/main/PLAN.md`}>PLAN.md</Ext>: the ladder,
						the checkpoints, and the rungs Ryan ticked.
					</p>
				</Section>

				<Section
					title="3. Decisions before code"
					lede="Every call is logged with what we rejected and why. Product calls needed a yes from Ryan or Chris before anything was built."
				>
					<p>
						<Ext href={`${REPO}/blob/main/DECISIONS.md`}>DECISIONS.md</Ext> tags
						each row Product or Technical. The rule exists because the AI made
						product calls without asking early on. We caught it and wrote the
						rule down.
					</p>
				</Section>

				<Section
					title="4. Tests and CI on every push"
					lede="The domain rules are pure functions, each next to its tests. One end-to-end test walks the whole peak path."
				>
					<p>
						<Ext href={`${REPO}/blob/main/src/e2e/peakPath.test.ts`}>
							The peak-path test
						</Ext>{" "}
						checks every step in order: a founder in Marion asks for an
						accelerator and is routed to Elevate Ventures. The AI drafts an
						intro. Ryan approves it and the county turns from waiting to made.
						The founder taps "We're meeting." The follow-up goes out once.
						Elevate answers yes, and only then does the intro count as landed.
						If any step breaks, CI goes red.
					</p>
					<p>
						<Ext href={`${REPO}/actions`}>GitHub Actions</Ext> runs lint,
						typecheck, the tests and a gitleaks secret scan on every push. Local
						hooks block code written without tests and destructive git commands,
						and audit dependencies before each push.
					</p>
				</Section>

				<Section
					title="5. AI you can audit"
					lede="The AI drafts. A person approves. The record shows both."
				>
					<p>
						Every draft stores the AI's original text, the person's edit, the
						model and the prompt version. Each draft is a Langfuse trace, and
						Ryan's approvals and edits are scores on that trace, so you can see
						where the AI needed correcting.
					</p>
					<p>
						<Ext href="https://us.cloud.langfuse.com/trace/a47f654f0d4fab35008602af5a36e47b">
							A sample trace
						</Ext>
					</p>
				</Section>

				<Section
					title="6. Where the AI needed correcting"
					lede="All of it is in the decision log and the thread."
				>
					<ul className="list-disc space-y-1 pl-5">
						<li>It made product calls without asking, so we added the rule.</li>
						<li>It started rung 2 before Ryan had accepted rung 1.</li>
						<li>
							It said Effect couldn't reach Gemini natively. Chris pushed back,
							and a compatible route turned up.
						</li>
						<li>
							When the Gemini key ran out of credits, a one-minute spike moved
							us to OpenAI.
						</li>
					</ul>
				</Section>
			</div>
		</main>
	);
}
