/**
 * Algorithme de Meeus pour le calcul de Pâques et gestion des jours fériés français
 */

/**
 * Calcule la date du Dimanche de Pâques pour une année donnée selon l'algorithme de Jean Meeus.
 */
export function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31); // 3 = Mars, 4 = Avril
  const day = ((h + L - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const res = new Date(d);
  res.setDate(res.getDate() + days);
  return res;
}

/**
 * Renvoie un dictionnaire des jours fériés français pour l'année spécifiée.
 * Clé : YYYY-MM-DD, Valeur : Nom du jour férié
 */
export function getFrenchHolidays(year: number): Record<string, string> {
  const holidays: Record<string, string> = {};

  // Dates fixes
  holidays[`${year}-01-01`] = "Jour de l'An";
  holidays[`${year}-05-01`] = "Fête du Travail";
  holidays[`${year}-05-08`] = "Victoire 1945";
  holidays[`${year}-07-14`] = "Fête Nationale";
  holidays[`${year}-08-15`] = "Assomption";
  holidays[`${year}-11-01`] = "Toussaint";
  holidays[`${year}-11-11`] = "Armistice 1918";
  holidays[`${year}-12-25`] = "Noël";

  // Dates mobiles calculées via l'algorithme de Meeus
  const easter = getEasterDate(year);

  // Dimanche de Pâques
  holidays[formatDate(easter)] = "Dimanche de Pâques";

  // Lundi de Pâques (+1 jour)
  const mondayEaster = addDays(easter, 1);
  holidays[formatDate(mondayEaster)] = "Lundi de Pâques";

  // Jeudi de l'Ascension (+39 jours)
  const ascension = addDays(easter, 39);
  holidays[formatDate(ascension)] = "Ascension";

  // Lundi de Pentecôte (+50 jours)
  const pentecost = addDays(easter, 50);
  holidays[formatDate(pentecost)] = "Lundi de Pentecôte";

  return holidays;
}

/**
 * Renvoie le nom du jour férié si la date YYYY-MM-DD est un jour férié français, sinon null.
 */
export function getHolidayName(dateStr: string): string | null {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  if (isNaN(year)) return null;

  const holidays = getFrenchHolidays(year);
  return holidays[dateStr] || null;
}
