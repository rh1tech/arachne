---
"@arachnejs/forms": minor
---

Form ids and submit handling.

- **Breaking:** fields render `id="form-N-name"`, via `form.fieldId(name)` and the new `createForm({ id })`, instead of `id="name"`. Two forms on one page no longer produce duplicate ids. The ids are SSR/hydration-stable.
- Nested validation errors keep their dotted path, e.g. `address.city`.
- `submit()` is not re-entrant, and an error thrown by `onSubmit` is captured in `errors._form`.
- `reset()` clears errors.
- `FormApi` gains `id` and `fieldId`.
