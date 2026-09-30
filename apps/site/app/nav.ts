/**
 * The documentation map: which repository file becomes which page, and how
 * the sidebar groups them. Shared by the build (to read sources) and the
 * browser (to draw the sidebar), so it holds plain data only.
 */

/** One documentation page. */
export interface DocEntry {
	/** Sidebar and `<title>` label. */
	title: string;
	/** Site path, e.g. `/docs/packages/kit`. */
	path: string;
	/** Markdown source, relative to the repository root. */
	source: string;
	/** Rendered in monospace in the sidebar (package names). */
	code?: boolean;
}

/** A titled group of pages in the sidebar. */
export interface DocSection {
	/** Group heading. */
	title: string;
	/** Pages, in reading order. */
	entries: DocEntry[];
	/** Start folded (long lists such as the component reference). */
	collapsed?: boolean;
}

const pkg = (name: string): DocEntry => ({
	title: name,
	path: `/docs/packages/${name}`,
	source: `packages/${name}/README.md`,
	code: true,
});

const uiGuide = (file: string, title: string): DocEntry => ({
	title,
	path: `/docs/ui/${file}`,
	source: `docs/ui/${file}.md`,
});

const COMPONENT_FAMILIES = [
	["actions", "Actions"],
	["charts", "Charts"],
	["commerce", "Commerce"],
	["data", "Data"],
	["developer", "Developer"],
	["docs", "Docs"],
	["feedback", "Feedback"],
	["files", "Files"],
	["forms", "Forms"],
	["layout", "Layout"],
	["media", "Media"],
	["navigation", "Navigation"],
	["overlays", "Overlays"],
	["people", "People"],
	["pickers", "Pickers"],
	["progress", "Progress"],
	["selection", "Selection"],
	["status", "Status"],
	["surfaces", "Surfaces"],
	["text-input", "Text input"],
	["typography", "Typography"],
] as const;

const ADRS = [
	["0001-monorepo-tooling", "0001 Monorepo tooling"],
	["0002-dual-license", "0002 Dual license"],
	["0003-core-kernel", "0003 Core kernel"],
	["0004-config-loader", "0004 Config loader"],
	["0005-testing-harness", "0005 Testing harness"],
	["0006-jsx-compiled-output", "0006 JSX and signals"],
	["0007-mcp-everywhere", "0007 MCP everywhere"],
	["0008-schema-dsl", "0008 Schema DSL"],
	["0009-router", "0009 Router"],
	["0010-server", "0010 Server"],
	["0011-vite-jsx-plugins", "0011 Vite JSX plugins"],
	["0012-db-dialects", "0012 DB dialects"],
	["0013-ui-forms", "0013 UI and forms"],
	["0014-ui-customization", "0014 UI customization"],
	["0015-universal-framework", "0015 Universal framework"],
] as const;

/** Every sidebar section, in order. */
export const SECTIONS: DocSection[] = [
	{
		title: "Start here",
		entries: [
			{ title: "Getting started", path: "/docs", source: "docs/getting-started.md" },
			{ title: "Framework guide", path: "/docs/guide", source: "docs/framework/README.md" },
			{ title: "Progress log", path: "/docs/progress", source: "docs/framework/PROGRESS.md" },
		],
	},
	{
		title: "Pages",
		entries: ["kit", "router", "render", "signals", "jsx", "vite"].map(pkg),
	},
	{
		title: "Server and data",
		entries: [
			"server",
			"schema",
			"db",
			"db-sqlite",
			"migrate",
			"auth",
			"acl",
			"mailer",
			"storage",
		].map(pkg),
	},
	{
		title: "UI",
		entries: [
			pkg("ui"),
			pkg("forms"),
			{ title: "UI guides", path: "/docs/ui", source: "docs/ui/README.md" },
			uiGuide("getting-started", "Setup"),
			uiGuide("customization", "Customization"),
			uiGuide("theming", "Theming"),
			uiGuide("accessibility", "Accessibility"),
			uiGuide("ssr", "Server rendering"),
		],
	},
	{
		title: "UI components",
		collapsed: true,
		entries: [
			{
				title: "All families",
				path: "/docs/ui/components",
				source: "docs/ui/components/README.md",
			},
			...COMPONENT_FAMILIES.map(([file, title]) => ({
				title,
				path: `/docs/ui/components/${file}`,
				source: `docs/ui/components/${file}.md`,
			})),
		],
	},
	{
		title: "Foundation",
		entries: ["core", "config", "mcp", "testing"].map(pkg),
	},
	{
		title: "Decisions",
		collapsed: true,
		entries: ADRS.map(([file, title]) => ({
			title,
			path: `/docs/adr/${file}`,
			source: `docs/adr/${file}.md`,
		})),
	},
];

/** Every page, flattened in sidebar order. */
export const ENTRIES: DocEntry[] = SECTIONS.flatMap((section) => section.entries);

/** The page at `path` (trailing slash ignored), if any. */
export function findEntry(path: string): DocEntry | undefined {
	const normalised = path.length > 1 ? path.replace(/\/+$/, "") : path;
	return ENTRIES.find((entry) => entry.path === normalised);
}

/** The section that contains `path`, if any. */
export function findSection(path: string): DocSection | undefined {
	const entry = findEntry(path);
	return entry && SECTIONS.find((section) => section.entries.includes(entry));
}
