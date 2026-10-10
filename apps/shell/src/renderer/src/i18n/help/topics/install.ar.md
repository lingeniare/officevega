# تثبيت OfficeVega

كل إصدار منشور موجود في [صفحة الإصدارات](https://officevega.com/releases). جميعها مبنية من `main`، وملفات تثبيت Windows موقّعة.

## اختر الملف المناسب لجهازك

| المنصة                               | المتطلبات                                             | الملف                  |
| ------------------------------------ | ----------------------------------------------------- | ---------------------- |
| **Windows** — معظم أجهزة PC          | Windows 10+، Intel/AMD                                | ملف التثبيت `-x64.exe`   |
| **Windows** على Arm                  | Windows 11 على Arm (Snapdragon X وما شابهه)           | ملف التثبيت `-arm64.exe` |
<!-- ستتوفر الأنظمة الأخرى لاحقًا؛ Windows فقط حاليًا
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)         |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)           |
| **Linux** — Debian / Ubuntu          | x86_64، glibc 2.34+ (Ubuntu 22.04 أو أحدث)            | `.deb`                 |
| **Linux** — Fedora / RHEL / openSUSE | x86_64، glibc 2.34+ (Fedora 35+، RHEL 9+، Leap 15.6+) | `.rpm`                 |
| **Linux** — أي نظام آخر              | x86_64، glibc 2.34+، FUSE 2                           | `.AppImage`            |
-->

تبقى الإصدارات الأقدم في صفحة الإصدارات.

<!--
## على macOS

افتح ملف `.dmg` واسحب **OfficeVega** إلى مجلد التطبيقات. في نسخة Intel يطلب التشغيل الأول تأكيد الفتح: انقر بالزر الأيمن على التطبيق داخل التطبيقات ▸ فتح. هذا إجراء Gatekeeper أمام صورة قرص تبدو غير موقّعة، وليس تنزيلًا تالفًا.
-->

## على Windows

شغّل ملف التثبيت `.exe`. يضع OfficeVega في قائمة ابدأ، ويسجّل `.docx` و`.xlsx` و`.pptx` و`.pdf` وغيرها، فيُفتح الملف بنقرة مزدوجة.

<!--
## على Linux

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — يعمل من مكانه بلا خطوة تثبيت:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

يحتاج إلى بيئة FUSE 2. إن لم ترغب في تثبيتها فشغّله مع `--appimage-extract-and-run`، وتعمل البيئة المعزولة من المجلد المستخرج.
-->

## النسخة التي تعمل بها

**الإعدادات ▸ حول** هو المكان الذي يعرض فيه التطبيق النسخة المثبّتة لديك، والقناة التي يتبعها، وموقع المشروع. وعندما تُنشر نسخة أحدث على تلك القناة، تعرض اللوحة نفسها التحديث.

![الإعدادات ▸ حول، وفيها الإصدار المثبّت، وقناة التحديث التي يتبعها التطبيق، ورابط موقع المشروع](img/install.png)

<!--
## ثلاث طرق أخرى

تغلّف الطرق الثلاث الملفات المنشورة بدلًا من إعادة بناء التطبيق، لذلك تتبع الملفات الثنائية الرسمية.

- **Flatpak** — يثبّت ملف `.deb` عبر آلية `extra-data` في Flatpak ويشغّله تحت Zypak، الذي يكيّف البيئة المعزولة الخاصة بـ Electron. مسار `/app` للقراءة فقط، لذلك تمر التحديثات عبر Flatpak بدلًا من نافذة التحديث داخل التطبيق.
- **Nix** — تعبير حزمة تبنيه من نسخة المصدر عبر `nix-build packaging/nix`؛ انظر `packaging/nix`.
- **Docker** — صورة تحويل جماعي بلا واجهة (`packaging/docker`). تحوّل شجرة كاملة من مستندات Office وMarkdown وHTML إلى PDF عبر مسار التصدير الخاص بالتطبيق، فتكون النتيجة مطابقة لما ينتجه الأمر ملف ▸ تصدير. إنها أداة سطر أوامر، وليست خادمًا.
-->

## سطر الأوامر يأتي معه

يتضمن كل تثبيت أمر `officevega` الذي يتصل بالمحرّكات نفسها التي تعمل بها النافذة، فلا يختلف الاثنان في التعامل مع أي ملف. وهو موجود داخل حزمة التطبيق؛ والأمر `officevega install-cli` يضعه في `PATH` لديك. انظر **سطر الأوامر والوكلاء** لمعرفة ما يستطيع فعله.

## الدعم

- الموقع: [officevega.com](https://officevega.com)، والإصدارات: [officevega.com/releases](https://officevega.com/releases).
- المساعدة والملاحظات: [officevega.com/feedback](https://officevega.com/feedback)، وقناة Telegram: [t.me/getmyai](https://t.me/getmyai).
- المطوّر: [getmyai.io](https://getmyai.io) (دميتري فيليبوف)، البريد: [mail@vega.chat](mailto:mail@vega.chat).
