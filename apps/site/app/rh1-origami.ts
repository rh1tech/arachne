/**
 * RH1 origami mark — extracted from rh1.tech/logo/origami.html.
 * Unfolds crease by crease from a folded packet into the flat logo.
 */
// @ts-nocheck

/*
 * The mark is a sheet of kami: orange on the front, white on the back.
 * Every crease in the logo runs at the same angle (the chamfer, the shadow
 * line, the top of the "1", the foot of the stem), so the animation starts
 * from a folded packet and opens it crease by crease until the flat logo
 * remains. Geometry is in the logo's own coordinates; faces are rotated in
 * 3D around their hinge and projected with a mild perspective.
 */
const SVG_NS = "http://www.w3.org/2000/svg";
const CENTER = [127.49, 36.68];
const CAMERA = 130; // perspective distance, in logo units
const LAYER = 0.02; // z separation between stacked layers
const LIGHT = norm([-0.35, -0.55, 1]);

// Crease direction shared by every diagonal in the mark.
const DIAG = norm([146.45 - 111.85, 28.46 - 55.64, 0]);

const COLOR = {
	sheet: "#ff5722",
	sheetLowLeft: "#d94415",
	sheetLowRight: "#df4819",
	paper: "#ffffff",
	paperShade: "#e2e2e1",
	back: "#f4f1ec",
};

const hinges = {
	// Lower part of the sheet, below the long shadow crease.
	lower: { origin: [111.85, 55.64, LAYER * 3], dir: DIAG, side: [146.45, 55.64] },
	// Top-left corner, tucked behind along the chamfer.
	corner: {
		origin: [108.53, 25.19, 0],
		dir: norm([118.03 - 108.53, 17.72 - 25.19, 0]),
		side: [108.53, 17.72],
		behind: true,
	},
	// The stem of the "1", turned over like a page from the left.
	stem: { origin: [131.18, 0, LAYER * 2], dir: [0, 1, 0], side: [136, 40] },
	// The beak of the "1", folded back out over the same edge.
	beak: { origin: [131.18, 0, LAYER * 3.5], dir: [0, 1, 0], side: [128, 31], parent: "stem" },
};

// The stem's back is split along the mirrored shadow crease, so that before
// it turns over it matches the sheet it is lying on.
const faces = [
	{
		hinge: null,
		z: 0,
		front: COLOR.sheet,
		back: COLOR.back,
		pts: [
			[108.53, 25.19],
			[118.03, 17.72],
			[146.45, 17.72],
			[146.45, 28.46],
			[111.85, 55.64],
			[108.53, 55.64],
		],
	},
	{
		hinge: "corner",
		z: 0,
		front: COLOR.sheet,
		back: COLOR.back,
		pts: [
			[108.53, 17.72],
			[118.03, 17.72],
			[108.53, 25.19],
		],
	},
	{
		hinge: "lower",
		z: 0,
		front: COLOR.sheetLowLeft,
		back: COLOR.back,
		pts: [
			[111.85, 55.64],
			[131.15, 40.47],
			[131.15, 55.64],
		],
	},
	{
		hinge: "lower",
		z: 0,
		front: COLOR.sheetLowRight,
		back: COLOR.back,
		pts: [
			[131.15, 40.47],
			[146.45, 28.46],
			[146.45, 55.64],
			[131.15, 55.64],
		],
	},
	// Seamless white underlay for the stem; only drawn face up.
	{
		hinge: "stem",
		z: LAYER * 1.9,
		front: COLOR.paper,
		back: COLOR.paper,
		frontOnly: true,
		late: true,
		pts: [
			[131.18, 25.29],
			[140.81, 17.72],
			[140.81, 48.05],
			[131.18, 55.64],
		],
	},
	{
		hinge: "stem",
		z: LAYER * 2,
		front: COLOR.paper,
		back: COLOR.sheet,
		late: true,
		pts: [
			[131.18, 25.29],
			[140.81, 17.72],
			[140.81, 32.89],
			[131.18, 32.89],
		],
	},
	{
		hinge: "stem",
		z: LAYER * 2,
		front: COLOR.paperShade,
		back: COLOR.sheet,
		late: true,
		pts: [
			[131.18, 32.89],
			[140.81, 32.89],
			[131.18, 40.45],
		],
	},
	{
		hinge: "stem",
		z: LAYER * 2,
		front: COLOR.paper,
		back: COLOR.sheet,
		late: true,
		pts: [
			[131.18, 40.45],
			[140.81, 32.89],
			[140.81, 48.05],
		],
	},
	{
		hinge: "stem",
		z: LAYER * 2,
		front: COLOR.paper,
		back: COLOR.sheetLowLeft,
		late: true,
		pts: [
			[131.18, 40.45],
			[140.81, 48.05],
			[131.18, 55.64],
		],
	},
	{
		hinge: "beak",
		z: LAYER * 4,
		front: COLOR.paper,
		back: COLOR.sheet,
		late: true,
		pts: [
			[121.52, 32.89],
			[131.18, 25.29],
			[131.18, 32.89],
		],
	},
];

