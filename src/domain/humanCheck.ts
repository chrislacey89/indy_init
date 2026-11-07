export type SiteverifyResult = {
	success?: boolean;
	action?: string;
	hostname?: string;
	"error-codes"?: string[];
};

export type HumanCheckVerdict = { ok: true } | { ok: false; reason: string };

/** Turnstile's answer counts only if it succeeded, for this action, from a hostname we serve. */
export function judgeSiteverify(
	result: SiteverifyResult,
	expected: { action: string; hostnames: string[] },
): HumanCheckVerdict {
	if (expected.hostnames.length === 0)
		return { ok: false, reason: "no-allowed-hostnames" };
	if (result.success !== true)
		return {
			ok: false,
			reason: `failed:${(result["error-codes"] ?? []).join(",")}`,
		};
	if (result.action !== expected.action)
		return { ok: false, reason: "wrong-action" };
	if (!result.hostname || !expected.hostnames.includes(result.hostname))
		return { ok: false, reason: "wrong-hostname" };
	return { ok: true };
}
