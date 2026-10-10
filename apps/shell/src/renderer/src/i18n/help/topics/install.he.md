# התקנת OfficeVega

כל גרסה מתפרסמת ב[דף הגרסאות](https://officevega.com/releases). כולן נבנות מ-`main`, ומתקיני Windows חתומים.

## בחירת הקובץ למחשב שלך

| פלטפורמה                             | דרישות                                                | קובץ               |
| ------------------------------------ | ----------------------------------------------------- | ------------------ |
| **Windows** — רוב ה-PC               | Windows 10+, Intel/AMD                                | מתקין `-x64.exe`   |
| **Windows** על Arm                   | Windows 11 על Arm (Snapdragon X ודומה)                | מתקין `-arm64.exe` |
<!-- פלטפורמות אחרות יגיעו בהמשך; כרגע Windows בלבד
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)     |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)       |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 או חדש יותר)        | `.deb`             |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`             |
| **Linux** — כל דבר אחר               | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`        |
-->

גרסאות ישנות יותר נשארות בדף ההפצות.

<!--
## ב-macOS

פתחו את ה-`.dmg` וגררו את **OfficeVega** אל Applications. בגרסת Intel ההפעלה הראשונה מבקשת אישור לפתיחה: לחצו לחיצה ימנית על האפליקציה ב-Applications ▸ פתיחה. זהו Gatekeeper מול תמונת דיסק שנראית לא חתומה, ולא הורדה פגומה.
-->

## ב-Windows

הפעילו את מתקין ה-`.exe`. הוא מוסיף את OfficeVega לתפריט ההתחלה ורושם את `.docx`, `.xlsx`, `.pptx`, `.pdf` ודומיהם, כך שלחיצה כפולה על קובץ פותחת אותו.

<!--
## ב-Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — רץ ממקומו, בלי שלב התקנה:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

הוא דורש את סביבת הריצה FUSE 2. אם אינכם רוצים להתקין אותה, הפעילו אותו עם `--appimage-extract-and-run`, ואז הסביבה המבודדת פועלת מהתיקייה שחולצה.
-->

## הגרסה שאתם מריצים

**הגדרות ▸ אודות** הוא המקום שבו האפליקציה מציגה את הגרסה שלכם, את הערוץ שאחריו היא עוקבת ואת מיקום הפרויקט. כאשר מתפרסמת גרסה חדשה יותר בערוץ הזה, אותו חלון מציע את העדכון.

![הגדרות ▸ אודות, עם הגרסה המותקנת, ערוץ העדכון שאחריו האפליקציה עוקבת וקישור האתר של הפרויקט](img/install.png)

<!--
## שלוש דרכים נוספות

שלוש הדרכים עוטפות את הקבצים שפורסמו במקום לבנות את האפליקציה מחדש, ולכן הן עוקבות אחרי הקבצים הבינאריים הרשמיים.

- **Flatpak** — מתקין את ה-`.deb` דרך מנגנון `extra-data` של Flatpak ומריץ אותו תחת Zypak, שמתאים את הסביבה המבודדת של Electron עצמו. עץ `/app` הוא לקריאה בלבד, ולכן העדכונים עוברים דרך Flatpak ולא דרך חלון העדכון שבתוך האפליקציה.
- **Nix** — ביטוי חבילה שבונים מתוך עותק המקור באמצעות `nix-build packaging/nix`; ראו `packaging/nix`.
- **Docker** — תמונת המרה אצווה ללא ממשק גרפי (`packaging/docker`). היא ממירה עץ שלם של מסמכי Office, Markdown ו-HTML ל-PDF דרך צינור הייצוא של האפליקציה עצמה, כך שהפלט זהה למה שהייתה מפיקה הפקודה קובץ ▸ ייצוא. זהו כלי שורת פקודה, לא שרת.
-->

## שורת הפקודה מגיעה איתה

כל התקנה כוללת את הפקודה `officevega` שמתקשרת עם אותם מנועים שהחלון עובד איתם, כך שהשניים לעולם לא חלוקים לגבי קובץ. היא נמצאת בתוך חבילת האפליקציה; הפקודה `officevega install-cli` מציבה אותה ב-`PATH` שלכם. ראו **שורת פקודה וסוכנים** למה שהיא יודעת לעשות.

## תמיכה

- אתר: [officevega.com](https://officevega.com), גרסאות: [officevega.com/releases](https://officevega.com/releases).
- עזרה ומשוב: [officevega.com/feedback](https://officevega.com/feedback), ערוץ טלגרם: [t.me/getmyai](https://t.me/getmyai).
- מפתח: [getmyai.io](https://getmyai.io) (דמיטרי פיליפוב), דוא"ל: [mail@vega.chat](mailto:mail@vega.chat).
