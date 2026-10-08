---
"@arachnejs/ui": minor
---

`DataTable` grows what an admin console needs, all opt-in (tables without the new props render as before):

- Column layout: `width` (a CSS grid track such as `"9rem"`, `"2fr"` or `"minmax(8rem,1fr)"`; default `minmax(0, 1fr)`), `align` (`start` / `center` / `end`) and `sortable` (a sort button without `sortValue`, for server sorting; `false` hides it).
- Server sorting: `sort` (controlled; wins over internal state) and `manualSort` (rows render in the given order and a header click only calls `onSortChange`). The asc → desc → none cycle and `aria-sort` work in every mode, and the sort arrows are now a chevron icon with a faint hint on unsorted sortable headers.
- Row selection: `selectable`, `selected` (controlled ids), `onSelectionChange` and `selectionLabel`. A checkbox column with a "Select all" header (indeterminate when partial, acts on the rows shown and keeps other ids); selected rows get `data-selected`, `aria-selected="true"` and an accent-soft background.
- Row links: `rowHref` makes a whole row clickable through a stretched link in the first data cell; checkboxes, buttons and links in cells stay clickable above it, and the row shows a hover style and a focus ring.
- `stack`: below a 40rem table width (container query) each row becomes a card whose cells show their column header (`data-label`); "Select all" stays available.
- New slots `select` (checkbox cells) and `link` (row link).
