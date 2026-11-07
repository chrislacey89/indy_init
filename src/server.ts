import handler from "@tanstack/react-start/server-entry";
import { sendDueFollowUps } from "./server/followUpCron";

/**
 * Worker entry: TanStack Start serves every request; the cron trigger (every minute) sends
 * rung 7's did-it-happen follow-ups that have come due.
 */
export default {
	fetch: (request) => handler.fetch(request),
	async scheduled(_controller, _env, ctx) {
		ctx.waitUntil(
			sendDueFollowUps().then(
				(n) =>
					n && console.log(JSON.stringify({ event: "follow_up_cron", due: n })),
			),
		);
	},
} satisfies ExportedHandler<Env>;
