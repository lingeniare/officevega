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
}

export const AI_MODEL_PICKER_STRINGS: Record<Lang, AiModelPickerStrings> = {
  en: { title: 'Model', choose: 'Choose model', manage: 'Manage models…', aiModels: 'AI models' },
  ru: { title: 'Модель', choose: 'Выбрать модель', manage: 'Управление моделями…', aiModels: 'Модели ИИ' },
  
  
  
  
  
  
  
  uz: { title: 'Model', choose: 'Model tanlash', manage: 'Modellarni boshqarish…', aiModels: 'AI modellar' },
  kk: { title: 'Модель', choose: 'Модель таңдау', manage: 'Модельдерді басқару…', aiModels: 'AI модельдері' },
  az: { title: 'Model', choose: 'Model seçin', manage: 'Modelləri idarə et…', aiModels: 'AI modelləri' },
  tk: { title: 'Model', choose: 'Model saýlaň', manage: 'Modelleri dolandyr…', aiModels: 'AI modeller' },
  ky: { title: 'Модель', choose: 'Модель тандоо', manage: 'Моделдерди башкаруу…', aiModels: 'AI моделдери' },
  tt: { title: 'Модель', choose: 'Модель сайлагыз', manage: 'Модельләрне идарә итү…', aiModels: 'AI модельләре' },
  ka: { title: 'მოდელი', choose: 'აირჩიეთ მოდელი', manage: 'მოდელების მართვა…', aiModels: 'AI მოდელები' },
}
