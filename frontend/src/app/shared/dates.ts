/**
 * Conversions entre les dates de l'API (texte ISO) et les objets Date utilisés par les
 * composants PrimeNG (DatePicker). Tout est en heure locale, sans décalage de fuseau.
 */

/** Ajoute un zéro devant les nombres à un chiffre (5 → « 05 »). */
function deux(n: number): string { return String(n).padStart(2, '0'); }

/**
 * Convertit un texte ISO (« 2026-11-05 » ou « 2026-11-05T14:30:00 ») en objet Date local.
 * @param iso le texte à convertir, ou null/vide
 * @returns la date, ou null si le texte est vide ou invalide
 */
export function versDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0));
}

/**
 * Formate une Date en jour ISO « aaaa-mm-jj » (heure locale).
 * @param d la date, ou null
 * @returns le texte ISO, ou une chaîne vide si la date est absente
 */
export function versIsoDate(d: Date | null | undefined): string {
  return d ? `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}` : '';
}

/**
 * Formate une Date en date et heure ISO « aaaa-mm-jjThh:mm:00 » (heure locale).
 * @param d la date, ou null
 * @returns le texte ISO, ou une chaîne vide si la date est absente
 */
export function versIsoDateHeure(d: Date | null | undefined): string {
  return d ? `${versIsoDate(d)}T${deux(d.getHours())}:${deux(d.getMinutes())}:00` : '';
}

/**
 * Renvoie la date d'aujourd'hui à minuit (utile pour les dates minimales ou maximales d'un calendrier).
 * @returns aujourd'hui, heure 00:00
 */
export function aujourdhui(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
