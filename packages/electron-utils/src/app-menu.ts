/// Localized replacements for Electron role menus, whose built-in labels are
/// English-only and (for role:'windowMenu' on Windows/Linux) follow macOS
/// conventions (Zoom, Ctrl+M minimize, Bring All to Front).
import type { MenuItemConstructorOptions, WebContents } from 'electron'
import { contextMenuLabels, type ContextMenuLabels } from './context-menu'

export interface AppMenuLabels extends ContextMenuLabels {
  window: string
  minimize: string
  closeWindow: string
  edit: string
  undo: string
  redo: string
  delete: string
  view: string
  reload: string
  forceReload: string
  toggleDevTools: string
  actualSize: string
  zoomIn: string
  zoomOut: string
  fullscreen: string
  help: string
  about: string
  checkUpdates: string
  version: string
  license: string
  privacy: string
}

type Labels = Omit<AppMenuLabels, keyof ContextMenuLabels>

const EN: Labels = {
  window: 'Window',
  minimize: 'Minimize',
  closeWindow: 'Close Window',
  edit: 'Edit',
  undo: 'Undo',
  redo: 'Redo',
  delete: 'Delete',
  view: 'View',
  reload: 'Reload',
  forceReload: 'Force Reload',
  toggleDevTools: 'Developer Tools',
  actualSize: 'Actual Size',
  zoomIn: 'Zoom In',
  zoomOut: 'Zoom Out',
  fullscreen: 'Full Screen',
  help: 'Help',
  about: 'About Office VEGA',
  checkUpdates: 'Check for Updates…',
  version: 'Version',
  license: 'License',
  privacy: 'Privacy Policy',
}

