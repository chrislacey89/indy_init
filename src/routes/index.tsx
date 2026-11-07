import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Brand } from "#/components/Brand";
import { CountyMap } from "#/components/CountyMap";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import { Button } from "#/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Message, MessageContent } from "#/components/ui/message";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { INDIANA_COUNTIES } from "#/domain/counties";
import { HELP_TYPES } from "#/domain/help";
import { askForHelp, getMapData } from "#/server/introductions";
import { TURNSTILE_ACTION, TURNSTILE_SITEKEY } from "#/turnstile";

type TurnstileApi = {
	render: (el: HTMLElement, opts: Record<string, unknown>) => string;
	reset: (id: string) => void;
};
declare global {
	interface Window {
		turnstile?: TurnstileApi;
		onTwoHopsTurnstile?: () => void;
	}
}

/** Renders Turnstile explicitly and keeps the latest single-use token; reset() asks for a fresh one. */
function useTurnstile() {
	const el = useRef<HTMLDivElement>(null);
	const widgetId = useRef<string | undefined>(undefined);
	const token = useRef("");
	useEffect(() => {
		const render = () => {
			if (!el.current || !window.turnstile || widgetId.current) return;
			widgetId.current = window.turnstile.render(el.current, {
				sitekey: TURNSTILE_SITEKEY,
				action: TURNSTILE_ACTION,
				appearance: "interaction-only",
				callback: (t: string) => {
					token.current = t;
				},
				"expired-callback": () => {
					token.current = "";
				},
			});
		};
		if (window.turnstile) render();
		else {
			window.onTwoHopsTurnstile = render;
			if (!document.querySelector("script[data-turnstile]")) {
				const s = document.createElement("script");
				s.src =
					"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTwoHopsTurnstile";
				s.async = true;
				s.defer = true;
				s.dataset.turnstile = "1";
				document.head.appendChild(s);
			}
		}
	}, []);
	return {
		el,
		take: () => token.current,
		reset: () => {
			token.current = "";
			if (widgetId.current) window.turnstile?.reset(widgetId.current);
		},
	};
}

export const Route = createFileRoute("/")({
	loader: () => getMapData(),
	component: FrontDoor,
});

type ThreadItem = {
	from: "founder" | "two-hops";
	text: string;
	link?: string;
	thread?: string;
};

type SavedRequest = { token: string; county: string; need: string };
const SAVED_KEY = "two-hops:requests";

function loadSaved(): SavedRequest[] {
	try {
		return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
	} catch {
		return [];
	}
}

function remember(r: SavedRequest): SavedRequest[] {
	const next = [r, ...loadSaved().filter((x) => x.token !== r.token)].slice(
		0,
		10,
	);
	try {
		localStorage.setItem(SAVED_KEY, JSON.stringify(next));
	} catch {}
	return next;
}

