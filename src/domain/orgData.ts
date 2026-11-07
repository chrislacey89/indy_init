import orgsCsv from "../../data/organizations.csv?raw";
import type { Org } from "./routing";

/** Split CSV text into rows, honoring double-quoted fields. */
function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (quoted) {
			if (ch === '"' && text[i + 1] === '"') {
				field += '"';
				i++;
			} else if (ch === '"') quoted = false;
			else field += ch;
		} else if (ch === '"') quoted = true;
		else if (ch === ",") {
			row.push(field);
			field = "";
		} else if (ch === "\n" || ch === "\r") {
			if (ch === "\r" && text[i + 1] === "\n") i++;
			row.push(field);
			if (row.some((f) => f !== "")) rows.push(row);
			row = [];
			field = "";
		} else field += ch;
	}
	row.push(field);
	if (row.some((f) => f !== "")) rows.push(row);
	return rows;
}

/** The kept ConnectIND organizations; a blank county means statewide. */
export function loadOrgs(csv: string = orgsCsv): Org[] {
	const [header, ...rows] = parseCsv(csv);
	const col = (name: string) => header.indexOf(name);
	const [iName, iCounty, iWeb, iProfile, iClaim, iSupport] = [
		"name",
		"county",
		"website",
		"profile_url",
		"claim_status",
		"support_types",
	].map(col);
	return rows.map((r) => {
		const profile = r[iProfile] ?? "";
		return {
			id: profile.split("/").filter(Boolean).pop() ?? r[iName],
			name: r[iName],
			county: r[iCounty]?.trim() || null,
			website: r[iWeb] || undefined,
			profileUrl: profile || undefined,
			claimed: r[iClaim] === "claimed",
			supportTypes: (r[iSupport] ?? "")
				.split(";")
				.map((s) => s.trim())
				.filter(Boolean),
		};
	});
}
