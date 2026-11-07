/**
 * Rung 8: the peak path, end to end, on every push.
 *
 * A founder in Marion County asks for "Accelerators & incubators" → routed to Elevate Ventures and
 * saved as pending → an AI draft is written (stubbed model, no network) → Ryan, bound to Elevate
 * Ventures, approves it (pending → made) → the founder taps "We're meeting" → the follow-up comes
 * due and is emailed (stubbed email) → Elevate answers yes → the intro has landed.
 *
 * Runs the real domain logic and the real server-only modules (accounts, the Effect drafting
 * pipeline, the follow-up cron) against in-memory repos, with the Worker env, the model, the email
 * binding and the clock stubbed. Each step is its own test, in order, so a failure names the step.
 */
import { Effect, Layer, Stream } from "effect";
import { LanguageModel } from "effect/ai";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { canHandle } from "#/domain/access";
import {
	agreeToMeet,
	answerFollowUp,
	type createInMemoryFollowUpRepo,
	type FollowUp,
	isLanded,
} from "#/domain/followUp";
import { requestHelp } from "#/domain/frontDoor";
import {
	approvedText,
	approveIntroduction,
	countyStates,
	type createInMemoryIntroductionRepo,
	currentDraft,
	type Draft,
	type Introduction,
	saveDraft,
} from "#/domain/introductions";
import { introPrompt, PROMPT_VERSION } from "#/domain/introPrompt";
import { loadOrgs } from "#/domain/orgData";

// One in-memory store, shared by this test and the server modules (in place of D1).
const store = vi.hoisted(() => ({
	sent: [] as Array<{ to: string; subject: string; text: string }>,
}));

vi.mock("cloudflare:workers", () => ({
	env: {
		EMAIL_FROM_DOMAIN: "twohops.app",
		PUBLIC_URL: "https://twohops.app",
		FOLLOW_UP_DELAY_SECONDS: "120",
		RYAN_PASSCODE: "ryan-test-passcode",
		RYAN_EMAIL: "ryan@example.com",
		EMAIL: {
			async send(m: { to: string; subject: string; text: string }) {
				store.sent.push({ to: m.to, subject: m.subject, text: m.text });
				return { messageId: `msg-${store.sent.length}` };
			},
		},
	},
}));
vi.mock("#/db/introductionRepo", async () => {
	const { createInMemoryIntroductionRepo } = await import(
		"#/domain/introductions"
	);
	const repo = createInMemoryIntroductionRepo();
	return { createD1IntroductionRepo: () => repo };
});
vi.mock("#/db/followUpRepo", async () => {
	const { createInMemoryFollowUpRepo } = await import("#/domain/followUp");
	const repo = createInMemoryFollowUpRepo();
	return { createD1FollowUpRepo: () => repo };
});

const STUB_DRAFT =
	"Hi Ana, Elevate Ventures here. You asked about accelerators, and we run programs for Indiana founders. Want to grab a short call this week?";

/** The model, stubbed: same LanguageModel service the OpenAI layer provides, no network. */
const StubModel = Layer.effect(
	LanguageModel.LanguageModel,
	LanguageModel.make({
		generateText: () => Effect.succeed([{ type: "text", text: STUB_DRAFT }]),
		streamText: () => Stream.empty,
	}),
);

// The fixed clock: the founder taps "We're meeting" at T0; the demo delay is two minutes.
const T0 = new Date("2026-11-07T19:00:00Z");
const DELAY_MS = 120 * 1000;

