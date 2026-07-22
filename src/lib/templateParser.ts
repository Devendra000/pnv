import PizZip from 'pizzip';
import type { Variable } from '@/lib/types';
import { TEMPLATE_LOOP_HELPER_KEYS } from '@/lib/companyVariables';

export interface ParsedTemplateData {
  content: string;
  detectedKeys: string[];
  matchedVariables: Variable[];
}

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
  const sectionStack: string[] = [];
  const detectedKeys: string[] = [];
  const seenKeys = new Set<string>();

  const tagPattern = /\[\s*([#/^]?)\s*([A-Za-z0-9_.\s]+?)\s*\]/g;
  for (const match of content.matchAll(tagPattern)) {
    const tagType = match[1];
    const rawKey = match[2];
    const key = rawKey.trim().replace(/\s+/g, '_');

    if (!key) continue;

    if (tagType === '#') {
      sectionStack.push(key);
      continue;
    }

    if (tagType === '^') {
      sectionStack.push(key);
      continue;
    }

    if (tagType === '/') {
      const lastSection = sectionStack[sectionStack.length - 1];
      if (lastSection === key) {
        sectionStack.pop();
      }
      continue;
    }

    if (sectionStack.length > 0 || TEMPLATE_LOOP_HELPER_KEYS.has(key)) {
      continue;
    }

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
