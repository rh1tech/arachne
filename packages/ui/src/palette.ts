/**
 * Palette tokens map onto CSS custom properties (`--a-*`).
 * Override on `:root` or any subtree for scoped theming.
 *
 * Presets ship as named theme packs mapped onto UI token roles.
 */

export type PaletteTokens = {
	ink: string;
	paper: string;
	canvas: string;
	muted: string;
	accent: string;
	accentInk: string;
	/** Soft wash behind accents; defaults to a mix of accent + paper when omitted. */
	accentSoft?: string | undefined;
	danger: string;
	success: string;
	warning: string;
	info: string;
	line: string;
	surface?: string | undefined;
	/** Corner radius: `none` | `sm` | `lg`, or any CSS length. Default `sm`. */
	radius?: string | undefined;
};

export type PaletteInput = Partial<PaletteTokens> & {
	/** When set, fills missing soft accent from this hex. */
	accentSoft?: string | undefined;
};

/** Corner radius scale — `sm` is the kit default. */
export type RadiusName = "none" | "sm" | "lg";

export const radii: Record<RadiusName, string> = {
	none: "0px",
	sm: "0.5rem",
	lg: "1rem",
};

export function resolveRadius(value?: RadiusName | string | undefined): string {
	if (!value) return radii.sm;
	if (value === "none" || value === "sm" || value === "lg") return radii[value];
	return value;
}

/** CSS variable names written by {@link applyPalette} / {@link paletteStyle}. */
export const paletteVarNames = {
	ink: "--a-ink",
	paper: "--a-paper",
	canvas: "--a-canvas",
	muted: "--a-muted",
	accent: "--a-accent",
	accentInk: "--a-accent-ink",
	accentSoft: "--a-accent-soft",
	danger: "--a-danger",
	success: "--a-success",
	warning: "--a-warning",
	info: "--a-info",
	line: "--a-line",
	surface: "--a-surface",
	radius: "--a-radius",
} as const;

/**
 * Default kit palette — Graphite
 * Brand stops: `#FFFFFF #E5E5E5 #FCA311 #14213D`
 * Semantic accents lean toward Tailwind emerald / amber / rose (less shouty than Material greens/reds).
 */
export const defaultPalette: PaletteTokens = {
	ink: "#0f172a",
	paper: "#ffffff",
	canvas: "#e5e5e5",
	muted: "#56627a",
	accent: "#14213d",
	accentInk: "#ffffff",
	accentSoft: "#e8ebf0",
	danger: "#e11d48",
	success: "#047857",
	warning: "#f59e0b",
	info: "#14213d",
	line: "#e2e8f0",
	surface: "#ffffff",
	radius: "sm",
};

/**
 * Named presets. Apply with `applyPalette(palettes.lagoon)` or `applyPalette("meadow")`.
 */
