import { describe, expect, it } from "vitest";
import { neighborsOf } from "./counties";
import { countiesFromHelp, hopsFor, withinOne } from "./reach";

describe("counties from help", () => {
	it("is 0 for a county with a made introduction and 1 for its neighbors", () => {
		const distance = countiesFromHelp(["Marion"]);

		expect(distance.Marion).toBe(0);
		for (const n of neighborsOf("Marion")) expect(distance[n]).toBe(1);
		expect(Object.keys(distance)).toHaveLength(92);
	});

	it("is null everywhere when no introduction has been made yet", () => {
		const distance = countiesFromHelp([]);

		expect(Object.values(distance).every((d) => d === null)).toBe(true);
	});

	it("shrinks when a new handshake lands closer", () => {
		const before = countiesFromHelp(["Lake"]);
		const after = countiesFromHelp(["Lake", "Vanderburgh"]);

		expect(after.Posey).toBe(1);
		expect(before.Posey).toBeGreaterThan(3);
	});

	it("counts the counties within one border of a recorded handshake", () => {
		const distance = countiesFromHelp(["Marion"]);

		expect(withinOne(distance)).toBe(1 + neighborsOf("Marion").length);
	});
});

describe("hops", () => {
	it("a made intro is two hops: founder to org, org to the person who approved it", () => {
		expect(
			hopsFor({ founder: "Ana", org: "Elevate Ventures", person: "Ryan" }),
		).toEqual({
			hops: 2,
			chain: ["you", "Elevate Ventures", "Ryan"],
		});
	});
});
