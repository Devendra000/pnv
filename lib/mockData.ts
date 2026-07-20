import {
  Company,
  CompanyObjectiveTemplate,
  Variable,
  Template,
  Document,
} from './types';

export const mockCompanies: Company[] = [
  {
    id: 'comp-1',
    name: 'TechCorp Inc',
    registrationNumber: 'TC-2024-001',
    country: 'United States',
    industry: 'Technology',
    singleOwner: true,
    owners: [
      { id: 'own-1', name: 'John Smith', role: 'CEO' },
    ],
    witnesses: [
      { id: 'wit-1', name: 'Jane Doe', role: 'Board Director' },
    ],
    objectives: [
      { id: 'obj-1', objectiveId: 'tmpl-obj-1', text: 'Innovate technology solutions' },
      { id: 'obj-2', objectiveId: 'tmpl-obj-2', text: 'Expand market reach' },
    ],
    dateCreated: '2024-01-15',
    lastModified: '2024-07-10',
    documentCount: 5,
  },
  {
    id: 'comp-2',
    name: 'Global Solutions Ltd',
    registrationNumber: 'GS-2024-002',
    country: 'United Kingdom',
    industry: 'Consulting',
    singleOwner: false,
    owners: [
      { id: 'own-2', name: 'Sarah Johnson', role: 'Managing Director' },
      { id: 'own-3', name: 'Michael Chen', role: 'Co-Director' },
    ],
    witnesses: [
      { id: 'wit-2', name: 'Robert Williams', role: 'External Auditor' },
      { id: 'wit-3', name: 'Emma Brown', role: 'Compliance Officer' },
    ],
    objectives: [
      { id: 'obj-3', objectiveId: 'tmpl-obj-1', text: 'Deliver strategic consulting services' },
      { id: 'obj-4', objectiveId: 'tmpl-obj-3', text: 'Develop client relationships' },
      { id: 'obj-5', objectiveId: 'tmpl-obj-4', text: 'Ensure compliance' },
    ],
    dateCreated: '2024-02-20',
    lastModified: '2024-07-05',
    documentCount: 8,
  },
  {
    id: 'comp-3',
    name: 'Financial Services Group',
    registrationNumber: 'FS-2024-003',
    country: 'Canada',
    industry: 'Finance',
    singleOwner: false,
    owners: [
      { id: 'own-4', name: 'David Martinez', role: 'Chief Executive Officer' },
      { id: 'own-5', name: 'Lisa Anderson', role: 'Chief Operating Officer' },
    ],
    witnesses: [
      { id: 'wit-4', name: 'James Wilson', role: 'Legal Advisor' },
    ],
    objectives: [
      { id: 'obj-6', objectiveId: 'tmpl-obj-2', text: 'Manage financial portfolios' },
    ],
    dateCreated: '2024-03-10',
    lastModified: '2024-06-28',
    documentCount: 12,
  },
];

export const mockObjectives: CompanyObjectiveTemplate[] = [
  { id: 'tmpl-obj-1', name: 'Innovation & Growth', description: 'Focus on innovation and market expansion', order: 1 },
  { id: 'tmpl-obj-2', name: 'Market Expansion', description: 'Expand market reach and customer base', order: 2 },
  { id: 'tmpl-obj-3', name: 'Client Relations', description: 'Develop and maintain client relationships', order: 3 },
  { id: 'tmpl-obj-4', name: 'Compliance', description: 'Ensure regulatory and legal compliance', order: 4 },
  { id: 'tmpl-obj-5', name: 'Sustainability', description: 'Promote sustainable practices', order: 5 },
];

