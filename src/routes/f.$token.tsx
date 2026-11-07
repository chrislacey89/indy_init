import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Alert, AlertDescription } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Field, FieldLabel } from "#/components/ui/field";
import { Textarea } from "#/components/ui/textarea";
import { answerFollowUpFn, getFollowUp } from "#/server/followUps";

export const Route = createFileRoute("/f/$token")({
	loader: ({ params }) => getFollowUp({ data: { token: params.token } }),
	component: FollowUpPage,
});

/** Rung 7: the org's one-tap answer to "did the meeting happen?" A yes lands the intro. */
function FollowUpPage() {
	const f = Route.useLoaderData();
	const { token } = Route.useParams();
	const router = useRouter();
	const [note, setNote] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	async function answer(value: "yes" | "no") {
		setBusy(true);
		setError("");
		try {
			await answerFollowUpFn({ data: { token, answer: value, note } });
			await router.invalidate();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="th-page">
			<header className="th-head">
				<p className="th-kicker">Two Hops · Follow-up</p>
				<h1 className="th-title">
					{f ? `Did you meet with ${f.founder}?` : "Follow-up not found"}
				</h1>
			</header>
			{f && (
				<Card className="max-w-xl">
					<CardHeader>
						<CardTitle>
							{f.org} and {f.founder}
						</CardTitle>
						<CardDescription>
							{f.founder} in {f.county} County asked for {f.need.toLowerCase()}{" "}
							and said you agreed to meet.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{f.answer ? (
							<Alert>
								<AlertDescription>
									{f.answer === "yes"
										? "Thanks. This introduction is marked as landed."
										: "Thanks. We've noted that the meeting hasn't happened yet."}
									{f.note ? ` Your note: "${f.note}"` : ""}
								</AlertDescription>
							</Alert>
						) : (
							<Field>
								<FieldLabel htmlFor="note">
									What came of it? (optional)
								</FieldLabel>
								<Textarea
									id="note"
									value={note}
									onChange={(e) => setNote(e.target.value)}
									rows={3}
									maxLength={1000}
								/>
							</Field>
						)}
					</CardContent>
					{!f.answer && (
						<CardFooter className="flex flex-wrap gap-2">
							<Button
								type="button"
								disabled={busy}
								onClick={() => answer("yes")}
							>
								Yes, we met
							</Button>
							<Button
								type="button"
								variant="outline"
								disabled={busy}
								onClick={() => answer("no")}
							>
								Not yet
							</Button>
							{error && (
								<Alert variant="destructive" className="basis-full">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}
						</CardFooter>
					)}
				</Card>
			)}
			<p className="th-foot">
				<Link to="/">Two Hops</Link>
			</p>
		</main>
	);
}