// Gradient wash from the original mark, laid over the flat sheet.
const wash = {
	z: LAYER,
	pts: [
		[108.53, 25.19],
		[118.03, 17.72],
		[146.45, 17.72],
		[146.45, 55.64],
		[108.53, 55.64],
	],
};

// Timeline in milliseconds. Angles are in degrees; 0 means lying flat in the logo.
export const DURATION = 3400;
const timeline = {
	lower: { from: 180, to: 0, start: 250, end: 1250, ease: easeInOutCubic },
	corner: { from: 0, to: 180, start: 1050, end: 1750, ease: easeInOutCubic },
	stem: { from: 180, to: 0, start: 1550, end: 2450, ease: easeInOutCubic },
	beak: { from: 180, to: 0, start: 2300, end: 3050, ease: easeInOutCubic },
};
const ENTER = { start: 0, end: 400 };
const WASH = { start: 2700, end: 3400 };

// ---------------------------------------------------------------- math

function norm(v) {
	const l = Math.hypot(...v);
	return v.map((c) => c / l);
}
function sub(a, b) {
	return a.map((c, i) => c - b[i]);
}
function add(a, b) {
	return a.map((c, i) => c + b[i]);
}
function dot(a, b) {
	return a.reduce((s, c, i) => s + c * b[i], 0);
}
function cross(a, b) {
	return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function scale(v, s) {
	return v.map((c) => c * s);
}

// Rodrigues rotation of v around unit axis k by angle a.
function rotate(v, k, a) {
	const c = Math.cos(a);
	const s = Math.sin(a);
	return add(add(scale(v, c), scale(cross(k, v), s)), scale(k, dot(k, v) * (1 - c)));
}

function clamp01(x) {
	return Math.min(1, Math.max(0, x));
}
function easeInOutCubic(t) {
	return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
function progress(span, t) {
	return clamp01((t - span.start) / (span.end - span.start));
}

// Each hinge rotates its side of the crease towards the viewer (+z),
// or away from it when the fold goes behind the sheet.
for (const h of Object.values(hinges)) {
	const probe = sub([...h.side, 0], h.origin);
	const lifted = rotate(probe, h.dir, Math.PI / 2);
	const wantsUp = !h.behind;
	h.sign = lifted[2] > 0 === wantsUp ? 1 : -1;
}

function hingeChain(name) {
	const chain = [];
	for (let n = name; n; n = hinges[n].parent) chain.push(n);
	return chain; // innermost first
}

function place(point, chain, angles) {
	let p = point;
	for (const name of chain) {
		const h = hinges[name];
		p = add(rotate(sub(p, h.origin), h.dir, h.sign * angles[name]), h.origin);
	}
	return p;
}

function project(p) {
	const k = CAMERA / (CAMERA - p[2]);
	return [CENTER[0] + (p[0] - CENTER[0]) * k, CENTER[1] + (p[1] - CENTER[1]) * k];
}

function signedArea(pts) {
	let a = 0;
	for (let i = 0; i < pts.length; i++) {
		const [x1, y1] = pts[i];
		const [x2, y2] = pts[(i + 1) % pts.length];
		a += x1 * y2 - x2 * y1;
	}
	return a / 2;
}

function shade(hex, f) {
	const n = parseInt(hex.slice(1), 16);
	const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
		const v = f <= 1 ? c * f : c + (255 - c) * (f - 1);
		return Math.round(Math.min(255, Math.max(0, v)));
	});
	return `rgb(${ch.join(",")})`;
}

