import { describe, expect, it } from "vitest";
import { requestHelp } from "./frontDoor";
import { countyStates, createInMemoryIntroductionRepo } from "./introductions";
import type { Org } from "./routing";

const orgs: Org[] = [
	{
		id: "vanderburgh-sbdc",
		name: "Southwest Indiana SBDC",
		county: "Vanderburgh",
	},
	{ id: "statewide", name: "Indiana SBDC", county: null },
];

describe("the front door", () => {
	it("routes a founder's request and saves it as a pending introduction to that org", async () => {
		const repo = createInMemoryIntroductionRepo();

		const reply = await requestHelp(repo, orgs, {
			county: "Posey",
			need: "mentor",
			founder: "Ana",
		});

		expect(reply.org.name).toBe("Southwest Indiana SBDC");
		expect(reply.match).toBe("adjacent-county");
		expect(await repo.list()).toEqual([
			{
				founderCounty: "Posey",
				needType: "mentor",
				fromNode: "founder:Ana",
				toNode: "org:vanderburgh-sbdc",
				state: "pending",
			},
		]);
	});

	it("shows a pending request on the map separately from made introductions", async () => {
		const repo = createInMemoryIntroductionRepo();
		await requestHelp(repo, orgs, {
			county: "Posey",
			need: "capital",
			founder: "Ana",
		});

		const states = countyStates(await repo.list());

		expect(states.Posey).toEqual({ made: 0, pending: 1 });
		expect(states.Vanderburgh).toEqual({ made: 0, pending: 0 });
	});
});
