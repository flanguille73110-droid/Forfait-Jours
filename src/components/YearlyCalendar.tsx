import React from 'react';
import { Jour, StatutJour } from '../types';
import { getHolidayName } from '../utils/holidays';

interface YearlyCalendarProps {
  annee: number;
  joursLogs: Record<string, Jour>;
  onSelectDay: (dateStr: string) => void;
}

const NOMS_MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const JOURS_SEMAINE = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function YearlyCalendar({ annee, joursLogs, onSelectDay }: YearlyCalendarProps) {
  
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    const day = new Date(year, month - 1, 1).getDay();
    // Ajustement Lundi = 0, Mardi = 1... Dimanche = 6
    return day === 0 ? 6 : day - 1;
  };

  const isWeekend = (year: number, month: number, day: number) => {
    const d = new Date(year, month - 1, day);
    const dayOfWeek = d.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  // Obtenir la classe couleur pour le jour
  const getDayClass = (dateStr: string, isWE: boolean, holidayName: string | null) => {
    const log = joursLogs[dateStr];
    if (log) {
      switch (log.statut) {
        case 'Travail':
          return 'bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-xs scale-102';
        case 'CP':
          return 'bg-emerald-600 text-white font-semibold hover:bg-emerald-700 shadow-xs scale-102';
        case 'RTT':
          return 'bg-orange-500 text-white font-semibold hover:bg-orange-600 shadow-xs scale-102';
        case 'Arrêt maladie':
        case 'Maladie':
          return 'bg-rose-600 text-white font-semibold hover:bg-rose-700 shadow-xs scale-102';
        case 'Repos':
          return 'bg-slate-400 text-white font-semibold hover:bg-slate-500 shadow-xs scale-102';
      }
    }
    // Jour non déclaré mais Férié
    if (holidayName) {
      return 'bg-red-100 text-red-900 border border-red-300/80 font-bold hover:bg-red-200 shadow-2xs';
    }
    // Jour non déclaré
    if (isWE) {
      return 'bg-slate-100 text-slate-400 border border-transparent hover:bg-slate-200 hover:text-slate-600';
    }
    return 'bg-white border border-slate-100 text-slate-800 hover:bg-slate-50 hover:border-slate-300';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
      {NOMS_MOIS.map((nomMois, indexMois) => {
        const mois = indexMois + 1;
        const totalJours = getDaysInMonth(annee, mois);
        const premierJour = getFirstDayOfWeek(annee, mois);
        
        // Tableau des cellules de la grille du calendrier
        const cells: React.ReactNode[] = [];

        // Remplir les jours vides du début du mois
        for (let i = 0; i < premierJour; i++) {
          cells.push(<div key={`empty-${i}`} className="aspect-square bg-slate-50/30 rounded-md" />);
        }

        // Remplir les jours réels du mois
        for (let jour = 1; jour <= totalJours; jour++) {
          const dateStr = `${annee}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
          const isWE = isWeekend(annee, mois, jour);
          const holidayName = getHolidayName(dateStr);
          const bgClass = getDayClass(dateStr, isWE, holidayName);
          const key = `day-${jour}`;

          cells.push(
            <button
              key={key}
              onClick={() => onSelectDay(dateStr)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium cursor-pointer transition-all duration-150 ${bgClass}`}
              title={`${jour} ${nomMois} ${annee}${holidayName ? ` (Férié : ${holidayName})` : ''}${joursLogs[dateStr] ? ` : ${joursLogs[dateStr].statut}` : ''}`}
            >
              <span>{jour}</span>
              {/* Petit point de rappel de statut si nécessaire */}
              {joursLogs[dateStr] ? (
                <span className="w-1 h-1 rounded-full bg-white/70 mt-0.5" />
              ) : holidayName ? (
                <span className="w-1 h-1 rounded-full bg-red-600 mt-0.5" />
              ) : null}
            </button>
          );
        }

        return (
          <div key={mois} className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs hover:shadow-md transition-shadow">
            <h4 className="font-bold text-slate-700 text-base mb-3 capitalize text-center border-b border-slate-50 pb-2">
              {nomMois}
            </h4>
            
            {/* Jours de la semaine en en-tête */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {JOURS_SEMAINE.map((js, index) => (
                <div key={index} className="text-[10px] font-bold text-slate-400 select-none">
                  {js}
                </div>
              ))}
            </div>

            {/* Grille des jours */}
            <div className="grid grid-cols-7 gap-1">
              {cells}
            </div>
          </div>
        );
      })}
    </div>
  );
}
