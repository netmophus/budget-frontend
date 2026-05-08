/**
 * Filtres de la page liste reforecasts (Lot 5.3.B).
 */
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
      className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4"
      data-testid="reforecast-filtres"
    >
      <div>
        <Label htmlFor="rf-statut-pub">Statut publication</Label>
        <Select
          value={statutPublication}
          onValueChange={(v) => setStatutPublication(v as never)}
        >
          <SelectTrigger
            id="rf-statut-pub"
            data-testid="rf-filter-statut-pub"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
            <SelectItem value="OBSOLETE">OBSOLETE</SelectItem>
            <SelectItem value="TOUS">Tous</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="rf-statut-wf">Statut workflow</Label>
        <Select
          value={statutWorkflow}
          onValueChange={(v) => setStatutWorkflow(v as never)}
        >
          <SelectTrigger id="rf-statut-wf" data-testid="rf-filter-statut-wf">
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
        <Label htmlFor="rf-annee">Année consolidée</Label>
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
        />
      </div>

      <div>
        <Label htmlFor="rf-recherche">Recherche libellé</Label>
        <Input
          id="rf-recherche"
          data-testid="rf-filter-recherche"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="ex. T1 2027"
        />
      </div>
    </div>
  );
}
