import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CountyMap } from "#/components/CountyMap";
import { INDIANA_COUNTIES } from "#/domain/counties";
import { HELP_TYPES } from "#/domain/help";
import { askForHelp, getCountyStates } from "#/server/introductions";
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
	loader: () => getCountyStates(),
	component: FrontDoor,
});

type Bubble = {
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
	const states = Route.useLoaderData();
	const router = useRouter();
	const [thread, setThread] = useState<Bubble[]>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [lastCounty, setLastCounty] = useState<string>();
	const [saved, setSaved] = useState<SavedRequest[]>([]);
	const human = useTurnstile();
	useEffect(() => setSaved(loadSaved()), []);

	const made: Record<string, number> = {};
	const pending: Record<string, number> = {};
	for (const [county, s] of Object.entries(states)) {
		made[county] = s.made;
		pending[county] = s.pending;
	}
	const totalMade = Object.values(made).reduce((a, b) => a + b, 0);
	const totalPending = Object.values(pending).reduce((a, b) => a + b, 0);
	const reached = Object.values(states).filter(
		(s) => s.made + s.pending > 0,
	).length;

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		const data = {
			county: String(form.get("county") ?? ""),
			need: String(form.get("need") ?? ""),
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
				<p className="th-kicker">Two Hops · Indiana</p>
				<h1 className="th-title">
					Ask once. Get the nearest help, two introductions away.
				</h1>
				<p className="th-lede">
					Tell us your county and what you need. We find the closest listed
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
							{reached}
							<small>/92</small>
						</b>
						<span>counties reached</span>
					</div>
				</div>
			</header>

			<section className="th-grid">
				<div className="th-phone">
					<div
						className="th-thread"
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
							<p
								// biome-ignore lint/suspicious/noArrayIndexKey: append-only thread
								key={i}
								className={`th-bubble th-${b.from}`}
							>
								{b.text}
								{b.link && (
									<a href={b.link} target="_blank" rel="noopener noreferrer">
										{" "}
										Their page
									</a>
								)}
								{b.thread && (
									<Link to="/r/$token" params={{ token: b.thread }}>
										{" "}
										Open a conversation
									</Link>
								)}
							</p>
						))}
					</div>
					<form className="th-compose" onSubmit={onSubmit}>
						<label>
							Your first name
							<input name="founder" required maxLength={40} placeholder="Ana" />
						</label>
						<label>
							Your county
							<select name="county" required defaultValue="">
								<option value="" disabled>
									Choose a county
								</option>
								{INDIANA_COUNTIES.map((c) => (
									<option key={c.fips} value={c.name}>
										{c.name}
									</option>
								))}
							</select>
						</label>
						<label>
							How should they reach you? <small>(optional)</small>
							<input
								name="contact"
								maxLength={120}
								autoComplete="email"
								placeholder="Email or phone, seen only by the org"
							/>
						</label>
						<fieldset>
							<legend>What do you need?</legend>
							<div className="th-chips">
								{HELP_TYPES.map((h, i) => (
									<label key={h} className="th-chip">
										<input
											type="radio"
											name="need"
											value={h}
											required
											defaultChecked={i === 0}
										/>
										<span>{h}</span>
									</label>
								))}
							</div>
						</fieldset>
						<div ref={human.el} className="th-turnstile" />
						<button type="submit" disabled={busy}>
							{busy ? "Finding help…" : "Send"}
						</button>
						{error && (
							<p className="th-error" role="alert">
								{error}
							</p>
						)}
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
					<CountyMap counts={made} pending={pending} highlight={lastCounty} />
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
