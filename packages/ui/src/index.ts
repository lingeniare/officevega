export { AiPanelSideButton } from './AiPanelSideButton'
export { AiComposer } from './AiComposer'
export { AiShieldBadge } from './AiShieldBadge'
export { AiDepositBadge } from './AiDepositBadge'
export { formatVegaDeposit, useVegaDeposit, type VegaDepositBadgeData } from './vega-deposit'
export { AiSuggestedQuestions, useSuggestedQuestions } from './ai-suggested-questions'
export { AiQueueStrip } from './AiQueueStrip'
export { useChatRunQueue, type ChatRunQueue, type QueuedChatMessage } from './chat-run-queue'
export { AI_QUEUE_LABELS, type AiQueueStripLabels } from './strings-ai-queue'
export { AiUsageChip, addTokenUsage, formatTokenCount, type AiTokenUsageView } from './AiUsageChip'
export {
  chatTranscriptToMarkdown,
  chatExportTitle,
  suggestChatExportName,
  type ChatExportEntry,
  type ChatExportMeta,
} from './chat-export'
export { AI_USAGE_LABELS, type AiUsageLabels } from './strings-ai-usage'
export { AiScopeQuote, type AiScopeQuoteData } from './AiScopeQuote'
export {
  AI_CUSTOM_FONT_MAX_PX,
  AI_CUSTOM_FONT_MIN_PX,
  AI_FONT_BASE_PX,
  AI_FONT_SIZES,
  DEFAULT_AI_PANEL_PREFS,
  aiPanelFontPx,
  clampAiCustomFontSize,
  isAiFontSize,
  normalizeAiPanelPrefs,
  type AiFontSize,
  type AiPanelPrefs,
  type AiPanelSide,
} from './ai-panel-prefs'
export {
  applyAiPanelPrefs,
  aiPanelInitiallyOpen,
  rememberAiPanelOpen,
  useAiPanelPrefs,
  useAiSidebarEnabled,
  aiPanelWidthAtPointer,
} from './ai-panel-prefs-store'
export {
  UI_SCALE_MIN,
  UI_SCALE_MAX,
  UI_SCALE_PRESETS,
  clampUiScale,
  normalizeUiScale,
  stepUiScale,
  uiScalePercent,
} from './ui-scale'
export { applyUiScale, uiScaleFactor, useUiScale } from './ui-scale-store'
export {
  ColorPicker,
  THEME_COLORS,
  THEME_COLOR_SHADES,
  STANDARD_COLORS,
  type ColorPickerProps,
  type ColorPickerStrings,
  type ColorSwatch,
} from './color-picker'
export { installScreenTips } from './screentip'
export {
  installPopoverDismiss,
  useDismissablePopover,
  type PopoverDismissOptions,
} from './popover-dismiss'
export { Dropdown, type DropdownOption } from './dropdown'
export { ComboBox } from './combobox'
export {
  FindPanel,
  type FindFocusRequest,
  type FindPanelStrings,
  type FindTarget,
} from './find-panel'
export { findInText, foldCase, isWordChar, type FindOptions } from './find-text'
export {
  useRibbonCollapse,
  RibbonCollapseButton,
  installRibbonPeekDismiss,
  RibbonExpandButton,
  isRibbonCompactShortcut,
  isRibbonToggleShortcut,
  readRibbonCollapsed,
  readRibbonDensity,
  RIBBON_COMPACT_SHORTCUT,
  RIBBON_TOGGLE_SHORTCUT,
  type RibbonCollapse,
  type RibbonCollapseLabels,
  type RibbonDensity,
} from './ribbon-collapse'
export { AiTypingIndicator } from './AiTypingIndicator'
export {
  IconSend,
  IconStop,
  IconArrowUp,
  IconPlus,
  IconCrown,
  IconDownload,
  type IconProps,
} from './icons'
export { Markdown, type MarkdownNav } from './Markdown'
export { FILE_NAV_SCHEME, createFileNav, fileNavHref, parseFileNavHref } from './file-nav'
export { isSymbolFontFamily } from './symbol-fonts'
export {
  BUILTIN_FONT_FAMILIES,
  fontFamiliesFor,
  partitionFontFamilies,
  systemFamiliesBesidesCandidates,
} from './font-list'
export {
  WORDART_PRESETS,
  wordArtSolidColor,
  wordArtStrokePx,
  type WordArtPreset,
} from './wordart-presets'
export {
  SHAPE_GALLERY_GROUPS,
  ShapePreview,
  shapeClipCss,
  shapePreviewBox,
  shapePreviewPath,
  type ShapeGalleryGroup,
  type ShapeGalleryShape,
} from './shape-gallery'
export {
  CropDialog,
  CutoutDialog,
  cropEdgeArrowDelta,
  cropEdgeValue,
  cropImagePng,
  DEFAULT_CUTOUT_TOLERANCE,
  nudgeCropEdge,
  CROP_EDGES,
  CROP_EDGE_STEP,
  CROP_EDGE_STEP_COARSE,
  type CropEdge,
  type CropFractions,
  type ImageDialogLabels,
} from './image-dialogs'
export { CROP_EDGE_LABELS } from './strings-crop-edges'
export { ImageViewer, type ImageViewerLabels } from './image-viewer'
export { trapTab, useModalKeys } from './modal-keys'
export {
  removeBackground,
  sampleBackgroundColors,
  type CutoutResult,
  type PixelImage,
  type RGB,
} from './cutout'
export {
  encodeAutoSaveOverride,
  isAutoSaveDefault,
  NO_AUTO_SAVE_DEFAULT,
  resolveAutoSave,
  useAutoSavePref,
  type AutoSaveDefault,
  type AutoSaveDefaultApi,
} from './auto-save-pref'
export {
  NOTCH,
  clampZoom,
  createWheelPager,
  createZoomWheelClassifier,
  notchStep,
  type ZoomWheelIntent,
} from './wheel-zoom'
export { AiModelPicker, type AiModelPickerBridge } from './AiModelPicker'
export { AiConnectPrompt } from './AiConnectPrompt'
export { useAiDisconnected, type AiConnectionBridge } from './ai-connection'
export { aiErrorKey, aiErrorText, type AiErrorKey } from './ai-error'
export {
  aiModelPickerGroups,
  aiModelPickerSelection,
  healVegaModelSelection,
  withAiModelSelection,
  type AiModelPickerGroup,
  type AiModelPickerSelection,
  type AiPickerAuth,
} from './ai-model-picker-options'
export { ProviderLogo } from './provider-logos'
export {
  AiHistoryButton,
  AiHistoryMenu,
  type AiHistoryItem,
  type AiHistoryMenuProps,
  type AiHistoryMenuStrings,
} from './ai-history-menu'
export { useRedactLabelField } from './use-redact-label'
export type { RedactLabelField } from './use-redact-label'