export const palettes = {
	/** Near-monochrome graphite — kit default. */
	graphite: defaultPalette,

	/** `#0D47A1 #2196F3 #90CAF9 #E3F2FD` */
	sky: {
		ink: "#0d47a1",
		paper: "#ffffff",
		canvas: "#e3f2fd",
		muted: "#5b7ea8",
		accent: "#2196f3",
		accentInk: "#ffffff",
		accentSoft: "#90caf9",
		danger: "#e53935",
		success: "#2e7d32",
		warning: "#fbc02d",
		info: "#0288d1",
		line: "#bbdefb",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#1B5E20 #66BB6A #A5D6A7 #E8F5E9` */
	meadow: {
		ink: "#14301a",
		paper: "#ffffff",
		canvas: "#e8f5e9",
		muted: "#5a7260",
		accent: "#2e7d32",
		accentInk: "#ffffff",
		accentSoft: "#a5d6a7",
		danger: "#c62828",
		success: "#1b5e20",
		warning: "#f9a825",
		info: "#66bb6a",
		line: "#c8e0c9",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#C8A96B #F7F4ED #C7D3C0 #8FA28A` */
	sage: {
		ink: "#3f4a3d",
		paper: "#fffcf7",
		canvas: "#f7f4ed",
		muted: "#7a8474",
		accent: "#8fa28a",
		accentInk: "#ffffff",
		accentSoft: "#c7d3c0",
		danger: "#b33a3a",
		success: "#5f7d52",
		warning: "#c8a96b",
		info: "#6d8a7a",
		line: "#e0dbd0",
		surface: "#fffcf7",
	} satisfies PaletteTokens,

	/** `#FFDD9C #F9B637 #FB6C00 #E73F1E` */
	citrus: {
		ink: "#3a1c0a",
		paper: "#fffdf8",
		canvas: "#ffdd9c",
		muted: "#8a6238",
		accent: "#fb6c00",
		accentInk: "#ffffff",
		accentSoft: "#f9b637",
		danger: "#e73f1e",
		success: "#2e7d32",
		warning: "#f9b637",
		info: "#0277bd",
		line: "#f0c87a",
		surface: "#fffdf8",
	} satisfies PaletteTokens,

	/** `#F6D8BD #F39399 #CF4173 #5D3140` */
	blush: {
		ink: "#5d3140",
		paper: "#fffaf6",
		canvas: "#f6d8bd",
		muted: "#8f6a72",
		accent: "#cf4173",
		accentInk: "#ffffff",
		accentSoft: "#f39399",
		danger: "#b71c1c",
		success: "#2e7d32",
		warning: "#f9a825",
		info: "#7b4b6a",
		line: "#e8c9b4",
		surface: "#fffaf6",
	} satisfies PaletteTokens,

	/** `#C4F7CA #D8FFC5 #92EEFF #30AFFF` */
	aqua: {
		ink: "#0b3d5c",
		paper: "#ffffff",
		canvas: "#eefcf0",
		muted: "#5a7f88",
		accent: "#30afff",
		accentInk: "#062033",
		accentSoft: "#92eeff",
		danger: "#e53935",
		success: "#43a047",
		warning: "#fbc02d",
		info: "#0288d1",
		line: "#c4f7ca",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#98E8DE #45A9A9 #3E3E75 #4E1F6E` */
	twilight: {
		ink: "#2a1840",
		paper: "#ffffff",
		canvas: "#eef8f6",
		muted: "#6a6a8a",
		accent: "#3e3e75",
		accentInk: "#ffffff",
		accentSoft: "#98e8de",
		danger: "#c62828",
		success: "#45a9a9",
		warning: "#f9a825",
		info: "#4e1f6e",
		line: "#cfe8e3",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#EC5B38 #FCF2E5 #A8A492 #524646` */
	clay: {
		ink: "#524646",
		paper: "#fffdf9",
		canvas: "#fcf2e5",
		muted: "#8a8078",
		accent: "#ec5b38",
		accentInk: "#ffffff",
		accentSoft: "#f3c4b4",
		danger: "#c1121f",
		success: "#2a9d8f",
		warning: "#e9c46a",
		info: "#a8a492",
		line: "#e6d9c8",
		surface: "#fffdf9",
	} satisfies PaletteTokens,

	/** `#FDF0D5 #E76F51 #E9C46A #249D8F` */
	ember: {
		ink: "#3d2c29",
		paper: "#fffdf8",
		canvas: "#fdf0d5",
		muted: "#8a7268",
		accent: "#e76f51",
		accentInk: "#ffffff",
		accentSoft: "#f4c7b8",
		danger: "#c1121f",
		success: "#249d8f",
		warning: "#e9c46a",
		info: "#457b9d",
		line: "#ead9c0",
		surface: "#fffdf8",
	} satisfies PaletteTokens,

	/** `#5E3122 #F9D2BA #F7EAE0 #1D4533` */
	forest: {
		ink: "#1d4533",
		paper: "#fffaf6",
		canvas: "#f7eae0",
		muted: "#6e655c",
		accent: "#1d4533",
		accentInk: "#ffffff",
		accentSoft: "#f9d2ba",
		danger: "#8b2626",
		success: "#2c5745",
		warning: "#e98b50",
		info: "#5e3122",
		line: "#e5d5c6",
		surface: "#fffaf6",
	} satisfies PaletteTokens,

	/** `#B2054C #D10056 #FFB900 #007DCC` */
	festiva: {
		ink: "#3a0620",
		paper: "#ffffff",
		canvas: "#fff7fb",
		muted: "#8a5a70",
		accent: "#d10056",
		accentInk: "#ffffff",
		accentSoft: "#f7b0cb",
		danger: "#b2054c",
		success: "#2e7d32",
		warning: "#ffb900",
		info: "#007dcc",
		line: "#efd6e2",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#CC3A63 #A2AB73 #F9F0E0 #FFF7EB` */
	olive: {
		ink: "#3a3f2c",
		paper: "#fff7eb",
		canvas: "#f9f0e0",
		muted: "#7a7f68",
		accent: "#a2ab73",
		accentInk: "#1f2414",
		accentSoft: "#d5d9b0",
		danger: "#cc3a63",
		success: "#6b7a3a",
		warning: "#e9c46a",
		info: "#5c6b8a",
		line: "#e6dcc8",
		surface: "#fff7eb",
	} satisfies PaletteTokens,

	/** `#457B9D #F4D35E #E63946 #8B1E2D` */
	marina: {
		ink: "#1d3557",
		paper: "#ffffff",
		canvas: "#f1faee",
		muted: "#6a7f90",
		accent: "#457b9d",
		accentInk: "#ffffff",
		accentSoft: "#a8dadc",
		danger: "#e63946",
		success: "#2a9d8f",
		warning: "#f4d35e",
		info: "#457b9d",
		line: "#cfe0e6",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#7EC151 #B2D959 #FFF449 #FED24F` */
	lime: {
		ink: "#243510",
		paper: "#ffffff",
		canvas: "#f7ffe8",
		muted: "#6e7a48",
		accent: "#7ec151",
		accentInk: "#1a2408",
		accentSoft: "#b2d959",
		danger: "#c62828",
		success: "#558b2f",
		warning: "#fed24f",
		info: "#0288d1",
		line: "#dce8b8",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#BC4F4F #E98B50 #F3CD97 #FEF2A0` */
	apricot: {
		ink: "#4a2424",
		paper: "#fffef6",
		canvas: "#fef2a0",
		muted: "#8a6a4a",
		accent: "#bc4f4f",
		accentInk: "#ffffff",
		accentSoft: "#f3cd97",
		danger: "#8b2626",
		success: "#558b2f",
		warning: "#e98b50",
		info: "#457b9d",
		line: "#ead9a0",
		surface: "#fffef6",
	} satisfies PaletteTokens,

	/** `#97DDE9 #5FACD3 #525EA7 #FFC349` */
	daybreak: {
		ink: "#2a3160",
		paper: "#ffffff",
		canvas: "#eef9fc",
		muted: "#6a7390",
		accent: "#525ea7",
		accentInk: "#ffffff",
		accentSoft: "#97dde9",
		danger: "#e53935",
		success: "#2e7d32",
		warning: "#ffc349",
		info: "#5facd3",
		line: "#cfe8f0",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#E37434 #FFE2AF #24B1B1 #007979` */
	tide: {
		ink: "#0f3d3d",
		paper: "#ffffff",
		canvas: "#fff6e8",
		muted: "#6e7a78",
		accent: "#007979",
		accentInk: "#ffffff",
		accentSoft: "#24b1b1",
		danger: "#e37434",
		success: "#007979",
		warning: "#ffe2af",
		info: "#24b1b1",
		line: "#d9ebe8",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#4D6787 #7DCCAD #FFEA88 #F599C6` */
	confetti: {
		ink: "#2a3a4e",
		paper: "#ffffff",
		canvas: "#f7fbff",
		muted: "#6e7f90",
		accent: "#4d6787",
		accentInk: "#ffffff",
		accentSoft: "#7dccad",
		danger: "#c62828",
		success: "#2e7d32",
		warning: "#ffea88",
		info: "#f599c6",
		line: "#d5e0ea",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#8C56D4 #DC95FF #FFBEFB #FFF4BF` */
	lilac: {
		ink: "#3a2460",
		paper: "#ffffff",
		canvas: "#fff4bf",
		muted: "#7a6a90",
		accent: "#8c56d4",
		accentInk: "#ffffff",
		accentSoft: "#dc95ff",
		danger: "#c62828",
		success: "#2e7d32",
		warning: "#ffbe0b",
		info: "#7b2cbf",
		line: "#ecd9ff",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#FF9A00 #44A1A4 #325E6A #224248` */
	reef: {
		ink: "#224248",
		paper: "#ffffff",
		canvas: "#f3f8f8",
		muted: "#5f7478",
		accent: "#44a1a4",
		accentInk: "#ffffff",
		accentSoft: "#b7e0e1",
		danger: "#c62828",
		success: "#2e7d32",
		warning: "#ff9a00",
		info: "#325e6a",
		line: "#cfe0e1",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#FAF7BB #D99B21 #838921 #133458` */
	mustard: {
		ink: "#133458",
		paper: "#fffef5",
		canvas: "#faf7bb",
		muted: "#6e7350",
		accent: "#838921",
		accentInk: "#ffffff",
		accentSoft: "#d99b21",
		danger: "#b71c1c",
		success: "#558b2f",
		warning: "#d99b21",
		info: "#133458",
		line: "#e6e3a0",
		surface: "#fffef5",
	} satisfies PaletteTokens,

	/** `#00B7CD #FFF1D1 #FF9100 #DF301C` */
	pop: {
		ink: "#1a2030",
		paper: "#ffffff",
		canvas: "#fff1d1",
		muted: "#7a6e58",
		accent: "#00b7cd",
		accentInk: "#062026",
		accentSoft: "#9ee7f0",
		danger: "#df301c",
		success: "#2e7d32",
		warning: "#ff9100",
		info: "#00b7cd",
		line: "#ead9b0",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#F3F4F4 #612D53 #853953 #2C2C2C` */
	plum: {
		ink: "#2c2c2c",
		paper: "#ffffff",
		canvas: "#f3f4f4",
		muted: "#7a6a74",
		accent: "#612d53",
		accentInk: "#ffffff",
		accentSoft: "#e2c9d6",
		danger: "#853953",
		success: "#2e7d32",
		warning: "#f9a825",
		info: "#455a64",
		line: "#ddd6da",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#486C2F #F1E5A1 #EF6905 #8B2626` */
	harvest: {
		ink: "#2a3a18",
		paper: "#fffef6",
		canvas: "#f1e5a1",
		muted: "#6e7348",
		accent: "#486c2f",
		accentInk: "#ffffff",
		accentSoft: "#c5d18a",
		danger: "#8b2626",
		success: "#486c2f",
		warning: "#ef6905",
		info: "#457b9d",
		line: "#ddd6a0",
		surface: "#fffef6",
	} satisfies PaletteTokens,

	/** `#F2EFE7 #C8DFDB #66A3BF #3368A0` */
	harbor: {
		ink: "#1f2a37",
		paper: "#ffffff",
		canvas: "#f2efe7",
		muted: "#667788",
		accent: "#3368a0",
		accentInk: "#ffffff",
		accentSoft: "#c8dfdb",
		danger: "#e63946",
		success: "#2a9d8f",
		warning: "#e9c46a",
		info: "#66a3bf",
		line: "#d5ddd8",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#EB7D00 #EBE3A7 #2C5745 #2E2910` */
	moss: {
		ink: "#2e2910",
		paper: "#fffef6",
		canvas: "#ebe3a7",
		muted: "#6e6a48",
		accent: "#2c5745",
		accentInk: "#ffffff",
		accentSoft: "#8fb39f",
		danger: "#8b2626",
		success: "#2c5745",
		warning: "#eb7d00",
		info: "#457b9d",
		line: "#d6cfa0",
		surface: "#fffef6",
	} satisfies PaletteTokens,

	/** `#FFF4F4 #FFD6E0 #BDB2FF #3A86FF` */
	orchid: {
		ink: "#2b2d42",
		paper: "#ffffff",
		canvas: "#fff4f4",
		muted: "#7a7390",
		accent: "#3a86ff",
		accentInk: "#ffffff",
		accentSoft: "#bdb2ff",
		danger: "#e63946",
		success: "#2a9d8f",
		warning: "#ffbe0b",
		info: "#8338ec",
		line: "#eadfe8",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#F2F2ED #7CD5C7 #118AB2 #464B71` */
	lagoon: {
		ink: "#2c3148",
		paper: "#ffffff",
		canvas: "#f2f2ed",
		muted: "#6a7088",
		accent: "#118ab2",
		accentInk: "#ffffff",
		accentSoft: "#7cd5c7",
		danger: "#e63946",
		success: "#2a9d8f",
		warning: "#e9c46a",
		info: "#66a3bf",
		line: "#d8dcd6",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#F5FBDA #D9EFBD #B9D175 #450C3F` */
	grove: {
		ink: "#450c3f",
		paper: "#ffffff",
		canvas: "#f5fbda",
		muted: "#6e7a58",
		accent: "#450c3f",
		accentInk: "#ffffff",
		accentSoft: "#d9efbd",
		danger: "#8b2626",
		success: "#558b2f",
		warning: "#b9d175",
		info: "#6a4c93",
		line: "#dce8b8",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#FF9137 #FFCC4D #FFFC8C #70FFD2` */
	neon: {
		ink: "#1a2030",
		paper: "#ffffff",
		canvas: "#fffc8c",
		muted: "#6e7350",
		accent: "#ff9137",
		accentInk: "#1a1200",
		accentSoft: "#ffcc4d",
		danger: "#e53935",
		success: "#00c853",
		warning: "#ffcc4d",
		info: "#70ffd2",
		line: "#e8e080",
		surface: "#ffffff",
	} satisfies PaletteTokens,

	/** `#165823 #FFF2F2 #FFDADA #FF788D` */
	rose: {
		ink: "#165823",
		paper: "#ffffff",
		canvas: "#fff2f2",
		muted: "#7a6a70",
		accent: "#ff788d",
		accentInk: "#3a1018",
		accentSoft: "#ffdada",
		danger: "#c62828",
		success: "#165823",
		warning: "#f9a825",
		info: "#5c6bc0",
		line: "#efd6d8",
		surface: "#ffffff",
	} satisfies PaletteTokens,
} as const;

export type PaletteName = keyof typeof palettes;

/** Source swatch hexes for each named preset (documentation / showcase). */
export const paletteSources: Record<PaletteName, readonly [string, string, string, string]> = {
	graphite: ["#FFFFFF", "#E5E5E5", "#FCA311", "#14213D"],
	sky: ["#E3F2FD", "#90CAF9", "#2196F3", "#0D47A1"],
	meadow: ["#E8F5E9", "#A5D6A7", "#66BB6A", "#1B5E20"],
	sage: ["#F7F4ED", "#C7D3C0", "#C8A96B", "#8FA28A"],
	citrus: ["#FFDD9C", "#F9B637", "#FB6C00", "#E73F1E"],
	blush: ["#F6D8BD", "#F39399", "#CF4173", "#5D3140"],
	aqua: ["#C4F7CA", "#D8FFC5", "#92EEFF", "#30AFFF"],
	twilight: ["#98E8DE", "#45A9A9", "#3E3E75", "#4E1F6E"],
	clay: ["#FCF2E5", "#A8A492", "#EC5B38", "#524646"],
	ember: ["#FDF0D5", "#E9C46A", "#E76F51", "#249D8F"],
	forest: ["#F7EAE0", "#F9D2BA", "#5E3122", "#1D4533"],
	festiva: ["#FFB900", "#007DCC", "#D10056", "#B2054C"],
	olive: ["#FFF7EB", "#F9F0E0", "#A2AB73", "#CC3A63"],
	marina: ["#F4D35E", "#457B9D", "#E63946", "#8B1E2D"],
	lime: ["#FFF449", "#FED24F", "#B2D959", "#7EC151"],
	apricot: ["#FEF2A0", "#F3CD97", "#E98B50", "#BC4F4F"],
	daybreak: ["#97DDE9", "#5FACD3", "#FFC349", "#525EA7"],
	tide: ["#FFE2AF", "#E37434", "#24B1B1", "#007979"],
	confetti: ["#FFEA88", "#F599C6", "#7DCCAD", "#4D6787"],
	lilac: ["#FFF4BF", "#FFBEFB", "#DC95FF", "#8C56D4"],
	reef: ["#FF9A00", "#44A1A4", "#325E6A", "#224248"],
	mustard: ["#FAF7BB", "#D99B21", "#838921", "#133458"],
	pop: ["#FFF1D1", "#00B7CD", "#FF9100", "#DF301C"],
	plum: ["#F3F4F4", "#612D53", "#853953", "#2C2C2C"],
	harvest: ["#F1E5A1", "#486C2F", "#EF6905", "#8B2626"],
	harbor: ["#F2EFE7", "#C8DFDB", "#66A3BF", "#3368A0"],
	moss: ["#EBE3A7", "#EB7D00", "#2C5745", "#2E2910"],
	orchid: ["#FFF4F4", "#FFD6E0", "#BDB2FF", "#3A86FF"],
	lagoon: ["#F2F2ED", "#7CD5C7", "#118AB2", "#464B71"],
	grove: ["#F5FBDA", "#D9EFBD", "#B9D175", "#450C3F"],
	neon: ["#FFFC8C", "#FFCC4D", "#FF9137", "#70FFD2"],
	rose: ["#FFF2F2", "#FFDADA", "#FF788D", "#165823"],
};

/** Parse `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` into 0–255 channels (alpha ignored). */
function parseHex(color: string): [number, number, number] | null {
	const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(color.trim());
	if (!m?.[1]) return null;
	let hex = m[1];
	if (hex.length <= 4) hex = [...hex].map((c) => c + c).join("");
	return [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
	const lin = (c: number) => {
		const v = c / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2 contrast ratio (1–21) between two hex colours; `NaN` if either is not hex. */
export function contrastRatio(a: string, b: string): number {
	const pa = parseHex(a);
	const pb = parseHex(b);
	if (!pa || !pb) return Number.NaN;
	const [hi, lo] = [luminance(pa), luminance(pb)].sort((x, y) => y - x) as [number, number];
	return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA threshold for normal-size text. */
export const AA_CONTRAST = 4.5;

const LIGHT_INK = "#ffffff";
const DARK_INK = "#0b0f19";

/** Text colour for `background`: white or near-black, whichever contrasts more. */
export function readableInk(background: string): string {
	const light = contrastRatio(background, LIGHT_INK);
	const dark = contrastRatio(background, DARK_INK);
	if (Number.isNaN(light)) return LIGHT_INK;
	if (Math.max(light, dark) >= AA_CONTRAST) return light >= dark ? LIGHT_INK : DARK_INK;
	// Mid-tones: pure black always clears AA where white does not.
	return contrastRatio(background, "#000000") > light ? "#000000" : LIGHT_INK;
}

function withReadableInk(p: PaletteTokens): PaletteTokens {
	const ratio = contrastRatio(p.accent, p.accentInk);
	return Number.isNaN(ratio) || ratio >= AA_CONTRAST
		? p
		: { ...p, accentInk: readableInk(p.accent) };
}

/**
 * Merge onto the default palette. Presets (and inputs without an explicit
 * `accentInk`) get an accent ink that passes WCAG AA against the accent.
 */
export function resolvePalette(input?: PaletteInput | PaletteName): PaletteTokens {
	if (typeof input === "string") return withReadableInk({ ...defaultPalette, ...palettes[input] });
	const merged = { ...defaultPalette, ...input };
	return input?.accentInk !== undefined ? merged : withReadableInk(merged);
}

/** Map tokens → CSS custom property record (camel → `--a-*`). */
export function paletteVars(input?: PaletteInput | PaletteName): Record<string, string> {
	const p = resolvePalette(input);
	const soft = p.accentSoft ?? `color-mix(in oklab, ${p.accent} 14%, ${p.paper})`;
	return {
		[paletteVarNames.ink]: p.ink,
		[paletteVarNames.paper]: p.paper,
		[paletteVarNames.canvas]: p.canvas,
		[paletteVarNames.muted]: p.muted,
		[paletteVarNames.accent]: p.accent,
		[paletteVarNames.accentInk]: p.accentInk,
		[paletteVarNames.accentSoft]: soft,
		[paletteVarNames.danger]: p.danger,
		[paletteVarNames.success]: p.success,
		[paletteVarNames.warning]: p.warning,
		[paletteVarNames.info]: p.info,
		// Text on solid tone surfaces: whichever of light/dark passes AA on the tone.
		"--a-danger-ink": readableInk(p.danger),
		"--a-success-ink": readableInk(p.success),
		"--a-warning-ink": readableInk(p.warning),
		"--a-info-ink": readableInk(p.info),
		[paletteVarNames.line]: p.line,
		[paletteVarNames.surface]: p.surface ?? p.paper,
		[paletteVarNames.radius]: resolveRadius(p.radius),
	};
}

/** Inline `style` string for JSX (`style={paletteStyle("lagoon")}`). */
export function paletteStyle(input?: PaletteInput | PaletteName): string {
	return Object.entries(paletteVars(input))
		.map(([k, v]) => `${k}:${v}`)
		.join(";");
}

/**
 * Write palette variables onto an element (default `:root`).
 * Returns a restore function that removes only the keys this call set.
 */
export function applyPalette(
	input?: PaletteInput | PaletteName,
	target: HTMLElement | SVGElement = document.documentElement,
): () => void {
	const vars = paletteVars(input);
	const prev = new Map<string, string>();
	for (const [name, value] of Object.entries(vars)) {
		prev.set(name, target.style.getPropertyValue(name));
		target.style.setProperty(name, value);
	}
	return () => {
		for (const [name, value] of prev) {
			if (value) target.style.setProperty(name, value);
			else target.style.removeProperty(name);
		}
	};
}

/**
 * Set only the corner radius scale on a target (default `:root`).
 * Prefer this when changing radius without swapping the full palette.
 */
export function applyRadius(
	scale: RadiusName = "sm",
	target: HTMLElement | SVGElement = document.documentElement,
): () => void {
	const name = paletteVarNames.radius;
	const prev = target.style.getPropertyValue(name);
	target.style.setProperty(name, radii[scale]);
	target.classList.remove("a-radius-none", "a-radius-sm", "a-radius-lg");
	target.classList.add(`a-radius-${scale}`);
	return () => {
		if (prev) target.style.setProperty(name, prev);
		else target.style.removeProperty(name);
		target.classList.remove("a-radius-none", "a-radius-sm", "a-radius-lg");
	};
}
