import type { Company } from '@/lib/types';

export type CompanyRuntimeVariableSource = {
  name: string;
  ownerType: Company['ownerType'];
  registrationDate?: string | Date | null;
  owners: Array<{
    name: string;
    address?: string | null;
    sharePercentage?: number | null;
    order?: number;
  }>;
  witnesses: Array<{
    name: string;
    address?: string | null;
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
  owner_address: string;
  owner_share_percentage: string;
};

export type CompanyTemplateWitnessRow = {
  sn: number;
  witness_index: number;
  witness_name: string;
  witness_address: string;
};

export type CompanyTemplateData = {
  [key: string]: string | CompanyTemplateOwnerRow[] | CompanyTemplateWitnessRow[];
  owners_list: CompanyTemplateOwnerRow[];
  witnesses_list: CompanyTemplateWitnessRow[];
};

export const TEMPLATE_LOOP_HELPER_KEYS = new Set(['owners_list', 'witnesses_list', 'sn']);

export type CompanyVariableKey =
  | 'company_name'
  | 'registration_date'
  | 'owner_type'
  | 'owner_count'
  | 'owner_names'
  | 'owner_names_list'
  | 'witness_names'
  | 'witness_names_list'
  | 'objective_texts'
  | 'objective_texts_list'
  | 'date_generated'
  | 'owner_name'
  | 'owner_address'
  | 'witness_name'
  | 'witness_address'
  | `owner_name_${number}`
  | `owner_address_${number}`
  | `owner_share_percentage_${number}`
  | `witness_name_${number}`
  | `witness_address_${number}`;

export type CompanyVariableDefinition = {
  key: CompanyVariableKey;
  label: string;
  type: 'text' | 'number' | 'date' | 'list';
};

export const COMPANY_VARIABLE_DEFINITIONS: CompanyVariableDefinition[] = [
  { key: 'company_name', label: 'Company Name', type: 'text' },
  { key: 'registration_date', label: 'Registration Date', type: 'date' },
  { key: 'owner_type', label: 'Owner Type', type: 'text' },
  { key: 'owner_count', label: 'Owner Count', type: 'number' },
  { key: 'owner_names', label: 'Owner Names', type: 'list' },
  { key: 'owner_names_list', label: 'Owner Names List', type: 'list' },
  { key: 'witness_names', label: 'Witness Names', type: 'list' },
  { key: 'witness_names_list', label: 'Witness Names List', type: 'list' },
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
  return /^(owner|witness)_(name|address)(?:_\d+)?$/.test(key) || /^(owner|witness)_share_percentage_\d+$/.test(key);
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
    company_name: company.name || '',
    registration_date: company.registrationDate
      ? (typeof company.registrationDate === 'string'
          ? company.registrationDate.split('T')[0]
          : company.registrationDate.toISOString().split('T')[0])
      : '',
    owner_type: company.ownerType,
    owner_count: String(owners.length),
    owner_names: ownerNames.join(', '),
    owner_names_list: ownerNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
    witness_names: witnessNames.join(', '),
    witness_names_list: witnessNames.map((name, index) => `${index + 1}. ${name}`).join('\n'),
    objective_texts: objectiveTexts.join(', '),
    objective_texts_list: objectiveTexts.map((text, index) => `${index + 1}. ${text}`).join('\n'),
    date_generated: new Date().toISOString().split('T')[0],
  };

  if (owners.length === 1) {
    variables.owner_name = owners[0]?.name || '';
    variables.owner_address = owners[0]?.address || '';
  }

  if (witnesses.length === 1) {
    variables.witness_name = witnesses[0]?.name || '';
    variables.witness_address = witnesses[0]?.address || '';
  }

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
      owner_address: owner.address || '',
      owner_share_percentage:
        owner.sharePercentage !== null && owner.sharePercentage !== undefined
          ? String(owner.sharePercentage)
          : '',
    })),
    witnesses_list: witnesses.map((witness, index) => ({
      sn: index + 1,
      witness_index: index + 1,
      witness_name: witness.name || '',
      witness_address: witness.address || '',
    })),
  };
}