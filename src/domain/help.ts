import type { Route } from "./routing";

/** Ryan's six kinds of help, collapsed from ConnectIND's 19 resource tags. */
export const HELP_TYPES = [
	"Funding",
	"Mentoring & advising",
	"Training & classes",
	"Space to work",
	"Accelerators & incubators",
	"Permits & licensing",
] as const;

export type HelpType = (typeof HELP_TYPES)[number];

export function isHelpType(value: string): value is HelpType {
	return (HELP_TYPES as readonly string[]).includes(value);
}

/** The text-message reply a founder sees: one or two plain sentences. */
export function replyText(
	route: Route,
	founderCounty: string,
	need: string,
	founder: string,
): string {
	const { org, match } = route;
	const where =
		match === "same-county"
			? `right in ${founderCounty} County`
			: match === "adjacent-county"
				? `next door in ${org.county} County, since nothing is listed in ${founderCounty} County yet`
				: "statewide, since nothing is listed in or next to your county yet";
	return `Hi ${founder}, for ${need.toLowerCase()} the closest help is ${org.name}, ${where}. I've asked them to introduce themselves, and you'll hear back once a person there approves it.`;
}
