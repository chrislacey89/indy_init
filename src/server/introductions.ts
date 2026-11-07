import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { createD1FollowUpRepo } from "#/db/followUpRepo";
import { createD1IntroductionRepo } from "#/db/introductionRepo";
import { isIndianaCounty } from "#/domain/counties";
import { isLanded } from "#/domain/followUp";
import { requestHelp } from "#/domain/frontDoor";
import { isHelpType, replyText } from "#/domain/help";
import {
	countyCounts,
	countyStates,
	type NewIntroduction,
	recordIntroduction,
} from "#/domain/introductions";
import { loadOrgs } from "#/domain/orgData";
import { countiesFromHelp, withinOne } from "#/domain/reach";
import { guardFrontDoor } from "./frontDoorGuard";

function repo() {
	return createD1IntroductionRepo(env.DB);
}

const ORGS = loadOrgs();

export const getCountyCounts = createServerFn({ method: "GET" }).handler(
	async () => countyCounts(await repo().list()),
);

export const getCountyStates = createServerFn({ method: "GET" }).handler(
	async () => countyStates(await repo().list()),
);

/** The map's data plus Ryan's rung 4 numbers, all from the record of introductions alone. */
export const getMapData = createServerFn({ method: "GET" }).handler(
	async () => {
		const intros = await repo().list();
		const made = intros
			.filter((i) => i.state === "made")
			.map((i) => i.founderCounty);
		const distance = countiesFromHelp(made);
		return {
			states: countyStates(intros),
			distance,
			withinOne: withinOne(distance),
			handshakes: made.length,
			landed: (await createD1FollowUpRepo(env.DB).list()).filter(isLanded)
				.length,
		};
	},
);

export const askForHelp = createServerFn({ method: "POST" })
	.validator(
		(data: {
			county: string;
			need: string;
			founder: string;
			contact?: string;
			turnstileToken?: string;
		}) => {
			const county = String(data?.county ?? "").trim();
			const need = String(data?.need ?? "").trim();
			const founder = String(data?.founder ?? "")
				.trim()
				.slice(0, 40);
			if (!isIndianaCounty(county)) throw new Error("Pick an Indiana county.");
			if (!isHelpType(need)) throw new Error("Pick the kind of help you need.");
			if (!founder) throw new Error("Tell us your first name.");
			const contact =
				String(data?.contact ?? "")
					.trim()
					.slice(0, 120) || null;
			const turnstileToken = String(data?.turnstileToken ?? "");
			return { county, need, founder, contact, turnstileToken };
		},
	)
	.handler(async ({ data }) => {
		await guardFrontDoor(data.turnstileToken);
		const { route, intro } = await requestHelp(repo(), ORGS, data);
		console.log(
			JSON.stringify({
				event: "help_requested",
				county: data.county,
				need: data.need,
				match: route.match,
				org: route.org.id,
			}),
		);
		return {
			threadToken: intro.threadToken,
			reply: replyText(route, data.county, data.need, data.founder),
			match: route.match,
			org: {
				name: route.org.name,
				county: route.org.county,
				website: route.org.website ?? null,
				profileUrl: route.org.profileUrl ?? null,
			},
		};
	});

export const addIntroduction = createServerFn({ method: "POST" })
	.validator((data: NewIntroduction) => {
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