// Shared table, same rationale as context-menu.ts: one copy instead of
// 15 keys × 20 languages per app dictionary.
const LABELS: Record<string, Labels> = {
  zh: {
    window: '窗口',
    minimize: '最小化',
    closeWindow: '关闭窗口',
    edit: '编辑',
    undo: '撤销',
    redo: '重做',
    delete: '删除',
    view: '视图',
    reload: '重新加载',
    forceReload: '强制重新加载',
    toggleDevTools: '开发者工具',
    actualSize: '实际大小',
    zoomIn: '放大',
    zoomOut: '缩小',
    fullscreen: '全屏',
    help: '帮助',
    about: '关于 Office VEGA',
    checkUpdates: '检查更新…',
    version: '版本',
    license: '许可证',
    privacy: '隐私政策',
  },
  en: EN,
  ja: {
    window: 'ウィンドウ',
    minimize: '最小化',
    closeWindow: 'ウィンドウを閉じる',
    edit: '編集',
    undo: '元に戻す',
    redo: 'やり直す',
    delete: '削除',
    view: '表示',
    reload: '再読み込み',
    forceReload: '強制的に再読み込み',
    toggleDevTools: '開発者ツール',
    actualSize: '実際のサイズ',
    zoomIn: '拡大',
    zoomOut: '縮小',
    fullscreen: 'フルスクリーン',
    help: 'ヘルプ',
    about: 'Office VEGA について',
    checkUpdates: '更新を確認…',
    version: 'バージョン',
    license: 'ライセンス',
    privacy: 'プライバシーポリシー',
  },
  ko: {
    window: '창',
    minimize: '최소화',
    closeWindow: '창 닫기',
    edit: '편집',
    undo: '실행 취소',
    redo: '다시 실행',
    delete: '삭제',
    view: '보기',
    reload: '새로고침',
    forceReload: '강제 새로고침',
    toggleDevTools: '개발자 도구',
    actualSize: '실제 크기',
    zoomIn: '확대',
    zoomOut: '축소',
    fullscreen: '전체 화면',
    help: '도움말',
    about: 'Office VEGA 정보',
    checkUpdates: '업데이트 확인…',
    version: '버전',
    license: '라이선스',
    privacy: '개인정보 처리방침',
  },
  fr: {
    window: 'Fenêtre',
    minimize: 'Réduire',
    closeWindow: 'Fermer la fenêtre',
    edit: 'Édition',
    undo: 'Annuler',
    redo: 'Rétablir',
    delete: 'Supprimer',
    view: 'Affichage',
    reload: 'Recharger',
    forceReload: 'Forcer le rechargement',
    toggleDevTools: 'Outils de développement',
    actualSize: 'Taille réelle',
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
    fullscreen: 'Plein écran',
    help: 'Aide',
    about: 'À propos de Office VEGA',
    checkUpdates: 'Rechercher les mises à jour…',
    version: 'Version',
    license: 'Licence',
    privacy: 'Politique de confidentialité',
  },
  de: {
    window: 'Fenster',
    minimize: 'Minimieren',
    closeWindow: 'Fenster schließen',
    edit: 'Bearbeiten',
    undo: 'Rückgängig',
    redo: 'Wiederholen',
    delete: 'Löschen',
    view: 'Ansicht',
    reload: 'Neu laden',
    forceReload: 'Erzwungenes Neuladen',
    toggleDevTools: 'Entwicklertools',
    actualSize: 'Originalgröße',
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    fullscreen: 'Vollbild',
    help: 'Hilfe',
    about: 'Über Office VEGA',
    checkUpdates: 'Nach Updates suchen…',
    version: 'Version',
    license: 'Lizenz',
    privacy: 'Datenschutzrichtlinie',
  },
  es: {
    window: 'Ventana',
    minimize: 'Minimizar',
    closeWindow: 'Cerrar ventana',
    edit: 'Edición',
    undo: 'Deshacer',
    redo: 'Rehacer',
    delete: 'Eliminar',
    view: 'Ver',
    reload: 'Recargar',
    forceReload: 'Forzar recarga',
    toggleDevTools: 'Herramientas de desarrollo',
    actualSize: 'Tamaño real',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    fullscreen: 'Pantalla completa',
    help: 'Ayuda',
    about: 'Acerca de Office VEGA',
    checkUpdates: 'Buscar actualizaciones…',
    version: 'Versión',
    license: 'Licencia',
    privacy: 'Política de privacidad',
  },
  th: {
    window: 'หน้าต่าง',
    minimize: 'ย่อเล็กสุด',
    closeWindow: 'ปิดหน้าต่าง',
    edit: 'แก้ไข',
    undo: 'เลิกทำ',
    redo: 'ทำซ้ำ',
    delete: 'ลบ',
    view: 'มุมมอง',
    reload: 'โหลดใหม่',
    forceReload: 'บังคับโหลดใหม่',
    toggleDevTools: 'เครื่องมือนักพัฒนา',
    actualSize: 'ขนาดจริง',
    zoomIn: 'ขยาย',
    zoomOut: 'ย่อ',
    fullscreen: 'เต็มหน้าจอ',
    help: 'วิธีใช้',
    about: 'เกี่ยวกับ Office VEGA',
    checkUpdates: 'ตรวจหาการอัปเดต…',
    version: 'เวอร์ชัน',
    license: 'ใบอนุญาต',
    privacy: 'นโยบายความเป็นส่วนตัว',
  },
  id: {
    window: 'Jendela',
    minimize: 'Minimalkan',
    closeWindow: 'Tutup Jendela',
    edit: 'Edit',
    undo: 'Urungkan',
    redo: 'Ulangi',
    delete: 'Hapus',
    view: 'Tampilan',
    reload: 'Muat Ulang',
    forceReload: 'Paksa Muat Ulang',
    toggleDevTools: 'Alat Pengembang',
    actualSize: 'Ukuran Sebenarnya',
    zoomIn: 'Perbesar',
    zoomOut: 'Perkecil',
    fullscreen: 'Layar Penuh',
    help: 'Bantuan',
    about: 'Tentang Office VEGA',
    checkUpdates: 'Periksa Pembaruan…',
    version: 'Versi',
    license: 'Lisensi',
    privacy: 'Kebijakan Privasi',
  },
  ru: {
    window: 'Окно',
    minimize: 'Свернуть',
    closeWindow: 'Закрыть окно',
    edit: 'Правка',
    undo: 'Отменить',
    redo: 'Повторить',
    delete: 'Удалить',
    view: 'Вид',
    reload: 'Перезагрузить',
    forceReload: 'Принудительно перезагрузить',
    toggleDevTools: 'Инструменты разработчика',
    actualSize: 'Реальный размер',
    zoomIn: 'Увеличить',
    zoomOut: 'Уменьшить',
    fullscreen: 'Полноэкранный режим',
    help: 'Справка',
    about: 'Об «Офис ВЕГА»',
    checkUpdates: 'Проверить обновления…',
    version: 'Версия',
    license: 'Лицензия',
    privacy: 'Политика конфиденциальности',
  },
  ar: {
    window: 'نافذة',
    minimize: 'تصغير',
    closeWindow: 'إغلاق النافذة',
    edit: 'تحرير',
    undo: 'تراجع',
    redo: 'إعادة',
    delete: 'حذف',
    view: 'عرض',
    reload: 'إعادة التحميل',
    forceReload: 'فرض إعادة التحميل',
    toggleDevTools: 'أدوات المطور',
    actualSize: 'الحجم الفعلي',
    zoomIn: 'تكبير',
    zoomOut: 'تصغير العرض',
    fullscreen: 'ملء الشاشة',
    help: 'تعليمات',
    about: 'حول Office VEGA',
    checkUpdates: 'التحقق من التحديثات…',
    version: 'الإصدار',
    license: 'الترخيص',
    privacy: 'سياسة الخصوصية',
  },
  pt: {
    window: 'Janela',
    minimize: 'Minimizar',
    closeWindow: 'Fechar Janela',
    edit: 'Editar',
    undo: 'Desfazer',
    redo: 'Refazer',
    delete: 'Excluir',
    view: 'Exibir',
    reload: 'Recarregar',
    forceReload: 'Forçar Recarregamento',
    toggleDevTools: 'Ferramentas do Desenvolvedor',
    actualSize: 'Tamanho Real',
    zoomIn: 'Ampliar',
    zoomOut: 'Reduzir',
    fullscreen: 'Tela Cheia',
    help: 'Ajuda',
    about: 'Sobre o Office VEGA',
    checkUpdates: 'Procurar atualizações…',
    version: 'Versão',
    license: 'Licença',
    privacy: 'Política de Privacidade',
  },
  it: {
    window: 'Finestra',
    minimize: 'Riduci a icona',
    closeWindow: 'Chiudi finestra',
    edit: 'Modifica',
    undo: 'Annulla',
    redo: 'Ripeti',
    delete: 'Elimina',
    view: 'Visualizza',
    reload: 'Ricarica',
    forceReload: 'Forza ricarica',
    toggleDevTools: 'Strumenti di sviluppo',
    actualSize: 'Dimensioni effettive',
    zoomIn: 'Ingrandisci',
    zoomOut: 'Riduci',
    fullscreen: 'Schermo intero',
    help: 'Aiuto',
    about: 'Informazioni su Office VEGA',
    checkUpdates: 'Controlla aggiornamenti…',
    version: 'Versione',
    license: 'Licenza',
    privacy: 'Informativa sulla privacy',
  },
  pl: {
    window: 'Okno',
    minimize: 'Minimalizuj',
    closeWindow: 'Zamknij okno',
    edit: 'Edycja',
    undo: 'Cofnij',
    redo: 'Ponów',
    delete: 'Usuń',
    view: 'Widok',
    reload: 'Załaduj ponownie',
    forceReload: 'Wymuś ponowne załadowanie',
    toggleDevTools: 'Narzędzia deweloperskie',
    actualSize: 'Rzeczywisty rozmiar',
    zoomIn: 'Powiększ',
    zoomOut: 'Pomniejsz',
    fullscreen: 'Pełny ekran',
    help: 'Pomoc',
    about: 'O programie Office VEGA',
    checkUpdates: 'Sprawdź aktualizacje…',
    version: 'Wersja',
    license: 'Licencja',
    privacy: 'Polityka prywatności',
  },
  cs: {
    window: 'Okno',
    minimize: 'Minimalizovat',
    closeWindow: 'Zavřít okno',
    edit: 'Úpravy',
    undo: 'Zpět',
    redo: 'Znovu',
    delete: 'Odstranit',
    view: 'Zobrazení',
    reload: 'Znovu načíst',
    forceReload: 'Vynutit znovunačtení',
    toggleDevTools: 'Nástroje pro vývojáře',
    actualSize: 'Skutečná velikost',
    zoomIn: 'Přiblížit',
    zoomOut: 'Oddálit',
    fullscreen: 'Celá obrazovka',
    help: 'Nápověda',
    about: 'O aplikaci Office VEGA',
    checkUpdates: 'Zkontrolovat aktualizace…',
    version: 'Verze',
    license: 'Licence',
    privacy: 'Zásady ochrany osobních údajů',
  },
  nl: {
    window: 'Venster',
    minimize: 'Minimaliseren',
    closeWindow: 'Venster sluiten',
    edit: 'Bewerken',
    undo: 'Ongedaan maken',
    redo: 'Opnieuw',
    delete: 'Verwijderen',
    view: 'Beeld',
    reload: 'Opnieuw laden',
    forceReload: 'Geforceerd opnieuw laden',
    toggleDevTools: 'Ontwikkelaarstools',
    actualSize: 'Ware grootte',
    zoomIn: 'Inzoomen',
    zoomOut: 'Uitzoomen',
    fullscreen: 'Volledig scherm',
    help: 'Help',
    about: 'Over Office VEGA',
    checkUpdates: 'Controleren op updates…',
    version: 'Versie',
    license: 'Licentie',
    privacy: 'Privacybeleid',
  },
  ms: {
    window: 'Tetingkap',
    minimize: 'Minimumkan',
    closeWindow: 'Tutup Tetingkap',
    edit: 'Edit',
    undo: 'Buat Asal',
    redo: 'Buat Semula',
    delete: 'Padam',
    view: 'Paparan',
    reload: 'Muat Semula',
    forceReload: 'Paksa Muat Semula',
    toggleDevTools: 'Alat Pembangun',
    actualSize: 'Saiz Sebenar',
    zoomIn: 'Zum Masuk',
    zoomOut: 'Zum Keluar',
    fullscreen: 'Skrin Penuh',
    help: 'Bantuan',
    about: 'Perihal Office VEGA',
    checkUpdates: 'Semak Kemas Kini…',
    version: 'Versi',
    license: 'Lesen',
    privacy: 'Dasar Privasi',
  },
  he: {
    window: 'חלון',
    minimize: 'מזער',
    closeWindow: 'סגור חלון',
    edit: 'עריכה',
    undo: 'בטל',
    redo: 'בצע שוב',
    delete: 'מחק',
    view: 'תצוגה',
    reload: 'טען מחדש',
    forceReload: 'טען מחדש בכפייה',
    toggleDevTools: 'כלי מפתחים',
    actualSize: 'גודל בפועל',
    zoomIn: 'הגדל',
    zoomOut: 'הקטן',
    fullscreen: 'מסך מלא',
    help: 'עזרה',
    about: 'אודות Office VEGA',
    checkUpdates: 'בדוק עדכונים…',
    version: 'גרסה',
    license: 'רישיון',
    privacy: 'מדיניות פרטיות',
  },
  hi: {
    window: 'विंडो',
    minimize: 'छोटा करें',
    closeWindow: 'विंडो बंद करें',
    edit: 'संपादन',
    undo: 'पूर्ववत करें',
    redo: 'फिर से करें',
    delete: 'हटाएँ',
    view: 'दृश्य',
    reload: 'पुनः लोड करें',
    forceReload: 'बलपूर्वक पुनः लोड करें',
    toggleDevTools: 'डेवलपर टूल',
    actualSize: 'वास्तविक आकार',
    zoomIn: 'ज़ूम इन',
    zoomOut: 'ज़ूम आउट',
    fullscreen: 'पूर्ण स्क्रीन',
    help: 'सहायता',
    about: 'Office VEGA के बारे में',
    checkUpdates: 'अपडेट जांचें…',
    version: 'संस्करण',
    license: 'लाइसेंस',
    privacy: 'गोपनीयता नीति',
  },
  'zh-TW': {
    window: '視窗',
    minimize: '最小化',
    closeWindow: '關閉視窗',
    edit: '編輯',
    undo: '復原',
    redo: '重做',
    delete: '刪除',
    view: '檢視',
    reload: '重新載入',
    forceReload: '強制重新載入',
    toggleDevTools: '開發人員工具',
    actualSize: '實際大小',
    zoomIn: '放大',
    zoomOut: '縮小',
    fullscreen: '全螢幕',
    help: '說明',
    about: '關於 Office VEGA',
    checkUpdates: '檢查更新…',
    version: '版本',
    license: '授權',
    privacy: '隱私權政策',
  },
  uz: {
    window: 'Oyna',
    minimize: 'Kichraytirish',
    closeWindow: 'Oynani yopish',
    edit: 'Tahrirlash',
    undo: 'Bekor qilish',
    redo: 'Qaytarish',
    delete: 'O‘chirish',
    view: 'Ko‘rinish',
    reload: 'Qayta yuklash',
    forceReload: 'Majburiy qayta yuklash',
    toggleDevTools: 'Dasturchi vositalari',
    actualSize: 'Haqiqiy o‘lcham',
    zoomIn: 'Kattalashtirish',
    zoomOut: 'Kichraytirish',
    fullscreen: 'To‘liq ekran',
    help: 'Yordam',
    about: 'Office VEGA haqida',
    checkUpdates: 'Yangilanishlarni tekshirish…',
    version: 'Versiya',
    license: 'Litsenziya',
    privacy: 'Maxfiylik siyosati',
  },
  kk: {
    window: 'Терезе',
    minimize: 'Терезені жасыру',
    closeWindow: 'Терезені жабу',
    edit: 'Өңдеу',
    undo: 'Болдырмау',
    redo: 'Қайта орындау',
    delete: 'Жою',
    view: 'Көрініс',
    reload: 'Қайта жүктеу',
    forceReload: 'Қайта жүктеуді мәжбүрлеу',
    toggleDevTools: 'Әзірлеуші құралдары',
    actualSize: 'Нақты өлшемі',
    zoomIn: 'Үлкейту',
    zoomOut: 'Кішірейту',
    fullscreen: 'Толық экран',
    help: 'Анықтама',
    about: 'Office VEGA туралы',
    checkUpdates: 'Жаңартуларды тексеру…',
    version: 'Нұсқа',
    license: 'Лицензия',
    privacy: 'Құпиялылық саясаты',
  },
  az: {
    window: 'Pəncərə',
    minimize: 'Kiçilt',
    closeWindow: 'Pəncərəni bağla',
    edit: 'Redaktə edin',
    undo: 'Geri al',
    redo: 'Təkrarla',
    delete: 'Sil',
    view: 'Görünüş',
    reload: 'Yenidən yüklə',
    forceReload: 'Məcburi yenilə',
    toggleDevTools: 'Tərtibatçı alətləri',
    actualSize: 'Həqiqi ölçü',
    zoomIn: 'Böyüt',
    zoomOut: 'Kiçilt',
    fullscreen: 'Tam ekran',
    help: 'Kömək',
    about: 'Office VEGA haqqında',
    checkUpdates: 'Yeniləmələri yoxla…',
    version: 'Versiya',
    license: 'Lisenziya',
    privacy: 'Məxfilik siyasəti',
  },
  tk: {
    window: 'Penjire',
    minimize: 'Kiçelt',
    closeWindow: 'Penjiräni ýap',
    edit: 'Redaktirle',
    undo: 'Yza al',
    redo: 'Gaýtala',
    delete: 'Poz',
    view: 'Görkez',
    reload: 'Täzeden ýükle',
    forceReload: 'Täzeden ýüklemäni mejbur et',
    toggleDevTools: 'Dörediji gurallary',
    actualSize: 'Hakyky ölçeg',
    zoomIn: 'Ulalt',
    zoomOut: 'Kiçelt',
    fullscreen: 'Doly ekran',
    help: 'Kömek',
    about: 'Office VEGA hakda',
    checkUpdates: 'Täzelenmeleri barla…',
    version: 'Wersiýa',
    license: 'Ygtyýarnama',
    privacy: 'Gizlinlik syýasaty',
  },
  ky: {
    window: 'Терезе',
    minimize: 'Минималдаштыруу',
    closeWindow: 'Терезени жабуу',
    edit: 'Түзөтүү',
    undo: 'Артка кайтаруу',
    redo: 'Кайталоо',
    delete: 'Жок кылуу',
    view: 'Көрүнүш',
    reload: 'Кайра жүктөө',
    forceReload: 'Кайра жүктөөгө мажбурлоо',
    toggleDevTools: 'Иштеп чыгуучунун куралдары',
    actualSize: 'Чыныгы өлчөм',
    zoomIn: 'Чоңойтуу',
    zoomOut: 'Кичирейтүү',
    fullscreen: 'Толук экран',
    help: 'Жардам',
    about: 'Office VEGA жөнүндө',
    checkUpdates: 'Жаңыртууларды текшерүү…',
    version: 'Версия',
    license: 'Лицензия',
    privacy: 'Купуялык саясаты',
  },
  tt: {
    window: 'Тәрәзә',
    minimize: 'Кечерәйтү',
    closeWindow: 'Тәрәзәне ябу',
    edit: 'Үзгәртү',
    undo: 'Гамәлне кире кайтару',
    redo: 'Кабатлау',
    delete: 'Бетерү',
    view: 'Күренеш',
    reload: 'Яңадан йөкләү',
    forceReload: 'Мәҗбүри яңадан йөкләү',
    toggleDevTools: 'Әзерләүче кораллары',
    actualSize: 'Чынбарлыктагы зурлык',
    zoomIn: 'Зурайту',
    zoomOut: 'Кечерәйтү',
    fullscreen: 'Тулы экран',
    help: 'Ярдәм',
    about: 'Office VEGA турында',
    checkUpdates: 'Яңартуларны тикшерү…',
    version: 'Версия',
    license: 'Лицензия',
    privacy: 'Хосусыйлык сәясәте',
  },
  ka: {
    window: 'ფანჯარა',
    minimize: 'მინიმიზაცია',
    closeWindow: 'ფანჯრის დახურვა',
    edit: 'რედაქტირება',
    undo: 'გაუქმება',
    redo: 'გამეორება',
    delete: 'წაშლა',
    view: 'ხედი',
    reload: 'ხელახლა ჩატვირთვა',
    forceReload: 'იძულებით გადატვირთვა',
    toggleDevTools: 'დეველოპერის ხელსაწყოები',
    actualSize: 'რეალური ზომა',
    zoomIn: 'გადიდება',
    zoomOut: 'შემცირება',
    fullscreen: 'სრულ ეკრანზე',
    help: 'დახმარება',
    about: 'Office VEGA-ის შესახებ',
    checkUpdates: 'განახლებების შემოწმება…',
    version: 'ვერსია',
    license: 'ლიცენზია',
    privacy: 'კონფიდენციალურობის პოლიტიკა',
  },
}

