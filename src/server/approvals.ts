import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import {
	deleteCookie,
	getCookie,
	getRequestUrl,
	setCookie,
} from "@tanstack/react-start/server";
import { createD1IntroductionRepo } from "#/db/introductionRepo";
import { canHandle, type Scope } from "#/domain/access";
import { replyText } from "#/domain/help";
import {
	approvedText,
	approveIntroduction,
	currentDraft,
	type Introduction,
	rejectDraft,
	saveDraft,
} from "#/domain/introductions";
import { introEmail } from "#/domain/introEmail";
import { introPrompt, PROMPT_VERSION } from "#/domain/introPrompt";
import { loadOrgs } from "#/domain/orgData";
import { routeFounder } from "#/domain/routing";
import { DRAFT_MODEL, draftWithOpenAi } from "./aiDraft";

const ORGS = loadOrgs();
const ORG_BY_ID = new Map(ORGS.map((o) => [o.id, o]));
const COOKIE = "th_approve";

type Account = {
	id: string;
	/** Stored as the approver on every approval this account makes. */
	name: string;
	secret: () => string | undefined;
	scope: Scope;
};

/**
 * Demo accounts. The super admin sees every org's requests (demo only); Ryan is bound to one org,
 * the way a real org account would be. Real org sign-in comes after the hackathon.
 */
const ACCOUNTS: Account[] = [
	{
		id: "admin",
		name: "Demo super admin",
		secret: () => env.APPROVE_PASSCODE,
		scope: { kind: "all" },
	},
	{
		id: "ryan",
		name: "Ryan",
		secret: () => env.RYAN_PASSCODE,
		scope: { kind: "org", orgId: "elevate-ventures" },
	},
];

function repo() {
	return createD1IntroductionRepo(env.DB);
}

function log(event: string, fields: Record<string, unknown>) {
	console.log(JSON.stringify({ event, ...fields }));
}

async function sessionHash(account: Account, secret: string) {
	const bytes = new TextEncoder().encode(
		`two-hops-approve:${account.id}:${secret}`,
	);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** The signed-in account, from the HttpOnly cookie (account id + hash, never the passcode). */
async function currentAccount(): Promise<Account | null> {
	const [id, hash] = (getCookie(COOKIE) ?? "").split(".");
	const account = ACCOUNTS.find((a) => a.id === id);
	const secret = account?.secret();
	if (!account || !secret || !hash) return null;
	return hash === (await sessionHash(account, secret)) ? account : null;
}

async function requireAccount(): Promise<Account> {
	const account = await currentAccount();
	if (!account) throw new Error("Enter your passcode first.");
	return account;
}

/** Every /approve action checks the request is routed to an org this account handles. */
async function requireHandles(account: Account, introId: number) {
	const intro = await repo().getById(introId);
	if (!intro || !canHandle(account.scope, intro))
		throw new Error("That request belongs to another organization.");
	return intro;
}

function viewerOf(account: Account) {
	const org =
		account.scope.kind === "org"
			? (ORG_BY_ID.get(account.scope.orgId)?.name ?? account.scope.orgId)
			: null;
	return { name: account.name, org };
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
		const account = ACCOUNTS.find((a) => {
			const secret = a.secret();
			return !!secret && data.passcode === secret;
		});
		if (!account) {
			log("approve_unlock_failed", {});
			throw new Error("That passcode didn't match.");
		}
		const secret = account.secret() ?? "";
		setCookie(COOKIE, `${account.id}.${await sessionHash(account, secret)}`, {
			httpOnly: true,
			secure: true,
			sameSite: "strict",
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
		});
		log("approve_signed_in", { account: account.id });
		return { ok: true as const };
	});

export const signOutApprove = createServerFn({ method: "POST" }).handler(
	async () => {
		deleteCookie(COOKIE, { path: "/" });
		return { ok: true as const };
	},
);

export const getApproveQueue = createServerFn({ method: "GET" }).handler(
	async () => {
		const account = await currentAccount();
		if (!account) return { unlocked: false as const, viewer: null, items: [] };
		const r = repo();
		const pending = (await r.listPending()).filter((i) =>
			canHandle(account.scope, i),
		);
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
		return { unlocked: true as const, viewer: viewerOf(account), items };
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
		await requireHandles(await requireAccount(), data.introId);
		return toClient(await draftFor(data.introId));
	});

export const redraftIntro = createServerFn({ method: "POST" })
	.validator((data: { introId: number; draftId: number }) => ({
		...idInput(data),
		draftId: Number(data?.draftId),
	}))
	.handler(async ({ data }) => {
		await requireHandles(await requireAccount(), data.introId);
		await rejectDraft(repo(), data);
		log("draft_rejected", { intro: data.introId, draft: data.draftId });
		return toClient(await draftFor(data.introId));
	});

/**
 * After approval, email the intro to the founder if they left an email address.
 * Off until EMAIL_FROM_DOMAIN is set (an onboarded sending domain). A failed send never undoes the approval.
 */
async function emailFounder(intro: Introduction, text: string) {
	const fromDomain = env.EMAIL_FROM_DOMAIN?.trim();
	if (!fromDomain) return false;
	const { founder, org } = describe(intro);
	const email = introEmail({
		contact: intro.contact,
		founder,
		orgName: org.name,
		introText: text.trim(),
		threadUrl: new URL(`/r/${intro.threadToken}`, getRequestUrl()).toString(),
		fromDomain,
	});
	if (!email) return false;
	try {
		const result = await env.EMAIL.send(email);
		log("intro_emailed", { intro: intro.id, message: result.messageId });
		return true;
	} catch (err) {
		log("intro_email_failed", {
			intro: intro.id,
			code: (err as { code?: string }).code ?? "unknown",
		});
		return false;
	}
}

export const approveIntro = createServerFn({ method: "POST" })
	.validator((data: { introId: number; draftId: number; text: string }) => ({
		...idInput(data),
		draftId: Number(data?.draftId),
		text: String(data?.text ?? "").slice(0, 2000),
	}))
	.handler(async ({ data }) => {
		const account = await requireAccount();
		await requireHandles(account, data.introId);
		await approveIntroduction(repo(), {
			introId: data.introId,
			draftId: data.draftId,
			finalText: data.text,
			approver: account.name,
		});
		const intro = await repo().getById(data.introId);
		const emailed = intro ? await emailFounder(intro, data.text) : false;
		log("intro_approved", {
			intro: data.introId,
			account: account.id,
			draft: data.draftId,
			county: intro?.founderCounty,
			state: intro?.state,
			emailed,
		});
		return {
			ok: true as const,
			county: intro?.founderCounty ?? null,
			emailed,
		};
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
