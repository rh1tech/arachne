/**
 * "Is every prop really implemented?" — for each exported @arachne/ui
 * component, list its own declared props (excluding shared pass-through
 * props) and fail when the component body never reads one. A declared but
 * unread prop is an API promise the implementation doesn't keep. Also fail when
 * a prop is read but not claimed in `setup()`, which leaks it onto the DOM.
 *
 *   bun run scripts/check-ui-props.ts
 */
import { join } from "node:path";
import ts from "typescript";

const UI = join(import.meta.dir, "../packages/ui");
const SHARED_PROP_FILE = /packages\/ui\/src\/system\.ts$/;
/** Props consumed by `setup()` / DOM spread rather than read in the body. */
const HANDLED_BY_SYSTEM = new Set(["class", "style", "classes", "styles", "unstyled"]);

const config = ts.readConfigFile(join(UI, "tsconfig.json"), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, UI);
const program = ts.createProgram(parsed.fileNames, parsed.options);
const checker = program.getTypeChecker();
const index = program.getSourceFile(join(UI, "src/index.ts"));
const moduleSymbol = index && checker.getSymbolAtLocation(index);
if (!moduleSymbol) throw new Error("cannot load packages/ui/src/index.ts");

/** Every `x.name` / `x["name"]` read anywhere inside `node`. */
function readNames(node: ts.Node): Set<string> {
	const out = new Set<string>();
	const visit = (n: ts.Node) => {
		if (ts.isPropertyAccessExpression(n)) out.add(n.name.text);
		if (ts.isElementAccessExpression(n) && ts.isStringLiteral(n.argumentExpression)) {
			out.add(n.argumentExpression.text);
		}
		if (ts.isBindingElement(n)) out.add((n.propertyName ?? n.name).getText());
		ts.forEachChild(n, visit);
	};
	visit(node);
	return out;
}

/** Whole-props forwarding (`<X {...props} />`, `Comp(props, …)`) implements everything. */
function forwardsWholeProps(node: ts.Node, param: string): boolean {
	let found = false;
	const visit = (n: ts.Node) => {
		if (ts.isJsxSpreadAttribute(n) && n.expression.getText() === param) found = true;
		// Alias components: `Other({ ...input })` / `const { a, ...rest } = input; Other({ ...rest })`.
		if (
			ts.isSpreadAssignment(n) &&
			[param, "rest"].includes(n.expression.getText()) &&
			ts.isCallExpression(n.parent.parent)
		)
			found = true;
		// Passing the whole props object (raw param or `props` from setup) to a helper.
		if (
			ts.isCallExpression(n) &&
			n.arguments.some((a) => a.getText() === param || a.getText() === "props")
		) {
			const callee = n.expression.getText();
			if (!["setup", "withDefaults", "omitProps", "splitProps", "createSlots"].includes(callee))
				found = true;
		}
		ts.forEachChild(n, visit);
	};
	visit(node);
	return found;
}

/** String literals of an array argument (`["a", "b"]`, optionally `as const`). */
function stringList(arg: ts.Expression): string[] {
	const list = ts.isAsExpression(arg) ? arg.expression : arg;
	if (!ts.isArrayLiteralExpression(list)) return [];
	return list.elements.filter(ts.isStringLiteral).map((el) => el.text);
}

/** String keys listed in `setup(…, [keys])` / `omitProps(…, [keys])` / `splitProps(…, [keys])`. */
function claimedKeys(node: ts.Node): Set<string> {
	const out = new Set<string>();
	const visit = (n: ts.Node) => {
		if (ts.isCallExpression(n) && /^(setup|omitProps|splitProps)$/.test(n.expression.getText())) {
			for (const key of n.arguments.flatMap(stringList)) out.add(key);
		}
		ts.forEachChild(n, visit);
	};
	visit(node);
	return out;
}

/** Names read as `props.name` (the object returned by `setup`). */
function propsReads(node: ts.Node): Set<string> {
	const out = new Set<string>();
	const visit = (n: ts.Node) => {
		if (ts.isPropertyAccessExpression(n) && n.expression.getText() === "props")
			out.add(n.name.text);
		ts.forEachChild(n, visit);
	};
	visit(node);
	return out;
}

/** Whether the component splits its props with `setup(…)`. */
const usesSetup = (node: ts.Node): boolean =>
	ts.isCallExpression(node) && node.expression.getText() === "setup"
		? true
		: (ts.forEachChild(node, usesSetup) ?? false);

/** Whether the remainder (`rest`) is spread onto an element or component. */
function restSpread(node: ts.Node): boolean {
	let found = false;
	const visit = (n: ts.Node) => {
		if (ts.isJsxSpreadAttribute(n) && /^rest\b/.test(n.expression.getText())) found = true;
		if (
			ts.isJsxAttribute(n) &&
			n.name.getText() === "attrs" &&
			n.initializer?.getText().includes("rest")
		)
			found = true;
		ts.forEachChild(n, visit);
	};
	visit(node);
	return found;
}

const problems: string[] = [];
const leaks: string[] = [];
let checked = 0;
for (const exported of checker.getExportsOfModule(moduleSymbol)) {
	const symbol =
		exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
	const decl = symbol.valueDeclaration;
	if (!decl || !ts.isFunctionDeclaration(decl) || !decl.body || !/^[A-Z]/.test(symbol.getName()))
		continue;
	const param = decl.parameters[0];
	if (!param) continue;
	const type = checker.getTypeAtLocation(param);
	const own = type
		.getProperties()
		.filter(
			(p) =>
				!(p.getDeclarations() ?? []).every((d) =>
					SHARED_PROP_FILE.test(d.getSourceFile().fileName),
				),
		)
		.map((p) => p.getName())
		.filter((name) => !HANDLED_BY_SYSTEM.has(name));
	if (!own.length) continue;
	checked += 1;
	if (forwardsWholeProps(decl.body, param.name.getText())) continue;
	const read = readNames(decl.body);
	const claimed = claimedKeys(decl.body);
	const spreadsRest = restSpread(decl.body);
	// Claimed props must be read; unclaimed ones reach the DOM through `{...rest}`.
	const unread = own.filter((name) => !read.has(name) && (claimed.has(name) || !spreadsRest));
	if (unread.length) problems.push(`${symbol.getName()}: ${unread.join(", ")}`);
	// Read from `props` but not claimed: the value also reaches the DOM through `{...rest}`.
	if (spreadsRest && usesSetup(decl.body)) {
		const reads = propsReads(decl.body);
		const leaked = own.filter((name) => reads.has(name) && !claimed.has(name));
		if (leaked.length) leaks.push(`${symbol.getName()}: ${leaked.join(", ")}`);
	}
}

console.log(`checked ${checked} components`);
if (problems.length)
	console.error(`declared but never read (${problems.length}):\n  ${problems.join("\n  ")}`);
if (leaks.length)
	console.error(
		`read but not claimed in setup(), so also forwarded to the DOM (${leaks.length}):\n  ${leaks.join("\n  ")}`,
	);
if (problems.length || leaks.length) process.exit(1);
