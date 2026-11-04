// Gabarits HTML
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const alert = (type, msg) => `<div class="alert alert-${type}">${esc(msg)}</div>`;
const success = (m) => alert('success', m);
const error = (m) => alert('danger', m);

const nav = `<nav><ul>
  <li><a href="/">Accueil</a></li>
  <li><a href="/clients">Clients</a></li>
  <li><a href="/vols">Vols</a></li>
  <li><a href="/reservations">Reservations</a></li>
  <li><a href="/supprimer">Supprimer</a></li>
</ul></nav>`;

function page(title, body, h1 = title) {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title><link rel="stylesheet" href="/style.css"></head>
<body><h1>${esc(h1)}</h1><header>${nav}</header>
<div class="container">${body}</div></body></html>`;
}

const options = (rows, label) =>
  rows.map((r) => `<option value="${r.id}">${esc(label(r))}</option>`).join('');
const volLabel = (v) => `${v.compagnie}: ${v.origine} - ${v.destination}`;

const csrf = (t) => `<input type="hidden" name="csrf_token" value="${t}">`;

module.exports = { esc, success, error, page, options, volLabel, csrf };