export function appMenuLabels(lang: string): AppMenuLabels {
  return { ...contextMenuLabels(lang), ...(LABELS[lang] ?? EN) }
}

/** macOS keeps the native role (Minimize/Zoom/Front, window list); Windows/Linux
 * gets only conventional items — no Zoom/Front, and no Ctrl+M accelerator since
 * Windows has no menu shortcut for minimize. */
export function windowMenuTemplate(
  platform: NodeJS.Platform,
  labels: AppMenuLabels,
): MenuItemConstructorOptions {
  if (platform === 'darwin') return { role: 'windowMenu', label: labels.window }
  return {
    label: labels.window,
    submenu: [
      { label: labels.minimize, click: (_item, win) => win?.minimize() },
      { type: 'separator' },
      { label: labels.closeWindow, click: (_item, win) => win?.close() },
    ],
  }
}

/** macOS keeps role:'editMenu' (Speech/Substitutions submenus etc.); elsewhere
 * the same items Electron would generate, with localized labels. */
export function editMenuTemplate(
  platform: NodeJS.Platform,
  labels: AppMenuLabels,
): MenuItemConstructorOptions {
  if (platform === 'darwin') return { role: 'editMenu', label: labels.edit }
  return {
    label: labels.edit,
    submenu: [
      { role: 'undo', label: labels.undo },
      { role: 'redo', label: labels.redo },
      { type: 'separator' },
      { role: 'cut', label: labels.cut },
      { role: 'copy', label: labels.copy },
      { role: 'paste', label: labels.paste },
      { role: 'delete', label: labels.delete },
      { type: 'separator' },
      { role: 'selectAll', label: labels.selectAll },
    ],
  }
}

