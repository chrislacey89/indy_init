/** What a signed-in approver may see and approve. */
export type Scope = { kind: "all" } | { kind: "org"; orgId: string };

/** An org account handles only requests routed to its org; the demo super admin handles all. */
export function canHandle(scope: Scope, intro: { toNode: string }): boolean {
	return scope.kind === "all" || intro.toNode === `org:${scope.orgId}`;
}
