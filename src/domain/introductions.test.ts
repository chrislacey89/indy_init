import { describe, expect, it } from "vitest";
import {
	approveIntroduction,
	countyCounts,
	createInMemoryIntroductionRepo,
	currentDraft,
	recordIntroduction,
	rejectDraft,
	saveDraft,
} from "./introductions";

const intro = {
	founderCounty: "Hamilton",
	needType: "mentor",
	fromNode: "founder:ana",
	toNode: "org:elevate-ventures",
} as const;

describe("introductions by county", () => {
	it("recording an introduction increments only its own county", async () => {
		const repo = createInMemoryIntroductionRepo();
		await recordIntroduction(repo, intro);

		const counts = countyCounts(await repo.list());
		const nonZero = Object.entries(counts).filter(([, n]) => n > 0);

		expect(nonZero).toEqual([["Hamilton", 1]]);
	});

	it("with no introductions, all 92 Indiana counties are present at zero", () => {
		const counts = countyCounts([]);

		expect(Object.keys(counts)).toHaveLength(92);
		expect(Object.values(counts).every((n) => n === 0)).toBe(true);
		expect(counts).toHaveProperty("St. Joseph", 0);
		expect(counts).toHaveProperty("Marion", 0);
	});

	it("rejects an introduction for a county that is not in Indiana", async () => {
		const repo = createInMemoryIntroductionRepo();

		await expect(
			recordIntroduction(repo, { ...intro, founderCounty: "Cook" }),
		).rejects.toThrow(/not an Indiana county/);
		expect(await repo.list()).toEqual([]);
	});
});

describe("approving an introduction", () => {
	it("an intro with no draft cannot be approved and stays pending", async () => {
		const repo = createInMemoryIntroductionRepo();
		const saved = await recordIntroduction(repo, {
			...intro,
			state: "pending",
		});

		await expect(
			approveIntroduction(repo, {
				introId: saved.id,
				draftId: 999,
				finalText: "Hi Ana",
				approver: "Ryan",
			}),
		).rejects.toThrow(/no draft/i);
		expect((await repo.getById(saved.id))?.state).toBe("pending");
	});

	it("approving a stored draft makes the intro, records the approver, and keeps the AI text beside the edit", async () => {
		const repo = createInMemoryIntroductionRepo();
		const saved = await recordIntroduction(repo, {
			...intro,
			state: "pending",
		});
		const draft = await saveDraft(repo, {
			introId: saved.id,
			aiText: "Hi Ana, this is Elevate.",
			model: "gpt-4.1-mini",
			promptVersion: "intro-v1",
		});

		await approveIntroduction(repo, {
			introId: saved.id,
			draftId: draft.id,
			finalText: "Hi Ana, this is Elevate Ventures.",
			approver: "Ryan",
		});

		expect((await repo.getById(saved.id))?.state).toBe("made");
		const [stored] = await repo.listDrafts(saved.id);
		expect(stored).toMatchObject({
			status: "approved",
			aiText: "Hi Ana, this is Elevate.",
			editedText: "Hi Ana, this is Elevate Ventures.",
			approvedBy: "Ryan",
		});
		expect(stored.approvedAt).toBeInstanceOf(Date);
	});

	it("refuses to store a draft that does not name its model and prompt version", async () => {
		const repo = createInMemoryIntroductionRepo();
		const saved = await recordIntroduction(repo, {
			...intro,
			state: "pending",
		});
		const base = { introId: saved.id, aiText: "Hi Ana" };

		await expect(
			saveDraft(repo, { ...base, model: "", promptVersion: "intro-v1" }),
		).rejects.toThrow(/model/);
		await expect(
			saveDraft(repo, { ...base, model: "gpt-4.1-mini", promptVersion: " " }),
		).rejects.toThrow(/prompt version/);
		expect(await repo.listDrafts(saved.id)).toEqual([]);
	});

	it("rejecting a draft leaves the request pending and a fresh draft becomes the current one", async () => {
		const repo = createInMemoryIntroductionRepo();
		const saved = await recordIntroduction(repo, {
			...intro,
			state: "pending",
		});
		const draft = {
			introId: saved.id,
			model: "gpt-4.1-mini",
			promptVersion: "intro-v1",
		};
		const first = await saveDraft(repo, { ...draft, aiText: "First try" });

		await rejectDraft(repo, { introId: saved.id, draftId: first.id });

		expect((await repo.getById(saved.id))?.state).toBe("pending");
		expect(currentDraft(await repo.listDrafts(saved.id))).toBeNull();
		await expect(
			approveIntroduction(repo, {
				introId: saved.id,
				draftId: first.id,
				finalText: "First try",
				approver: "Ryan",
			}),
		).rejects.toThrow(/rejected/);

		const second = await saveDraft(repo, { ...draft, aiText: "Second try" });
		expect(currentDraft(await repo.listDrafts(saved.id))?.id).toBe(second.id);
	});
});
