/** Safe calculator — no eval, no Python confirm. */

const FUNCS = new Set(["sqrt", "sin", "cos", "tan", "log", "ln", "abs"])

export function isCalcQuery(text: string): boolean {
  const lower = text.toLowerCase().trim()
  if (/\b(run python|execute python|python sandbox)\b/.test(lower)) return false
  if (/^open (the )?calculator\b/.test(lower) || /\b(open|use) (the )?calculator\b/.test(lower)) {
    return true
  }
  if (/\b(\d+(?:\.\d+)?)\s*%\s*of\b/.test(lower)) return true
  if (/\b(calculate|compute|what(?:'s| is) \d|how much is|equals)\b/.test(lower)) return true
  if (/\b\d+\s+(times|plus|minus|divided by)\s+\d/.test(lower)) return true
  return /\b\d+(?:\.\d+)?\s*[+\-*/x×÷^]\s*\d/.test(lower)
}

export function calcExpr(text: string): string {
  const of = text.match(/\b(\d+(?:\.\d+)?)\s*%\s*of\s+(\d+(?:\.\d+)?)/i)
  if (of) return `${of[1]}% of ${of[2]}`
  const after = text.match(
    /\b(?:calculate|compute|what(?:'s| is)|how much is|equals?)\s+(.+)$/i
  )
  if (after?.[1]) return after[1].replace(/[?.!]+$/g, "").trim()
  return text.replace(/[?.!]+$/g, "").trim()
}

function rewrite(raw: string) {
  return raw
    .replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*/gi, "($1/100)*")
    .replace(/\bplus\b/gi, "+")
    .replace(/\bminus\b/gi, "-")
    .replace(/\b(?:times|multiplied by|x)\b/gi, "*")
    .replace(/[×]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/\b(?:divided by|over)\b/gi, "/")
    .replace(/\bto the power of\b/gi, "^")
    .replace(/\bsquare root of\b/gi, "sqrt")
    .replace(/\bpi\b/gi, "pi")
    .replace(/,/g, "")
}

type Tok =
  | { kind: "num"; value: number }
  | { kind: "op"; value: string }
  | { kind: "fn"; value: string }
  | { kind: "lp" }
  | { kind: "rp" }

function tokenize(source: string): Tok[] {
  const tokens: Tok[] = []
  const re =
    /(?:\d+(?:\.\d+)?(?:e[+-]?\d+)?)|sqrt|sin|cos|tan|log|ln|abs|pi|e|%|[+\-*/^()]|\s+/gi
  let lastOp = true
  for (const part of source.match(re) ?? []) {
    if (/^\s+$/.test(part)) continue
    const low = part.toLowerCase()
    if (low === "pi") {
      tokens.push({ kind: "num", value: Math.PI })
      lastOp = false
      continue
    }
    if (low === "e") {
      tokens.push({ kind: "num", value: Math.E })
      lastOp = false
      continue
    }
    if (FUNCS.has(low)) {
      tokens.push({ kind: "fn", value: low })
      lastOp = true
      continue
    }
    if (low === "%") {
      tokens.push({ kind: "op", value: "%" })
      lastOp = false
      continue
    }
    if (/^[+\-*/^()]$/.test(part)) {
      if (part === "-" && lastOp) {
        tokens.push({ kind: "fn", value: "neg" })
        lastOp = true
        continue
      }
      if (part === "(") tokens.push({ kind: "lp" })
      else if (part === ")") tokens.push({ kind: "rp" })
      else tokens.push({ kind: "op", value: part })
      lastOp = part !== ")"
      continue
    }
    const value = Number(part)
    if (!Number.isFinite(value)) throw new Error("Not a number I can use.")
    tokens.push({ kind: "num", value })
    lastOp = false
  }
  return tokens
}

function prec(op: string) {
  if (op === "%" || op === "neg") return 5
  if (op === "^") return 4
  if (op === "*" || op === "/") return 3
  return 2
}

function rightAssoc(op: string) {
  return op === "^" || op === "neg"
}

function toRpn(tokens: Tok[]): Tok[] {
  const out: Tok[] = []
  const stack: Tok[] = []
  for (const tok of tokens) {
    if (tok.kind === "num") out.push(tok)
    else if (tok.kind === "fn") stack.push(tok)
    else if (tok.kind === "op") {
      while (stack.length) {
        const top = stack[stack.length - 1]
        if (top?.kind !== "op") break
        const take =
          (!rightAssoc(tok.value) && prec(top.value) >= prec(tok.value)) ||
          (rightAssoc(tok.value) && prec(top.value) > prec(tok.value))
        if (!take) break
        out.push(stack.pop() as Tok)
      }
      stack.push(tok)
    } else if (tok.kind === "lp") stack.push(tok)
    else if (tok.kind === "rp") {
      while (stack.length && stack[stack.length - 1]?.kind !== "lp") {
        out.push(stack.pop() as Tok)
      }
      if (stack[stack.length - 1]?.kind !== "lp") throw new Error("Unbalanced parentheses.")
      stack.pop()
      if (stack[stack.length - 1]?.kind === "fn") out.push(stack.pop() as Tok)
    }
  }
  while (stack.length) {
    const top = stack.pop() as Tok
    if (top.kind === "lp" || top.kind === "rp") throw new Error("Unbalanced parentheses.")
    out.push(top)
  }
  return out
}

function applyFn(name: string, a: number) {
  switch (name) {
    case "neg":
      return -a
    case "sqrt":
      if (a < 0) throw new Error("Square root of a negative.")
      return Math.sqrt(a)
    case "sin":
      return Math.sin(a)
    case "cos":
      return Math.cos(a)
    case "tan":
      return Math.tan(a)
    case "log":
      if (a <= 0) throw new Error("Log of a non-positive.")
      return Math.log10(a)
    case "ln":
      if (a <= 0) throw new Error("Log of a non-positive.")
      return Math.log(a)
    case "abs":
      return Math.abs(a)
    default:
      throw new Error("Unknown function.")
  }
}

function evalRpn(rpn: Tok[]): number {
  const stack: number[] = []
  for (const tok of rpn) {
    if (tok.kind === "num") {
      stack.push(tok.value)
      continue
    }
    if (tok.kind === "fn") {
      const a = stack.pop()
      if (a == null) throw new Error("That expression is incomplete.")
      stack.push(applyFn(tok.value, a))
      continue
    }
    if (tok.kind === "op" && tok.value === "%") {
      const a = stack.pop()
      if (a == null) throw new Error("That expression is incomplete.")
      stack.push(a / 100)
      continue
    }
    const b = stack.pop()
    const a = stack.pop()
    if (a == null || b == null) throw new Error("That expression is incomplete.")
    switch (tok.value) {
      case "+":
        stack.push(a + b)
        break
      case "-":
        stack.push(a - b)
        break
      case "*":
        stack.push(a * b)
        break
      case "/":
        if (b === 0) throw new Error("Division by zero.")
        stack.push(a / b)
        break
      case "^":
        stack.push(a ** b)
        break
      default:
        throw new Error("Unknown operator.")
    }
  }
  if (stack.length !== 1 || !Number.isFinite(stack[0])) {
    throw new Error("Could not finish that calculation.")
  }
  return stack[0] as number
}

export function formatCalc(value: number) {
  if (!Number.isFinite(value)) return "undefined"
  if (Number.isInteger(value) && Math.abs(value) < 1e12) return String(value)
  const rounded = Number(value.toPrecision(12))
  return String(rounded)
}

export function evaluateCalc(raw: string): { ok: true; value: number; text: string } | { ok: false; error: string } {
  const source = rewrite(raw).trim()
  if (!source || source.length > 200) {
    return { ok: false, error: "Give me a shorter expression — 15% of 240, or 23 * 17." }
  }
  if (!/[\d)]/.test(source) && !/\b(pi|e)\b/i.test(source)) {
    return { ok: false, error: "I need a number in there." }
  }
  try {
    const value = evalRpn(toRpn(tokenize(source)))
    return { ok: true, value, text: formatCalc(value) }
  } catch (caught) {
    return {
      ok: false,
      error: caught instanceof Error ? caught.message : "Could not calculate that.",
    }
  }
}
