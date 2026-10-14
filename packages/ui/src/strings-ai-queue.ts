import type { Lang } from '@genoffice/i18n'

/** Labels for the queued-messages strip above the AI composer (all editors share them). */
export interface AiQueueStripLabels {
  /** collapsed strip title, e.g. "3 queued" */
  queuedCount: (n: number) => string
  clearTitle: string
  editTitle: string
  removeTitle: string
  /** hold the queue: the run in flight finishes, nothing after it starts */
  pauseTitle: string
  /** let the queue run again */
  resumeTitle: string
  /** strip hint while the gate is closed */
  pausedHint: string
  /** row tooltip: press and drag to change the order (Alt+arrows for keyboards) */
  moveTitle: string
  /** composer placeholder while a reply runs and Enter queues instead of sending */
  queuePlaceholder: string
}

export const AI_QUEUE_LABELS: Record<Lang, AiQueueStripLabels> = {
  en: {
    queuedCount: (n) => `${n} queued`,
    clearTitle: 'Clear queued messages',
    editTitle: 'Edit queued message',
    removeTitle: 'Remove queued message',
    pauseTitle: 'Pause the queue',
    resumeTitle: 'Resume the queue',
    pausedHint: 'Paused',
    moveTitle: 'Drag to reorder (or Alt+↑/↓)',
    queuePlaceholder: 'Enter to queue · Esc to stop',
  },
  ru: {
    queuedCount: (n) => `${n} в очереди`,
    clearTitle: 'Очистить очередь сообщений',
    editTitle: 'Изменить сообщение в очереди',
    removeTitle: 'Убрать сообщение из очереди',
    pauseTitle: 'Приостановить очередь',
    resumeTitle: 'Возобновить очередь',
    pausedHint: 'Приостановлено',
    moveTitle: 'Перетащите, чтобы изменить порядок (или Alt+↑/↓)',
    queuePlaceholder: 'Enter — в очередь · Esc — остановить',
  },
  cs: {
    queuedCount: (n) => `${n} ve frontě`,
    clearTitle: 'Vymazat zprávy ve frontě',
    editTitle: 'Upravit zprávu ve frontě',
    removeTitle: 'Odebrat zprávu z fronty',
    pauseTitle: 'Pozastavit frontu',
    resumeTitle: 'Obnovit frontu',
    pausedHint: 'Pozastaveno',
    moveTitle: 'Přetáhněte pro změnu pořadí (nebo Alt+↑/↓)',
    queuePlaceholder: 'Enter zařadí · Esc zastaví',
  },
  nl: {
    queuedCount: (n) => `${n} in wachtrij`,
    clearTitle: 'Wachtrij leegmaken',
    editTitle: 'Bericht in wachtrij bewerken',
    removeTitle: 'Bericht uit wachtrij verwijderen',
    pauseTitle: 'Wachtrij pauzeren',
    resumeTitle: 'Wachtrij hervatten',
    pausedHint: 'Gepauzeerd',
    moveTitle: 'Sleep om te herschikken (of Alt+↑/↓)',
    queuePlaceholder: 'Enter om te wachtrijken · Esc om te stoppen',
  },
  ms: {
    queuedCount: (n) => `${n} dalam baris gilir`,
    clearTitle: 'Kosongkan mesej dalam baris gilir',
    editTitle: 'Edit mesej dalam baris gilir',
    removeTitle: 'Buang mesej dalam baris gilir',
    pauseTitle: 'Jeda barisan',
    resumeTitle: 'Sambung barisan',
    pausedHint: 'Dijeda',
    moveTitle: 'Seret untuk susun semula (atau Alt+↑/↓)',
    queuePlaceholder: 'Enter untuk baris gilir · Esc untuk berhenti',
  },
  he: {
    queuedCount: (n) => `${n} בתור`,
    clearTitle: 'נקה הודעות בתור',
    editTitle: 'ערוך הודעה בתור',
    removeTitle: 'הסר הודעה מהתור',
    pauseTitle: 'השהה את התור',
    resumeTitle: 'חדש את התור',
    pausedHint: 'מושהה',
    moveTitle: 'גרור כדי לסדר מחדש (או Alt+↑/↓)',
    queuePlaceholder: 'Enter לתור · Esc לעצירה',
  },
  hi: {
    queuedCount: (n) => `${n} कतार में`,
    clearTitle: 'कतार में संदेश साफ़ करें',
    editTitle: 'कतार में संदेश संपादित करें',
    removeTitle: 'कतार में संदेश हटाएँ',
    pauseTitle: 'कतार रोकें',
    resumeTitle: 'कतार फिर शुरू करें',
    pausedHint: 'रोका गया',
    moveTitle: 'क्रम बदलने के लिए खींचें (या Alt+↑/↓)',
    queuePlaceholder: 'कतार के लिए Enter · रोकने के लिए Esc',
  },
  'zh-TW': {
    queuedCount: (n) => `${n} 則排隊中`,
    clearTitle: '清空排隊訊息',
    editTitle: '編輯排隊訊息',
    removeTitle: '移除排隊訊息',
    pauseTitle: '暫停排隊',
    resumeTitle: '繼續排隊',
    pausedHint: '已暫停',
    moveTitle: '拖曳調整順序（或 Alt+↑/↓）',
    queuePlaceholder: 'Enter 排隊 · Esc 停止',
  },
  vi: {
    queuedCount: (n) => `${n} đang chờ`,
    clearTitle: 'Xoá các tin nhắn đang chờ',
    editTitle: 'Sửa tin nhắn đang chờ',
    removeTitle: 'Bỏ tin nhắn đang chờ',
    pauseTitle: 'Tạm dừng hàng đợi',
    resumeTitle: 'Tiếp tục hàng đợi',
    pausedHint: 'Đã tạm dừng',
    moveTitle: 'Kéo để đổi thứ tự (hoặc Alt+↑/↓)',
    queuePlaceholder: 'Enter để xếp hàng · Esc để dừng',
  },
  uz: {
    queuedCount: (n) => `${n} ta navbatda`,
    clearTitle: 'Navbatdagi xabarlarni tozalash',
    editTitle: 'Navbatdagi xabarni tahrirlash',
    removeTitle: 'Navbatdagi xabarni oʻchirish',
    pauseTitle: 'Navbatni toʻxtatish',
    resumeTitle: 'Navbatni davom ettirish',
    pausedHint: 'Toʻxtatilgan',
    moveTitle: 'Tartibni oʻzgartirish uchun sudrang (yoki Alt+↑/↓)',
    queuePlaceholder: 'Enter — navbatga qoʻshish · Esc — toʻxtatish',
  },
  kk: {
    queuedCount: (n) => `${n} кезекте`,
    clearTitle: 'Кезектегі хабарларды тазалау',
    editTitle: 'Кезектегі хабарды өңдеу',
    removeTitle: 'Кезектегі хабарды жою',
    pauseTitle: 'Кезекті кідірту',
    resumeTitle: 'Кезекті жалғастыру',
    pausedHint: 'Кідіртілді',
    moveTitle: 'Ретін өзгерту үшін сүйреңіз (немесе Alt+↑/↓)',
    queuePlaceholder: 'Enter — кезекке қою · Esc — тоқтату',
  },
  az: {
    queuedCount: (n) => `${n} növbədə`,
    clearTitle: 'Növbədəki mesajları təmizlə',
    editTitle: 'Növbədəki mesajı redaktə et',
    removeTitle: 'Növbədəki mesajı sil',
    pauseTitle: 'Növbəni dayandır',
    resumeTitle: 'Növbəni davam etdir',
    pausedHint: 'Dayandırılıb',
    moveTitle: 'Sıranı dəyişmək üçün sürüşdürün (və ya Alt+↑/↓)',
    queuePlaceholder: 'Enter — növbəyə əlavə et · Esc — dayandır',
  },
  tk: {
    queuedCount: (n) => `${n} nobatda`,
    clearTitle: 'Nobatdaky habarlary arassala',
    editTitle: 'Nobatdaky habary redaktirle',
    removeTitle: 'Nobatdaky habary poz',
    pauseTitle: 'Nobaty duruz',
    resumeTitle: 'Nobaty dowam ettir',
    pausedHint: 'Duruzuldy',
    moveTitle: 'Tertibi üýtgetmek üçin süýşüriň (ýa-da Alt+↑/↓)',
    queuePlaceholder: 'Enter — nobata goş · Esc — duruz',
  },
  ky: {
    queuedCount: (n) => `${n} кезекте`,
    clearTitle: 'Кезектеги билдирүүлөрдү тазалоо',
    editTitle: 'Кезектеги билдирүүнү түзөтүү',
    removeTitle: 'Кезектеги билдирүүнү өчүрүү',
    pauseTitle: 'Кезекти тындыруу',
    resumeTitle: 'Кезекти улантуу',
    pausedHint: 'Тындырылды',
    moveTitle: 'Тартибин өзгөртүү үчүн сүйрөңүз (же Alt+↑/↓)',
    queuePlaceholder: 'Enter — кезекке коюу · Esc — токтотуу',
  },
  tt: {
    queuedCount: (n) => `${n} чиратта`,
    clearTitle: 'Чираттагы хәбәрләрне чистарту',
    editTitle: 'Чираттагы хәбәрне төзәтү',
    removeTitle: 'Чираттагы хәбәрне бетерү',
    pauseTitle: 'Чиратны туктату',
    resumeTitle: 'Чиратны дәвам итү',
    pausedHint: 'Туктатылды',
    moveTitle: 'Тәртипне үзгәртү өчен сүйрәгез (яки Alt+↑/↓)',
    queuePlaceholder: 'Enter — чиратка кую · Esc — туктату',
  },
  ka: {
    queuedCount: (n) => `${n} რიგში`,
    clearTitle: 'რიგში მყოფი შეტყობინებების გასუფთავება',
    editTitle: 'რიგში მყოფი შეტყობინების რედაქტირება',
    removeTitle: 'რიგში მყოფი შეტყობინების წაშლა',
    pauseTitle: 'რიგის შეჩერება',
    resumeTitle: 'რიგის გაგრძელება',
    pausedHint: 'შეჩერებულია',
    moveTitle: 'გადაადგილეთ რიგის შესაცვლელად (ან Alt+↑/↓)',
    queuePlaceholder: 'Enter — რიგში დამატება · Esc — შეჩერება',
  },
}
