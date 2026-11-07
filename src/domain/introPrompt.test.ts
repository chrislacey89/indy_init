import { describe, expect, it } from "vitest";
import { introPrompt, PROMPT_VERSION } from "./introPrompt";

describe("the intro prompt", () => {
	it("asks for a 3-4 sentence intro from the org to the founder, naming them and their need, ending on one next step", () => {
		const prompt = introPrompt({
			founder: "Ana",
			need: "Funding",
			founderCounty: "Vermillion",
			orgName: "Parke County Chamber",
			orgCounty: "Parke",
		});

		expect(prompt).toContain("Parke County Chamber");
		expect(prompt).toContain("Ana");
		expect(prompt).toContain("funding");
		expect(prompt).toContain("Vermillion County");
		expect(prompt).toMatch(/3.4 sentences/);
		expect(prompt).toMatch(/one (concrete )?next step/i);
		expect(PROMPT_VERSION).toBe("intro-v1");
	});
});
