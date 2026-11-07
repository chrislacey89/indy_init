import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Brand } from "#/components/Brand";
import { Bubble, BubbleContent } from "#/components/ui/bubble";
import {
	Message,
	MessageContent,
	MessageFooter,
	MessageHeader,
} from "#/components/ui/message";
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
				<Brand where="Your conversation" />
				<p className="th-lede">
					We couldn't find that conversation.{" "}
					<Link to="/" className="th-foot-link">
						Start over
					</Link>
				</p>
			</main>
		);

	return (
		<main className="th-page">
			<header className="th-head">
				<Brand where="Your conversation" />
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
					className="th-thread flex flex-col gap-3"
					role="log"
					aria-label="Conversation"
					aria-live="polite"
				>
					<Message align="end">
						<MessageContent>
							<Bubble align="end">
								<BubbleContent>
									I'm {thread.founder} in {thread.county} County. I need{" "}
									{thread.need.toLowerCase()}.
								</BubbleContent>
							</Bubble>
						</MessageContent>
					</Message>
					{thread.reply && (
						<Message>
							<MessageContent>
								<MessageHeader>Two Hops</MessageHeader>
								<Bubble variant="secondary">
									<BubbleContent>{thread.reply}</BubbleContent>
								</Bubble>
							</MessageContent>
						</Message>
					)}
					{thread.intro && (
						<Message>
							<MessageContent>
								<MessageHeader>{thread.org.name}</MessageHeader>
								<Bubble variant="outline" className="th-org">
									<BubbleContent>
										{thread.intro}
										{thread.org.link && (
											<a
												href={thread.org.link}
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
								{thread.approver && (
									<MessageFooter>
										2 hops: you, {thread.org.name}, {thread.approver}
									</MessageFooter>
								)}
							</MessageContent>
						</Message>
					)}
					{!thread.intro && (
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
