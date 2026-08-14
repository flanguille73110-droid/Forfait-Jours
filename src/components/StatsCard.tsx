import React from 'react';
import { Briefcase, Palmtree, Clock, CalendarDays, AlertCircle, CalendarCheck, Calendar } from 'lucide-react';
import { CompteursAnnuel } from '../types';

interface StatsCardProps {
  stats: CompteursAnnuel;
  annee: number;
  onOpenCPModal?: () => void;
  onOpenRTTModal?: () => void;
}

export default function StatsCard({ stats, annee, onOpenCPModal, onOpenRTTModal }: StatsCardProps) {
  const forfait = stats.forfaitAnnee ?? 218;
  // Calcul du pourcentage d'atteinte du forfait
  const pctTravail = forfait > 0 ? Math.min(100, Math.round((stats.travail / forfait) * 100)) : 0;
  const depassement = stats.travail > forfait;
  const resteJours = forfait - stats.travail;

  // Jours à poser restants = jours ouvrés restants - jours restants (à travailler)
  const joursAPoserRestants = (stats.joursOuvresRestants ?? 0) - (resteJours > 0 ? resteJours : 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 w-full">
      {/* Jours Travaillés */}
      <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Jours Travaillés</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">
              {stats.travail} <span className="text-sm font-normal text-slate-400">/ {forfait}</span>
            </h3>
          </div>
          <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progression du forfait</span>
            <span className="font-semibold">{pctTravail}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${depassement ? 'bg-amber-500' : 'bg-indigo-600'}`} 
              style={{ width: `${pctTravail}%` }}
            />
          </div>
        </div>
      </div>

      {/* Jours Restants */}
      <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-xs flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Jours Restants à travailler</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">
              {resteJours >= 0 ? resteJours : 0}
            </h3>
          </div>
          <div className={`p-2.5 rounded-lg ${resteJours < 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'}`}>
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-500">
          {resteJours > 0 ? (
            <p>Il vous reste <span className="font-semibold text-slate-700">{resteJours} jours</span> à déclarer pour atteindre les {forfait}.</p>
          ) : resteJours === 0 ? (
            <p className="text-emerald-600 font-semibold">Forfait de {forfait} jours exactement atteint ! 🎉</p>
          ) : (
            <p className="text-amber-600 font-semibold flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" /> Dépassement de {Math.abs(resteJours)} j.
            </p>
          )}
        </div>
      </div>

      {/* Jours Ouvrés */}
      <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-xs flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Jours Ouvrés</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">
              {stats.joursOuvresRestants ?? 0} <span className="text-sm font-normal text-slate-400">/ {stats.joursOuvresTotal ?? 0}</span>
            </h3>
          </div>
          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
            <CalendarCheck className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-500">
          <p>
            <span className="font-semibold text-slate-700">{stats.joursOuvresRestants ?? 0} j. ouvrés restants</span> à partir d'aujourd'hui (sans statut).
          </p>
        </div>
      </div>

      {/* Jours à poser restants */}
      <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-xs flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Jours à poser restants</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">
              {joursAPoserRestants} <span className="text-sm font-normal text-slate-400">jours</span>
            </h3>
          </div>
          <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">
            <Calendar className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-500">
          <p>Calcul : <span className="font-semibold text-slate-700">{stats.joursOuvresRestants ?? 0} j. ouvrés</span> − <span className="font-semibold text-slate-700">{resteJours > 0 ? resteJours : 0} j. restants</span>.</p>
        </div>
      </div>

      {/* Congés Payés */}
      <div 
        onClick={onOpenCPModal}
        className={`bg-white border border-slate-100 p-5 rounded-xl shadow-xs flex flex-col justify-between transition-all ${
          onOpenCPModal ? 'cursor-pointer hover:border-emerald-300 hover:shadow-md active:scale-[0.99]' : ''
        }`}
        title={onOpenCPModal ? "Cliquer pour afficher la liste des dates de CP" : undefined}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Congés Payés (CP)</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">
              {stats.cp} <span className="text-sm font-normal text-slate-400">jours</span>
            </h3>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
            <Palmtree className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-500">
          <p>Jours de congés posés ou planifiés sur l'année <span className="font-semibold">{annee}</span>.</p>
        </div>
      </div>

      {/* RTT */}
      <div 
        onClick={onOpenRTTModal}
        className={`bg-white border border-slate-100 p-5 rounded-xl shadow-xs flex flex-col justify-between transition-all ${
          onOpenRTTModal ? 'cursor-pointer hover:border-orange-300 hover:shadow-md active:scale-[0.99]' : ''
        }`}
        title={onOpenRTTModal ? "Cliquer pour afficher la liste des dates de RTT" : undefined}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">RTT Posés</p>
            <h3 className="text-3xl font-bold text-slate-800 mt-1">
              {stats.rtt} <span className="text-sm font-normal text-slate-400">jours</span>
            </h3>
          </div>
          <div className="p-2.5 bg-orange-50 rounded-lg text-orange-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-500">
          <p>Réduction du Temps de Travail déclarés sur l'année <span className="font-semibold">{annee}</span>.</p>
        </div>
      </div>
    </div>
  );
}
