import { type ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listJoursTemps, type JourTemps } from '@/lib/api/referentiels';

const JOURS_SEMAINE_FR = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
] as const;

const MOIS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

function formatDateFr(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function jourSemaineFr(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return JOURS_SEMAINE_FR[day]!;
}

const columns: ColumnDef<JourTemps, unknown>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => (
      <span className="font-mono">{formatDateFr(row.original.date)}</span>
    ),
  },
  {
    id: 'jourSemaine',
    header: 'Jour de la semaine',
    cell: ({ row }) => jourSemaineFr(row.original.date),
  },
  {
    accessorKey: 'jourOuvre',
    header: 'Statut',
    cell: ({ row }) =>
      row.original.jourOuvre ? (
        <Badge variant="success">Ouvré</Badge>
      ) : (
        <Badge variant="destructive">Férié/Week-end</Badge>
      ),
  },
  {
    id: 'finPeriode',
    header: 'Fin de période',
    cell: ({ row }) => {
      const j = row.original;
      const flags: string[] = [];
      if (j.estFinDeMois) flags.push('Fin mois');
      if (j.estFinDeTrimestre) flags.push('Fin trimestre');
      if (j.estFinDAnnee) flags.push('Fin année');
      if (flags.length === 0) {
        return <span className="text-(--muted-foreground)">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {flags.map((f) => (
            <Badge key={f} variant="outline">
              {f}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: 'trimestre',
    header: 'Trimestre',
    cell: ({ row }) => `T${row.original.trimestre}`,
  },
  {
    accessorKey: 'semaineIso',
    header: 'Semaine ISO',
    cell: ({ row }) => row.original.semaineIso ?? '—',
  },
];

const ANNEE_COURANTE = new Date().getUTCFullYear();
const ANNEES = Array.from({ length: 10 }, (_, i) => ANNEE_COURANTE - 5 + i);

export function CalendrierPage() {
  const [annee, setAnnee] = useState<number>(ANNEE_COURANTE);
  const [mois, setMois] = useState<number>(new Date().getUTCMonth() + 1);
  const [data, setData] = useState<JourTemps[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listJoursTemps({ annee, mois, page: 1, limit: 366 })
      .then((res) => {
        setData(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        toast.error('Impossible de charger le calendrier');
      })
      .finally(() => setLoading(false));
  }, [annee, mois]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Calendrier"
        description="Référentiel temporel régional UEMOA — 10 ans glissants."
      />

      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="annee-select">Année</Label>
          <Select
            value={String(annee)}
            onValueChange={(v) => setAnnee(Number(v))}
          >
            <SelectTrigger id="annee-select" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANNEES.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="mois-select">Mois</Label>
          <Select value={String(mois)} onValueChange={(v) => setMois(Number(v))}>
            <SelectTrigger id="mois-select" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOIS_FR.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={1}
        limit={366}
        isLoading={loading}
        onPageChange={() => undefined}
      />
    </div>
  );
}
