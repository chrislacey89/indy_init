import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { ReactNode } from "react";
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
	centroid: path.centroid(f),
}));

function fill(count: number, max: number): string {
	if (count === 0) return "var(--map-empty)";
	const t = 0.35 + 0.65 * (count / Math.max(max, 1));
	return `color-mix(in oklab, var(--map-hot) ${Math.round(t * 100)}%, var(--map-empty))`;
}

export function CountyMap({
	counts,
	pending = {},
	highlight,
	selected,
	onSelect,
	describe,
}: {
	counts: Record<string, number>;
	pending?: Record<string, number>;
	highlight?: string;
	selected?: string;
	/** Tapping a county selects it (rung 4: how far it is from a recorded handshake). */
	onSelect?: (county: string) => void;
	/** Tooltip content for the selected county. */
	describe?: (county: string) => ReactNode;
}) {
	// The tooltip follows the selected county only (click, tap, or Enter); hovering doesn't open it.
	const shown = selected;
	const anchor = shown ? shapes.find((s) => s.name === shown) : undefined;
	const max = Math.max(0, ...Object.values(counts));
	return (
		<div className="th-map-wrap">
			{/* biome-ignore lint/a11y/useSemanticElements: an SVG map can't be a <fieldset>; role=group labels the set of county buttons */}
			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				role="group"
				aria-label="Map of Indiana's 92 counties, gold means introductions made, blue dots mean introductions waiting on a person. Select a county for details."
				className="h-auto w-full max-w-[420px]"
			>
				{shapes.map((s) => {
					const n = counts[s.name] ?? 0;
					const marked = s.name === highlight || s.name === selected;
					return (
						// biome-ignore lint/a11y/useSemanticElements: an SVG county shape cannot be a <button>; role, tabIndex and Enter/Space keep it operable
						<path
							key={s.id}
							d={s.d}
							fill={fill(n, max)}
							stroke={marked ? "var(--map-hot)" : "var(--map-line)"}
							strokeWidth={marked ? 2.5 : 0.75}
							data-county={s.name}
							role="button"
							tabIndex={onSelect ? 0 : -1}
							aria-label={`${s.name} County`}
							aria-pressed={s.name === selected}
							className={onSelect ? "th-county" : undefined}
							onClick={() => onSelect?.(s.name)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onSelect?.(s.name);
								}
							}}
						>
							<title>{`${s.name}: ${n} made, ${pending[s.name] ?? 0} pending`}</title>
						</path>
					);
				})}
				{shapes.map((s) => {
					const [x, y] = s.centroid;
					if (
						!(pending[s.name] > 0) ||
						!Number.isFinite(x) ||
						!Number.isFinite(y)
					)
						return null;
					return (
						<circle
							key={`dot-${s.id}`}
							cx={x}
							cy={y}
							r={5}
							className="th-pending-dot"
							fill="var(--map-pending)"
							stroke="var(--th-bg)"
							strokeWidth={1.5}
							pointerEvents="none"
						/>
					);
				})}
			</svg>
			{describe && anchor && (
				<div
					className="th-map-tip"
					role="status"
					style={{
						left: `${(anchor.centroid[0] / WIDTH) * 100}%`,
						top: `${(anchor.centroid[1] / HEIGHT) * 100}%`,
					}}
				>
					{describe(anchor.name)}
				</div>
			)}
		</div>
	);
}
