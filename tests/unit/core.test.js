const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../../js/core.js");

const DATA = [
  {
    id: 1,
    title: "Modul 1: Hiểu biết về CNTT cơ bản",
    questions: [
      { n: 1, q: "Q1?", opts: ["a", "b", "c", "d"], ans: [2] },
      { n: 2, q: "Q2?", opts: ["a", "b", "c", "d"], ans: [0] },
      { n: 3, q: "Q3?", opts: ["a", "b"], ans: [1] },
    ],
  },
  {
    id: 2,
    title: "Modul 2: Sử dụng máy tính cơ bản",
    questions: [
      { n: 1, q: "Q4?", opts: ["a", "b", "c", "d"], ans: [3] },
      { n: 2, q: "Q5?", opts: ["a", "b", "c", "d"], ans: [1] },
    ],
  },
];

const seqRng = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test("buildBank flattens questions with unique keys and module names", () => {
  const bank = Core.buildBank(DATA);
  assert.equal(bank.questions.length, 5);
  assert.deepEqual(
    bank.questions.map((q) => q.key),
    ["1-1", "1-2", "1-3", "2-1", "2-2"]
  );
  assert.equal(bank.modules[0].name, "Hiểu biết về CNTT cơ bản");
  assert.equal(bank.modules[1].count, 2);
  assert.equal(bank.byKey["2-1"].answer, 3);
});

test("isCorrect compares the chosen index with the answer", () => {
  const bank = Core.buildBank(DATA);
  assert.equal(Core.isCorrect(bank.byKey["1-1"], 2), true);
  assert.equal(Core.isCorrect(bank.byKey["1-1"], 1), false);
});

test("recordAnswer returns a new progress object and keeps the original", () => {
  const p0 = Core.emptyProgress();
  const p1 = Core.recordAnswer(p0, "1-1", 2, true, 100);
  assert.notEqual(p0, p1);
  assert.deepEqual(p0.answers, {});
  assert.deepEqual(p1.answers["1-1"], { choice: 2, ok: true, at: 100 });
});

test("recordAnswer overwrites an earlier answer for the same question", () => {
  let p = Core.recordAnswer(Core.emptyProgress(), "1-1", 0, false, 1);
  p = Core.recordAnswer(p, "1-1", 2, true, 2);
  assert.equal(p.answers["1-1"].ok, true);
});

test("moduleStats counts answered, correct and wrong per module", () => {
  const bank = Core.buildBank(DATA);
  let p = Core.emptyProgress();
  p = Core.recordAnswer(p, "1-1", 2, true, 1);
  p = Core.recordAnswer(p, "1-2", 3, false, 2);
  p = Core.recordAnswer(p, "2-1", 3, true, 3);
  assert.deepEqual(Core.moduleStats(p, bank, 1), { total: 3, answered: 2, correct: 1, wrong: 1 });
  assert.deepEqual(Core.moduleStats(p, bank, 2), { total: 2, answered: 1, correct: 1, wrong: 0 });
});

test("overallStats sums every module", () => {
  const bank = Core.buildBank(DATA);
  let p = Core.recordAnswer(Core.emptyProgress(), "1-1", 2, true, 1);
  p = Core.recordAnswer(p, "2-2", 0, false, 2);
  assert.deepEqual(Core.overallStats(p, bank), { total: 5, answered: 2, correct: 1, wrong: 1 });
});

test("wrongKeys lists latest-wrong questions in bank order only", () => {
  const bank = Core.buildBank(DATA);
  let p = Core.emptyProgress();
  p = Core.recordAnswer(p, "2-1", 0, false, 1);
  p = Core.recordAnswer(p, "1-2", 3, false, 2);
  p = Core.recordAnswer(p, "1-1", 0, false, 3);
  p = Core.recordAnswer(p, "1-1", 2, true, 4);
  assert.deepEqual(Core.wrongKeys(p, bank), ["1-2", "2-1"]);
});

test("firstUnansweredIndex finds the resume point, or 0 when all answered", () => {
  const bank = Core.buildBank(DATA);
  const items = bank.questions.filter((q) => q.m === 1).map((q) => q.key);
  let p = Core.recordAnswer(Core.emptyProgress(), "1-1", 2, true, 1);
  assert.equal(Core.firstUnansweredIndex(items, p), 1);
  p = Core.recordAnswer(p, "1-2", 0, true, 2);
  p = Core.recordAnswer(p, "1-3", 1, true, 3);
  assert.equal(Core.firstUnansweredIndex(items, p), 0);
});

test("resetModule removes only the answers of that module", () => {
  const bank = Core.buildBank(DATA);
  let p = Core.recordAnswer(Core.emptyProgress(), "1-1", 2, true, 1);
  p = Core.recordAnswer(p, "2-1", 3, true, 2);
  const next = Core.resetModule(p, bank, 1);
  assert.deepEqual(Object.keys(next.answers), ["2-1"]);
  assert.deepEqual(Object.keys(p.answers).sort(), ["1-1", "2-1"]);
});

test("shuffle returns a permutation and does not mutate the input", () => {
  const input = [1, 2, 3, 4, 5];
  const out = Core.shuffle(input, seqRng([0.1, 0.9, 0.5, 0.3]));
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual([...out].sort(), [1, 2, 3, 4, 5]);
});

test("pickExam samples unique keys and caps at the bank size", () => {
  const bank = Core.buildBank(DATA);
  const three = Core.pickExam(bank, 3, seqRng([0.2, 0.7, 0.4]));
  assert.equal(three.length, 3);
  assert.equal(new Set(three).size, 3);
  const many = Core.pickExam(bank, 99, Math.random);
  assert.equal(many.length, 5);
});

test("scoreExam counts correct, wrong and unanswered", () => {
  const bank = Core.buildBank(DATA);
  const keys = ["1-1", "1-2", "2-1", "2-2"];
  const answers = { "1-1": 2, "1-2": 1, "2-1": 3 };
  const r = Core.scoreExam(bank, keys, answers);
  assert.equal(r.total, 4);
  assert.equal(r.correct, 2);
  assert.deepEqual(r.wrong, ["1-2"]);
  assert.deepEqual(r.unanswered, ["2-2"]);
  assert.equal(r.percent, 50);
});

test("addExamResult keeps only the ten most recent results", () => {
  let p = Core.emptyProgress();
  for (let i = 0; i < 12; i++) {
    p = Core.addExamResult(p, { at: i, total: 10, correct: i });
  }
  assert.equal(p.exams.length, 10);
  assert.equal(p.exams[0].at, 11);
});

test("formatDuration renders mm:ss and h:mm:ss", () => {
  assert.equal(Core.formatDuration(0), "00:00");
  assert.equal(Core.formatDuration(65), "01:05");
  assert.equal(Core.formatDuration(3725), "1:02:05");
  assert.equal(Core.formatDuration(-5), "00:00");
});

test("sanitizeProgress rejects malformed stored data", () => {
  assert.deepEqual(Core.sanitizeProgress(null), Core.emptyProgress());
  assert.deepEqual(Core.sanitizeProgress("junk"), Core.emptyProgress());
  const ok = Core.sanitizeProgress({
    answers: { "1-1": { choice: 2, ok: true, at: 5 }, bad: 7, "1-2": { choice: "x" } },
    exams: "nope",
  });
  assert.deepEqual(Object.keys(ok.answers), ["1-1"]);
  assert.deepEqual(ok.exams, []);
});
