import {
	mdiAccount,
	mdiAccountGroup,
	mdiAlert,
	mdiAlertCircleOutline,
	mdiArrowLeft,
	mdiArrowRight,
	mdiBell,
	mdiCalendar,
	mdiCheck,
	mdiCheckCircleOutline,
	mdiChevronDown,
	mdiChevronLeft,
	mdiChevronRight,
	mdiChevronUp,
	mdiClockOutline,
	mdiClose,
	mdiCodeTags,
	mdiCog,
	mdiContentCopy,
	mdiDelete,
	mdiDotsHorizontal,
	mdiDownload,
	mdiEmail,
	mdiEye,
	mdiEyeOff,
	mdiEyeOutline,
	mdiFileOutline,
	mdiFilterVariant,
	mdiFlash,
	mdiFolderOutline,
	mdiGit,
	mdiHeart,
	mdiHome,
	mdiImageOutline,
	mdiInformationOutline,
	mdiLinkVariant,
	mdiLoading,
	mdiLock,
	mdiLockOpenVariant,
	mdiMagnify,
	mdiMenu,
	mdiMinus,
	mdiOpenInNew,
	mdiPause,
	mdiPencil,
	mdiPhone,
	mdiPlay,
	mdiPlus,
	mdiRefresh,
	mdiShareVariant,
	mdiStar,
	mdiUpload,
	mdiWeatherNight,
	mdiWhiteBalanceSunny,
} from "./mdi-paths.ts";
import { type BaseProps, type SlotProps, setup } from "./system.ts";

/** Material Design Icons path names used by `<Icon />`. */
export type IconName =
	| "check"
	| "x"
	| "plus"
	| "minus"
	| "search"
	| "user"
	| "users"
	| "settings"
	| "menu"
	| "home"
	| "heart"
	| "star"
	| "bell"
	| "mail"
	| "calendar"
	| "clock"
	| "edit"
	| "trash"
	| "copy"
	| "download"
	| "upload"
	| "link"
	| "external"
	| "info"
	| "warning"
	| "error"
	| "success"
	| "chevron-down"
	| "chevron-up"
	| "chevron-left"
	| "chevron-right"
	| "arrow-left"
	| "arrow-right"
	| "eye"
	| "eye-off"
	| "eye-outline"
	| "lock"
	| "unlock"
	| "filter"
	| "more"
	| "close"
	| "spinner"
	| "sun"
	| "moon"
	| "play"
	| "pause"
	| "refresh"
	| "share"
	| "image"
	| "file"
	| "folder"
	| "zap"
	| "phone"
	| "git"
	| "code";

const PATHS: Record<IconName, string> = {
	check: mdiCheck,
	x: mdiClose,
	close: mdiClose,
	plus: mdiPlus,
	minus: mdiMinus,
	search: mdiMagnify,
	user: mdiAccount,
	users: mdiAccountGroup,
	settings: mdiCog,
	menu: mdiMenu,
	home: mdiHome,
	heart: mdiHeart,
	star: mdiStar,
	bell: mdiBell,
	mail: mdiEmail,
	calendar: mdiCalendar,
	clock: mdiClockOutline,
	edit: mdiPencil,
	trash: mdiDelete,
	copy: mdiContentCopy,
	download: mdiDownload,
	upload: mdiUpload,
	link: mdiLinkVariant,
	external: mdiOpenInNew,
	info: mdiInformationOutline,
	warning: mdiAlert,
	error: mdiAlertCircleOutline,
	success: mdiCheckCircleOutline,
	"chevron-down": mdiChevronDown,
	"chevron-up": mdiChevronUp,
	"chevron-left": mdiChevronLeft,
	"chevron-right": mdiChevronRight,
	"arrow-left": mdiArrowLeft,
	"arrow-right": mdiArrowRight,
	eye: mdiEye,
	"eye-off": mdiEyeOff,
	"eye-outline": mdiEyeOutline,
	lock: mdiLock,
	unlock: mdiLockOpenVariant,
	filter: mdiFilterVariant,
	more: mdiDotsHorizontal,
	spinner: mdiLoading,
	sun: mdiWhiteBalanceSunny,
	moon: mdiWeatherNight,
	play: mdiPlay,
	pause: mdiPause,
	refresh: mdiRefresh,
	share: mdiShareVariant,
	image: mdiImageOutline,
	file: mdiFileOutline,
	folder: mdiFolderOutline,
	zap: mdiFlash,
	phone: mdiPhone,
	git: mdiGit,
	code: mdiCodeTags,
};