export const mockVariables: Variable[] = [
  { id: 'var-1', name: 'CompanyName', description: 'Official company legal name', dataType: 'text' },
  { id: 'var-2', name: 'RegistrationNumber', description: 'Company registration/incorporation number', dataType: 'text' },
  { id: 'var-3', name: 'Country', description: 'Country of incorporation', dataType: 'text' },
  { id: 'var-4', name: 'Industry', description: 'Primary industry classification', dataType: 'text' },
  { id: 'var-5', name: 'OwnerNames', description: 'Comma-separated list of owner names', dataType: 'text' },
  { id: 'var-6', name: 'WitnessNames', description: 'Comma-separated list of witness names', dataType: 'text' },
  { id: 'var-7', name: 'DateGenerated', description: 'Document generation date', dataType: 'date' },
  { id: 'var-8', name: 'CompanyObjectives', description: 'Company business objectives', dataType: 'text' },
];

export const mockTemplates: Template[] = [
  {
    id: 'tmpl-1',
    name: 'Corporate Charter',
    description: 'Standard corporate charter document',
    content: `CORPORATE CHARTER

Company: {{CompanyName}}
Registration: {{RegistrationNumber}}
Country: {{Country}}
Industry: {{Industry}}

Owners: {{OwnerNames}}
Witnesses: {{WitnessNames}}

Objectives:
{{CompanyObjectives}}

Generated: {{DateGenerated}}`,
    createdDate: '2024-01-01',
    lastModified: '2024-06-15',
  },
  {
    id: 'tmpl-2',
    name: 'Annual Report Template',
    description: 'Annual company report structure',
    content: `ANNUAL REPORT

Organization: {{CompanyName}}
Period: {{DateGenerated}}

Company Details:
- Registration: {{RegistrationNumber}}
- Country: {{Country}}
- Industry: {{Industry}}

Leadership: {{OwnerNames}}
Attestation: {{WitnessNames}}

Report Details: [Custom content here]

`,
    createdDate: '2024-02-15',
    lastModified: '2024-05-20',
  },
  {
    id: 'tmpl-3',
    name: 'Compliance Document',
    description: 'Compliance and governance template',
    content: `COMPLIANCE DOCUMENTATION

Entity: {{CompanyName}}
Registration ID: {{RegistrationNumber}}

Regulatory Framework: {{Country}} Jurisdiction

Responsible Parties: {{OwnerNames}}
Compliance Officers: {{WitnessNames}}

Compliance Status: [To be filled]
Objectives Met: {{CompanyObjectives}}

Last Audit: {{DateGenerated}}
`,
    createdDate: '2024-03-10',
    lastModified: '2024-04-30',
  },
  {
    id: 'tmpl-4',
    name: 'Governance Document',
    description: 'Corporate governance framework',
    content: `GOVERNANCE FRAMEWORK

Prepared for: {{CompanyName}}
Registration Number: {{RegistrationNumber}}
Country: {{Country}}

Executive Leadership:
{{OwnerNames}}

Independent Reviewers:
{{WitnessNames}}

Primary Business Objectives:
{{CompanyObjectives}}

Document Generated: {{DateGenerated}}`,
    objectives: ['tmpl-obj-1', 'tmpl-obj-3', 'tmpl-obj-4'],
    createdDate: '2024-03-01',
    lastModified: '2024-07-01',
  },
];

export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    companyId: 'comp-1',
    companyName: 'TechCorp Inc',
    templateId: 'tmpl-1',
    templateName: 'Corporate Charter',
    generatedDate: '2024-07-10',
    content: 'CORPORATE CHARTER\n\nCompany: TechCorp Inc\nRegistration: TC-2024-001\n...',
  },
  {
    id: 'doc-2',
    companyId: 'comp-1',
    companyName: 'TechCorp Inc',
    templateId: 'tmpl-2',
    templateName: 'Annual Report Template',
    generatedDate: '2024-07-09',
    content: 'ANNUAL REPORT\n\nOrganization: TechCorp Inc\n...',
  },
  {
    id: 'doc-3',
    companyId: 'comp-2',
    companyName: 'Global Solutions Ltd',
    templateId: 'tmpl-3',
    templateName: 'Governance Document',
    generatedDate: '2024-07-08',
    content: 'GOVERNANCE FRAMEWORK\n\nPrepared for: Global Solutions Ltd\n...',
  },
];
