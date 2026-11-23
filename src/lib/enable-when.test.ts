import assert from "node:assert/strict";
import test from "node:test";
import { isItemEnabled, type EnableWhen } from "./enable-when.ts";

const whenYes: EnableWhen = {
  questionLinkId: "palpitation",
  operator: "=",
  answerBoolean: true,
  answerString: null,
  answerCoding: null,
};

test("a question with no rule stays visible", () => {
  assert.equal(isItemEnabled([], null, {}), true);
});

test("duration stays hidden until palpitations are yes", () => {
  assert.equal(
    isItemEnabled([whenYes], "all", { palpitation: { boolean: false } }),
    false,
  );
  assert.equal(
    isItemEnabled([whenYes], "all", { palpitation: { boolean: true } }),
    true,
  );
});

test("any shows the question when one rule matches", () => {
  const other: EnableWhen = {
    questionLinkId: "other",
    operator: "=",
    answerBoolean: null,
    answerString: null,
    answerCoding: "yes",
  };
  assert.equal(
    isItemEnabled([whenYes, other], "any", {
      palpitation: { boolean: false },
      other: { coding: "yes" },
    }),
    true,
  );
  assert.equal(
    isItemEnabled([whenYes, other], "all", {
      palpitation: { boolean: false },
      other: { coding: "yes" },
    }),
    false,
  );
});
