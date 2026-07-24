import PizZip from 'pizzip';
import type { Variable } from '@/lib/types';
import { COMPANY_VARIABLE_DEFINITIONS } from '@/lib/companyVariables';

export interface ParsedTemplateData {
  content: string;
  detectedKeys: string[];
  matchedVariables: Variable[];
}

// System/Loop virtual variables dictionary for template parsing
const SYSTEM_LOOP_VIRTUAL_VARIABLES: Record<string, { label: string; type: Variable['type'] }> = {
  // Loops
  owners_list: { label: 'Loop — Owners & Witnesses', type: 'list' },
  owner_list: { label: 'Loop — Owners & Witnesses', type: 'list' },
  witnesses_list: { label: 'Loop — Witnesses', type: 'list' },
  owner_witnesses: { label: 'Loop — Owner Assigned Witnesses', type: 'list' },

  // Loop fields
  sn: { label: 'S.N. (Loop Row Number)', type: 'number' },
  owner_name: { label: 'Owner Name (Loop Field)', type: 'text' },
  owner_father_name: { label: "Owner Father's Name (Loop Field)", type: 'text' },
  owner_address: { label: 'Owner Address (Loop Field)', type: 'text' },
  owner_citizenship: { label: 'Owner Citizenship No. (Loop Field)', type: 'text' },
  owner_jari_jilla: { label: 'Owner Jari Jilla (Loop Field)', type: 'text' },
  owner_citizenship_jari_date: { label: 'Owner Citizenship Issued Date (Loop Field)', type: 'date' },
  owner_phone_number: { label: 'Owner Phone Number (Loop Field)', type: 'text' },
  owner_shares: { label: 'Owner Shares (Loop Field)', type: 'text' },
  owner_witness_name: { label: 'Assigned Witness Name (Loop Field)', type: 'text' },
  owner_witness_address: { label: 'Assigned Witness Address (Loop Field)', type: 'text' },
  owner_witness_citizenship: { label: 'Assigned Witness Citizenship No. (Loop Field)', type: 'text' },
  owner_witness_jari_jilla: { label: 'Assigned Witness Jari Jilla (Loop Field)', type: 'text' },
  owner_witness_citizenship_jari_date: { label: 'Assigned Witness Issued Date (Loop Field)', type: 'date' },
  owner_witness_phone_number: { label: 'Assigned Witness Phone Number (Loop Field)', type: 'text' },
  witness_name: { label: 'Witness Name (Loop Field)', type: 'text' },
  witness_address: { label: 'Witness Address (Loop Field)', type: 'text' },
  witness_citizenship: { label: 'Witness Citizenship No. (Loop Field)', type: 'text' },
  witness_jari_jilla: { label: 'Witness Jari Jilla (Loop Field)', type: 'text' },
  witness_citizenship_jari_date: { label: 'Witness Citizenship Issued Date (Loop Field)', type: 'date' },
  witness_phone_number: { label: 'Witness Phone Number (Loop Field)', type: 'text' },
};

function collectDocxXml(zip: PizZip) {
  const xmlParts = [
    'word/document.xml',
    'word/header1.xml',
    'word/header2.xml',
    'word/header3.xml',
    'word/footer1.xml',
    'word/footer2.xml',
    'word/footer3.xml',
    'word/comments.xml',
    'word/footnotes.xml',
    'word/endnotes.xml',
  ];

  return xmlParts
    .map((fileName) => zip.file(fileName)?.asText() || '')
    .filter(Boolean)
    .join('\n');
}

function decodeDocxText(xml: string) {
  const parts: string[] = [];
  const regex = /<w:p[^>]*>|<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    if (match[0].startsWith('<w:p')) {
      parts.push('\n');
    } else if (match[1] !== undefined) {
      parts.push(match[1]);
    }
  }

  return parts
    .join('')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

function collectDetectedKeys(content: string) {
  const detectedKeys: string[] = [];
  const seenKeys = new Set<string>();

  const tagPattern = /\[\s*([#/^]?)\s*([A-Za-z0-9_.\s]+?)\s*\]/g;
  for (const match of content.matchAll(tagPattern)) {
    const rawKey = match[2];
    const key = rawKey.trim().replace(/\s+/g, '_');

    if (!key) continue;

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      detectedKeys.push(key);
    }
  }

  return detectedKeys;
}

export function cleanDocxZipTags(zip: PizZip): PizZip {
  const xmlParts = [
    'word/document.xml',
    'word/header1.xml',
    'word/header2.xml',
    'word/header3.xml',
    'word/footer1.xml',
    'word/footer2.xml',
    'word/footer3.xml',
    'word/comments.xml',
    'word/footnotes.xml',
    'word/endnotes.xml',
  ];

  for (const fileName of xmlParts) {
    const file = zip.file(fileName);
    if (!file) continue;

    let xml = file.asText();

    xml = xml.replace(/(\{\{|\[)([\s\S]*?)(\}\}|\])/g, (fullMatch, openTag, innerContent, closeTag) => {
      if ((openTag === '{{' && closeTag === '}}') || (openTag === '[' && closeTag === ']')) {
        const rawText = innerContent.replace(/<[^>]+>/g, '').trim();
        if (!rawText) return fullMatch;

        const prefixMatch = rawText.match(/^[#/^]/);
        const prefix = prefixMatch ? prefixMatch[0] : '';
        const cleanKey = rawText.replace(/^[#/^]/, '').replace(/\s+/g, '');

        if (!cleanKey) return fullMatch;

        return `[${prefix}${cleanKey}]`;
      }
      return fullMatch;
    });

    zip.file(fileName, xml);
  }

  return zip;
}

export function extractDocxTemplateData(
  input: Buffer | ArrayBuffer,
  variables: Variable[]
): ParsedTemplateData {
  const zip = new PizZip(input as any);
  cleanDocxZipTags(zip);
  const content = decodeDocxText(collectDocxXml(zip));
  const detectedKeys = collectDetectedKeys(content);

  const variableMap = new Map<string, Variable>();

  // 1. Registered auto definitions
  COMPANY_VARIABLE_DEFINITIONS.forEach((def) => {
    const v: Variable = { id: `auto-${def.key}`, key: def.key, label: def.label, type: def.type };
    variableMap.set(def.key, v);
    variableMap.set(def.key.toLowerCase(), v);
  });

  // 2. Loop virtual variables
  Object.entries(SYSTEM_LOOP_VIRTUAL_VARIABLES).forEach(([key, info]) => {
    const v: Variable = { id: `loop-${key}`, key, label: info.label, type: info.type };
    variableMap.set(key, v);
    variableMap.set(key.toLowerCase(), v);
  });

  // 3. User custom variables from DB (takes precedence)
  for (const variable of variables) {
    variableMap.set(variable.key, variable);
    variableMap.set(variable.key.toLowerCase(), variable);
    variableMap.set(variable.key.replace(/\s+/g, '_').toLowerCase(), variable);
  }

  const matchedVariables = detectedKeys
    .map((key) => {
      const normalized = key.replace(/\s+/g, '_').toLowerCase();
      return variableMap.get(key) || variableMap.get(normalized);
    })
    .filter((variable): variable is Variable => Boolean(variable));

  return {
    content,
    detectedKeys,
    matchedVariables,
  };
}
