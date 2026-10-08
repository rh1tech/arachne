# @arachnejs/forms

## 0.4.1

### Patch Changes

- Updated dependencies [61083ca]
  - @arachnejs/render@0.4.1
  - @arachnejs/ui@0.4.1
  - @arachnejs/mcp@0.4.1
  - @arachnejs/schema@0.4.1
  - @arachnejs/signals@0.4.1

## 0.4.0

### Patch Changes

- @arachnejs/mcp@0.4.0
- @arachnejs/render@0.4.0
- @arachnejs/schema@0.4.0
- @arachnejs/signals@0.4.0
- @arachnejs/ui@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [d5444be]
- Updated dependencies [eb8fb55]
  - @arachnejs/ui@0.3.0
  - @arachnejs/mcp@0.3.0
  - @arachnejs/render@0.3.0
  - @arachnejs/schema@0.3.0
  - @arachnejs/signals@0.3.0

## 0.2.0

### Minor Changes

- 2482d11: `TextInput` (and `TextField` in forms) takes an optional `icon`: a leading adornment drawn inside the field, decorative and `aria-hidden`. `TextField` also forwards `autocomplete`. New icons: `key`, `unlink`, `ban`, `logout`, `smartphone`, `shield`.

### Patch Changes

- Updated dependencies [f0d5ac3]
- Updated dependencies [2482d11]
  - @arachnejs/ui@0.2.0
  - @arachnejs/mcp@0.2.0
  - @arachnejs/render@0.2.0
  - @arachnejs/schema@0.2.0
  - @arachnejs/signals@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [b6e210c]
  - @arachnejs/render@0.1.1
  - @arachnejs/ui@0.1.1
  - @arachnejs/mcp@0.1.1
  - @arachnejs/schema@0.1.1
  - @arachnejs/signals@0.1.1

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
