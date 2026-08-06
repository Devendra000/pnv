import type { Company } from '@/lib/types';

export type CompanyRuntimeVariableSource = {
  englishName: string;
  nepaliName?: string | null;
  companyAddress?: string | null;
  ownerType: Company['ownerType'];
  owners: Array<{
    name: string;
    fatherName?: string | null;
    address?: string | null;
    citizenship?: string | null;
    jariJilla?: string | null;
    citizenshipJariDate?: string | null;
    phoneNumber?: string | null;
    shares?: string | null;
    order?: number;
    ownerRole?: { id: string; name: string } | null;
  }>;
  witnesses: Array<{
    name: string;
    address?: string | null;
    citizenship?: string | null;
    jariJilla?: string | null;
    citizenshipJariDate?: string | null;
    phoneNumber?: string | null;
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
  witness_address: string;
  witness_citizenship: string;
  witness_jari_jilla: string;
  witness_citizenship_jari_date: string;
  witness_phone_number: string;
};

export type CompanyTemplateOwnerRow = {
  sn: number;
  owner_index: number;
  owner_name: string;
  owner_father_name: string;
  owner_address: string;
  owner_citizenship: string;
  owner_jari_jilla: string;
  owner_citizenship_jari_date: string;
  owner_phone_number: string;
  owner_shares: string;
  owner_role: string;
  // Direct witness fields assigned to this specific owner
  owner_witness_name: string;
  owner_witness_address: string;
  owner_witness_citizenship: string;
  owner_witness_jari_jilla: string;
  owner_witness_citizenship_jari_date: string;
  owner_witness_phone_number: string;
  witness_name: string;
  witness_address: string;
  witness_citizenship: string;
  witness_jari_jilla: string;
  witness_citizenship_jari_date: string;
  witness_phone_number: string;
  // Nested loop: witnesses assigned to this specific owner
  owner_witnesses: CompanyTemplateOwnerWitnessRow[];
};

export type CompanyTemplateWitnessRow = {
  sn: number;
  witness_index: number;
  witness_name: string;
  witness_address: string;
  witness_citizenship: string;
  witness_jari_jilla: string;
  witness_citizenship_jari_date: string;
  witness_phone_number: string;
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
  | 'company_address'
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
  | 'owner_citizenship_jari_date'
  | 'owner_phone_number'
  | 'owner_shares'
  | 'witness_name'
  | 'witness_address'
  | 'witness_citizenship'
  | 'witness_jari_jilla'
  | 'witness_citizenship_jari_date'
  | 'witness_phone_number'
  | `owner_name_${number}`
  | `owner_father_name_${number}`
  | `owner_address_${number}`
  | `owner_citizenship_${number}`
  | `owner_jari_jilla_${number}`
  | `owner_citizenship_jari_date_${number}`
  | `owner_phone_number_${number}`
  | `owner_shares_${number}`
  | `witness_name_${number}`
  | `witness_address_${number}`
  | `witness_citizenship_${number}`
  | `witness_jari_jilla_${number}`
  | `witness_citizenship_jari_date_${number}`
  | `witness_phone_number_${number}`;

export type CompanyVariableDefinition = {
  key: CompanyVariableKey;
  label: string;
  description: string;
  type: 'text' | 'number' | 'date' | 'list';
};

// ─── Registered template variables ───────────────────────────────────────────
// These are stored in the DB and auto-filled from the company record.
// Use these keys in your .docx template: [company_name], [owner_names], etc.
//
// For per-row owner/witness data in tables, use LOOP variables instead:
//   [#owners_list] [owner_name] [owner_father_name] ... [/owners_list]
//   [#witnesses_list] [witness_name] ... [/witnesses_list]
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
    key: 'company_address',
    label: 'Company Address',
    description: 'The registered address of the company.',
    type: 'text',
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
  // e.g. "The company is owned by [owner_names]."
  // For per-row data in a table, use [#owners_list]...[/owners_list] loops instead.
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
  return /^(owner|witness)_(name|father_name|address|citizenship|jari_jilla|citizenship_jari_date|phone_number)(?:_\d+)?$/.test(key)
    || /^(owner)_(shares)(?:_\d+)?$/.test(key);
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
        { key: `owner_address_${slot}`, label: `Owner Address ${slot}`, type: 'text', value: owner.address || '' }
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
    company_address: company.companyAddress || '',
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
    owner_citizenship_jari_dates: owners.map((owner) => owner.citizenshipJariDate || '').filter(Boolean).join(', '),
    owner_citizenship_jari_dates_list: owners.map((owner, index) => `${index + 1}. ${owner.citizenshipJariDate || ''}`).join('\n'),
    owner_phone_numbers: owners.map((owner) => owner.phoneNumber || '').filter(Boolean).join(', '),
    owner_phone_numbers_list: owners.map((owner, index) => `${index + 1}. ${owner.phoneNumber || ''}`).join('\n'),
    owner_shares: owners.map((owner) => owner.shares || '').filter(Boolean).join(', '),
    owner_shares_list: owners.map((owner, index) => `${index + 1}. ${owner.shares || ''}`).join('\n'),
    witness_names: witnessNames.join(', '),
    witness_names_list: witnessNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
    witness_citizenships: witnesses.map((witness) => witness.citizenship || '').filter(Boolean).join(', '),
    witness_citizenships_list: witnesses.map((witness, index) => `${index + 1}. ${witness.citizenship || ''}`).join('\n'),
    witness_districts: witnesses.map((witness) => witness.jariJilla || '').filter(Boolean).join(', '),
    witness_districts_list: witnesses.map((witness, index) => `${index + 1}. ${witness.jariJilla || ''}`).join('\n'),
    witness_citizenship_jari_dates: witnesses.map((witness) => witness.citizenshipJariDate || '').filter(Boolean).join(', '),
    witness_citizenship_jari_dates_list: witnesses.map((witness, index) => `${index + 1}. ${witness.citizenshipJariDate || ''}`).join('\n'),
    witness_phone_numbers: witnesses.map((witness) => witness.phoneNumber || '').filter(Boolean).join(', '),
    witness_phone_numbers_list: witnesses.map((witness, index) => `${index + 1}. ${witness.phoneNumber || ''}`).join('\n'),
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
    variables.owner_citizenship_jari_date = owners[0]?.citizenshipJariDate || '';
    variables.owner_phone_number = owners[0]?.phoneNumber || '';
    variables.owner_shares = owners[0]?.shares || '';

    const firstOwnerWitness = witnesses.find((w) => w.ownerIndex === 1) || witnesses[0];
    variables.owner_witness_name = firstOwnerWitness?.name || '';
    variables.owner_witness_address = firstOwnerWitness?.address || '';
    variables.owner_witness_citizenship = firstOwnerWitness?.citizenship || '';
    variables.owner_witness_jari_jilla = firstOwnerWitness?.jariJilla || '';
    variables.owner_witness_citizenship_jari_date = firstOwnerWitness?.citizenshipJariDate || '';
    variables.owner_witness_phone_number = firstOwnerWitness?.phoneNumber || '';
  }

  if (witnesses.length === 1) {
    variables.witness_name = witnesses[0]?.name || '';
    variables.witness_address = witnesses[0]?.address || '';
    variables.witness_citizenship = witnesses[0]?.citizenship || '';
    variables.witness_jari_jilla = witnesses[0]?.jariJilla || '';
    variables.witness_citizenship_jari_date = witnesses[0]?.citizenshipJariDate || '';
    variables.witness_phone_number = witnesses[0]?.phoneNumber || '';
  }

  owners.forEach((owner, index) => {
    const slot = index + 1;
    const ownerWitness = witnesses.find((w) => w.ownerIndex === slot);
    variables[`owner_name_${slot}`] = owner.name || '';
    variables[`owner_father_name_${slot}`] = owner.fatherName || '';
    variables[`owner_address_${slot}`] = owner.address || '';
    variables[`owner_citizenship_${slot}`] = owner.citizenship || '';
    variables[`owner_jari_jilla_${slot}`] = owner.jariJilla || '';
    variables[`owner_citizenship_jari_date_${slot}`] = owner.citizenshipJariDate || '';
    variables[`owner_phone_number_${slot}`] = owner.phoneNumber || '';
    variables[`owner_shares_${slot}`] = owner.shares || '';

    variables[`owner_witness_name_${slot}`] = ownerWitness?.name || '';
    variables[`owner_witness_address_${slot}`] = ownerWitness?.address || '';
    variables[`owner_witness_citizenship_${slot}`] = ownerWitness?.citizenship || '';
    variables[`owner_witness_jari_jilla_${slot}`] = ownerWitness?.jariJilla || '';
    variables[`owner_witness_citizenship_jari_date_${slot}`] = ownerWitness?.citizenshipJariDate || '';
    variables[`owner_witness_phone_number_${slot}`] = ownerWitness?.phoneNumber || '';

    variables[`owner_${slot}_witness_name`] = ownerWitness?.name || '';
    variables[`owner_${slot}_witness_address`] = ownerWitness?.address || '';
    variables[`owner_${slot}_witness_citizenship`] = ownerWitness?.citizenship || '';
    variables[`owner_${slot}_witness_jari_jilla`] = ownerWitness?.jariJilla || '';
    variables[`owner_${slot}_witness_citizenship_jari_date`] = ownerWitness?.citizenshipJariDate || '';
    variables[`owner_${slot}_witness_phone_number`] = ownerWitness?.phoneNumber || '';
  });

  witnesses.forEach((witness, index) => {
    const slot = index + 1;
    variables[`witness_name_${slot}`] = witness.name || '';
    variables[`witness_address_${slot}`] = witness.address || '';
    variables[`witness_citizenship_${slot}`] = witness.citizenship || '';
    variables[`witness_jari_jilla_${slot}`] = witness.jariJilla || '';
    variables[`witness_citizenship_jari_date_${slot}`] = witness.citizenshipJariDate || '';
    variables[`witness_phone_number_${slot}`] = witness.phoneNumber || '';
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
          witness_address: w.address || '',
          witness_citizenship: w.citizenship || '',
          witness_jari_jilla: w.jariJilla || '',
          witness_citizenship_jari_date: w.citizenshipJariDate || '',
          witness_phone_number: w.phoneNumber || '',
        }));

      const primaryWitness = ownerWitnesses[0];
      const witnessName = primaryWitness?.witness_name || '';
      const witnessAddress = primaryWitness?.witness_address || '';
      const witnessCitizenship = primaryWitness?.witness_citizenship || '';
      const witnessJariJilla = primaryWitness?.witness_jari_jilla || '';
      const witnessCitizenshipJariDate = primaryWitness?.witness_citizenship_jari_date || '';
      const witnessPhoneNumber = primaryWitness?.witness_phone_number || '';

      return {
        sn: ownerSlot,
        owner_index: ownerSlot,
        owner_name: owner.name || '',
        owner_father_name: owner.fatherName || '',
        owner_address: owner.address || '',
        owner_citizenship: owner.citizenship || '',
        owner_jari_jilla: owner.jariJilla || '',
        owner_citizenship_jari_date: owner.citizenshipJariDate || '',
        owner_phone_number: owner.phoneNumber || '',
        owner_shares: owner.shares || '',
        owner_role: owner.ownerRole?.name || '',
        owner_witness_name: witnessName,
        owner_witness_address: witnessAddress,
        owner_witness_citizenship: witnessCitizenship,
        owner_witness_jari_jilla: witnessJariJilla,
        owner_witness_citizenship_jari_date: witnessCitizenshipJariDate,
        owner_witness_phone_number: witnessPhoneNumber,
        witness_name: witnessName,
        witness_address: witnessAddress,
        witness_citizenship: witnessCitizenship,
        witness_jari_jilla: witnessJariJilla,
        witness_citizenship_jari_date: witnessCitizenshipJariDate,
        witness_phone_number: witnessPhoneNumber,
        owner_witnesses: ownerWitnesses,
      };
    }),
    witnesses_list: witnesses.map((witness, index) => ({
      sn: index + 1,
      witness_index: index + 1,
      witness_name: witness.name || '',
      witness_address: witness.address || '',
      witness_citizenship: witness.citizenship || '',
      witness_jari_jilla: witness.jariJilla || '',
      witness_citizenship_jari_date: witness.citizenshipJariDate || '',
      witness_phone_number: witness.phoneNumber || '',
    })),
  };
}