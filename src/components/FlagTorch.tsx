import { Link } from "@tanstack/react-router";

/** Five-point star, radius 1, centered at the origin. */
const STAR =
	"M0,-1L0.225,-0.309L0.951,-0.309L0.363,0.118L0.588,0.809L0,0.382L-0.588,0.809L-0.363,0.118L-0.951,-0.309L-0.225,-0.309Z";

/** Indiana's flag: 13 outer stars, 5 inner, one above the flame; 6 rays. */
const OUTER: [number, number][] = [
	[120.1, 26.4],
	[155.7, 45.1],
	[178.5, 78.2],
	[183.4, 118.1],
	[169.1, 155.7],
	[139, 182.4],
	[100, 192],
	[61, 182.4],
	[30.9, 155.7],
	[16.6, 118.1],
	[21.5, 78.2],
	[44.3, 45.1],
	[79.9, 26.4],
];
const INNER: [number, number][] = [
	[143.3, 133],
	[125, 151.3],
	[100, 164],
	[75, 151.3],
	[56.7, 133],
];
const RAYS = [
	"M71,84.2L44,77",
	"M78.8,70.8L58,50",
	"M92.2,63L86,36",
	"M107.8,63L114,36",
	"M121.2,70.8L142,50",
	"M129,84.2L156,77",
];

/** The torch-and-nineteen-stars mark, in one color (gold on navy by default). */
export function FlagTorch({
	size = 36,
	color = "var(--th-gold)",
	title,
}: {
	size?: number;
	color?: string;
	title?: string;
}) {
	return (
		<svg
			viewBox="0 0 200 200"
			width={size}
			height={size}
			role={title ? "img" : undefined}
			aria-label={title}
			aria-hidden={title ? undefined : true}
			focusable="false"
		>
			<g fill={color}>
				<path d={STAR} transform="translate(100 14) scale(10)" />
				{OUTER.map(([x, y]) => (
					<path
						key={`${x},${y}`}
						d={STAR}
						transform={`translate(${x} ${y}) scale(7)`}
					/>
				))}
				{INNER.map(([x, y]) => (
					<path
						key={`${x},${y}`}
						d={STAR}
						transform={`translate(${x} ${y}) scale(5.5)`}
					/>
				))}
			</g>
			<g stroke={color} strokeWidth="4" strokeLinecap="round">
				{RAYS.map((d) => (
					<path key={d} d={d} />
				))}
			</g>
			<path
				d="M100 72 C 88 86, 87 98, 100 108 C 113 98, 112 86, 100 72 Z"
				fill={color}
			/>
			<path d="M91 108 L109 108 L104 152 L96 152 Z" fill={color} />
			<path d="M88 106 h24 v6 h-24 Z" fill={color} />
		</svg>
	);
}

/** Brand row for the top of every Two Hops page: the mark, the name, and where you are. */
export function Brand({ where }: { where: string }) {
	return (
		<p className="th-brand">
			<Link to="/" className="th-brand-link">
				<FlagTorch size={40} title="Two Hops, Indiana" />
				<span className="th-brand-name">Two Hops</span>
			</Link>
			<span className="th-brand-where">{where}</span>
		</p>
	);
}
