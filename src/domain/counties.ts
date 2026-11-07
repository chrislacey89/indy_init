import { neighbors } from "topojson-client";
import type { Topology } from "topojson-specification";
import countiesAtlas from "us-atlas/counties-10m.json";

/** Indiana's state FIPS prefix; every Indiana county id starts with it. */
const INDIANA_FIPS = "18";

type CountyGeometry = { id: string; properties: { name: string } };

const atlas = countiesAtlas as unknown as Topology & {
	objects: { counties: { geometries: CountyGeometry[] } };
};

/** The 92 Indiana counties, by FIPS id and name, from the US Census atlas. */
export const INDIANA_COUNTIES: ReadonlyArray<{ fips: string; name: string }> =
	atlas.objects.counties.geometries
		.filter((g) => g.id.startsWith(INDIANA_FIPS))
		.map((g) => ({ fips: g.id, name: g.properties.name }))
		.sort((a, b) => a.name.localeCompare(b.name));

const COUNTY_NAMES = new Set(INDIANA_COUNTIES.map((c) => c.name));

export function isIndianaCounty(name: string): boolean {
	return COUNTY_NAMES.has(name);
}

/** Indiana counties sharing a border with each Indiana county (from the atlas topology). */
const NEIGHBORS: ReadonlyMap<string, readonly string[]> = (() => {
	const geoms = atlas.objects.counties.geometries;
	const adjacency = neighbors(
		geoms as unknown as Parameters<typeof neighbors>[0],
	);
	const map = new Map<string, string[]>();
	geoms.forEach((g, i) => {
		if (!g.id.startsWith(INDIANA_FIPS)) return;
		map.set(
			g.properties.name,
			adjacency[i]
				.map((j) => geoms[j])
				.filter((n) => n.id.startsWith(INDIANA_FIPS))
				.map((n) => n.properties.name),
		);
	});
	return map;
})();

export function neighborsOf(county: string): readonly string[] {
	return NEIGHBORS.get(county) ?? [];
}