describe("peak path", () => {
	let intros: ReturnType<typeof createInMemoryIntroductionRepo>;
	let followUps: ReturnType<typeof createInMemoryFollowUpRepo>;
	let server: {
		accounts: typeof import("#/server/accounts");
		aiDraft: typeof import("#/server/aiDraft");
		cron: typeof import("#/server/followUpCron");
	};
	let intro: Introduction;
	let draft: Draft;
	let followUp: FollowUp;

	beforeAll(async () => {
		const { createD1IntroductionRepo } = await import("#/db/introductionRepo");
		const { createD1FollowUpRepo } = await import("#/db/followUpRepo");
		intros = createD1IntroductionRepo({} as never) as typeof intros;
		followUps = createD1FollowUpRepo({} as never) as typeof followUps;
		server = {
			accounts: await import("#/server/accounts"),
			aiDraft: await import("#/server/aiDraft"),
			cron: await import("#/server/followUpCron"),
		};
	});

	const marion = async () => countyStates(await intros.list()).Marion;
	const landedCount = async () =>
		(await followUps.list()).filter(isLanded).length;

	it("step 1, front door: a Marion County founder asking for accelerators is routed to Elevate Ventures and saved as pending", async () => {
		expect(await marion()).toEqual({ made: 0, pending: 0 });

		const { route, intro: saved } = await requestHelp(intros, loadOrgs(), {
			county: "Marion",
			need: "Accelerators & incubators",
			founder: "Ana",
			contact: "ana@example.com",
		});
		intro = saved;

		expect(route.org.name).toBe("Elevate Ventures");
		expect(route.match).toBe("same-county");
		expect(intro).toMatchObject({
			founderCounty: "Marion",
			needType: "Accelerators & incubators",
			toNode: "org:elevate-ventures",
			state: "pending",
		});
		expect(await marion()).toEqual({ made: 0, pending: 1 });
	});

	it("step 2, AI draft: the (stubbed) model writes a draft that is stored with its model and prompt version", async () => {
		const { founder, org } = server.accounts.describe(intro);
		expect(org.name).toBe("Elevate Ventures");
		const prompt = introPrompt({
			founder,
			need: intro.needType,
			founderCounty: intro.founderCounty,
			orgName: org.name,
			orgCounty: org.county,
		});

		const aiText = await Effect.runPromise(
			server.aiDraft.generateIntroText(prompt).pipe(Effect.provide(StubModel)),
		);
		draft = await saveDraft(intros, {
			introId: intro.id,
			aiText,
			model: server.aiDraft.DRAFT_MODEL,
			promptVersion: PROMPT_VERSION,
		});

		expect(currentDraft(await intros.listDrafts(intro.id))).toMatchObject({
			id: draft.id,
			aiText: STUB_DRAFT,
			model: "gpt-4.1-mini",
			promptVersion: PROMPT_VERSION,
			status: "drafted",
		});
		expect((await intros.getById(intro.id))?.state).toBe("pending");
	});

	it("step 3, approval: Ryan (bound to Elevate Ventures) approves it, and the county moves from pending to made", async () => {
		const ryan = server.accounts.ACCOUNTS.find((a) => a.id === "ryan");
		if (!ryan) throw new Error("No Ryan account");
		expect(ryan.scope).toEqual({ kind: "org", orgId: "elevate-ventures" });
		// The same check every /approve action makes before it acts.
		expect(canHandle(ryan.scope, intro)).toBe(true);

		await approveIntroduction(intros, {
			introId: intro.id,
			draftId: draft.id,
			finalText: STUB_DRAFT,
			approver: ryan.name,
		});

		expect((await intros.getById(intro.id))?.state).toBe("made");
		expect(approvedText(await intros.listDrafts(intro.id))).toBe(STUB_DRAFT);
		expect(await marion()).toEqual({ made: 1, pending: 0 });
	});

	it("step 4, \"We're meeting\": the founder's tap arms one follow-up, addressed to Ryan, due after the delay", async () => {
		const approved = (await intros.listDrafts(intro.id)).find(
			(d) => d.status === "approved",
		);
		const notifyAccount =
			server.accounts.accountIdForApprover(approved?.approvedBy) ?? "admin";

		followUp = await agreeToMeet(intros, followUps, {
			introId: intro.id,
			now: T0,
			delayMs: DELAY_MS,
			notifyAccount,
		});

		expect(followUp).toMatchObject({
			introId: intro.id,
			notifyAccount: "ryan",
			sentAt: null,
			answer: null,
		});
		expect(followUp.dueAt.getTime()).toBe(T0.getTime() + DELAY_MS);
	});

	it("step 5, follow-up sent: nothing goes out early; once due, the cron emails Ryan the one-tap answer link", async () => {
		expect(
			await server.cron.sendDueFollowUps(new Date(T0.getTime() + 1000)),
		).toBe(0);
		expect(store.sent).toHaveLength(0);

		const due = new Date(T0.getTime() + DELAY_MS);
		expect(await server.cron.sendDueFollowUps(due)).toBe(1);

		expect(store.sent).toHaveLength(1);
		expect(store.sent[0].to).toBe("ryan@example.com");
		expect(store.sent[0].subject).toContain("Did you meet with Ana?");
		expect(store.sent[0].text).toContain(
			`https://twohops.app/f/${followUp.token}`,
		);
		expect((await followUps.byIntro(intro.id))?.sentAt).toEqual(due);
		// Sent once, never again.
		expect(
			await server.cron.sendDueFollowUps(new Date(due.getTime() + DELAY_MS)),
		).toBe(0);
	});

	it("step 6, guard: sent but unanswered is not landed (only a recorded yes lands an intro)", async () => {
		const f = await followUps.byIntro(intro.id);
		expect(f?.answer).toBeNull();
		expect(f && isLanded(f)).toBe(false);
		expect(await landedCount()).toBe(0);
	});

	it("step 7, landed: Elevate answers yes, the intro counts as landed, and the answer can't be changed", async () => {
		const answered = await answerFollowUp(followUps, {
			token: followUp.token,
			answer: "yes",
			note: "Met Tuesday; Ana is applying to the next cohort.",
			now: new Date(T0.getTime() + 2 * DELAY_MS),
		});

		expect(isLanded(answered)).toBe(true);
		expect(await landedCount()).toBe(1);
		await expect(
			answerFollowUp(followUps, {
				token: followUp.token,
				answer: "no",
				note: "",
				now: new Date(T0.getTime() + 3 * DELAY_MS),
			}),
		).rejects.toThrow(/already answered/);
		expect(await landedCount()).toBe(1);
		expect(await marion()).toEqual({ made: 1, pending: 0 });
	});
});
