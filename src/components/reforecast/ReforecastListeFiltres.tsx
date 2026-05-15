/**
 * Filtres de la page liste reforecasts (Lot 5.3.B + refonte
 * Lot 7.3 V25 Charte v1).
 *
 * Refonte V25 : cadre gris bg-(--secondary), Selects en h-9
 * bg-white, Search avec icône Lucide. data-testid PRÉSERVÉS
 * (reforecast-filtres / rf-filter-statut-pub / rf-filter-statut-wf
 * / rf-filter-annee / rf-filter-recherche).
 */
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReforecastStore } from '@/lib/stores/reforecast-store';

export function ReforecastListeFiltres(): JSX.Element {
  const {
    statutPublication,
    statutWorkflow,
    anneeConsolide,
    recherche,
    setStatutPublication,
    setStatutWorkflow,
    setAnneeConsolide,
    setRecherche,
  } = useReforecastStore();

  return (
    <div
      className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4"
      data-testid="reforecast-filtres"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px_1fr] gap-2.5">
        <div>
          <Label htmlFor="rf-statut-pub" className="text-xs mb-1 block">
            Statut publication
          </Label>
          <Select
            value={statutPublication}
            onValueChange={(v) => setStatutPublication(v as never)}
          >
            <SelectTrigger
              id="rf-statut-pub"
              data-testid="rf-filter-statut-pub"
              className="h-9 bg-white"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="OBSOLETE">Obsolète</SelectItem>
              <SelectItem value="TOUS">Tous</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="rf-statut-wf" className="text-xs mb-1 block">
            Statut workflow
          </Label>
          <Select
            value={statutWorkflow}
            onValueChange={(v) => setStatutWorkflow(v as never)}
          >
            <SelectTrigger
              id="rf-statut-wf"
              data-testid="rf-filter-statut-wf"
              className="h-9 bg-white"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TOUS">Tous</SelectItem>
              <SelectItem value="BROUILLON">Brouillon</SelectItem>
              <SelectItem value="SOUMIS">Soumis</SelectItem>
              <SelectItem value="VALIDE">Validé</SelectItem>
              <SelectItem value="PUBLIE">Publié</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="rf-annee" className="text-xs mb-1 block">
            Année consolidée
          </Label>
          <Input
            id="rf-annee"
            data-testid="rf-filter-annee"
            type="number"
            min="2020"
            max="2099"
            value={anneeConsolide ?? ''}
            onChange={(e) => {
              const v = e.target.value.trim();
              setAnneeConsolide(v ? Number(v) : null);
            }}
            placeholder="ex. 2027"
            className="h-9 bg-white tabular-nums"
          />
        </div>

        <div>
          <Label htmlFor="rf-recherche" className="text-xs mb-1 block">
            Recherche libellé
          </Label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
              aria-hidden="true"
            />
            <Input
              id="rf-recherche"
              data-testid="rf-filter-recherche"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="ex. T1 2027"
              className="h-9 pl-9 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
