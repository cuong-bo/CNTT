// Page chrome shared by every route: header, footer, theme toggle, confirm dialog.
(function () {
  const { h, icon, replaceContent } = window.Dom;

  const currentTheme = () => document.documentElement.getAttribute("data-theme") || "light";

  function toggleTheme(app) {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    window.Store.saveTheme(next);
    renderHeader(app, app.route);
  }

  function renderHeader(app, route) {
    const wrongCount = window.Core.wrongKeys(app.progress, app.bank).length;
    const dark = currentTheme() === "dark";
    const goSection = (id) => (event) => {
      event.preventDefault();
      app.goSection(id);
    };

    const nav = h(
      "nav",
      { class: "nav wrap", "aria-label": "Điều hướng chính" },
      h(
        "a",
        { class: "brand", href: "#/", "aria-label": "Quý ông người pháp, trang chủ" },
        h("span", { class: "brand-mark", "aria-hidden": "true" }, "Q"),
        h("span", { class: "brand-name" }, "Quý ông người pháp")
      ),
      h("a", { class: "nav-link nav-sec", href: "#/", onclick: goSection("modules") }, "Module"),
      h("a", { class: "nav-link nav-sec", href: "#/", onclick: goSection("exam") }, "Thi thử"),
      h(
        "a",
        {
          class: "nav-link",
          href: "#/wrong",
          "aria-current": route.name === "wrong" ? "page" : false,
        },
        "Câu sai",
        wrongCount > 0 ? h("span", { class: "count-badge", "data-testid": "wrong-count" }, wrongCount) : null
      ),
      h(
        "button",
        {
          type: "button",
          class: "icon-btn",
          "aria-label": dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối",
          "data-testid": "theme-toggle",
          onclick: () => toggleTheme(app),
        },
        icon(dark ? "sun" : "moon")
      )
    );
    replaceContent(document.getElementById("site-header"), nav);
  }

  function renderFooter(app) {
    const row = h(
      "div",
      { class: "footer-row wrap" },
      h("p", {}, "Tiến độ được lưu ngay trên trình duyệt này, không cần đăng nhập."),
      h(
        "button",
        {
          type: "button",
          class: "link-btn",
          "data-testid": "reset-all",
          onclick: () => app.resetAll(),
        },
        icon("trash"),
        "Xóa toàn bộ tiến độ"
      )
    );
    replaceContent(document.getElementById("site-footer"), row);
  }

  /** Resolves true when confirmed, false on cancel or Escape. */
  function confirmDialog({ title, body, confirmText, cancelText = "Hủy", danger = false }) {
    return new Promise((resolve) => {
      const dialog = document.getElementById("dialog");
      let result = false;
      const finish = (value) => {
        result = value;
        dialog.close();
      };
      replaceContent(
        dialog,
        h("h2", { id: "dialog-title" }, title),
        h("p", {}, body),
        h(
          "div",
          { class: "dialog-actions" },
          h("button", { type: "button", class: "btn btn-ghost", onclick: () => finish(false) }, cancelText),
          h(
            "button",
            {
              type: "button",
              class: `btn ${danger ? "btn-danger" : "btn-primary"}`,
              "data-testid": "dialog-confirm",
              onclick: () => finish(true),
            },
            confirmText
          )
        )
      );
      dialog.addEventListener("close", () => resolve(result), { once: true });
      dialog.showModal();
    });
  }

  window.Shell = { renderHeader, renderFooter, confirmDialog };
})();
