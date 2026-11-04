// Serveur Node.js (sans dépendance) : Gestion de Billets d'Avion
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { fetchAll, fetchOne, run, softDelete } = require('./lib/db');
const { validate } = require('./lib/validate');
const V = require('./lib/views');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.js': 'text/javascript', '.ico': 'image/x-icon' };

// ---- Sessions en mémoire + jeton CSRF ----
const sessions = new Map();
function getSession(req, res) {
  const m = /(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.cookie || '');
  let sid = m && sessions.has(m[1]) ? m[1] : null;
  if (!sid) {
    sid = crypto.randomBytes(24).toString('hex');
    sessions.set(sid, { csrf: crypto.randomBytes(32).toString('hex') });
    res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; SameSite=Lax; Path=/`);
  }
  return sessions.get(sid);
}
const validCsrf = (s, t) => {
  const a = Buffer.from(String(t || '')), b = Buffer.from(s.csrf);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

function readForm(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e5) { reject(new Error('Trop gros')); req.destroy(); } });
    req.on('end', () => resolve(Object.fromEntries(new URLSearchParams(body))));
    req.on('error', reject);
  });
}

const send = (res, html, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
};
const redirect = (res, url) => { res.writeHead(303, { Location: url }); res.end(); };

const pad = (n) => String(n).padStart(2, '0');
function nowFr() {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(2)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---- Pages ----
function indexPage(s, info = '') {
  const clients = fetchAll('SELECT id, nom, prenom FROM clients WHERE supprime = 0');
  const vols = fetchAll('SELECT id, compagnie, origine, destination FROM vols WHERE supprime = 0');
  const t = V.csrf(s.csrf);
  return V.page('Gestion des clients et des vols', `
  <form action="/" method="post">${t}
    <label for="nom">Nom :</label><input type="text" id="nom" name="nom" required>
    <label for="prenom">Prénom :</label><input type="text" id="prenom" name="prenom" required>
    <label for="tel">Téléphone :</label><input type="tel" id="tel" name="tel" required>
    <button type="submit" name="ajouter_client">Ajouter Client</button>
  </form>
  <form action="/" method="post">${t}
    <label for="compagnie">Compagnie :</label><input type="text" id="compagnie" name="compagnie" required>
    <label for="origine">Origine :</label><input type="text" id="origine" name="origine" required>
    <label for="destination">Destination :</label><input type="text" id="destination" name="destination" required>
    <label for="prix">Prix :</label><input type="text" id="prix" name="prix" required>
    <button type="submit" name="ajouter_vol">Ajouter Vol</button>
  </form>
  <form action="/" method="post">${t}
    <label for="client_id">Client :</label>
    <select id="client_id" name="client_id" required>${V.options(clients, (c) => `${c.nom} ${c.prenom}`)}</select>
    <label for="vol_id">Vol :</label>
    <select id="vol_id" name="vol_id" required>${V.options(vols, V.volLabel)}</select>
    <button type="submit" name="ajouter_reservation">Ajouter Réservation</button>
  </form>${info}`);
}

function postIndex(s, f) {
  if (!validCsrf(s, f.csrf_token)) return V.error('Erreur de sécurité. Veuillez réessayer.');
  const fail = (rules) => {
    const errs = Object.values(validate(f, rules));
    return errs.length ? errs.map(V.error).join('') : null;
  };
  if ('ajouter_client' in f) {
    const e = fail({ nom: 'required', prenom: 'required', tel: 'required|tel' });
    if (e) return e;
    run('INSERT INTO clients (nom, prenom, tel) VALUES (?, ?, ?)', [f.nom.trim(), f.prenom.trim(), f.tel.trim()]);
    return V.success('Client ajouté avec succès');
  }
  if ('ajouter_vol' in f) {
    const e = fail({ compagnie: 'required', origine: 'required', destination: 'required', prix: 'required|numeric' });
    if (e) return e;
    run('INSERT INTO vols (compagnie, origine, destination, prix) VALUES (?, ?, ?, ?)',
      [f.compagnie.trim(), f.origine.trim(), f.destination.trim(), Number(f.prix.replace(',', '.'))]);
    return V.success('Vol ajouté avec succès');
  }
  if ('ajouter_reservation' in f) {
    const e = fail({ client_id: 'required|numeric', vol_id: 'required|numeric' });
    if (e) return e;
    const ok = fetchOne('SELECT 1 AS ok FROM clients WHERE id = ? AND supprime = 0', [+f.client_id]) &&
               fetchOne('SELECT 1 AS ok FROM vols WHERE id = ? AND supprime = 0', [+f.vol_id]);
    if (!ok) return V.error("Erreur lors de l'ajout de la réservation");
    run('INSERT INTO reservations (client_id, vol_id, date_r) VALUES (?, ?, ?)', [+f.client_id, +f.vol_id, nowFr()]);
    return V.success('Réservation ajoutée avec succès');
  }
  return '';
}

function clientsPage(s) {
  const rows = fetchAll('SELECT id, nom, prenom, tel FROM clients WHERE supprime = 0');
  const body = rows.length ? rows.map((c) => `<tr>
    <td>${c.id}</td><td>${V.esc(c.nom)}</td><td>${V.esc(c.prenom)}</td><td>${V.esc(c.tel)}</td>
    <td><a href="/clients/edit?id=${c.id}" class="btn-edit">Modifier</a>
      <form action="/supprimer" method="post" class="inline" onsubmit="return confirm('Êtes-vous sûr de vouloir supprimer ce client ?')">
        ${V.csrf(s.csrf)}<input type="hidden" name="client_id" value="${c.id}">
        <button type="submit" name="supprimer_client" class="btn-delete">Supprimer</button></form></td>
  </tr>`).join('') : `<tr><td colspan="5">Aucun client trouvé.</td></tr>`;
  return V.page('Liste des Clients', `<table><thead><tr><th>ID</th><th>Nom</th><th>Prénom</th><th>Téléphone</th><th>Actions</th></tr></thead><tbody>${body}</tbody></table>`);
}

function volsPage() {
  const rows = fetchAll('SELECT id, compagnie, origine, destination, prix FROM vols WHERE supprime = 0');
  const body = rows.length ? rows.map((v) => `<tr><td>${v.id}</td><td>${V.esc(v.compagnie)}</td><td>${V.esc(v.origine)}</td><td>${V.esc(v.destination)}</td><td>${v.prix}€</td></tr>`).join('')
    : `<tr><td colspan="5">Aucun vol trouvé.</td></tr>`;
  return V.page('Liste des Vols', `<table><thead><tr><th>ID</th><th>Compagnie</th><th>Origine</th><th>Destination</th><th>Prix</th></tr></thead><tbody>${body}</tbody></table>`);
}

function reservationsPage() {
  const rows = fetchAll(`SELECT c.nom, c.prenom, v.compagnie, v.origine, v.destination, r.date_r
    FROM reservations r JOIN clients c ON r.client_id = c.id JOIN vols v ON r.vol_id = v.id
    WHERE r.supprime = 0 AND c.supprime = 0 AND v.supprime = 0`);
  const body = rows.length ? rows.map((r) => `<tr><td>${V.esc(r.nom)} ${V.esc(r.prenom)}</td><td>${V.esc(V.volLabel(r))}</td><td>${V.esc(r.date_r)}</td></tr>`).join('')
    : `<tr><td colspan="3">Aucune réservation trouvée.</td></tr>`;
  return V.page('Réservations', `<table><thead><tr><th>Client</th><th>Vol</th><th>Date reservations</th></tr></thead><tbody>${body}</tbody></table>`);
}

function editClientPage(s, id, message = '') {
  const c = id ? fetchOne('SELECT id, nom, prenom, tel FROM clients WHERE id = ? AND supprime = 0', [id]) : null;
  const form = c ? `<form action="/clients/edit" method="post">${V.csrf(s.csrf)}
    <input type="hidden" name="id" value="${c.id}">
    <label for="nom">Nom :</label><input type="text" id="nom" name="nom" value="${V.esc(c.nom)}" required>
    <label for="prenom">Prénom :</label><input type="text" id="prenom" name="prenom" value="${V.esc(c.prenom)}" required>
    <label for="tel">Téléphone :</label><input type="tel" id="tel" name="tel" value="${V.esc(c.tel)}" required>
    <button type="submit" name="modifier_client">Modifier Client</button></form>`
    : `${id ? V.error('Client non trouvé') : ''}<p>Veuillez sélectionner un client à modifier.</p><a href="/clients" class="btn">Retour à la liste des clients</a>`;
  return V.page('Modifier un Client', message + form);
}

function supprimerPage(s, message = '') {
  const clients = fetchAll('SELECT id, nom, prenom FROM clients WHERE supprime = 0');
  const vols = fetchAll('SELECT id, compagnie, origine, destination FROM vols WHERE supprime = 0');
  const resas = fetchAll(`SELECT r.id, c.nom, c.prenom, v.compagnie, v.origine, v.destination
    FROM reservations r JOIN clients c ON r.client_id = c.id JOIN vols v ON r.vol_id = v.id WHERE r.supprime = 0`);
  const t = V.csrf(s.csrf);
  return V.page('Gestion des clients, des vols et des réservations', `
  <form action="/supprimer" method="post">${t}
    <label for="client_id">Client à supprimer :</label>
    <select id="client_id" name="client_id" required>${V.options(clients, (c) => `${c.nom} ${c.prenom}`)}</select>
    <button type="submit" name="supprimer_client">Supprimer Client</button></form>
  <form action="/supprimer" method="post">${t}
    <label for="vol_id">Vol à supprimer :</label>
    <select id="vol_id" name="vol_id" required>${V.options(vols, V.volLabel)}</select>
    <button type="submit" name="supprimer_vol">Supprimer Vol</button></form>
  <form action="/supprimer" method="post">${t}
    <label for="reservation_id">Réservation à supprimer :</label>
    <select id="reservation_id" name="reservation_id" required>${V.options(resas, (r) => `${r.nom} ${r.prenom} - ${V.volLabel(r)}`)}</select>
    <button type="submit" name="supprimer_reservation">Supprimer Réservation</button></form>
  ${message}`, 'Gestion des clients, des vols et des réservations');
}

function postSupprimer(s, f) {
  if (!validCsrf(s, f.csrf_token)) return V.error('Erreur de sécurité. Veuillez réessayer.');
  const defs = [
    ['supprimer_client', 'clients', 'client_id', 'Client supprimé avec succès', 'Erreur lors de la suppression du client'],
    ['supprimer_vol', 'vols', 'vol_id', 'Vol supprimé avec succès', 'Erreur lors de la suppression du vol'],
    ['supprimer_reservation', 'reservations', 'reservation_id', 'Réservation supprimée avec succès', 'Erreur lors de la suppression de la réservation'],
  ];
  for (const [btn, table, field, ok, ko] of defs) {
    if (btn in f) return softDelete(table, parseInt(f[field], 10) || 0) ? V.success(ok) : V.error(ko);
  }
  return '';
}

function postEditClient(s, f) {
  const id = parseInt(f.id, 10) || 0;
  if (!validCsrf(s, f.csrf_token)) return editClientPage(s, id, V.error('Erreur de sécurité. Veuillez réessayer.'));
  const errs = Object.values(validate(f, { id: 'required|numeric', nom: 'required', prenom: 'required', tel: 'required|tel' }));
  if (errs.length) return editClientPage(s, id, errs.map(V.error).join(''));
  const r = run('UPDATE clients SET nom = ?, prenom = ?, tel = ? WHERE id = ? AND supprime = 0', [f.nom.trim(), f.prenom.trim(), f.tel.trim(), id]);
  return editClientPage(s, id, r.changes ? V.success('Client modifié avec succès') : V.error('Erreur lors de la modification du client'));
}

// ---- Routeur ----
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname.replace(/\/+$/, '') || '/';

    // Fichiers statiques
    if (req.method === 'GET' && p !== '/') {
      const file = path.join(PUBLIC, path.normalize(p));
      if (file.startsWith(PUBLIC + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        return fs.createReadStream(file).pipe(res);
      }
    }

    const s = getSession(req, res);
    const isPost = req.method === 'POST';
    const form = isPost ? await readForm(req) : {};

    if (p === '/') return send(res, indexPage(s, isPost ? postIndex(s, form) : ''));
    if (p === '/clients' && !isPost) return send(res, clientsPage(s));
    if (p === '/vols' && !isPost) return send(res, volsPage());
    if (p === '/reservations' && !isPost) return send(res, reservationsPage());
    if (p === '/clients/edit') {
      return send(res, isPost ? postEditClient(s, form) : editClientPage(s, parseInt(url.searchParams.get('id'), 10) || 0));
    }
    if (p === '/supprimer') return send(res, supprimerPage(s, isPost ? postSupprimer(s, form) : ''));

    send(res, V.page('Page introuvable', '<p>Page introuvable.</p>'), 404);
  } catch (e) {
    console.error(e);
    send(res, V.page('Erreur', V.error('Erreur interne du serveur')), 500);
  }
});

server.listen(PORT, () => console.log(`Gestion de Billets d'Avion : http://localhost:${PORT}`));