// ---------------------------------------------------------------- render

const VIEW_BOX = "108.53 17.72 37.92 37.92";

for (const f of faces) {
	f.chain = f.hinge ? hingeChain(f.hinge) : [];
	f.restArea = Math.sign(signedArea(f.pts));
	f.casts = Boolean(f.hinge && !f.frontOnly);
}

const restLight = dot([0, 0, 1], LIGHT);

function pointList(pts) {
	return pts.map((p) => p.join(",")).join(" ");
}

// Pure geometry for time t, shared by every rendered size.
function computeFrame(t) {
	const angles = {};
	for (const [name, span] of Object.entries(timeline)) {
		const e = span.ease(progress(span, t));
		angles[name] = ((span.from + (span.to - span.from) * e) * Math.PI) / 180;
	}

	const drawn = faces.map((f, index) => {
		const world = f.pts.map((p) => place([p[0], p[1], f.z], f.chain, angles));
		const flat = world.map(project);
		const facingFront = Math.sign(signedArea(flat)) === f.restArea;
		const origin = place([0, 0, 0], f.chain, angles);
		const normal = sub(place([0, 0, 1], f.chain, angles), origin);
		const facing = facingFront ? normal : scale(normal, -1);
		const light =
			0.7 +
			0.3 * clamp01(dot(facing, LIGHT) / restLight) +
			0.1 * Math.max(0, dot(facing, LIGHT) - restLight);
		const color = shade(facingFront ? f.front : f.back, light);
		// The stem rests where the lower flap is still folded away; it only
		// joins once the sheet underneath is down and it blends in.
		const hidden = (f.late && t < timeline.lower.end) || (f.frontOnly && !facingFront);

		// Lifted flaps cast a soft shadow down and to the right.
		const lift = Math.max(...world.map((p) => p[2]));
		const shadow = f.casts && {
			points: pointList(world.map((p) => [p[0] + p[2] * 0.35, p[1] + p[2] * 0.5])),
			opacity: (Math.min(1, lift / 6) * 0.22).toFixed(3),
		};

		const depth = world.reduce((sum, p) => sum + p[2], 0) / world.length;
		return { index, points: pointList(flat), color, hidden, shadow, depth };
	});
	drawn.push({ index: "wash", depth: wash.z });
	drawn.sort((a, b) => a.depth - b.depth);

	const enter = easeInOutCubic(progress(ENTER, t));
	return {
		drawn,
		washOpacity: easeInOutCubic(progress(WASH, t)).toFixed(3),
		opacity: enter,
		transform: `scale(${0.9 + 0.1 * enter})`,
	};
}

function svgEl(name, attrs = {}, parent) {
	const el = document.createElementNS(SVG_NS, name);
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
	if (parent) parent.appendChild(el);
	return el;
}

// Builds one SVG at the given pixel size. Gradient and filter ids are
// unique per instance so marks never reference each other's defs.
function createMark(size, n) {
	const svg = svgEl("svg", { viewBox: VIEW_BOX, width: size, height: size, "aria-hidden": "true" });
	const defs = svgEl("defs", {}, svg);
	const gradient = svgEl(
		"linearGradient",
		{
			id: `light-${n}`,
			gradientUnits: "userSpaceOnUse",
			x1: 0,
			y1: 17.72,
			x2: 0,
			y2: 55.64,
		},
		defs,
	);
	const stops = [
		[0, "#fff", 0.12],
		[0.2, "#fff", 0.06],
		[0.4, "#fff", 0.01],
		[0.6, "#000", 0.04],
		[0.8, "#000", 0.13],
		[1, "#000", 0.28],
	];
	for (const [offset, color, opacity] of stops) {
		svgEl("stop", { offset, "stop-color": color, "stop-opacity": opacity }, gradient);
	}
	const filter = svgEl(
		"filter",
		{ id: `soft-${n}`, x: "-50%", y: "-50%", width: "200%", height: "200%" },
		defs,
	);
	svgEl("feGaussianBlur", { stdDeviation: 0.8 }, filter);

	const shadowLayer = svgEl("g", { filter: `url(#soft-${n})` }, svg);
	const faceLayer = svgEl("g", {}, svg);
	const polygon = (parent) =>
		svgEl("polygon", { "stroke-linejoin": "round", "stroke-width": 0.12 }, parent);

	const els = {
		wash: svgEl("polygon", { fill: `url(#light-${n})`, points: pointList(wash.pts) }, faceLayer),
	};
	const shadows = {};
	faces.forEach((f, i) => {
		els[i] = polygon(faceLayer);
		if (f.casts) shadows[i] = svgEl("polygon", { fill: "#000" }, shadowLayer);
	});

	return { svg, faceLayer, els, shadows };
}

