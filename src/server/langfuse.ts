export type LangfuseConfig = {
	publicKey: string;
	secretKey: string;
	baseUrl: string;
};

/** Langfuse is on only when all three settings exist; otherwise drafting runs untraced. */
export function langfuseFrom(env: {
	LANGFUSE_PUBLIC_KEY?: string;
	LANGFUSE_SECRET_KEY?: string;
	LANGFUSE_BASE_URL?: string;
}): LangfuseConfig | null {
	const publicKey = env.LANGFUSE_PUBLIC_KEY?.trim();
	const secretKey = env.LANGFUSE_SECRET_KEY?.trim();
	const baseUrl = env.LANGFUSE_BASE_URL?.trim().replace(/\/+$/, "");
	if (!publicKey || !secretKey || !baseUrl) return null;
	return { publicKey, secretKey, baseUrl };
}

function basicAuth(c: LangfuseConfig) {
	return `Basic ${btoa(`${c.publicKey}:${c.secretKey}`)}`;
}

/** Langfuse's OTLP/HTTP traces endpoint and headers (ingestion v4, so data appears right away). */
export function langfuseOtlp(c: LangfuseConfig) {
	return {
		url: `${c.baseUrl}/api/public/otel/v1/traces`,
		headers: {
			Authorization: basicAuth(c),
			"x-langfuse-ingestion-version": "4",
		},
	};
}

export type HumanReview = "approved_as_is" | "edited" | "rejected";

/**
 * Record a person's verdict on an AI draft as a categorical score on that draft's trace.
 * An edit carries the corrected text as the comment, so the correction sits beside the AI output.
 * Never throws: a Langfuse outage must not block an approval.
 */
export async function scoreDraft(
	c: LangfuseConfig | null,
	score: {
		traceId: string | null;
		value: HumanReview;
		correction?: string;
		reviewer: string;
	},
): Promise<boolean> {
	if (!c || !score.traceId) return false;
	try {
		const res = await fetch(`${c.baseUrl}/api/public/scores`, {
			method: "POST",
			headers: {
				Authorization: basicAuth(c),
				"Content-Type": "application/json",
			},
			signal: AbortSignal.timeout(5000),
			body: JSON.stringify({
				traceId: score.traceId,
				name: "human_review",
				dataType: "CATEGORICAL",
				value: score.value,
				comment:
					score.value === "edited"
						? `Corrected by ${score.reviewer}:\n${score.correction ?? ""}`
						: `Reviewed by ${score.reviewer}`,
			}),
		});
		return res.ok;
	} catch {
		return false;
	}
}
