import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Brand } from "#/components/Brand";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
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
type Sent = Queue["sent"][number];

function ApprovePage() {
	const queue = Route.useLoaderData();
	if (!queue.unlocked) return <Unlock />;
	return (
		<QueueView
			items={queue.items}
			sent={queue.sent}
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
				<Brand where="Approve" />
				<h1 className="th-title">Approve introductions</h1>
				<p className="th-lede">Enter your passcode once on this device.</p>
			</header>
			<Card className="max-w-sm">
				<CardContent>
					<form onSubmit={onSubmit}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="passcode">Passcode</FieldLabel>
								<Input
									id="passcode"
									name="passcode"
									type="password"
									required
									autoComplete="current-password"
								/>
							</Field>
							<Button type="submit">Unlock</Button>
							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}

function QueueView({
	items,
	sent,
	viewer,
}: {
	items: Item[];
	sent: Sent[];
	viewer: Viewer;
}) {
	const router = useRouter();
	async function signOut() {
		await signOutApprove();
		await router.invalidate();
	}
	return (
		<main className="th-page">
			<header className="th-head">
				<Brand where="Approve" />
				<h1 className="th-title">
					{viewer.org ? `Waiting on ${viewer.org}` : "Waiting on a person"}
				</h1>
				<p className="th-signed-in">
					{viewer.org
						? `Signed in as ${viewer.name} for ${viewer.org}. You see only requests routed to ${viewer.org}.`
						: `Signed in as ${viewer.name}: every org's requests, for the demo only.`}{" "}
					<Button
						type="button"
						variant="link"
						className="h-auto p-0 text-primary"
						onClick={signOut}
					>
						Sign out
					</Button>
				</p>
				<p className="th-lede">
					{items.length === 0
						? `Nothing is waiting. New requests show up here, newest first.${sent.length ? " What you've already sent is below." : ""}`
						: `${items.length} request${items.length === 1 ? "" : "s"}, newest first. The AI drafts; you decide what is sent.`}
				</p>
			</header>
			<div className="th-queue">
				{items.map((item) => (
					<RequestCard key={item.id} item={item} viewer={viewer} />
				))}
			</div>
			{sent.length > 0 && (
				<section aria-labelledby="sent-title" className="grid gap-3">
					<h2
						id="sent-title"
						className="m-0 text-[22px] font-extrabold tracking-tight text-[var(--th-ink)]"
					>
						Sent ({sent.length})
					</h2>
					<ul className="m-0 grid list-none gap-2 p-0">
						{sent.map((s) => (
							<li key={s.id}>
								<Card size="sm">
									<CardHeader>
										<CardTitle>
											{s.founder} · {s.county} County
										</CardTitle>
										<CardDescription>
											{s.need}
											{viewer.org ? "" : ` · ${s.org.name}`}
											{s.approvedAt
												? ` · approved ${new Date(s.approvedAt).toLocaleString([], { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}${s.approvedBy ? ` by ${s.approvedBy}` : ""}`
												: ""}
										</CardDescription>
										<div className="flex flex-wrap gap-2 pt-1">
											<Badge
												variant={
													s.status.startsWith("Landed")
														? "default"
														: "secondary"
												}
											>
												{s.status}
											</Badge>
											{s.edited && <Badge variant="outline">edited</Badge>}
										</div>
									</CardHeader>
								</Card>
							</li>
						))}
					</ul>
				</section>
			)}
		</main>
	);
}

function RequestCard({ item, viewer }: { item: Item; viewer: Viewer }) {
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
		<Card>
			<CardHeader>
				<Alert>
					<AlertDescription>
						Demo: {viewer.org ? viewer.name : "the super admin"} is approving on
						behalf of <b>{item.org.name}</b>. Approximately half of listings do
						not have an owner yet.
					</AlertDescription>
				</Alert>
				<CardTitle className="mt-2">
					{item.founder} in {item.county} County needs {item.need.toLowerCase()}
				</CardTitle>
				<CardDescription>
					{new Date(item.createdAt).toLocaleTimeString([], {
						hour: "numeric",
						minute: "2-digit",
					})}
					{item.contact && (
						<>
							{" "}
							· Reach them at <b className="text-foreground">{item.contact}</b>{" "}
							(only you see this)
						</>
					)}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{busy === "drafting" ? (
					<p className="text-muted-foreground italic" aria-live="polite">
						Drafting…
					</p>
				) : draft ? (
					<Field>
						<FieldLabel htmlFor={`draft-${item.id}`}>
							Intro from {item.org.name}
						</FieldLabel>
						<Textarea
							id={`draft-${item.id}`}
							value={text}
							onChange={(e) => setText(e.target.value)}
							rows={6}
						/>
						<FieldDescription className="flex flex-wrap items-center gap-2">
							<Badge variant="secondary">{draft.model}</Badge>
							<Badge variant="outline">{draft.promptVersion}</Badge>
							{edited && <Badge>edited by you</Badge>}
						</FieldDescription>
					</Field>
				) : null}
			</CardContent>
			<CardFooter className="flex flex-wrap gap-2">
				<Button
					type="button"
					onClick={approve}
					disabled={!draft || busy !== "" || !text.trim()}
				>
					{busy === "approving" ? "Approving…" : "Approve and send"}
				</Button>
				<Button
					type="button"
					variant="outline"
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
				</Button>
				{error && (
					<Alert variant="destructive" className="basis-full">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
			</CardFooter>
		</Card>
	);
}
