// Home route: hero with live progress, module bento, exam and wrong-answer panels.
(function () {
  const { h, icon } = window.Dom;
  const Core = window.Core;

  const MODULE_ICONS = ["cpu", "desktop", "fileText", "table", "presentation", "globe"];
  const EXAM_SIZES = [20, 30, 50];
  const DEFAULT_EXAM_SIZE = 30;
  const SECONDS_PER_QUESTION = 60;
  const RECENT_EXAMS = 3;

  const plural = (n) => `${n} câu`;

  function lastTouchedModule(app) {
    let best = null;
    for (const [key, a] of Object.entries(app.progress.answers)) {
      const q = app.bank.byKey[key];
      if (q && (!best || a.at > best.at)) best = { at: a.at, m: q.m };
    }
    return best ? best.m : null;
  }

  function progressPanel(app, overall) {
    const pct = overall.total === 0 ? 0 : Math.round((overall.answered / overall.total) * 100);
    const accuracy = overall.answered === 0 ? null : Math.round((overall.correct / overall.answered) * 100);
    const ring = h(
      "div",
      {
        class: "ring",
        role: "img",
        "aria-label": `Đã làm ${overall.answered} trên ${overall.total} câu`,
      },
      h("strong", {}, `${pct}%`),
      h("span", {}, "đã làm")
    );
    ring.style.setProperty("--pct", `${pct}%`);

    const stat = (label, value, tone) =>
      h("div", { class: `stat ${tone || ""}` }, h("dd", {}, value), h("dt", {}, label));

    return h(
      "aside",
      { class: "progress-panel", "aria-label": "Tiến độ của bạn", "data-testid": "progress-panel" },
      h(
        "div",
        { class: "progress-top" },
        ring,
        h(
          "div",
          {},
          h("h2", { class: "panel-title" }, "Tiến độ của bạn"),
          overall.answered === 0
            ? h("p", { class: "muted" }, "Chưa có câu nào. Bắt đầu từ Module 1.")
            : h("p", { class: "muted" }, `Tỉ lệ đúng ${accuracy}% trên ${plural(overall.answered)} đã làm.`)
        )
      ),
      h(
        "dl",
        { class: "stats" },
        stat("Đúng", overall.correct, "is-ok"),
        stat("Sai", overall.wrong, "is-bad"),
        stat("Chưa làm", overall.total - overall.answered)
      )
    );
  }

  function hero(app, overall) {
    const resumeModule = lastTouchedModule(app);
    const target = resumeModule || 1;
    const savedExam = window.Store.loadExam();
    return h(
      "section",
      { class: "hero wrap" },
      h(
        "div",
        { class: "hero-copy" },
        h("h1", {}, "Ôn thi CNTT cơ bản, từng câu một"),
        h(
          "p",
          { class: "lede" },
          `${overall.total} câu hỏi, ${app.bank.modules.length} module. Chọn đáp án, biết đúng sai ngay, xem lại câu sai bất cứ lúc nào.`
        ),
        h(
          "div",
          { class: "hero-cta" },
          h(
            "a",
            { class: "btn btn-primary", href: `#/practice/${target}`, "data-testid": "cta-practice" },
            icon("play"),
            resumeModule ? "Tiếp tục luyện tập" : "Bắt đầu luyện tập"
          ),
          h(
            "button",
            { type: "button", class: "btn btn-ghost", onclick: () => app.goSection("exam") },
            "Thi thử"
          )
        ),
        savedExam
          ? h(
              "p",
              { class: "resume-note", "data-testid": "resume-exam" },
              "Bạn có một bài thi đang làm dở. ",
              h("a", { href: "#/exam" }, "Tiếp tục làm bài")
            )
          : null
      ),
      progressPanel(app, overall)
    );
  }

  function moduleCard(app, mod, index, resumeId) {
    const stats = Core.moduleStats(app.progress, app.bank, mod.id);
    const pct = stats.total === 0 ? 0 : stats.answered / stats.total;
    const bar = h("div", {
      class: "bar",
      role: "progressbar",
      "aria-label": `Tiến độ Module ${mod.id}`,
      "aria-valuemin": 0,
      "aria-valuemax": stats.total,
      "aria-valuenow": stats.answered,
    });
    bar.style.setProperty("--p", pct);

    return h(
      "article",
      {
        class: `mod-card${mod.id === resumeId ? " is-resume" : ""}`,
        "data-testid": `module-card-${mod.id}`,
      },
      h("span", { class: "mod-icon" }, icon(MODULE_ICONS[index % MODULE_ICONS.length])),
      h(
        "div",
        { class: "mod-body" },
        h("p", { class: "mod-num" }, `Module ${mod.id}`),
        h(
          "h3",
          {},
          h("a", { class: "mod-link", href: `#/practice/${mod.id}` }, mod.name)
        ),
        h("p", { class: "muted" }, plural(mod.count))
      ),
      h(
        "div",
        { class: "mod-foot" },
        bar,
        h(
          "p",
          { class: "mod-status" },
          stats.answered === 0
            ? "Chưa bắt đầu"
            : `Đã làm ${stats.answered}/${stats.total}, đúng ${stats.correct}`
        )
      ),
      stats.answered > 0
        ? h(
            "button",
            {
              type: "button",
              class: "icon-btn mod-reset",
              "aria-label": `Làm lại Module ${mod.id}`,
              "data-testid": `module-reset-${mod.id}`,
              onclick: () => app.resetModule(mod.id),
            },
            icon("redo")
          )
        : null
    );
  }

  function modules(app) {
    const resumeId = lastTouchedModule(app);
    return h(
      "section",
      { class: "section wrap", id: "modules", tabindex: "-1" },
      h("h2", { class: "section-title" }, "Luyện tập theo module"),
      h(
        "div",
        { class: "bento", "data-testid": "module-grid" },
        app.bank.modules.map((mod, i) => moduleCard(app, mod, i, resumeId))
      )
    );
  }

  function examPanel(app) {
    let size = DEFAULT_EXAM_SIZE;
    const minutes = () => Math.round((size * SECONDS_PER_QUESTION) / 60);
    const timeText = h("strong", {}, `${minutes()} phút`);

    const options = EXAM_SIZES.map((n) =>
      h(
        "label",
        { class: "seg" },
        h("input", {
          type: "radio",
          name: "exam-size",
          value: n,
          checked: n === size,
          onchange: () => {
            size = n;
            timeText.textContent = `${minutes()} phút`;
          },
        }),
        h("span", {}, `${n} câu`)
      )
    );

    const recent = app.progress.exams.slice(0, RECENT_EXAMS);
    return h(
      "div",
      { class: "exam-panel", id: "exam", tabindex: "-1" },
      h("h2", { class: "section-title" }, "Thi thử tổng hợp"),
      h("p", { class: "muted" }, "Đề ngẫu nhiên từ cả 6 module. Kết quả và đáp án chỉ hiện sau khi nộp bài."),
      h(
        "fieldset",
        { class: "seg-group" },
        h("legend", {}, "Số câu hỏi"),
        h("div", { class: "seg-row" }, options)
      ),
      h("p", { class: "exam-time" }, "Thời gian làm bài: ", timeText),
      h(
        "button",
        {
          type: "button",
          class: "btn btn-primary",
          "data-testid": "start-exam",
          onclick: () => app.startExam(size),
        },
        icon("timer"),
        "Bắt đầu thi thử"
      ),
      recent.length > 0
        ? h(
            "ul",
            { class: "recent", "aria-label": "Kết quả thi thử gần đây" },
            recent.map((e) =>
              h(
                "li",
                {},
                h("span", {}, new Date(e.at).toLocaleDateString("vi-VN")),
                h("strong", {}, `${e.correct}/${e.total} câu đúng`)
              )
            )
          )
        : null
    );
  }

  function wrongPanel(app) {
    const count = Core.wrongKeys(app.progress, app.bank).length;
    return h(
      "div",
      { class: "wrong-panel" },
      h("h2", { class: "section-title" }, "Ôn lại câu sai"),
      count === 0
        ? h(
            "p",
            { class: "muted", "data-testid": "wrong-empty" },
            "Chưa có câu sai nào. Khi bạn chọn sai, câu hỏi sẽ được lưu lại ở đây để ôn lại."
          )
        : h("p", { class: "muted" }, `Bạn đang có ${plural(count)} chưa nắm vững. Làm đúng một câu thì câu đó rời khỏi danh sách.`),
      count === 0
        ? h("span", { class: "btn btn-ghost", "aria-disabled": "true" }, "Chưa có câu để ôn")
        : h(
            "a",
            { class: "btn btn-ghost", href: "#/wrong", "data-testid": "cta-wrong" },
            icon("listNumbers"),
            `Ôn lại ${plural(count)}`
          )
    );
  }

  window.Views = window.Views || {};
  window.Views.home = function renderHome(app) {
    const overall = Core.overallStats(app.progress, app.bank);
    return h(
      "div",
      { class: "home" },
      hero(app, overall),
      modules(app),
      h("section", { class: "section wrap mode-split" }, examPanel(app), wrongPanel(app))
    );
  };
})();
