// Result route: score summary after an exam, plus a reviewable list of every question.
(function () {
  const { h, icon } = window.Dom;
  const Core = window.Core;

  const OPEN_ALL_WRONG_UP_TO = 8;
  const GOOD_PERCENT = 80;
  const OK_PERCENT = 50;

  const letter = (i) => String.fromCharCode(65 + i);

  function verdict(percent) {
    if (percent >= GOOD_PERCENT) return "Rất tốt. Bạn nắm chắc phần lớn nội dung.";
    if (percent >= OK_PERCENT) return "Khá ổn. Xem lại các câu sai bên dưới để chắc hơn.";
    return "Cần ôn thêm. Luyện từng module rồi thi lại nhé.";
  }

  function reviewItem(app, key, index, open) {
    const s = app.session;
    const q = app.bank.byKey[key];
    const chosen = s.answers[key];
    const ok = chosen !== undefined && Core.isCorrect(q, chosen);
    const status = ok ? "ok" : "bad";
    const mod = app.bank.modules.find((m) => m.id === q.m);

    return h(
      "details",
      { class: `rev is-${status}`, open, "data-testid": "review-item", "data-status": status },
      h(
        "summary",
        {},
        h("span", { class: `rev-status is-${status}` }, icon(ok ? "check" : "x")),
        h(
          "span",
          { class: "rev-head" },
          h("strong", {}, `Câu ${index + 1}`),
          h("span", { class: "muted" }, `Module ${mod.id}`),
          h("span", { class: "rev-q" }, q.q)
        ),
        icon("caretDown")
      ),
      h(
        "div",
        { class: "rev-body" },
        h("p", { class: "rev-question" }, q.q),
        h(
          "ul",
          { class: "rev-opts" },
          q.opts.map((text, i) => {
            const isAnswer = i === q.answer;
            const isPicked = chosen === i;
            const cls = isAnswer ? "is-correct" : isPicked ? "is-wrong" : "";
            const note = isAnswer ? "Đáp án đúng" : isPicked ? "Bạn đã chọn" : "";
            return h(
              "li",
              { class: cls },
              h("span", { class: "opt-letter", "aria-hidden": "true" }, letter(i)),
              h("span", { class: "opt-text" }, text),
              note ? h("span", { class: "rev-note" }, note) : null
            );
          })
        ),
        chosen === undefined ? h("p", { class: "muted" }, "Bạn chưa trả lời câu này.") : null
      )
    );
  }

  function reviewSection(app) {
    const s = app.session;
    const wrongSet = new Set([...s.result.wrong, ...s.result.unanswered]);
    let filter = wrongSet.size > 0 ? "wrong" : "all";
    const list = h("div", { class: "rev-list", "data-testid": "review-list" });

    const fill = () => {
      const entries = s.keys
        .map((key, i) => ({ key, i }))
        .filter(({ key }) => filter === "all" || wrongSet.has(key));
      const openAll = filter === "wrong" && entries.length <= OPEN_ALL_WRONG_UP_TO;
      list.replaceChildren(...entries.map(({ key, i }) => reviewItem(app, key, i, openAll)));
      if (entries.length === 0) {
        list.append(h("p", { class: "muted" }, "Không có câu nào để hiển thị."));
      }
    };

    const chip = (value, label, count) =>
      h(
        "label",
        { class: "seg" },
        h("input", {
          type: "radio",
          name: "review-filter",
          value,
          checked: filter === value,
          "data-testid": `filter-${value}`,
          onchange: () => {
            filter = value;
            fill();
          },
        }),
        h("span", {}, `${label} (${count})`)
      );

    fill();
    return h(
      "section",
      { class: "review" },
      h("h2", { class: "section-title" }, "Xem lại bài làm"),
      h(
        "fieldset",
        { class: "seg-group" },
        h("legend", { class: "sr-only" }, "Lọc câu hỏi"),
        h("div", { class: "seg-row" }, chip("wrong", "Cần xem lại", wrongSet.size), chip("all", "Tất cả", s.keys.length))
      ),
      list
    );
  }

  function summary(app) {
    const s = app.session;
    const r = s.result;
    const ring = h(
      "div",
      { class: "ring ring-lg", role: "img", "aria-label": `Điểm ${r.correct} trên ${r.total}, ${r.percent} phần trăm` },
      h("strong", { "data-testid": "score" }, `${r.correct}/${r.total}`),
      h("span", {}, `${r.percent}%`)
    );
    ring.style.setProperty("--pct", `${r.percent}%`);

    const stat = (label, value, tone) =>
      h("div", { class: `stat ${tone || ""}` }, h("dd", {}, value), h("dt", {}, label));

    // Unanswered questions count as wrong on submit, so they are worth retrying too.
    const wrongAll = [...r.wrong, ...r.unanswered];
    return h(
      "header",
      { class: "result-head" },
      ring,
      h(
        "div",
        { class: "result-copy" },
        h("h1", {}, "Kết quả thi thử"),
        h("p", { class: "lede" }, s.auto ? "Hết giờ nên bài được nộp tự động. " + verdict(r.percent) : verdict(r.percent)),
        h(
          "dl",
          { class: "stats" },
          stat("Đúng", r.correct, "is-ok"),
          stat("Sai", r.wrong.length, "is-bad"),
          stat("Chưa làm", r.unanswered.length),
          stat("Thời gian", Core.formatDuration(s.elapsedSec))
        ),
        h(
          "div",
          { class: "hero-cta" },
          wrongAll.length > 0
            ? h(
                "button",
                {
                  type: "button",
                  class: "btn btn-primary",
                  "data-testid": "retry-wrong",
                  onclick: () => app.reviewWrong(wrongAll),
                },
                icon("redo"),
                "Làm lại câu sai"
              )
            : null,
          h(
            "button",
            { type: "button", class: "btn btn-ghost", "data-testid": "retake", onclick: () => app.startExam(r.total) },
            icon("timer"),
            "Thi lại đề mới"
          ),
          h("a", { class: "btn btn-ghost", href: "#/" }, "Về trang chủ")
        )
      )
    );
  }

  window.Views = window.Views || {};
  window.Views.result = function renderResult(app) {
    return h("div", { class: "result wrap" }, summary(app), reviewSection(app));
  };
})();
