/**
 * BadgePerimetresHeader (Lot 4.1.C) — pastille discrète à côté du
 * nom du user connecté indiquant le nombre de périmètres actifs
 * (cliquer ouvre la modal lecture seule).
 */
import { Layers } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ModalMesPerimetres } from './ModalMesPerimetres';
import {
  type AffectationPerimetre,
  listerMesPerimetres,
} from '@/lib/api/perimetres';

export function BadgePerimetresHeader(): JSX.Element | null {
  const [mes, setMes] = useState<AffectationPerimetre[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    listerMesPerimetres()
      .then((r) => setMes(r))
      .catch(() => {
        /* user pas autorisé ou non connecté → silencieux */
      })
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || mes.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full bg-(--primary)/10 text-(--primary) px-2 py-0.5 text-xs font-semibold hover:bg-(--primary)/20 transition-colors"
        title="Voir mes périmètres"
        data-testid="badge-perimetres-header"
      >
        <Layers className="h-3 w-3" />
        {mes.length} périmètre{mes.length > 1 ? 's' : ''}
      </button>
      <ModalMesPerimetres
        isOpen={open}
        onClose={() => setOpen(false)}
        perimetres={mes}
      />
    </>
  );
}
