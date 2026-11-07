import {
	type Introduction,
	type IntroductionRepo,
	recordIntroduction,
} from "./introductions";
import { type Org, type Route, routeFounder } from "./routing";

export type HelpRequest = {
	county: string;
	need: string;
	founder: string;
	contact?: string | null;
};

/** A founder asks once: route them, and save the request as a pending introduction. */
export async function requestHelp(
	repo: IntroductionRepo,
	orgs: Org[],
	req: HelpRequest,
): Promise<{ route: Route; intro: Introduction }> {
	const route = routeFounder(req.county, orgs, req.need);
	if (!route)
		throw new Error(`No listed organization can take ${req.county} yet`);
	const intro = await recordIntroduction(repo, {
		founderCounty: req.county,
		needType: req.need,
		fromNode: `founder:${req.founder}`,
		toNode: `org:${route.org.id}`,
		state: "pending",
		contact: req.contact,
	});
	return { route, intro };
}

/** The founder's optional contact is an email (we only send email). Blank means none; anything else is refused. */
export function founderEmail(raw: string): string | null {
	const email = raw.trim().slice(0, 120);
	if (!email) return null;
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
		throw new Error("That email doesn't look right.");
	return email;
}
