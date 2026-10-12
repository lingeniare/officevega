import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import {
  Dropdown,
  RibbonCollapseButton,
  useDismissablePopover,
  useRibbonCollapse,
} from '@genoffice/ui'
import { useI18n } from '../i18n/locale'
import type { StringKey } from '../i18n/locale'
import type { ExportFormat } from '../../shared/ipc'
import { VegaMark } from '../ai/AiPanel'
import { uiOp, type BlockType, type ListKind, type StylableMark } from '../editor/ops'
import {
  IconBullets,
  IconHr,
  IconInlineCode,
  IconLink,
  IconNumbered,
  IconOutlineView,
  IconPicture,
  IconCloudUpload,
  IconProperties,
  IconRedo,
  IconSave,
  IconSearch,
  IconEyeOff,
  IconSourceCode,
  IconSpellcheck,
  IconTable,
  IconTaskList,
  IconUndo,
} from './icons'

interface Props {
  editor: Editor | null
  disabled: boolean
  dirty: boolean
  onSave: () => void
  onSaveAs: () => void
  /** File menu entries — same handlers as the native File menu */
  onOpen: () => void
  onExport: (format: ExportFormat) => void
  onPrint: () => void
  onFind: () => void
  autoSave: boolean
  onToggleAutoSave: (on: boolean) => void
  imageEnabled: boolean
  onInsertImage: () => void
  /** open the image host configuration (genoffice#388) */
  onImageHost: () => void
  frontmatterOpen: boolean
  onToggleFrontmatter: () => void
  /** the markdown source view, distinct from the .txt/.json `sourceMode` */
  sourceViewOpen: boolean
  onToggleSource: () => void
  outlineOpen: boolean
  onToggleOutline: () => void
  hasOutline: boolean
  spellcheck: boolean
  onToggleSpellcheck: () => void
  aiOpen: boolean
  /** Suite-wide AI switch (#1947): false hides the AI ribbon group */
  aiEnabled?: boolean
  onToggleAi: () => void
  onAiPreset: (instruction: string) => void
  /**
   * A .txt/.json is edited as source, so every button that formats a block
   * document is hidden rather than left there to act on a document that does
   * not exist. Save, find, autosave and the AI panel still apply.
   */
  sourceMode?: boolean
  /** source mode: history lives in CodeMirror, not the TipTap editor */
  sourceHistory?: { canUndo: boolean; canRedo: boolean; undo(): void; redo(): void }
  /** withheld spans: right-click a selection to hide it from the model */
  redactEnabled: boolean
  onToggleRedact: (on: boolean) => void
}

type BlockStyle = 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'quote' | 'codeBlock'

const STYLE_LABEL: Record<BlockStyle, StringKey> = {
  paragraph: 'styleParagraph',
  h1: 'styleH1',
  h2: 'styleH2',
  h3: 'styleH3',
  h4: 'styleH4',
  h5: 'styleH5',
  h6: 'styleH6',
  quote: 'styleQuote',
  codeBlock: 'styleCodeBlock',
}

function applyBlockStyle(editor: Editor, style: BlockStyle): void {
  const type: BlockType =
    style === 'quote'
      ? 'blockquote'
      : style === 'paragraph' || style === 'codeBlock'
        ? style
        : 'heading'
  const level = type === 'heading' ? Number(style.slice(1)) : undefined
  uiOp(editor, { op: 'setBlockType', target: 'selection', type, ...(level ? { level } : {}) })
}

const toggleStyle = (editor: Editor | null, style: StylableMark) =>
  editor && uiOp(editor, { op: 'setStyle', target: 'selection', style, mode: 'toggle' })

const toggleList = (editor: Editor | null, list: ListKind) =>
  editor && uiOp(editor, { op: 'toggleList', target: 'selection', list })

/** lucide: file-text / wand-sparkles / brush, same set as the docs ribbon */
function AiFeatureIcon({ kind }: { kind: 'summarize' | 'polish' | 'tidy' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {kind === 'summarize' && (
        <>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </>
      )}
      {kind === 'polish' && (
        <>
          <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" />
          <path d="m14 7 3 3" />
          <path d="M5 6v4" />
          <path d="M19 14v4" />
          <path d="M10 2v2" />
          <path d="M7 8H3" />
          <path d="M21 16h-4" />
          <path d="M11 3H9" />
        </>
      )}
      {kind === 'tidy' && (
        <>
          <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
          <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
        </>
      )}
    </svg>
  )
}

