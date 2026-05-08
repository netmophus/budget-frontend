/**
 * Boutons de transition workflow pour reforecast (Lot 5.3.B).
 * Affichage conditionné par statut + permissions + statut_publication.
 */
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  type Reforecast,
  publierReforecast,
  soumettreReforecast,
  validerReforecast,
} from '@/lib/api/reforecast';
import { useHasPermission } from '@/lib/auth/permissions';
import { RejeterReforecastDialog } from './RejeterReforecastDialog';

interface Props {
  reforecast: Reforecast;
  onTransitioned: () => void;
}

export function ReforecastWorkflowButtons({
  reforecast,
  onTransitioned,
}: Props): JSX.Element | null {
  const canSoumettre = useHasPermission('BUDGET.SOUMETTRE');
  const canValider = useHasPermission('BUDGET.VALIDER');
  const canPublier = useHasPermission('BUDGET.PUBLIER');
  const [rejetOuvert, setRejetOuvert] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reforecast OBSOLETE : aucune action workflow.
  if (reforecast.statutPublication === 'OBSOLETE') return null;

  async function appel(
    fn: (id: string) => Promise<unknown>,
    libelleAction: string,
  ): Promise<void> {
    setSubmitting(true);
    try {
      await fn(reforecast.id);
      toast.success(`${libelleAction} effectué.`);
      onTransitioned();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`${libelleAction} refusé : ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex gap-2 flex-wrap" data-testid="rf-workflow-buttons">
      {reforecast.statut === 'ouvert' && canSoumettre && (
        <Button
          onClick={() => void appel(soumettreReforecast, 'Soumission')}
          disabled={submitting}
          data-testid="rf-btn-soumettre"
        >
          Soumettre
        </Button>
      )}
      {reforecast.statut === 'soumis' && canValider && (
        <>
          <Button
            onClick={() => void appel(validerReforecast, 'Validation')}
            disabled={submitting}
            data-testid="rf-btn-valider"
          >
            Valider
          </Button>
          <Button
            variant="destructive"
            onClick={() => setRejetOuvert(true)}
            disabled={submitting}
            data-testid="rf-btn-rejeter"
          >
            Rejeter
          </Button>
        </>
      )}
      {reforecast.statut === 'valide' && canPublier && (
        <Button
          onClick={() => void appel(publierReforecast, 'Publication')}
          disabled={submitting}
          data-testid="rf-btn-publier"
        >
          Publier
        </Button>
      )}

      <RejeterReforecastDialog
        isOpen={rejetOuvert}
        onClose={() => setRejetOuvert(false)}
        reforecastId={reforecast.id}
        reforecastLibelle={reforecast.libelle}
        onRejected={onTransitioned}
      />
    </div>
  );
}
