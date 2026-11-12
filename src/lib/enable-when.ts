export type AnswerValue = {
  boolean?: boolean | null;
  coding?: string | null;
  text?: string | null;
};

export type EnableWhen = {
  questionLinkId: string;
  operator: string;
  answerBoolean: boolean | null;
  answerString: string | null;
  answerCoding: string | null;
};

function present(answer: AnswerValue | undefined) {
  if (!answer) return false;
  if (answer.boolean != null) return true;
  if (answer.coding != null && answer.coding !== "") return true;
  if (answer.text != null && answer.text !== "") return true;
  return false;
}

function asNumber(value: string | null | undefined) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function matches(condition: EnableWhen, answer: AnswerValue | undefined) {
  if (condition.operator === "exists") return present(answer);
  if (!present(answer) || !answer) return false;

  const expected =
    condition.answerBoolean ??
    condition.answerCoding ??
    condition.answerString;
  const actual =
    answer.boolean ?? answer.coding ?? answer.text ?? null;

  if (condition.operator === "=") return actual === expected;
  if (condition.operator === "!=") return actual !== expected;

  const left = asNumber(
    typeof actual === "string" ? actual : actual == null ? null : String(actual),
  );
  const right = asNumber(
    typeof expected === "string" ? expected : expected == null ? null : String(expected),
  );
  if (left == null || right == null) return false;
  if (condition.operator === ">") return left > right;
  if (condition.operator === "<") return left < right;
  if (condition.operator === ">=") return left >= right;
  if (condition.operator === "<=") return left <= right;
  return false;
}

export function isItemEnabled(
  conditions: EnableWhen[],
  behavior: "all" | "any" | null,
  answers: Record<string, AnswerValue | undefined>,
) {
  if (conditions.length === 0) return true;
  const results = conditions.map((condition) =>
    matches(condition, answers[condition.questionLinkId]),
  );
  if (conditions.length > 1 && behavior === "any") return results.some(Boolean);
  return results.every(Boolean);
}
