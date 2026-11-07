import type { IntroductionRepo } from "./introductions";

export type FollowUpAnswer = "yes" | "no";

/**
 * The did-it-happen follow-up for one made introduction. Armed when the founder says they're
 * meeting; sent to the org's approver when due; "landed" only when the org answers yes.
 */
export type FollowUp = {
	id: number;
	introId: number;
	/** Unguessable key for the org's answer link. */
	token: string;
	/** The account that approved the intro, and gets the follow-up email. */
	notifyAccount: string;
	agreedAt: Date;
	dueAt: Date;
	sentAt: Date | null;
	answer: FollowUpAnswer | null;
	note: string | null;
	answeredAt: Date | null;
};

export type NewFollowUp = Pick<
	FollowUp,
	"introId" | "token" | "notifyAccount" | "agreedAt" | "dueAt"
>;

/** Storage seam for follow-ups. */
export interface FollowUpRepo {
	add(f: NewFollowUp): Promise<FollowUp>;
	list(): Promise<FollowUp[]>;
	byIntro(introId: number): Promise<FollowUp | null>;
	byToken(token: string): Promise<FollowUp | null>;
	markSent(id: number, at: Date): Promise<void>;
	/** Records an answer only if none exists yet; returns false if it was already answered. */
	recordAnswer(
		id: number,
		a: { answer: FollowUpAnswer; note: string | null; at: Date },
	): Promise<boolean>;
}

export function createInMemoryFollowUpRepo(): FollowUpRepo {
	const rows: FollowUp[] = [];
	const copy = (f: FollowUp) => ({ ...f });
	return {
		async add(f) {
			const row: FollowUp = {
				...f,
				id: rows.length + 1,
				sentAt: null,
				answer: null,
				note: null,
				answeredAt: null,
			};
			rows.push(row);
			return copy(row);
		},
		async list() {
			return rows.map(copy);
		},
		async byIntro(introId) {
			const f = rows.find((r) => r.introId === introId);
			return f ? copy(f) : null;
		},
		async byToken(token) {
			const f = rows.find((r) => r.token === token);
			return f ? copy(f) : null;
		},
		async markSent(id, at) {
			const f = rows.find((r) => r.id === id);
			if (f && !f.sentAt) f.sentAt = at;
		},
		async recordAnswer(id, a) {
			const f = rows.find((r) => r.id === id);
			if (!f || f.answer) return false;
			Object.assign(f, { answer: a.answer, note: a.note, answeredAt: a.at });
			return true;
		},
	};
}

/** The founder says they and the org agreed to meet. Arms one follow-up; repeat clicks return it. */
export async function agreeToMeet(
	intros: IntroductionRepo,
	followUps: FollowUpRepo,
	req: { introId: number; now: Date; delayMs: number; notifyAccount: string },
): Promise<FollowUp> {
	const intro = await intros.getById(req.introId);
	if (!intro || intro.state !== "made")
		throw new Error("Only an approved introduction can have a follow-up.");
	const existing = await followUps.byIntro(req.introId);
	if (existing) return existing;
	return followUps.add({
		introId: req.introId,
		token: crypto.randomUUID(),
		notifyAccount: req.notifyAccount,
		agreedAt: req.now,
		dueAt: new Date(req.now.getTime() + req.delayMs),
	});
}

/** Follow-ups whose time has come and that have not been sent yet. */
export function dueFollowUps(all: FollowUp[], now: Date): FollowUp[] {
	return all.filter(
		(f) => !f.sentAt && !f.answer && f.dueAt.getTime() <= now.getTime(),
	);
}

/** The org answers once. A yes is the only thing that lands an introduction. */
export async function answerFollowUp(
	followUps: FollowUpRepo,
	req: { token: string; answer: FollowUpAnswer; note: string; now: Date },
): Promise<FollowUp> {
	const f = await followUps.byToken(req.token);
	if (!f) throw new Error("That follow-up link isn't valid.");
	const note = req.note.trim().slice(0, 1000) || null;
	const ok = await followUps.recordAnswer(f.id, {
		answer: req.answer,
		note,
		at: req.now,
	});
	if (!ok) throw new Error("This follow-up was already answered.");
	return { ...f, answer: req.answer, note, answeredAt: req.now };
}

export function isLanded(f: Pick<FollowUp, "answer">): boolean {
	return f.answer === "yes";
}

/** Where an approved intro stands, in the approver's words. */
export function followUpStatus(f: FollowUp | null): string {
	if (!f) return "Sent. Waiting for the founder to say yes to a meeting";
	if (f.answer === "yes") return "Landed: you met";
	if (f.answer === "no") return "Not met yet";
	if (f.sentAt) return "Follow-up emailed. Waiting on your answer";
	return "Meeting agreed. Follow-up scheduled";
}
