# OfficeVega इंस्टॉल करना

हर बिल्ड [Releases पेज](https://officevega.com/releases) पर प्रकाशित होता है। सभी बिल्ड `main` से बनते हैं, और Windows के इंस्टॉलर हस्ताक्षरित (signed) होते हैं।

## अपनी मशीन के लिए फ़ाइल चुनें

| प्लेटफ़ॉर्म                          | आवश्यकताएँ                                            | फ़ाइल                 |
| ------------------------------------ | ----------------------------------------------------- | --------------------- |
| **Windows** — अधिकतर PC              | Windows 10+, Intel/AMD                                | `-x64.exe` इंस्टॉलर   |
| **Windows** पर Arm                   | Arm पर Windows 11 (Snapdragon X और समान)              | `-arm64.exe` इंस्टॉलर |
<!-- अन्य प्लेटफ़ॉर्म बाद में आएँगे; अभी केवल Windows
| **macOS** — Apple Silicon            | macOS 11+                                             | `.dmg` (arm64)        |
| **macOS** — Intel                    | macOS 11+                                             | `.dmg` (x64)          |
| **Linux** — Debian / Ubuntu          | x86_64, glibc 2.34+ (Ubuntu 22.04 या नया)             | `.deb`                |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+ (Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm`                |
| **Linux** — कोई भी अन्य              | x86_64, glibc 2.34+, FUSE 2                           | `.AppImage`           |
-->

पुराने संस्करण Releases पेज पर ही उपलब्ध रहते हैं।

<!--
## macOS पर

`.dmg` खोलें और **OfficeVega** को Applications में खींचें। Intel बिल्ड में पहली बार चलाने पर यह खोलने की पुष्टि माँगता है: Applications में ऐप पर राइट-क्लिक करके ▸ Open चुनें। यह बिना हस्ताक्षर वाली डिस्क इमेज के सामने Gatekeeper की जाँच है, कोई क्षतिग्रस्त डाउनलोड नहीं।
-->

## Windows पर

`.exe` इंस्टॉलर चलाएँ। यह OfficeVega को Start मेन्यू में रखता है और `.docx`, `.xlsx`, `.pptx`, `.pdf` तथा इन जैसे प्रकार पंजीकृत कर देता है, ताकि किसी फ़ाइल पर डबल-क्लिक करने पर वह खुल जाए।

<!--
## Linux पर

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Fedora / RHEL family
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — बिना किसी इंस्टॉल चरण के, जहाँ है वहीं चलता है:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

इसके लिए FUSE 2 रनटाइम चाहिए। यदि आप इसे इंस्टॉल नहीं करना चाहते, तो `--appimage-extract-and-run` के साथ चलाएँ; तब सैंडबॉक्स निकाली गई डायरेक्टरी से काम करता है।
-->

## आप जो बिल्ड चला रहे हैं

**Settings ▸ About** वही जगह है जहाँ ऐप बताता है कि आपके पास कौन-सा बिल्ड है, वह कौन-सा चैनल फ़ॉलो करता है और प्रोजेक्ट कहाँ है। जब उसी चैनल पर नया बिल्ड प्रकाशित होता है, तो वही पैनल अपडेट दिखाता है।

![Settings ▸ About, जिसमें इंस्टॉल किया गया संस्करण, ऐप जो अपडेट चैनल फ़ॉलो करता है और प्रोजेक्ट साइट का लिंक दिखते हैं](img/install.png)

<!--
## तीन और तरीके

तीनों तरीके ऐप को दोबारा बनाने के बजाय प्रकाशित आर्टिफ़ैक्ट को ही लपेटते हैं, इसलिए वे आधिकारिक बाइनरी के साथ चलते हैं।

- **Flatpak** — Flatpak के `extra-data` तंत्र से `.deb` इंस्टॉल करता है और Zypak के अंतर्गत चलाता है, जो Electron के अपने सैंडबॉक्स को अनुकूलित करता है। `/app` ट्री केवल पढ़ने योग्य है, इसलिए अपडेट ऐप के भीतर के अपडेट डायलॉग के बजाय Flatpak के ज़रिए आते हैं।
- **Nix** — एक पैकेज एक्सप्रेशन, जिसे आप सोर्स चेकआउट से `nix-build packaging/nix` के साथ बनाते हैं; देखें `packaging/nix`।
- **Docker** — बिना इंटरफ़ेस वाली बैच-कन्वर्ज़न इमेज (`packaging/docker`)। यह ऐप की अपनी एक्सपोर्ट पाइपलाइन से Office, Markdown और HTML दस्तावेज़ों के पूरे पेड़ को PDF में बदलती है, इसलिए आउटपुट वही होता है जो File ▸ Export देता। यह एक CLI टूल है, सर्वर नहीं।
-->

## कमांड लाइन भी साथ आती है

हर इंस्टॉल में `officevega` कमांड आती है, जो उन्हीं इंजनों से बात करती है जिनसे विंडो काम करती है, इसलिए दोनों किसी फ़ाइल के बारे में कभी असहमत नहीं होते। यह ऐप बंडल के भीतर रहती है; `officevega install-cli` इसे आपके `PATH` में रख देता है। यह क्या कर सकती है, यह जानने के लिए **Command line and agents** देखें।

## सहायता

- वेबसाइट: [officevega.com](https://officevega.com), रिलीज़: [officevega.com/releases](https://officevega.com/releases).
- मदद और फ़ीडबैक: [officevega.com/feedback](https://officevega.com/feedback), Telegram चैनल: [t.me/getmyai](https://t.me/getmyai).
- डेवलपर: [getmyai.io](https://getmyai.io) (दिमित्री फिलिपोव), ईमेल: [mail@vega.chat](mailto:mail@vega.chat).
