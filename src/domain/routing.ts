import { neighborsOf } from "./counties";

export type Org = {
	id: string;
	name: string;
	/** Indiana county name, or null for a listing with no county. */
	county: string | null;
	website?: string;
	profileUrl?: string;
	claimed?: boolean;
	/** Ryan's six help categories, e.g. "Funding"; empty when untagged. */
	supportTypes?: string[];
};

export type Route = {
	org: Org;
	match: "same-county" | "adjacent-county" | "statewide";
};

/**
 * Within a tier, rank orgs tagged with the requested help first, then claimed
 * listings. Untagged orgs stay eligible: only 340 of 768 carry any tag.
 */
function best(candidates: Org[], need?: string): Org | undefined {
	const score = (o: Org) =>
		(need && o.supportTypes?.includes(need) ? 2 : 0) + (o.claimed ? 1 : 0);
	let top: Org | undefined;
	for (const o of candidates) if (!top || score(o) > score(top)) top = o;
	return top;
}

/** Nearest listed org: same county, then a neighboring county, then statewide. */
export function routeFounder(
	county: string,
	orgs: Org[],
	need?: string,
): Route | null {
	const local = best(
		orgs.filter((o) => o.county === county),
		need,
	);
	if (local) return { org: local, match: "same-county" };

	const nearby = new Set(neighborsOf(county));
	const adjacent = best(
		orgs.filter((o) => o.county !== null && nearby.has(o.county)),
		need,
	);
	if (adjacent) return { org: adjacent, match: "adjacent-county" };

	const statewide = best(
		orgs.filter((o) => o.county === null),
		need,
	);
	if (statewide) return { org: statewide, match: "statewide" };

	return null;
}
