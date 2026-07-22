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
    order?: number;
  }>;
  objectives: Array<{
    text: string;
    order?: number;
  }>;
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

export const TEMPLATE_LOOP_HELPER_KEYS = new Set(['owners_list', 'witnesses_list', 'sn']);

export type CompanyVariableKey =
  | 'company_name'
  | 'company_name_np'
  | 'registration_date'
  | 'owner_type'
  | 'owner_count'
  | 'owner_names'
  | 'owner_names_list'
  | 'owner_father_names'
  | 'owner_father_names_list'
  | 'owner_citizenships'
  | 'owner_citizenships_list'
  | 'owner_districts'
  | 'owner_districts_list'
  | 'owner_shares'
  | 'owner_share_percentage'
  | 'owner_shares_list'
  | 'witness_names'
  | 'witness_names_list'
  | 'witness_father_names'
  | 'witness_father_names_list'
  | 'witness_citizenships'
  | 'witness_citizenships_list'
  | 'witness_districts'
  | 'witness_districts_list'
  | 'objective_texts'
  | 'objective_texts_list'
  | 'date_generated'
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
  type: 'text' | 'number' | 'date' | 'list';
};

export const COMPANY_VARIABLE_DEFINITIONS: CompanyVariableDefinition[] = [
  { key: 'company_name', label: 'Company Name', type: 'text' },
  { key: 'company_name_np', label: 'Company Name Nepali', type: 'text' },
  { key: 'registration_date', label: 'Registration Date', type: 'date' },
  { key: 'owner_type', label: 'Owner Type', type: 'text' },
  { key: 'owner_count', label: 'Owner Count', type: 'number' },
  { key: 'owner_names', label: 'Owner Names', type: 'list' },
  { key: 'owner_names_list', label: 'Owner Names List', type: 'list' },
  { key: 'owner_father_names', label: 'Owner Father Names', type: 'list' },
  { key: 'owner_father_names_list', label: 'Owner Father Names List', type: 'list' },
  { key: 'owner_citizenships', label: 'Owner Citizenship Numbers', type: 'list' },
  { key: 'owner_citizenships_list', label: 'Owner Citizenship Numbers List', type: 'list' },
  { key: 'owner_districts', label: 'Owner Districts', type: 'list' },
  { key: 'owner_districts_list', label: 'Owner Districts List', type: 'list' },
  { key: 'owner_shares', label: 'Owner Shares', type: 'list' },
  { key: 'owner_share_percentage', label: 'Owner Share Percentage', type: 'number' },
  { key: 'owner_shares_list', label: 'Owner Shares List', type: 'list' },
  { key: 'witness_names', label: 'Witness Names', type: 'list' },
  { key: 'witness_names_list', label: 'Witness Names List', type: 'list' },
  { key: 'witness_father_names', label: 'Witness Father Names', type: 'list' },
  { key: 'witness_father_names_list', label: 'Witness Father Names List', type: 'list' },
  { key: 'witness_citizenships', label: 'Witness Citizenship Numbers', type: 'list' },
  { key: 'witness_citizenships_list', label: 'Witness Citizenship Numbers List', type: 'list' },
  { key: 'witness_districts', label: 'Witness Districts', type: 'list' },
  { key: 'witness_districts_list', label: 'Witness Districts List', type: 'list' },
  { key: 'objective_texts', label: 'Objective Texts', type: 'list' },
  { key: 'objective_texts_list', label: 'Objective Texts List', type: 'list' },
  { key: 'date_generated', label: 'Date Generated', type: 'date' },
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
      key: 'objective_texts',
      label: 'Objective Texts',
      type: 'list',
      value: objectives.map((objective) => objective.text).join(', '),
    });
    specs.push({
      key: 'objective_texts_list',
      label: 'Objective Texts List',
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
    objective_texts: objectiveTexts.join(', '),
    objective_texts_list: objectiveTexts.map((text, index) => `${index + 1}. ${text}`).join('\n'),
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
    owners_list: owners.map((owner, index) => ({
      sn: index + 1,
      owner_index: index + 1,
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
    })),
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