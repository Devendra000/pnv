/**
 * formulaEvaluator.ts
 *
 * Safe, zero-eval formula evaluator for template variables.
 *
 * Supported syntax:
 *   TODAY               → today's date as YYYY-MM-DD
 *   [var_key]           → substituted with the resolved value of that variable
 *   [a] + [b]           → arithmetic (also -, *, /)
 *   ( [a] + [b] ) * 2   → parenthesised arithmetic
 *   "static text"       → literal string (quoted)
 *   [a] - [b]           → string concat with " - " if either value is non-numeric
 */

type Token =
  | { type: 'NUMBER'; value: number }
  | { type: 'STRING'; value: string }
  | { type: 'OP'; value: '+' | '-' | '*' | '/' }
  | { type: 'LPAREN' }
  | { type: 'RPAREN' };

// ─── Tokenizer ────────────────────────────────────────────────────────────────

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    if (/\s/.test(expr[i])) { i++; continue; }

    // Quoted string literal
    if (expr[i] === '"' || expr[i] === "'") {
      const quote = expr[i];
      i++;
      let str = '';
      while (i < expr.length && expr[i] !== quote) {
        str += expr[i++];
      }
      i++;
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // Numeric literal
    if (/[0-9]/.test(expr[i]) || (expr[i] === '.' && /[0-9]/.test(expr[i + 1] || ''))) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) num += expr[i++];
      const n = parseFloat(num);
      if (isNaN(n)) return null;
      tokens.push({ type: 'NUMBER', value: n });
      continue;
    }

    if ('+-*/'.includes(expr[i])) {
      tokens.push({ type: 'OP', value: expr[i] as '+' | '-' | '*' | '/' });
      i++;
      continue;
    }

    if (expr[i] === '(') { tokens.push({ type: 'LPAREN' }); i++; continue; }
    if (expr[i] === ')') { tokens.push({ type: 'RPAREN' }); i++; continue; }

    // Unknown character
    return null;
  }

  return tokens;
}

// ─── Recursive-descent numeric parser ────────────────────────────────────────

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }

  parseExpr(): number | null {
    let left = this.parseTerm();
    if (left === null) return null;

    while (this.peek()?.type === 'OP' && ((this.peek() as any)?.value === '+' || (this.peek() as any)?.value === '-')) {
      const op = (this.consume() as { type: 'OP'; value: '+' | '-' }).value;
      const right = this.parseTerm();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  private parseTerm(): number | null {
    let left = this.parseFactor();
    if (left === null) return null;

    while (this.peek()?.type === 'OP' && ((this.peek() as any)?.value === '*' || (this.peek() as any)?.value === '/')) {
      const op = (this.consume() as { type: 'OP'; value: '*' | '/' }).value;
      const right = this.parseFactor();
      if (right === null) return null;
      if (op === '/' && right === 0) return null;
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  private parseFactor(): number | null {
    const tok = this.peek();
    if (!tok) return null;

    if (tok.type === 'NUMBER') {
      this.consume();
      return (tok as any).value;
    }

    if (tok.type === 'LPAREN') {
      this.consume();
      const val = this.parseExpr();
      if (this.peek()?.type !== 'RPAREN') return null;
      this.consume();
      return val;
    }

    return null;
  }

  isFullyConsumed() { return this.pos >= this.tokens.length; }
}

// ─── String interpolation fallback ───────────────────────────────────────────

function stringInterpolate(
  expr: string,
  resolvedValues: Record<string, string>
): string {
  const substituted = expr.replace(/\[([A-Za-z0-9_.-]+)\]/g, (_, key: string) => {
    return resolvedValues[key] ?? resolvedValues[key.toLowerCase()] ?? '';
  });
  // Remove quotes from string literals
  return substituted.replace(/["']([^"']*)["']/g, '$1').trim();
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Evaluate a formula expression, substituting [key] references from resolvedValues.
 *
 * @param formula         The formula string (e.g. "TODAY", "[a] / 100", "[x] - [y]")
 * @param resolvedValues  Already-resolved variable map (key → string value)
 * @returns               The computed string result, or '' on error
 */
export function evaluateFormula(
  formula: string,
  resolvedValues: Record<string, string>
): string {
  const trimmed = formula.trim();
  if (!trimmed) return '';

  // Special keyword: TODAY
  if (trimmed.toUpperCase() === 'TODAY') {
    return new Date().toISOString().split('T')[0];
  }

  // Substitute [key] references; track whether all referenced values are numeric
  let allNumeric = true;
  const substituted = trimmed.replace(/\[([A-Za-z0-9_.-]+)\]/g, (_, key: string) => {
    const val = resolvedValues[key] ?? resolvedValues[key.toLowerCase()] ?? '';
    const num = parseFloat(val);
    if (val.trim() === '' || isNaN(num)) allNumeric = false;
    return val;
  });

  // Try numeric evaluation when all substituted values are numbers
  if (allNumeric) {
    try {
      const tokens = tokenize(substituted);
      if (tokens) {
        const parser = new Parser(tokens);
        const result = parser.parseExpr();
        if (result !== null && parser.isFullyConsumed()) {
          return String(result);
        }
      }
    } catch {
      // Fall through to string fallback
    }
  }

  // String interpolation fallback
  return stringInterpolate(trimmed, resolvedValues);
}

/**
 * Resolve all formula variables, respecting inter-variable dependencies.
 * Only formula variables that have NO per-company explicit value should be passed here.
 * Cycles are broken by substituting '' for the circular reference.
 *
 * @param formulaVars  Map of key → formula string for variables needing resolution
 * @param baseValues   Already-resolved scalar values (auto + manual company values)
 * @returns            Record of key → resolved string value for formula variables
 */
export function resolveFormulaVariables(
  formulaVars: Map<string, string>,
  baseValues: Record<string, string>
): Record<string, string> {
  const resolved: Record<string, string> = { ...baseValues };
  const inProgress = new Set<string>();

  function resolve(key: string): string {
    if (resolved[key] !== undefined) return resolved[key];
    if (inProgress.has(key)) {
      console.warn(`[formulaEvaluator] Circular reference detected for variable: ${key}`);
      return '';
    }

    const formula = formulaVars.get(key);
    if (!formula) return '';

    inProgress.add(key);

    // Resolve any referenced keys that are also formula vars before evaluating
    const refPattern = /\[([A-Za-z0-9_.-]+)\]/g;
    for (const match of formula.matchAll(refPattern)) {
      const refKey = match[1];
      if (formulaVars.has(refKey) && resolved[refKey] === undefined) {
        resolved[refKey] = resolve(refKey);
      }
    }

    const result = evaluateFormula(formula, resolved);
    inProgress.delete(key);
    resolved[key] = result;
    return result;
  }

  for (const key of formulaVars.keys()) {
    resolve(key);
  }

  const formulaResults: Record<string, string> = {};
  for (const key of formulaVars.keys()) {
    formulaResults[key] = resolved[key] ?? '';
  }
  return formulaResults;
}