let lastDetachedDevToolsTarget: WebContents | undefined

/** role:'toggleDevTools' docks DevTools into the window, where the shell's
 * WebContentsView tabs are stacked above it and occlude it — open detached
 * instead, keeping the role's accelerator and toggle semantics. */
export function toggleDevToolsItem(labels: AppMenuLabels): MenuItemConstructorOptions {
  return {
    label: labels.toggleDevTools,
    accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
    click: async () => {
      const { webContents } = await import('electron')
      const focused = webContents.getFocusedWebContents()
      const previous =
        lastDetachedDevToolsTarget && !lastDetachedDevToolsTarget.isDestroyed()
          ? lastDetachedDevToolsTarget
          : undefined
      const wc = !focused || focused === previous?.devToolsWebContents ? previous : focused
      if (!wc) return
      if (wc.isDevToolsOpened()) {
        wc.closeDevTools()
        if (wc === lastDetachedDevToolsTarget) lastDetachedDevToolsTarget = undefined
      } else {
        wc.openDevTools({ mode: 'detach' })
        lastDetachedDevToolsTarget = wc
      }
    },
  }
}

/** role:'viewMenu' expands identically on every platform, so no branch. */
export function viewMenuTemplate(labels: AppMenuLabels): MenuItemConstructorOptions {
  return {
    label: labels.view,
    submenu: [
      { role: 'reload', label: labels.reload },
      { role: 'forceReload', label: labels.forceReload },
      toggleDevToolsItem(labels),
      { type: 'separator' },
      { role: 'resetZoom', label: labels.actualSize },
      { role: 'zoomIn', label: labels.zoomIn },
      { role: 'zoomOut', label: labels.zoomOut },
      { type: 'separator' },
      { role: 'togglefullscreen', label: labels.fullscreen },
    ],
  }
}

