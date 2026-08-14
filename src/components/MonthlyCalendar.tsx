import React from 'react';
import { ChevronLeft, ChevronRight, Briefcase, Palmtree, Clock, Calendar, Check, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Jour, StatutJour } from '../types';
import { getHolidayName } from '../utils/holidays';

interface MonthlyCalendarProps {
  annee: number;
  mois: number; // 1 à 12
  joursLogs: Record<string, Jour>;
  onSelectDay: (dateStr: string) => void;
  onNavigateMonth: (direction: 'prev' | 'next') => void;
  onApplyBatchStatus?: (dateStrings: string[], statut: StatutJour | null) => void;
}

const NOMS_MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const JOURS_SEMAINE_COMPLETS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const JOURS_SEMAINE_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function MonthlyCalendar({
  annee,
  mois,
  joursLogs,
  onSelectDay,
  onNavigateMonth,
  onApplyBatchStatus,
}: MonthlyCalendarProps) {

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    const day = new Date(year, month - 1, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const isWeekend = (year: number, month: number, day: number) => {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  // Fonction pour calculer le numéro de semaine dans l'année (norme ISO-8601)
  const getISOWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Calcul des semaines du mois
  const weeksInMonth = React.useMemo(() => {
    const daysInMonth = new Date(annee, mois, 0).getDate();
    const weeks: { id: number; label: string; daysAll: string[]; daysWorkOnly: string[] }[] = [];

    let currentDaysAll: string[] = [];
    let currentDaysWork: string[] = [];
    let weekIndex = 1;

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(annee, mois - 1, day);
      const dayOfWeek = d.getDay(); // 0 = Dim, 1 = Lun, ..., 6 = Sam
      const dateStr = `${annee}-${String(mois).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      currentDaysAll.push(dateStr);
      const isHoliday = !!getHolidayName(dateStr);
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday) {
        currentDaysWork.push(dateStr);
      }

      if (dayOfWeek === 0 || day === daysInMonth) {
        const firstDay = parseInt(currentDaysAll[0].split('-')[2], 10);
        const lastDay = parseInt(currentDaysAll[currentDaysAll.length - 1].split('-')[2], 10);
        const monthName = NOMS_MOIS[mois - 1].toLowerCase();

        // Calcul du numéro de semaine dans l'année
        const sampleDate = new Date(annee, mois - 1, firstDay);
        const numSemaineAnnee = getISOWeekNumber(sampleDate);

        weeks.push({
          id: weekIndex,
          label: `Semaine ${numSemaineAnnee} (du ${firstDay} au ${lastDay} ${monthName})`,
          daysAll: [...currentDaysAll],
          daysWorkOnly: [...currentDaysWork],
        });

        currentDaysAll = [];
        currentDaysWork = [];
        weekIndex++;
      }
    }

    return weeks;
  }, [annee, mois]);

  const [selectedWeekId, setSelectedWeekId] = React.useState<number>(1);
  const [selectedBatchStatut, setSelectedBatchStatut] = React.useState<string>('Travail');
  const [workDaysOnly, setWorkDaysOnly] = React.useState<boolean>(true);
  const [selectedWeekDays, setSelectedWeekDays] = React.useState<string[]>([]);
  const [showDaysToInclude, setShowDaysToInclude] = React.useState<boolean>(false);

  const targetWeek = React.useMemo(() => {
    return weeksInMonth.find((w) => w.id === Number(selectedWeekId)) || weeksInMonth[0];
  }, [weeksInMonth, selectedWeekId]);

  React.useEffect(() => {
    if (selectedWeekId > weeksInMonth.length) {
      setSelectedWeekId(1);
    }
  }, [weeksInMonth, selectedWeekId]);

  // Synchroniser les jours sélectionnés lors du changement de semaine ou du filtre jours ouvrés
  React.useEffect(() => {
    if (!targetWeek) return;
    if (workDaysOnly) {
      setSelectedWeekDays(targetWeek.daysWorkOnly);
    } else {
      const allNonHolidays = targetWeek.daysAll.filter((dateStr) => !getHolidayName(dateStr));
      setSelectedWeekDays(allNonHolidays);
    }
  }, [targetWeek, workDaysOnly]);

  const toggleWeekDay = (dateStr: string) => {
    if (getHolidayName(dateStr)) return; // Jour férié désactivé
    setSelectedWeekDays((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleValidateWeekStatus = () => {
    if (!targetWeek || !onApplyBatchStatus) return;
    if (selectedWeekDays.length === 0) return;

    const statutToApply = selectedBatchStatut === '' ? null : (selectedBatchStatut as StatutJour);
    onApplyBatchStatus(selectedWeekDays, statutToApply);
  };

  // Calculer les statistiques pour le mois affiché
  const statsMois = React.useMemo(() => {
    let travail = 0;
    let cp = 0;
    let rtt = 0;
    let feries = 0;

    const daysInMonth = getDaysInMonth(annee, mois);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${annee}-${String(mois).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (getHolidayName(dateStr)) {
        feries++;
      }
    }

    const prefix = `${annee}-${String(mois).padStart(2, '0')}-`;
    Object.keys(joursLogs).forEach((key) => {
      if (key.startsWith(prefix)) {
        const log = joursLogs[key];
        if (log.statut === 'Travail') travail++;
        else if (log.statut === 'CP') cp++;
        else if (log.statut === 'RTT') rtt++;
      }
    });

    return { travail, cp, rtt, feries };
  }, [annee, mois, joursLogs]);

  // Styles de statut pour la vue détaillée
  const getStatutDetails = (dateStr: string) => {
    const log = joursLogs[dateStr];
    if (!log) return null;

    switch (log.statut) {
      case 'Travail':
        return {
          label: 'Travail',
          badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
          cellClass: 'bg-indigo-600 text-white font-bold border-indigo-600 sm:bg-indigo-50/50 sm:text-slate-800 sm:border-indigo-300 sm:hover:bg-indigo-50',
          indicator: 'bg-indigo-600',
        };
      case 'CP':
        return {
          label: 'CP',
          badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          cellClass: 'bg-emerald-600 text-white font-bold border-emerald-600 sm:bg-emerald-50/40 sm:text-slate-800 sm:border-emerald-300 sm:hover:bg-emerald-50',
          indicator: 'bg-emerald-600',
        };
      case 'RTT':
        return {
          label: 'RTT',
          badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
          cellClass: 'bg-orange-500 text-white font-bold border-orange-500 sm:bg-orange-50/40 sm:text-slate-800 sm:border-orange-300 sm:hover:bg-orange-50',
          indicator: 'bg-orange-500',
        };
      case 'Repos':
        return {
          label: 'Repos',
          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
          cellClass: 'bg-slate-400 text-white font-bold border-slate-400 sm:bg-slate-50/60 sm:text-slate-800 sm:border-slate-300 sm:hover:bg-slate-100/80',
          indicator: 'bg-slate-500',
        };
    }
  };

  const totalJours = getDaysInMonth(annee, mois);
  const premierJour = getFirstDayOfWeek(annee, mois);
  const gridCells: React.ReactNode[] = [];

  // Cellules vides de début
  for (let i = 0; i < premierJour; i++) {
    gridCells.push(
      <div 
        key={`empty-${i}`} 
        className="aspect-square sm:aspect-auto sm:min-h-[110px] bg-slate-50/20 border border-slate-100 rounded-lg sm:rounded-xl" 
      />
    );
  }

  // Cellules réelles du mois
  for (let day = 1; day <= totalJours; day++) {
    const dateStr = `${annee}-${String(mois).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isWE = isWeekend(annee, mois, day);
    const details = getStatutDetails(dateStr);
    const holidayName = getHolidayName(dateStr);

    const cellStyle = details 
      ? details.cellClass + ' shadow-xs' 
      : holidayName
        ? 'bg-red-100 text-red-900 border-red-300 font-bold sm:bg-red-50/70 sm:border-red-200 sm:text-slate-800 sm:hover:bg-red-100/70'
        : isWE
          ? 'bg-slate-100 text-slate-400 border-slate-200/60 sm:bg-slate-100/40 sm:border-slate-100 sm:text-slate-400 sm:hover:bg-slate-100 sm:hover:border-slate-300'
          : 'bg-white border-slate-200 text-slate-800 sm:hover:border-slate-300 sm:hover:bg-slate-50/50';

    gridCells.push(
      <button
        key={`day-${day}`}
        onClick={() => onSelectDay(dateStr)}
        className={`aspect-square sm:aspect-auto sm:min-h-[110px] p-1 sm:p-2.5 rounded-lg sm:rounded-xl border transition-all group cursor-pointer flex flex-col justify-center sm:justify-between items-center sm:items-stretch text-center sm:text-left ${cellStyle}`}
        title={`${day} ${NOMS_MOIS[mois - 1]} ${annee}${holidayName ? ` - Jour Férié: ${holidayName}` : ''}${details ? ` - ${details.label}` : ''}`}
      >
        {/* Affichage Mobile (Smartphone) : uniquement numéro + couleur (sans texte qui chevauche) */}
        <div className="flex sm:hidden flex-col items-center justify-center w-full h-full">
          <span className="text-xs font-bold leading-none">{day}</span>
          {details ? (
            <span className="w-1 h-1 rounded-full bg-white/80 mt-1" />
          ) : holidayName ? (
            <span className="w-1 h-1 rounded-full bg-red-600 mt-1" />
          ) : null}
        </div>

        {/* Affichage Desktop (Ordinateur) : détails complets avec badges texte */}
        <div className="hidden sm:flex flex-col justify-between h-full w-full">
          <div className="flex justify-between items-start w-full gap-1">
            <span className={`text-sm sm:text-base font-bold ${details ? 'text-slate-800' : isWE ? 'text-slate-400' : 'text-slate-700'}`}>
              {day}
            </span>
            {holidayName && (
              <span className="text-[10px] font-bold text-red-700 bg-red-100/80 border border-red-300/80 px-1.5 py-0.5 rounded-md truncate max-w-[85px] sm:max-w-[110px]" title={holidayName}>
                🇫🇷 {holidayName}
              </span>
            )}
          </div>
          
          {details ? (
            <span className={`self-end text-[10px] sm:text-xs px-2 py-0.5 rounded-full border ${details.badgeClass} flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${details.indicator}`} />
              {details.label}
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 group-hover:text-slate-600 opacity-0 group-hover:opacity-100 self-end transition-opacity">
              + Déclarer
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Header avec Navigation et mini Statistiques du mois */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        
        {/* Navigation mois */}
        <div className="flex items-center justify-between lg:justify-start gap-4">
          <button
            onClick={() => onNavigateMonth('prev')}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center lg:text-left min-w-[140px]">
            <h3 className="font-bold text-slate-800 text-lg capitalize">
              {NOMS_MOIS[mois - 1]} {annee}
            </h3>
          </div>
          <button
            onClick={() => onNavigateMonth('next')}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Stats rapides du mois en cours */}
        <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 text-center text-xs text-slate-600 max-w-lg w-full">
          <div className="flex flex-col items-center justify-center py-1">
            <span className="font-bold text-indigo-600 text-sm">{statsMois.travail} j.</span>
            <span className="text-[10px] text-slate-400">Travail</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1">
            <span className="font-bold text-emerald-600 text-sm">{statsMois.cp} j.</span>
            <span className="text-[10px] text-slate-400">CP</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1">
            <span className="font-bold text-orange-600 text-sm">{statsMois.rtt} j.</span>
            <span className="text-[10px] text-slate-400">RTT</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1">
            <span className="font-bold text-red-600 text-sm">{statsMois.feries} j.</span>
            <span className="text-[10px] text-slate-400">Fériés</span>
          </div>
        </div>
      </div>

      {/* Encadré d'attribution par semaine */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-xs flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Attribution d'un statut par semaine
          </h4>
        </div>

        {/* Aligner Choisir la semaine, Statut à appliquer et Valider la semaine sur la même ligne */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Sélection de la semaine */}
          <div className="md:col-span-5 flex flex-col gap-1.5 text-left">
            <label htmlFor="select-week" className="text-xs font-semibold text-slate-500">
              Choisir la semaine
            </label>
            <select
              id="select-week"
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              {weeksInMonth.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sélection du statut */}
          <div className="md:col-span-4 flex flex-col gap-1.5 text-left">
            <label htmlFor="select-week-statut" className="text-xs font-semibold text-slate-500">
              Statut à appliquer
            </label>
            <select
              id="select-week-statut"
              value={selectedBatchStatut}
              onChange={(e) => setSelectedBatchStatut(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              <option value="Travail">💼 Jour de Travail</option>
              <option value="CP">🌴 Congés Payés (CP)</option>
              <option value="RTT">⏰ RTT</option>
              <option value="Repos">🏠 Repos / Non travaillé</option>
              <option value="">-- Réinitialiser / Non déclaré --</option>
            </select>
          </div>

          {/* Bouton Valider */}
          <div className="md:col-span-3">
            <button
              onClick={handleValidateWeekStatus}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              Valider la semaine
            </button>
          </div>
        </div>

        {/* Encadré sous "Choisir la semaine" et "Statut à appliquer" pour les cases à cocher des jours */}
        {targetWeek && (
          <div className="p-2 sm:p-2.5 bg-slate-50 rounded-lg border border-slate-200 shadow-2xs flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setShowDaysToInclude(!showDaysToInclude)}
              className="flex items-center justify-between w-full text-left cursor-pointer select-none group"
            >
              <span className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                Jours de la semaine à inclure :
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500 font-normal group-hover:text-slate-800 transition-colors">
                {showDaysToInclude ? (
                  <>
                    <span className="hidden sm:inline">Masquer</span>
                    <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Afficher</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                  </>
                )}
              </span>
            </button>

            {showDaysToInclude && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {targetWeek.daysAll.map((dateStr) => {
                  const d = new Date(dateStr);
                  const dayNum = d.getDate();
                  const dayOfWeek = d.getDay(); // 0 = Dim, 1 = Lun, ...
                  const nomsJoursCourts = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                  const nomJour = nomsJoursCourts[dayOfWeek];
                  const holidayName = getHolidayName(dateStr);
                  const isFerie = !!holidayName;
                  const isChecked = selectedWeekDays.includes(dateStr);

                  return (
                    <label
                      key={dateStr}
                      title={isFerie ? `Jour férié : ${holidayName}` : undefined}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] select-none transition-all ${
                        isFerie
                          ? 'bg-red-50 border-red-200 text-red-500 opacity-60 cursor-not-allowed'
                          : isChecked
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold cursor-pointer shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isFerie}
                        onChange={() => toggleWeekDay(dateStr)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span>
                        {nomJour} {dayNum}
                        {isFerie ? ' (Férié)' : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Option jours ouvrés */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="work-days-only"
            checked={workDaysOnly}
            onChange={(e) => setWorkDaysOnly(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
          />
          <label htmlFor="work-days-only" className="text-xs text-slate-600 cursor-pointer select-none">
            Appliquer uniquement aux jours ouvrés (du lundi au vendredi, exclut le week-end et les jours fériés)
          </label>
        </div>
      </div>

      {/* Calendrier de grande taille */}
      <div className="bg-white border border-slate-100 rounded-xl p-3 sm:p-5 shadow-xs">
        
        {/* Noms de la semaine */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2 sm:mb-3">
          {/* Desktop header */}
          {JOURS_SEMAINE_COMPLETS.map((j, i) => (
            <div key={`desktop-${i}`} className="hidden sm:block text-xs font-bold text-slate-400 select-none py-1">
              {j}
            </div>
          ))}
          {/* Mobile header (L, M, M, J, V, S, D comme dans la vue annuelle) */}
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((j, i) => (
            <div key={`mobile-${i}`} className="block sm:hidden text-[10px] font-bold text-slate-400 select-none py-1">
              {j}
            </div>
          ))}
        </div>

        {/* Grille de jours */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {gridCells}
        </div>
      </div>
    </div>
  );
}
