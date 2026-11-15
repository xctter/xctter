(() => {
  const cfg = window.TV_CONFIG;
  const apps = cfg.apps;
  const $ = (s) => document.querySelector(s);
  const tv = $("#tv"), bg = $("#bg"), stage = $("#stage"), pill = $("#pill"), dock = $("#dock"), toast = $("#toast");

  // Sulla TV il wrapper Android espone window.Android (launchApp, getApps)
  const native = window.Android;
  const hue = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  function installedApps() {
    if (!native?.getApps) return apps.filter((a) => a.pkg);
    const known = Object.fromEntries(apps.filter((a) => a.pkg).map((a) => [a.pkg, a]));
    return JSON.parse(native.getApps()).map((x) => known[x.pkg] || {
      id: x.pkg, name: x.name, pkg: x.pkg, glyph: x.name.trim()[0].toUpperCase(),
      color: [`hsl(${hue(x.pkg)} 65% 48%)`, `hsl(${hue(x.pkg)} 70% 28%)`],
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  const state = { mode: "ambient", zone: "dock", app: Math.min(2, apps.length - 1), row: 0, col: 0 };

  // ---------- Scene procedurali (nessuna immagine esterna) ----------
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`; };
  const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  function paintScene(cv, { kind = "city", seed = 1, sky, sun, ink }) {
    const w = (cv.width = 1280), h = (cv.height = 720), c = cv.getContext("2d"), r = rng(seed);
    let g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, sky[0]); g.addColorStop(0.45, sky[1]); g.addColorStop(0.75, sky[2]);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const sx = w * 0.66, sy = h * 0.4;
    g = c.createRadialGradient(sx, sy, 0, sx, sy, w * 0.5);
    g.addColorStop(0, sun); g.addColorStop(0.08, sun + "cc"); g.addColorStop(0.35, sun + "33"); g.addColorStop(1, sun + "00");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // nuvole sfumate
    for (let i = 0; i < 14; i++) {
      const x = r() * w, y = r() * h * 0.35, rw = 150 + r() * 300;
      g = c.createRadialGradient(x, y, 0, x, y, rw);
      g.addColorStop(0, "rgba(255,255,255,.10)"); g.addColorStop(1, "rgba(255,255,255,0)");
      c.save(); c.scale(1, 0.35); c.fillStyle = g; c.fillRect(x - rw, (y / 0.35) - rw, rw * 2, rw * 2); c.restore();
    }
    const layers = 5;
    for (let i = 0; i < layers; i++) {
      const t = (i + 1) / layers, base = h * (0.52 + 0.11 * i);
      c.fillStyle = mix(sky[2], ink, 0.25 + 0.75 * t);
      c.beginPath(); c.moveTo(0, h);
      if (kind === "city") {
        let x = 0; c.lineTo(0, base);
        while (x < w) {
          const bw = 14 + r() * 46, bh = r() * r() * (150 - i * 14) + 10;
          c.lineTo(x, base - bh);
          if (r() < 0.12) { c.lineTo(x + bw / 2, base - bh - 30 - r() * 90); } // guglia
          c.lineTo(x + bw, base - bh);
          x += bw + r() * 6;
        }
      } else {
        const p = [r() * 9, r() * 9, r() * 9], amp = 70 - i * 9;
        for (let x = 0; x <= w; x += 8) {
          const y = base - amp * (Math.sin(x / 210 + p[0]) * 0.6 + Math.sin(x / 83 + p[1]) * 0.3 + Math.sin(x / 31 + p[2]) * 0.08);
          c.lineTo(x, y);
        }
      }
      c.lineTo(w, h); c.closePath(); c.fill();
      // foschia tra i piani
      g = c.createLinearGradient(0, base - 60, 0, base + 90);
      g.addColorStop(0, mix(sky[2], sun, 0.4).replace("rgb", "rgba").replace(")", ",0)"));
      g.addColorStop(1, mix(sky[2], sun, 0.4).replace("rgb", "rgba").replace(")", `,${0.3 * (1 - t)})`));
      c.fillStyle = g; c.fillRect(0, base - 60, w, 150);
    }
  }

  const art = ([a, b, c]) =>
    `radial-gradient(110% 80% at 78% 18%, ${b}cc 0%, transparent 55%), radial-gradient(90% 90% at 10% 95%, ${b}55 0%, transparent 60%), linear-gradient(160deg, ${a}, ${c})`;
  const iconStyle = (a) => `background:linear-gradient(160deg, ${a.color[0]}, ${a.color[1]});color:${a.ink || "#fff"}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

  // ---------- Orologio e meteo ----------
  function tick() {
    const d = new Date();
    const time = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    document.querySelectorAll("[data-clock]").forEach((el) => (el.textContent = time));
    $("[data-date]").textContent = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  }
  const WMO = [[0, "Cielo sereno"], [2, "Poco nuvoloso"], [3, "Nuvoloso"], [48, "Nebbia"], [57, "Pioviggine"], [67, "Pioggia"], [77, "Neve"], [82, "Rovesci"], [86, "Neve"], [99, "Temporale"]];
  async function weather() {
    $("[data-city]").textContent = cfg.city;
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${cfg.latitude}&longitude=${cfg.longitude}&current=temperature_2m,weather_code`;
      const { current } = await (await fetch(u)).json();
      const label = (WMO.find(([max]) => current.weather_code <= max) || [0, ""])[1];
      $("[data-weather]").textContent = `${Math.round(current.temperature_2m)}° · ${label}`;
    } catch { /* offline: resta solo la città */ }
  }

  // ---------- Rendering ----------
  function buildDock() {
    dock.innerHTML = apps.map((a, i) =>
      `<div class="app" data-i="${i}"><div class="icon" style="${iconStyle(a)}">${esc(a.glyph)}</div><label>${esc(a.name)}</label></div>`).join("");
    dock.addEventListener("click", (e) => {
      const el = e.target.closest(".app"); if (!el) return;
      const i = +el.dataset.i;
      if (i === state.app && state.zone === "dock") launch(apps[i]); else { state.zone = "dock"; select(i); }
    });
  }

  function setBackground(a) {
    const layer = document.createElement("div");
    if (a.view === "hero") {
      const cv = document.createElement("canvas"); paintScene(cv, a.hero.scene); layer.append(cv);
    } else {
      layer.className = "blobs";
      layer.innerHTML = a.ambient.map((c) => `<i style="background:${c}"></i>`).join("");
    }
    bg.append(layer);
    requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add("on")));
    [...bg.children].slice(0, -1).forEach((old) => { old.classList.remove("on"); setTimeout(() => old.remove(), 900); });
    tv.classList.toggle("hero-on", a.view === "hero");
  }

  let gridApps = [];
  function renderStage(a) {
    let html;
    if (a.view === "cards") {
      html = `<div class="glass">${a.cards.map((c) =>
        `<div class="tile" data-row="0" style="background:${art(c.art)}"><em class="tag" style="font-style:normal">${esc(c.tag)}</em><b>${esc(c.title)}</b><span>${esc(c.sub)}</span></div>`).join("")}</div>`;
    } else if (a.view === "grid") {
      const list = (gridApps = installedApps());
      html = `<div class="glass grid"><h2>Tutte le app</h2><p>${list.length} app installate sulla TV</p><div class="cells">${list.map((x, i) =>
        `<div class="cell" data-row="${Math.floor(i / 4)}" data-app="${x.id}"><div class="icon" style="${iconStyle(x)}">${esc(x.glyph)}</div>${esc(x.name)}</div>`).join("")}</div></div>`;
    } else {
      const h = a.hero, sc = h.scene;
      html = `<div class="hero"><div class="kicker">${esc(h.kicker)}</div>
        <h1 style="background-image:linear-gradient(180deg, ${h.titleColor[0]}, ${h.titleColor[1]})">${esc(h.title)}</h1>
        <div class="desc">${esc(h.desc)}</div>
        <div class="btns"><div class="btn" data-row="0">▶ ${esc(a.action)}</div><div class="btn" data-row="0">${esc(a.hint)}</div></div>
        <div class="label">Riprendi</div>
        <div class="row">${h.row.map((t, i) =>
          `<div class="thumb" data-row="1" style="background:${art([mix(sc.sky[i % 3], sc.ink, 0.35), sc.sun, sc.ink])}">${esc(t)}</div>`).join("")}</div></div>`;
    }
    stage.innerHTML = html;
    stage.querySelectorAll("[data-row]").forEach((el) => el.addEventListener("click", () => {
      const rows = focusRows(); state.zone = "content";
      state.row = rows.findIndex((r) => r.includes(el)); state.col = rows[state.row].indexOf(el);
      paintFocus(); activate();
    }));
    pill.innerHTML = a.view === "hero" ? "" : `<span>▶ ${esc(a.action)}</span><span>${esc(a.hint)}</span>`;
  }

  function select(i) {
    state.app = (i + apps.length) % apps.length; state.row = state.col = 0;
    const a = apps[state.app];
    [...dock.children].forEach((el, k) => el.classList.toggle("sel", k === state.app));
    // mantiene l'icona selezionata al centro dello schermo
    const el = dock.children[state.app];
    dock.style.transform = `translateX(${-(el.offsetLeft + el.offsetWidth / 2)}px)`;
    setBackground(a); renderStage(a); paintFocus();
  }

  const focusRows = () => {
    const rows = [];
    stage.querySelectorAll("[data-row]").forEach((el) => (rows[+el.dataset.row] ??= []).push(el));
    return rows;
  };
  function paintFocus() {
    tv.classList.toggle("zone-content", state.zone === "content");
    stage.querySelectorAll(".focus").forEach((el) => el.classList.remove("focus"));
    if (state.zone === "content") focusRows()[state.row]?.[state.col]?.classList.add("focus");
  }

  // ---------- Azioni ----------
  function launch(a) {
    if (!a.pkg) { state.zone = "content"; paintFocus(); return; }
    if (!native?.launchApp) showToast(`Apertura di ${a.name}…`);
    else if (!native.launchApp(a.pkg)) showToast(`${a.name} non è installata su questa TV`);
  }
  function activate() {
    const el = focusRows()[state.row]?.[state.col];
    launch(el?.dataset.app ? gridApps.find((x) => x.id === el.dataset.app) : apps[state.app]);
  }
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg; toast.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("on"), 1800);
  }

  function setMode(m) { state.mode = m; tv.className = tv.className.replace(/mode-\w+/, "mode-" + m); }
  let idleTimer;
  function wake() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { state.zone = "dock"; paintFocus(); setMode("ambient"); }, cfg.idleSeconds * 1000);
  }

  // ---------- Telecomando (frecce, OK, Indietro) ----------
  function onKey(e) {
    const k = e.key;
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", " ", "Escape", "Backspace", "GoBack"].includes(k)) return;
    e.preventDefault(); wake();
    if (state.mode === "ambient") { setMode("home"); return; }
    const back = k === "Escape" || k === "Backspace" || k === "GoBack";
    if (state.zone === "dock") {
      if (k === "ArrowLeft") select(state.app - 1);
      else if (k === "ArrowRight") select(state.app + 1);
      else if (k === "ArrowUp" && focusRows().length) { state.zone = "content"; state.row = focusRows().length - 1; state.col = 0; paintFocus(); }
      else if (k === "Enter" || k === " ") launch(apps[state.app]);
      else if (back) setMode("ambient");
    } else {
      const rows = focusRows(), row = rows[state.row];
      if (k === "ArrowLeft") state.col = Math.max(0, state.col - 1);
      else if (k === "ArrowRight") state.col = Math.min(row.length - 1, state.col + 1);
      else if (k === "ArrowUp" && state.row > 0) { state.row--; state.col = Math.min(state.col, rows[state.row].length - 1); }
      else if (k === "ArrowDown" || back) {
        if (!back && state.row < rows.length - 1) { state.row++; state.col = Math.min(state.col, rows[state.row].length - 1); }
        else state.zone = "dock";
      } else if (k === "Enter" || k === " ") activate();
      paintFocus();
    }
  }

  // ---------- Avvio ----------
  paintScene($("#ambient-scene"), { kind: "city", seed: 11, sky: ["#5d7fae", "#e6b98a", "#f6d58c"], sun: "#fff3c4", ink: "#1c1a22" });
  buildDock(); select(state.app);
  tick(); setInterval(tick, 5000);
  weather(); setInterval(weather, 30 * 60 * 1000);
  window.addEventListener("keydown", onKey);
  // Chiamate dal wrapper Android: tasti del telecomando e tasto Home
  window.tvKey = (key) => onKey({ key, preventDefault() {} });
  window.tvHome = () => { wake(); state.zone = "dock"; paintFocus(); setMode("home"); };
  window.addEventListener("resize", () => select(state.app));
  $("#ambient").addEventListener("click", () => { wake(); setMode("home"); });
  // Comandi dal telefono (remote.html), inoltrati da server.js
  if (location.protocol.startsWith("http")) {
    new EventSource("/events").onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "key") onKey({ key: m.key, preventDefault() {} });
      else if (m.type === "launch") {
        const i = apps.findIndex((a) => a.id === m.app); if (i < 0) return;
        wake(); setMode("home"); state.zone = "dock"; select(i); launch(apps[i]);
        if (m.title && !native?.launchApp) showToast(`Riproduzione di ${m.title}…`);
      }
    };
  }
  if (location.hash === "#home") setMode("home");
  wake();
})();
