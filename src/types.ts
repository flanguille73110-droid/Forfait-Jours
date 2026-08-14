/**
 * Types pour l'application Suivi Forfait Jours
 */

export type StatutJour = 'Travail' | 'CP' | 'RTT' | 'Repos';

export interface Jour {
  id: string; // Format: YYYY-MM-DD (sert aussi d'identifiant unique par date)
  date: string; // Format: YYYY-MM-DD
  statut: StatutJour;
  mois: number; // 1 à 12
  annee: number; // e.g. 2026
}

export interface CompteursAnnuel {
  travail: number;
  cp: number;
  rtt: number;
  repos: number;
  restants: number;
  forfaitAnnee?: number;
  joursOuvresTotal?: number;
  joursOuvresRestants?: number;
}

export interface LogSauvegarde {
  id: string;
  timestamp: string; // ISO string
  dateFormatee: string; // Format e.g. "Vendredi 14 août 2026 à 18:30"
  type: 'complet' | 'annuel';
  nomFichier: string;
  nombreJours: number;
  annee?: number;
}
