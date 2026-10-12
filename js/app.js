// App controller: hash router, session state, and the actions the views call.
// Progress and session objects are never mutated; each change swaps in a new object.
(function () {
  const { Core, Store, Shell, Views } = window;
  const bank = Core.buildBank(window.QUESTION_DATA);
  const main = document.getElementById("main");

  const SECONDS_PER_QUESTION = 60;
  const BRAND = "Quý ông người pháp";
  const TITLE = `${BRAND} | Ôn thi CNTT cơ bản`;

  const app = {
    bank,
    progress: Store.loadProgress(),
    session: null,
    route: { name: "home" },
    cleanups: [],
    pendingFocus: null,
    pendingScroll: null,
    pendingWrongKeys: null,
    submitting: false,
  };

  app.onCleanup = (fn) => app.cleanups.push(fn);

  function runCleanups() {
    const fns = app.cleanups;
    app.cleanups = [];
    fns.forEach((fn) => fn());
  }

  function setProgress(next) {
    app.progress = next;
    Store.saveProgress(next);
  }

  function setSession(next) {
    app.session = next;
    if (next && next.mode === "exam" && !next.submitted) {
      Store.saveExam({
        keys: next.keys,
        answers: next.answers,
        index: next.index,
        startedAt: next.startedAt,
        limitSec: next.limitSec,
      });
    }
  }

  const go = (hash) => {
    if (location.hash === hash) onRoute();
    else location.hash = hash;
  };

  /* ---------- routing ---------- */

  function parseRoute(hash) {
    const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const [name, arg] = parts;
    if (name === "practice" && bank.modules.some((m) => m.id === Number(arg))) {
      return { name: "practice", moduleId: Number(arg) };
    }
    if (name === "wrong" || name === "exam" || name === "result") return { name };
    return { name: "home" };
  }

  function sessionFromSaved(saved) {
    const answers = {};
    for (const [key, choice] of Object.entries(saved.answers)) {
      if (bank.byKey[key] && Number.isInteger(choice)) answers[key] = choice;
    }
    const keys = saved.keys.filter((k) => bank.byKey[k]);
    if (keys.length === 0) return null;
    const index = Number.isInteger(saved.index) ? Math.min(Math.max(saved.index, 0), keys.length - 1) : 0;
    return {
      mode: "exam",
      title: "Thi thử tổng hợp",
      keys,
      index,
      answers,
      startedAt: saved.startedAt,
      limitSec: saved.limitSec,
    };
  }

  /** Builds the session a route needs. Returns false when the route must redirect home. */
  function prepareSession(route) {
    if (route.name === "practice") {
      const mod = bank.modules.find((m) => m.id === route.moduleId);
      const keys = bank.questions.filter((q) => q.m === mod.id).map((q) => q.key);
      setSession({
        mode: "practice",
        title: `Module ${mod.id}: ${mod.name}`,
        moduleId: mod.id,
        keys,
        index: Core.firstUnansweredIndex(keys, app.progress),
        answers: {},
      });
      return true;
    }
    if (route.name === "wrong") {
      const keys = app.pendingWrongKeys || Core.wrongKeys(app.progress, bank);
      app.pendingWrongKeys = null;
      if (keys.length === 0) return false;
      setSession({ mode: "wrong", title: "Ôn lại câu sai", keys, index: 0, answers: {} });
      return true;
    }
    if (route.name === "exam") {
      if (app.session && app.session.mode === "exam" && !app.session.submitted) return true;
      const saved = Store.loadExam();
      const restored = saved ? sessionFromSaved(saved) : null;
      if (!restored) return false;
      setSession(restored);
      return true;
    }
    if (route.name === "result") {
      return Boolean(app.session && app.session.submitted);
    }
    return true;
  }

  let hasRendered = false;

  function onRoute() {
    // Ignore in-page anchors such as the skip link, but never before the first render:
    // a reload on "#main" must still show the home page.
    if (hasRendered && location.hash && !location.hash.startsWith("#/")) return;
    hasRendered = true;
    runCleanups();
    const route = parseRoute(location.hash);
    if (!prepareSession(route)) {
      app.route = { name: "home" };
      if (location.hash !== "#/") history.replaceState(null, "", "#/");
    } else {
      app.route = route;
    }
    render(true);
  }

  /* ---------- rendering ---------- */

  function viewFor(route) {
    if (route.name === "home") return Views.home;
    if (route.name === "result") return Views.result;
    return Views.quiz;
  }

  function render(routeChanged) {
    runCleanups();
    const route = app.route;
    Shell.renderHeader(app, route);
    Shell.renderFooter(app);
    main.replaceChildren(viewFor(route)(app));
    document.title = route.name === "home" ? TITLE : `${app.session ? app.session.title : ""} | ${BRAND}`;
    afterRender(routeChanged);
  }

  function afterRender(routeChanged) {
    if (app.pendingScroll) {
      const target = document.getElementById(app.pendingScroll);
      app.pendingScroll = null;
      if (target) {
        target.scrollIntoView();
        target.focus({ preventScroll: true });
        return;
      }
    }
    if (routeChanged) {
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
      if (app.pendingFocus === null) return;
    }
    if (app.pendingFocus) {
      const el = main.querySelector(`[data-focus="${app.pendingFocus}"]`);
      app.pendingFocus = null;
      if (el) el.focus({ preventScroll: !el.matches("[data-focus='question']") });
    }
  }

  /* ---------- actions ---------- */

  app.goSection = (id) => {
    if (app.route.name === "home") {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView();
        target.focus({ preventScroll: true });
      }
      return;
    }
    app.pendingScroll = id;
    go("#/");
  };

  app.goIndex = (index) => {
    setSession({ ...app.session, index });
    app.pendingFocus = "question";
    render(false);
  };

  app.exitQuiz = () => go("#/");

  app.answer = (choice) => {
    const s = app.session;
    const key = s.keys[s.index];
    const q = bank.byKey[key];

    if (s.mode === "exam") {
      setSession({ ...s, answers: { ...s.answers, [key]: choice } });
      app.pendingFocus = `option-${choice}`;
      render(false);
      return;
    }

    const alreadyAnswered = s.mode === "practice" ? Boolean(app.progress.answers[key]) : s.answers[key] !== undefined;
    if (alreadyAnswered) return;

    setProgress(Core.recordAnswer(app.progress, key, choice, Core.isCorrect(q, choice), Date.now()));
    if (s.mode === "wrong") setSession({ ...s, answers: { ...s.answers, [key]: choice } });
    app.pendingFocus = "next";
    render(false);
  };

  app.startExam = async (count) => {
    if (Store.loadExam()) {
      const ok = await Shell.confirmDialog({
        title: "Bắt đầu bài thi mới?",
        body: "Bài thi đang làm dở sẽ bị thay thế bằng đề mới.",
        confirmText: "Bắt đầu bài mới",
      });
      if (!ok) return;
    }
    const keys = Core.pickExam(bank, count);
    setSession({
      mode: "exam",
      title: "Thi thử tổng hợp",
      keys,
      index: 0,
      answers: {},
      startedAt: Date.now(),
      limitSec: keys.length * SECONDS_PER_QUESTION,
    });
    go("#/exam");
  };

  app.submitExam = async (auto) => {
    const s = app.session;
    if (!s || s.mode !== "exam" || s.submitted || app.submitting) return;
    app.submitting = true;
    try {
      const unanswered = s.keys.filter((k) => s.answers[k] === undefined).length;
      if (!auto && unanswered > 0) {
        const ok = await Shell.confirmDialog({
          title: "Nộp bài ngay?",
          body: `Bạn còn ${unanswered} câu chưa trả lời. Những câu này sẽ tính là sai.`,
          confirmText: "Nộp bài",
        });
        if (!ok) return;
      }
      finishExam(s, auto);
    } finally {
      app.submitting = false;
    }
  };

  function finishExam(s, auto) {
    const now = Date.now();
    const result = Core.scoreExam(bank, s.keys, s.answers);
    let progress = app.progress;
    for (const key of s.keys) {
      const choice = s.answers[key];
      if (choice !== undefined) {
        progress = Core.recordAnswer(progress, key, choice, Core.isCorrect(bank.byKey[key], choice), now);
      }
    }
    const elapsedSec = Math.min(s.limitSec, Math.floor((now - s.startedAt) / 1000));
    progress = Core.addExamResult(progress, {
      at: now,
      total: result.total,
      correct: result.correct,
      secs: elapsedSec,
    });
    setProgress(progress);
    Store.clearExam();
    setSession({ ...s, submitted: true, result, elapsedSec, auto: Boolean(auto) });
    go("#/result");
  }

  app.reviewWrong = (keys) => {
    app.pendingWrongKeys = keys;
    go("#/wrong");
  };

  app.resetModule = async (moduleId) => {
    const mod = bank.modules.find((m) => m.id === moduleId);
    const ok = await Shell.confirmDialog({
      title: `Làm lại Module ${moduleId}?`,
      body: `Kết quả đã làm của "${mod.name}" sẽ bị xóa. Các module khác không bị ảnh hưởng.`,
      confirmText: "Làm lại",
      danger: true,
    });
    if (!ok) return;
    setProgress(Core.resetModule(app.progress, bank, moduleId));
    render(false);
  };

  app.resetAll = async () => {
    const ok = await Shell.confirmDialog({
      title: "Xóa toàn bộ tiến độ?",
      body: "Mọi câu đã làm, danh sách câu sai và lịch sử thi thử sẽ bị xóa khỏi trình duyệt này.",
      confirmText: "Xóa tất cả",
      danger: true,
    });
    if (!ok) return;
    Store.clearProgress();
    Store.clearExam();
    app.progress = Core.emptyProgress();
    app.session = null;
    go("#/");
  };

  // Another tab changed progress: adopt it so this tab never overwrites it with stale data.
  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== "cntt-onthi:v1") return;
    app.progress = Store.loadProgress();
    render(false);
  });

  window.addEventListener("hashchange", onRoute);
  window.App = app;
  onRoute();
})();
