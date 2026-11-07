import { Link } from "@tanstack/react-router";

/**
 * Brand row for the top of every Two Hops page: Indiana's torch and stars, the name, and where you are.
 * The emblem is cut from the real state flag (Wikimedia Commons, public domain), served from /indiana-emblem.svg.
 */
export function Brand({ where }: { where: string }) {
	return (
		<p className="th-brand">
			<Link to="/" className="th-brand-link">
				<img
					src="/indiana-emblem.svg"
					alt="Indiana's torch and stars"
					width={44}
					height={44}
					className="th-mark"
				/>
				<span className="th-brand-name">Two Hops</span>
			</Link>
			<span className="th-brand-where">{where}</span>
		</p>
	);
}
