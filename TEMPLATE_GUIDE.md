# Template Guide

This app uses DOCX templates with `{{variable_name}}` placeholders.

Templates are uploaded from the **Templates** page and then used when generating documents.

## How template matching works

When a DOCX file is uploaded, the app scans the document for placeholders wrapped in double braces, such as:

```text
{{company_name}}
{{owner_name}}
{{owner_name_1}}
```

The generator replaces each placeholder with the matching company value before saving the final document.

## Single owner template

Use this format when the company has one owner.

Recommended placeholders:

```text
{{company_name}}
{{registration_date}}
{{owner_type}}
{{owner_count}}
{{owner_name}}
{{owner_address}}
{{witness_name}}
{{witness_address}}
{{objective_texts}}
{{objective_texts_list}}
```

Example signing section:

```text
Owner:
{{owner_name}}

Address:
{{owner_address}}

Signature: __________________
```

## Multiple owner template

Use this format when the company has more than one owner.

For repeating owner sections, you can use a loop in the DOCX template:

```text
{{#owners_list}}
SN: {{sn}}
Owner: {{owner_name}}
Address: {{owner_address}}
Share: {{owner_share_percentage}}
Signature: __________________
{{/owners_list}}
```

In Word, put the header in its own row, then put the loop in a single body row so that row gets repeated.

Example table layout:

```text
| SN | Owner Name | Address | Share | Signature |
| {{#owners_list}} {{sn}} | {{owner_name}} | {{owner_address}} | {{owner_share_percentage}} | Signature: __________________ {{/owners_list}} |
```

The important part is that `{{#owners_list}}` starts in the first cell of the row and `{{/owners_list}}` ends in the last cell of the same row.

The same pattern applies to witnesses:

```text
{{witness_name_1}}
{{witness_address_1}}
{{witness_name_2}}
{{witness_address_2}}
```

Loop version for witnesses:

```text
{{#witnesses_list}}
SN: {{sn}}
Witness: {{witness_name}}
Address: {{witness_address}}
Signature: __________________
{{/witnesses_list}}
```

Use the same table-row pattern for witnesses if you want a repeatable witness section.

Example multi-owner signing section:

```text
Owner 1: {{owner_name_1}}
Address: {{owner_address_1}}
Share: {{owner_share_percentage_1}}
Signature: __________________

Owner 2: {{owner_name_2}}
Address: {{owner_address_2}}
Share: {{owner_share_percentage_2}}
Signature: __________________
```

## Important limitation for signature rows

The current generator replaces placeholders, but it does not automatically create new Word table rows on its own.

That means:

* If you want a fixed number of signers, create one row per expected slot in the template and use indexed placeholders like `{{owner_name_1}}`, `{{owner_name_2}}`, and so on.
* If you need the table to grow automatically for any number of owners, use the loop form with `{{#owners_list}}...{{/owners_list}}`.
* The same loop form works for witnesses with `{{#witnesses_list}}...{{/witnesses_list}}`.

## Suggested template structure

For most documents, keep the template in this order:

1. Company details
2. Owner details
3. Witness details
4. Objectives
5. Signature section

## Practical rules

* Use exactly the placeholder key names supported by the app.
* Keep placeholders inside normal text runs in Word.
* Save the template as `.docx`.
* Test the template with both a single-owner company and a multiple-owner company before using it in production.

## Common placeholders

| Key | Meaning |
| --- | --- |
| `company_name` | Company name |
| `registration_date` | Registration date |
| `owner_type` | `SINGLE` or `MULTIPLE` |
| `owner_count` | Number of owners |
| `owner_name` | Single-owner name |
| `owner_address` | Single-owner address |
| `owners_list` | Repeatable owner rows |
| `witnesses_list` | Repeatable witness rows |
| `objective_texts` | Objectives as a comma-separated line |
| `objective_texts_list` | Objectives as a numbered list |

## Best practice for Word tables

If your document uses a signature table and the number of owners or witnesses is unknown, build one table row in Word and wrap that row with a loop section.

Use `owners_list` for owners and `witnesses_list` for witnesses. Inside either loop, `{{sn}}` is optional and gives you `1, 2, 3, ...` when you want numbering.