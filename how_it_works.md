# Document Variable System — How It Works

## Variable Types

Every `[variable_key]` tag found in a template falls into exactly one of four categories:

---

### 1. Auto Variables (System-Computed)

Derived entirely from company data at generation time. Cannot be manually set per-company because they are always computed fresh.

**Examples:** `[company_name]`, `[company_name_np]`, `[owner_type]`, `[owner_count]`, `[owner_names]`, `[witness_names]`, `[date_generated]`, `[objective_texts_inline]`, etc.

- Defined in `COMPANY_VARIABLE_DEFINITIONS` in `companyVariables.ts`
- Auto-filled from the selected company's data (via `buildCompanyRuntimeVariableValues`)
- **Editable at generation time** — but changes are NOT saved to DB; they only affect this document's `variables` JSON field
- **No "Save to DB" button** (meaningless for auto vars)

---

### 2. Manual Variables (DB-Stored)

Custom, user-defined variables stored in the `variables` table, linked to companies via `company_variable_values`. Appear in the Variables page.

**Examples:** `[registration_number]`, `[ward_number]`, `[fiscal_year]`, etc.

- Matched against the `variables` DB table at template upload → saved in `template.matchedVariables`
- Auto-filled with the company's saved value from `company_variable_values`
- **Editable at generation time** — changes are NOT auto-saved to DB (stored only in `generatedDocument.variables` JSON)
- **"Save to DB" button** — clicking it saves the edited value back to `company_variable_values` for this company so future documents auto-fill it

---

### 3. Template-Only Variables (Unknown/New)

Appear in the template as `[variable_key]` but are NOT in `COMPANY_VARIABLE_DEFINITIONS` AND NOT in the manual `variables` DB table.

- Detected during template upload → stored in `template.detectedKeys` (NOT in `matchedVariables`)
- No auto-fill available
- **User must enter a value at generation time**
- **"Add as Manual Variable" button** → clicking it:
  1. Creates the variable in the `variables` table
  2. Saves the entered value as this company's value in `company_variable_values`
  3. On next generation, it will auto-fill as a Manual Variable

---

### 4. Loop Variables (Auto, inside loop blocks)

Tags like `[owner_name]`, `[witness_citizenship]` that appear inside `[#owners_list]...[/owners_list]` or `[#witnesses_list]...[/witnesses_list]` blocks.

- Built fresh from company owners/witnesses at generation time
- Shown as a **read-only preview** in the sidebar (one card per owner/witness)
- Not editable individually — edit via company owner/witness data

---

## Document Generation Flow

```
Select Company + Template
        |
        v
Parse template.detectedKeys + template.matchedVariables
        |
        |-- Auto Variables    --> fill from buildCompanyRuntimeVariableValues(company)
        |                        (editable, not saved back to DB)
        |
        |-- Manual Variables  --> fill from company_variable_values
        |                        (editable, "Save to DB" saves back to company_variable_values)
        |
        |-- Template-Only     --> show empty input field
        |                        (fill at run time, "Add as Manual Variable" saves to DB)
        |
        |-- Loop Variables    --> fill from owners/witnesses arrays
                                 (read-only preview, not editable here)
        |
        v
User edits values (no edits go to DB unless explicitly clicked)
        |
        v
Click "Generate Document"
        |
        v
createDocumentAction({
  companyId, templateId,
  variables: { ...allResolvedValues },         <- stored in generatedDocument.variables JSON
  templateData: { owners_list, witnesses_list } <- built fresh from company DB
})
        |
        v
renderDocxTemplate:
  - templateData loop arrays set first (never overwritten by scalar variables)
  - scalar variables merged on top
  - produces .docx saved to /uploads/generated/{id}.docx
```

---

## What Gets Saved Where

| Action | DB Effect |
|---|---|
| Edit an auto variable at generation | Only in `generatedDocument.variables` JSON |
| Edit a manual variable at generation | Only in `generatedDocument.variables` JSON |
| Click "Save to DB" on a manual variable | Updates `company_variable_values` for this company |
| Click "Add as Manual Variable" on template-only | Creates `variables` record + `company_variable_values` |
| Generate document | Creates `generated_documents` record, writes `.docx` to disk |

---

## Current Implementation Status

| Feature | Status |
|---|---|
| Auto variables: pre-filled, editable | Working |
| Auto variables: no "Save to DB" | Working |
| Manual variables: pre-filled from company_variable_values | Working |
| Manual variables: editable at generation | Working |
| Manual variables: "Save to DB" button | Working |
| Template-only variables: show empty input | Working |
| Template-only variables: "Add as Manual Variable" | MISSING - needs implementation |
| Loop preview (owners/witnesses read-only cards) | Working |
| Loop data fills .docx correctly | Fixed |
| FK constraint error on create document | Fixed |
| Document-run edits do NOT modify company_variable_values | Fixed |
