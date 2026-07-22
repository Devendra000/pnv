import type { Company } from '@/lib/types';

export type CompanyRuntimeVariableSource = {
  englishName: string;
  nepaliName?: string | null;
  ownerType: Company['ownerType'];
  registrationDate?: string | Date | null;
  owners: Array<{
    name: string;
    fatherName?: string | null;
    address?: string | null;
    citizenship?: string | null;
    jariJilla?: string | null;
    shares?: string | null;
    sharePercentage?: number | null;
    order?: number;
  }>;
  witnesses: Array<{
    name: string;
    fatherName?: string | null;
    address?: string | null;
    citizenship?: string | null;
    jariJilla?: string | null;
    ownerIndex?: number | null; // 1-based owner index; null = general
    order?: number;
  }>;
  objectives: Array<{
    text: string;
    order?: number;
  }>;
};

export type CompanyTemplateOwnerWitnessRow = {
  sn: number;
  witness_index: number;
  witness_name: string;
  witness_father_name: string;
  witness_address: string;
  witness_citizenship: string;
  witness_jari_jilla: string;
};

export type CompanyTemplateOwnerRow = {
  sn: number;
  owner_index: number;
  owner_name: string;
  owner_father_name: string;
  owner_address: string;
  owner_citizenship: string;
  owner_jari_jilla: string;
  owner_shares: string;
  owner_share_percentage: string;
  // Nested loop: witnesses assigned to this specific owner
  owner_witnesses: CompanyTemplateOwnerWitnessRow[];
};

export type CompanyTemplateWitnessRow = {
  sn: number;
  witness_index: number;
  witness_name: string;
  witness_father_name: string;
  witness_address: string;
  witness_citizenship: string;
  witness_jari_jilla: string;
};

export type CompanyTemplateData = {
  [key: string]: string | CompanyTemplateOwnerRow[] | CompanyTemplateWitnessRow[];
  owners_list: CompanyTemplateOwnerRow[];
  witnesses_list: CompanyTemplateWitnessRow[];
};

export const TEMPLATE_LOOP_HELPER_KEYS = new Set(['owners_list', 'witnesses_list', 'owner_witnesses', 'sn']);

export type CompanyVariableKey =
  // ── Company scalars ───────────────────────────────────────────────────────
  | 'company_name'
  | 'company_name_np'
  | 'registration_date'
  | 'owner_type'
  | 'owner_count'
  | 'date_generated'
  // ── Aggregate inline strings (comma-joined, for use in sentences) ─────────
  | 'owner_names'
  | 'witness_names'
  // ── Objectives (two formats — use whichever fits the template) ────────────
  | 'objective_texts_inline'
  | 'objective_texts_numbered'
  // ── Runtime-only flat keys (single owner/witness, not in DB definitions) ──
  | 'owner_name'
  | 'owner_address'
  | 'owner_father_name'
  | 'owner_citizenship'
  | 'owner_jari_jilla'
  | 'owner_shares'
  | 'witness_name'
  | 'witness_address'
  | 'witness_father_name'
  | 'witness_citizenship'
  | 'witness_jari_jilla'
  | `owner_name_${number}`
  | `owner_father_name_${number}`
  | `owner_address_${number}`
  | `owner_citizenship_${number}`
  | `owner_jari_jilla_${number}`
  | `owner_shares_${number}`
  | `owner_share_percentage_${number}`
  | `witness_name_${number}`
  | `witness_father_name_${number}`
  | `witness_address_${number}`;

export type CompanyVariableDefinition = {
  key: CompanyVariableKey;
  label: string;
  description: string;
  type: 'text' | 'number' | 'date' | 'list';
};

