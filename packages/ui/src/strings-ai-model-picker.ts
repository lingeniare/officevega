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
  zh: { title: '模型', choose: '选择模型', manage: '管理模型…', aiModels: 'AI 模型' },
  en: { title: 'Model', choose: 'Choose model', manage: 'Manage models…', aiModels: 'AI models' },
  ja: { title: 'モデル', choose: 'モデルを選択', manage: 'モデルを管理…', aiModels: 'AIモデル' },
  ko: { title: '모델', choose: '모델 선택', manage: '모델 관리…', aiModels: 'AI 모델' },
  fr: { title: 'Modèle', choose: 'Choisir un modèle', manage: 'Gérer les modèles…', aiModels: 'Modèles IA' },
  de: { title: 'Modell', choose: 'Modell wählen', manage: 'Modelle verwalten…', aiModels: 'KI-Modelle' },
  es: { title: 'Modelo', choose: 'Elegir modelo', manage: 'Gestionar modelos…', aiModels: 'Modelos de IA' },
  th: { title: 'โมเดล', choose: 'เลือกโมเดล', manage: 'จัดการโมเดล…', aiModels: 'โมเดล AI' },
  id: { title: 'Model', choose: 'Pilih model', manage: 'Kelola model…', aiModels: 'Model AI' },
  ru: { title: 'Модель', choose: 'Выбрать модель', manage: 'Управление моделями…', aiModels: 'Модели ИИ' },
  ar: { title: 'النموذج', choose: 'اختيار النموذج', manage: 'إدارة النماذج…', aiModels: 'نماذج الذكاء الاصطناعي' },
  pt: { title: 'Modelo', choose: 'Escolher modelo', manage: 'Gerenciar modelos…', aiModels: 'Modelos de IA' },
  it: { title: 'Modello', choose: 'Scegli modello', manage: 'Gestisci modelli…', aiModels: 'Modelli AI' },
  pl: { title: 'Model', choose: 'Wybierz model', manage: 'Zarządzaj modelami…', aiModels: 'Modele AI' },
  cs: { title: 'Model', choose: 'Vybrat model', manage: 'Spravovat modely…', aiModels: 'Modely AI' },
  nl: { title: 'Model', choose: 'Model kiezen', manage: 'Modellen beheren…', aiModels: 'AI-modellen' },
  ms: { title: 'Model', choose: 'Pilih model', manage: 'Urus model…', aiModels: 'Model AI' },
  he: { title: 'מודל', choose: 'בחירת מודל', manage: 'ניהול מודלים…', aiModels: 'מודלי AI' },
  hi: { title: 'मॉडल', choose: 'मॉडल चुनें', manage: 'मॉडल प्रबंधित करें…', aiModels: 'AI मॉडल' },
  'zh-TW': { title: '模型', choose: '選擇模型', manage: '管理模型…', aiModels: 'AI 模型' },
  vi: { title: 'Mô hình', choose: 'Chọn mô hình', manage: 'Quản lý mô hình…', aiModels: 'Mô hình AI' },
  uz: { title: 'Model', choose: 'Model tanlash', manage: 'Modellarni boshqarish…', aiModels: 'AI modellar' },
  kk: { title: 'Модель', choose: 'Модель таңдау', manage: 'Модельдерді басқару…', aiModels: 'AI модельдері' },
  az: { title: 'Model', choose: 'Model seçin', manage: 'Modelləri idarə et…', aiModels: 'AI modelləri' },
  tk: { title: 'Model', choose: 'Model saýlaň', manage: 'Modelleri dolandyr…', aiModels: 'AI modeller' },
  ky: { title: 'Модель', choose: 'Модель тандоо', manage: 'Моделдерди башкаруу…', aiModels: 'AI моделдери' },
  tt: { title: 'Модель', choose: 'Модель сайлагыз', manage: 'Модельләрне идарә итү…', aiModels: 'AI модельләре' },
  ka: { title: 'მოდელი', choose: 'აირჩიეთ მოდელი', manage: 'მოდელების მართვა…', aiModels: 'AI მოდელები' },
}
