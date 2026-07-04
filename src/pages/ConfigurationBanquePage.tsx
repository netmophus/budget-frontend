/**
 * ConfigurationBanquePage (Lot B4) — écran admin de configuration de la
 * banque cliente (gate BANQUE.GERER). Permet de modifier sans SQL :
 * identité, adresse, charte visuelle (couleurs), réglementaire, contexte
 * IA (Chantier A) et membres du Comité Budgétaire.
 *
 * L'enregistrement met à jour le branding runtime (`useBanque().refresh`)
 * pour que l'en-tête / le titre se rafraîchissent immédiatement.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ColorPicker,
  HEX_COLOR,
} from '@/components/admin/config-banque/ColorPicker';
import { MembresComiteEditor } from '@/components/admin/config-banque/MembresComiteEditor';
import { useHasPermission } from '@/lib/auth/permissions';
import { useBanque } from '@/lib/branding/banque-context';
import {
  getConfigurationBanque,
  updateConfigurationBanque,
  type ConfigurationBanque,
  type UpdateConfigurationBanqueDto,
} from '@/lib/api/configurationBanque';

/** Tous les champs éditables du formulaire (valeurs string, '' = null). */
interface FormState {
  nom: string;
  sigle: string;
  nomCommercialComplet: string;
  formeJuridique: string;
  groupe: string;
  siegeSocial: string;
  villeSiege: string;
  pays: string;
  telephone: string;
  emailContact: string;
  refReglementaireBceao: string;
  exerciceFiscalLibelle: string;
  logoRef: string;
  contexteMarche: string;
  concurrents: string;
  positionnement: string;
  couleurPrimaire: string;
  couleurPrimaireDark: string;
  couleurSecondaire: string;
}

function toForm(c: ConfigurationBanque): FormState {
  return {
    nom: c.nom,
    sigle: c.sigle,
    nomCommercialComplet: c.nomCommercialComplet ?? '',
    formeJuridique: c.formeJuridique ?? '',
    groupe: c.groupe ?? '',
    siegeSocial: c.siegeSocial ?? '',
    villeSiege: c.villeSiege ?? '',
    pays: c.pays ?? '',
    telephone: c.telephone ?? '',
    emailContact: c.emailContact ?? '',
    refReglementaireBceao: c.refReglementaireBceao ?? '',
    exerciceFiscalLibelle: c.exerciceFiscalLibelle ?? '',
    logoRef: c.logoRef ?? '',
    contexteMarche: c.contexteMarche ?? '',
    concurrents: c.concurrents ?? '',
    positionnement: c.positionnement ?? '',
    couleurPrimaire: c.couleurPrimaire,
    couleurPrimaireDark: c.couleurPrimaireDark,
    couleurSecondaire: c.couleurSecondaire,
  };
}

const PALETTES = [
  { hex: '#1B2A4E', label: 'BSIC bleu nuit' },
  { hex: '#C49B3F', label: 'BSIC or' },
  { hex: '#005B2F', label: 'Ecobank vert' },
  { hex: '#7AC143', label: 'Ecobank vert clair' },
  { hex: '#0F1B33', label: 'Bleu sombre' },
];

