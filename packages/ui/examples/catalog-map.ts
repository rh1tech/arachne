/**
 * Information architecture of the component reference. Every example must be
 * listed exactly once — in a category, or as a part of its parent — and
 * `scripts/gen-ui-docs.ts` fails otherwise.
 */

/** Related components documented together on one page (e.g. the colour inputs). */
export type Family = {
	family: string;
	title: string;
	description: string;
	components: string[];
};

export type Category = {
	id: string;
	label: string;
	/** The question the category answers — what a component here is for. */
	description: string;
	/** Components with their own page, and families sharing one. */
	components: Array<string | Family>;
};

export const isFamily = (item: string | Family): item is Family => typeof item !== "string";

/** Component names of a category item (one for a component, all members for a family). */
export const itemComponents = (item: string | Family): string[] =>
	isFamily(item) ? item.components : [item];

/**
 * One taxonomy, by the job a component does for the user. Every component has a
 * single home (where a developer would look first); closely related components
 * share a page as a family. Within a category the most common items come first.
 */
export const categories: Category[] = [
	{
		id: "layout",
		label: "Layout",
		description: "Arrange things on the page: stacks, grids, containers and page chrome.",
		components: [
			"Stack",
			"Group",
			"Flex",
			"Grid",
			"Columns",
			"Container",
			"Section",
			"Level",
			"Media",
			{
				family: "spacing",
				title: "Center & space",
				description: "Centre content or add fixed space.",
				components: ["Center", "Space", "Divider"],
			},
			"AspectRatio",
			"ScrollArea",
			"Splitter",
			"Masonry",
			"Reel",
			"Bleed",
			"AppShell",
			"PageHeader",
			"Hero",
			{
				family: "footer",
				title: "Footer",
				description: "Page and site footers.",
				components: ["Footer", "SiteFooter"],
			},
			{
				family: "sticky",
				title: "Sticky & affix",
				description: "Keep content in view while scrolling.",
				components: ["Sticky", "StickyBar", "Affix"],
			},
		],
	},
	{
		id: "surfaces",
		label: "Surfaces",
		description: "Containers with a visual boundary that group related content.",
		components: [
			"Card",
			"Box",
			"Panel",
			{
				family: "paper",
				title: "Paper & tiles",
				description: "Plain surfaces and tile layouts.",
				components: ["Paper", "Tile", "Block", "Inset"],
			},
		],
	},
	{
		id: "typography",
		label: "Text & icons",
		description: "Headings, body text, inline emphasis, formatted values and icons.",
		components: [
			{
				family: "title",
				title: "Title",
				description: "Headings with a separate visual size and outline level.",
				components: ["Title", "Subtitle", "Heading"],
			},
			{
				family: "text",
				title: "Text & prose",
				description: "Body text and long-form content.",
				components: ["Text", "Prose", "Article", "Quote"],
			},
			"Anchor",
			{
				family: "highlighting",
				title: "Mark & highlight",
				description: "Mark a span you choose, or every match of a search term.",
				components: ["Mark", "Highlight"],
			},
			{
				family: "truncation",
				title: "Truncate & leader",
				description: "Fit text into limited space.",
				components: ["Truncate", "Leader"],
			},
			{
				family: "formatted",
				title: "Formatted values",
				description: "Numbers, relative times and countdowns.",
				components: ["NumberFormatter", "RelativeTime", "Countdown"],
			},
			"VisuallyHidden",
			{
				family: "icon",
				title: "Icon",
				description: "The built-in icon set.",
				components: ["Icon", "IconBadge"],
			},
		],
	},
	{
		id: "actions",
		label: "Actions",
		description: "Trigger something: buttons and toolbars.",
		components: [
			{
				family: "button",
				title: "Button",
				description: "Buttons, including loading, confirming and unstyled variants.",
				components: ["Button", "LoadingButton", "ConfirmButton", "UnstyledButton"],
			},
			"ButtonGroup",
			"SplitButton",
			{
				family: "icon-buttons",
				title: "Icon buttons",
				description: "Compact buttons with just an icon.",
				components: ["ActionIcon", "CloseButton", "FloatingActionButton"],
			},
			{
				family: "copy",
				title: "Copy & share",
				description: "Copy a value or share a link.",
				components: ["CopyButton", "CopyId", "ShareButton"],
			},
			{
				family: "toolbars",
				title: "Toolbars",
				description: "Groups of related actions.",
				components: ["CommandBar", "FloatingToolbar", "BulkBar"],
			},
		],
	},
	{
		id: "text-input",
		label: "Text input",
		description: "Fields the user types a value into.",
		components: [
			"TextInput",
			"TextArea",
			{
				family: "number",
				title: "Number input",
				description: "Numbers and quantities with steppers.",
				components: ["NumberInput", "QuantityInput"],
			},
			{
				family: "password",
				title: "Password",
				description: "Password entry and strength feedback.",
				components: ["PasswordInput", "PasswordStrength"],
			},
			"SearchInput",
			"PinInput",
			"TagsInput",
			"InputGroup",
			"InlineEdit",
			"JsonInput",
			{
				family: "secret",
				title: "Secret & copy fields",
				description: "Read-only values to reveal or copy.",
				components: ["SecretField", "CopyField"],
			},
		],
	},
	{
		id: "selection",
		label: "Selection",
		description: "Choose from options: checkboxes, radios, selects, chips, toggles and sliders.",
		components: [
			{
				family: "checkbox",
				title: "Checkbox",
				description: "Single checkboxes and checkbox groups.",
				components: ["Checkbox", "CheckboxGroup", "Checklist"],
			},
			"RadioGroup",
			"Switch",
			{
				family: "select",
				title: "Select",
				description: "Pick one or many options from a list.",
				components: ["Select", "NativeSelect", "MultiSelect", "Autocomplete"],
			},
			"ChoiceCard",
			{
				family: "chips",
				title: "Chips",
				description: "Toggleable chips.",
				components: ["Chip", "ChipGroup"],
			},
			{
				family: "segmented",
				title: "Segmented & toggle group",
				description: "Pick one (or several) of a few options.",
				components: ["Segmented", "ToggleGroup"],
			},
			{
				family: "sliders",
				title: "Sliders",
				description: "Pick a value, a range or an angle.",
				components: ["Slider", "RangeSlider", "AngleSlider"],
			},
			"Rating",
			"TransferList",
			{
				family: "preferences",
				title: "Preference toggles",
				description: "View, density, theme and language switches.",
				components: ["ViewToggle", "DensityToggle", "ThemeToggle", "LocaleSwitcher"],
			},
		],
	},
	{
		id: "pickers",
		label: "Date, time & colour",
		description: "Pick dates, times and colours.",
		components: [
			{
				family: "dates",
				title: "Date pickers",
				description: "Dates, ranges, months and years.",
				components: [
					"DatePicker",
					"DateRangePicker",
					"DateInput",
					"Calendar",
					"MonthPicker",
					"YearPicker",
				],
			},
			{
				family: "time",
				title: "Time pickers",
				description: "Times of day.",
				components: ["TimeInput", "TimePicker"],
			},
			{
				family: "colour",
				title: "Colour",
				description: "Colour inputs, pickers and swatches.",
				components: ["ColorInput", "ColorPicker", "ColorSwatch"],
			},
		],
	},
	{
		id: "files",
		label: "Files & uploads",
		description: "Choose, drop, upload and show files.",
		components: [
			{
				family: "file-inputs",
				title: "File inputs",
				description: "Choose or drop files.",
				components: ["FileInput", "FileButton", "Dropzone"],
			},
			{
				family: "file-items",
				title: "File items",
				description: "Uploads in progress and attached files.",
				components: ["UploadItem", "FileCard"],
			},
		],
	},
	{
		id: "forms",
		label: "Forms",
		description: "Structure a form: labels, help and errors, sections, footers and settings rows.",
		components: [
			{
				family: "field",
				title: "Form field",
				description: "Label, control, help and error text, linked for assistive tech.",
				components: ["FormField", "Label"],
			},
			{
				family: "form-sections",
				title: "Form sections",
				description: "Group related fields.",
				components: ["FormSection", "FormArea", "Fieldset"],
			},
			"FormFooter",
			{
				family: "settings",
				title: "Settings rows",
				description: "Label + control rows for settings pages.",
				components: ["SettingsRow", "ToggleRow"],
			},
			"DangerZone",
			"WizardNav",
		],
	},
	{
		id: "navigation",
		label: "Navigation",
		description: "Move between pages, sections and steps.",
		components: [
			"Navbar",
			{
				family: "sidebar",
				title: "Sidebar navigation",
				description: "Vertical navigation lists.",
				components: ["SidebarNav", "NavLink"],
			},
			"Breadcrumb",
			"Tabs",
			"Steps",
			{
				family: "pagination",
				title: "Pagination",
				description: "Move through pages of content.",
				components: ["Pagination", "DotPagination", "NextPrev", "BackLink"],
			},
			{
				family: "subnav",
				title: "Sub-navigation",
				description: "Secondary and icon navigation.",
				components: ["Subnav", "Iconnav", "BottomNav"],
			},
			"Burger",
			{
				family: "on-this-page",
				title: "On this page",
				description: "Links to sections of the current page.",
				components: ["TableOfContents", "ScrollSpy"],
			},
			{
				family: "page-helpers",
				title: "Skip link & to top",
				description: "Jump to content or back to the top.",
				components: ["SkipLink", "ToTop"],
			},
		],
	},
	{
		id: "overlays",
		label: "Overlays",
		description: "Content layered above the page: dialogs, drawers, popovers, menus and tooltips.",
		components: [
			"Modal",
			"ConfirmDialog",
			{
				family: "drawer",
				title: "Drawer",
				description: "Panels that slide in from an edge.",
				components: ["Drawer", "BottomSheet"],
			},
			{
				family: "popover",
				title: "Popover & hover card",
				description: "Floating panels anchored to a trigger.",
				components: ["Popover", "HoverCard"],
			},
			"Tooltip",
			{
				family: "menu",
				title: "Menu",
				description: "Action menus and context menus.",
				components: ["Menu", "ContextMenu"],
			},
			"Spotlight",
			"Lightbox",
			"Overlay",
		],
	},
	{
		id: "feedback",
		label: "Feedback",
		description:
			"Tell the user what happened: alerts, notifications, banners and empty or error states.",
		components: [
			{
				family: "alert",
				title: "Alert & callout",
				description: "Inline messages in the page.",
				components: ["Alert", "Callout"],
			},
			{
				family: "notification",
				title: "Notification & toast",
				description: "Messages that appear and go.",
				components: ["Notification", "ToastHost"],
			},
			"Message",
			{
				family: "banners",
				title: "Banners",
				description: "Full-width announcements.",
				components: ["Banner", "AnnouncementBar", "UpgradeBanner"],
			},
			{
				family: "notices",
				title: "Consent & offline notices",
				description: "Persistent notices about the session.",
				components: ["CookieConsent", "OfflineNotice"],
			},
			{
				family: "empty",
				title: "Empty & error states",
				description: "What to show when there is nothing, or something failed.",
				components: ["EmptyState", "NoResults", "ErrorState"],
			},
		],
	},
	{
		id: "progress",
		label: "Progress & loading",
		description: "Show that work is in progress, or load more.",
		components: [
			"Spinner",
			{
				family: "progress",
				title: "Progress",
				description: "Bars, steps, rings and semicircles.",
				components: ["Progress", "SteppedProgress", "RingProgress", "SemiCircleProgress"],
			},
			"NavigationProgress",
			"LoadingOverlay",
			{
				family: "skeleton",
				title: "Skeleton",
				description: "Placeholders while content loads.",
				components: ["Skeleton", "SkeletonText", "SkeletonCard"],
			},
			{
				family: "load-more",
				title: "Load more",
				description: "Incremental loading of lists.",
				components: ["LoadMore", "InfiniteScroll"],
			},
		],
	},
	{
		id: "status",
		label: "Badges & status",
		description: "Label and mark state: badges, tags, status dots and live indicators.",
		components: [
			"Badge",
			"Tag",
			{
				family: "status-dot",
				title: "Status dot & indicator",
				description: "Small marks for state and counts.",
				components: ["StatusDot", "Indicator"],
			},
			{
				family: "count-badges",
				title: "Live & unread badges",
				description: "Live state and unread counts.",
				components: ["LiveBadge", "UnreadBadge"],
			},
			{
				family: "semantic-badges",
				title: "Semantic badges",
				description: "Environment, version, role, priority and severity.",
				components: ["EnvBadge", "VersionTag", "RoleBadge", "PriorityBadge", "SeverityBadge"],
			},
			{
				family: "save-status",
				title: "Save & sync status",
				description: "Autosave and sync state of a document.",
				components: ["SyncStatus", "AutosaveIndicator", "LastSaved"],
			},
			"TypingIndicator",
		],
	},
	{
		id: "data",
		label: "Data display",
		description: "Present records: tables, lists, trees, boards, and disclosure of detail.",
		components: [
			{
				family: "table",
				title: "Table",
				description: "Static and sortable data tables.",
				components: ["Table", "DataTable"],
			},
			{
				family: "description",
				title: "Description list",
				description: "Label / value pairs.",
				components: ["DescriptionList", "PropertyList"],
			},
			{
				family: "list",
				title: "List",
				description: "Plain and grouped lists.",
				components: ["List", "ListGroup"],
			},
			"Timeline",
			"Tree",
			"SortableList",
			"KanbanBoard",
			{
				family: "disclosure",
				title: "Accordion & disclosure",
				description: "Show and hide detail.",
				components: ["Accordion", "Collapse", "Spoiler", "Details"],
			},
			{
				family: "filtering",
				title: "Filtering",
				description: "Filter bars, active-filter chips and result counts.",
				components: ["FilterBar", "FilterChip", "ResultCount"],
			},
		],
	},
	{
		id: "charts",
		label: "Charts & metrics",
		description: "Numbers and their shape: stats, trends, small charts, meters and gauges.",
		components: [
			{
				family: "stats",
				title: "Stats",
				description: "Key numbers with labels and trends.",
				components: ["Stat", "StatCard", "Metric", "Trend", "CountUp"],
			},
			{
				family: "sparklines",
				title: "Sparklines",
				description: "Word-sized charts.",
				components: ["Sparkline", "SparkBar"],
			},
			"BarList",
			"DonutChart",
			"Heatmap",
			{
				family: "meters",
				title: "Meters & gauges",
				description: "A value within a range.",
				components: ["Meter", "Gauge", "UsageMeter", "StorageBar"],
			},
			"UptimeBar",
		],
	},
	{
		id: "media",
		label: "Media",
		description: "Images, video, galleries and device frames.",
		components: [
			{
				family: "image",
				title: "Image",
				description: "Images, figures and background images.",
				components: ["Image", "Figure", "BackgroundImage"],
			},
			"VideoFrame",
			{
				family: "gallery",
				title: "Galleries",
				description: "Carousels, thumbnails and image grids.",
				components: ["Carousel", "Thumbnav", "GalleryGrid"],
			},
			"BeforeAfter",
			{
				family: "logos",
				title: "Logo cloud & marquee",
				description: "Rows of logos and scrolling tickers.",
				components: ["LogoCloud", "Marquee"],
			},
			{
				family: "frames",
				title: "Device frames",
				description: "Browser and phone mock-ups.",
				components: ["BrowserFrame", "PhoneFrame"],
			},
		],
	},
	{
		id: "people",
		label: "People & social",
		description: "Users, accounts and conversations: avatars, profiles, comments and reactions.",
		components: [
			{
				family: "avatar",
				title: "Avatar",
				description: "Avatars, stacks and presence.",
				components: ["Avatar", "AvatarGroup", "PresenceAvatar"],
			},
			{
				family: "account",
				title: "Account switchers",
				description: "The signed-in user and organisation.",
				components: ["UserButton", "OrgSwitcher"],
			},
			{
				family: "profile",
				title: "Profiles & members",
				description: "Profile headers, member rows and invites.",
				components: ["ProfileHeader", "MemberRow", "InviteCard"],
			},
			{
				family: "conversation",
				title: "Comments & chat",
				description: "Conversations, mentions and reactions.",
				components: ["Comment", "ChatBubble", "Mention", "ReactionBar"],
			},
			{
				family: "feed",
				title: "Activity & inbox",
				description: "Feed and inbox items.",
				components: ["ActivityItem", "InboxItem"],
			},
			{
				family: "testimonials",
				title: "Testimonials & reviews",
				description: "Quotes and star reviews from customers.",
				components: ["Testimonial", "ReviewCard"],
			},
			"SocialLinks",
		],
	},
	{
		id: "developer",
		label: "Code & developer",
		description: "Code, keyboard shortcuts, logs, JSON, APIs and delivery pipelines.",
		components: [
			{
				family: "code",
				title: "Code",
				description: "Inline code and highlighted blocks.",
				components: ["Code", "CodeBlock", "Diff"],
			},
			{
				family: "keys",
				title: "Keyboard",
				description: "Keys and shortcuts.",
				components: ["Kbd", "Hotkey"],
			},
			{
				family: "terminal",
				title: "Terminal & logs",
				description: "Command output and log streams.",
				components: ["Terminal", "LogViewer"],
			},
			{
				family: "json",
				title: "JSON",
				description: "Read-only JSON views.",
				components: ["JsonViewer", "JsonTree"],
			},
			"FileTree",
			{
				family: "api",
				title: "API endpoints",
				description: "HTTP methods and endpoint rows.",
				components: ["EndpointRow", "HttpMethodBadge"],
			},
			{
				family: "delivery",
				title: "Builds & git",
				description: "Pipelines, build status, commits and branches.",
				components: ["Pipeline", "BuildStatus", "CommitChip", "BranchBadge"],
			},
			{
				family: "ops",
				title: "Status & changelog",
				description: "Service status and release notes.",
				components: ["ServiceStatus", "ChangelogItem"],
			},
		],
	},
	{
		id: "commerce",
		label: "Commerce & billing",
		description: "Products, carts, prices, plans and invoices.",
		components: [
			{
				family: "product",
				title: "Product & price",
				description: "Product tiles and prices.",
				components: ["ProductCard", "Price"],
			},
			{
				family: "cart",
				title: "Cart",
				description: "Cart lines and order totals.",
				components: ["CartLine", "OrderSummary"],
			},
			{
				family: "plans",
				title: "Plans",
				description: "Pricing cards and feature comparisons.",
				components: ["PricingCard", "FeatureList", "FeatureCompare"],
			},
			{
				family: "billing",
				title: "Billing",
				description: "Payment methods and invoices.",
				components: ["CreditCardPreview", "InvoiceRow"],
			},
		],
	},
	{
		id: "docs",
		label: "Documentation",
		description: "Build documentation pages like these.",
		components: [
			{
				family: "doc-pages",
				title: "Documentation pages",
				description: "Page, example block and sidebar menu.",
				components: ["DocPage", "DocExample", "DocMenu"],
			},
		],
	},
];

