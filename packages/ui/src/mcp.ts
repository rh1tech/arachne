import { defineMcpModule, jsonResult, textResult, toolName } from "@arachne/mcp";
import { z } from "zod";
import { cx } from "./cx.ts";

export const mcpModule = defineMcpModule({
	name: "ui",
	version: "0.0.1",
	tools: [
		{
			name: toolName("ui", "classnames"),
			description: "Join Arachne UI class names with cx().",
			inputSchema: {
				parts: z.array(z.string().nullable()),
			},
			handler: (args) => {
				const parts = args["parts"] as Array<string | null>;
				return jsonResult({ className: cx(...parts) });
			},
		},
		{
			name: toolName("ui", "api_summary"),
			description: "Summarize @arachne/ui public API.",
			handler: () =>
				textResult(
					[
						"Button, TextInput, TextArea, Select, Checkbox, Switch, RadioGroup, FileInput",
						"InputGroup / InputAddon, SearchInput, NumberInput, Slider, Tag, Skeleton",
						"Avatar, EmptyState, Kbd, Code, Stat, DescriptionList, CopyButton",
						"Modal, Drawer, Tabs, Menu, Popover, Breadcrumb, Pagination, Accordion, Tooltip",
						"Navbar + createNavbarController, AppShell, SidebarNav, Segmented, Steps",
						"ToastHost + createToaster, Spinner, Progress, Box, Table, Alert",
						"Divider, Heading, Badge, Label, Field, FormField, Control, Help, FormSection, FormArea",
						"Stack, Columns/Column, Grid/GridItem, Container, Section, Level, Group, Flex, Center",
						"Card, Panel, Tile, Paper, Message, Hero, Footer, Media, Article, Figure, Image",
						"Icon (+ IconBadge, ActionIcon, CloseButton), List/ListGroup, Timeline, NavLink",
						"Indicator, Affix, Overlay, LoadingOverlay, Spoiler, Collapse, Mark, Quote, RingProgress",
						"HoverCard, Burger, ColorSwatch, Highlight, BackgroundImage, Sticky, VisuallyHidden",
						"Dropzone, FileButton, Subnav, Iconnav, NavigationProgress, NumberFormatter",
						"Tree, Carousel, Calendar, DatePicker, Thead/Tbody/Tr/Th/Td",
						"ContextMenu, ColorPicker, Lightbox, TransferList, Spotlight, ConfirmDialog",
						"MonthPicker, DateRangePicker, TimePicker, SemiCircleProgress, Sparkline",
						"CodeBlock, Countdown, ToTop",
						"ButtonGroup, SplitButton, ToggleGroup, AvatarGroup, Notification, FAB, BottomNav",
						"SortableList, Splitter, DataTable, YearPicker, PasswordStrength, Meter, Comment",
						"Thumbnav, Leader, Marquee, BarList, SkipLink, UnstyledButton",
						"BottomSheet, Banner, PageHeader, UserButton, ThemeToggle, ChoiceCard",
						"applyPalette, applyRadius, paletteStyle, palettes (theming + radius none/sm/lg)",
						"ChatBubble, TypingIndicator, JsonViewer, RelativeTime, CountUp, ScrollSpy",
						"BeforeAfter, LoadMore, ActivityItem, Masonry, FilterBar, StatusDot",
						"CookieConsent, OfflineNotice, Hotkey, InlineEdit, CopyField, Checklist",
						"PricingCard, FeatureList, StatGroup, DotPagination, BackLink, NextPrev",
						"FileCard, VideoFrame, SteppedProgress, Heatmap, AngleSlider, Kanban*",
						"Prose, Bleed, Inset",
						"PresenceAvatar, Truncate, Terminal, Diff, Trend, DonutChart, SparkBar",
						"SkeletonText/Card, LoadingButton, ConfirmButton, SettingsRow, ToggleRow",
						"DangerZone, StickyBar, SiteFooter, SocialLinks, Reel, GalleryGrid",
						"Testimonial, ReviewCard, LogoCloud, UploadItem, WizardNav, FormFooter, Details, Metric",
						"AnnouncementBar, CommandBar, TableOfContents, PropertyList, StatCard",
						"QuantityInput, Price, ProductCard, CartLine, OrderSummary, ShareButton, CopyId",
						"EnvBadge, LocaleSwitcher, OrgSwitcher, InboxItem, ReactionBar, Mention",
						"BrowserFrame, PhoneFrame, FeatureCompare, ViewToggle, ResultCount, FilterChip",
						"BulkBar, LiveBadge, UnreadBadge, SecretField, InfiniteScroll",
						"Callout, ChangelogItem, VersionTag, HttpMethodBadge, EndpointRow, JsonTree, LogViewer",
						"ServiceStatus, UptimeBar, UsageMeter, UpgradeBanner, ProfileHeader, MemberRow",
						"RoleBadge, PriorityBadge, SeverityBadge, CommitChip, BranchBadge, BuildStatus, Pipeline",
						"SyncStatus, AutosaveIndicator, LastSaved, FloatingToolbar, DensityToggle",
						"NoResults, ErrorState, CreditCardPreview, InvoiceRow, StorageBar, FileTree, Gauge, InviteCard",
						"DocMenu (Bulma-style hierarchical docs/catalog sidebar)",
						"DocPage + DocExample (title, description, live preview, code block)",
						"Utils: m/mt/p/px/gap/textColor/bgColor/hidden/srOnly/util",
						"Import styles: @arachne/ui/styles.css",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-ui-readme",
			uri: "arachne://ui/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
});

export default mcpModule;
