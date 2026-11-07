import { OpenAiClient, OpenAiLanguageModel } from "@effect/ai-openai";
import { type Duration, Effect, Layer, Redacted, Schema } from "effect";
import { LanguageModel } from "effect/ai";
import { FetchHttpClient } from "effect/http";

export const DRAFT_MODEL = "gpt-4.1-mini";

export class DraftError extends Schema.TaggedError<DraftError>()("DraftError", {
	message: Schema.String,
}) {}

export type DraftPolicy = {
	timeout: Duration.Input;
	retries: number;
};

const PRODUCTION_POLICY: DraftPolicy = { timeout: "20 seconds", retries: 1 };

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
		Effect.withSpan("generateIntroText", {
			attributes: { model: DRAFT_MODEL },
		}),
	);

function openAiLayer(apiKey: string) {
	return OpenAiLanguageModel.layer({ model: DRAFT_MODEL }).pipe(
		Layer.provide(OpenAiClient.layer({ apiKey: Redacted.make(apiKey) })),
		Layer.provide(FetchHttpClient.layer),
	);
}

/** Promise boundary for the server functions. */
export function draftWithOpenAi(prompt: string, apiKey: string) {
	return Effect.runPromise(
		generateIntroText(prompt).pipe(Effect.provide(openAiLayer(apiKey))),
	);
}
