import { Show } from "@arachne/render";
import { type BaseProps, type SlotProps, setup } from "./system.ts";

export type HeroSize = "sm" | "md" | "lg" | "half" | "full";
export type HeroTone = "default" | "accent" | "dark" | "light";

export type HeroProps = BaseProps & {
	size?: HeroSize | undefined;
	tone?: HeroTone | undefined;
	children?: unknown;
};

/** Full-bleed page hero (Bulma / Bootstrap jumbotron). Slots: `root`. */
export function Hero(input: HeroProps) {
	const [props, rest, slot] = setup("Hero", input, {}, ["size", "tone", "children"]);
	return (
		<section
			{...rest}
			class={slot.class(
				"root",
				"a-hero",
				props.size && props.size !== "md" && `a-hero-${props.size}`,
				props.tone && props.tone !== "default" && `a-hero-${props.tone}`,
			)}
			style={slot.style("root")}
			data-size={props.size}
			data-tone={props.tone}
		>
			{props.children}
		</section>
	);
}

export type HeroPartProps = BaseProps & {
	children?: unknown;
};

export function HeroHead(input: HeroPartProps) {
	const [props, rest, slot] = setup("HeroHead", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-hero-head")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export function HeroBody(input: HeroPartProps) {
	const [props, rest, slot] = setup("HeroBody", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-hero-body")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export function HeroFoot(input: HeroPartProps) {
	const [props, rest, slot] = setup("HeroFoot", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-hero-foot")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type FooterProps = BaseProps & {
	children?: unknown;
};

/** Slots: `root`. */
export function Footer(input: FooterProps) {
	const [props, rest, slot] = setup("Footer", input, {}, ["children"]);
	return (
		<footer {...rest} class={slot.class("root", "a-footer")} style={slot.style("root")}>
			{props.children}
		</footer>
	);
}

export type MediaProps = BaseProps & {
	children?: unknown;
};

/** Media object (Bulma / UIkit comment / Bootstrap media). Slots: `root`. */
export function Media(input: MediaProps) {
	const [props, rest, slot] = setup("Media", input, {}, ["children"]);
	return (
		<article {...rest} class={slot.class("root", "a-media")} style={slot.style("root")}>
			{props.children}
		</article>
	);
}

export function MediaLeft(input: HeroPartProps) {
	const [props, rest, slot] = setup("MediaLeft", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-media-left")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export function MediaContent(input: HeroPartProps) {
	const [props, rest, slot] = setup("MediaContent", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-media-content")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export function MediaRight(input: HeroPartProps) {
	const [props, rest, slot] = setup("MediaRight", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-media-right")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type ArticleProps = BaseProps & {
	children?: unknown;
};

/** Slots: `root`. */
export function Article(input: ArticleProps) {
	const [props, rest, slot] = setup("Article", input, {}, ["children"]);
	return (
		<article {...rest} class={slot.class("root", "a-article")} style={slot.style("root")}>
			{props.children}
		</article>
	);
}

export function ArticleTitle(input: HeroPartProps) {
	const [props, rest, slot] = setup("ArticleTitle", input, {}, ["children"]);
	return (
		<h1 {...rest} class={slot.class("root", "a-article-title")} style={slot.style("root")}>
			{props.children}
		</h1>
	);
}

export function ArticleMeta(input: HeroPartProps) {
	const [props, rest, slot] = setup("ArticleMeta", input, {}, ["children"]);
	return (
		<p {...rest} class={slot.class("root", "a-article-meta")} style={slot.style("root")}>
			{props.children}
		</p>
	);
}

export type FigureSlot = "root" | "caption";

export type FigureProps = SlotProps<FigureSlot> & {
	caption?: unknown;
	children?: unknown;
};

/** Slots: `root` `caption`. */
export function Figure(input: FigureProps) {
	const [props, rest, slot] = setup(
		"Figure",
		input,
		{},
		["caption", "children"],
		"root" as FigureSlot,
	);
	return (
		<figure {...rest} class={slot.class("root", "a-figure")} style={slot.style("root")}>
			{props.children}
			<Show when={props.caption}>
				<figcaption class={slot.class("caption", "a-figure-caption")} style={slot.style("caption")}>
					{props.caption}
				</figcaption>
			</Show>
		</figure>
	);
}

export type ImageProps = BaseProps & {
	src: string;
	alt?: string | undefined;
	/** Full width of the container (default true). */
	fullwidth?: boolean | undefined;
	rounded?: boolean | undefined;
	radius?: number | string | undefined;
	fit?: "cover" | "contain" | undefined;
	width?: string | number | undefined;
	height?: string | number | undefined;
	/** Native lazy loading (default `lazy`); use `eager` for above-the-fold media. */
	loading?: "lazy" | "eager" | undefined;
	decoding?: "async" | "sync" | "auto" | undefined;
	srcset?: string | undefined;
	sizes?: string | undefined;
};

/** Slots: `root`. Radius is exposed as `--a-image-radius`. */
export function Image(input: ImageProps) {
	const [props, rest, slot] = setup("Image", input, { loading: "lazy", decoding: "async" }, [
		"src",
		"alt",
		"fullwidth",
		"rounded",
		"radius",
		"fit",
		"width",
		"height",
		"loading",
		"decoding",
		"srcset",
		"sizes",
	]);
	const radiusCss = () => {
		const radius = props.radius ?? (props.rounded ? 4 : undefined);
		if (radius == null) return undefined;
		return typeof radius === "number" ? `${radius}px` : radius;
	};
	return (
		<img
			{...rest}
			class={slot.class(
				"root",
				"a-image",
				props.fullwidth !== false && "a-image-fullwidth",
				props.rounded && "a-image-rounded",
				props.fit && `a-image-${props.fit}`,
			)}
			src={props.src}
			srcset={props.srcset}
			sizes={props.sizes}
			alt={props.alt ?? ""}
			width={props.width}
			height={props.height}
			loading={props.loading}
			decoding={props.decoding}
			style={slot.style("root", radiusCss() ? { "border-radius": radiusCss() } : undefined)}
		/>
	);
}
