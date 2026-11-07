/** Bump whenever the prompt text below changes; every draft stores it. */
export const PROMPT_VERSION = "intro-v1";

export type IntroContext = {
	founder: string;
	need: string;
	founderCounty: string;
	orgName: string;
	orgCounty: string | null;
};

/** The instruction the model drafts from. The AI drafts; a person approves. */
export function introPrompt(c: IntroContext): string {
	const where = c.orgCounty ? `in ${c.orgCounty} County` : "statewide";
	return [
		`You are writing on behalf of ${c.orgName}, an Indiana entrepreneur-support organization ${where}.`,
		`A founder named ${c.founder} in ${c.founderCounty} County asked for help with: ${c.need.toLowerCase()}.`,
		`Write a warm introduction from ${c.orgName} to ${c.founder}, 3-4 sentences, plain and friendly like a text from a real person.`,
		`Address ${c.founder} by first name, name what they asked for, say briefly how ${c.orgName} can help, and end with one concrete next step (for example, a short call or a visit).`,
		"Do not invent specific people, phone numbers, emails, dates, prices, or programs. No subject line, no signature block, no emoji. Return only the message text.",
	].join("\n");
}
