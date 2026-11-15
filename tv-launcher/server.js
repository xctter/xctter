// Server locale: serve il launcher alla TV, il telecomando al telefono e li collega.
//   npm install && ANTHROPIC_API_KEY=... npm start
//   TV:        http://<ip-del-pc>:8080/
//   Telefono:  http://<ip-del-pc>:8080/remote
const http = require("http");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const os = require("os");

const PORT = process.env.PORT || 8080;
const FILES = {
  "/": ["index.html", "text/html"],
  "/remote": ["remote.html", "text/html"],
  "/style.css": ["style.css", "text/css"],
  "/app.js": ["app.js", "text/javascript"],
  "/config.js": ["config.js", "text/javascript"],
};

// Il catalogo dell'assistente è lo stesso config.js usato dalla TV
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "config.js"), "utf8"), sandbox);
const apps = sandbox.window.TV_CONFIG.apps.filter((a) => a.pkg);
const catalog = apps.map((a) => {
  const titles = a.view === "hero"
    ? [`"${a.hero.title}" — ${a.hero.desc}`]
    : a.cards.map((c) => `"${c.title}" (${c.sub})`);
  return `- ${a.name} [id: ${a.id}]: ${titles.join("; ")}`;
}).join("\n");

const SYSTEM = `Sei l'assistente di una TV di casa. L'utente ti scrive dal telefono per decidere cosa guardare o ascoltare.
Rispondi in italiano, in una o due frasi, con tono cordiale e diretto.

Queste sono le app installate e i contenuti disponibili adesso:
${catalog}

Proponi solo contenuti di questo elenco. Quando suggerisci qualcosa di preciso, indica in "app" l'id dell'app e in "title" il titolo, e chiedi se vuole che lo metta sulla TV. Se l'utente conferma una proposta fatta prima, ripeti gli stessi "app" e "title". Se non c'è nulla da proporre o stai solo chiacchierando, lascia "app" e "title" a null.`;

const SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    app: { anyOf: [{ type: "string", enum: apps.map((a) => a.id) }, { type: "null" }] },
    title: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: ["reply", "app", "title"],
  additionalProperties: false,
};

let client;
async function ask(messages) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  client ??= new Anthropic();
  const res = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 2000,
    system: SYSTEM,
    messages,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    // Se il modello rifiuta una richiesta, l'API riprova da sola su un modello di riserva
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  if (res.stop_reason === "refusal") return { reply: "Su questo non posso aiutarti. Vuoi un consiglio su cosa guardare?", app: null, title: null };
  const text = res.content.find((b) => b.type === "text")?.text;
  return JSON.parse(text);
}

const tvs = new Set(); // connessioni SSE delle TV aperte
const send = (res, code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
const readJson = (req) => new Promise((resolve, reject) => {
  let data = "";
  req.on("data", (c) => { data += c; if (data.length > 64_000) { reject(new Error("too large")); req.destroy(); } });
  req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch (e) { reject(e); } });
});

http.createServer(async (req, res) => {
  const url = req.url.split("?")[0];
  try {
    if (req.method === "GET" && FILES[url]) {
      const [file, type] = FILES[url];
      res.writeHead(200, { "content-type": type + "; charset=utf-8", "cache-control": "no-store" });
      return fs.createReadStream(path.join(__dirname, file)).pipe(res);
    }
    if (req.method === "GET" && url === "/events") {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
      res.write(": ok\n\n");
      tvs.add(res); req.on("close", () => tvs.delete(res));
      return;
    }
    if (req.method === "POST" && url === "/cmd") {
      const cmd = await readJson(req);
      for (const tv of tvs) tv.write(`data: ${JSON.stringify(cmd)}\n\n`);
      return send(res, 200, { tvs: tvs.size });
    }
    if (req.method === "POST" && url === "/ask") {
      const { messages } = await readJson(req);
      const clean = (messages || []).slice(-20)
        .filter((m) => ["user", "assistant"].includes(m.role) && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content }));
      if (!clean.length) return send(res, 400, { error: "Nessun messaggio." });
      try { return send(res, 200, await ask(clean)); }
      catch (e) {
        console.error("ask:", e.message);
        const noKey = /api[_ -]?key|authentication|auth/i.test(e.message) || e.status === 401;
        return send(res, 502, { error: noKey ? "Assistente non configurato: avvia il server con ANTHROPIC_API_KEY." : "L'assistente non ha risposto, riprova." });
      }
    }
    send(res, 404, { error: "not found" });
  } catch (e) { send(res, 400, { error: "richiesta non valida" }); }
}).listen(PORT, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((n) => n.family === "IPv4" && !n.internal).map((n) => n.address);
  for (const ip of ips.length ? ips : ["localhost"]) console.log(`TV: http://${ip}:${PORT}/   Telefono: http://${ip}:${PORT}/remote`);
});
setInterval(() => { for (const tv of tvs) tv.write(": ping\n\n"); }, 25_000);
