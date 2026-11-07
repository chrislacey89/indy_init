import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

const SITE_URL = "https://twohops.app";
const SITE_DESCRIPTION =
	"Ask once with your county and what you need. A real person at the nearest listed organization introduces themselves, and the county lights up on the map.";

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Two Hops",
			},
			{
				name: "description",
				content: SITE_DESCRIPTION,
			},
			{ name: "theme-color", content: "#0b2a5b" },
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: "Two Hops" },
			// The share image already carries the headline; a short title keeps link previews from repeating it.
			{ property: "og:title", content: "Two Hops" },
			{ property: "og:description", content: SITE_DESCRIPTION },
			{ property: "og:url", content: SITE_URL },
			{ property: "og:image", content: `${SITE_URL}/og.png` },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{
				property: "og:image:alt",
				content:
					"Two Hops, Indiana. Every Indiana founder, two hops from help. A map of Indiana's 92 counties with reached counties in gold.",
			},
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: "Two Hops" },
			{ name: "twitter:description", content: SITE_DESCRIPTION },
			{ name: "twitter:image", content: `${SITE_URL}/og.png` },
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/mark.svg" },
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]">
				{children}
				<Scripts />
			</body>
		</html>
	);
}
