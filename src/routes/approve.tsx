import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
	approveIntro,
	draftIntro,
	getApproveQueue,
	redraftIntro,
	signOutApprove,
	unlockApprove,
} from "#/server/approvals";

export const Route = createFileRoute("/approve")({
	loader: () => getApproveQueue(),
	component: ApprovePage,
});

type Queue = Awaited<ReturnType<typeof getApproveQueue>>;
type Item = Queue["items"][number];
type Draft = NonNullable<Item["draft"]>;
type Viewer = NonNullable<Queue["viewer"]>;

function ApprovePage() {
	const queue = Route.useLoaderData();
	if (!queue.unlocked) return <Unlock />;
	return (
		<QueueView
			items={queue.items}
			viewer={queue.viewer ?? { name: "", org: null }}
		/>
	);
}

function Unlock() {
	const router = useRouter();
	const [error, setError] = useState("");
	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const passcode = String(new FormData(e.currentTarget).get("passcode"));
		setError("");
		try {
			await unlockApprove({ data: { passcode } });
			await router.invalidate();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong.");
		}
	}
	return (
		<main className="th-page">
			<header className="th-head">
				<p className="th-kicker">Two Hops · Approve</p>
				<h1 className="th-title">Approve introductions</h1>
				<p className="th-lede">Enter your passcode once on this device.</p>
			</header>
			<form className="th-compose th-unlock" onSubmit={onSubmit}>
				<label>
					Passcode
					<input
						name="passcode"
						type="password"
						required
						autoComplete="current-password"
					/>
				</label>
				<button type="submit">Unlock</button>
				{error && (
					<p className="th-error" role="alert">
						{error}
					</p>
				)}
			</form>
		</main>
	);
}

function QueueView({ items, viewer }: { items: Item[]; viewer: Viewer }) {
	const router = useRouter();
	async function signOut() {
		await signOutApprove();
		await router.invalidate();
	}
	return (
		<main className="th-page">
			<header className="th-head">
				<p className="th-kicker">Two Hops · Approve</p>
				<h1 className="th-title">
					{viewer.org ? `Waiting on ${viewer.org}` : "Waiting on a person"}
				</h1>
				<p className="th-signed-in">
					{viewer.org
						? `Signed in as ${viewer.name} for ${viewer.org}. You see only requests routed to ${viewer.org}.`
						: `Signed in as ${viewer.name}: every org's requests, for the demo only.`}{" "}
					<button type="button" className="th-link" onClick={signOut}>
						Sign out
					</button>
				</p>
				<p className="th-lede">
					{items.length === 0
						? "Nothing is waiting. New requests show up here, newest first."
						: `${items.length} request${items.length === 1 ? "" : "s"}, newest first. The AI drafts; you decide what is sent.`}
				</p>
			</header>
			<div className="th-queue">
				{items.map((item) => (
					<Card key={item.id} item={item} viewer={viewer} />
				))}
			</div>
		</main>
	);
}

function Card({ item, viewer }: { item: Item; viewer: Viewer }) {
	const router = useRouter();
	const [draft, setDraft] = useState<Draft | null>(item.draft);
	const [text, setText] = useState(item.draft?.text ?? "");
	const [busy, setBusy] = useState<"" | "drafting" | "approving">(
		item.draft ? "" : "drafting",
	);
	const [error, setError] = useState("");
	const started = useRef(false);

	async function run(fn: () => Promise<Draft>, mode: "drafting") {
		setBusy(mode);
		setError("");
		try {
			const d = await fn();
			setDraft(d);
			setText(d.text);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Drafting failed.");
		} finally {
			setBusy("");
		}
	}

	// Lazy drafting: a request with no draft gets one when this page opens (once, guarded by the ref).
	// biome-ignore lint/correctness/useExhaustiveDependencies: run is recreated each render; the ref makes this fire once
	useEffect(() => {
		if (item.draft || started.current) return;
		started.current = true;
		run(() => draftIntro({ data: { introId: item.id } }), "drafting");
	}, [item.draft, item.id]);

	async function approve() {
		if (!draft) return;
		setBusy("approving");
		setError("");
		try {
			await approveIntro({
				data: { introId: item.id, draftId: draft.id, text },
			});
			await router.invalidate();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Approval failed.");
			setBusy("");
		}
	}

	const edited = draft && text.trim() !== draft.text.trim();
	return (
		<article className="th-card">
			<p className="th-banner">
				Demo: {viewer.org ? viewer.name : "the super admin"} is approving on
				behalf of <b>{item.org.name}</b>. Approximately half of listings do not
				have an owner yet.
			</p>
			<p className="th-card-ask">
				<b>{item.founder}</b> in {item.county} County needs{" "}
				{item.need.toLowerCase()}.
				<span className="th-card-meta">
					{" "}
					·{" "}
					{new Date(item.createdAt).toLocaleTimeString([], {
						hour: "numeric",
						minute: "2-digit",
					})}
				</span>
			</p>
			{item.contact && (
				<p className="th-card-contact">
					Reach them at: <b>{item.contact}</b>{" "}
					<span className="th-card-meta">(only you see this)</span>
				</p>
			)}
			{busy === "drafting" ? (
				<p className="th-drafting" aria-live="polite">
					Drafting…
				</p>
			) : draft ? (
				<label className="th-draft">
					<span className="th-card-meta">
						Intro from {item.org.name} · drafted by {draft.model} (
						{draft.promptVersion}){edited ? " · edited by you" : ""}
					</span>
					<textarea
						value={text}
						onChange={(e) => setText(e.target.value)}
						rows={6}
					/>
				</label>
			) : null}
			<div className="th-actions">
				<button
					type="button"
					onClick={approve}
					disabled={!draft || busy !== "" || !text.trim()}
				>
					{busy === "approving" ? "Approving…" : "Approve and send"}
				</button>
				<button
					type="button"
					className="th-secondary"
					disabled={busy !== ""}
					onClick={() =>
						draft
							? run(
									() =>
										redraftIntro({
											data: { introId: item.id, draftId: draft.id },
										}),
									"drafting",
								)
							: run(
									() => draftIntro({ data: { introId: item.id } }),
									"drafting",
								)
					}
				>
					{draft ? "Reject and redraft" : "Try drafting again"}
				</button>
			</div>
			{error && (
				<p className="th-error" role="alert">
					{error}
				</p>
			)}
		</article>
	);
}
