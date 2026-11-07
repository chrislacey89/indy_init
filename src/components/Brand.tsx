import { Link } from "@tanstack/react-router";

/**
 * Brand row for the top of every Two Hops page: the Indiana flag, the name, and where you are.
 * The flag is the real state flag (Wikimedia Commons, public domain), served from /indiana-flag.svg.
 */
export function Brand({ where }: { where: string }) {
	return (
		<p className="th-brand">
			<Link to="/" className="th-brand-link">
				<img
					src="/indiana-flag.svg"
					alt="Flag of Indiana"
					width={54}
					height={36}
					className="th-flag"
				/>
				<span className="th-brand-name">Two Hops</span>
			</Link>
			<span className="th-brand-where">{where}</span>
		</p>
	);
}