/** The manual update check lives in the shell (electron-updater and its
 * result dialogs), while the menus that expose it are built here — the shell
 * injects the check at startup. Read at click time, so registration order
 * relative to menu construction doesn't matter; until registered the menu
 * entry no-ops and the About dialog doesn't offer the button. */
let updateCheckInvoker: (() => void) | null = null

export function setUpdateCheckInvoker(invoke: (() => void) | null): void {
  updateCheckInvoker = invoke
}

/** Help > Check for Updates…: user-triggered update check (sits right above
 * About, like Word). The shell-injected check owns all feedback: the update
 * window when newer exists, "you're up to date (version x)" otherwise. */
export function checkUpdatesMenuItem(labels: AppMenuLabels): MenuItemConstructorOptions {
  return {
    label: labels.checkUpdates,
    click: () => updateCheckInvoker?.(),
  }
}

/** Help > About: a native dialog with the app version — every window's menu
 * gets one, so users can report the exact build they run. */
export function aboutMenuItem(labels: AppMenuLabels): MenuItemConstructorOptions {
  return {
    label: labels.about,
    click: async () => {
      const { app, dialog, clipboard } = await import('electron')
      const version = app.getVersion()
      const canCheck = updateCheckInvoker !== null
      const { response } = await dialog.showMessageBox({
        type: 'info',
        title: 'Office VEGA',
        message: 'Office VEGA',
        detail: `${labels.version} ${version}`,
        buttons: ['OK', labels.copy, ...(canCheck ? [labels.checkUpdates] : [])],
        defaultId: 0,
        cancelId: 0,
      })
      if (response === 1) clipboard.writeText(`Office VEGA ${version}`)
      if (response === 2) updateCheckInvoker?.()
    },
  }
}

