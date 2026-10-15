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
