import { describe, expect, it } from "vitest";
import { judgeSiteverify } from "./humanCheck";

const expected = {
	action: "ask_for_help",
	hostnames: ["two-hops.chrislacey89.workers.dev"],
};
const passing = {
	success: true,
	action: "ask_for_help",
	hostname: "two-hops.chrislacey89.workers.dev",
};

describe("the front door's human check", () => {
	it("accepts a successful token for this action from our own hostname", () => {
		expect(judgeSiteverify(passing, expected)).toEqual({ ok: true });
	});

	it("rejects a failed, wrong-action, or wrong-hostname result", () => {
		expect(judgeSiteverify({ ...passing, success: false }, expected).ok).toBe(
			false,
		);
		expect(judgeSiteverify({ ...passing, action: "login" }, expected).ok).toBe(
			false,
		);
		expect(
			judgeSiteverify({ ...passing, hostname: "evil.example" }, expected).ok,
		).toBe(false);
	});

	it("rejects everything when no hostname is allowed (fails closed)", () => {
		expect(judgeSiteverify(passing, { ...expected, hostnames: [] }).ok).toBe(
			false,
		);
	});
});
