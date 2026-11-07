import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { CountyMap } from "#/components/CountyMap";
import { INDIANA_COUNTIES } from "#/domain/counties";
import { addIntroduction, getCountyCounts } from "#/server/introductions";

export const Route = createFileRoute("/record")({
	loader: () => getCountyCounts(),
	component: Home,
});

const NEEDS = ["mentor", "capital", "space", "legal", "other"] as const;

function Home() {
	const counts = Route.useLoaderData();
	const router = useRouter();
	const [status, setStatus] = useState<string>("");
	const [lastCounty, setLastCounty] = useState<string>();
	const total = Object.values(counts).reduce((a, b) => a + b, 0);
	const reached = Object.values(counts).filter((n) => n > 0).length;

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formEl = e.currentTarget;
		const form = new FormData(formEl);
		const data = {
			founderCounty: String(form.get("founderCounty") ?? ""),
			needType: String(form.get("needType") ?? ""),
			fromNode: String(form.get("fromNode") ?? ""),
			toNode: String(form.get("toNode") ?? ""),
		};
		setStatus("Recording…");
		try {
			await addIntroduction({ data });
			setLastCounty(data.founderCounty);
			setStatus(`Recorded. ${data.founderCounty} County just moved.`);
			formEl.reset();
			await router.invalidate();
		} catch (err) {
			setStatus(err instanceof Error ? err.message : "Could not record it.");
		}
	}

	return (
		<main className="th-page">
			<header className="th-head">
				<p className="th-kicker">Two Hops · Indiana</p>
				<h1 className="th-title">
					Every founder, two introductions from help.
				</h1>
				<p className="th-lede">
					Each handshake is recorded. The map is the record: introductions made,
					county by county.
				</p>
				<div className="th-stats">
					<div>
						<b>{total}</b>
						<span>introductions recorded</span>
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
				<div className="th-map">
					<CountyMap counts={counts} highlight={lastCounty} />
				</div>

				<form className="th-form" onSubmit={onSubmit}>
					<h2>Record an introduction</h2>
					<label>
						Founder's county
						<select name="founderCounty" required defaultValue="">
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
						What they need
						<select name="needType" required defaultValue="mentor">
							{NEEDS.map((n) => (
								<option key={n} value={n}>
									{n}
								</option>
							))}
						</select>
					</label>
					<label>
						Introduced by
						<input name="fromNode" required placeholder="e.g. Ana, founder" />
					</label>
					<label>
						Introduced to
						<input name="toNode" required placeholder="e.g. Elevate Ventures" />
					</label>
					<button type="submit">Record the handshake</button>
					<p className="th-status" role="status" aria-live="polite">
						{status}
					</p>
				</form>
			</section>
		</main>
	);
}
