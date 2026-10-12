// Browser storage wrapper. Every call is guarded: storage can be blocked or full.
(function () {
  const PROGRESS_KEY = "cntt-onthi:v1";
  const THEME_KEY = "cntt-onthi:theme";
  const EXAM_KEY = "cntt-onthi:exam";

  function read(storage, key) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function write(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function remove(storage, key) {
    try {
      storage.removeItem(key);
    } catch (err) {
      /* storage unavailable: nothing to clean up */
    }
  }

  window.Store = {
    loadProgress: () => window.Core.sanitizeProgress(read(localStorage, PROGRESS_KEY)),
    saveProgress: (progress) => write(localStorage, PROGRESS_KEY, progress),
    clearProgress: () => remove(localStorage, PROGRESS_KEY),

    loadTheme: () => {
      const saved = read(localStorage, THEME_KEY);
      return saved === "dark" || saved === "light" ? saved : null;
    },
    saveTheme: (theme) => write(localStorage, THEME_KEY, theme),

    loadExam: () => {
      const raw = read(sessionStorage, EXAM_KEY);
      const ok =
        raw &&
        Array.isArray(raw.keys) &&
        raw.keys.length > 0 &&
        raw.answers &&
        typeof raw.answers === "object" &&
        Number.isFinite(raw.startedAt) &&
        Number.isFinite(raw.limitSec);
      return ok ? raw : null;
    },
    saveExam: (exam) => write(sessionStorage, EXAM_KEY, exam),
    clearExam: () => remove(sessionStorage, EXAM_KEY),
  };
})();
