import { describe, expect, it } from "vitest";
import {
	countyCounts,
	createInMemoryIntroductionRepo,
	recordIntroduction,
} from "./introductions";

const intro = {
	founderCounty: "Hamilton",
	needType: "mentor",
	fromNode: "founder:ana",
	toNode: "org:elevate-ventures",
} as const;

describe("introductions by county", () => {
	it("recording an introduction increments only its own county", async () => {
		const repo = createInMemoryIntroductionRepo();
		await recordIntroduction(repo, intro);

		const counts = countyCounts(await repo.list());
		const nonZero = Object.entries(counts).filter(([, n]) => n > 0);

		expect(nonZero).toEqual([["Hamilton", 1]]);
	});

	it("with no introductions, all 92 Indiana counties are present at zero", () => {
		const counts = countyCounts([]);

		expect(Object.keys(counts)).toHaveLength(92);
		expect(Object.values(counts).every((n) => n === 0)).toBe(true);
		expect(counts).toHaveProperty("St. Joseph", 0);
		expect(counts).toHaveProperty("Marion", 0);
	});

	it("rejects an introduction for a county that is not in Indiana", async () => {
		const repo = createInMemoryIntroductionRepo();

		await expect(
			recordIntroduction(repo, { ...intro, founderCounty: "Cook" }),
		).rejects.toThrow(/not an Indiana county/);
		expect(await repo.list()).toEqual([]);
	});
});
