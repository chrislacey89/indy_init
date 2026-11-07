import { env } from "cloudflare:workers";
import { getRequestHeader } from "@tanstack/react-start/server";
import { judgeSiteverify, type SiteverifyResult } from "#/domain/humanCheck";
import { TURNSTILE_ACTION } from "#/turnstile";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function log(event: string, fields: Record<string, unknown>) {
	console.log(JSON.stringify({ event, ...fields }));
}

/**
 * Runs before a founder's request is saved: a per-IP rate limit, then Turnstile's server-side check.
 * `TURNSTILE_OFF=1` (a Worker secret) skips Turnstile only, for a demo on Wi-Fi that blocks it.
 */
export async function guardFrontDoor(token: string): Promise<void> {
	const ip = getRequestHeader("cf-connecting-ip") ?? "unknown";

	const { success: underLimit } = await env.FRONT_DOOR_LIMIT.limit({ key: ip });
	if (!underLimit) {
		log("front_door_rate_limited", {});
		throw new Error(
			"Too many requests from this network. Try again in a minute.",
		);
	}

	if (env.TURNSTILE_OFF === "1") {
		log("turnstile_skipped", { reason: "kill-switch" });
		return;
	}

	const fail = (reason: string) => {
		log("turnstile_failed", { reason });
		return new Error(
			"We couldn't confirm you're a person. Please try sending again.",
		);
	};
	if (!token || token.length > 2048) throw fail("missing-token");
	if (!env.TURNSTILE_SECRET) throw fail("no-secret");

	let result: SiteverifyResult;
	try {
		const res = await fetch(SITEVERIFY, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			signal: AbortSignal.timeout(10_000),
			body: new URLSearchParams({
				secret: env.TURNSTILE_SECRET,
				response: token,
				remoteip: ip,
			}),
		});
		if (!res.ok) throw new Error(`siteverify ${res.status}`);
		result = await res.json();
	} catch {
		throw fail("siteverify-unreachable");
	}

	const verdict = judgeSiteverify(result, {
		action: TURNSTILE_ACTION,
		hostnames: (env.TURNSTILE_HOSTNAMES ?? "")
			.split(",")
			.map((h) => h.trim())
			.filter(Boolean),
	});
	if (!verdict.ok) throw fail(verdict.reason);
}
