// Configurazione del launcher: modifica qui città, app e contenuti in evidenza.
// `pkg` è il package Android usato per aprire l'app sulla TV.
window.TV_CONFIG = {
  city: "Milano",
  latitude: 45.4642,
  longitude: 9.19,
  idleSeconds: 90, // secondi senza input prima di tornare alla schermata ambient

  apps: [
    {
      id: "live", name: "TV Live", pkg: "com.google.android.tv", glyph: "◉",
      color: ["#ff8a3d", "#e2491d"], ambient: ["#1f5d2c", "#0d2a3a", "#46611e"],
      view: "cards", action: "Guarda in diretta", hint: "3 canali in onda",
      cards: [
        { tag: "IN DIRETTA", title: "Calcio · Serata di coppa", sub: "21:00 – 23:00 · Sport 1", art: ["#1d6b33", "#9bd16a", "#0c2b16"] },
        { tag: "NEWS", title: "Il punto della sera", sub: "Approfondimento · News 24", art: ["#7a1420", "#f06a5a", "#1a1030"] },
        { tag: "DOC", title: "Coste selvagge", sub: "Natura · Doc HD", art: ["#0e5a66", "#7fe0c8", "#0a2233"] },
      ],
    },
    {
      id: "youtube", name: "YouTube", pkg: "com.google.android.youtube.tv", glyph: "▶",
      color: ["#ff3b30", "#c4160d"], ambient: ["#5a1010", "#2a0a14", "#3a1a08"],
      view: "cards", action: "Apri YouTube", hint: "Consigliati per te",
      cards: [
        { tag: "12:48", title: "Restauro di una console anni '90", sub: "Retro Lab · 1,2 Mln visualizzazioni", art: ["#3a2a6a", "#f0a04a", "#141028"] },
        { tag: "LIVE", title: "Lo-fi per concentrarsi", sub: "Radio Notturna · 8.412 spettatori", art: ["#2b1a4a", "#e86aa8", "#0c0a1c"] },
        { tag: "27:05", title: "In bici attraverso le Dolomiti", sub: "Strade Alte · 340.000 visualizzazioni", art: ["#1a4a5a", "#b8e0f0", "#0a1820"] },
      ],
    },
    {
      id: "music", name: "Musica", pkg: "com.spotify.tv.android", glyph: "♫",
      color: ["#2fe06e", "#12a046"], ambient: ["#4a1d0c", "#3a1466", "#0d1440"],
      view: "cards", action: "Apri Musica", hint: "4 playlist · 3 concerti",
      cards: [
        { tag: "IN CONCERTO", title: "Notte allo stadio", sub: "Live · Luglio", art: ["#141418", "#3a3a48", "#08080a"] },
        { tag: "PLAYLIST", title: "Top 50 Italia", sub: "Aggiornata oggi", art: ["#0f3d24", "#35e07a", "#07140c"] },
        { tag: "MIX", title: "Il tuo mix della sera", sub: "Creato per te", art: ["#3a1466", "#ff7ac8", "#120a22"] },
      ],
    },
    {
      id: "fitness", name: "Sport", pkg: "com.google.android.apps.fitness", glyph: "◎",
      color: ["#ff2d6f", "#a6ff3c"], ambient: ["#10240f", "#1a1a1a", "#2a2a10"],
      view: "cards", action: "Inizia allenamento", hint: "Settimana 1 di 12",
      cards: [
        { tag: "PROGRAMMA", title: "Parte alta del corpo", sub: "25 min · 5 esercizi", art: ["#18181c", "#5a5a66", "#0a0a0c"] },
        { tag: "4 ESERCIZI", title: "Componi una sessione", sub: "Scegli durata e intensità", art: ["#143a5a", "#ffd23c", "#0c1424"] },
        { tag: "PROGRESSI", title: "I tuoi anelli", sub: "3 di 5 obiettivi raggiunti", art: ["#5a2a14", "#ffb46a", "#1c0e08"] },
      ],
    },
    {
      id: "apps", name: "Tutte le app", glyph: "▦",
      color: ["#4a4d57", "#2b2d34"], ambient: ["#1a1c20", "#24301a", "#101216"],
      view: "grid", action: "Tutte le app", hint: "",
    },
    {
      id: "netflix", name: "Netflix", pkg: "com.netflix.ninja", glyph: "N",
      color: ["#f4f1ec", "#d8d4cc"], ink: "#d81f26",
      view: "hero", action: "Apri Netflix", hint: "4 episodi",
      hero: {
        kicker: "Netflix · Top 10 delle serie", title: "SOTTO LA NEBBIA", titleColor: ["#ffd76a", "#e08a1a"],
        desc: "Una creatura misteriosa semina il terrore in un villaggio sul lago. Solo un pescatore sa dove cercarla.",
        scene: { kind: "hills", seed: 7, sky: ["#2b3a36", "#7d9488", "#c9d6c4"], sun: "#e8f0dc", ink: "#0a1512" },
        row: ["Episodio 3", "Il faro", "Acque ferme", "L'ultima rete"],
      },
    },
    {
      id: "prime", name: "Prime Video", pkg: "com.amazon.amazonvideo.livingroom", glyph: "p",
      color: ["#1aa7ff", "#0a62c9"],
      view: "hero", action: "Apri Prime Video", hint: "13 episodi",
      hero: {
        kicker: "Prime Video · Popolari in questo momento", title: "TERRE ALTE", titleColor: ["#ffffff", "#d9d2c0"],
        desc: "Un ex sceriffo lascia il ranch di famiglia per dare la caccia a chi ha tradito la sua valle.",
        scene: { kind: "hills", seed: 21, sky: ["#4a5a78", "#d99a6a", "#f2d9a8"], sun: "#fff0c8", ink: "#1a140c" },
        row: ["Riprendi · Ep. 5", "La frontiera", "Polvere", "Il guado"],
      },
    },
    {
      id: "disney", name: "Disney+", pkg: "com.disney.disneyplus", glyph: "D+",
      color: ["#19c6c9", "#0b4f8a"],
      view: "hero", action: "Apri Disney+", hint: "Film · 2 h 12 min",
      hero: {
        kicker: "Disney+ · Popolari in questo momento", title: "CENERE E FUOCO", titleColor: ["#ffb347", "#d2451a"],
        desc: "Due popoli divisi da un vulcano devono allearsi quando il cielo comincia a bruciare.",
        scene: { kind: "city", seed: 33, sky: ["#0a0c1e", "#7a1e14", "#ff7a2a"], sun: "#ffd27a", ink: "#080408" },
        row: ["Riprendi · 48 min", "Dietro le quinte", "Il mondo di cenere", "Trailer"],
      },
    },
  ],
};
