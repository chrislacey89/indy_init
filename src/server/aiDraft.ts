import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { type Duration, Effect, Layer, Redacted, Schema } from "effect";
import { LanguageModel } from "effect/ai";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";
import { type LangfuseConfig, langfuseOtlp } from "./langfuse";

export const DRAFT_MODEL = "gpt-4.1-mini";

export class DraftError extends Schema.TaggedError<DraftError>()("DraftError", {
	message: Schema.String,
}) {}

export type DraftPolicy = {
	timeout: Duration.Input;
	retries: number;
};

const PRODUCTION_POLICY: DraftPolicy = { timeout: "20 seconds", retries: 1 };

/** What the trace says about this draft. Never the founder's contact details. */
export type DraftTraceContext = {
	introId: number;
	org: string;
	county: string;
	need: string;
	promptVersion: string;
	approverAccount: string;
};

/** Ask the language model for intro text: timed out, retried once, failures typed as DraftError. */
export const generateIntroText = (
	prompt: string,
	policy: DraftPolicy = PRODUCTION_POLICY,
) =>
	Effect.gen(function* () {
		const response = yield* LanguageModel.generateText({ prompt });
		const text = response.text.trim();
		if (!text)
			return yield* new DraftError({
				message: "The model returned an empty draft.",
			});
		return text;
	}).pipe(
		Effect.timeout(policy.timeout),
		Effect.retry({ times: policy.retries }),
		Effect.mapError((e) =>
			e instanceof DraftError
				? e
				: new DraftError({ message: `Drafting failed: ${String(e)}` }),
		),
	);

/**
 * One trace per draft: a root "draft-intro" span carrying the prompt (input), the draft (output) and
 * filterable metadata, with Effect AI's generation span (model, tokens) nested inside it.
 */
const tracedDraft = (prompt: string, ctx: DraftTraceContext) =>
	Effect.gen(function* () {
		const span = yield* Effect.currentSpan;
		yield* Effect.annotateCurrentSpan({
			"langfuse.trace.name": "draft-intro",
			"langfuse.trace.tags": ["two-hops", "approve-queue"],
			"langfuse.observation.input": prompt,
			"langfuse.trace.metadata.intro_id": String(ctx.introId),
			"langfuse.trace.metadata.org": ctx.org,
			"langfuse.trace.metadata.county": ctx.county,
			"langfuse.trace.metadata.need": ctx.need,
			"langfuse.trace.metadata.prompt_version": ctx.promptVersion,
			"langfuse.trace.metadata.model": DRAFT_MODEL,
			"langfuse.user.id": ctx.approverAccount,
		});
		const text = yield* generateIntroText(prompt);
		yield* Effect.annotateCurrentSpan("langfuse.observation.output", text);
		return { text, traceId: span.traceId };
	}).pipe(Effect.withSpan("draft-intro"));

function openAiLayer(apiKey: string) {
	return OpenAiLanguageModel.layer({ model: DRAFT_MODEL }).pipe(
		Layer.provide(OpenAiClient.layer({ apiKey: Redacted.make(apiKey) })),
	);
}

function tracingLayer(langfuse: LangfuseConfig) {
	const { url, headers } = langfuseOtlp(langfuse);
	return OtlpTracer.layer({
		url,
		headers,
		resource: { serviceName: "two-hops" },
		// Workers: export when the request's Effect finishes, not on a timer.
		shutdownTimeout: "5 seconds",
	}).pipe(Layer.provide(OtlpSerialization.layerJson));
}

/**
 * Promise boundary for the server functions. With Langfuse configured, the trace is exported when
 * this call finishes (the tracer layer's scope closes), so nothing is lost when the Worker returns.
 */
export async function draftWithOpenAi(
	prompt: string,
	apiKey: string,
	ctx: DraftTraceContext,
	langfuse: LangfuseConfig | null,
): Promise<{ text: string; traceId: string | null }> {
	const base = openAiLayer(apiKey);
	if (!langfuse) {
		const text = await Effect.runPromise(
			generateIntroText(prompt).pipe(
				Effect.provide(base),
				Effect.provide(FetchHttpClient.layer),
			),
		);
		return { text, traceId: null };
	}
	return Effect.runPromise(
		tracedDraft(prompt, ctx).pipe(
			Effect.provide(Layer.merge(base, tracingLayer(langfuse))),
			Effect.provide(FetchHttpClient.layer),
		),
	);
}
