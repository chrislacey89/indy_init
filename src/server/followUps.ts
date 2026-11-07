import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { createD1FollowUpRepo } from "#/db/followUpRepo";
import { createD1IntroductionRepo } from "#/db/introductionRepo";
import {
	agreeToMeet,
	answerFollowUp,
	type FollowUpAnswer,
} from "#/domain/followUp";
import { accountIdForApprover, describe } from "./accounts";

function log(event: string, fields: Record<string, unknown>) {
	console.log(JSON.stringify({ event, ...fields }));
}

const intros = () => createD1IntroductionRepo(env.DB);
const followUps = () => createD1FollowUpRepo(env.DB);

/** Demo: 2 minutes. Real use: days. Set by the FOLLOW_UP_DELAY_SECONDS var. */
function delayMs() {
	const seconds = Number(env.FOLLOW_UP_DELAY_SECONDS ?? "120");
	return (Number.isFinite(seconds) && seconds > 0 ? seconds : 120) * 1000;
}

/** The founder taps "We're meeting" on their conversation page. Arms one follow-up. */
export const agreeToMeetFn = createServerFn({ method: "POST" })
	.validator((data: { token: string }) => ({
		token: String(data?.token ?? "").slice(0, 64),
	}))
	.handler(async ({ data }) => {
		const r = intros();
		const intro = await r.getByToken(data.token);
		if (!intro) throw new Error("We couldn't find that conversation.");
		const approved = (await r.listDrafts(intro.id)).find(
			(d) => d.status === "approved",
		);
		const notifyAccount = accountIdForApprover(approved?.approvedBy) ?? "admin";
		const f = await agreeToMeet(r, followUps(), {
			introId: intro.id,
			now: new Date(),
			delayMs: delayMs(),
			notifyAccount,
		});
		log("meeting_agreed", { intro: intro.id, due: f.dueAt.toISOString() });
		return { ok: true as const };
	});

/** The answer page's data: what is being asked, and whether it has been answered. */
export const getFollowUp = createServerFn({ method: "GET" })
	.validator((data: { token: string }) => ({
		token: String(data?.token ?? "").slice(0, 64),
	}))
	.handler(async ({ data }) => {
		const f = await followUps().byToken(data.token);
		if (!f) return null;
		const intro = await intros().getById(f.introId);
		if (!intro) return null;
		const { founder, org } = describe(intro);
		return {
			founder,
			org: org.name,
			county: intro.founderCounty,
			need: intro.needType,
			answer: f.answer,
			note: f.note,
		};
	});

export const answerFollowUpFn = createServerFn({ method: "POST" })
	.validator((data: { token: string; answer: string; note?: string }) => {
		const answer =
			data?.answer === "yes" || data?.answer === "no" ? data.answer : null;
		if (!answer) throw new Error("Answer yes or no.");
		return {
			token: String(data?.token ?? "").slice(0, 64),
			answer: answer as FollowUpAnswer,
			note: String(data?.note ?? "").slice(0, 1000),
		};
	})
	.handler(async ({ data }) => {
		const f = await answerFollowUp(followUps(), { ...data, now: new Date() });
		log(f.answer === "yes" ? "intro_landed" : "intro_not_landed", {
			intro: f.introId,
			followUp: f.id,
		});
		return { ok: true as const, landed: f.answer === "yes" };
	});
