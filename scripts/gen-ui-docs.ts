/**
 * Generate the UI component catalog (playground) and reference docs from the
 * shared examples (`packages/ui/examples`) and the component types.
 *
 *   bun run ui:docs          # write apps/playground/catalog.generated.ts + docs/ui/components/*.md
 *   bun run ui:docs --check  # fail if the generated files are out of date (CI)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ts from "typescript";
import {
	categories,
	type Family,
	isFamily,
	itemComponents,
	parts,
} from "../packages/ui/examples/catalog-map.ts";

const ROOT = join(import.meta.dir, "..");
const UI = join(ROOT, "packages/ui");
const CATALOG_OUT = join(ROOT, "apps/playground/catalog.generated.ts");
const DOCS_DIR = join(ROOT, "docs/ui/components");

type Prop = {
	name: string;
	type: string;
	required: boolean;
	description: string;
	/** `@deprecated` note, when the prop is deprecated. */
	deprecated?: string;
};
type Entry = {
	category: string;
	name: string;
	/** Set on sub-components documented on their parent's page. */
	parent?: string;
	/** Family id when the component shares a page with related components. */
	family?: string;
	parts: string[];
	summary: string;
	slots: string[];
	props: Prop[];
	code: string;
	interactive: boolean;
	/** The example reports callbacks through `action()` (shown in the event log). */
	logsActions: boolean;
};

/** Example sources (every file exporting `examples`). */
const EXAMPLE_FILES = [
	"core.tsx",
	"forms.tsx",
	"surfaces.tsx",
	"widgets.tsx",
	"data.tsx",
	"app.tsx",
	"ops.tsx",
];

/** Props shared by every component (documented once in the customization guide). */
const SHARED_PROP_FILE = /packages\/ui\/src\/system\.ts$/;

// ── TypeScript program over the package ────────────────────────────────────
const configPath = join(UI, "tsconfig.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, UI);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();

const indexFile = program.getSourceFile(join(UI, "src/index.ts"));
if (!indexFile) throw new Error("packages/ui/src/index.ts not in program");
const moduleSymbol = checker.getSymbolAtLocation(indexFile);
if (!moduleSymbol) throw new Error("no module symbol for index.ts");
const exportsByName = new Map(
	checker.getExportsOfModule(moduleSymbol).map((s) => [s.getName(), s] as const),
);

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

function componentSymbol(name: string): ts.Symbol | undefined {
	const exported = exportsByName.get(name);
	if (!exported) return undefined;
	return exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
}

/** JSDoc summary with the trailing `Slots:` / `State:` notes removed. */
function summaryOf(symbol: ts.Symbol): string {
	const doc = ts.displayPartsToString(symbol.getDocumentationComment(checker));
	return clean(doc.split(/\bSlots?:/)[0]?.split(/\bState:/)[0] ?? "");
}

function propsTypeOf(symbol: ts.Symbol): { type: ts.Type; decl: ts.Declaration } | undefined {
	const decl = symbol.valueDeclaration ?? symbol.declarations?.[0];
	if (!decl) return undefined;
	const signature = checker.getTypeOfSymbolAtLocation(symbol, decl).getCallSignatures()[0];
	const param = signature?.getParameters()[0];
	if (!param) return undefined;
	return { type: checker.getTypeOfSymbolAtLocation(param, decl), decl };
}

function slotsOf(propsType: ts.Type, decl: ts.Declaration): string[] {
	const classes = propsType.getProperty("classes");
	if (!classes) return [];
	const type = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(classes, decl));
	return type
		.getProperties()
		.map((p) => p.getName())
		.sort((a, b) => (a === "root" ? -1 : b === "root" ? 1 : a.localeCompare(b)));
}

