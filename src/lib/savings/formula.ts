type Token =
  | { type: "number"; value: number }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" }
  | { type: "paren"; value: "(" | ")" }
  | { type: "comma"; value: "," };

type ParserState = {
  tokens: Token[];
  index: number;
  variables: Record<string, number>;
};

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
  round: (value) => Math.round(value),
  ceil: (value) => Math.ceil(value),
  floor: (value) => Math.floor(value),
  abs: (value) => Math.abs(value),
};

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    const ch = expression[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let raw = ch;
      i += 1;
      while (i < expression.length && /[0-9.]/.test(expression[i])) {
        raw += expression[i];
        i += 1;
      }
      if (!/^\d+(\.\d+)?$/.test(raw)) {
        throw new FormulaError(`Nombre invalide : ${raw}`);
      }
      tokens.push({ type: "number", value: Number.parseFloat(raw) });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let raw = ch;
      i += 1;
      while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
        raw += expression[i];
        i += 1;
      }
      tokens.push({ type: "identifier", value: raw });
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "operator", value: ch });
      i += 1;
      continue;
    }

    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i += 1;
      continue;
    }

    if (ch === ",") {
      tokens.push({ type: "comma", value: "," });
      i += 1;
      continue;
    }

    throw new FormulaError(`Caractère non autorisé : ${ch}`);
  }

  return tokens;
}

function peek(state: ParserState) {
  return state.tokens[state.index];
}

function consume(state: ParserState) {
  const token = state.tokens[state.index];
  state.index += 1;
  return token;
}

function parsePrimary(state: ParserState): number {
  const token = consume(state);
  if (!token) throw new FormulaError("Formule incomplète.");

  if (token.type === "number") return token.value;

  if (token.type === "operator" && token.value === "-") {
    return -parsePrimary(state);
  }

  if (token.type === "identifier") {
    const next = peek(state);
    if (next?.type === "paren" && next.value === "(") {
      consume(state);
      const args: number[] = [];
      if (peek(state)?.type === "paren" && peek(state)?.value === ")") {
        consume(state);
      } else {
        while (true) {
          args.push(parseExpression(state));
          const delimiter = peek(state);
          if (delimiter?.type === "comma") {
            consume(state);
            continue;
          }
          if (delimiter?.type === "paren" && delimiter.value === ")") {
            consume(state);
            break;
          }
          throw new FormulaError("Virgule ou parenthèse fermante attendue.");
        }
      }

      const fn = FUNCTIONS[token.value];
      if (!fn) throw new FormulaError(`Fonction inconnue : ${token.value}`);
      if (args.length === 0) throw new FormulaError(`La fonction ${token.value} attend au moins un argument.`);
      return fn(...args);
    }

    if (!(token.value in state.variables)) {
      throw new FormulaError(`Variable inconnue : ${token.value}`);
    }
    return state.variables[token.value];
  }

  if (token.type === "paren" && token.value === "(") {
    const value = parseExpression(state);
    const close = consume(state);
    if (!close || close.type !== "paren" || close.value !== ")") {
      throw new FormulaError("Parenthèse fermante attendue.");
    }
    return value;
  }

  throw new FormulaError("Expression invalide.");
}

function parseFactor(state: ParserState): number {
  let left = parsePrimary(state);
  while (true) {
    const token = peek(state);
    if (!token || token.type !== "operator" || (token.value !== "*" && token.value !== "/")) {
      return left;
    }
    consume(state);
    const right = parsePrimary(state);
    if (token.value === "/" && right === 0) {
      throw new FormulaError("Division par zéro.");
    }
    left = token.value === "*" ? left * right : left / right;
  }
}

function parseExpression(state: ParserState): number {
  let left = parseFactor(state);
  while (true) {
    const token = peek(state);
    if (!token || token.type !== "operator" || (token.value !== "+" && token.value !== "-")) {
      return left;
    }
    consume(state);
    const right = parseFactor(state);
    left = token.value === "+" ? left + right : left - right;
  }
}

export function evaluateFormula(expression: string, variables: Record<string, number>) {
  if (expression.trim().length === 0) {
    throw new FormulaError("La formule est vide.");
  }
  if (expression.length > 500) {
    throw new FormulaError("La formule est trop longue.");
  }

  const state: ParserState = {
    tokens: tokenize(expression),
    index: 0,
    variables,
  };

  const result = parseExpression(state);
  if (state.index < state.tokens.length) {
    throw new FormulaError("Expression inattendue en fin de formule.");
  }
  if (!Number.isFinite(result)) {
    throw new FormulaError("Le résultat n'est pas un nombre valide.");
  }
  return result;
}

export function interpolateReasonTemplate(template: string | null | undefined, values: Record<string, number>) {
  if (!template?.trim()) return null;
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_match, key: string) => {
    const value = values[key];
    if (value == null) return `{${key}}`;
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
  });
}
