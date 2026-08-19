import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Jour } from '../types';

interface MonthStatsChartProps {
  annee: number;
  joursLogs: Record<string, Jour>;
}

const NOMS_MOIS_COURTS = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
];

export default function MonthStatsChart({ annee, joursLogs }: MonthStatsChartProps) {
  // Préparer les données pour chaque mois de l'année sélectionnée
  const data = React.useMemo(() => {
    return NOMS_MOIS_COURTS.map((nomMois, index) => {
      const mois = index + 1;
      const prefix = `${annee}-${String(mois).padStart(2, '0')}-`;
      
      let travail = 0;
      let cp = 0;
      let rtt = 0;
      let maladie = 0;
      let repos = 0;

      Object.keys(joursLogs).forEach((key) => {
        if (key.startsWith(prefix)) {
          const log = joursLogs[key];
          if (log.statut === 'Travail') travail++;
          else if (log.statut === 'CP') cp++;
          else if (log.statut === 'RTT') rtt++;
          else if (log.statut === 'Arrêt maladie' || log.statut === 'Maladie') maladie++;
          else if (log.statut === 'Repos') repos++;
        }
      });

      return {
        name: nomMois,
        'Travail': travail,
        'CP': cp,
        'RTT': rtt,
        'Arrêt maladie': maladie,
        'Repos': repos,
      };
    });
  }, [annee, joursLogs]);

  // Vérifier s'il y a des données saisies pour afficher le graphique
  const aDesDonnees = React.useMemo(() => {
    return Object.keys(joursLogs).some(key => key.startsWith(`${annee}-`));
  }, [annee, joursLogs]);

  if (!aDesDonnees) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
        <p className="text-slate-400 text-sm font-medium">Aucune donnée déclarée pour l'année {annee}.</p>
        <p className="text-slate-300 text-xs mt-1">Saisissez des jours dans le calendrier pour voir la répartition s'afficher ici.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs flex flex-col">
      <div className="mb-4">
        <h3 className="font-bold text-slate-800 text-base">Répartition Mensuelle ({annee})</h3>
        <p className="text-xs text-slate-400">Nombre de jours déclarés par type et par mois</p>
      </div>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: -20,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
              }}
              labelClassName="font-bold text-slate-700 mb-1"
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            />
            <Bar dataKey="Travail" stackId="a" fill="#4f46e5" name="Travail" radius={[0, 0, 0, 0]} />
            <Bar dataKey="CP" stackId="a" fill="#10b981" name="Congés Payés" radius={[0, 0, 0, 0]} />
            <Bar dataKey="RTT" stackId="a" fill="#f97316" name="RTT" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Arrêt maladie" stackId="a" fill="#e11d48" name="Arrêt maladie" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Repos" stackId="a" fill="#94a3b8" name="Repos" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
