import { and, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { FollowUp, FollowUpRepo } from "#/domain/followUp";
import { followUps } from "./schema";

/** D1-backed adapter for the follow-up storage seam. */
export function createD1FollowUpRepo(d1: D1Database): FollowUpRepo {
	const db = drizzle(d1);
	const one = async (rows: Promise<FollowUp[]>) => (await rows)[0] ?? null;
	return {
		async add(f) {
			const [row] = await db.insert(followUps).values(f).returning();
			return row as FollowUp;
		},
		async list() {
			return (await db.select().from(followUps)) as FollowUp[];
		},
		async byIntro(introId) {
			return one(
				db
					.select()
					.from(followUps)
					.where(eq(followUps.introId, introId)) as Promise<FollowUp[]>,
			);
		},
		async byToken(token) {
			if (!token) return null;
			return one(
				db
					.select()
					.from(followUps)
					.where(eq(followUps.token, token)) as Promise<FollowUp[]>,
			);
		},
		async markSent(id, at) {
			await db
				.update(followUps)
				.set({ sentAt: at })
				.where(and(eq(followUps.id, id), isNull(followUps.sentAt)));
		},
		async recordAnswer(id, a) {
			// Conditional update: only the first answer sticks, even if two clicks race.
			const rows = await db
				.update(followUps)
				.set({ answer: a.answer, note: a.note, answeredAt: a.at })
				.where(and(eq(followUps.id, id), isNull(followUps.answer)))
				.returning({ id: followUps.id });
			return rows.length > 0;
		},
	};
}