// ─── Registered template variables ───────────────────────────────────────────
// These are stored in the DB and auto-filled from the company record.
// Use these keys in your .docx template: {{company_name}}, {{owner_names}}, etc.
//
// For per-row owner/witness data in tables, use LOOP variables instead:
//   {#owners_list} {{owner_name}} {{owner_father_name}} ... {/owners_list}
//   {#witnesses_list} {{witness_name}} ... {/witnesses_list}
// ─────────────────────────────────────────────────────────────────────────────
export const COMPANY_VARIABLE_DEFINITIONS: CompanyVariableDefinition[] = [

  // ── Company scalars ───────────────────────────────────────────────────────
  {
    key: 'company_name',
    label: 'Company Name (English)',
    description: 'The registered English name of the company.',
    type: 'text',
  },
  {
    key: 'company_name_np',
    label: 'Company Name (Nepali)',
    description: 'The registered Nepali name of the company.',
    type: 'text',
  },
  {
    key: 'registration_date',
    label: 'Registration Date',
    description: 'Date the company was registered (YYYY-MM-DD).',
    type: 'date',
  },
  {
    key: 'owner_type',
    label: 'Ownership Type',
    description: 'SINGLE or MULTIPLE.',
    type: 'text',
  },
  {
    key: 'owner_count',
    label: 'Number of Owners',
    description: 'Total count of owners.',
    type: 'number',
  },
  {
    key: 'date_generated',
    label: 'Date Generated',
    description: "Today's date when the document was generated (YYYY-MM-DD).",
    type: 'date',
  },

  // ── Inline name strings (for embedding in sentences) ──────────────────────
  // e.g. "The company is owned by {{owner_names}}."
  // For per-row data in a table, use {#owners_list}...{/owners_list} loops instead.
  {
    key: 'owner_names',
    label: 'Owner Names (comma-joined)',
    description: 'All owner names joined by commas. e.g. "Ram Bahadur, Shyam Prasad". Use in sentences, not tables.',
    type: 'text',
  },
  {
    key: 'witness_names',
    label: 'Witness Names (comma-joined)',
    description: 'All witness names joined by commas. e.g. "Hari Lal, Gopal Singh". Use in sentences, not tables.',
    type: 'text',
  },

  // ── Business objectives ───────────────────────────────────────────────────
  // Two formats — pick whichever fits your template layout.
  {
    key: 'objective_texts_inline',
    label: 'Business Objectives (comma-joined)',
    description: 'All selected objectives in one line, comma-separated. e.g. "Trading, Manufacturing". Use in sentences.',
    type: 'text',
  },
  {
    key: 'objective_texts_numbered',
    label: 'Business Objectives (numbered list)',
    description: 'Each objective on its own numbered line. e.g. "1. Trading\n2. Manufacturing". Paste into a single paragraph/cell.',
    type: 'list',
  },
];

export type CompanyRuntimeVariableSpec = {
  key: Exclude<CompanyVariableKey, keyof typeof COMPANY_VARIABLE_DEFINITIONS[number]>;
  label: string;
  type: 'text' | 'number' | 'date' | 'list';
  value: string;
};

