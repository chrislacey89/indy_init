import { describe, expect, it } from "vitest";
import { type Org, routeFounder } from "./routing";

const orgs: Org[] = [
	{ id: "elevate", name: "Elevate Ventures", county: "Marion" },
	{ id: "hamilton-edc", name: "Hamilton County EDC", county: "Hamilton" },
	{ id: "statewide-sbdc", name: "Indiana SBDC", county: null },
];

describe("routing a founder to the nearest listed organization", () => {
	it("routes to an organization in the founder's own county first", () => {
		const route = routeFounder("Hamilton", orgs);

		expect(route).toEqual({
			org: orgs[1],
			match: "same-county",
		});
	});

	it("routes to an organization in a neighboring county when the founder's county has none", () => {
		// Tipton has no listing in this set; it borders Hamilton (US Census adjacency).
		const route = routeFounder("Tipton", orgs);

		expect(route).toEqual({
			org: orgs[1],
			match: "adjacent-county",
		});
	});

	it("falls back to a listing with no county when nothing is in or next to the founder's county", () => {
		// Posey is in the far southwest; no listing is in it or a neighbor.
		const route = routeFounder("Posey", orgs);

		expect(route).toEqual({
			org: orgs[2],
			match: "statewide",
		});
	});
});