function ownProps(propsType: ts.Type, decl: ts.Declaration): Prop[] {
	const props: Prop[] = [];
	for (const prop of propsType.getProperties()) {
		const declarations = prop.getDeclarations() ?? [];
		// Shared props are documented once; a component redeclaring one (e.g. `title`) owns it.
		if (declarations.every((d) => SHARED_PROP_FILE.test(d.getSourceFile().fileName))) continue;
		const type = checker.getTypeOfSymbolAtLocation(prop, decl);
		const deprecated = prop.getJsDocTags(checker).find((tag) => tag.name === "deprecated");
		props.push({
			name: prop.getName(),
			type: typeText(type),
			required: (prop.flags & ts.SymbolFlags.Optional) === 0,
			description: clean(ts.displayPartsToString(prop.getDocumentationComment(checker))),
			...(deprecated
				? { deprecated: clean(ts.displayPartsToString(deprecated.text)) || "Deprecated." }
				: {}),
		});
	}
	// Required first, deprecated last, then by name.
	return props.sort(
		(a, b) =>
			Number(b.required) - Number(a.required) ||
			Number(!!a.deprecated) - Number(!!b.deprecated) ||
			a.name.localeCompare(b.name),
	);
}

/** Readable type text: `unknown` content props read as "content", no `| undefined`. */
function typeText(type: ts.Type): string {
	if (type.flags & ts.TypeFlags.Unknown || type.flags & ts.TypeFlags.Any) return "content";
	const text = checker.typeToString(
		checker.getNonNullableType(type),
		undefined,
		ts.TypeFormatFlags.NoTruncation,
	);
	return clean(text.replace(/\s*\|\s*undefined/g, "")) || "content";
}

// ── Example snippets from source ──────────────────────────────────────────
function dedent(text: string): string {
	const lines = text.replace(/^\n+|\s+$/g, "").split("\n");
	const indent = Math.min(
		...lines.filter((l) => l.trim()).map((l) => l.match(/^[\t ]*/)?.[0].length ?? 0),
	);
	return lines.map((l) => l.slice(indent)).join("\n");
}

/** Local function declarations in a file, by name (helpers and demo components). */
function localFunctions(sf: ts.SourceFile): Map<string, string> {
	const out = new Map<string, string>();
	for (const stmt of sf.statements) {
		if (ts.isFunctionDeclaration(stmt) && stmt.name)
			out.set(stmt.name.text, dedent(stmt.getText(sf)));
	}
	return out;
}

/** Top-level `const` data in a file (e.g. `const plans = [...]`), by name. */
function localConsts(sf: ts.SourceFile): Map<string, string> {
	const out = new Map<string, string>();
	for (const stmt of sf.statements) {
		if (!ts.isVariableStatement(stmt)) continue;
		for (const decl of stmt.declarationList.declarations) {
			if (ts.isIdentifier(decl.name) && decl.name.text !== "examples")
				out.set(decl.name.text, dedent(stmt.getText(sf)).replace(/^export\s+/, ""));
		}
	}
	return out;
}

/** Prepend the module-level constants a snippet uses, so it runs when copied. */
function withConsts(code: string, consts: Map<string, string>): string {
	const used = [...consts].filter(
		([name]) =>
			new RegExp(`\\b${name}\\b`).test(code) &&
			!new RegExp(`\\b(const|let|function)\\s+${name}\\b`).test(code),
	);
	return used.length
		? `${used.map(([, text]) => withImagePaths(text)).join("\n")}\n\n${code}`
		: code;
}

/** Strip test plumbing (`p` probe param and spreads) from a helper's source. */
function asExample(source: string, name: string, rename = true): string {
	const cleaned = withImagePaths(source)
		.replace(/\(p: [^)]*\)/, "()")
		.replace(/\s*\{\.\.\.p\}/g, "");
	return rename ? cleaned.replace(`function ${name}`, "function Example") : cleaned;
}

/** Local helpers referenced as JSX tags, so snippets never show undefined names. */
function referencedHelpers(code: string, helpers: Map<string, string>): string[] {
	return [...helpers.keys()].filter((name) => new RegExp(`<${name}[\\s/>]`).test(code));
}

