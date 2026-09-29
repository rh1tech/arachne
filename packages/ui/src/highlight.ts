/**
 * Lightweight TSX/JS syntax highlighter (no dependencies).
 * Returns HTML — escape first, then wrap tokens in spans.
 */

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

const KEYWORDS = new Set([
	"await",
	"break",
	"case",
	"catch",
	"class",
	"const",
	"continue",
	"debugger",
	"default",
	"delete",
	"do",
	"else",
	"enum",
	"export",
	"extends",
	"false",
	"finally",
	"for",
	"function",
	"if",
	"import",
	"in",
	"instanceof",
	"let",
	"new",
	"null",
	"return",
	"static",
	"super",
	"switch",
	"this",
	"throw",
	"true",
	"try",
	"typeof",
	"undefined",
	"var",
	"void",
	"while",
	"with",
	"yield",
	"type",
	"interface",
	"as",
	"from",
	"of",
	"satisfies",
	"implements",
	"readonly",
	"infer",
	"keyof",
	"unique",
	"declare",
	"namespace",
	"module",
	"abstract",
	"private",
	"protected",
	"public",
	"override",
]);

type Tok = { type: string; value: string };

type Scan = { tokens: Tok[]; end: number } | null;
type Scanner = (code: string, i: number) => Scan;

const PUNCT = /[{}()[\];:,.=<>!&|?+*%-]/;

function scanWhile(code: string, j: number, re: RegExp): number {
	let k = j;
	while (k < code.length && re.test(code.charAt(k))) k += 1;
	return k;
}

const token = (type: string, code: string, from: number, to: number): Scan => ({
	tokens: [{ type, value: code.slice(from, to) }],
	end: to,
});

const lineComment: Scanner = (code, i) => {
	if (code[i] !== "/" || code[i + 1] !== "/") return null;
	let j = i + 2;
	while (j < code.length && code[j] !== "\n") j += 1;
	return token("comment", code, i, j);
};

const blockComment: Scanner = (code, i) => {
	if (code[i] !== "/" || code[i + 1] !== "*") return null;
	let j = i + 2;
	while (j < code.length && !(code[j] === "*" && code[j + 1] === "/")) j += 1;
	return token("comment", code, i, Math.min(code.length, j + 2));
};

const stringLiteral: Scanner = (code, i) => {
	const quote = code.charAt(i);
	if (quote !== "'" && quote !== '"' && quote !== "`") return null;
	let j = i + 1;
	while (j < code.length) {
		if (code[j] === "\\") {
			j += 2;
			continue;
		}
		j += 1;
		if (code[j - 1] === quote) break;
	}
	return token("string", code, i, j);
};

/** `<Ident`, `</Ident`, `<!…`: punctuation then tag name. */
const jsxTag: Scanner = (code, i) => {
	if (code[i] !== "<" || i + 1 >= code.length) return null;
	const next = code.charAt(i + 1);
	if (!/[A-Za-z_/!]/.test(next)) return null;
	const startName = next === "/" || next === "!" ? i + 2 : i + 1;
	const j = scanWhile(code, startName, /[A-Za-z0-9._-]/);
	if (!(j > startName || next === "/" || next === ">")) return null;
	const tokens: Tok[] = [{ type: "punct", value: code.slice(i, startName) }];
	if (j > startName) tokens.push({ type: "tag", value: code.slice(startName, j) });
	return { tokens, end: j };
};

const closeAngle: Scanner = (code, i) => {
	if (code[i] === "/" && code[i + 1] === ">") return token("punct", code, i, i + 2);
	return code[i] === ">" ? token("punct", code, i, i + 1) : null;
};

const numberLiteral: Scanner = (code, i) => {
	const ch = code.charAt(i);
	const starts = /[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(code.charAt(i + 1)));
	return starts ? token("number", code, i, scanWhile(code, i, /[0-9.xXa-fA-FeEn_]/)) : null;
};

const identifier: Scanner = (code, i) => {
	if (!/[A-Za-z_$]/.test(code.charAt(i))) return null;
	const j = scanWhile(code, i + 1, /[A-Za-z0-9_$]/);
	const word = code.slice(i, j);
	const type = KEYWORDS.has(word) ? "keyword" : /^[A-Z]./.test(word) ? "tag" : "plain";
	return token(type, code, i, j);
};

const punctuation: Scanner = (code, i) =>
	PUNCT.test(code.charAt(i)) ? token("punct", code, i, i + 1) : null;

const whitespace: Scanner = (code, i) =>
	/\s/.test(code.charAt(i)) ? token("plain", code, i, scanWhile(code, i, /\s/)) : null;

/** Tried in order at each position; the first match wins. */
const SCANNERS: Scanner[] = [
	lineComment,
	blockComment,
	stringLiteral,
	jsxTag,
	closeAngle,
	numberLiteral,
	identifier,
	punctuation,
	whitespace,
];

function tokenize(code: string): Tok[] {
	const out: Tok[] = [];
	const push = ({ type, value }: Tok) => {
		if (!value) return;
		const last = out[out.length - 1];
		if (last && last.type === type && type === "plain") last.value += value;
		else out.push({ type, value });
	};
	let i = 0;
	while (i < code.length) {
		let scan: Scan = null;
		for (const scanner of SCANNERS) {
			scan = scanner(code, i);
			if (scan) break;
		}
		const result = scan ?? token("plain", code, i, i + 1);
		for (const t of result?.tokens ?? []) push(t);
		i = result?.end ?? i + 1;
	}
	return out;
}

/** Highlight TS/TSX/JS source as safe HTML. */
export function highlightCode(code: string, language = "tsx"): string {
	const lang = language.toLowerCase();
	if (
		lang !== "tsx" &&
		lang !== "ts" &&
		lang !== "jsx" &&
		lang !== "js" &&
		lang !== "javascript" &&
		lang !== "typescript"
	) {
		return escapeHtml(code);
	}
	return tokenize(code)
		.map((t) => {
			if (t.type === "plain") return escapeHtml(t.value);
			return `<span class="a-tok a-tok-${t.type}">${escapeHtml(t.value)}</span>`;
		})
		.join("");
}