function paint(mark, data) {
	for (const d of data.drawn) {
		const el = mark.els[d.index];
		mark.faceLayer.appendChild(el);
		if (d.index === "wash") {
			el.setAttribute("opacity", data.washOpacity);
			continue;
		}
		const visibility = d.hidden ? "hidden" : "visible";
		el.style.visibility = visibility;
		el.setAttribute("points", d.points);
		el.setAttribute("fill", d.color);
		el.setAttribute("stroke", d.color);
		const shadow = mark.shadows[d.index];
		if (shadow) {
			shadow.style.visibility = visibility;
			shadow.setAttribute("points", d.shadow.points);
			shadow.setAttribute("opacity", d.shadow.opacity);
		}
	}
	mark.svg.style.opacity = data.opacity;
	mark.svg.style.transform = data.transform;
}

export function createRh1Mark(size = 18, id = 0) {
	return createMark(size, id);
}

export function paintRh1Mark(mark, t) {
	paint(mark, computeFrame(t));
}

/**
 * Mount an animated RH1 mark into `host`.
 * Loop: folded (nothing) → short pause → unfold → long pause → fold → short pause → …
 * `pauseMs` is the hold while the logo is open; `pauseFoldedMs` is the brief beat while folded.
 * Returns a dispose function.
 */
export function mountRh1Mark(
	host,
	{ size = 18, pauseMs = 3000, pauseFoldedMs = 200, id = 0, startOpen = false } = {},
) {
	host.replaceChildren();
	const mark = createMark(size, id);
	mark.svg.style.display = "block";
	mark.svg.style.overflow = "visible";
	host.appendChild(mark.svg);

	let disposed = false;
	let running = false;
	let startedAt = 0;
	let timer = 0;
	let raf = 0;
	/** `1` = unfold forward, `-1` = fold back. */
	let direction = startOpen ? -1 : 1;

	const reduced =
		typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

	const frame = (t) => paint(mark, computeFrame(t));

	const tick = (now) => {
		if (disposed) return;
		const elapsed = now - startedAt;
		const t = direction === 1 ? Math.min(elapsed, DURATION) : Math.max(DURATION - elapsed, 0);
		frame(t);
		if (elapsed < DURATION) {
			raf = requestAnimationFrame(tick);
		} else {
			running = false;
			const finishedForward = direction === 1;
			direction = -direction;
			const wait = finishedForward ? pauseMs : pauseFoldedMs;
			if (!disposed && wait >= 0) {
				timer = window.setTimeout(play, wait);
			}
		}
	};

	const play = () => {
		if (disposed || running) return;
		running = true;
		startedAt = performance.now();
		raf = requestAnimationFrame(tick);
	};

	if (reduced) {
		frame(DURATION);
	} else if (startOpen) {
		// Footer lockup: show the open mark immediately so spacing reads correctly,
		// then fold after the open pause.
		frame(DURATION);
		timer = window.setTimeout(play, pauseMs);
	} else {
		// Start folded, brief beat, then unfold.
		frame(0);
		timer = window.setTimeout(play, pauseFoldedMs);
	}

	return () => {
		disposed = true;
		running = false;
		cancelAnimationFrame(raf);
		clearTimeout(timer);
		host.replaceChildren();
	};
}
