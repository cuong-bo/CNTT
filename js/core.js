// Pure quiz logic: no DOM, no storage. Every update returns a new object.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const MAX_EXAM_HISTORY = 10;

  /**
   * @param {Array<{id:number,title:string,questions:Array}>} data
   */
  function buildBank(data) {
    const modules = [];
    const questions = [];
    const byKey = {};
    for (const mod of data) {
      modules.push({
        id: mod.id,
        name: mod.title.replace(/^Modul\s*\d+\s*:\s*/i, ""),
        count: mod.questions.length,
      });
      for (const item of mod.questions) {
        const q = {
          key: `${mod.id}-${item.n}`,
          m: mod.id,
          n: item.n,
          q: item.q,
          opts: item.opts,
          answer: item.ans[0],
        };
        questions.push(q);
        byKey[q.key] = q;
      }
    }
    return { modules, questions, byKey };
  }

  const isCorrect = (question, choice) => question.answer === choice;

  const emptyProgress = () => ({ answers: {}, exams: [] });

  function recordAnswer(progress, key, choice, ok, at) {
    return { ...progress, answers: { ...progress.answers, [key]: { choice, ok, at } } };
  }

  function tally(progress, questions) {
    let answered = 0;
    let correct = 0;
    for (const q of questions) {
      const a = progress.answers[q.key];
      if (!a) continue;
      answered += 1;
      if (a.ok) correct += 1;
    }
    return { total: questions.length, answered, correct, wrong: answered - correct };
  }

  const moduleStats = (progress, bank, moduleId) =>
    tally(progress, bank.questions.filter((q) => q.m === moduleId));

  const overallStats = (progress, bank) => tally(progress, bank.questions);

  function wrongKeys(progress, bank) {
    return bank.questions
      .filter((q) => progress.answers[q.key] && !progress.answers[q.key].ok)
      .map((q) => q.key);
  }

  function firstUnansweredIndex(keys, progress) {
    const i = keys.findIndex((k) => !progress.answers[k]);
    return i === -1 ? 0 : i;
  }

  function resetModule(progress, bank, moduleId) {
    const answers = {};
    for (const [key, value] of Object.entries(progress.answers)) {
      if (bank.byKey[key] && bank.byKey[key].m === moduleId) continue;
      answers[key] = value;
    }
    return { ...progress, answers };
  }

  /** Fisher-Yates on a copy. `rng` returns a number in [0, 1). */
  function shuffle(list, rng = Math.random) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function pickExam(bank, count, rng = Math.random) {
    const keys = shuffle(
      bank.questions.map((q) => q.key),
      rng
    );
    return keys.slice(0, Math.min(count, keys.length));
  }

  function scoreExam(bank, keys, answers) {
    const wrong = [];
    const unanswered = [];
    let correct = 0;
    for (const key of keys) {
      const choice = answers[key];
      if (choice === undefined) unanswered.push(key);
      else if (isCorrect(bank.byKey[key], choice)) correct += 1;
      else wrong.push(key);
    }
    const total = keys.length;
    return {
      total,
      correct,
      wrong,
      unanswered,
      percent: total === 0 ? 0 : Math.round((correct / total) * 100),
    };
  }

  function addExamResult(progress, result) {
    return { ...progress, exams: [result, ...progress.exams].slice(0, MAX_EXAM_HISTORY) };
  }

  function formatDuration(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  }

  /** Drop anything in stored data that does not match the expected shape. */
  function sanitizeProgress(raw) {
    if (!raw || typeof raw !== "object") return emptyProgress();
    const answers = {};
    if (raw.answers && typeof raw.answers === "object") {
      for (const [key, a] of Object.entries(raw.answers)) {
        if (a && Number.isInteger(a.choice) && typeof a.ok === "boolean") {
          answers[key] = { choice: a.choice, ok: a.ok, at: Number(a.at) || 0 };
        }
      }
    }
    const exams = Array.isArray(raw.exams)
      ? raw.exams
          .filter((e) => e && Number.isFinite(e.total) && Number.isFinite(e.correct))
          .slice(0, MAX_EXAM_HISTORY)
      : [];
    return { answers, exams };
  }

  return {
    buildBank,
    isCorrect,
    emptyProgress,
    recordAnswer,
    moduleStats,
    overallStats,
    wrongKeys,
    firstUnansweredIndex,
    resetModule,
    shuffle,
    pickExam,
    scoreExam,
    addExamResult,
    formatDuration,
    sanitizeProgress,
  };
});
