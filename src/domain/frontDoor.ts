import { type IntroductionRepo, recordIntroduction } from "./introductions";
import { type Org, type Route, routeFounder } from "./routing";

export type HelpRequest = { county: string; need: string; founder: string };

/** A founder asks once: route them, and save the request as a pending introduction. */
export async function requestHelp(
	repo: IntroductionRepo,
	orgs: Org[],
	req: HelpRequest,
): Promise<Route> {
	const route = routeFounder(req.county, orgs, req.need);
	if (!route)
		throw new Error(`No listed organization can take ${req.county} yet`);
	await recordIntroduction(repo, {
		founderCounty: req.county,
		needType: req.need,
		fromNode: `founder:${req.founder}`,
		toNode: `org:${route.org.id}`,
		state: "pending",
	});
	return route;
}
