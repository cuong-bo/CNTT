// Quiz route: practice (instant feedback), wrong-answer review, and timed exam (no feedback).
(function () {
  const { h, icon } = window.Dom;
  const Core = window.Core;

  const LOW_TIME_SECONDS = 300;
  const TICK_MS = 1000;
  let paletteOpen = false;

  const letter = (i) => String.fromCharCode(65 + i);

  /** The choice already made for this question in the current session, if any. */
  function chosenFor(app, key) {
    const s = app.session;
    if (s.mode === "practice") {
      const a = app.progress.answers[key];
      return a ? a.choice : undefined;
    }
    return s.answers[key];
  }

  const showsFeedback = (session) => session.mode !== "exam";

  function sessionCounts(app) {
    const s = app.session;
    let answered = 0;
    let correct = 0;
    for (const key of s.keys) {
      const c = chosenFor(app, key);
      if (c === undefined) continue;
      answered += 1;
      if (Core.isCorrect(app.bank.byKey[key], c)) correct += 1;
    }
    return { answered, correct, wrong: answered - correct, total: s.keys.length };
  }

  function optionButton(app, q, i, chosen) {
    const s = app.session;
    const locked = showsFeedback(s) && chosen !== undefined;
    const isAnswer = i === q.answer;
    const isPicked = chosen === i;
    const classes = ["opt"];
    let srNote = null;
    let mark = null;

    if (locked) {
      if (isAnswer) {
        classes.push("is-correct");
        mark = icon("check");
        srNote = "Đáp án đúng";
      } else if (isPicked) {
        classes.push("is-wrong");
        mark = icon("x");
        srNote = "Bạn đã chọn, chưa đúng";
      } else {
        classes.push("is-dim");
      }
    } else if (isPicked) {
      classes.push("is-selected");
    }

    return h(
      "button",
      {
        type: "button",
        class: classes.join(" "),
        "data-testid": `option-${i}`,
        "data-state": locked ? (isAnswer ? "correct" : isPicked ? "wrong" : "idle") : isPicked ? "selected" : "idle",
        "data-focus": `option-${i}`,
        "aria-disabled": locked ? "true" : false,
        "aria-pressed": !showsFeedback(s) ? String(isPicked) : false,
        onclick: () => app.answer(i),
      },
      h("span", { class: "opt-letter", "aria-hidden": "true" }, letter(i)),
      h("span", { class: "opt-text" }, h("span", { class: "sr-only" }, `${letter(i)}. `), q.opts[i]),
      h("span", { class: "opt-mark" }, mark, srNote ? h("span", { class: "sr-only" }, srNote) : null)
    );
  }

  function feedbackBox(app, q, chosen) {
    const box = h("div", { class: "feedback", role: "status", "aria-live": "polite", "data-testid": "feedback" });
    if (!showsFeedback(app.session) || chosen === undefined) return box;
    const ok = Core.isCorrect(q, chosen);
    box.classList.add(ok ? "is-ok" : "is-bad");
    box.append(
      icon(ok ? "checkFill" : "xFill"),
      h(
        "div",
        {},
        h("strong", {}, ok ? "Chính xác" : "Chưa đúng"),
        ok ? null : h("p", {}, `Đáp án đúng là ${letter(q.answer)}. ${q.opts[q.answer]}`)
      )
    );
    return box;
  }

  function paletteButton(app, key, i) {
    const s = app.session;
    const chosen = chosenFor(app, key);
    let state = "todo";
    if (chosen !== undefined) {
      if (!showsFeedback(s)) state = "picked";
      else state = Core.isCorrect(app.bank.byKey[key], chosen) ? "ok" : "bad";
    }
    const label = { todo: "chưa làm", picked: "đã chọn", ok: "đúng", bad: "sai" }[state];
    return h(
      "li",
      {},
      h(
        "button",
        {
          type: "button",
          class: `pal is-${state}${i === s.index ? " is-current" : ""}`,
          "aria-label": `Câu ${i + 1}, ${label}`,
          "aria-current": i === s.index ? "step" : false,
          "data-testid": `pal-${i + 1}`,
          onclick: () => app.goIndex(i),
        },
        i + 1
      )
    );
  }

  function palette(app) {
    const s = app.session;
    const counts = sessionCounts(app);
    const exam = !showsFeedback(s);
    const legend = exam
      ? [["picked", "Đã chọn"], ["todo", "Chưa chọn"]]
      : [["ok", "Đúng"], ["bad", "Sai"], ["todo", "Chưa làm"]];

    const panel = h(
      "div",
      { class: `pal-panel${paletteOpen ? " is-open" : ""}`, id: "pal-panel" },
      h("ol", { class: "pal-grid" }, s.keys.map((key, i) => paletteButton(app, key, i))),
      h(
        "ul",
        { class: "legend" },
        legend.map(([state, text]) => h("li", {}, h("span", { class: `swatch is-${state}` }), text))
      )
    );

    // On small screens the grid is collapsed behind this button; on desktop it is always visible.
    const toggle = h(
      "button",
      {
        type: "button",
        class: "pal-toggle",
        "aria-expanded": String(paletteOpen),
        "aria-controls": "pal-panel",
        onclick: () => {
          paletteOpen = !paletteOpen;
          panel.classList.toggle("is-open", paletteOpen);
          toggle.setAttribute("aria-expanded", String(paletteOpen));
        },
      },
      icon("listNumbers"),
      "Danh sách câu",
      h("span", { class: "pal-count" }, `${counts.answered}/${counts.total}`),
      icon("caretDown")
    );

    return h(
      "aside",
      { class: "palette", "aria-label": "Danh sách câu hỏi" },
      toggle,
      h("h2", { class: "pal-title" }, "Danh sách câu"),
      panel
    );
  }

  function examTimer(app) {
    const s = app.session;
    const remaining = () => s.limitSec - Math.floor((Date.now() - s.startedAt) / 1000);
    const text = h("span", { "data-testid": "timer" }, Core.formatDuration(remaining()));
    const chip = h("div", { class: "timer", role: "timer", "aria-label": "Thời gian còn lại" }, icon("timer"), text);

    const tick = () => {
      const left = remaining();
      text.textContent = Core.formatDuration(left);
      chip.classList.toggle("is-low", left <= LOW_TIME_SECONDS);
      if (left <= 0) app.submitExam(true);
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    app.onCleanup(() => clearInterval(id));
    return chip;
  }

  function quizBar(app) {
    const s = app.session;
    const counts = sessionCounts(app);
    const exam = s.mode === "exam";
    const bar = h("div", { class: "bar", role: "presentation" });
    bar.style.setProperty("--p", counts.total === 0 ? 0 : counts.answered / counts.total);

    return h(
      "div",
      { class: "quiz-bar wrap" },
      h(
        "button",
        {
          type: "button",
          class: "btn btn-ghost exit-btn",
          "aria-label": "Thoát",
          "data-testid": "exit-quiz",
          onclick: () => app.exitQuiz(),
        },
        icon("arrowLeft"),
        h("span", { class: "exit-label" }, "Thoát")
      ),
      h("h1", { class: "quiz-title" }, s.title),
      exam
        ? h(
            "div",
            { class: "quiz-tools" },
            examTimer(app),
            h(
              "button",
              { type: "button", class: "btn btn-primary", "data-testid": "submit-exam", onclick: () => app.submitExam(false) },
              "Nộp bài"
            )
          )
        : h(
            "dl",
            { class: "quiz-tools tally" },
            h("div", { class: "is-ok" }, h("dt", {}, "Đúng"), h("dd", { "data-testid": "tally-ok" }, counts.correct)),
            h("div", { class: "is-bad" }, h("dt", {}, "Sai"), h("dd", { "data-testid": "tally-bad" }, counts.wrong))
          ),
      h("div", { class: "quiz-progress" }, bar)
    );
  }

  function navButtons(app) {
    const s = app.session;
    const last = s.index === s.keys.length - 1;
    const exam = s.mode === "exam";
    const prev = h(
      "button",
      {
        type: "button",
        class: "btn btn-ghost",
        "data-testid": "prev",
        "aria-disabled": s.index === 0 ? "true" : false,
        onclick: () => s.index > 0 && app.goIndex(s.index - 1),
      },
      icon("arrowLeft"),
      "Câu trước"
    );
    let nextLabel = "Câu tiếp";
    if (last) nextLabel = exam ? "Nộp bài" : "Hoàn thành";
    const next = h(
      "button",
      {
        type: "button",
        class: "btn btn-primary",
        "data-testid": "next",
        "data-focus": "next",
        onclick: () => (last ? (exam ? app.submitExam(false) : app.exitQuiz()) : app.goIndex(s.index + 1)),
      },
      nextLabel,
      last ? null : icon("arrowRight")
    );
    return h("div", { class: "q-nav" }, prev, next);
  }

  function bindKeys(app) {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.getElementById("dialog").open) return;
      const s = app.session;
      const q = app.bank.byKey[s.keys[s.index]];
      const k = e.key.toLowerCase();
      const pick = "abcde".indexOf(k) !== -1 ? "abcde".indexOf(k) : "12345".indexOf(k);
      if (pick !== -1 && pick < q.opts.length) {
        e.preventDefault();
        app.answer(pick);
      } else if (e.key === "ArrowRight" && s.index < s.keys.length - 1) {
        app.goIndex(s.index + 1);
      } else if (e.key === "ArrowLeft" && s.index > 0) {
        app.goIndex(s.index - 1);
      }
    };
    document.addEventListener("keydown", onKey);
    app.onCleanup(() => document.removeEventListener("keydown", onKey));
  }

  function questionCard(app) {
    const s = app.session;
    const key = s.keys[s.index];
    const q = app.bank.byKey[key];
    const chosen = chosenFor(app, key);
    const mod = app.bank.modules.find((m) => m.id === q.m);

    return h(
      "section",
      { class: "q-card", "aria-label": "Câu hỏi" },
      h(
        "div",
        { class: "q-meta" },
        h("span", { "data-testid": "q-position" }, `Câu ${s.index + 1} trên ${s.keys.length}`),
        s.mode === "practice" ? null : h("span", { class: "q-tag" }, `Module ${mod.id}: ${mod.name}`)
      ),
      h("h2", { class: "q-text", id: "q-text", tabindex: "-1", "data-focus": "question", "data-testid": "q-text" }, q.q),
      h(
        "div",
        { class: "opts", role: "group", "aria-labelledby": "q-text" },
        q.opts.map((_, i) => optionButton(app, q, i, chosen))
      ),
      feedbackBox(app, q, chosen),
      navButtons(app),
      h("p", { class: "hint" }, "Phím tắt: A, B, C, D để chọn đáp án; mũi tên trái, phải để chuyển câu.")
    );
  }

  window.Views = window.Views || {};
  window.Views.quiz = function renderQuiz(app) {
    bindKeys(app);
    return h(
      "div",
      { class: "quiz" },
      quizBar(app),
      h("div", { class: "quiz-grid wrap" }, questionCard(app), palette(app))
    );
  };
})();
