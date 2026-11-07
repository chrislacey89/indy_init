import { drizzle } from "drizzle-orm/d1";
import type { Introduction, IntroductionRepo } from "#/domain/introductions";
import { introductions } from "./schema";

/** D1-backed adapter for the domain's storage seam. */
export function createD1IntroductionRepo(d1: D1Database): IntroductionRepo {
	const db = drizzle(d1);
	return {
		async add(intro) {
			await db.insert(introductions).values(intro);
		},
		async list(): Promise<Introduction[]> {
			return db
				.select({
					founderCounty: introductions.founderCounty,
					needType: introductions.needType,
					fromNode: introductions.fromNode,
					toNode: introductions.toNode,
					state: introductions.state,
				})
				.from(introductions);
		},
	};
}