/** `{ name, render }` example object → `[name, render body]`, if it is one. */
function exampleCase(node: ts.Node, sf: ts.SourceFile): [string, ts.Node] | undefined {
	if (!ts.isObjectLiteralExpression(node)) return undefined;
	const get = (key: string) =>
		node.properties.find(
			(p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText(sf) === key,
		)?.initializer;
	const name = get("name");
	const render = get("render");
	if (!name || !ts.isStringLiteral(name) || !render || !ts.isArrowFunction(render))
		return undefined;
	let body: ts.Node = render.body;
	while (ts.isParenthesizedExpression(body)) body = body.expression;
	return [name.text, body];
}

/** `swatch(hue, "Label", …)` placeholder images read as plain image paths in docs. */
const withImagePaths = (code: string) => {
	const path = (label: string) =>
		`"/images/${label.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "background"}.jpg"`;
	const call = /swatch\(\s*\d+,\s*"([^"]*)"[^)]*\)/;
	return code
		.replace(/\{noop\}/g, "{() => {}}")
		.replace(/\baction\("[^"]*"\)/g, "() => {}")
		.replace(/: noop\b/g, ": () => {}")
		.replace(new RegExp(`=\\{${call.source}\\}`, "g"), (_, label: string) => `=${path(label)}`)
		.replace(new RegExp(call.source, "g"), (_, label: string) => path(label));
};

/** Node source with its first line re-indented to its column, so `dedent` sees real indents. */
function nodeText(node: ts.Node, sf: ts.SourceFile): string {
	const start = node.getStart(sf);
	const lineStart = sf.getLineStarts()[sf.getLineAndCharacterOfPosition(start).line] ?? start;
	const lead = sf.text.slice(lineStart, start).replace(/\S/g, " ");
	return lead + node.getText(sf);
}

/** Snippet text for an example body, inlining local helper components it uses. */
function snippetText(body: ts.Node, sf: ts.SourceFile, helpers: Map<string, string>): string {
	const jsx = dedent(withImagePaths(nodeText(body, sf)).replace(/\s*\{\.\.\.p\}/g, ""));
	const used = referencedHelpers(jsx, helpers);
	// A single helper-component example reads best as that component's source.
	if (used.length === 1 && /^<\w+\s*\/>$/.test(jsx)) {
		return asExample(helpers.get(used[0] as string) as string, used[0] as string);
	}
	if (!used.length) return jsx;
	return `${used.map((h) => asExample(helpers.get(h) as string, h, false)).join("\n\n")}\n\n${jsx}`;
}

/** Examples whose source calls `action()`, filled by {@link snippetsFor}. */
const actionExamples = new Set<string>();

function snippetsFor(file: string): Map<string, string> {
	const path = join(UI, "examples", file);
	const sf = ts.createSourceFile(
		path,
		readFileSync(path, "utf8"),
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const helpers = localFunctions(sf);
	const consts = localConsts(sf);
	const out = new Map<string, string>();
	const visit = (node: ts.Node) => {
		const found = exampleCase(node, sf);
		if (found) {
			out.set(found[0], withConsts(snippetText(found[1], sf, helpers), consts));
			const raw = nodeText(found[1], sf);
			const sources = [raw, ...referencedHelpers(raw, helpers).map((h) => helpers.get(h) ?? "")];
			if (sources.some((text) => /\baction\(/.test(text))) actionExamples.add(found[0]);
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
	return out;
}

/** Demo component sources keyed by component name (`demos` record in demos.tsx). */
function demoSources(): Map<string, string> {
	const path = join(UI, "examples/demos.tsx");
	const sf = ts.createSourceFile(
		path,
		readFileSync(path, "utf8"),
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const helpers = localFunctions(sf);
	const out = new Map<string, string>();
	const visit = (node: ts.Node) => {
		if (ts.isPropertyAssignment(node) && ts.isArrowFunction(node.initializer)) {
			const demoName = node.initializer.body.getText(sf).match(/<(\w+Demo)\s*\/>/)?.[1];
			const source = demoName ? helpers.get(demoName) : undefined;
			if (source)
				out.set(
					node.name.getText(sf),
					withImagePaths(source).replace(`function ${demoName}`, "function Example"),
				);
		}
		ts.forEachChild(node, visit);
	};
	visit(sf);
	return out;
}

// ── Build entries ─────────────────────────────────────────────────────────
const demos = demoSources();
const snippets = new Map(EXAMPLE_FILES.flatMap((file) => [...snippetsFor(file)]));

// Every example is listed exactly once: in a category, or as a part of its parent.
type Placement = { category: string; parent?: string; family?: string };
const placement = new Map<string, Placement>();
const problems: string[] = [];
const place = (name: string, where: Placement) => {
	if (placement.has(name)) problems.push(`${name} is listed twice in catalog-map.ts`);
	if (!snippets.has(name)) problems.push(`${name} is in catalog-map.ts but has no example`);
	placement.set(name, where);
};
const familyIds = new Set<string>();
for (const category of categories) {
	for (const item of category.components) {
		const family = isFamily(item) ? item.family : undefined;
		if (family && familyIds.has(family)) problems.push(`family id ${family} is used twice`);
		if (family) familyIds.add(family);
		for (const name of itemComponents(item)) {
			place(name, { category: category.id, ...(family ? { family } : {}) });
			for (const part of parts[name] ?? []) place(part, { category: category.id, parent: name });
		}
	}
}
for (const parent of Object.keys(parts)) {
	if (!placement.has(parent)) problems.push(`parts parent ${parent} is not in any category`);
}
for (const name of snippets.keys()) {
	if (!placement.has(name)) problems.push(`${name} has an example but no place in catalog-map.ts`);
}

const entries: Entry[] = [];
for (const category of categories) {
	for (const name of category.components.flatMap(itemComponents)) {
		for (const member of [name, ...(parts[name] ?? [])]) {
			const symbol = componentSymbol(member);
			const typed = symbol ? propsTypeOf(symbol) : undefined;
			if (!symbol || !typed) {
				problems.push(`${member} is not an exported component`);
				continue;
			}
			const { parent, family } = placement.get(member) ?? {};
			entries.push({
				category: category.id,
				name: member,
				...(parent ? { parent } : {}),
				...(family ? { family } : {}),
				parts: member === name ? (parts[name] ?? []) : [],
				summary: summaryOf(symbol),
				slots: slotsOf(typed.type, typed.decl),
				props: ownProps(typed.type, typed.decl),
				code: demos.get(member) ?? snippets.get(member) ?? "",
				interactive: demos.has(member),
				logsActions: !demos.has(member) && actionExamples.has(member),
			});
		}
	}
}
if (problems.length) throw new Error(`component catalog:\n  ${problems.join("\n  ")}`);

// ── Emit ──────────────────────────────────────────────────────────────────
const catalogSource = `// Generated by scripts/gen-ui-docs.ts from packages/ui/examples — do not edit.
// Regenerate with \`bun run ui:docs\`.

export type CatalogProp = {
	name: string;
	type: string;
	required: boolean;
	description: string;
	deprecated?: string;
};

export type CatalogEntry = {
	/** Category id from packages/ui/examples/catalog-map.ts. */
	category: string;
	name: string;
	/** Set on sub-components documented on their parent's page. */
	parent?: string;
	/** Family id when the component shares a page with related components. */
	family?: string;
	parts: string[];
	summary: string;
	slots: string[];
	props: CatalogProp[];
	code: string;
	/** Rendered through an interactive demo (overlays open on demand). */
	interactive: boolean;
	/** The example reports callbacks through \`action()\` (shown in the event log). */
	logsActions: boolean;
};

export const catalog: CatalogEntry[] = ${JSON.stringify(entries, null, "\t")};
`;

const escapeCell = (text: string) => text.replace(/\|/g, "\\|").replace(/</g, "&lt;");

function componentMarkdown(e: Entry, level = 2): string {
	const hashes = "#".repeat(level);
	const lines = [`${hashes} ${e.name}`, "", e.summary || "_No description._", ""];
	// Reference first (props, slots), then the example.
	if (e.slots.length) lines.push(`**Slots:** ${e.slots.map((s) => `\`${s}\``).join(" ")}`, "");
	if (e.props.length) {
		lines.push("| Prop | Type | Required | Description |", "| --- | --- | --- | --- |");
		for (const p of e.props) {
			lines.push(
				`| \`${p.name}\` | \`${escapeCell(p.type)}\` | ${p.required ? "yes" : ""} | ${escapeCell(p.deprecated ? `**Deprecated:** ${p.deprecated} ${p.description}`.trim() : p.description)} |`,
			);
		}
		lines.push("");
	}
	lines.push("```tsx", e.code, "```", "");
	if (level === 2) lines.push(SHARED_PROPS_NOTE, "");
	return lines.join("\n");
}

const byName = new Map(entries.map((e) => [e.name, e] as const));

const docs = new Map<string, string>();
const index = [
	"<!-- Generated by scripts/gen-ui-docs.ts — do not edit. -->",
	"# Component reference",
	"",
	`${entries.length} components, generated from their types and the shared examples in \`packages/ui/examples\`.`,
	"Guides: [getting started](../getting-started.md) · [customization](../customization.md) · [theming](../theming.md) · [accessibility](../accessibility.md) · [SSR & hydration](../ssr.md).",
	"",
];
const SHARED_PROPS_NOTE =
	"Also accepts the [shared props](../customization.md#shared-props): pass-through attributes, `class`, `style`, `classes`, `styles`, `unstyled`.";

/** A component with its parts, headed at `level`. */
function componentSection(name: string, level: number): string {
	const main = byName.get(name) as Entry;
	const partDocs = main.parts.map((part) =>
		componentMarkdown(byName.get(part) as Entry, level + 1),
	);
	return [
		componentMarkdown(main, level),
		...(partDocs.length ? ["**Parts**", "", ...partDocs] : []),
	].join("\n");
}

function familySection(family: Family): string {
	return [
		`## ${family.title}`,
		"",
		family.description,
		"",
		...family.components.map((name) => componentSection(name, 3)),
		SHARED_PROPS_NOTE,
		"",
	].join("\n");
}

const itemAnchor = (item: string | Family) =>
	(isFamily(item) ? item.title : item)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

for (const category of categories) {
	const file = `${category.id}.md`;
	index.push(
		`## [${category.label}](${file})`,
		"",
		category.description,
		"",
		category.components
			.map((item) =>
				isFamily(item)
					? `[${item.title}](${file}#${itemAnchor(item)}) (${item.components.join(", ")})`
					: `[${item}](${file}#${itemAnchor(item)})`,
			)
			.join(" · "),
		"",
	);
	const sections = category.components.map((item) =>
		isFamily(item) ? familySection(item) : componentSection(item, 2),
	);
	docs.set(
		file,
		[
			"<!-- Generated by scripts/gen-ui-docs.ts — do not edit. -->",
			`# ${category.label}`,
			"",
			category.description,
			"",
			"[← Component reference](README.md)",
			"",
			...sections,
		].join("\n"),
	);
}
docs.set("README.md", index.join("\n"));

const outputs = new Map<string, string>([[CATALOG_OUT, catalogSource]]);
for (const [file, text] of docs) outputs.set(join(DOCS_DIR, file), text);

const check = process.argv.includes("--check");
const stale: string[] = [];
for (const [path, text] of outputs) {
	const current = existsSync(path) ? readFileSync(path, "utf8") : "";
	if (current === text) continue;
	if (check) stale.push(path.replace(`${ROOT}/`, ""));
	else {
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, text);
	}
}
// Generated pages that no longer exist (e.g. a renamed category).
for (const file of existsSync(DOCS_DIR) ? readdirSync(DOCS_DIR) : []) {
	const path = join(DOCS_DIR, file);
	if (!file.endsWith(".md") || outputs.has(path)) continue;
	if (check) stale.push(path.replace(`${ROOT}/`, ""));
	else rmSync(path);
}
if (check && stale.length) {
	console.error(`UI docs are out of date (run \`bun run ui:docs\`):\n  ${stale.join("\n  ")}`);
	process.exit(1);
}
console.log(`${check ? "checked" : "wrote"} ${outputs.size} files · ${entries.length} components`);