export type IconProps = BaseProps & {
	/** Which built-in icon to draw. */
	name: IconName;
	/** `sm` / `md` / `lg`, or a size in pixels. */
	size?: "sm" | "md" | "lg" | number | undefined;
	/** Accessible name; without it the icon is decorative (`aria-hidden`). */
	label?: string | undefined;
};

function iconSize(size: IconProps["size"]): number {
	if (typeof size === "number") return size;
	return size === "sm" ? 14 : size === "lg" ? 22 : 18;
}

/** Built-in SVG icon. Slots: `root`. State: `data-icon`. */
export function Icon(input: IconProps) {
	const [props, rest, slot] = setup("Icon", input, {}, ["name", "size", "label"]);
	return (
		<svg
			aria-label={props.label}
			{...rest}
			class={slot.class("root", "a-icon", props.name === "spinner" && "a-icon-spin")}
			style={slot.style("root")}
			width={iconSize(props.size)}
			height={iconSize(props.size)}
			viewBox="0 0 24 24"
			aria-hidden={props.label ? undefined : "true"}
			role={props.label ? "img" : undefined}
			data-icon={props.name}
		>
			<path d={PATHS[props.name]} fill="currentColor" />
		</svg>
	);
}

export type IconBadgeSlot = "root" | "icon";

export type IconBadgeProps = SlotProps<IconBadgeSlot> & {
	/** Which built-in icon to draw. */
	name: IconName;
	/** Colour of the icon and its tinted background. */
	tone?: "accent" | "success" | "warning" | "danger" | "muted" | undefined;
	/** Badge size. */
	size?: "sm" | "md" | "lg" | undefined;
};

/** Colored circular/square icon badge. Slots: `root` `icon`. State: `data-tone`. */
export function IconBadge(input: IconBadgeProps) {
	const [props, rest, slot] = setup(
		"IconBadge",
		input,
		{ tone: "accent", size: "md" },
		["name", "tone", "size"],
		"root" as IconBadgeSlot,
	);
	return (
		<span
			{...rest}
			class={slot.class(
				"root",
				"a-icon-badge",
				`a-icon-badge-${props.tone}`,
				props.size !== "md" && `a-icon-badge-${props.size}`,
			)}
			style={slot.style("root")}
			data-tone={props.tone}
			data-size={props.size}
		>
			<Icon
				name={props.name}
				size={props.size === "sm" ? 12 : props.size === "lg" ? 20 : 16}
				class={slot.class("icon")}
				style={slot.style("icon")}
			/>
		</span>
	);
}

export type CloseButtonProps = BaseProps & {
	/** Accessible name of the button. */
	label?: string | undefined;
	/** Button size. */
	size?: "sm" | "md" | undefined;
	/** Called when the button is clicked. */
	onClick?: ((e: MouseEvent) => void) | undefined;
};

/** Dismiss control (×). Slots: `root`. */
export function CloseButton(input: CloseButtonProps) {
	const [props, rest, slot] = setup("CloseButton", input, { size: "md" }, [
		"label",
		"size",
		"onClick",
	]);
	return (
		<button
			aria-label={props.label ?? "Close"}
			{...rest}
			type="button"
			class={slot.class("root", "a-delete", props.size === "sm" && "a-delete-sm")}
			style={slot.style("root")}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		/>
	);
}

export const iconNames = Object.keys(PATHS) as IconName[];
