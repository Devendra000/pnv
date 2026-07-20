import PizZip from 'pizzip';
import type { Variable } from '@/lib/types';

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
  return xml
    .replace(/<w:t[^>]*>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractDocxTemplateData(
  input: Buffer | ArrayBuffer,
  variables: Variable[]
): ParsedTemplateData {
  const zip = new PizZip(input as any);
  const content = decodeDocxText(collectDocxXml(zip));
  const detectedKeys = Array.from(
    new Set(
      [...content.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map(
        (match) => match[1]
      )
    )
  );

  const variableMap = new Map(variables.map((variable) => [variable.key, variable]));
  const matchedVariables = detectedKeys
    .map((key) => variableMap.get(key))
    .filter((variable): variable is Variable => Boolean(variable));

  return {
    content,
    detectedKeys,
    matchedVariables,
  };
}
