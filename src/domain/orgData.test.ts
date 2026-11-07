import { describe, expect, it } from "vitest";
import { INDIANA_COUNTIES } from "./counties";
import { loadOrgs } from "./orgData";
import { routeFounder } from "./routing";

describe("routing over the real ConnectIND seed (data/organizations.csv)", () => {
	const orgs = loadOrgs();

	it("loads all 768 kept organizations", () => {
		expect(orgs).toHaveLength(768);
	});

	it("routes every one of Indiana's 92 counties to an organization", () => {
		const unrouted = INDIANA_COUNTIES.filter(
			(c) => routeFounder(c.name, orgs) === null,
		).map((c) => c.name);

		expect(unrouted).toEqual([]);
	});

	it("routes Vermillion, which has no organization listed, to a neighboring county", () => {
		expect(routeFounder("Vermillion", orgs)?.match).toBe("adjacent-county");
	});
});
