import { INDIANA_COUNTIES, neighborsOf } from "./counties";

/**
 * For every county, the number of county borders to the nearest county with a made introduction
 * (breadth-first over county adjacency). Null when no introduction has been made anywhere yet.
 * Measured from handshakes, not listings, so each approval can shrink it.
 */
export function countiesFromHelp(
	madeCounties: Iterable<string>,
): Record<string, number | null> {
	const distance: Record<string, number | null> = {};
	for (const { name } of INDIANA_COUNTIES) distance[name] = null;
	const queue: string[] = [];
	for (const c of new Set(madeCounties)) {
		if (c in distance && distance[c] === null) {
			distance[c] = 0;
			queue.push(c);
		}
	}
	for (let i = 0; i < queue.length; i++) {
		const here = queue[i];
		const next = (distance[here] ?? 0) + 1;
		for (const n of neighborsOf(here)) {
			if (n in distance && distance[n] === null) {
				distance[n] = next;
				queue.push(n);
			}
		}
	}
	return distance;
}

/** How many counties are within one border of a recorded handshake. */
export function withinOne(distance: Record<string, number | null>): number {
	return Object.values(distance).filter((d) => d !== null && d <= 1).length;
}

/** A made intro's chain: the founder, the org, and the person there who approved it. */
export function hopsFor(intro: {
	founder: string;
	org: string;
	person: string;
}) {
	const chain = ["you", intro.org, intro.person];
	return { hops: chain.length - 1, chain };
}
