import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type {
	Draft,
	Introduction,
	IntroductionRepo,
} from "#/domain/introductions";
import { drafts, introductions } from "./schema";

type IntroRow = typeof introductions.$inferSelect;

function toIntro(r: IntroRow): Introduction {
	return { ...r, threadToken: r.threadToken ?? "" };
}

/** D1-backed adapter for the domain's storage seam. */
export function createD1IntroductionRepo(d1: D1Database): IntroductionRepo {
	const db = drizzle(d1);
	return {
		async add(intro) {
			const [row] = await db.insert(introductions).values(intro).returning();
			return toIntro(row);
		},
		async list() {
			return (await db.select().from(introductions)).map(toIntro);
		},
		async getById(id) {
			const [row] = await db
				.select()
				.from(introductions)
				.where(eq(introductions.id, id));
			return row ? toIntro(row) : null;
		},
		async getByToken(token) {
			if (!token) return null;
			const [row] = await db
				.select()
				.from(introductions)
				.where(eq(introductions.threadToken, token));
			return row ? toIntro(row) : null;
		},
		async listPending() {
			const rows = await db
				.select()
				.from(introductions)
				.where(eq(introductions.state, "pending"))
				.orderBy(desc(introductions.createdAt), desc(introductions.id));
			return rows.map(toIntro);
		},
		async addDraft(d) {
			const [row] = await db.insert(drafts).values(d).returning();
			return row as Draft;
		},
		async listDrafts(introId) {
			return (await db
				.select()
				.from(drafts)
				.where(eq(drafts.introId, introId))) as Draft[];
		},
		async rejectDraft(draftId) {
			await db
				.update(drafts)
				.set({ status: "rejected" })
				.where(eq(drafts.id, draftId));
		},
		async approve(a) {
			// One batch, so the draft is never approved without the intro becoming made, or the reverse.
			await db.batch([
				db
					.update(drafts)
					.set({
						status: "approved",
						editedText: a.editedText,
						approvedBy: a.approvedBy,
						approvedAt: a.approvedAt,
					})
					.where(and(eq(drafts.id, a.draftId), eq(drafts.status, "drafted"))),
				db
					.update(introductions)
					.set({ state: "made" })
					.where(eq(introductions.id, a.introId)),
			]);
		},
	};
}
