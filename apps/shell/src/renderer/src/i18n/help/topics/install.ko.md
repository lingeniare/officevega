# OfficeVega 설치

모든 빌드는 [릴리스 페이지](https://officevega.com/releases)에 게시됩니다. 모두 `main`에서 만들어지며, Windows 설치 파일은 서명되어 있습니다.

## 내 컴퓨터에 맞는 파일 고르기

| 플랫폼                    | 필요한 것                       | 파일                       |
| ------------------------- | ------------------------------- | -------------------------- |
| **Windows** — 대부분의 PC | Windows 10+, Intel/AMD          | `-x64.exe` 설치 파일       |
| **Windows** (Arm)         | Arm용 Windows 11(Snapdragon X 등) | `-arm64.exe` 설치 파일   |
<!-- 다른 플랫폼은 나중에 추가될 예정입니다. 지금은 Windows만 지원합니다
| **macOS** — Apple Silicon | macOS 11+                       | `.dmg` (arm64)             |
| **macOS** — Intel         | macOS 11+                       | `.dmg` (x64)               |
| **Linux** — Debian / Ubuntu | x86_64, glibc 2.34+(Ubuntu 22.04 이상) | `.deb`             |
| **Linux** — Fedora / RHEL / openSUSE | x86_64, glibc 2.34+(Fedora 35+, RHEL 9+, Leap 15.6+) | `.rpm` |
| **Linux** — 그 밖의 배포판 | x86_64, glibc 2.34+, FUSE 2    | `.AppImage`                |
-->

이전 버전은 릴리스 페이지에 그대로 있습니다.

<!--
## macOS에서

`.dmg`를 열고 **OfficeVega**를 응용 프로그램 폴더로 끌어다 놓습니다. Intel 빌드에서는 처음 실행할 때 열기를 확인하라고 묻습니다. 그럴 때는 응용 프로그램 폴더에서 앱을 우클릭한 뒤 열기를 선택하세요. 이는 손상된 다운로드가 아니라, 서명이 없는 것처럼 보이는 디스크 이미지에 대해 Gatekeeper가 보이는 반응입니다.
-->

## Windows에서

`.exe` 설치 파일을 실행합니다. OfficeVega가 시작 메뉴에 등록되고, `.docx`, `.xlsx`, `.pptx`, `.pdf` 등의 파일을 더블클릭하면 열리도록 연결됩니다.

<!--
## Linux에서

**Debian / Ubuntu**

```sh
sudo apt install ./officevega_<version>_amd64.deb
```

**Fedora / RHEL / openSUSE**

```sh
sudo dnf install ./officevega-<version>.x86_64.rpm     # Fedora / RHEL 계열
sudo zypper install ./officevega-<version>.x86_64.rpm  # openSUSE
```

**AppImage** — 설치 과정 없이 그 자리에서 바로 실행됩니다:

```sh
chmod +x OfficeVega-<version>.AppImage
./OfficeVega-<version>.AppImage
```

FUSE 2 런타임이 필요합니다. 설치하고 싶지 않다면 `--appimage-extract-and-run` 옵션으로 실행하세요. 그러면 압축을 풀어 놓은 디렉터리에서 샌드박스가 동작합니다.
-->

## 지금 실행 중인 빌드

**설정 ▸ 정보**에서 현재 설치된 빌드, 따라가는 업데이트 채널, 프로젝트 위치를 확인할 수 있습니다. 해당 채널에 더 새로운 빌드가 올라오면 같은 화면에서 업데이트를 제안합니다.

![설정 ▸ 정보: 설치된 버전, 앱이 따르는 업데이트 채널, 프로젝트 사이트 링크](img/install.png)

<!--
## 그 밖의 세 가지 방법

세 방법 모두 앱을 새로 빌드하지 않고 게시된 배포 파일을 감싸서 쓰므로, 공식 바이너리를 그대로 따라갑니다.

- **Flatpak** — Flatpak의 `extra-data` 방식으로 `.deb`를 설치하고, Electron 자체 샌드박스를 맞춰 주는 Zypak으로 실행합니다. `/app` 트리는 읽기 전용이므로, 업데이트는 앱 내 업데이트 창이 아니라 Flatpak을 통해 이루어집니다.
- **Nix** — 소스를 받은 뒤 `nix-build packaging/nix`로 빌드하는 패키지 표현식입니다. `packaging/nix`를 참고하세요.
- **Docker** — 헤드리스 일괄 변환 이미지(`packaging/docker`)입니다. Office, Markdown, HTML 문서가 든 폴더 전체를 앱 자체 내보내기 파이프라인으로 PDF로 변환하므로, 결과물은 파일 ▸ 내보내기로 얻는 것과 같습니다. 서버가 아니라 명령줄 도구입니다.
-->

## 명령줄 도구도 함께 설치됩니다

모든 설치본에는 `officevega` 명령이 포함되어 있습니다. 이 명령은 창과 같은 엔진을 사용하므로, 같은 파일을 두고 둘이 서로 다르게 판단하는 일이 없습니다. 앱 번들 안에 들어 있으며, `officevega install-cli`를 실행하면 `PATH`에 등록됩니다. 어떤 일을 할 수 있는지는 **명령줄과 에이전트**를 참고하세요.

## 지원

- 웹사이트: [officevega.com](https://officevega.com), 릴리스: [officevega.com/releases](https://officevega.com/releases).
- 도움말과 의견: [officevega.com/feedback](https://officevega.com/feedback), 텔레그램 채널: [t.me/getmyai](https://t.me/getmyai).
- 개발자: [getmyai.io](https://getmyai.io) (드미트리 필리포프), 이메일: [mail@vega.chat](mailto:mail@vega.chat).