/** Opens a text file bundled next to the executable (resources/ in packaged
 * builds, apps/shell/build in dev) in the OS default viewer — the same
 * approach as Third-Party Notices, so legal texts are readable everywhere but
 * never editable inside the suite. The second dev candidate covers standalone
 * app dev, where getAppPath() is apps/<app> and the files live in
 * apps/shell/build. */
async function openBundledText(fileName: string): Promise<void> {
  const { app, shell } = await import('electron')
  const { existsSync } = await import('node:fs')
  const { join } = await import('node:path')
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, fileName)]
    : [
        join(app.getAppPath(), 'build', fileName),
        join(app.getAppPath(), '..', 'shell', 'build', fileName),
      ]
  const target = candidates.find((p) => existsSync(p)) ?? candidates[0]
  if (target) void shell.openPath(target)
}

/** Help > License: opens the bundled EULA. */
export function licenseMenuItem(labels: AppMenuLabels): MenuItemConstructorOptions {
  return {
    label: labels.license,
    click: () => openBundledText('EULA.txt'),
  }
}

/** Help > Privacy Policy: opens the bundled personal-data policy. */
export function privacyMenuItem(labels: AppMenuLabels): MenuItemConstructorOptions {
  return {
    label: labels.privacy,
    click: () => openBundledText('PRIVACY-POLICY.txt'),
  }
}

/** Help menu with Check for Updates… + About + legal docs; extra app-specific
 * items go before the separator. */
export function helpMenuTemplate(
  labels: AppMenuLabels,
  extraItems: MenuItemConstructorOptions[] = [],
): MenuItemConstructorOptions {
  return {
    role: 'help',
    label: labels.help,
    submenu: [
      ...extraItems,
      ...(extraItems.length > 0 ? [{ type: 'separator' } as const] : []),
      checkUpdatesMenuItem(labels),
      aboutMenuItem(labels),
      { type: 'separator' },
      licenseMenuItem(labels),
      privacyMenuItem(labels),
    ],
  }
}
