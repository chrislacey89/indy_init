import { describe, expect, it } from "vitest";
import { canHandle } from "./access";

const forElevate = { toNode: "org:elevate-ventures" };
const forNiic = { toNode: "org:northeast-indiana-innovation-center-niic" };

describe("who can see and approve a request", () => {
	it("an org account handles only requests routed to its own org", () => {
		const ryan = { kind: "org", orgId: "elevate-ventures" } as const;

		expect(canHandle(ryan, forElevate)).toBe(true);
		expect(canHandle(ryan, forNiic)).toBe(false);
	});

	it("the demo super admin handles every org's requests", () => {
		const admin = { kind: "all" } as const;

		expect(canHandle(admin, forElevate)).toBe(true);
		expect(canHandle(admin, forNiic)).toBe(true);
	});
});