function FrontDoor() {
	const { states, distance, withinOne, handshakes } = Route.useLoaderData();
	const [picked, setPicked] = useState<string>();
	const router = useRouter();
	const [thread, setThread] = useState<ThreadItem[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [lastCounty, setLastCounty] = useState<string>();
	const [saved, setSaved] = useState<SavedRequest[]>([]);
	const human = useTurnstile();
	const [need, setNeed] = useState<string>(HELP_TYPES[0]);
	useEffect(() => setSaved(loadSaved()), []);

	const made: Record<string, number> = {};
	const pending: Record<string, number> = {};
	for (const [county, s] of Object.entries(states)) {
		made[county] = s.made;
		pending[county] = s.pending;
	}
	const totalMade = Object.values(made).reduce((a, b) => a + b, 0);
	const totalPending = Object.values(pending).reduce((a, b) => a + b, 0);

	function distanceText(county: string): string {
		const d = distance[county];
		if (d === null || d === undefined)
			return "No introduction has been made in Indiana yet.";
		if (d === 0) return "A handshake has been recorded right here.";
		return `${d} ${d === 1 ? "county" : "counties"} from the nearest recorded handshake.`;
	}

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		const data = {
			county: String(form.get("county") ?? ""),
			need,
			founder: String(form.get("founder") ?? ""),
			contact: String(form.get("contact") ?? ""),
			turnstileToken: human.take(),
		};
		setError("");
		setBusy(true);
		setThread((t) => [
			...t,
			{
				from: "founder",
				text: `I'm ${data.founder} in ${data.county} County. I need ${data.need.toLowerCase()}.`,
			},
		]);
		try {
			const res = await askForHelp({ data });
			setThread((t) => [
				...t,
				{
					from: "two-hops",
					text: res.reply,
					link: res.org.website ?? res.org.profileUrl ?? undefined,
				},
				{
					from: "two-hops",
					text: `Want to hear from ${res.org.name} directly? Opening a conversation lets you and them actually contact each other: their reply lands on a private page only you have the link to. It's optional.`,
					thread: res.threadToken,
				},
			]);
			setSaved(
				remember({
					token: res.threadToken,
					county: data.county,
					need: data.need,
				}),
			);
			setLastCounty(data.county);
			await router.invalidate();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong.");
		} finally {
			// Turnstile tokens are single-use: get a fresh one before the next Send.
			human.reset();
			setBusy(false);
		}
	}

	return (
		<main className="th-page">
			<header className="th-head">
				<Brand where="Indiana" />
				<h1 className="th-title">
					Every Indiana founder, <em>two hops</em> from help.
				</h1>
				<p className="th-lede">
					Ask once: your county and what you need. We find the closest listed
					organization and ask a real person there to introduce themselves.
				</p>
				<div className="th-stats">
					<div>
						<b>{totalMade}</b>
						<span>introductions made</span>
					</div>
					<div>
						<b>{totalPending}</b>
						<span>waiting on a person</span>
					</div>
					<div>
						<b>
							{withinOne}
							<small>/92</small>
						</b>
						<span>counties within one county of a recorded handshake</span>
					</div>
				</div>
				<p className="th-hops-line">
					{handshakes === 0
						? "Every introduction is 2 hops: you, an organization, a person there."
						: `${handshakes} recorded ${handshakes === 1 ? "handshake" : "handshakes"}, 2 hops each: you, an organization, a person there.`}
				</p>
			</header>

			<section className="th-grid">
				<div className="th-phone">
					<div
						className="th-thread flex flex-col gap-3"
						role="log"
						aria-label="Conversation"
						aria-live="polite"
					>
						{thread.length === 0 && (
							<p className="th-empty">
								Your conversation shows up here, like a text thread.
							</p>
						)}
						{thread.map((b, i) => (
							<Message
								// biome-ignore lint/suspicious/noArrayIndexKey: append-only thread
								key={i}
								align={b.from === "founder" ? "end" : "start"}
							>
								<MessageContent>
									<Bubble
										variant={b.from === "founder" ? "default" : "secondary"}
										align={b.from === "founder" ? "end" : "start"}
									>
										<BubbleContent>
											{b.text}
											{b.link && (
												<a
													href={b.link}
													target="_blank"
													rel="noopener noreferrer"
													className="font-semibold underline"
												>
													{" "}
													Their page
												</a>
											)}
										</BubbleContent>
									</Bubble>
									{b.thread && (
										<Button asChild variant="outline" size="sm">
											<Link to="/r/$token" params={{ token: b.thread }}>
												Open a conversation
											</Link>
										</Button>
									)}
								</MessageContent>
							</Message>
						))}
					</div>
					<form onSubmit={onSubmit} className="mt-4">
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="founder">Your first name</FieldLabel>
								<Input
									id="founder"
									name="founder"
									required
									maxLength={40}
									placeholder="Ana"
									autoComplete="given-name"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="county">Your county</FieldLabel>
								<select
									id="county"
									name="county"
									required
									defaultValue=""
									className="h-10 w-full rounded-md border border-input bg-background px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<option value="" disabled>
										Choose a county
									</option>
									{INDIANA_COUNTIES.map((c) => (
										<option key={c.fips} value={c.name}>
											{c.name}
										</option>
									))}
								</select>
							</Field>
							<Field>
								<FieldLabel htmlFor="contact">
									How should they reach you?
								</FieldLabel>
								<Input
									id="contact"
									name="contact"
									maxLength={120}
									autoComplete="email"
									placeholder="Email or phone"
									aria-describedby="contact-help"
								/>
								<FieldDescription id="contact-help">
									Optional. Only the organization sees it.
								</FieldDescription>
							</Field>
							<FieldSet>
								<FieldLegend>What do you need?</FieldLegend>
								<ToggleGroup
									type="single"
									value={need}
									onValueChange={(v) => v && setNeed(v)}
									variant="outline"
									className="flex flex-wrap justify-start gap-2"
									aria-label="What do you need?"
								>
									{HELP_TYPES.map((h) => (
										<ToggleGroupItem key={h} value={h} className="h-auto py-2">
											{h}
										</ToggleGroupItem>
									))}
								</ToggleGroup>
							</FieldSet>
							<div ref={human.el} className="th-turnstile" />
							<Button type="submit" size="lg" disabled={busy}>
								{busy ? "Finding help…" : "Send"}
							</Button>
							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}
						</FieldGroup>
					</form>
					{saved.length > 0 && (
						<nav className="th-saved" aria-label="Your requests">
							<p>Your requests on this device:</p>
							{saved.map((r) => (
								<Link key={r.token} to="/r/$token" params={{ token: r.token }}>
									{r.need} · {r.county} County
								</Link>
							))}
						</nav>
					)}
				</div>

				<div className="th-map">
					<CountyMap
						counts={made}
						pending={pending}
						highlight={lastCounty}
						selected={picked}
						onSelect={(c) => setPicked((p) => (p === c ? undefined : c))}
						describe={(c) => (
							<>
								<b>{c} County</b>
								<span>
									{made[c] ?? 0} made, {pending[c] ?? 0} waiting.
								</span>
								<span>{distanceText(c)}</span>
							</>
						)}
					/>
					<p className="th-county-detail">
						Hover or tap a county to see how far it is from a recorded
						handshake.
					</p>
					<p className="th-legend">
						<span className="th-key th-key-made" /> introduction made
						<span className="th-key th-key-pending" /> waiting on a person
					</p>
				</div>
			</section>
			<p className="th-foot">
				Data: 768 organizations from Indiana's public ConnectIND directory.{" "}
				<Link to="/record">Record a handshake directly</Link>
			</p>
		</main>
	);
}
