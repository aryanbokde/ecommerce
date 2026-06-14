// Shared behaviour for module test-case pages: live filter/search, status
// toggling (persisted to localStorage), and live summary counts.
(function () {
  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const page = document.body.dataset.page || "suite";

  // ── Persisted status (Pass/Fail/Blocked) per test id ──────────────────────
  const KEY = "qa-status-" + page;
  const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
  const STATES = ["", "Pass", "Fail", "Blocked"];

  qa("tr[data-id]").forEach((row) => {
    const id = row.dataset.id;
    const cell = q(".status", row);
    if (!cell) return;
    if (saved[id]) cell.dataset.s = saved[id];
    cell.textContent = cell.dataset.s || "Untested";
    cell.addEventListener("click", () => {
      const cur = cell.dataset.s || "";
      const next = STATES[(STATES.indexOf(cur) + 1) % STATES.length];
      cell.dataset.s = next;
      cell.textContent = next || "Untested";
      if (next) saved[id] = next; else delete saved[id];
      localStorage.setItem(KEY, JSON.stringify(saved));
      recount();
    });
  });

  // ── Filter / search ───────────────────────────────────────────────────────
  const search = q("#search");
  const typeSel = q("#f-type");
  const prioSel = q("#f-prio");

  function applyFilter() {
    const term = (search?.value || "").toLowerCase();
    const type = typeSel?.value || "";
    const prio = prioSel?.value || "";
    qa("tr[data-id]").forEach((row) => {
      const text = row.textContent.toLowerCase();
      const okText = !term || text.includes(term);
      const okType = !type || row.dataset.type === type;
      const okPrio = !prio || row.dataset.prio === prio;
      row.classList.toggle("hidden", !(okText && okType && okPrio));
    });
  }
  search?.addEventListener("input", applyFilter);
  typeSel?.addEventListener("change", applyFilter);
  prioSel?.addEventListener("change", applyFilter);

  // ── Summary counts ────────────────────────────────────────────────────────
  function recount() {
    const rows = qa("tr[data-id]");
    const total = rows.length;
    let pass = 0, fail = 0, blocked = 0;
    rows.forEach((r) => {
      const s = q(".status", r)?.dataset.s;
      if (s === "Pass") pass++;
      else if (s === "Fail") fail++;
      else if (s === "Blocked") blocked++;
    });
    const set = (id, n) => { const el = q("#" + id); if (el) el.textContent = n; };
    set("c-total", total);
    set("c-pass", pass);
    set("c-fail", fail);
    set("c-pend", total - pass - fail - blocked);
  }
  recount();
})();
