# @arachnejs/forms

## 0.1.0

### Minor Changes

- 1c29d58: Form ids and submit handling.

  - **Breaking:** fields render `id="form-N-name"`, via `form.fieldId(name)` and the new `createForm({ id })`, instead of `id="name"`. Two forms on one page no longer produce duplicate ids. The ids are SSR/hydration-stable.
  - Nested validation errors keep their dotted path, e.g. `address.city`.
  - `submit()` is not re-entrant, and an error thrown by `onSubmit` is captured in `errors._form`.
  - `reset()` clears errors.
  - `FormApi` gains `id` and `fieldId`.

### Patch Changes

- Updated dependencies [e5b07e4]
- Updated dependencies [1c29d58]
- Updated dependencies [1c29d58]
- Updated dependencies [b5613d7]
- Updated dependencies [7d5880f]
  - @arachnejs/render@0.1.0
  - @arachnejs/signals@0.1.0
  - @arachnejs/ui@0.1.0
  - @arachnejs/schema@0.1.0
  - @arachnejs/mcp@0.1.0
