/**
 * ColorPicker (Lot B4) — sélecteur de couleur hex #RRGGBB avec swatch
 * natif, saisie manuelle, validation de format et palettes suggérées.
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

interface ColorPickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
  /** Couleurs proposées en un clic (ex. charte BSIC / Ecobank). */
  suggestions?: Array<{ hex: string; label: string }>;
}

export function ColorPicker({
  id,
  label,
  value,
  onChange,
  suggestions = [],
}: ColorPickerProps) {
  const valide = HEX_COLOR.test(value);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} — sélecteur`}
          data-testid={`${id}-swatch`}
          value={valide ? value : '#000000'}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-10 cursor-pointer rounded border border-(--border) bg-transparent p-0.5"
        />
        <Input
          id={id}
          data-testid={id}
          value={value}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          className="w-32 font-mono uppercase"
          placeholder="#1B2A4E"
        />
      </div>
      {!valide && value.length > 0 && (
        <p className="text-xs text-red-500">Format attendu : #RRGGBB.</p>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {suggestions.map((s) => (
            <button
              key={s.hex}
              type="button"
              title={`${s.label} (${s.hex})`}
              data-testid={`${id}-suggest-${s.hex}`}
              onClick={() => onChange(s.hex)}
              className="h-5 w-5 rounded-full border border-(--border) transition hover:scale-110"
              style={{ backgroundColor: s.hex }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