function IconBtn({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`rb-btn${active ? ' active' : ''}`}
      data-tip={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// File lives in the macOS application menu; the ribbon shows it on win/linux
// (docs/slides parity).
const IS_MAC = navigator.platform.toLowerCase().includes('mac')

export function Ribbon({
  editor,
  disabled,
  dirty,
  onSave,
  onSaveAs,
  onOpen,
  onExport,
  onPrint,
  onFind,
  autoSave,
  onToggleAutoSave,
  imageEnabled,
  onInsertImage,
  onImageHost,
  frontmatterOpen,
  onToggleFrontmatter,
  sourceViewOpen,
  onToggleSource,
  outlineOpen,
  onToggleOutline,
  hasOutline,
  spellcheck,
  onToggleSpellcheck,
  aiOpen,
  aiEnabled = true,
  onToggleAi,
  onAiPreset,
  sourceMode = false,
  sourceHistory,
  redactEnabled,
  onToggleRedact,
}: Props) {
  const { t, lang } = useI18n()
  const collapse = useRibbonCollapse('mdapp.ribbonCollapsed')
  const [fileOpen, setFileOpen] = useState(false)
  const fileWrapRef = useRef<HTMLDivElement>(null)
  useDismissablePopover(fileOpen, () => setFileOpen(false), {
    // the wrap holds trigger + menu: inside presses toggle/choose instead of dismissing
    inside: () => [fileWrapRef.current],
  })
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const linkInputRef = useRef<HTMLInputElement>(null)
  const linkAnchorRef = useRef<HTMLSpanElement>(null)

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null
      const style: BlockStyle = e.isActive('codeBlock')
        ? 'codeBlock'
        : e.isActive('blockquote')
          ? 'quote'
          : e.isActive('heading')
            ? (`h${e.getAttributes('heading').level}` as BlockStyle)
            : 'paragraph'
      return {
        style,
        empty: e.isEmpty,
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        strike: e.isActive('strike'),
        code: e.isActive('code'),
        link: e.isActive('link'),
        bullet: e.isActive('bulletList'),
        ordered: e.isActive('orderedList'),
        task: e.isActive('taskList'),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      }
    },
  })

  useEffect(() => {
    if (linkOpen) linkInputRef.current?.focus()
  }, [linkOpen])

  useDismissablePopover(linkOpen, () => setLinkOpen(false), {
    inside: () => [linkAnchorRef.current],
  })

  // editor-shaped commands stand down while the pane hides the selection;
  // Save As never does, and Find only while the source view hides its target
  const off = disabled || sourceMode || sourceViewOpen || !editor || !state
  const findOff = disabled || sourceViewOpen

  const openLink = () => {
    if (!editor) return
    setLinkUrl(String(editor.getAttributes('link').href ?? ''))
    setLinkOpen((v) => !v)
  }

  const applyLink = () => {
    if (!editor) return
    uiOp(editor, { op: 'setLink', target: 'selection', href: linkUrl.trim() || null })
    setLinkOpen(false)
  }

  // 20px inline-row rendering, same as the docs toolbar these icons come from
  // (pinned stroke paints 1.5px at this size per the suite-wide icon rules)
  const ICON = 20

  // polish/tidy act on the selection when one exists (read at click time; the
  // mousedown preventDefault below keeps the selection alive); summarize stays whole-doc
  const hasSelection = () => !(editor?.state.selection.empty ?? true)
  const aiPresets = [
    { kind: 'summarize', btn: 'aiSummarizeBtn', prompt: () => t('aiSummarizePrompt') },
    {
      kind: 'polish',
      btn: 'aiPolishBtn',
      prompt: () => t(hasSelection() ? 'aiPolishSelectionPrompt' : 'aiPolishPrompt'),
    },
    {
      kind: 'tidy',
      btn: 'aiTidyBtn',
      prompt: () => t(hasSelection() ? 'aiTidySelectionPrompt' : 'aiTidyPrompt'),
    },
  ] as const

  return (
    <div className={`ribbon ${collapse.rootClass}`} ref={collapse.rootRef}>
      {/* quick-access row above the toolbar (file / save / undo / redo / autosave), same as the docs QAT row */}
      <div className="ribbon-tabs">
        {!IS_MAC && (
          <div className="file-tab-wrap" ref={fileWrapRef}>
            <button
              type="button"
              className={`ribbon-tab-file ${fileOpen ? 'open' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setFileOpen((v) => !v)}
            >
              {t('fileTab')}
            </button>
            {fileOpen && (
              <div className="file-menu">
                <button
                  type="button"
                  onClick={() => {
                    setFileOpen(false)
                    onOpen()
                  }}
                >
                  {t('fileOpen')} <span className="file-menu-key">Ctrl+O</span>
                </button>
                <button
                  type="button"
                  disabled={off || !dirty}
                  onClick={() => {
                    setFileOpen(false)
                    onSave()
                  }}
                >
                  {t('fileSave')} <span className="file-menu-key">Ctrl+S</span>
                </button>
                <button
                  type="button"
                  disabled={off}
                  onClick={() => {
                    setFileOpen(false)
                    onSaveAs()
                  }}
                >
                  {t('saveAs')} <span className="file-menu-key">Ctrl+Shift+S</span>
                </button>
                <button
                  type="button"
                  disabled={off}
                  onClick={() => {
                    setFileOpen(false)
                    onExport('docx')
                  }}
                >
                  {t('fileExportDocx')}
                </button>
                <button
                  type="button"
                  disabled={off}
                  onClick={() => {
                    setFileOpen(false)
                    onExport('pdf')
                  }}
                >
                  {t('fileExportPdf')}
                </button>
                <button
                  type="button"
                  disabled={off}
                  onClick={() => {
                    setFileOpen(false)
                    onExport('docs')
                  }}
                >
                  {t('fileOpenInDocs')}
                </button>
                <button
                  type="button"
                  disabled={off}
                  onClick={() => {
                    setFileOpen(false)
                    onPrint()
                  }}
                >
                  {t('filePrint')} <span className="file-menu-key">Ctrl+P</span>
                </button>
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          className="qa-btn"
          data-tip={t('save')}
          aria-label={t('save')}
          disabled={disabled || !dirty}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSave}
        >
          <IconSave size={16} />
        </button>
        <button
          type="button"
          className="qa-btn qa-save-as"
          data-tip={t('saveAs')}
          data-tip-detail={t('saveAsTip')}
          aria-label={t('saveAs')}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSaveAs}
        >
          {t('saveAs')}
        </button>
        <button
          type="button"
          className="qa-btn"
          data-tip={t('undo')}
          aria-label={t('undo')}
          disabled={sourceHistory ? !sourceHistory.canUndo : off || !state?.canUndo}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            sourceHistory ? sourceHistory.undo() : editor?.chain().focus().undo().run()
          }
        >
          <IconUndo size={16} />
        </button>
        <button
          type="button"
          className="qa-btn"
          data-tip={t('redo')}
          aria-label={t('redo')}
          disabled={sourceHistory ? !sourceHistory.canRedo : off || !state?.canRedo}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            sourceHistory ? sourceHistory.redo() : editor?.chain().focus().redo().run()
          }
        >
          <IconRedo size={16} />
        </button>
        <button
          type="button"
          className="qa-btn"
          data-tip={t('findTip')}
          aria-label={t('findTip')}
          disabled={findOff}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onFind}
        >
          <IconSearch size={16} />
        </button>
        <label className={`autosave-toggle${autoSave ? ' on' : ''}`} data-tip={t('autoSaveTip')}>
          <span className="autosave-knob" />
          <span className="autosave-text">{t('autoSave')}</span>
          <input
            type="checkbox"
            checked={autoSave}
            onChange={(e) => onToggleAutoSave(e.target.checked)}
          />
        </label>
        <span className="ribbon-tabs-spacer" />
        <RibbonCollapseButton
          state={collapse}
          labels={{ collapse: t('ribbonCollapse'), pin: t('ribbonPin') }}
        />
      </div>

      <div className="ribbon-body" data-ribbon-body="">
        {aiEnabled && (
        <div className="ribbon-group">
          <div className="ribbon-group-items">
            <button
              type="button"
              className={`rb-big ai-entry${aiOpen ? ' active' : ''}`}
              data-tip={t('aiOpenAssistant')}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onToggleAi}
            >
              <span className="rb-big-icon">
                <VegaMark size={26} />
              </span>
              <span>{lang === 'ru' ? 'ИИ' : 'AI'}</span>
            </button>
            {aiPresets.map(({ kind, btn, prompt }) => (
              <button
                key={kind}
                type="button"
                className="rb-big ai-entry"
                data-tip={t(btn)}
                data-tip-detail={prompt()}
                disabled={off || state?.empty}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onAiPreset(prompt())}
              >
                <span className="rb-big-icon">
                  <span className="ai-feature-icon" aria-hidden="true">
                    <AiFeatureIcon kind={kind} />
                  </span>
                </span>
                <span>{t(btn)}</span>
              </button>
            ))}
          </div>
        </div>
        )}

        {aiEnabled && <div className="rb-sep" />}

        {!sourceMode && (
          <div className="ribbon-group">
            <div className="ribbon-group-items">
              <Dropdown
                className="rb-style"
                value={state?.style ?? 'paragraph'}
                disabled={off}
                options={(Object.keys(STYLE_LABEL) as BlockStyle[]).map((s) => ({
                  value: s,
                  label: t(STYLE_LABEL[s]),
                }))}
                onPick={(s) => editor && applyBlockStyle(editor, s)}
              />
            </div>
          </div>
        )}

        {!sourceMode && <div className="rb-sep" />}

        {!sourceMode && (
          <div className="ribbon-group">
            <div className="ribbon-group-items">
              <IconBtn
                title={t('bold')}
                active={state?.bold}
                disabled={off}
                onClick={() => toggleStyle(editor, 'bold')}
              >
                <b>B</b>
              </IconBtn>
              <IconBtn
                title={t('italic')}
                active={state?.italic}
                disabled={off}
                onClick={() => toggleStyle(editor, 'italic')}
              >
                <i>I</i>
              </IconBtn>
              <IconBtn
                title={t('strike')}
                active={state?.strike}
                disabled={off}
                onClick={() => toggleStyle(editor, 'strike')}
              >
                <s>ab</s>
              </IconBtn>
              <IconBtn
                title={t('inlineCode')}
                active={state?.code}
                disabled={off}
                onClick={() => toggleStyle(editor, 'code')}
              >
                <IconInlineCode size={ICON} />
              </IconBtn>
              <span className="rb-link-anchor" ref={linkAnchorRef}>
                <IconBtn title={t('link')} active={state?.link} disabled={off} onClick={openLink}>
                  <IconLink size={ICON} />
                </IconBtn>
                {linkOpen && (
                  <span className="rb-link-pop" onMouseDown={(e) => e.stopPropagation()}>
                    <input
                      ref={linkInputRef}
                      value={linkUrl}
                      placeholder={t('linkPlaceholder')}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && linkUrl.trim()) applyLink()
                        if (e.key === 'Escape') setLinkOpen(false)
                      }}
                    />
                    <button type="button" disabled={!linkUrl.trim()} onClick={applyLink}>
                      {t('linkApply')}
                    </button>
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {!sourceMode && <div className="rb-sep" />}

        {!sourceMode && (
          <div className="ribbon-group">
            <div className="ribbon-group-items">
              <IconBtn
                title={t('bulletList')}
                active={state?.bullet}
                disabled={off}
                onClick={() => toggleList(editor, 'bullet')}
              >
                <IconBullets size={ICON} />
              </IconBtn>
              <IconBtn
                title={t('orderedList')}
                active={state?.ordered}
                disabled={off}
                onClick={() => toggleList(editor, 'ordered')}
              >
                <IconNumbered size={ICON} />
              </IconBtn>
              <IconBtn
                title={t('taskList')}
                active={state?.task}
                disabled={off}
                onClick={() => toggleList(editor, 'task')}
              >
                <IconTaskList size={ICON} />
              </IconBtn>
            </div>
          </div>
        )}

        {!sourceMode && <div className="rb-sep" />}

        {!sourceMode && (
          <div className="ribbon-group">
            <div className="ribbon-group-items">
              <IconBtn
                title={t('insertTable')}
                disabled={off}
                onClick={() => editor && uiOp(editor, { op: 'insertTable', after: 'selection' })}
              >
                <IconTable size={ICON} />
              </IconBtn>
              <IconBtn
                title={t('insertImage')}
                disabled={off || !imageEnabled}
                onClick={onInsertImage}
              >
                <IconPicture size={ICON} />
              </IconBtn>
              <IconBtn title={t('imageHostTitle')} onClick={onImageHost}>
                <IconCloudUpload size={ICON} />
              </IconBtn>
              <IconBtn
                title={t('insertHr')}
                disabled={off}
                onClick={() =>
                  editor && uiOp(editor, { op: 'insertHorizontalRule', after: 'selection' })
                }
              >
                <IconHr size={ICON} />
              </IconBtn>
            </div>
          </div>
        )}

        <div className="rb-spacer" />

        <div className="ribbon-group">
          <div className="ribbon-group-items">
            {!sourceMode && (
              <IconBtn
                title={t('sourceView')}
                active={sourceViewOpen}
                disabled={disabled}
                onClick={onToggleSource}
              >
                <IconSourceCode size={ICON} />
              </IconBtn>
            )}
            {!sourceMode && (
              <IconBtn
                title={t('fmProperties')}
                active={frontmatterOpen}
                disabled={disabled}
                onClick={onToggleFrontmatter}
              >
                <IconProperties size={ICON} />
              </IconBtn>
            )}
            {!sourceMode && (
              <IconBtn
                title={t('outline')}
                active={outlineOpen}
                disabled={disabled || (!hasOutline && !outlineOpen)}
                onClick={onToggleOutline}
              >
                <IconOutlineView size={ICON} />
              </IconBtn>
            )}
            <IconBtn
              title={t('spellcheck')}
              active={spellcheck}
              disabled={disabled}
              onClick={onToggleSpellcheck}
            >
              <IconSpellcheck size={ICON} />
            </IconBtn>
            {!sourceMode && (
              <IconBtn
                title={t('redactEnable')}
                active={redactEnabled}
                disabled={disabled}
                onClick={() => onToggleRedact(!redactEnabled)}
              >
                <IconEyeOff size={ICON} />
              </IconBtn>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
