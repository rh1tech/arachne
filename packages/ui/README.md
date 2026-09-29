# @arachne/ui

JSX UI primitives for Arachne ([ADR 0013](../../docs/adr/0013-ui-forms.md)).

Catalog spans Bulma / Mantine / Bootstrap / UIkit-style building blocks:

- **Inputs & forms** — Button, TextInput, Select, Checkbox, Switch, Slider, Pin, … + FormField / FormSection
- **Layout** — Stack, Columns, Grid, Container, Section, Level, Group, Flex, Center, Tile
- **Surfaces** — Card, Panel, Paper, Box, Message, Hero, Footer, Media, Article, Figure, Image
- **Feedback** — Alert, Toast, Progress, Spinner, Skeleton, EmptyState, Indicator, LoadingOverlay
- **Overlay** — Modal, Drawer, Menu, Popover, Tooltip, Tabs, Accordion, Pagination
- **Navigation** — Navbar, AppShell, SidebarNav, Breadcrumb, Steps, NavLink, Affix
- **Icons** — built-in SVG `Icon` set, `IconBadge`, `ActionIcon`, `CloseButton`, `Burger`
- **Data / nav** — `Tree`, `Carousel`, `Calendar`, `DatePicker`, `Subnav`, `Iconnav`, `Dropzone`, `FileButton`
- **Extras** — `HoverCard`, `ColorSwatch`, `Highlight`, `Sticky`, `BackgroundImage`, `NavigationProgress`, `NumberFormatter`
- **Advanced** — `ContextMenu`, `ColorPicker`, `Lightbox`, `TransferList`, `Spotlight`, `ConfirmDialog`
- **Pickers / charts** — `MonthPicker`, `DateRangePicker`, `TimePicker`, `SemiCircleProgress`, `Sparkline`, `CodeBlock`, `Countdown`, `ToTop`
- **Composite** — `ButtonGroup`, `SplitButton`, `ToggleGroup`, `AvatarGroup`, `Notification`, `FAB`, `BottomNav`, `SortableList`, `Splitter`, `DataTable`, `YearPicker`, `PasswordStrength`, `Meter`, `Comment`, `Thumbnav`, `Leader`, `Marquee`, `BarList`, `SkipLink`
- **Patterns** — `BottomSheet`, `Banner`, `PageHeader`, `UserButton`, `ThemeToggle`, `ChoiceCard`, `ChatBubble`, `JsonViewer`, `RelativeTime`, `CountUp`, `ScrollSpy`, `BeforeAfter`, `LoadMore`, `ActivityItem`, `Masonry`, `FilterBar`, `StatusDot`
- **More** — `CookieConsent`, `OfflineNotice`, `Hotkey`, `InlineEdit`, `CopyField`, `Checklist`, `PricingCard`, `FeatureList`, `StatGroup`, `DotPagination`, `BackLink`, `NextPrev`, `FileCard`, `VideoFrame`, `SteppedProgress`, `Heatmap`, `AngleSlider`, `KanbanBoard`, `Prose`, `Bleed`, `Inset`
- **Extra** — `PresenceAvatar`, `Truncate`, `Terminal`, `Diff`, `Trend`, `DonutChart`, `SparkBar`, `SkeletonText`/`SkeletonCard`, `LoadingButton`, `ConfirmButton`, `SettingsRow`, `ToggleRow`, `DangerZone`, `StickyBar`, `SiteFooter`, `SocialLinks`, `Reel`, `GalleryGrid`, `Testimonial`, `ReviewCard`, `LogoCloud`, `UploadItem`, `WizardNav`, `FormFooter`, `Details`, `Metric`
- **App** — `AnnouncementBar`, `CommandBar`, `TableOfContents`, `PropertyList`, `StatCard`, `QuantityInput`, `Price`, `ProductCard`, `CartLine`, `OrderSummary`, `ShareButton`, `CopyId`, `EnvBadge`, `LocaleSwitcher`, `OrgSwitcher`, `InboxItem`, `ReactionBar`, `Mention`, `BrowserFrame`, `PhoneFrame`, `FeatureCompare`, `ViewToggle`, `ResultCount`, `FilterChip`, `BulkBar`, `LiveBadge`, `UnreadBadge`, `SecretField`, `InfiniteScroll`
- **Ops** — `Callout`, `ChangelogItem`, `VersionTag`, `HttpMethodBadge`, `EndpointRow`, `JsonTree`, `LogViewer`, `ServiceStatus`, `UptimeBar`, `UsageMeter`, `UpgradeBanner`, `ProfileHeader`, `MemberRow`, `RoleBadge`, `PriorityBadge`, `SeverityBadge`, `CommitChip`, `BranchBadge`, `BuildStatus`, `Pipeline`, `SyncStatus`, `AutosaveIndicator`, `LastSaved`, `FloatingToolbar`, `DensityToggle`, `NoResults`, `ErrorState`, `CreditCardPreview`, `InvoiceRow`, `StorageBar`, `FileTree`, `Gauge`, `InviteCard`
- **Docs** — `DocMenu` (sidebar catalog), `DocPage` + `DocExample` (title, description, live preview, code)
- **Theming** — `applyPalette` / `applyRadius` / `paletteStyle` / `palettes` (named presets + radius scale: none / sm / lg)
- **Utilities** — spacing (`m`/`p`/`gap`), color (`textColor`/`bgColor`), visibility helpers via `utils`

```ts
import {
  Card, CardHeader, CardContent, Hero, HeroBody, Footer, Media,
  Message, MessageHeader, MessageBody, Panel, Tile,
  Icon, IconBadge, Group, Timeline, TimelineItem,
  applyPalette, applyRadius, palettes, paletteStyle,
  m, p, textColor, util,
} from "@arachne/ui";
import "@arachne/ui/styles.css";

applyPalette("graphite"); // or "harbor" | "lagoon" | "meadow" | …
applyRadius("sm"); // none | sm | lg — sm is default
// scoped: <div style={paletteStyle("lagoon")}>…</div>
```

## Customization

Four levels, lightest first (see [ADR 0014](../../docs/adr/0014-ui-customization.md)):

```tsx
// 1. Tokens: global, scoped, or per component
<div style={{ "--a-accent": "#7c3aed", "--a-radius": "12px" }}>…</div>
<Modal styles={{ panel: { "--a-modal-width": "40rem" } }} … />
document.documentElement.dataset.theme = "dark"; // or "system"

// 2. Plain CSS always wins; the kit lives in @layer arachne.*
.a-btn[data-variant="solid"] { border-radius: 999px; }

// 3. Per instance: forwarded attrs, slot classes/styles, content slots, unstyled
<Button data-track="save" aria-label="Save" start={<Icon name="check" />}>Save</Button>
<Modal classes={{ panel: "glass", footer: "sticky" }} … />
<Popover trigger={(t) => <MyButton {...t.attrs}>More</MyButton>} … />
<Tabs unstyled classes={{ tab: "my-tab" }} … />   // state via data-state="active"

// 4. App theme: defaults and classes for every instance
configureUI({ components: { Button: { defaultProps: { size: "sm" } }, Modal: { classes: { panel: "glass" } } } });
```

Motion: overlays run enter/exit keyframes keyed on `data-state="open|closed"`.
Everything collapses under `prefers-reduced-motion`.

Playground tabs: **Controls**, **Overlay**, **Data**, **Layout** (shell + columns/grid + widgets).
