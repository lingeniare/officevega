import type { Lang } from '@genoffice/i18n'

export interface AiModelPickerStrings {
  /** chip tooltip / list heading */
  title: string
  /** chip text while no provider is usable yet */
  choose: string
  /** last row: jump to Settings › AI Model */
  manage: string
  /** group heading for the signed-in account (genspark) provider */
  aiModels: string
  /** prefix before the VEGA balance figure in that group head ("Deposit: 156 $") */
  deposit: string
}

export const AI_MODEL_PICKER_STRINGS: Record<Lang, AiModelPickerStrings> = {
  en: { title: 'Model', choose: 'Choose model', manage: 'Manage models…', aiModels: 'AI models', deposit: 'Deposit:' },
  ru: { title: 'Модель', choose: 'Выбрать модель', manage: 'Управление моделями…', aiModels: 'Модели ИИ', deposit: 'Депозит:' },
  
  
  
  
  
  
  
  uz: { title: 'Model', choose: 'Model tanlash', manage: 'Modellarni boshqarish…', aiModels: 'AI modellar', deposit: 'Depozit:' },
  kk: { title: 'Модель', choose: 'Модель таңдау', manage: 'Модельдерді басқару…', aiModels: 'AI модельдері', deposit: 'Депозит:' },
  az: { title: 'Model', choose: 'Model seçin', manage: 'Modelləri idarə et…', aiModels: 'AI modelləri', deposit: 'Depozit:' },
  tk: { title: 'Model', choose: 'Model saýlaň', manage: 'Modelleri dolandyr…', aiModels: 'AI modeller', deposit: 'Depozit:' },
  ky: { title: 'Модель', choose: 'Модель тандоо', manage: 'Моделдерди башкаруу…', aiModels: 'AI моделдери', deposit: 'Депозит:' },
  tt: { title: 'Модель', choose: 'Модель сайлагыз', manage: 'Модельләрне идарә итү…', aiModels: 'AI модельләре', deposit: 'Депозит:' },
  ka: { title: 'მოდელი', choose: 'აირჩიეთ მოდელი', manage: 'მოდელების მართვა…', aiModels: 'AI მოდელები', deposit: 'დეპოზიტი:' },
}
