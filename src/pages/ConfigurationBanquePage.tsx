/**
 * ConfigurationBanquePage (Lot B4 — refonte moderne à onglets).
 *
 * Écran admin de configuration de la banque cliente (gate BANQUE.GERER).
 * Permet de modifier sans SQL : identité, adresse, charte visuelle
 * (couleurs), réglementaire, contexte IA (Chantier A) et membres du
 * Comité Budgétaire.
 *
 * Présentation :
 *  - bandeau hero « live » teinté par la charte (dégradé primaire →
 *    primaire foncée + pastille secondaire) qui reflète l'identité en
 *    cours d'édition ;
 *  - 4 onglets (Identité · Charte visuelle · Contexte IA · Comité) pour
 *    éviter le long formulaire vertical ;
 *  - barre d'actions Annuler / Enregistrer commune à tous les onglets.
 *
 * L'enregistrement met à jour le branding runtime (`useBanque().refresh`)
 * pour que l'en-tête / le titre se rafraîchissent immédiatement.
 */
import { useEffect, useMemo, useState } from 'react';
import { Info, Landmark, Palette, Sparkles, Users } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

  const tabs = [
    {
      value: 'identite',
      label: <TabLabel icon={Landmark}>Identité</TabLabel>,
      content: (
        <TabCard>
          <Section title="Identité">
            <FieldGrid>
              <TextField id="nom" label="Nom *" value={form.nom} onChange={(v) => setField('nom', v)} disabled={!canGerer} />
              <TextField id="sigle" label="Sigle *" value={form.sigle} onChange={(v) => setField('sigle', v)} disabled={!canGerer} />
              <TextField id="nomCommercialComplet" label="Nom commercial complet" value={form.nomCommercialComplet} onChange={(v) => setField('nomCommercialComplet', v)} disabled={!canGerer} />
              <TextField id="formeJuridique" label="Forme juridique" value={form.formeJuridique} onChange={(v) => setField('formeJuridique', v)} disabled={!canGerer} />
              <TextField id="groupe" label="Groupe" value={form.groupe} onChange={(v) => setField('groupe', v)} disabled={!canGerer} />
            </FieldGrid>
          </Section>

          <Section title="Adresse">
            <FieldGrid>
              <TextField id="siegeSocial" label="Siège social" value={form.siegeSocial} onChange={(v) => setField('siegeSocial', v)} disabled={!canGerer} />
              <TextField id="villeSiege" label="Ville" value={form.villeSiege} onChange={(v) => setField('villeSiege', v)} disabled={!canGerer} />
              <TextField id="pays" label="Pays" value={form.pays} onChange={(v) => setField('pays', v)} disabled={!canGerer} />
              <TextField id="telephone" label="Téléphone" value={form.telephone} onChange={(v) => setField('telephone', v)} disabled={!canGerer} />
              <TextField id="emailContact" label="Email de contact" value={form.emailContact} onChange={(v) => setField('emailContact', v)} disabled={!canGerer} />
            </FieldGrid>
          </Section>

          <Section title="Réglementaire">
            <FieldGrid>
              <TextField id="refReglementaireBceao" label="Référence réglementaire BCEAO" value={form.refReglementaireBceao} onChange={(v) => setField('refReglementaireBceao', v)} disabled={!canGerer} />
              <TextField id="exerciceFiscalLibelle" label="Exercice fiscal (libellé)" value={form.exerciceFiscalLibelle} onChange={(v) => setField('exerciceFiscalLibelle', v)} disabled={!canGerer} />
            </FieldGrid>
          </Section>
        </TabCard>
      ),
    },
    {
      value: 'charte',
      label: <TabLabel icon={Palette}>Charte visuelle</TabLabel>,
      content: (
        <TabCard>
          <Section title="Couleurs">
            <div className="flex flex-wrap gap-6">
              <ColorPicker id="couleurPrimaire" label="Couleur primaire" value={form.couleurPrimaire} onChange={(v) => setField('couleurPrimaire', v)} suggestions={PALETTES} />
              <ColorPicker id="couleurPrimaireDark" label="Primaire (foncée)" value={form.couleurPrimaireDark} onChange={(v) => setField('couleurPrimaireDark', v)} suggestions={PALETTES} />
              <ColorPicker id="couleurSecondaire" label="Couleur secondaire" value={form.couleurSecondaire} onChange={(v) => setField('couleurSecondaire', v)} suggestions={PALETTES} />
            </div>
            <div className="mt-4 flex items-center gap-3" data-testid="charte-preview">
              <span className="text-sm text-(--muted-foreground)">Aperçu :</span>
              <span className="rounded px-3 py-1 text-sm font-medium text-white" style={{ backgroundColor: form.couleurPrimaire }}>{form.nom || 'Nom banque'}</span>
              <span className="rounded px-3 py-1 text-sm font-medium text-white" style={{ backgroundColor: form.couleurPrimaireDark }}>Sombre</span>
              <span className="rounded px-3 py-1 text-sm font-medium" style={{ backgroundColor: form.couleurSecondaire, color: form.couleurPrimaireDark }}>Accent</span>
            </div>
          </Section>

          <Section title="Logo">
            <FieldGrid>
              <TextField id="logoRef" label="Logo (chemin ou URL)" value={form.logoRef} onChange={(v) => setField('logoRef', v)} disabled={!canGerer} />
            </FieldGrid>
          </Section>
        </TabCard>
      ),
    },
    {
      value: 'contexte-ia',
      label: <TabLabel icon={Sparkles}>Contexte IA</TabLabel>,
      content: (
        <TabCard>
          <Section
            title="Contexte IA (Chantier A)"
            hint="Ces champs enrichissent l'analyse IA (MIZNAS AI) : le modèle les utilise pour contextualiser les écarts, proposer des actions adaptées à votre marché et anticiper les questions du Comité."
          >
            <TextAreaField
              id="positionnement"
              label="Positionnement"
              value={form.positionnement}
              onChange={(v) => setField('positionnement', v)}
              disabled={!canGerer}
              placeholder="Ex. : Retail (Particuliers + PME) et Corporate (Grandes Entreprises + Etat). Réseau d'agences à Niamey, Zinder, Maradi, Tahoua."
            />
            <TextAreaField
              id="contexteMarche"
              label="Contexte marché"
              value={form.contexteMarche}
              onChange={(v) => setField('contexteMarche', v)}
              disabled={!canGerer}
              placeholder="Ex. : marché nigérien en transformation, essor du mobile money (Airtel/Orange/Moov Money), pression réglementaire LCB-FT, digitalisation des services."
            />
            <TextAreaField
              id="concurrents"
              label="Concurrents"
              value={form.concurrents}
              onChange={(v) => setField('concurrents', v)}
              disabled={!canGerer}
              placeholder="Ex. : Ecobank Niger, BOA Niger, Sonibank, SGB Niger, Bank of Africa"
            />
          </Section>
        </TabCard>
      ),
    },
    {
      value: 'comite',
      label: <TabLabel icon={Users}>Comité</TabLabel>,
      content: (
        <TabCard>
          <Section title="Membres du Comité Budgétaire">
            <MembresComiteEditor membres={config.membres} onChanged={reload} />
          </Section>
        </TabCard>
      ),
    },
  ];

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

      {/* Bandeau hero « live » teinté par la charte en cours d'édition. */}
      <div
        className="rounded-xl p-6 text-white shadow-lg"
        style={{
          backgroundImage: `linear-gradient(135deg, ${
            HEX_COLOR.test(form.couleurPrimaire) ? form.couleurPrimaire : '#1B2A4E'
          }, ${
            HEX_COLOR.test(form.couleurPrimaireDark)
              ? form.couleurPrimaireDark
              : '#0F1B33'
          })`,
        }}
        data-testid="config-banque-hero"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-2xl font-bold tracking-tight truncate">
              {form.nom || 'Nom banque'}
            </div>
            <div className="text-sm text-white/80 truncate">
              {[form.sigle, form.nomCommercialComplet]
                .filter(Boolean)
                .join(' · ') || '—'}
            </div>
            {(form.villeSiege || form.pays) && (
              <div className="mt-1 text-xs text-white/60">
                {[form.villeSiege, form.pays].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          <span
            className="h-10 w-10 shrink-0 rounded-full border-2 border-white/40 shadow-inner"
            style={{
              backgroundColor: HEX_COLOR.test(form.couleurSecondaire)
                ? form.couleurSecondaire
                : '#C49B3F',
            }}
            aria-hidden="true"
          />
        </div>
      </div>

      <Tabs tabs={tabs} defaultValue="identite" />

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

/** Onglet : icône + libellé. */
function TabLabel({
  icon: Icon,
  children,
}: {
  icon: typeof Landmark;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </span>
  );
}

/** Carte blanche moderne enveloppant le contenu d'un onglet. */
function TabCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8 rounded-xl border border-(--border) bg-white p-6 shadow-sm">
      {children}
    </div>
  );
}

/** Grille responsive 2 colonnes pour les champs texte. */
function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-1.5 border-b border-(--border) pb-1 text-lg font-semibold">
        {title}
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Aide"
                data-testid={`hint-${title}`}
                className="text-(--muted-foreground) hover:text-(--foreground)"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{hint}</TooltipContent>
          </Tooltip>
        )}
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
  placeholder?: string;
}

function TextField({ id, label, value, onChange, disabled }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} data-testid={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        data-testid={id}
        value={value}
        disabled={disabled}
        rows={3}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="flex w-full rounded-md border border-(--border) bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-(--ring) disabled:opacity-50 placeholder:text-(--muted-foreground)"
      />
    </div>
  );
}
