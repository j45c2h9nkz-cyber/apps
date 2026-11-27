// Offline-Speicher der Handy-App: mit Verbindung immer der neueste Stand, ohne Verbindung (oder nach 4 s) der gespeicherte.
// bfde53356f setzt werkzeuge/bauen.py bei jedem Bau neu – so merkt das Handy, dass es eine neue Fassung gibt.
// Alle Apps liegen unter derselben Adresse und teilen sich den Speicher: darum nur die eigenen Ablagen (Vorsilbe) aufräumen.
var VORSILBE = "cockpit-";
var STAND = VORSILBE + "bfde53356f", SCHRIFTEN = VORSILBE + "schriften";
var DATEIEN = ["./", "cockpit.dat", "manifest.webmanifest", "symbol-180.png", "symbol-192.png", "symbol-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(STAND)
    .then(function(c){ return c.addAll(DATEIEN.map(function(u){ return new Request(u, {cache: "reload"}); })); })
    .then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys()
    .then(function(namen){ return Promise.all(namen.filter(function(n){ return n.indexOf(VORSILBE) === 0 && n !== STAND && n !== SCHRIFTEN; })
      .map(function(n){ return caches.delete(n); })); })
    .then(function(){ return self.clients.claim(); }));
});

self.addEventListener("fetch", function(e){
  var anfrage = e.request;
  if(anfrage.method !== "GET") return;
  var url = new URL(anfrage.url);
  if(url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com"){   // Schriften: einmal holen, dann aus dem Speicher
    e.respondWith(caches.open(SCHRIFTEN).then(function(c){
      return c.match(anfrage).then(function(t){
        return t || fetch(anfrage).then(function(r){ if(r.ok || r.type === "opaque") c.put(anfrage, r.clone()); return r; });
      });
    }));
    return;
  }
  if(url.origin !== location.origin) return;
  var eintrag = anfrage.mode === "navigate" ? "./" : anfrage;
  var netz = caches.open(STAND).then(function(c){
    return fetch(anfrage, {cache: "no-cache"}).then(function(r){ if(r.ok) return c.put(eintrag, r.clone()).then(function(){ return r; }); return r; });
  });
  function gespeichert(){ return caches.open(STAND).then(function(c){ return c.match(eintrag, {ignoreSearch: true}); }); }
  e.waitUntil(netz.catch(function(){}));
  e.respondWith(Promise.race([
    netz,
    new Promise(function(ok){ setTimeout(ok, 4000); }).then(function(){ return gespeichert().then(function(t){ return t || netz; }); })
  ]).catch(function(){ return gespeichert().then(function(t){ return t || Response.error(); }); }));
});
