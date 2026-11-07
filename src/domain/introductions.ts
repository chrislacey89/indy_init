import { INDIANA_COUNTIES, isIndianaCounty } from "./counties";

export type IntroductionState = "pending" | "made";

export type Introduction = {
	founderCounty: string;
	needType: string;
	fromNode: string;
	toNode: string;
	state: IntroductionState;
};

/** What a caller supplies; state defaults to "made" (a handshake already happened). */
export type NewIntroduction = Omit<Introduction, "state"> & {
	state?: IntroductionState;
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
	intro: NewIntroduction,
): Promise<void> {
	if (!isIndianaCounty(intro.founderCounty)) {
		throw new Error(`${intro.founderCounty} is not an Indiana county`);
	}
	await repo.add({ ...intro, state: intro.state ?? "made" });
}

/** Made introductions per county, with every one of the 92 counties present. */
export function countyCounts(intros: Introduction[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const { name } of INDIANA_COUNTIES) counts[name] = 0;
	for (const i of intros) if (i.state === "made") counts[i.founderCounty] += 1;
	return counts;
}

export type CountyState = { made: number; pending: number };

/** Made and pending introductions per county, all 92 counties present. */
export function countyStates(
	intros: Introduction[],
): Record<string, CountyState> {
	const states: Record<string, CountyState> = {};
	for (const { name } of INDIANA_COUNTIES)
		states[name] = { made: 0, pending: 0 };
	for (const i of intros) states[i.founderCounty][i.state] += 1;
	return states;
}