/** Sub-components documented on their parent's page (as "Parts"). */
export const parts: Record<string, string[]> = {
	Card: [
		"CardHeader",
		"CardHeaderTitle",
		"CardImage",
		"CardContent",
		"CardFooter",
		"CardFooterItem",
	],
	Panel: ["PanelHeading", "PanelTabs", "PanelTab", "PanelBlock"],
	Message: ["MessageHeader", "MessageBody"],
	Hero: ["HeroHead", "HeroBody", "HeroFoot"],
	Media: ["MediaLeft", "MediaContent", "MediaRight"],
	Article: ["ArticleTitle", "ArticleMeta"],
	Columns: ["Column"],
	Grid: ["GridItem"],
	Level: ["LevelLeft", "LevelRight", "LevelItem"],
	Table: ["Thead", "Tbody", "Tfoot", "Tr", "Th", "Td"],
	List: ["ListItem"],
	ListGroup: ["ListGroupItem"],
	Timeline: ["TimelineItem"],
	KanbanBoard: ["KanbanColumn", "KanbanCard"],
	Navbar: ["NavbarLink"],
	Tag: ["Tags"],
	Stat: ["StatGroup"],
	InputGroup: ["InputAddon"],
	FormField: ["Control", "Help"],
};

/**
 * Components that already have a hand-written showcase page (playground page id
 * → component). Their reference is appended there instead of a catalog entry.
 */
export const curatedPages: Record<string, string> = {
	button: "Button",
	box: "Box",
	tag: "Tag",
	badge: "Badge",
	progress: "Progress",
	notification: "Notification",
	icon: "Icon",
	title: "Title",
	table: "Table",
	image: "Image",
	breadcrumb: "Breadcrumb",
	card: "Card",
	dropdown: "Drawer",
	menu: "Menu",
	message: "Message",
	modal: "Modal",
	navbar: "Navbar",
	pagination: "Pagination",
	panel: "Panel",
	tabs: "Tabs",
	input: "TextInput",
	textarea: "TextArea",
	select: "Select",
	checkbox: "Checkbox",
	radio: "RadioGroup",
	switch: "Switch",
	columns: "Columns",
	container: "Container",
	hero: "Hero",
	level: "Level",
	section: "Section",
};