export function ConfigurationBanquePage() {
  const canGerer = useHasPermission('BANQUE.GERER');
  const { refresh: refreshBranding } = useBanque();

  const [config, setConfig] = useState<ConfigurationBanque | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function reload(): Promise<void> {
    const c = await getConfigurationBanque();
    setConfig(c);
    setForm(toForm(c));
  }

  useEffect(() => {
    setLoading(true);
    reload()
      .catch(() => toast.error('Impossible de charger la configuration.'))
      .finally(() => setLoading(false));
  }, []);

  const setField = (key: keyof FormState, value: string): void =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const couleursValides = useMemo(
    () =>
      form
        ? HEX_COLOR.test(form.couleurPrimaire) &&
          HEX_COLOR.test(form.couleurPrimaireDark) &&
          HEX_COLOR.test(form.couleurSecondaire)
        : false,
    [form],
  );

  const peutEnregistrer =
    canGerer &&
    form !== null &&
    form.nom.trim().length > 0 &&
    form.sigle.trim().length > 0 &&
    couleursValides &&
    !saving;

  async function handleSave(): Promise<void> {
    if (!form || !peutEnregistrer) return;
    setSaving(true);
    try {
      const dto: UpdateConfigurationBanqueDto = { ...form };
      await updateConfigurationBanque(dto);
      toast.success('Configuration banque enregistrée.');
      setConfirmOpen(false);
      await reload();
      await refreshBranding(); // l'en-tête / le titre se rafraîchissent.
    } catch {
      toast.error("Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form || !config) {
    return (
      <div className="space-y-4">
        <PageHeader title="Configuration banque" />
        <Skeleton className="h-64 w-full max-w-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="config-banque-page">
      <PageHeader
        title="Configuration banque"
        description="Identité, charte, réglementaire et Comité Budgétaire de la banque cliente."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              disabled={saving}
              data-testid="btn-annuler"
              onClick={() => setForm(toForm(config))}
            >
              Annuler
            </Button>
            <Button
              disabled={!peutEnregistrer}
              data-testid="btn-enregistrer"
              onClick={() => setConfirmOpen(true)}
            >
              Enregistrer
            </Button>
          </div>
        }
      />

      {!canGerer && (
        <p className="text-sm text-(--destructive)">
          Lecture seule — permission BANQUE.GERER requise pour modifier.
        </p>
      )}

      <div className="max-w-3xl space-y-8">
        <Section title="Identité">
          <TextField id="nom" label="Nom *" value={form.nom} onChange={(v) => setField('nom', v)} disabled={!canGerer} />
          <TextField id="sigle" label="Sigle *" value={form.sigle} onChange={(v) => setField('sigle', v)} disabled={!canGerer} />
          <TextField id="nomCommercialComplet" label="Nom commercial complet" value={form.nomCommercialComplet} onChange={(v) => setField('nomCommercialComplet', v)} disabled={!canGerer} />
          <TextField id="formeJuridique" label="Forme juridique" value={form.formeJuridique} onChange={(v) => setField('formeJuridique', v)} disabled={!canGerer} />
          <TextField id="groupe" label="Groupe" value={form.groupe} onChange={(v) => setField('groupe', v)} disabled={!canGerer} />
        </Section>

        <Section title="Adresse">
          <TextField id="siegeSocial" label="Siège social" value={form.siegeSocial} onChange={(v) => setField('siegeSocial', v)} disabled={!canGerer} />
          <TextField id="villeSiege" label="Ville" value={form.villeSiege} onChange={(v) => setField('villeSiege', v)} disabled={!canGerer} />
          <TextField id="pays" label="Pays" value={form.pays} onChange={(v) => setField('pays', v)} disabled={!canGerer} />
          <TextField id="telephone" label="Téléphone" value={form.telephone} onChange={(v) => setField('telephone', v)} disabled={!canGerer} />
          <TextField id="emailContact" label="Email de contact" value={form.emailContact} onChange={(v) => setField('emailContact', v)} disabled={!canGerer} />
        </Section>

        <Section title="Charte visuelle">
          <div className="flex flex-wrap gap-6">
            <ColorPicker id="couleurPrimaire" label="Couleur primaire" value={form.couleurPrimaire} onChange={(v) => setField('couleurPrimaire', v)} suggestions={PALETTES} />
            <ColorPicker id="couleurPrimaireDark" label="Primaire (foncée)" value={form.couleurPrimaireDark} onChange={(v) => setField('couleurPrimaireDark', v)} suggestions={PALETTES} />
            <ColorPicker id="couleurSecondaire" label="Couleur secondaire" value={form.couleurSecondaire} onChange={(v) => setField('couleurSecondaire', v)} suggestions={PALETTES} />
          </div>
          <div className="mt-3 flex items-center gap-3" data-testid="charte-preview">
            <span className="text-sm text-(--muted-foreground)">Aperçu :</span>
            <span className="rounded px-3 py-1 text-sm font-medium text-white" style={{ backgroundColor: form.couleurPrimaire }}>{form.nom || 'Nom banque'}</span>
            <span className="rounded px-3 py-1 text-sm font-medium text-white" style={{ backgroundColor: form.couleurPrimaireDark }}>Sombre</span>
            <span className="rounded px-3 py-1 text-sm font-medium" style={{ backgroundColor: form.couleurSecondaire, color: form.couleurPrimaireDark }}>Accent</span>
          </div>
          <TextField id="logoRef" label="Logo (chemin ou URL)" value={form.logoRef} onChange={(v) => setField('logoRef', v)} disabled={!canGerer} />
        </Section>

        <Section title="Réglementaire">
          <TextField id="refReglementaireBceao" label="Référence réglementaire BCEAO" value={form.refReglementaireBceao} onChange={(v) => setField('refReglementaireBceao', v)} disabled={!canGerer} />
          <TextField id="exerciceFiscalLibelle" label="Exercice fiscal (libellé)" value={form.exerciceFiscalLibelle} onChange={(v) => setField('exerciceFiscalLibelle', v)} disabled={!canGerer} />
        </Section>

        <Section title="Contexte IA (Chantier A)">
          <TextAreaField id="positionnement" label="Positionnement" value={form.positionnement} onChange={(v) => setField('positionnement', v)} disabled={!canGerer} />
          <TextAreaField id="contexteMarche" label="Contexte marché" value={form.contexteMarche} onChange={(v) => setField('contexteMarche', v)} disabled={!canGerer} />
          <TextAreaField id="concurrents" label="Concurrents" value={form.concurrents} onChange={(v) => setField('concurrents', v)} disabled={!canGerer} />
        </Section>

        <Section title="Membres du Comité Budgétaire">
          <MembresComiteEditor membres={config.membres} onChanged={reload} />
        </Section>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSave}
        title="Enregistrer la configuration ?"
        description="Les rendus PDF/Excel, emails et le branding de l'application utiliseront ces valeurs."
        confirmText="Enregistrer"
      />
    </div>
  );
}

// ─── Sous-composants de présentation ─────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="border-b border-(--border) pb-1 text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

function TextField({ id, label, value, onChange, disabled }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} data-testid={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextAreaField({ id, label, value, onChange, disabled }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        data-testid={id}
        value={value}
        disabled={disabled}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="flex w-full rounded-md border border-(--border) bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:opacity-50"
      />
    </div>
  );
}
