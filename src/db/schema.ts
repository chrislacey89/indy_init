import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const introductions = sqliteTable("introductions", {
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
});
