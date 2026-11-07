export type IntroEmailInput = {
	contact: string | null;
	founder: string;
	orgName: string;
	introText: string;
	threadUrl: string;
	fromDomain: string;
};

export type IntroEmail = {
	to: string;
	from: { email: string; name: string };
	subject: string;
	text: string;
	html: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (s: string) =>
	s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

/** The approved intro as an email to the founder, or null when they gave no email address. */
export function introEmail(input: IntroEmailInput): IntroEmail | null {
	const to = input.contact?.trim() ?? "";
	if (!EMAIL.test(to)) return null;
	const { orgName, introText, threadUrl, founder } = input;
	const subject = `${orgName} would like to help, ${founder}`;
	const footer = `You asked for help through Two Hops. Your conversation: ${threadUrl}`;
	return {
		to,
		from: {
			email: `intro@${input.fromDomain}`,
			name: `${orgName} via Two Hops`,
		},
		subject,
		text: `${introText}\n\n${orgName}\n\n${footer}`,
		html: [
			`<p>${escapeHtml(introText).replace(/\n/g, "<br>")}</p>`,
			`<p><strong>${escapeHtml(orgName)}</strong></p>`,
			`<p style="color:#555;font-size:13px">You asked for help through Two Hops. <a href="${escapeHtml(threadUrl)}">Open your conversation</a>.</p>`,
		].join("\n"),
	};
}
