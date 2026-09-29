# ADR 0013: @arachne/ui + @arachne/forms

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Arachne core

## Context

Playground demos prove signals, JSX, router, and DB. Applications need a
reusable component layer and schema-bound forms — without adopting React’s
component model.

## Decision

1. **`@arachne/ui`** — headless-ish primitives compiled as Arachne JSX:
   inputs (`Button`, `TextInput`, `TextArea`, `Select`, `Checkbox`, `Switch`,
   `RadioGroup`, `FileInput`, `InputGroup`, `SearchInput`, `NumberInput`,
   `Slider`, plus password/pin/color/date/time/json/native-select/chips/rating/
   range/multi-select/tags/autocomplete), structure (`Label`, `Field`,
   `FormField`, `Control`, `Help`, `FormSection`, `FormArea`, `Fieldset`,
   `Stack`, `Columns`/`Column`, `Grid`/`GridItem`, `Container`, `Section`,
   `Level`, `Group`, `Flex`, `Center`, `Tile`, `Text`, `Heading`, `Title`, `Box`,
   `Paper`, `Card` (+ header/image/content/footer), `Panel`, `Message`, `Hero`,
   `Footer`, `Media`, `Article`, `Figure`, `Image`, `Divider`, `Table`, `Tag`,
   `Skeleton`, `Avatar`, `EmptyState`, `Kbd`, `Code`, `Stat`, `DescriptionList`,
   `List`/`ListGroup`, `Timeline`, `NavLink`, `Indicator`, `Affix`, `Overlay`,
   `LoadingOverlay`, `Spoiler`, `Collapse`, `Mark`, `Quote`, `RingProgress`,
   `ScrollArea`, `Anchor`, `Icon`/`IconBadge`/`ActionIcon`/`CloseButton`, plus
   spacing/color/visibility utils (`m`/`p`/`gap`/`textColor`/`bgColor`/`util`)),
   feedback (`Badge`, `Alert`, `Spinner`, `Progress`, `createToaster` / `ToastHost`,
   `CopyButton`), overlays (`Modal`, `Drawer`, `Tabs`, `Menu`, `Popover`,
   `Breadcrumb`, `Pagination`, `Accordion`, `Tooltip`), flow (`Steps`,
   `Segmented`), and shell (`createNavbarController` + recursive `Navbar`,
   `AppShell`, `SidebarNav`). Token sheet (`--a-*`) lives in `styles.css`.
2. **`@arachne/forms`** — `createForm({ schema, initial, onSubmit })` holds
   signal-backed values/errors; field binders (`TextField`, `TextAreaField`,
   `SelectField`, `CheckboxField`, `SwitchField`, `RadioField`) plus layout/
   relationship helpers (`Form`, `FormWhen` with `match`, `FormColumns`/`FormColumn`,
   `FormSection`, `FormArea`) bind UI to `@arachne/schema` validation on submit.
3. UI depends on `render` (runtime) as well as `signals` / `jsx`. Boundaries
   updated accordingly.
4. No design-system megakit in Phase 0 — enough to build real screens and
   grow into `table` / `admin`.

## Alternatives considered

1. **Wrap Solid UI / Ark** — rejected; wrong package boundary.
2. **CSS-in-JS runtime** — rejected; token CSS file is enough for now.

## Consequences

- Apps import `@arachne/ui/styles.css` (or copy tokens).
- Form state is Arachne signals — works with the existing reactivity model.
