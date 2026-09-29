# @arachne/forms

Schema-bound forms on Arachne signals + `@arachne/ui`
([ADR 0013](../../docs/adr/0013-ui-forms.md)).

```ts
import {
  createForm, Form, TextField, SelectField, CheckboxField,
  FormWhen, FormColumns, FormColumn, FormSection, FormArea,
} from "@arachne/forms";
import { s } from "@arachne/schema";

const form = createForm({
  schema: s.object({
    name: s.string({ min: 1 }),
    kind: s.string({ min: 1 }),
    company: s.string(),
    agree: s.boolean(),
  }),
  initial: { name: "", kind: "personal", company: "", agree: false },
  onSubmit: async (values) => console.log(values),
});
```

```tsx
<Form form={form} submitLabel="Save">
  <FormSection title="Profile" description="Basic identity">
    <FormColumns>
      <FormColumn size={6}>
        <TextField form={form} name="name" label="Name" />
      </FormColumn>
      <FormColumn size={6}>
        <SelectField
          form={form}
          name="kind"
          label="Account type"
          options={[
            { value: "personal", label: "Personal" },
            { value: "business", label: "Business" },
          ]}
        />
      </FormColumn>
    </FormColumns>
  </FormSection>

  <FormWhen form={form} match={(v) => v.kind === "business"}>
    <FormArea title="Business details">
      <TextField form={form} name="company" label="Company" />
    </FormArea>
  </FormWhen>

  <CheckboxField form={form} name="agree" label="I agree" />
</Form>
```

- **`FormWhen`** — show/hide fields from related values (signal-reactive).
- **`FormColumns` / `FormColumn`** — multi-column rows (Bulma-style sizes).
- **`FormSection` / `FormArea`** — titled regions (re-exported from `@arachne/ui`).
