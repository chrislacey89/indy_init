import { describe, expect, it } from "vitest";
import {
	agreeToMeet,
	answerFollowUp,
	createInMemoryFollowUpRepo,
	dueFollowUps,
	followUpStatus,
	isLanded,
} from "./followUp";
import {
	approveIntroduction,
	createInMemoryIntroductionRepo,
	recordIntroduction,
	saveDraft,
} from "./introductions";

const T0 = new Date("2026-11-07T19:00:00Z");
const TWO_MIN = 2 * 60 * 1000;

async function madeIntro() {
	const intros = createInMemoryIntroductionRepo();
	const intro = await recordIntroduction(intros, {
		founderCounty: "Marion",
		needType: "Funding",
		fromNode: "founder:Ana",
		toNode: "org:elevate-ventures",
		state: "pending",
	});
	const draft = await saveDraft(intros, {
		introId: intro.id,
		aiText: "Hi Ana",
		model: "gpt-4.1-mini",
		promptVersion: "intro-v1",
	});
	await approveIntroduction(intros, {
		introId: intro.id,
		draftId: draft.id,
		finalText: "Hi Ana",
		approver: "Ryan",
	});
	return { intros, intro };
}

describe("the did-it-happen follow-up", () => {
	it("cannot be armed for a request no one has approved yet", async () => {
		const intros = createInMemoryIntroductionRepo();
		const followUps = createInMemoryFollowUpRepo();
		const pending = await recordIntroduction(intros, {
			founderCounty: "Marion",
			needType: "Funding",
			fromNode: "founder:Ana",
			toNode: "org:elevate-ventures",
			state: "pending",
		});

		await expect(
			agreeToMeet(intros, followUps, {
				introId: pending.id,
				now: T0,
				delayMs: TWO_MIN,
				notifyAccount: "ryan",
			}),
		).rejects.toThrow(/approved/);
	});

	it("is armed once when the founder says they're meeting, and is due only after the delay, once", async () => {
		const { intros, intro } = await madeIntro();
		const followUps = createInMemoryFollowUpRepo();
		const args = {
			introId: intro.id,
			now: T0,
			delayMs: TWO_MIN,
			notifyAccount: "ryan",
		};

		const first = await agreeToMeet(intros, followUps, args);
		const again = await agreeToMeet(intros, followUps, args);

		expect(again.id).toBe(first.id);
		expect(
			dueFollowUps(
				await followUps.list(),
				new Date(T0.getTime() + TWO_MIN - 1),
			),
		).toEqual([]);
		const due = dueFollowUps(
			await followUps.list(),
			new Date(T0.getTime() + TWO_MIN),
		);
		expect(due.map((f) => f.id)).toEqual([first.id]);

		await followUps.markSent(first.id, new Date(T0.getTime() + TWO_MIN));
		expect(
			dueFollowUps(
				await followUps.list(),
				new Date(T0.getTime() + 10 * TWO_MIN),
			),
		).toEqual([]);
	});

	it("an intro becomes landed only on a recorded yes, answered once", async () => {
		const { intros, intro } = await madeIntro();
		const followUps = createInMemoryFollowUpRepo();
		const f = await agreeToMeet(intros, followUps, {
			introId: intro.id,
			now: T0,
			delayMs: TWO_MIN,
			notifyAccount: "ryan",
		});
		expect(isLanded(f)).toBe(false);

		const answered = await answerFollowUp(followUps, {
			token: f.token,
			answer: "yes",
			note: "Met Tuesday; joining the spring cohort.",
			now: T0,
		});

		expect(isLanded(answered)).toBe(true);
		await expect(
			answerFollowUp(followUps, {
				token: f.token,
				answer: "no",
				note: "",
				now: T0,
			}),
		).rejects.toThrow(/already/);
	});

	it("a no is recorded and does not land the intro", async () => {
		const { intros, intro } = await madeIntro();
		const followUps = createInMemoryFollowUpRepo();
		const f = await agreeToMeet(intros, followUps, {
			introId: intro.id,
			now: T0,
			delayMs: TWO_MIN,
			notifyAccount: "ryan",
		});

		const answered = await answerFollowUp(followUps, {
			token: f.token,
			answer: "no",
			note: "They rescheduled.",
			now: T0,
		});

		expect(answered.answer).toBe("no");
		expect(isLanded(answered)).toBe(false);
	});
});

describe("follow-up status, as the approver sees it", () => {
	const base = {
		id: 1,
		introId: 1,
		token: "t",
		notifyAccount: "ryan",
		agreedAt: new Date(0),
		dueAt: new Date(120_000),
		sentAt: null,
		answer: null,
		note: null,
		answeredAt: null,
	};
	it("no follow-up yet: waiting on the founder", () => {
		expect(followUpStatus(null)).toBe(
			"Sent. Waiting for the founder to say yes to a meeting",
		);
	});
	it("armed but not sent", () => {
		expect(followUpStatus(base)).toBe("Meeting agreed. Follow-up scheduled");
	});
	it("sent, no answer", () => {
		expect(followUpStatus({ ...base, sentAt: new Date(1) })).toBe(
			"Follow-up emailed. Waiting on your answer",
		);
	});
	it("answered yes is landed; no is not yet", () => {
		expect(
			followUpStatus({ ...base, sentAt: new Date(1), answer: "yes" }),
		).toBe("Landed: you met");
		expect(followUpStatus({ ...base, sentAt: new Date(1), answer: "no" })).toBe(
			"Not met yet",
		);
	});
});
