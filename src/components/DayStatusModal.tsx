import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Briefcase, Palmtree, Clock, Home, Trash2, Sparkles, HeartPulse } from 'lucide-react';
import { StatutJour } from '../types';
import { getHolidayName } from '../utils/holidays';

interface DayStatusModalProps {
  isOpen: boolean;
  dateStr: string | null;
  currentStatut: StatutJour | undefined;
  onClose: () => void;
  onChangeStatut: (statut: StatutJour | null) => void;
}

export default function DayStatusModal({
  isOpen,
  dateStr,
  currentStatut,
  onClose,
  onChangeStatut,
}: DayStatusModalProps) {
  // Fermer le modal si on appuie sur Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !dateStr) return null;

  const holidayName = getHolidayName(dateStr);

  // Formatter la date en français pour l'affichage (ex: "Jeudi 13 août 2026")
  const formatDateFrench = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (e) {
      return dateString;
    }
  };

  const statutsOption: {
    value: StatutJour;
    label: string;
    description: string;
    colorClass: string;
    hoverClass: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: 'Travail',
      label: 'Jour de Travail',
      description: 'Journée travaillée normale pour votre forfait',
      colorClass: 'bg-indigo-600 text-white border-indigo-600',
      hoverClass: 'hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700',
      icon: <Briefcase className="h-5 w-5" />,
    },
    {
      value: 'CP',
      label: 'Congés Payés (CP)',
      description: 'Congés annuels payés',
      colorClass: 'bg-emerald-600 text-white border-emerald-600',
      hoverClass: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-700',
      icon: <Palmtree className="h-5 w-5" />,
    },
    {
      value: 'RTT',
      label: 'Jour de RTT',
      description: 'Réduction du temps de travail',
      colorClass: 'bg-orange-500 text-white border-orange-500',
      hoverClass: 'hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 text-slate-700',
      icon: <Clock className="h-5 w-5" />,
    },
    {
      value: 'Arrêt maladie',
      label: 'Arrêt maladie',
      description: 'Arrêt de travail / Congé maladie',
      colorClass: 'bg-rose-600 text-white border-rose-600',
      hoverClass: 'hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700',
      icon: <HeartPulse className="h-5 w-5" />,
    },
    {
      value: 'Repos',
      label: 'Repos / Week-end / Férié',
      description: 'Jour non travaillé, repos hebdomadaire ou férié',
      colorClass: 'bg-slate-600 text-white border-slate-600',
      hoverClass: 'hover:bg-slate-50 hover:text-slate-700 hover:border-slate-200 text-slate-700',
      icon: <Home className="h-5 w-5" />,
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white border border-slate-100 rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative z-10 flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Modifier le statut</span>
              <h2 className="text-lg font-bold text-slate-800 mt-0.5 capitalize flex items-center gap-2">
                {formatDateFrench(dateStr)}
              </h2>
              {holidayName && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-bold">
                  <span>🇫🇷</span>
                  <span>Jour Férié : {holidayName}</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Options List */}
          <div className="p-5 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
            {statutsOption.map((opt) => {
              const isSelected = currentStatut === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChangeStatut(opt.value);
                    onClose();
                  }}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all group ${
                    isSelected
                      ? opt.colorClass + ' shadow-md scale-[1.01]'
                      : 'border-slate-200 bg-white ' + opt.hoverClass
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-50 text-slate-500 group-hover:bg-white group-hover:shadow-xs transition-all'
                    }`}
                  >
                    {opt.icon}
                  </div>
                  <div className="flex-grow">
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-slate-400 font-normal'}`}>
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer - Delete/Reset option if already declared */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between gap-3">
            {currentStatut ? (
              <button
                onClick={() => {
                  onChangeStatut(null); // supprime de la base
                  onClose();
                }}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
              >
                <Trash2 className="h-4 w-4" />
                Réinitialiser la journée
              </button>
            ) : (
              <div className="text-xs text-slate-400 flex items-center py-2 px-1">
                Aucun statut actuellement déclaré
              </div>
            )}
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"
            >
              Fermer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
