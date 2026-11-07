import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countiesAtlas from "us-atlas/counties-10m.json";

type CountyProps = { name: string };
type CountyFeature = Feature<Geometry, CountyProps> & { id: string };

const WIDTH = 360;
const HEIGHT = 560;

const atlas = countiesAtlas as unknown as Topology<{
	counties: GeometryCollection<CountyProps>;
}>;
const all = feature(atlas, atlas.objects.counties) as FeatureCollection<
	Geometry,
	CountyProps
>;
const indiana = all.features.filter((f) =>
	String(f.id).startsWith("18"),
) as CountyFeature[];
const projection = geoMercator().fitSize([WIDTH, HEIGHT], {
	type: "FeatureCollection",
	features: indiana,
});
const path = geoPath(projection);
const shapes = indiana.map((f) => ({
	id: String(f.id),
	name: f.properties.name,
	d: path(f) ?? "",
}));

function fill(count: number, max: number): string {
	if (count === 0) return "var(--map-empty)";
	const t = 0.35 + 0.65 * (count / Math.max(max, 1));
	return `color-mix(in oklab, var(--map-hot) ${Math.round(t * 100)}%, var(--map-empty))`;
}

export function CountyMap({
	counts,
	highlight,
}: {
	counts: Record<string, number>;
	highlight?: string;
}) {
	const max = Math.max(0, ...Object.values(counts));
	return (
		<svg
			viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			role="img"
			aria-label="Map of Indiana's 92 counties, shaded by introductions recorded"
			className="h-auto w-full max-w-[420px]"
		>
			{shapes.map((s) => {
				const n = counts[s.name] ?? 0;
				return (
					<path
						key={s.id}
						d={s.d}
						fill={fill(n, max)}
						stroke={s.name === highlight ? "var(--map-hot)" : "var(--map-line)"}
						strokeWidth={s.name === highlight ? 2.5 : 0.75}
						data-county={s.name}
					>
						<title>{`${s.name}: ${n} introduction${n === 1 ? "" : "s"}`}</title>
					</path>
				);
			})}
		</svg>
	);
}
