import { INDIANA_COUNTIES, isIndianaCounty } from "./counties";

export type IntroductionState = "pending" | "made";

export type Introduction = {
	id: number;
	createdAt: Date;
	founderCounty: string;
	needType: string;
	fromNode: string;
	toNode: string;
	state: IntroductionState;
	/** Optional founder contact, shown only to the approving org. */
	contact: string | null;
	/** Unguessable key for the founder's private thread link. */
	threadToken: string;
};

/** What a caller supplies; state defaults to "made" (a handshake already happened). */
export type NewIntroduction = {
	founderCounty: string;
	needType: string;
	fromNode: string;
	toNode: string;
	state?: IntroductionState;
	contact?: string | null;
};

export type DraftStatus = "drafted" | "approved" | "rejected";

/** An AI-drafted intro. The AI text is never overwritten; a person's edit sits beside it. */
export type Draft = {
	id: number;
	introId: number;
	aiText: string;
	editedText: string | null;
	model: string;
	promptVersion: string;
	status: DraftStatus;
	approvedBy: string | null;
	createdAt: Date;
	approvedAt: Date | null;
};

export type NewDraft = Pick<
	Draft,
	"introId" | "aiText" | "model" | "promptVersion"
>;

export type Approval = {
	introId: number;
	draftId: number;
	editedText: string | null;
	approvedBy: string;
	approvedAt: Date;
};

/** Storage seam: the domain never touches D1 directly. */
export interface IntroductionRepo {
	add(intro: Omit<Introduction, "id" | "createdAt">): Promise<Introduction>;
	list(): Promise<Introduction[]>;
	getById(id: number): Promise<Introduction | null>;
	getByToken(token: string): Promise<Introduction | null>;
	/** Pending introductions, newest first. */
	listPending(): Promise<Introduction[]>;
	addDraft(draft: NewDraft): Promise<Draft>;
	listDrafts(introId: number): Promise<Draft[]>;
	rejectDraft(draftId: number): Promise<void>;
	/** Atomically marks the draft approved and the introduction made. */
	approve(approval: Approval): Promise<void>;
}

export function createInMemoryIntroductionRepo(): IntroductionRepo {
	const rows: Introduction[] = [];
	const drafts: Draft[] = [];
	let tick = 0;
	const now = () => new Date(Date.UTC(2026, 10, 7, 12, 0, tick++));
	return {
		async add(intro) {
			const row = { ...intro, id: rows.length + 1, createdAt: now() };
			rows.push(row);
			return { ...row };
		},
		async list() {
			return rows.map((r) => ({ ...r }));
		},
		async getById(id) {
			const r = rows.find((x) => x.id === id);
			return r ? { ...r } : null;
		},
		async getByToken(token) {
			const r = rows.find((x) => x.threadToken === token);
			return r ? { ...r } : null;
		},
		async listPending() {
			return rows
				.filter((r) => r.state === "pending")
				.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
				.map((r) => ({ ...r }));
		},
		async addDraft(d) {
			const draft: Draft = {
				...d,
				id: drafts.length + 1,
				editedText: null,
				status: "drafted",
				approvedBy: null,
				createdAt: now(),
				approvedAt: null,
			};
			drafts.push(draft);
			return { ...draft };
		},
		async listDrafts(introId) {
			return drafts.filter((d) => d.introId === introId).map((d) => ({ ...d }));
		},
		async rejectDraft(draftId) {
			const d = drafts.find((x) => x.id === draftId);
			if (d) d.status = "rejected";
		},
		async approve(a) {
			const d = drafts.find((x) => x.id === a.draftId);
			const r = rows.find((x) => x.id === a.introId);
			if (!d || !r) return;
			Object.assign(d, {
				status: "approved",
				editedText: a.editedText,
				approvedBy: a.approvedBy,
				approvedAt: a.approvedAt,
			});
			r.state = "made";
		},
	};
}

export async function recordIntroduction(
	repo: IntroductionRepo,
	intro: NewIntroduction,
): Promise<Introduction> {
	if (!isIndianaCounty(intro.founderCounty)) {
		throw new Error(`${intro.founderCounty} is not an Indiana county`);
	}
	return repo.add({
		...intro,
		state: intro.state ?? "made",
		contact: intro.contact?.trim() || null,
		threadToken: crypto.randomUUID(),
	});
}

export type ApproveRequest = {
	introId: number;
	draftId: number;
	finalText: string;
	approver: string;
};

/** The only way a pending request becomes made: a named person approves a stored draft. */
export async function approveIntroduction(
	repo: IntroductionRepo,
	req: ApproveRequest,
): Promise<void> {
	const draft = (await repo.listDrafts(req.introId)).find(
		(d) => d.id === req.draftId,
	);
	if (!draft) throw new Error("There is no draft to approve for this request.");
	if (draft.status !== "drafted")
		throw new Error(`That draft was already ${draft.status}.`);
	const approver = req.approver.trim();
	if (!approver) throw new Error("An approval needs the approver's name.");
	const finalText = req.finalText.trim();
	if (!finalText) throw new Error("The introduction is empty.");
	await repo.approve({
		introId: req.introId,
		draftId: draft.id,
		editedText: finalText === draft.aiText.trim() ? null : finalText,
		approvedBy: approver,
		approvedAt: new Date(),
	});
}

/** Store an AI draft. Every draft must say which model and prompt version wrote it. */
export async function saveDraft(
	repo: IntroductionRepo,
	draft: NewDraft,
): Promise<Draft> {
	if (!draft.model.trim()) throw new Error("A draft must name its model.");
	if (!draft.promptVersion.trim())
		throw new Error("A draft must name its prompt version.");
	if (!draft.aiText.trim()) throw new Error("The draft is empty.");
	if (!(await repo.getById(draft.introId))) throw new Error("No such request.");
	return repo.addDraft(draft);
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

/** Reject a draft. The request stays pending, so a fresh draft can be written. */
export async function rejectDraft(
	repo: IntroductionRepo,
	req: { introId: number; draftId: number },
): Promise<void> {
	const draft = (await repo.listDrafts(req.introId)).find(
		(d) => d.id === req.draftId,
	);
	if (!draft) throw new Error("There is no such draft for this request.");
	if (draft.status !== "drafted")
		throw new Error(`That draft was already ${draft.status}.`);
	await repo.rejectDraft(draft.id);
}

/** The newest draft still waiting on a person, or null if none is. */
export function currentDraft(drafts: Draft[]): Draft | null {
	const open = drafts.filter((d) => d.status === "drafted");
	return open.length ? open.reduce((a, b) => (b.id > a.id ? b : a)) : null;
}

/** The newest approved draft, as the founder will read it. */
export function approvedText(drafts: Draft[]): string | null {
	const ok = drafts.filter((d) => d.status === "approved");
	if (!ok.length) return null;
	const d = ok.reduce((a, b) => (b.id > a.id ? b : a));
	return d.editedText ?? d.aiText;
}
