import { env } from "cloudflare:workers";
import type { Scope } from "#/domain/access";
import type { Introduction } from "#/domain/introductions";
import { loadOrgs } from "#/domain/orgData";

// Server-only helpers shared by the server functions. Kept out of the files the browser bundle
// imports, so Cloudflare-only modules never reach the client build.

const ORG_BY_ID = new Map(loadOrgs().map((o) => [o.id, o]));

export type Account = {
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
export const ACCOUNTS: Account[] = [
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

/** The account that approved an intro, from the name stored on its approved draft. */
export function accountIdForApprover(name: string | null | undefined) {
	return ACCOUNTS.find((a) => a.name === name)?.id ?? null;
}

/** Where an account's follow-up emails go. Kept in Worker secrets, never in the repo. */
export function emailForAccount(id: string): string | null {
	const extra = env as Env & { RYAN_EMAIL?: string; ADMIN_EMAIL?: string };
	const address = id === "ryan" ? extra.RYAN_EMAIL : extra.ADMIN_EMAIL;
	return address?.trim() || null;
}

export function describe(intro: Introduction) {
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

export function orgName(orgId: string): string {
	return ORG_BY_ID.get(orgId)?.name ?? orgId;
}
