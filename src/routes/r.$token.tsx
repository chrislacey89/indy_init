import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { getThread } from "#/server/approvals";

export const Route = createFileRoute("/r/$token")({
	loader: ({ params }) => getThread({ data: { token: params.token } }),
	component: ThreadPage,
});

function ThreadPage() {
	const thread = Route.useLoaderData();
	const router = useRouter();
	const waiting = thread?.state === "pending";

	// While a person hasn't answered yet, check back every few seconds so the intro lands live.
	useEffect(() => {
		if (!waiting) return;
		const t = setInterval(() => router.invalidate(), 4000);
		return () => clearInterval(t);
	}, [waiting, router]);

	if (!thread)
		return (
			<main className="th-page">
				<p className="th-lede">
					We couldn't find that conversation. <Link to="/">Start over</Link>
				</p>
			</main>
		);

	return (
		<main className="th-page">
			<header className="th-head">
				<p className="th-kicker">Two Hops · your conversation</p>
				<h1 className="th-title">
					{thread.intro
						? `${thread.org.name} wrote back.`
						: "Waiting on a person."}
				</h1>
				<p className="th-lede">
					Keep this link. It's private to you, and this page updates on its own.
				</p>
			</header>
			<div className="th-phone">
				<div
					className="th-thread"
					role="log"
					aria-label="Conversation"
					aria-live="polite"
				>
					<p className="th-bubble th-founder">
						I'm {thread.founder} in {thread.county} County. I need{" "}
						{thread.need.toLowerCase()}.
					</p>
					{thread.reply && (
						<p className="th-bubble th-two-hops">{thread.reply}</p>
					)}
					{thread.intro ? (
						<p className="th-bubble th-two-hops th-org">
							<span className="th-from">{thread.org.name}</span>
							{thread.intro}
							{thread.org.link && (
								<a
									href={thread.org.link}
									target="_blank"
									rel="noopener noreferrer"
								>
									{" "}
									Their page
								</a>
							)}
						</p>
					) : (
						<p className="th-waiting">
							Waiting for a reply from {thread.org.name}. A person there reads
							your request before anything is sent.
						</p>
					)}
				</div>
			</div>
			<p className="th-foot">
				<Link to="/">Back to the map</Link>
			</p>
		</main>
	);
}
