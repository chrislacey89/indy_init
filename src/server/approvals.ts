import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { createD1IntroductionRepo } from "#/db/introductionRepo";
import { replyText } from "#/domain/help";
import {
	approvedText,
	approveIntroduction,
	currentDraft,
	type Introduction,
	rejectDraft,
	saveDraft,
} from "#/domain/introductions";
import { introPrompt, PROMPT_VERSION } from "#/domain/introPrompt";
import { loadOrgs } from "#/domain/orgData";
import { routeFounder } from "#/domain/routing";
import { DRAFT_MODEL, draftWithOpenAi } from "./aiDraft";

const ORGS = loadOrgs();
const ORG_BY_ID = new Map(ORGS.map((o) => [o.id, o]));
const COOKIE = "th_approve";
/** In the demo, Ryan stands in for every org. Real org accounts come after the hackathon. */
const DEMO_APPROVER = "Ryan";

function repo() {
	return createD1IntroductionRepo(env.DB);
}

function log(event: string, fields: Record<string, unknown>) {
	console.log(JSON.stringify({ event, ...fields }));
}

async function passHash(passcode: string): Promise<string> {
	const bytes = new TextEncoder().encode(`two-hops-approve:${passcode}`);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

async function isUnlocked(): Promise<boolean> {
	const expected = env.APPROVE_PASSCODE;
	if (!expected) return false;
	return getCookie(COOKIE) === (await passHash(expected));
}

async function requireUnlocked() {
	if (!(await isUnlocked())) throw new Error("Enter the demo passcode first.");
}

function describe(intro: Introduction) {
	const org = ORG_BY_ID.get(intro.toNode.replace(/^org:/, ""));
	return {
		founder: intro.fromNode.replace(/^founder:/, ""),
		org: {
			name: org?.name ?? intro.toNode,
			county: org?.county ?? null,
			link: org?.website ?? org?.profileUrl ?? null,
		},
	};
}

export const unlockApprove = createServerFn({ method: "POST" })
	.validator((data: { passcode: string }) => ({
		passcode: String(data?.passcode ?? ""),
	}))
	.handler(async ({ data }) => {
		const expected = env.APPROVE_PASSCODE;
		if (!expected || data.passcode !== expected) {
			log("approve_unlock_failed", {});
			throw new Error("That passcode didn't match.");
		}
		setCookie(COOKIE, await passHash(expected), {
			httpOnly: true,
			secure: true,
			sameSite: "strict",
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
		});
		return { ok: true as const };
	});

export const getApproveQueue = createServerFn({ method: "GET" }).handler(
	async () => {
		if (!(await isUnlocked())) return { unlocked: false as const, items: [] };
		const r = repo();
		const pending = await r.listPending();
		const items = await Promise.all(
			pending.map(async (intro) => {
				const draft = currentDraft(await r.listDrafts(intro.id));
				return {
					id: intro.id,
					createdAt: intro.createdAt.toISOString(),
					county: intro.founderCounty,
					need: intro.needType,
					contact: intro.contact,
					...describe(intro),
					draft: draft
						? {
								id: draft.id,
								text: draft.aiText,
								model: draft.model,
								promptVersion: draft.promptVersion,
							}
						: null,
				};
			}),
		);
		return { unlocked: true as const, items };
	},
);

async function draftFor(introId: number) {
	const r = repo();
	const intro = await r.getById(introId);
	if (!intro || intro.state !== "pending")
		throw new Error("That request is no longer waiting.");
	const existing = currentDraft(await r.listDrafts(introId));
	if (existing) return existing;
	const { founder, org } = describe(intro);
	const started = Date.now();
	const aiText = await draftWithOpenAi(
		introPrompt({
			founder,
			need: intro.needType,
			founderCounty: intro.founderCounty,
			orgName: org.name,
			orgCounty: org.county,
		}),
		env.OPENAI_API_KEY,
	);
	const draft = await saveDraft(r, {
		introId,
		aiText,
		model: DRAFT_MODEL,
		promptVersion: PROMPT_VERSION,
	});
	log("draft_created", {
		intro: introId,
		draft: draft.id,
		model: DRAFT_MODEL,
		prompt_version: PROMPT_VERSION,
		ms: Date.now() - started,
	});
	return draft;
}

const toClient = (d: Awaited<ReturnType<typeof draftFor>>) => ({
	id: d.id,
	text: d.aiText,
	model: d.model,
	promptVersion: d.promptVersion,
});

const idInput = (data: { introId: number }) => {
	const introId = Number(data?.introId);
	if (!Number.isInteger(introId)) throw new Error("Bad request id.");
	return { introId };
};

/** Lazy drafting: /approve asks for a draft for any pending request that has none. */
export const draftIntro = createServerFn({ method: "POST" })
	.validator(idInput)
	.handler(async ({ data }) => {
		await requireUnlocked();
		return toClient(await draftFor(data.introId));
	});

export const redraftIntro = createServerFn({ method: "POST" })
	.validator((data: { introId: number; draftId: number }) => ({
		...idInput(data),
		draftId: Number(data?.draftId),
	}))
	.handler(async ({ data }) => {
		await requireUnlocked();
		await rejectDraft(repo(), data);
		log("draft_rejected", { intro: data.introId, draft: data.draftId });
		return toClient(await draftFor(data.introId));
	});

export const approveIntro = createServerFn({ method: "POST" })
	.validator((data: { introId: number; draftId: number; text: string }) => ({
		...idInput(data),
		draftId: Number(data?.draftId),
		text: String(data?.text ?? "").slice(0, 2000),
	}))
	.handler(async ({ data }) => {
		await requireUnlocked();
		await approveIntroduction(repo(), {
			introId: data.introId,
			draftId: data.draftId,
			finalText: data.text,
			approver: DEMO_APPROVER,
		});
		const intro = await repo().getById(data.introId);
		log("intro_approved", {
			intro: data.introId,
			draft: data.draftId,
			county: intro?.founderCounty,
			state: intro?.state,
		});
		return { ok: true as const, county: intro?.founderCounty ?? null };
	});

/** The founder's private thread: their ask, Two Hops' reply, and the org's intro once approved. */
export const getThread = createServerFn({ method: "GET" })
	.validator((data: { token: string }) => ({
		token: String(data?.token ?? "").slice(0, 64),
	}))
	.handler(async ({ data }) => {
		const r = repo();
		const intro = await r.getByToken(data.token);
		if (!intro) return null;
		const { founder, org } = describe(intro);
		const route = routeFounder(intro.founderCounty, ORGS, intro.needType);
		return {
			founder,
			county: intro.founderCounty,
			need: intro.needType,
			reply: route
				? replyText(route, intro.founderCounty, intro.needType, founder)
				: null,
			org,
			state: intro.state,
			intro: approvedText(await r.listDrafts(intro.id)),
		};
	});
