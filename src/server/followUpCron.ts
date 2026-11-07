import { env } from "cloudflare:workers";
import { createD1FollowUpRepo } from "#/db/followUpRepo";
import { createD1IntroductionRepo } from "#/db/introductionRepo";
import { dueFollowUps } from "#/domain/followUp";
import { followUpEmail } from "#/domain/introEmail";
import { describe, emailForAccount } from "./accounts";

function log(event: string, fields: Record<string, unknown>) {
	console.log(JSON.stringify({ event, ...fields }));
}

const intros = () => createD1IntroductionRepo(env.DB);
const followUps = () => createD1FollowUpRepo(env.DB);

/** Runs from the Worker's cron trigger every minute: email each due follow-up to its approver. */
export async function sendDueFollowUps(now = new Date()) {
	const repo = followUps();
	const due = dueFollowUps(await repo.list(), now);
	const fromDomain = env.EMAIL_FROM_DOMAIN?.trim();
	const base = env.PUBLIC_URL?.trim() || "https://twohops.app";
	for (const f of due) {
		const intro = await intros().getById(f.introId);
		const to = emailForAccount(f.notifyAccount);
		if (!intro || !to || !fromDomain) {
			// Nobody to ask: mark it sent so the cron doesn't retry every minute, and say why.
			await repo.markSent(f.id, now);
			log("follow_up_unsendable", {
				followUp: f.id,
				reason: !intro ? "no-intro" : !to ? "no-approver-email" : "email-off",
			});
			continue;
		}
		const { founder, org } = describe(intro);
		try {
			const result = await env.EMAIL.send(
				followUpEmail({
					to,
					founder,
					orgName: org.name,
					answerUrl: new URL(`/f/${f.token}`, base).toString(),
					fromDomain,
				}),
			);
			await repo.markSent(f.id, now);
			log("follow_up_sent", {
				followUp: f.id,
				intro: f.introId,
				message: result.messageId,
			});
		} catch (err) {
			log("follow_up_send_failed", {
				followUp: f.id,
				code: (err as { code?: string }).code ?? "unknown",
			});
		}
	}
	return due.length;
}
