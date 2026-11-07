import { neighborsOf } from "./counties";

export type Org = {
	id: string;
	name: string;
	/** Indiana county name, or null for a listing with no county. */
	county: string | null;
};

export type Route = {
	org: Org;
	match: "same-county" | "adjacent-county" | "statewide";
};

export function routeFounder(county: string, orgs: Org[]): Route | null {
	const local = orgs.find((o) => o.county === county);
	if (local) return { org: local, match: "same-county" };

	const nearby = new Set(neighborsOf(county));
	const adjacent = orgs.find((o) => o.county !== null && nearby.has(o.county));
	if (adjacent) return { org: adjacent, match: "adjacent-county" };

	const statewide = orgs.find((o) => o.county === null);
	if (statewide) return { org: statewide, match: "statewide" };

	return null;
}
