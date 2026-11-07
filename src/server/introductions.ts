import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { createD1IntroductionRepo } from "#/db/introductionRepo";
import {
	countyCounts,
	type Introduction,
	recordIntroduction,
} from "#/domain/introductions";

function repo() {
	return createD1IntroductionRepo(env.DB);
}

export const getCountyCounts = createServerFn({ method: "GET" }).handler(
	async () => countyCounts(await repo().list()),
);

export const addIntroduction = createServerFn({ method: "POST" })
	.validator((data: Introduction) => {
		for (const key of [
			"founderCounty",
			"needType",
			"fromNode",
			"toNode",
		] as const) {
			if (typeof data?.[key] !== "string" || data[key].trim() === "") {
				throw new Error(`${key} is required`);
			}
		}
		return {
			founderCounty: data.founderCounty.trim(),
			needType: data.needType.trim(),
			fromNode: data.fromNode.trim().slice(0, 120),
			toNode: data.toNode.trim().slice(0, 120),
		};
	})
	.handler(async ({ data }) => {
		await recordIntroduction(repo(), data);
		return { ok: true as const };
	});
