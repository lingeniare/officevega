import type { Lang } from '@genoffice/i18n'

/** Labels for the composer "+" menu (add file / skills) and the attached-skill chips. */
export interface AiSkillsLabels {
  /** the "+" button tooltip */
  addTitle: string
  addFile: string
  skills: string
  searchPlaceholder: string
  /** list body when nothing is installed */
  noSkills: string
  /** list body when the search matches nothing */
  noMatch: string
  /** bottom row: jump to Settings › Integrations */
  manage: string
  back: string
  removeTitle: string
  /** read-only chip row on a sent bubble */
  attachedTitle: string
}

export const AI_SKILLS_LABELS: Record<Lang, AiSkillsLabels> = {
  en: {
    addTitle: 'Add',
    addFile: 'Add file',
    skills: 'Skills',
    searchPlaceholder: 'Search skills',
    noSkills: 'No skills installed yet',
    noMatch: 'No matching skills',
    manage: 'Manage skills',
    back: 'Back',
    removeTitle: 'Remove skill',
    attachedTitle: 'Skills attached to this message',
  },
  ru: {
    addTitle: 'Добавить',
    addFile: 'Добавить файл',
    skills: 'Навыки',
    searchPlaceholder: 'Поиск навыков',
    noSkills: 'Навыки ещё не установлены',
    noMatch: 'Подходящих навыков нет',
    manage: 'Управлять навыками',
    back: 'Назад',
    removeTitle: 'Убрать навык',
    attachedTitle: 'Навыки, приложенные к этому сообщению',
  },
  uz: {
    addTitle: "Qo'shish",
    addFile: "Fayl qo'shish",
    skills: "Ko'nikmalar",
    searchPlaceholder: "Ko'nikmalarni qidirish",
    noSkills: "Hali ko'nikmalar o'rnatilmagan",
    noMatch: "Mos ko'nikmalar topilmadi",
    manage: "Ko'nikmalarni boshqarish",
    back: 'Orqaga',
    removeTitle: "Ko'nikmani olib tashlash",
    attachedTitle: "Ushbu xabarga biriktirilgan ko'nikmalar",
  },
  kk: {
    addTitle: 'Қосу',
    addFile: 'Файл қосу',
    skills: 'Дағдылар',
    searchPlaceholder: 'Дағдылар бойынша іздеу',
    noSkills: 'Дағдылар әлі орнатылмаған',
    noMatch: 'Сәйкес дағдылар жоқ',
    manage: 'Дағдыларды басқару',
    back: 'Артқа',
    removeTitle: 'Дағдыны алып тастау',
    attachedTitle: 'Осы хабарға тіркелген дағдылар',
  },
  az: {
    addTitle: 'Əlavə et',
    addFile: 'Fayl əlavə et',
    skills: 'Bacarıqlar',
    searchPlaceholder: 'Bacarıqlar üzrə axtarış',
    noSkills: 'Hələ bacarıq quraşdırılmayıb',
    noMatch: 'Uyğun bacarıq tapılmadı',
    manage: 'Bacarıqları idarə et',
    back: 'Geri',
    removeTitle: 'Bacarığı sil',
    attachedTitle: 'Bu mesaja əlavə edilmiş bacarıqlar',
  },
  tk: {
    addTitle: 'Goş',
    addFile: 'Faýl goş',
    skills: 'Başarnyklar',
    searchPlaceholder: 'Başarnyklar boýunça gözleg',
    noSkills: 'Entek başarnyk gurnalmadyk',
    noMatch: 'Gabat gelýän başarnyk ýok',
    manage: 'Başarnyklary dolandyr',
    back: 'Yzyna',
    removeTitle: 'Başarnygy aýyr',
    attachedTitle: 'Bu habara birikdirilen başarnyklar',
  },
  ky: {
    addTitle: 'Кошуу',
    addFile: 'Файл кошуу',
    skills: 'Скиллер',
    searchPlaceholder: 'Скиллер боюнча издөө',
    noSkills: 'Скиллер азырынча орнотула элек',
    noMatch: 'Дал келген скиллер жок',
    manage: 'Скиллерди башкаруу',
    back: 'Артка',
    removeTitle: 'Скилди өчүрүү',
    attachedTitle: 'Бул билдирүүгө тиркелген скиллер',
  },
  tt: {
    addTitle: 'Кушу',
    addFile: 'Файл кушу',
    skills: 'Күнекмәләр',
    searchPlaceholder: 'Күнекмәләр буенча эзләү',
    noSkills: 'Күнекмәләр әле урнаштырылмаган',
    noMatch: 'Туры килгән күнекмәләр юк',
    manage: 'Күнекмәләрне идарә итү',
    back: 'Кире',
    removeTitle: 'Күнекмәне бетерү',
    attachedTitle: 'Бу хәбәргә кушылган күнекмәләр',
  },
  ka: {
    addTitle: 'დამატება',
    addFile: 'ფაილის დამატება',
    skills: 'უნარები',
    searchPlaceholder: 'უნარების ძიება',
    noSkills: 'უნარები ჯერ არ არის დაინსტალირებული',
    noMatch: 'შესაბამისი უნარები არ მოიძებნა',
    manage: 'უნარების მართვა',
    back: 'უკან',
    removeTitle: 'უნარის წაშლა',
    attachedTitle: 'ამ შეტყობინებას მიმაგრებული უნარები',
  },
}
