import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar, Briefcase, Palmtree, Clock, Download, Upload, Trash2, 
  RefreshCw, AlertCircle, Check, Info, CalendarDays, BarChart3, HelpCircle, Sparkles,
  Settings, X, ChevronLeft, ChevronRight, History, Save, FileSpreadsheet, CheckCircle2
} from 'lucide-react';
import { Jour, StatutJour, CompteursAnnuel, LogSauvegarde } from './types';
import Notification, { ToastMessage } from './components/Notification';
import StatsCard from './components/StatsCard';
import DayStatusModal from './components/DayStatusModal';
import YearlyCalendar from './components/YearlyCalendar';
import MonthlyCalendar from './components/MonthlyCalendar';
import MonthStatsChart from './components/MonthStatsChart';
import { exportToExcel, importFromExcel } from './utils/excel';
import { getHolidayName } from './utils/holidays';

// Fonction de génération des données d'exemple réalistes
function generateDemoData(year: number): Record<string, Jour> {
  const data: Record<string, Jour> = {};
  
  // On remplit du 1er janvier au 13 août 2026 (date du jour simulée)
  const currentMonth = 8;
  const currentDay = 13;
  
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    
    for (let d = 1; d <= daysInMonth; d++) {
      // Pour les jours futurs, on déclare seulement quelques jours de CP / RTT prévus
      if (m > currentMonth || (m === currentMonth && d > currentDay)) {
        if (m === 8 && (d === 17 || d === 18 || d === 19)) {
          const dateStr = `${year}-08-${String(d).padStart(2, '0')}`;
          data[dateStr] = { id: dateStr, date: dateStr, statut: 'CP', mois: m, annee: year };
        }
        if (m === 10 && d === 23) {
          const dateStr = `${year}-10-23`;
          data[dateStr] = { id: dateStr, date: dateStr, statut: 'RTT', mois: m, annee: year };
        }
        continue;
      }
      
      const dateObj = new Date(year, m - 1, d);
      const dayOfWeek = dateObj.getDay(); // 0 = Dimanche, 6 = Samedi
      const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Peu de chance d'avoir travaillé le week-end
        if (Math.random() < 0.04) {
          data[dateStr] = { id: dateStr, date: dateStr, statut: 'Travail', mois: m, annee: year };
        } else if (Math.random() < 0.15) {
          data[dateStr] = { id: dateStr, date: dateStr, statut: 'Repos', mois: m, annee: year };
        }
      } else {
        // En semaine (Mardi-Vendredi)
        const rand = Math.random();
        if (rand < 0.83) {
          data[dateStr] = { id: dateStr, date: dateStr, statut: 'Travail', mois: m, annee: year };
        } else if (rand < 0.90) {
          data[dateStr] = { id: dateStr, date: dateStr, statut: 'CP', mois: m, annee: year };
        } else if (rand < 0.95) {
          data[dateStr] = { id: dateStr, date: dateStr, statut: 'RTT', mois: m, annee: year };
        } else {
          data[dateStr] = { id: dateStr, date: dateStr, statut: 'Repos', mois: m, annee: year };
        }
      }
    }
  }
  return data;
}

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- États principaux ---
  const [joursLogs, setJoursLogs] = useState<Record<string, Jour>>({});
  const [anneeSelectionnee, setAnneeSelectionnee] = useState<number>(2026); // Année courante d'après le contexte local
  const [vueMode, setVueMode] = useState<'accueil' | 'annuelle' | 'mensuelle' | 'parametres'>('accueil');
  const [moisSelectionne, setMoisSelectionne] = useState<number>(8); // Août par défaut (contexte local)
  const [jourCible, setJourCible] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ToastMessage[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [afficherInfos, setAfficherInfos] = useState<boolean>(true);
  const [dateDebutContrat, setDateDebutContrat] = useState<string>(() => localStorage.getItem('date_debut_contrat') || '');
  const [dateContratObligatoireSaisie, setDateContratObligatoireSaisie] = useState<string>('');
  const [afficherParametres, setAfficherParametres] = useState<boolean>(false);
  const [pageParametres, setPageParametres] = useState<'menu' | 'contrat' | 'sauvegarde' | 'historique' | 'reinitialisation'>('menu');
  const [afficherModalReinitialiser, setAfficherModalReinitialiser] = useState<boolean>(false);
  const [afficherModalCP, setAfficherModalCP] = useState<boolean>(false);
  const [afficherModalRTT, setAfficherModalRTT] = useState<boolean>(false);
  const [afficherModalRappelVendredi, setAfficherModalRappelVendredi] = useState<boolean>(false);
  const [historiqueSauvegardes, setHistoriqueSauvegardes] = useState<LogSauvegarde[]>(() => {
    const saved = localStorage.getItem('historique_sauvegardes_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [statutBatchSelectionne, setStatutBatchSelectionne] = useState<string>('Travail');

  // Liste des dates enregistrées en CP pour l'année sélectionnée
  const datesCPAnnee = useMemo(() => {
    return (Object.values(joursLogs) as Jour[])
      .filter((j) => j.statut === 'CP' && (j.annee === anneeSelectionnee || j.date.startsWith(`${anneeSelectionnee}-`)))
      .map((j) => j.date)
      .sort();
  }, [joursLogs, anneeSelectionnee]);

  // Liste des dates enregistrées en RTT pour l'année sélectionnée
  const datesRTTAnnee = useMemo(() => {
    return (Object.values(joursLogs) as Jour[])
      .filter((j) => j.statut === 'RTT' && (j.annee === anneeSelectionnee || j.date.startsWith(`${anneeSelectionnee}-`)))
      .map((j) => j.date)
      .sort();
  }, [joursLogs, anneeSelectionnee]);

  // --- Initialisation / Chargement ---
  useEffect(() => {
    const localData = localStorage.getItem('suivi_forfait_jours_v1');
    if (localData) {
      try {
        setJoursLogs(JSON.parse(localData));
      } catch (err) {
        console.error("Erreur lors de la lecture des données locales", err);
      }
    } else {
      // Initialiser avec un calendrier vide pour la première ouverture
      setJoursLogs({});
      localStorage.setItem('suivi_forfait_jours_v1', JSON.stringify({}));
    }
  }, []);

  // --- Sauvegarde automatique ---
  const sauvegarderDonnees = (nouvellesDonnees: Record<string, Jour>) => {
    setJoursLogs(nouvellesDonnees);
    localStorage.setItem('suivi_forfait_jours_v1', JSON.stringify(nouvellesDonnees));
  };

  // --- Gestionnaires de notifications ---
  const ajouterNotification = (type: ToastMessage['type'], text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, type, text }]);
  };

  const dismisseNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // --- Validation obligatoire de la Date de Début de Contrat ---
  const handleValiderDateDebutContratObligatoire = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateContratObligatoireSaisie) return;

    setDateDebutContrat(dateContratObligatoireSaisie);
    localStorage.setItem('date_debut_contrat', dateContratObligatoireSaisie);

    const nouvellesDonnees = { ...joursLogs };
    let aModifie = false;
    Object.keys(nouvellesDonnees).forEach((key) => {
      if (key < dateContratObligatoireSaisie) {
        delete nouvellesDonnees[key];
        aModifie = true;
      }
    });
    if (aModifie) {
      sauvegarderDonnees(nouvellesDonnees);
      ajouterNotification('info', "Les statuts antérieurs à la date de début de contrat ont été supprimés.");
    }
    ajouterNotification('success', "Date de début de contrat enregistrée avec succès.");
  };

  // --- Calcul des statistiques annuelles ---
  const statsAnnuel = useMemo<CompteursAnnuel>(() => {
    let travail = 0;
    let cp = 0;
    let rtt = 0;
    let repos = 0;
    let maladie = 0;

    Object.keys(joursLogs).forEach((key) => {
      const log = joursLogs[key];
      if (log.annee === anneeSelectionnee) {
        if (log.statut === 'Travail') travail++;
        else if (log.statut === 'CP') cp++;
        else if (log.statut === 'RTT') rtt++;
        else if (log.statut === 'Arrêt maladie' || log.statut === 'Maladie') maladie++;
        else if (log.statut === 'Repos') repos++;
      }
    });

    // Calcul du forfait au prorata si une Date de début de contrat est renseignée
    let forfaitAnnee = 218;
    if (dateDebutContrat) {
      const parts = dateDebutContrat.split('-');
      if (parts.length === 3) {
        const startYear = parseInt(parts[0], 10);
        const startMonth = parseInt(parts[1], 10);
        const startDay = parseInt(parts[2], 10);

        if (!isNaN(startYear) && !isNaN(startMonth) && !isNaN(startDay)) {
          if (startYear === anneeSelectionnee) {
            const startDate = new Date(anneeSelectionnee, startMonth - 1, startDay);
            const endDate = new Date(anneeSelectionnee, 11, 31);
            const diffTime = endDate.getTime() - startDate.getTime();
            const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
            // Formule : 218 * nombre de jours restants / 365
            forfaitAnnee = Math.round((218 * diffDays) / 365);
          } else if (startYear > anneeSelectionnee) {
            forfaitAnnee = 0;
          } else {
            forfaitAnnee = 218;
          }
        }
      }
    }

    const restants = forfaitAnnee - travail;

    // Calcul des jours ouvrés (du lundi au vendredi hors jours fériés)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let joursOuvresTotal = 0;
    let joursOuvresRestants = 0;

    for (let m = 1; m <= 12; m++) {
      const daysInMonth = new Date(anneeSelectionnee, m, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(anneeSelectionnee, m - 1, d);
        const dayOfWeek = dateObj.getDay(); // 0 = Dimanche, 6 = Samedi
        const dateStr = `${anneeSelectionnee}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const isHoliday = !!getHolidayName(dateStr);
        
        if (isWeekday && !isHoliday) {
          joursOuvresTotal++;
          // Si date >= aujourd'hui et n'a pas encore de statut
          if (dateStr >= todayStr && !joursLogs[dateStr]?.statut) {
            joursOuvresRestants++;
          }
        }
      }
    }

    return { travail, cp, rtt, repos, maladie, restants, forfaitAnnee, joursOuvresTotal, joursOuvresRestants };
  }, [joursLogs, anneeSelectionnee, dateDebutContrat]);

  // --- Fonctions pour l'onglet Accueil ---
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayDateString();

  const todayFormatted = useMemo(() => {
    const d = new Date();
    const formatted = d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, []);

  // Remonter en haut de page à chaque changement d'onglet (notamment sur smartphone)
  const changerOngletMode = (mode: 'accueil' | 'annuelle' | 'mensuelle' | 'parametres') => {
    if (mode !== 'mensuelle') {
      setStatutBatchSelectionne('Travail');
    }
    setVueMode(mode);
    if (mode === 'parametres') {
      setPageParametres('menu');
    }
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const topAnchor = document.getElementById('app-top-anchor');
      if (topAnchor) {
        topAnchor.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
      }
    };
    scrollToTop();
    requestAnimationFrame(scrollToTop);
    setTimeout(scrollToTop, 50);
  };

  useEffect(() => {
    if (vueMode !== 'mensuelle') {
      setStatutBatchSelectionne('Travail');
    }
    const scrollToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      const topAnchor = document.getElementById('app-top-anchor');
      if (topAnchor) {
        topAnchor.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
      }
    };
    scrollToTop();
    requestAnimationFrame(scrollToTop);
    const timer = setTimeout(scrollToTop, 50);
    return () => clearTimeout(timer);
  }, [vueMode]);

  // --- Journalisation des sauvegardes et rappel du vendredi ---
  const enregistrerLogSauvegarde = (type: 'complet' | 'annuel', anneeExportee?: number) => {
    const now = new Date();
    const dateFormatee = now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) + ` à ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const dateFormateeCap = dateFormatee.charAt(0).toUpperCase() + dateFormatee.slice(1);
    const nbJours = Object.keys(joursLogs).length;
    const nomFichier = type === 'complet'
      ? 'suivi_forfait_jours_complet.xlsx'
      : `suivi_forfait_jours_${anneeExportee || now.getFullYear()}.xlsx`;

    const nouveauLog: LogSauvegarde = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      dateFormatee: dateFormateeCap,
      type,
      nomFichier,
      nombreJours: nbJours,
      annee: anneeExportee,
    };

    setHistoriqueSauvegardes((prev) => {
      const updated = [nouveauLog, ...prev];
      localStorage.setItem('historique_sauvegardes_v1', JSON.stringify(updated));
      return updated;
    });

    // Si c'est vendredi, on marque ce vendredi comme sauvegardé
    if (now.getDay() === 5) {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      localStorage.setItem('derniere_sauvegarde_vendredi', `${yyyy}-${mm}-${dd}`);
    }
  };

  const verifierRappelVendrediApresStatut = () => {
    const now = new Date();
    // getDay() === 5 correspond au vendredi (0 = Dimanche, 5 = Vendredi)
    if (now.getDay() === 5) {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const aujourdhuiStr = `${yyyy}-${mm}-${dd}`;
      const derniereSauvegarde = localStorage.getItem('derniere_sauvegarde_vendredi');
      if (derniereSauvegarde !== aujourdhuiStr) {
        setTimeout(() => {
          setAfficherModalRappelVendredi(true);
        }, 350);
      }
    }
  };

  const todayStatus = joursLogs[todayStr]?.statut || null;

  const handleTodayStatusChange = (statut: string) => {
    if (dateDebutContrat && todayStr < dateDebutContrat && statut !== '') {
      ajouterNotification('warning', `Impossible de définir un statut avant la date de début de contrat (${new Date(dateDebutContrat).toLocaleDateString('fr-FR')}).`);
      return;
    }

    const nouvellesDonnees = { ...joursLogs };
    if (statut === '') {
      delete nouvellesDonnees[todayStr];
      sauvegarderDonnees(nouvellesDonnees);
      ajouterNotification('success', "Le statut d'aujourd'hui a été réinitialisé.");
    } else {
      const [y, m] = todayStr.split('-').map(Number);
      nouvellesDonnees[todayStr] = {
        id: todayStr,
        date: todayStr,
        statut: statut as StatutJour,
        mois: m,
        annee: y,
      };
      sauvegarderDonnees(nouvellesDonnees);
      ajouterNotification('success', `Aujourd'hui déclaré en : ${statut}.`);
      verifierRappelVendrediApresStatut();
    }
  };

  // --- Actions Calendrier ---
  const handleSelectDay = (dateStr: string) => {
    if (dateDebutContrat && dateStr < dateDebutContrat) {
      ajouterNotification('warning', `Impossible de modifier le statut pour une date antérieure au début de contrat (${new Date(dateDebutContrat).toLocaleDateString('fr-FR')}).`);
      return;
    }
    setJourCible(dateStr);
  };

  const handleChangeStatut = (statut: StatutJour | null) => {
    if (!jourCible) return;

    if (dateDebutContrat && jourCible < dateDebutContrat && statut !== null) {
      ajouterNotification('warning', `Impossible de définir un statut avant la date de début de contrat (${new Date(dateDebutContrat).toLocaleDateString('fr-FR')}).`);
      setJourCible(null);
      return;
    }

    const nouvellesDonnees = { ...joursLogs };
    if (statut === null) {
      delete nouvellesDonnees[jourCible];
      sauvegarderDonnees(nouvellesDonnees);
      ajouterNotification('success', "Journée réinitialisée avec succès.");
    } else {
      const [y, m] = jourCible.split('-').map(Number);
      nouvellesDonnees[jourCible] = {
        id: jourCible,
        date: jourCible,
        statut,
        mois: m,
        annee: y,
      };
      sauvegarderDonnees(nouvellesDonnees);
      ajouterNotification('success', `Journée déclarée en ${statut}.`);
      verifierRappelVendrediApresStatut();
    }
    setJourCible(null);
  };

  const handleApplyBatchStatus = (dateStrings: string[], statut: StatutJour | null) => {
    if (dateStrings.length === 0) return;

    let targetDates = dateStrings;
    if (dateDebutContrat && statut !== null) {
      const datesAvant = dateStrings.filter((d) => d < dateDebutContrat);
      targetDates = dateStrings.filter((d) => d >= dateDebutContrat);
      if (datesAvant.length > 0) {
        ajouterNotification('warning', `${datesAvant.length} jour(s) antérieur(s) au début du contrat (${new Date(dateDebutContrat).toLocaleDateString('fr-FR')}) ont été ignoré(s).`);
      }
    }

    if (targetDates.length === 0) return;

    const nouvellesDonnees = { ...joursLogs };
    targetDates.forEach((dateStr) => {
      if (statut === null) {
        delete nouvellesDonnees[dateStr];
      } else {
        const [y, m] = dateStr.split('-').map(Number);
        nouvellesDonnees[dateStr] = {
          id: dateStr,
          date: dateStr,
          statut,
          mois: m,
          annee: y,
        };
      }
    });

    sauvegarderDonnees(nouvellesDonnees);

    if (statut === null) {
      ajouterNotification('success', `Statut réinitialisé pour ${targetDates.length} jour(s).`);
    } else {
      ajouterNotification('success', `Statut "${statut}" appliqué à ${targetDates.length} jour(s).`);
      verifierRappelVendrediApresStatut();
    }
  };

  const handleNavigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (moisSelectionne === 1) {
        setMoisSelectionne(12);
        setAnneeSelectionnee((prev) => prev - 1);
      } else {
        setMoisSelectionne((prev) => prev - 1);
      }
    } else {
      if (moisSelectionne === 12) {
        setMoisSelectionne(1);
        setAnneeSelectionnee((prev) => prev + 1);
      } else {
        setMoisSelectionne((prev) => prev + 1);
      }
    }
  };

  // --- Import / Export ---
  const handleExportExcel = () => {
    const listJours = Object.values(joursLogs) as Jour[];
    if (listJours.length === 0 && !dateDebutContrat) {
      ajouterNotification('warning', "Aucune donnée ni paramètre à exporter.");
      return;
    }
    try {
      exportToExcel(listJours, anneeSelectionnee, dateDebutContrat);
      enregistrerLogSauvegarde('annuel', anneeSelectionnee);
      ajouterNotification('success', `Export Excel de l'année ${anneeSelectionnee} téléchargé.`);
    } catch (err) {
      ajouterNotification('error', "Échec de la génération du fichier Excel.");
    }
  };

  const handleExportCompletExcel = () => {
    const listJours = Object.values(joursLogs) as Jour[];
    if (listJours.length === 0 && !dateDebutContrat) {
      ajouterNotification('warning', "Aucune donnée ni paramètre à exporter.");
      return;
    }
    try {
      exportToExcel(listJours, undefined, dateDebutContrat);
      enregistrerLogSauvegarde('complet');
      ajouterNotification('success', "Export Excel complet téléchargé.");
    } catch (err) {
      ajouterNotification('error', "Échec de la génération du fichier Excel complet.");
    }
  };

  const handleImportExcel = async (file: File) => {
    try {
      const result = await importFromExcel(file);
      const joursImportes = result.jours;
      
      if (joursImportes.length === 0 && !result.dateDebutContrat) {
        ajouterNotification('warning', "Aucune donnée ou paramètre valide trouvé dans le fichier Excel.");
        return;
      }

      // Importer et enregistrer la date de début de contrat si présente
      if (result.dateDebutContrat) {
        setDateDebutContrat(result.dateDebutContrat);
        localStorage.setItem('date_debut_contrat', result.dateDebutContrat);
      }

      // Fusionner les jours importés avec l'existant
      if (joursImportes.length > 0) {
        const nouvellesDonnees = { ...joursLogs };
        joursImportes.forEach((j) => {
          nouvellesDonnees[j.date] = j;
        });
        sauvegarderDonnees(nouvellesDonnees);

        if (joursImportes[0]) {
          setAnneeSelectionnee(joursImportes[0].annee);
        }
      }

      let msg = "";
      if (joursImportes.length > 0) {
        msg += `${joursImportes.length} journées ont été importées. `;
      }
      if (result.dateDebutContrat) {
        const dateFr = new Date(result.dateDebutContrat).toLocaleDateString('fr-FR');
        msg += `Date de début de contrat importée (${dateFr}).`;
      }

      ajouterNotification('success', msg.trim());
    } catch (err: any) {
      ajouterNotification('error', err.message || "Erreur lors de l'importation du fichier Excel.");
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleImportExcel(files[0]);
    }
  };

  // --- Drag and Drop ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'xlsx' || extension === 'xls') {
        handleImportExcel(file);
      } else {
        ajouterNotification('error', "Seuls les fichiers Excel (.xlsx, .xls) sont acceptés.");
      }
    }
  };

  // --- Gestionnaires d'état de base ---
  const viderToutesDonnees = () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer TOUTES vos données déclarées ? Cette action est irréversible.")) {
      setJoursLogs({});
      localStorage.removeItem('suivi_forfait_jours_v1');
      ajouterNotification('success', "Toutes les données ont été supprimées.");
    }
  };

  const chargerDonneesDemo = () => {
    const demo = generateDemoData(anneeSelectionnee);
    sauvegarderDonnees(demo);
    ajouterNotification('success', `Données d'exemple générées pour l'année ${anneeSelectionnee}.`);
  };

  return (
    <div 
      className={`min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 sm:pb-16 transition-colors ${
        dragActive ? 'bg-indigo-50/40' : ''
      }`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <div id="app-top-anchor" className="h-0 w-0 p-0 m-0 overflow-hidden" />
      {/* Glissement de fichier (Drag overlay) */}
      {dragActive && (
        <div className="fixed inset-0 bg-indigo-600/10 border-4 border-dashed border-indigo-500 z-40 pointer-events-none flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3">
            <Upload className="h-10 w-10 text-indigo-600 animate-bounce" />
            <p className="font-bold text-slate-800 text-lg">Déposez votre fichier Excel ici</p>
            <p className="text-xs text-slate-400">Importez directement vos journées de forfait</p>
          </div>
        </div>
      )}

      {/* --- HEADER PROFESSIONNEL POLISH --- */}
      <nav className="flex flex-col md:flex-row items-center justify-between px-8 py-4 bg-white border-b border-slate-200 shadow-xs sticky top-0 z-30 gap-4">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-xs text-white">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              FORFAIT 218
              <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                CADRE
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">GESTION DU TEMPS</p>
          </div>
        </div>

        {/* Actions header - Bouton Paramètres & Bouton Télécharger Excel */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
          {/* Input fichier masqué conservé pour l'import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />

          {/* Bouton Paramètres (Roue crantée) */}
          <button
            onClick={() => changerOngletMode('parametres')}
            className={`p-2 border rounded-lg transition-all cursor-pointer shadow-xs flex items-center justify-center ${
              vueMode === 'parametres'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:text-slate-800 hover:bg-slate-50'
            }`}
            title="Paramètres du contrat"
          >
            <Settings className="h-4.5 w-4.5" />
          </button>

          {/* Bouton Télécharger Excel complet (à droite de la roue crantée) */}
          <button
            onClick={handleExportCompletExcel}
            className="p-2 border border-slate-200 rounded-lg bg-white text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 font-bold text-xs"
            title="Télécharger le fichier Excel complet"
          >
            <span className="text-base leading-none">💾</span>
            <span className="hidden sm:inline">Télécharger Excel</span>
          </button>
        </div>
      </nav>

      {/* --- DISPOSITION AVEC SIDEBAR GAUCHE POUR LES ONGLETS --- */}
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-73px)]">
        {/* --- NAVIGATION PAR ONGLETS EN COLONNE SUR LA GAUCHE (DESKTOP) --- */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-4 shrink-0 gap-2 fixed top-[73px] left-0 bottom-0 h-[calc(100vh-73px)] z-20 shadow-xs overflow-y-auto">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3 pt-2 pb-1">
            Navigation
          </span>

          <button
            onClick={() => changerOngletMode('accueil')}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              vueMode === 'accueil'
                ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100/80'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <span className="text-base">🏠</span>
            <span>Accueil</span>
          </button>

          <button
            onClick={() => changerOngletMode('annuelle')}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              vueMode === 'annuelle'
                ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100/80'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <span className="text-base">📅</span>
            <span>Vue Annuelle ({anneeSelectionnee})</span>
          </button>

          <button
            onClick={() => changerOngletMode('mensuelle')}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              vueMode === 'mensuelle'
                ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100/80'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <span className="text-base">📆</span>
            <span>Vue Mensuelle Détaillée</span>
          </button>

          <button
            onClick={() => changerOngletMode('parametres')}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              vueMode === 'parametres'
                ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100/80'
                : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
            }`}
          >
            <span className="text-base">⚙️</span>
            <span>Paramètres</span>
          </button>

          <div className="mt-auto pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-medium px-2 text-center">
              Mise à jour en temps réel<br/>Stocké sur cet appareil
            </p>
          </div>
        </aside>

        {/* --- ZONE PRINCIPALE --- */}
        <main className="flex-1 md:ml-64 max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 w-full overflow-hidden">

        {/* --- BANDEAU D'INFOS OU D'ALERTE --- */}
        {statsAnnuel.travail > 218 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-start gap-3 shadow-xs">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Dépassement du forfait de 218 jours !</p>
              <p className="text-xs text-amber-700 mt-1">
                Attention : vous avez déclaré actuellement <span className="font-bold">{statsAnnuel.travail} jours de travail</span> sur l'année {anneeSelectionnee}, soit un dépassement de <span className="font-bold">{statsAnnuel.travail - 218} jours</span> par rapport au forfait standard de 218 jours.
              </p>
            </div>
          </div>
        )}

        {statsAnnuel.travail === 218 && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 flex items-start gap-3 shadow-xs">
            <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Forfait atteint ! 🎉</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Félicitations, vous avez déclaré exactement 218 jours travaillés sur l'année {anneeSelectionnee}.
              </p>
            </div>
          </div>
        )}

        {/* --- SECTION CALENDRIER OU ACCUEIL ACTIF --- */}
        <div className="w-full">
          {vueMode === 'accueil' ? (
            <div className="flex flex-col gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-xs flex flex-col items-center justify-center text-center max-w-xl mx-auto my-4 gap-6 w-full">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shadow-xs">
                  <Clock className="h-8 w-8" />
                </div>
                
                <div>
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date du jour</h2>
                  <p className="text-2xl font-extrabold text-slate-800 mt-1">{todayFormatted}</p>
                </div>

                {/* Statut actuel d'aujourd'hui */}
                <div className="w-full max-w-sm p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut déclaré</span>
                  <div className="flex items-center justify-center gap-2.5">
                    <span className={`w-3 h-3 rounded-full ${
                      todayStatus === 'Travail' ? 'bg-indigo-500' :
                      todayStatus === 'CP' ? 'bg-emerald-500' :
                      todayStatus === 'RTT' ? 'bg-orange-500' :
                      todayStatus === 'Arrêt maladie' || todayStatus === 'Maladie' ? 'bg-rose-500' :
                      todayStatus === 'Repos' ? 'bg-slate-400' : 'bg-slate-300'
                    }`} />
                    <span className="text-base font-bold text-slate-700">
                      {todayStatus ? (
                        todayStatus === 'Travail' ? 'Travail' :
                        todayStatus === 'CP' ? 'Congés Payés' :
                        todayStatus === 'RTT' ? 'RTT' :
                        todayStatus === 'Arrêt maladie' || todayStatus === 'Maladie' ? 'Arrêt maladie' : 'Repos'
                      ) : 'Non déclaré / Non travaillé'}
                    </span>
                  </div>
                </div>

                {/* Liste déroulante */}
                <div className="w-full max-w-sm flex flex-col gap-2 text-left">
                  <label htmlFor="today-status" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Choisir le statut pour aujourd'hui
                  </label>
                  <select
                    id="today-status"
                    value={todayStatus || ''}
                    onChange={(e) => handleTodayStatusChange(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-400 transition-all cursor-pointer shadow-xs"
                  >
                    <option value="">-- Non déclaré / Réinitialiser --</option>
                    <option value="Travail">💼 Jour de Travail</option>
                    <option value="CP">🌴 Congés Payés (CP)</option>
                    <option value="RTT">⏰ RTT</option>
                    <option value="Arrêt maladie">🩺 Arrêt maladie</option>
                    <option value="Repos">🏠 Jour de Repos / Non travaillé</option>
                  </select>
                </div>

                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                  La sélection du statut pour la journée en cours met instantanément à jour l'ensemble de vos compteurs de forfait annuel.
                </p>
              </div>

              {/* Indicateurs (Jours Travaillés, Jours Restants, CP, RTT) placés sous l'encadré */}
              <StatsCard 
                stats={statsAnnuel} 
                annee={anneeSelectionnee} 
                onOpenCPModal={() => setAfficherModalCP(true)} 
                onOpenRTTModal={() => setAfficherModalRTT(true)}
              />
            </div>
          ) : vueMode === 'annuelle' ? (
            <div className="flex flex-col gap-4">
              {/* Sélecteur d'année pour la Vue Annuelle */}
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Année d'affichage :
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAnneeSelectionnee((prev) => prev - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Année précédente"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <select
                    value={anneeSelectionnee}
                    onChange={(e) => setAnneeSelectionnee(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    {[2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setAnneeSelectionnee((prev) => prev + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Année suivante"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Encadré Règles & Conseils */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-xs flex flex-col gap-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <Info className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Règles & Conseils
                  </h4>
                </div>
                <div className="text-xs text-slate-600 flex flex-col gap-2 leading-relaxed">
                  <p>
                    • <span className="font-semibold text-slate-800">Forfait 218 jours :</span> Le nombre de jours travaillés est comptabilisé sur l'année <span className="font-semibold text-slate-800">{anneeSelectionnee}</span>.
                  </p>
                  <p>
                    • <span className="font-semibold text-slate-800">Saisie directe :</span> Cliquez sur n'importe quel jour du calendrier annuel pour en déclarer ou modifier le statut.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-600 text-white">
                      💼 Travail
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-600 text-white">
                      🌴 CP
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-500 text-white">
                      ⏰ RTT
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-600 text-white">
                      🩺 Arrêt maladie
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-400 text-white">
                      🏠 Repos
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
                      🇫🇷 Férié
                    </span>
                  </div>
                </div>
              </div>

              <YearlyCalendar 
                annee={anneeSelectionnee} 
                joursLogs={joursLogs} 
                onSelectDay={handleSelectDay} 
              />
            </div>
          ) : vueMode === 'mensuelle' ? (
            <div className="flex flex-col gap-6">
              <MonthlyCalendar
                annee={anneeSelectionnee}
                mois={moisSelectionne}
                joursLogs={joursLogs}
                onSelectDay={handleSelectDay}
                onNavigateMonth={handleNavigateMonth}
                onApplyBatchStatus={handleApplyBatchStatus}
                selectedBatchStatutProp={statutBatchSelectionne}
              />
              <StatsCard 
                stats={statsAnnuel} 
                annee={anneeSelectionnee} 
                onOpenCPModal={() => setAfficherModalCP(true)} 
                onOpenRTTModal={() => setAfficherModalRTT(true)}
              />
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 shadow-xs max-w-xl mx-auto my-4 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-150">
              {/* Header de la page */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-800 text-lg">
                    {pageParametres === 'menu' ? "Paramètres de l'application" : 
                     pageParametres === 'contrat' ? "Paramètres - Renseignement" : 
                     pageParametres === 'sauvegarde' ? "Paramètres - Sauvegarde et import" :
                     pageParametres === 'historique' ? "Paramètres - Liste des sauvegardes" :
                     "Paramètres - Réinitialisation"}
                  </h3>
                </div>
                {pageParametres !== 'menu' && (
                  <button
                    onClick={() => setPageParametres('menu')}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Retour</span>
                  </button>
                )}
              </div>

              {pageParametres === 'menu' ? (
                <div className="flex flex-col gap-4">
                  <p className="text-xs text-slate-500 leading-normal">
                    Sélectionnez une option de configuration ci-dessous :
                  </p>
                  
                  {/* Champ cliquable Renseignement */}
                  <div
                    onClick={() => setPageParametres('contrat')}
                    className="cursor-pointer hover:bg-slate-50/80 border border-slate-200 rounded-xl p-5 flex items-center justify-between transition-all group active:scale-[0.99] bg-white shadow-xs animate-in fade-in duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-slate-800">Renseignement</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Saisir ou modifier la date de début de votre contrat</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>

                  {/* Champ cliquable Sauvegarde et import */}
                  <div
                    onClick={() => setPageParametres('sauvegarde')}
                    className="cursor-pointer hover:bg-slate-50/80 border border-slate-200 rounded-xl p-5 flex items-center justify-between transition-all group active:scale-[0.99] bg-white shadow-xs animate-in fade-in duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                        <Download className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-slate-800">Sauvegarde et import</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Exporter ou importer votre fichier de suivi Excel</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>

                  {/* Champ cliquable Liste des sauvegardes */}
                  <div
                    onClick={() => setPageParametres('historique')}
                    className="cursor-pointer hover:bg-slate-50/80 border border-slate-200 rounded-xl p-5 flex items-center justify-between transition-all group active:scale-[0.99] bg-white shadow-xs animate-in fade-in duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                        <History className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-slate-800">Liste des sauvegardes</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Historique daté de vos exports et sauvegardes Excel</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>

                  {/* Champ cliquable Réinitialisation */}
                  <div
                    onClick={() => setPageParametres('reinitialisation')}
                    className="cursor-pointer hover:bg-slate-50/80 border border-slate-200 rounded-xl p-5 flex items-center justify-between transition-all group active:scale-[0.99] bg-white shadow-xs animate-in fade-in duration-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600 group-hover:bg-rose-100 transition-colors">
                        <Trash2 className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-slate-800">Réinitialisation</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Réinitialiser les données et paramètres de l'application</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              ) : pageParametres === 'contrat' ? (
                <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="date-debut-contrat" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Date de début du contrat
                    </label>
                    <input
                      id="date-debut-contrat"
                      type="date"
                      value={dateDebutContrat}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDateDebutContrat(val);
                        localStorage.setItem('date_debut_contrat', val);
                        if (val) {
                          const nouvellesDonnees = { ...joursLogs };
                          let aModifie = false;
                          Object.keys(nouvellesDonnees).forEach((key) => {
                            if (key < val) {
                              delete nouvellesDonnees[key];
                              aModifie = true;
                            }
                          });
                          if (aModifie) {
                            sauvegarderDonnees(nouvellesDonnees);
                            ajouterNotification('info', "Les statuts antérieurs à la date de début de contrat ont été supprimés.");
                          }
                        }
                      }}
                      className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-400 transition-all cursor-pointer shadow-xs"
                    />
                    <p className="text-xs text-slate-400 leading-normal">
                      Indiquez la date officielle de démarrage de votre contrat de travail pour affichage et calculs internes.
                    </p>
                  </div>

                  {dateDebutContrat && (
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-800 flex flex-col gap-2">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <div>
                          Votre contrat est actif depuis le <span className="font-bold">
                            {new Date(dateDebutContrat).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>.
                        </div>
                      </div>
                      <div className="pl-8 text-indigo-700 leading-normal">
                        Forfait calculé au prorata pour {anneeSelectionnee} : <span className="font-bold text-indigo-950">{statsAnnuel.forfaitAnnee ?? 218} jours</span> (Calcul : 218 x jours restants jusqu'au 31 déc. / 365).
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      onClick={() => {
                        ajouterNotification('success', "Paramètres enregistrés.");
                        setPageParametres('menu');
                      }}
                      className="px-5 py-2.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                    >
                      Enregistrer et Retourner
                    </button>
                  </div>
                </div>
              ) : pageParametres === 'sauvegarde' ? (
                <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                  <p className="text-xs text-slate-500 leading-normal">
                    Gérez la sauvegarde de vos journées de forfait en exportant vos données ou en chargeant un fichier existant :
                  </p>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Encadré d'exportation */}
                    <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col gap-4">
                      <div className="flex items-center gap-2.5 text-slate-800">
                        <Download className="h-5 w-5 text-indigo-600" />
                        <h4 className="text-sm font-bold">Exporter vos données</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-normal">
                        Générez un fichier Excel (.xlsx) contenant l'ensemble de votre suivi. Idéal pour conserver vos sauvegardes hors ligne.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={handleExportExcel}
                          className="flex items-center gap-2 py-2 px-3 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                          title={`Exporter l'année ${anneeSelectionnee}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Exporter l'année {anneeSelectionnee}</span>
                        </button>
                        <button
                          onClick={handleExportCompletExcel}
                          className="flex items-center gap-2 py-2 px-3 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                          title="Exporter toutes les années"
                        >
                          <Download className="h-3.5 w-3.5 text-slate-400" />
                          <span>Exporter toutes les années</span>
                        </button>
                      </div>
                    </div>

                    {/* Encadré d'importation */}
                    <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col gap-4">
                      <div className="flex items-center gap-2.5 text-slate-800">
                        <Upload className="h-5 w-5 text-indigo-600" />
                        <h4 className="text-sm font-bold">Importer un fichier Excel</h4>
                      </div>
                      <p className="text-xs text-slate-500 leading-normal">
                        Restaurez ou fusionnez vos journées depuis un fichier Excel précédemment exporté.
                      </p>
                      <div className="pt-1">
                        <button
                          onClick={triggerFileInput}
                          className="flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                        >
                          <Upload className="h-3.5 w-3.5 text-slate-500" />
                          <span>Sélectionner le fichier Excel</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setPageParametres('menu')}
                      className="px-5 py-2.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                    >
                      Retour aux paramètres
                    </button>
                  </div>
                </div>
              ) : pageParametres === 'historique' ? (
                <div className="flex flex-col gap-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 leading-normal">
                      Consultez la liste et la date précise de l'ensemble de vos sauvegardes et exports Excel effectués :
                    </p>
                  </div>

                  {/* Action rapide pour déclencher une sauvegarde complète */}
                  <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0">
                        <Save className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Effectuer une sauvegarde maintenant</h4>
                        <p className="text-[11px] text-slate-500">Génère et télécharge le fichier Excel complet</p>
                      </div>
                    </div>
                    <button
                      onClick={handleExportCompletExcel}
                      className="px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-lg transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Télécharger Excel</span>
                    </button>
                  </div>

                  {/* Liste des sauvegardes */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Historique des sauvegardes ({historiqueSauvegardes.length})
                      </h4>
                      {historiqueSauvegardes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Êtes-vous sûr de vouloir effacer l'historique des sauvegardes ?")) {
                              setHistoriqueSauvegardes([]);
                              localStorage.removeItem('historique_sauvegardes_v1');
                              ajouterNotification('info', "L'historique des sauvegardes a été effacé.");
                            }
                          }}
                          className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          Effacer la liste
                        </button>
                      )}
                    </div>

                    {historiqueSauvegardes.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center gap-2 bg-slate-50/50">
                        <History className="h-8 w-8 text-slate-300" />
                        <p className="text-xs font-semibold text-slate-600">Aucune sauvegarde enregistrée pour le moment.</p>
                        <p className="text-[11px] text-slate-400 max-w-sm">
                          Vos exports Excel et vos sauvegardes du vendredi apparaîtront automatiquement ici avec leur date et leur heure.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                        {historiqueSauvegardes.map((sauvegarde) => (
                          <div
                            key={sauvegarde.id}
                            className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/80 transition-all flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2 rounded-lg shrink-0 ${sauvegarde.type === 'complet' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                <FileSpreadsheet className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800 capitalize">
                                    {sauvegarde.dateFormatee}
                                  </span>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    sauvegarde.type === 'complet' ? 'bg-emerald-100/80 text-emerald-800' : 'bg-indigo-100/80 text-indigo-800'
                                  }`}>
                                    {sauvegarde.type === 'complet' ? 'Sauvegarde complète' : `Année ${sauvegarde.annee || ''}`}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  Fichier : <span className="font-mono text-slate-600">{sauvegarde.nomFichier}</span> ({sauvegarde.nombreJours} jour(s) suivis)
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (sauvegarde.type === 'complet') {
                                  handleExportCompletExcel();
                                } else {
                                  handleExportExcel();
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Télécharger à nouveau"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setPageParametres('menu')}
                      className="px-5 py-2.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                    >
                      Retour aux paramètres
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                  <p className="text-xs text-slate-500 leading-normal">
                    La réinitialisation effacera l'ensemble de vos journées déclarées et vos paramètres sauvegardés sur cet appareil.
                  </p>

                  <div className="border border-rose-100 rounded-xl p-5 bg-rose-50/50 flex flex-col gap-4">
                    <div className="flex items-center gap-2.5 text-rose-900">
                      <AlertCircle className="h-5 w-5 text-rose-600" />
                      <h4 className="text-sm font-bold">Zone de réinitialisation</h4>
                    </div>
                    <p className="text-xs text-rose-700 leading-normal">
                      Attention : cette action supprimera définitivement vos saisies locales. Pensez à exporter vos données Excel au préalable si vous souhaitez conserver une copie.
                    </p>
                    <div className="pt-1">
                      <button
                        onClick={() => setAfficherModalReinitialiser(true)}
                        className="flex items-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Réinitialiser l'application</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setPageParametres('menu')}
                      className="px-5 py-2.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                    >
                      Retour aux paramètres
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- GRAPHIQUE, RÉPARTITION ET INDICATEURS EN BAS --- */}
        {vueMode === 'annuelle' && (
          <div className="flex flex-col gap-6 w-full mt-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-start">
              
              {/* Graphique Recharts */}
              <div className="lg:col-span-2">
                <MonthStatsChart annee={anneeSelectionnee} joursLogs={joursLogs} />
              </div>

              {/* Guide des légendes & Conseils */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs flex flex-col gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Règles & Conseils</h3>
                  <p className="text-xs text-slate-400">Forfait annuel des cadres autonomes</p>
                </div>
                
                <div className="flex flex-col gap-3.5 text-xs text-slate-600">
                  <div className="flex gap-2.5 items-start">
                    <div className="w-5 h-5 rounded-md bg-indigo-500 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-700">Jours Travaillés (Forfait 218 j.)</p>
                      <p className="text-slate-400 leading-normal mt-0.5">Le forfait légal standard de 218 jours correspond aux jours réels travaillés, déductions faites des CP, RTT et repos.</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2.5 items-start">
                    <div className="w-5 h-5 rounded-md bg-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-700">Congés Payés (CP)</p>
                      <p className="text-slate-400 leading-normal mt-0.5">Généralement de 25 jours par an. Ces jours ne s'imputent pas sur les 218 jours de travail du forfait.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <div className="w-5 h-5 rounded-md bg-orange-500 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-700">RTT (Réduction Temps de Travail)</p>
                      <p className="text-slate-400 leading-normal mt-0.5">Calculés chaque année pour garantir le respect de la limite des 218 jours, selon les aléas du calendrier.</p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <div className="w-5 h-5 rounded-md bg-slate-400 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-700">Repos & Jours fériés</p>
                      <p className="text-slate-400 leading-normal mt-0.5">Les jours de repos hebdomadaire (week-end) et jours fériés chômés non travaillés.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-50 pt-4 flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                    Astuce Excel
                  </span>
                  <button
                    onClick={handleExportCompletExcel}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-bold hover:underline transition-colors cursor-pointer"
                  >
                    Exporter toutes les années →
                  </button>
                </div>
              </div>

            </div>

            {/* Les 6 indicateurs placés en bas de la page sous la Répartition Mensuelle */}
            <StatsCard stats={statsAnnuel} annee={anneeSelectionnee} />
          </div>
        )}



      </main>
      </div>

      {/* --- NOTIFICATION TOAST OVERLAY --- */}
      <Notification notifications={notifications} onDismiss={dismisseNotification} />

      {/* --- MODAL DE SELECTION DE STATUT DU JOUR --- */}
      <DayStatusModal
        isOpen={jourCible !== null}
        dateStr={jourCible}
        currentStatut={jourCible ? joursLogs[jourCible]?.statut : undefined}
        onClose={() => setJourCible(null)}
        onChangeStatut={handleChangeStatut}
      />

      {/* --- MODAL DE VALIDATION DE RÉINITIALISATION --- */}
      {afficherModalReinitialiser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-rose-50">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-bold text-base">Confirmer la réinitialisation</h3>
              </div>
              <button 
                onClick={() => setAfficherModalReinitialiser(false)}
                className="p-1 hover:bg-rose-100 rounded-full transition-colors cursor-pointer text-rose-400 hover:text-rose-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 flex flex-col gap-3 text-slate-700 text-sm">
              <p className="font-semibold">Voulez-vous vraiment réinitialiser toutes les données de l'application ?</p>
              <p className="text-xs text-slate-500 leading-normal">
                Toutes vos journées de forfait enregistrées ainsi que vos préférences seront définitivement effacées. Cette action est irréversible.
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setAfficherModalReinitialiser(false)}
                className="px-4 py-2 text-xs font-bold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setJoursLogs({});
                  localStorage.removeItem('suivi_forfait_jours_v1');
                  localStorage.removeItem('date_debut_contrat');
                  setDateDebutContrat('');
                  setAfficherModalReinitialiser(false);
                  setPageParametres('menu');
                  ajouterNotification('success', "L'application a été réinitialisée avec succès.");
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Confirmer la réinitialisation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL OBLIGATOIRE DE SAISIE DE DATE DE DÉBUT DE CONTRAT --- */}
      {!dateDebutContrat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 p-5 border-b border-slate-100 bg-indigo-50/80">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-xs">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Date de début du contrat requise</h3>
                <p className="text-[11px] text-slate-500 font-medium">⚙️ Paramètres - Renseignement</p>
              </div>
            </div>

            {/* Body Form */}
            <form onSubmit={handleValiderDateDebutContratObligatoire} className="p-6 flex flex-col gap-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Pour utiliser l'application et calculer vos compteurs Forfait Jours, vous devez obligatoirement indiquer la <span className="font-bold text-slate-800">date de début de votre contrat</span>.
              </p>

              <div className="flex flex-col gap-2 pt-1">
                <label htmlFor="modal-date-debut-contrat" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Date de début du contrat <span className="text-rose-500">*</span>
                </label>
                <input
                  id="modal-date-debut-contrat"
                  type="date"
                  required
                  value={dateContratObligatoireSaisie}
                  onChange={(e) => setDateContratObligatoireSaisie(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-300 text-slate-800 font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-slate-400 transition-all cursor-pointer shadow-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!dateContratObligatoireSaisie}
                  className="w-full py-3 px-5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  <span>Valider et accéder à l'application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL LISTE DES DATES CONGÉS PAYÉS (CP) --- */}
      {afficherModalCP && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-emerald-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-xs">
                  <Palmtree className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Congés Payés (CP) - {anneeSelectionnee}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {datesCPAnnee.length} jour{datesCPAnnee.length > 1 ? 's' : ''} enregistré{datesCPAnnee.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAfficherModalCP(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-3">
              {datesCPAnnee.length === 0 ? (
                <div className="text-center py-8 text-slate-500 flex flex-col items-center gap-2">
                  <Palmtree className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-semibold">Aucun congé payé (CP) enregistré pour l'année {anneeSelectionnee}.</p>
                  <p className="text-xs text-slate-400">Sélectionnez des jours dans le calendrier et attribuez-leur le statut CP pour qu'ils apparaissent ici.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {datesCPAnnee.map((dateStr) => {
                    const dateObj = new Date(dateStr + 'T00:00:00');
                    const dateFormatee = dateObj.toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          const [y, m] = dateStr.split('-').map(Number);
                          setAnneeSelectionnee(y);
                          setMoisSelectionne(m);
                          setAfficherModalCP(false);
                          changerOngletMode('mensuelle');
                        }}
                        className="flex items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all shadow-2xs text-left cursor-pointer group"
                        title="Voir dans la vue mensuelle"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs font-semibold capitalize">{dateFormatee}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatutBatchSelectionne('CP');
                  setAfficherModalCP(false);
                  changerOngletMode('mensuelle');
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <Palmtree className="h-4 w-4" />
                Programmer CP
              </button>
              <button
                type="button"
                onClick={() => setAfficherModalCP(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL LISTE DES DATES RTT POSÉS --- */}
      {afficherModalRTT && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-orange-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500 rounded-xl text-white shadow-xs">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">RTT Posés - {anneeSelectionnee}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {datesRTTAnnee.length} jour{datesRTTAnnee.length > 1 ? 's' : ''} enregistré{datesRTTAnnee.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAfficherModalRTT(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-3">
              {datesRTTAnnee.length === 0 ? (
                <div className="text-center py-8 text-slate-500 flex flex-col items-center gap-2">
                  <Clock className="h-10 w-10 text-slate-300" />
                  <p className="text-sm font-semibold">Aucun jour de RTT enregistré pour l'année {anneeSelectionnee}.</p>
                  <p className="text-xs text-slate-400">Sélectionnez des jours dans le calendrier et attribuez-leur le statut RTT pour qu'ils apparaissent ici.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {datesRTTAnnee.map((dateStr) => {
                    const dateObj = new Date(dateStr + 'T00:00:00');
                    const dateFormatee = dateObj.toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          const [y, m] = dateStr.split('-').map(Number);
                          setAnneeSelectionnee(y);
                          setMoisSelectionne(m);
                          setAfficherModalRTT(false);
                          changerOngletMode('mensuelle');
                        }}
                        className="flex items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-orange-50/60 hover:border-orange-300 transition-all shadow-2xs text-left cursor-pointer group"
                        title="Voir dans la vue mensuelle"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
                          <span className="text-xs font-semibold capitalize">{dateFormatee}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-orange-600 transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatutBatchSelectionne('RTT');
                  setAfficherModalRTT(false);
                  changerOngletMode('mensuelle');
                }}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Programmer RTT
              </button>
              <button
                type="button"
                onClick={() => setAfficherModalRTT(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL RAPPEL DE SAUVEGARDE DU VENDREDI --- */}
      {afficherModalRappelVendredi && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-indigo-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-xs">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Sauvegarde du vendredi</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Sécurisez vos données hebdomadaires
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAfficherModalRappelVendredi(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4 text-center items-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                <Save className="h-7 w-7" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h4 className="text-sm font-bold text-slate-800">
                  C'est vendredi ! Pensez à sauvegarder votre suivi
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Téléchargez votre fichier Excel complet pour garder une copie sécurisée de toutes vos journées déclarées cette semaine.
                </p>
              </div>

              <div className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-left flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-normal">
                  Une fois la sauvegarde téléchargée, ce rappel ne s'affichera plus aujourd'hui et réapparaîtra vendredi prochain.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setAfficherModalRappelVendredi(false)}
                className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
              >
                Plus tard
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExportCompletExcel();
                  setAfficherModalRappelVendredi(false);
                }}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span>Sauvegarder et Télécharger</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BARRE D'ONGLETS FIXE EN BAS (SMARTPHONE / MOBILE) --- */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1.5 flex justify-around items-center shadow-lg">
        <button
          onClick={() => changerOngletMode('accueil')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            vueMode === 'accueil' ? 'text-indigo-600 bg-indigo-50/80' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="text-base leading-none">🏠</span>
          <span className="text-[10px]">Accueil</span>
        </button>

        <button
          onClick={() => changerOngletMode('annuelle')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            vueMode === 'annuelle' ? 'text-indigo-600 bg-indigo-50/80' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="text-base leading-none">📅</span>
          <span className="text-[10px]">Annuelle</span>
        </button>

        <button
          onClick={() => changerOngletMode('mensuelle')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            vueMode === 'mensuelle' ? 'text-indigo-600 bg-indigo-50/80' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="text-base leading-none">📆</span>
          <span className="text-[10px]">Mensuelle</span>
        </button>

        <button
          onClick={() => changerOngletMode('parametres')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            vueMode === 'parametres' ? 'text-indigo-600 bg-indigo-50/80' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="text-base leading-none">⚙️</span>
          <span className="text-[10px]">Paramètres</span>
        </button>
      </nav>

    </div>
  );
}