function getSortedOwners(company: Pick<CompanyRuntimeVariableSource, 'owners'>) {
  return [...company.owners].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

function getSortedWitnesses(company: Pick<CompanyRuntimeVariableSource, 'witnesses'>) {
  return [...company.witnesses].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

function getSortedObjectives(company: Pick<CompanyRuntimeVariableSource, 'objectives'>) {
  return [...company.objectives].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

export function isRuntimeCompanyVariableKey(key: string) {
  return /^(owner|witness)_(name|father_name|address|citizenship|jari_jilla)(?:_\d+)?$/.test(key)
    || /^(owner)_(shares|share_percentage)(?:_\d+)?$/.test(key);
}

export function isSystemVariableKey(key: string) {
  return COMPANY_VARIABLE_DEFINITIONS.some((def) => def.key === key) || isRuntimeCompanyVariableKey(key);
}

export function buildCompanyRuntimeVariableSpecs(
  company: Pick<Company, 'ownerType' | 'owners' | 'witnesses' | 'objectives'>
): Array<{ key: string; label: string; type: 'text' | 'number' | 'date' | 'list'; value: string }> {
  const owners = getSortedOwners(company);
  const witnesses = getSortedWitnesses(company);
  const objectives = getSortedObjectives(company);

  const specs: Array<{ key: string; label: string; type: 'text' | 'number' | 'date' | 'list'; value: string }> = [];

  if (owners.length === 1) {
    specs.push(
      { key: 'owner_name', label: 'Owner Name', type: 'text', value: owners[0]?.name || '' },
      { key: 'owner_address', label: 'Owner Address', type: 'text', value: owners[0]?.address || '' }
    );
  } else if (owners.length > 1) {
    owners.forEach((owner, index) => {
      const slot = index + 1;
      specs.push(
        { key: `owner_name_${slot}`, label: `Owner Name ${slot}`, type: 'text', value: owner.name || '' },
        { key: `owner_address_${slot}`, label: `Owner Address ${slot}`, type: 'text', value: owner.address || '' },
        {
          key: `owner_share_percentage_${slot}`,
          label: `Owner Share Percentage ${slot}`,
          type: 'number',
          value: owner.sharePercentage !== null && owner.sharePercentage !== undefined ? String(owner.sharePercentage) : '',
        }
      );
    });
  }

  if (witnesses.length === 1) {
    specs.push(
      { key: 'witness_name', label: 'Witness Name', type: 'text', value: witnesses[0]?.name || '' },
      { key: 'witness_address', label: 'Witness Address', type: 'text', value: witnesses[0]?.address || '' }
    );
  } else if (witnesses.length > 1) {
    witnesses.forEach((witness, index) => {
      const slot = index + 1;
      specs.push(
        { key: `witness_name_${slot}`, label: `Witness Name ${slot}`, type: 'text', value: witness.name || '' },
        { key: `witness_address_${slot}`, label: `Witness Address ${slot}`, type: 'text', value: witness.address || '' }
      );
    });
  }

  if (objectives.length > 0) {
    specs.push({
      key: 'objective_texts_inline',
      label: 'Business Objectives — Inline (comma-separated)',
      type: 'list',
      value: objectives.map((objective) => objective.text).join(', '),
    });
    specs.push({
      key: 'objective_texts_numbered',
      label: 'Business Objectives — Numbered List',
      type: 'list',
      value: objectives.map((objective, index) => `${index + 1}. ${objective.text}`).join('\n'),
    });
  }

  return specs;
}

export function buildCompanyRuntimeVariableValues(company: CompanyRuntimeVariableSource): Record<string, string> {
  const owners = getSortedOwners(company);
  const witnesses = getSortedWitnesses(company);
  const objectives = getSortedObjectives(company);

  const ownerNames = owners.map((owner) => owner.name).filter(Boolean);
  const witnessNames = witnesses.map((witness) => witness.name).filter(Boolean);
  const objectiveTexts = objectives.map((objective) => objective.text).filter(Boolean);

  const variables: Record<string, string> = {
    company_name: company.englishName || '',
    company_name_np: company.nepaliName || '',
    registration_date: company.registrationDate
      ? (typeof company.registrationDate === 'string'
          ? company.registrationDate.split('T')[0]
          : company.registrationDate.toISOString().split('T')[0])
      : '',
    owner_type: company.ownerType,
    owner_count: String(owners.length),
    owner_names: ownerNames.join(', '),
    owner_names_list: ownerNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
    owner_father_names: owners.map((owner) => owner.fatherName || '').filter(Boolean).join(', '),
    owner_father_names_list: owners.map((owner, index) => `${index + 1}. ${owner.fatherName || ''}`).join('\n'),
    owner_citizenships: owners.map((owner) => owner.citizenship || '').filter(Boolean).join(', '),
    owner_citizenships_list: owners.map((owner, index) => `${index + 1}. ${owner.citizenship || ''}`).join('\n'),
    owner_districts: owners.map((owner) => owner.jariJilla || '').filter(Boolean).join(', '),
    owner_districts_list: owners.map((owner, index) => `${index + 1}. ${owner.jariJilla || ''}`).join('\n'),
    owner_shares: owners.map((owner) => owner.shares || '').filter(Boolean).join(', '),
    owner_shares_list: owners.map((owner, index) => `${index + 1}. ${owner.shares || ''}`).join('\n'),
    owner_share_percentage: owners
      .map((owner) => (owner.sharePercentage !== null && owner.sharePercentage !== undefined ? String(owner.sharePercentage) : ''))
      .filter(Boolean)
      .join(', '),
    witness_names: witnessNames.join(', '),
    witness_names_list: witnessNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
    witness_father_names: witnesses.map((witness) => witness.fatherName || '').filter(Boolean).join(', '),
    witness_father_names_list: witnesses.map((witness, index) => `${index + 1}. ${witness.fatherName || ''}`).join('\n'),
    witness_citizenships: witnesses.map((witness) => witness.citizenship || '').filter(Boolean).join(', '),
    witness_citizenships_list: witnesses.map((witness, index) => `${index + 1}. ${witness.citizenship || ''}`).join('\n'),
    witness_districts: witnesses.map((witness) => witness.jariJilla || '').filter(Boolean).join(', '),
    witness_districts_list: witnesses.map((witness, index) => `${index + 1}. ${witness.jariJilla || ''}`).join('\n'),
    // Both old keys (backward compat) and new renamed keys
    objective_texts: objectiveTexts.join(', '),
    objective_texts_list: objectiveTexts.map((text, index) => `${index + 1}. ${text}`).join('\n'),
    objective_texts_inline: objectiveTexts.join(', '),
    objective_texts_numbered: objectiveTexts.map((text, index) => `${index + 1}. ${text}`).join('\n'),
    date_generated: new Date().toISOString().split('T')[0],
  };

  if (owners.length === 1) {
    variables.owner_name = owners[0]?.name || '';
    variables.owner_address = owners[0]?.address || '';
    variables.owner_father_name = owners[0]?.fatherName || '';
    variables.owner_citizenship = owners[0]?.citizenship || '';
    variables.owner_jari_jilla = owners[0]?.jariJilla || '';
    variables.owner_shares = owners[0]?.shares || '';
    variables.owner_share_percentage = owners[0]?.sharePercentage !== null && owners[0]?.sharePercentage !== undefined
      ? String(owners[0].sharePercentage)
      : owners[0]?.shares || '';
  }

  if (witnesses.length === 1) {
    variables.witness_name = witnesses[0]?.name || '';
    variables.witness_address = witnesses[0]?.address || '';
    variables.witness_father_name = witnesses[0]?.fatherName || '';
    variables.witness_citizenship = witnesses[0]?.citizenship || '';
    variables.witness_jari_jilla = witnesses[0]?.jariJilla || '';
  }

  owners.forEach((owner, index) => {
    const slot = index + 1;
    variables[`owner_name_${slot}`] = owner.name || '';
    variables[`owner_father_name_${slot}`] = owner.fatherName || '';
    variables[`owner_address_${slot}`] = owner.address || '';
    variables[`owner_citizenship_${slot}`] = owner.citizenship || '';
    variables[`owner_jari_jilla_${slot}`] = owner.jariJilla || '';
    variables[`owner_shares_${slot}`] = owner.shares || '';
    variables[`owner_share_percentage_${slot}`] = owner.sharePercentage !== null && owner.sharePercentage !== undefined
      ? String(owner.sharePercentage)
      : owner.shares || '';
  });

  witnesses.forEach((witness, index) => {
    const slot = index + 1;
    variables[`witness_name_${slot}`] = witness.name || '';
    variables[`witness_father_name_${slot}`] = witness.fatherName || '';
    variables[`witness_address_${slot}`] = witness.address || '';
  });

  return variables;
}

export function buildCompanyTemplateData(company: CompanyRuntimeVariableSource): CompanyTemplateData {
  const flatVariables = buildCompanyRuntimeVariableValues(company);
  const owners = getSortedOwners(company);
  const witnesses = getSortedWitnesses(company);

  return {
    ...flatVariables,
    owners_list: owners.map((owner, index) => {
      const ownerSlot = index + 1;
      // Collect witnesses assigned to this specific owner (by 1-based ownerIndex)
      const ownerWitnesses = witnesses
        .filter((w) => w.ownerIndex === ownerSlot)
        .map((w, wIndex) => ({
          sn: wIndex + 1,
          witness_index: wIndex + 1,
          witness_name: w.name || '',
          witness_father_name: w.fatherName || '',
          witness_address: w.address || '',
          witness_citizenship: w.citizenship || '',
          witness_jari_jilla: w.jariJilla || '',
        }));

      return {
        sn: ownerSlot,
        owner_index: ownerSlot,
        owner_name: owner.name || '',
        owner_father_name: owner.fatherName || '',
        owner_address: owner.address || '',
        owner_citizenship: owner.citizenship || '',
        owner_jari_jilla: owner.jariJilla || '',
        owner_shares: owner.shares || '',
        owner_share_percentage:
          owner.sharePercentage !== null && owner.sharePercentage !== undefined
            ? String(owner.sharePercentage)
            : owner.shares || '',
        owner_witnesses: ownerWitnesses,
      };
    }),
    witnesses_list: witnesses.map((witness, index) => ({
      sn: index + 1,
      witness_index: index + 1,
      witness_name: witness.name || '',
      witness_father_name: witness.fatherName || '',
      witness_address: witness.address || '',
      witness_citizenship: witness.citizenship || '',
      witness_jari_jilla: witness.jariJilla || '',
    })),
  };
}