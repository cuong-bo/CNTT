// Tiny DOM helpers. Text always goes through textContent, never innerHTML.
(function () {
  /**
   * h("button", { class: "btn", onclick: fn, "aria-label": "x" }, "text", childNode)
   * Falsy attribute values are skipped; `true` renders a bare attribute.
   */
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs || {})) {
      if (value === false || value === null || value === undefined) continue;
      if (name.startsWith("on") && typeof value === "function") {
        el.addEventListener(name.slice(2), value);
      } else if (value === true) {
        el.setAttribute(name, "");
      } else {
        el.setAttribute(name, String(value));
      }
    }
    append(el, children);
    return el;
  }

  function append(el, children) {
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
  }

  /** Inline Phosphor icon from the generated sprite (trusted strings only). */
  function icon(name) {
    const span = document.createElement("span");
    span.className = "ic";
    span.innerHTML = window.ICONS[name] || "";
    return span;
  }

  function replaceContent(el, ...children) {
    el.replaceChildren();
    append(el, children);
  }

  window.Dom = { h, icon, replaceContent };
})();
