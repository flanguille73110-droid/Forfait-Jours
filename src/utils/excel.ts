import * as XLSX from 'xlsx';
import { Jour, StatutJour } from '../types';

export interface ImportResult {
  jours: Jour[];
  dateDebutContrat?: string;
}

/**
 * Exporte les données des jours déclarés et les paramètres au format Excel (.xlsx).
 * @param jours Liste des objets Jours à exporter
 * @param annee Optionnel, filtre par année si fourni
 * @param dateDebutContrat Optionnel, date de début du contrat (YYYY-MM-DD)
 */
export function exportToExcel(jours: Jour[], annee?: number, dateDebutContrat?: string) {
  // Filtrer par année si demandé, sinon tout exporter
  const joursFiltres = annee 
    ? jours.filter(j => j.annee === annee)
    : jours;

  // Trier par date chronologique
  const joursTries = [...joursFiltres].sort((a, b) => a.date.localeCompare(b.date));

  // Formater les données pour le tableur Excel
  const rawData = joursTries.map(j => {
    // Formater la date en DD/MM/YYYY pour l'affichage Excel traditionnel
    const [y, m, d] = j.date.split('-');
    const dateFr = `${d}/${m}/${y}`;
    
    return {
      'Date': dateFr,
      'Statut': j.statut,
      'Mois': j.mois,
      'Année': j.annee
    };
  });

  // Créer le classeur
  const workbook = XLSX.utils.book_new();

  // 1. Feuille principale Suivi
  const worksheet = XLSX.utils.json_to_sheet(rawData);
  const sheetName = annee ? `Suivi ${annee}` : "Suivi Complet";
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 2. Feuille Paramètres si une date de début de contrat est renseignée dans Paramètres - Renseignement
  if (dateDebutContrat && dateDebutContrat.trim() !== '') {
    const parts = dateDebutContrat.split('-');
    const dateFr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateDebutContrat;

    const paramData = [
      {
        'Paramètre': 'Date de début du contrat',
        'Valeur': dateFr,
        'Code ISO': dateDebutContrat
      }
    ];

    const paramWorksheet = XLSX.utils.json_to_sheet(paramData);
    XLSX.utils.book_append_sheet(workbook, paramWorksheet, "Paramètres");
  }

  // Générer le nom du fichier
  const fileName = annee 
    ? `suivi_forfait_jours_${annee}.xlsx`
    : `suivi_forfait_jours_complet.xlsx`;

  // Télécharger le fichier
  XLSX.writeFile(workbook, fileName);
}

/**
 * Fonction utilitaire pour analyser une date Excel ou une chaîne
 */
function parseExcelDateValue(rawDateVal: any): string | null {
  if (typeof rawDateVal === 'number') {
    try {
      const parsedDate = XLSX.SSF.parse_date_code(rawDateVal);
      return `${parsedDate.y}-${String(parsedDate.m).padStart(2, '0')}-${String(parsedDate.d).padStart(2, '0')}`;
    } catch (err) {
      return null;
    }
  } else if (rawDateVal) {
    const rawDateStr = String(rawDateVal).trim();
    
    // Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDateStr)) {
      return rawDateStr;
    } 
    // Format DD/MM/YYYY
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(rawDateStr)) {
      const parts = rawDateStr.split('/');
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    } 
    // Autre format textuel
    else {
      const nativeDate = new Date(rawDateStr);
      if (!isNaN(nativeDate.getTime())) {
        return nativeDate.toISOString().split('T')[0];
      }
    }
  }
  return null;
}

/**
 * Lit un fichier Excel et extrait les jours déclarés ainsi que la date de contrat dans l'onglet Paramètres.
 * @param file Fichier Excel téléversé par l'utilisateur
 * @returns Une promesse contenant la liste des Jours validés et la date de début du contrat le cas échéant
 */
export function importFromExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        let extractedDateDebutContrat: string | undefined = undefined;

        // 1. Recherche d'un onglet de paramètres
        const paramSheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('param') || name.toLowerCase().includes('renseignement')
        );

        if (paramSheetName) {
          const paramWorksheet = workbook.Sheets[paramSheetName];
          const paramRows = XLSX.utils.sheet_to_json<any>(paramWorksheet);

          for (const row of paramRows) {
            const isoKey = Object.keys(row).find(k => k.toLowerCase().includes('iso'));
            const valKey = Object.keys(row).find(k => k.toLowerCase().includes('valeur') || k.toLowerCase().includes('date'));
            
            const rawVal = isoKey ? row[isoKey] : (valKey ? row[valKey] : null);

            if (rawVal) {
              const parsedDateStr = parseExcelDateValue(rawVal);
              if (parsedDateStr) {
                extractedDateDebutContrat = parsedDateStr;
                break;
              }
            }
          }
        }

        // 2. Traitement de la feuille des jours de suivi
        const daysSheetName = workbook.SheetNames.find(name => 
          !name.toLowerCase().includes('param') && !name.toLowerCase().includes('renseignement')
        ) || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[daysSheetName];
        const rawRows = XLSX.utils.sheet_to_json<any>(worksheet);
        const validatedJours: Jour[] = [];

        for (const row of rawRows) {
          const dateKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'date');
          const statutKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'statut');
          
          if (!dateKey || !statutKey) {
            continue;
          }
          
          const rawDateVal = row[dateKey];
          const rawStatutVal = row[statutKey];
          
          if (!rawDateVal || !rawStatutVal) {
            continue;
          }

          const dateStr = parseExcelDateValue(rawDateVal);

          if (!dateStr || dateStr.split('-').length !== 3) {
            continue;
          }

          const cleanStatut = String(rawStatutVal).trim().toLowerCase();
          let finalStatut: StatutJour | null = null;

          if (cleanStatut.includes('travail') || cleanStatut === 't' || cleanStatut === 'work') {
            finalStatut = 'Travail';
          } else if (cleanStatut.includes('cp') || cleanStatut.includes('congé') || cleanStatut.includes('conge') || cleanStatut.includes('vacation')) {
            finalStatut = 'CP';
          } else if (cleanStatut.includes('rtt')) {
            finalStatut = 'RTT';
          } else if (cleanStatut.includes('maladie') || cleanStatut.includes('arret') || cleanStatut.includes('arrêt') || cleanStatut.includes('sick')) {
            finalStatut = 'Arrêt maladie';
          } else if (cleanStatut.includes('repos') || cleanStatut.includes('week') || cleanStatut.includes('férié') || cleanStatut.includes('ferie') || cleanStatut.includes('off')) {
            finalStatut = 'Repos';
          }

          if (!finalStatut) {
            continue;
          }

          const [y, m] = dateStr.split('-').map(Number);

          validatedJours.push({
            id: dateStr,
            date: dateStr,
            statut: finalStatut,
            mois: m,
            annee: y
          });
        }

        resolve({
          jours: validatedJours,
          dateDebutContrat: extractedDateDebutContrat
        });
      } catch (err) {
        reject(new Error("Erreur lors de l'analyse du fichier Excel. Vérifiez le format."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Impossible de lire le fichier sélectionné."));
    };

    reader.readAsArrayBuffer(file);
  });
}

