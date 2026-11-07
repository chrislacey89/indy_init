import { describe, expect, it } from "vitest";
import { followUpEmail, introEmail } from "./introEmail";

const base = {
	founder: "Ana",
	orgName: "Elevate Ventures",
	introText: "Hi Ana, we'd love to help with your accelerator search.",
	threadUrl: "https://two-hops.example/r/abc",
	fromDomain: "twohops.example",
};

describe("emailing an approved introduction", () => {
	it("goes to the founder's email, from the org via Two Hops, with the intro and a link to their conversation", () => {
		const email = introEmail({ ...base, contact: " ana@example.com " });

		expect(email?.to).toBe("ana@example.com");
		expect(email?.from).toEqual({
			email: "intro@twohops.example",
			name: "Elevate Ventures via Two Hops",
		});
		expect(email?.subject).toContain("Elevate Ventures");
		expect(email?.text).toContain(base.introText);
		expect(email?.text).toContain(base.threadUrl);
		expect(email?.html).toContain(base.threadUrl);
	});

	it("sends nothing when the founder left a phone number or no contact", () => {
		expect(introEmail({ ...base, contact: "317-555-0100" })).toBeNull();
		expect(introEmail({ ...base, contact: null })).toBeNull();
	});

	it("escapes the intro and org name in the HTML body", () => {
		const email = introEmail({
			...base,
			orgName: "A&B <Lab>",
			introText: "<script>x</script>",
			contact: "ana@example.com",
		});

		expect(email?.html).not.toContain("<script>");
		expect(email?.html).toContain("&lt;script&gt;");
		expect(email?.html).toContain("A&amp;B &lt;Lab&gt;");
	});
});

describe("the follow-up email to the org", () => {
	it("asks the approver whether the meeting happened, with a link to answer", () => {
		const email = followUpEmail({
			to: "ryan@example.com",
			founder: "Ana",
			orgName: "Elevate Ventures",
			answerUrl: "https://two-hops.example/f/xyz",
			fromDomain: "twohops.example",
		});

		expect(email.to).toBe("ryan@example.com");
		expect(email.from.email).toBe("follow-up@twohops.example");
		expect(email.subject).toContain("Ana");
		expect(email.text).toContain("https://two-hops.example/f/xyz");
		expect(email.html).toContain("https://two-hops.example/f/xyz");
	});
});
