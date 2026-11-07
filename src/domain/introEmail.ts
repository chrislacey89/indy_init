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
		html: emailHtml({
			orgName: escapeHtml(orgName),
			founder: escapeHtml(founder),
			body: escapeHtml(introText).replace(/\n/g, "<br>"),
			threadUrl: escapeHtml(threadUrl),
		}),
	};
}

const NAVY = "#0b1f4b";
const GOLD = "#f3c234";

/** Email-safe layout: one centered table, inline styles only, no images (better for a new sending domain). */
function emailHtml(v: {
	orgName: string;
	founder: string;
	body: string;
	threadUrl: string;
}): string {
	return `<!doctype html>
<html><body style="margin:0;padding:0;background:#eef1f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f7;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1b2440;">
<tr><td style="background:${NAVY};padding:18px 24px;">
<span style="color:${GOLD};font-size:12px;letter-spacing:2px;font-weight:700;text-transform:uppercase;">Two Hops &middot; Indiana</span>
<div style="color:#ffffff;font-size:20px;font-weight:700;margin-top:6px;">${v.orgName} would like to help, ${v.founder}</div>
</td></tr>
<tr><td style="padding:24px;">
<p style="margin:0 0 18px;font-size:16px;line-height:1.55;">${v.body}</p>
<p style="margin:0 0 22px;font-size:15px;font-weight:700;">${v.orgName}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${GOLD};border-radius:999px;">
<a href="${v.threadUrl}" style="display:inline-block;padding:12px 22px;color:${NAVY};font-weight:700;font-size:15px;text-decoration:none;">Open your conversation</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e3e7f0;font-size:12px;line-height:1.5;color:#5b6788;">
You asked for help through Two Hops, and a person at ${v.orgName} read and approved this introduction.<br>
Two Hops connects Indiana founders with the nearest listed support organization.
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
