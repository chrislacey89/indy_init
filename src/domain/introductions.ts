import { INDIANA_COUNTIES, isIndianaCounty } from "./counties";

export type Introduction = {
	founderCounty: string;
	needType: string;
	fromNode: string;
	toNode: string;
};

/** Storage seam: the domain never touches D1 directly. */
export interface IntroductionRepo {
	add(intro: Introduction): Promise<void>;
	list(): Promise<Introduction[]>;
}

export function createInMemoryIntroductionRepo(): IntroductionRepo {
	const rows: Introduction[] = [];
	return {
		async add(intro) {
			rows.push({ ...intro });
		},
		async list() {
			return rows.map((r) => ({ ...r }));
		},
	};
}

export async function recordIntroduction(
	repo: IntroductionRepo,
	intro: Introduction,
): Promise<void> {
	if (!isIndianaCounty(intro.founderCounty)) {
		throw new Error(`${intro.founderCounty} is not an Indiana county`);
	}
	await repo.add(intro);
}

/** Introductions per county, with every one of the 92 counties present. */
export function countyCounts(intros: Introduction[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const { name } of INDIANA_COUNTIES) counts[name] = 0;
	for (const i of intros) counts[i.founderCounty] += 1;
	return counts;
}
