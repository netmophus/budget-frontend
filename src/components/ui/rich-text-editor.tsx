/**
 * RichTextEditor (Lot 8.3.A) — éditeur HTML riche basé sur TipTap.
 *
 * Réutilisable pour tout champ HTML structuré dans MIZNAS (premier
 * usage : `descriptionDetailleeHtml` de la Note d'orientation). API
 * minimaliste : valeur HTML in/out + mode read-only optionnel.
 *
 * Barre d'outils basique (5 boutons) : Bold, Italic, Heading 2,
 * Liste à puces, Liste numérotée. Pas de tableau / image / lien
 * dans cette V1 — à étendre via un autre composant si besoin métier
 * spécifique (rester ciblé pour démo bancaire).
 *
 * **Sécurité** : TipTap émet du HTML sécurisé par défaut (whitelist
 * d'éléments via StarterKit, pas de `<script>`, pas d'attributs
 * `on*`). Le rendu via `dangerouslySetInnerHTML` côté aperçu (cf.
 * `NoteOrientationApercu`) est donc acceptable — documentation en
 * place côté consommateur.
 *
 * **Versions installées** :
 *  - @tiptap/react ^3.23.6
 *  - @tiptap/pm ^3.23.6
 *  - @tiptap/starter-kit ^3.23.6
 */
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Heading2, Italic, List, ListOrdered } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  /** HTML initial (et synchronisé en sortie via `onChange`). */
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  /** Texte affiché quand l'éditeur est vide (effet placeholder simple). */
  placeholder?: string;
  /** Hauteur min de la zone d'édition (px). Default 200. */
  minHeight?: number;
  /** test-id propagé à la racine pour les tests Vitest. */
  testId?: string;
}

export function RichTextEditor({
  value,
  onChange,
  readOnly = false,
  placeholder,
  minHeight = 200,
  testId,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  });

  // Synchronise le contenu si `value` change depuis le parent (ex:
  // refresh après save côté backend). Évite la désynchronisation
  // entre state externe et state interne TipTap.
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  // Synchronise le mode read-only si la prop change après mount.
  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable === readOnly) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  if (!editor) return null;

  const isEmpty = editor.isEmpty;

  return (
    <div
      className="border border-(--border) rounded-md bg-white"
      data-testid={testId ?? 'rich-text-editor'}
    >
      {!readOnly && (
        <div
          className="flex gap-1 p-2 border-b border-(--border) bg-(--secondary)"
          data-testid="rich-text-toolbar"
        >
          <ToolbarBtn
            label="Gras"
            icon={Bold}
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarBtn
            label="Italique"
            icon={Italic}
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarBtn
            label="Titre"
            icon={Heading2}
            active={editor.isActive('heading', { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          />
          <ToolbarBtn
            label="Liste à puces"
            icon={List}
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarBtn
            label="Liste numérotée"
            icon={ListOrdered}
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
        </div>
      )}
      <div className="relative">
        <EditorContent
          editor={editor}
          className={cn(
            'prose prose-sm max-w-none p-4',
            'prose-headings:my-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2',
            readOnly && 'opacity-90',
          )}
          style={{ minHeight: `${minHeight}px` }}
        />
        {isEmpty && placeholder && !readOnly && (
          <p
            className="absolute top-4 left-4 text-sm text-(--muted-foreground) pointer-events-none"
            data-testid="rich-text-placeholder"
          >
            {placeholder}
          </p>
        )}
      </div>
    </div>
  );
}

interface ToolbarBtnProps {
  label: string;
  icon: typeof Bold;
  active: boolean;
  onClick: () => void;
}

function ToolbarBtn({ label, icon: Icon, active, onClick }: ToolbarBtnProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'ghost'}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-8 w-8 p-0"
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
