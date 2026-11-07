import {
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const introductions = sqliteTable(
	"introductions",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		founderCounty: text("founder_county").notNull(),
		needType: text("need_type").notNull(),
		fromNode: text("from_node").notNull(),
		toNode: text("to_node").notNull(),
		state: text("state", { enum: ["pending", "made"] })
			.notNull()
			.default("made"),
		contact: text("contact"),
		// Nullable only so the migration can add it; every insert sets it and old rows are backfilled.
		threadToken: text("thread_token"),
	},
	(t) => [uniqueIndex("introductions_thread_token").on(t.threadToken)],
);

export const drafts = sqliteTable("drafts", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	introId: integer("intro_id")
		.notNull()
		.references(() => introductions.id),
	aiText: text("ai_text").notNull(),
	editedText: text("edited_text"),
	model: text("model").notNull(),
	promptVersion: text("prompt_version").notNull(),
	/** Langfuse/OpenTelemetry trace of the AI call that wrote this draft. */
	traceId: text("trace_id"),
	status: text("status", { enum: ["drafted", "approved", "rejected"] })
		.notNull()
		.default("drafted"),
	approvedBy: text("approved_by"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	approvedAt: integer("approved_at", { mode: "timestamp" }),
});

/** Did-it-happen follow-ups (rung 7). One per made introduction, armed by the founder. */
export const followUps = sqliteTable(
	"follow_ups",
	{
		id: integer("id").primaryKey({ autoIncrement: true }),
		introId: integer("intro_id")
			.notNull()
			.references(() => introductions.id),
		token: text("token").notNull(),
		notifyAccount: text("notify_account").notNull(),
		agreedAt: integer("agreed_at", { mode: "timestamp" }).notNull(),
		dueAt: integer("due_at", { mode: "timestamp" }).notNull(),
		sentAt: integer("sent_at", { mode: "timestamp" }),
		answer: text("answer", { enum: ["yes", "no"] }),
		note: text("note"),
		answeredAt: integer("answered_at", { mode: "timestamp" }),
	},
	(t) => [
		uniqueIndex("follow_ups_token").on(t.token),
		uniqueIndex("follow_ups_intro").on(t.introId),
	],
);
