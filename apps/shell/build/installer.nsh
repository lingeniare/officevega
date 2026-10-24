; Keeps the officevega command line (resources\cli, holding officevega.cmd and the
; extension-less officevega for Git Bash) on the installing user's PATH for the
; lifetime of the install. The value is read and written unexpanded
; (REG_EXPAND_SZ) so entries such as %USERPROFILE%\bin survive, and Explorer
; is told about the change so terminals opened afterwards see it.
; electron-builder compiles the script twice (the second pass, with
; BUILD_UNINSTALLER, only produces the uninstaller); an unreferenced function
; in either pass is a warning makensis treats as an error, hence the guards.
!include "WinMessages.nsh"
!include "StrFunc.nsh"
!include "nsProcess.nsh"

!macro GenOfficeKillHelper NAME
  ${nsProcess::FindProcess} "${NAME}" $R0
  ${if} $R0 == 0
    ${nsProcess::KillProcess} "${NAME}" $R0
    Sleep 300
  ${endIf}
!macroend

; electron-builder's stock CHECK_APP_RUNNING runs powershell.exe via nsExec
; (CREATE_NEW_CONSOLE + SW_HIDE); Windows Terminal as default host ignores
; SW_HIDE, so every silent update flashed a PowerShell window. nsProcess does
; the same work in-process. Used by both the installer and the uninstaller.
!macro customCheckAppRunning
  ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  ${if} $R0 == 0
    ${if} ${isUpdated}
      ; let the app finish quitting on its own
      Sleep 1000
      Goto genofficeStopApp
    ${endIf}
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDOK genofficeStopApp
    Quit

    genofficeStopApp:
    DetailPrint "$(appClosing)"
    ${nsProcess::CloseProcess} "${APP_EXECUTABLE_FILENAME}" $R0
    Sleep 300
    StrCpy $R1 0

    genofficeWaitLoop:
      IntOp $R1 $R1 + 1
      ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
      ${if} $R0 == 0
        Sleep 1000
        ${nsProcess::KillProcess} "${APP_EXECUTABLE_FILENAME}" $R0
        ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
        ${if} $R0 == 0
          DetailPrint `Waiting for "${PRODUCT_NAME}" to close.`
          Sleep 2000
        ${else}
          Goto genofficeAppClosed
        ${endIf}
      ${else}
        Goto genofficeAppClosed
      ${endIf}
      ${if} $R1 > 1
        MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY genofficeWaitLoop
        Quit
      ${else}
        Goto genofficeWaitLoop
      ${endIf}
    genofficeAppClosed:
  ${endIf}
  ; the stock macro closed every process under $INSTDIR; a killed app can
  ; orphan its helpers, which keep their binaries locked
  !insertmacro GenOfficeKillHelper "xlsx-sidecar.exe"
  !insertmacro GenOfficeKillHelper "win-ocr.exe"
  ${nsProcess::Unload}
!macroend

!define OFFICEVEGA_PATH_MAX 7900

; Default the installer UI to Russian: electron-builder's template inserts
; preInit in .onInit before MUI_LANGDLL_DISPLAY (displayLanguageSelector), so
; the language pick dialog opens with Russian already selected — other
; bundled languages stay reachable from the same dialog. ${LANG_RUSSIAN}
; resolves at insertion time, after addLangs' MUI_LANGUAGE lines, so the
; constant is always defined.
!macro preInit
  StrCpy $LANGUAGE ${LANG_RUSSIAN}
!macroend

; Scope templates to our ProgIDs (electron-builder uses fileAssociations.name).
; A shared .ext\ShellNew would overwrite Office/WPS templates. OOXML files
; must be copied from valid packages, never created with NullFile.
!macro OfficeVegaRegisterShellNew EXT PROGID
  WriteRegStr SHELL_CONTEXT "Software\Classes\.${EXT}\${PROGID}\ShellNew" "FileName" "$INSTDIR\resources\shell-new\blank.${EXT}"
!macroend

!macro OfficeVegaUnregisterShellNew EXT PROGID
  ; Only remove our own registration, including when uninstalling for an update.
  ReadRegStr $0 SHELL_CONTEXT "Software\Classes\.${EXT}\${PROGID}\ShellNew" "FileName"
  ${If} $0 == "$INSTDIR\resources\shell-new\blank.${EXT}"
    DeleteRegKey SHELL_CONTEXT "Software\Classes\.${EXT}\${PROGID}\ShellNew"
    DeleteRegKey /ifempty SHELL_CONTEXT "Software\Classes\.${EXT}\${PROGID}"
  ${EndIf}
!macroend

; Per-language legal texts. electron-builder auto-emits its own licensePage
; only when build/ holds license.*/eula.* or localized license_*/eula_*
; files; our EULA-RU/EULA-EN/PRIVACY-POLICY-* names match neither detector,
; so no built-in license page exists and customWelcomePage installs the EULA
; screen in the same slot (first page, before the install-mode choice).
; LicenseLangString/LangString are per-language: English (LCID 1033) reads
; the *-EN.txt file / gets the English header, every other bundled installer
; language reads the Russian text. The LCID list is electron-builder's
; bundledLanguages (app-builder-lib/out/util/langs.js) — keep it in sync if
; nsis.installerLanguages ever changes; an LCID without a string falls back
; to the English value. All legal txt files must stay UTF-8 WITH BOM or
; Cyrillic breaks in the Unicode installer.
!macro OfficeVegaLegalLangStrings LSTRING ENFILE RUFILE
  LicenseLangString ${LSTRING} 1033 "${BUILD_RESOURCES_DIR}\${ENFILE}"
  LicenseLangString ${LSTRING} 1031 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1036 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 3082 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 2052 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1028 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1041 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1042 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1040 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1043 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1030 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1053 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1044 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1035 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1049 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 2070 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1046 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1045 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1058 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1029 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1051 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1038 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1025 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1055 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1054 "${BUILD_RESOURCES_DIR}\${RUFILE}"
  LicenseLangString ${LSTRING} 1066 "${BUILD_RESOURCES_DIR}\${RUFILE}"
!macroend

!macro OfficeVegaLangStrings LSTRING ENTEXT RUTEXT
  LangString ${LSTRING} 1033 "${ENTEXT}"
  LangString ${LSTRING} 1031 "${RUTEXT}"
  LangString ${LSTRING} 1036 "${RUTEXT}"
  LangString ${LSTRING} 3082 "${RUTEXT}"
  LangString ${LSTRING} 2052 "${RUTEXT}"
  LangString ${LSTRING} 1028 "${RUTEXT}"
  LangString ${LSTRING} 1041 "${RUTEXT}"
  LangString ${LSTRING} 1042 "${RUTEXT}"
  LangString ${LSTRING} 1040 "${RUTEXT}"
  LangString ${LSTRING} 1043 "${RUTEXT}"
  LangString ${LSTRING} 1030 "${RUTEXT}"
  LangString ${LSTRING} 1053 "${RUTEXT}"
  LangString ${LSTRING} 1044 "${RUTEXT}"
  LangString ${LSTRING} 1035 "${RUTEXT}"
  LangString ${LSTRING} 1049 "${RUTEXT}"
  LangString ${LSTRING} 2070 "${RUTEXT}"
  LangString ${LSTRING} 1046 "${RUTEXT}"
  LangString ${LSTRING} 1045 "${RUTEXT}"
  LangString ${LSTRING} 1058 "${RUTEXT}"
  LangString ${LSTRING} 1029 "${RUTEXT}"
  LangString ${LSTRING} 1051 "${RUTEXT}"
  LangString ${LSTRING} 1038 "${RUTEXT}"
  LangString ${LSTRING} 1025 "${RUTEXT}"
  LangString ${LSTRING} 1055 "${RUTEXT}"
  LangString ${LSTRING} 1054 "${RUTEXT}"
  LangString ${LSTRING} 1066 "${RUTEXT}"
!macroend

; First legal screen: the EULA license page (the slot electron-builder's
; own licensePage would occupy). skipPageIfUpdated mirrors the neighboring
; pages: updates don't re-ask. The page keeps the stock MUI license header
; (already localized per language by the language files), so no
; MUI_PAGE_HEADER_* overrides here.
!macro customWelcomePage
  !insertmacro skipPageIfUpdated
  !insertmacro OfficeVegaLegalLangStrings OfficeVegaEula EULA-EN.txt EULA-RU.txt
  !insertmacro MUI_PAGE_LICENSE "$(OfficeVegaEula)"
!macroend

; Second legal screen: "Privacy Policy" right after the folder choice, before
; any file is copied. NSIS license pages require acceptance to continue, so
; both documents are accepted before installation. The shipped texts live in
; build/PRIVACY-POLICY-RU.txt and build/PRIVACY-POLICY-EN.txt and are also
; packaged into resources/ for Help > Privacy Policy.
; skipPageIfUpdated mirrors the neighboring pages: updates don't re-ask.
; NOTE: the template arms MUI_PAGE_CUSTOMFUNCTION_PRE=instFilesPre for the
; page right after the directory page, so our own skipPageIfUpdated would
; fail with "!define already defined". Release the slot first, then re-arm
; instFilesPre for the instfiles page (MUI_PAGE_LICENSE consumes the slot).
!macro customPageAfterChangeDir
  !ifdef MUI_PAGE_CUSTOMFUNCTION_PRE
    !undef MUI_PAGE_CUSTOMFUNCTION_PRE
  !endif
  !insertmacro skipPageIfUpdated
  !insertmacro OfficeVegaLegalLangStrings OfficeVegaPrivacy PRIVACY-POLICY-EN.txt PRIVACY-POLICY-RU.txt
  !insertmacro OfficeVegaLangStrings OfficeVegaPrivacyHdr "Personal Data Processing Policy" "Политика обработки ПДн"
  ; product name spelled out: $(^NameDA) would not expand inside a LangString value
  !insertmacro OfficeVegaLangStrings OfficeVegaPrivacySub "Please review the personal data processing policy before installing OfficeVega." "Перед установкой OfficeVega ознакомьтесь с политикой обработки персональных данных."
  ; MUI_PAGE_HEADER_* apply to the next inserted page only: MUI_HEADER_TEXT_PAGE
  ; (in the license page's PRE function) consumes and unsets them, so the EULA
  ; screen keeps its stock localized title. The values must be quoted tokens —
  ; makensis strips the quotes when ${} expands them into the page's STR:
  ; header text; an unquoted multi-word value fails "!define" parsing.
  ; $(...) references resolve to the per-language LangStrings defined above.
  !define MUI_PAGE_HEADER_TEXT "$(OfficeVegaPrivacyHdr)"
  !define MUI_PAGE_HEADER_SUBTEXT "$(OfficeVegaPrivacySub)"
  !insertmacro MUI_PAGE_LICENSE "$(OfficeVegaPrivacy)"
  !ifdef allowToChangeInstallationDirectory
    !define MUI_PAGE_CUSTOMFUNCTION_PRE instFilesPre
  !endif
!macroend

!macro customInstall
  Push "$INSTDIR\resources\cli"
  Call OfficeVegaAddToUserPath
  !insertmacro OfficeVegaRegisterShellNew "docx" "Word Document"
  !insertmacro OfficeVegaRegisterShellNew "xlsx" "Excel Workbook"
  !insertmacro OfficeVegaRegisterShellNew "pptx" "PowerPoint Presentation"
  !insertmacro UPDATEFILEASSOC
!macroend

!macro customUnInstall
  Push "$INSTDIR\resources\cli"
  Call un.OfficeVegaRemoveFromUserPath
  Push $0
  !insertmacro OfficeVegaUnregisterShellNew "docx" "Word Document"
  !insertmacro OfficeVegaUnregisterShellNew "xlsx" "Excel Workbook"
  !insertmacro OfficeVegaUnregisterShellNew "pptx" "PowerPoint Presentation"
  Pop $0
  !insertmacro UPDATEFILEASSOC
!macroend

!ifndef BUILD_UNINSTALLER
${StrStr}

Function OfficeVegaAddToUserPath
  Exch $0 ; directory
  Push $1
  Push $2
  Push $3
  ReadRegStr $1 HKCU "Environment" "Path"
  StrLen $2 $1
  ; leave an already oversized PATH alone rather than truncate it
  IntCmp $2 ${OFFICEVEGA_PATH_MAX} done 0 done
  ${StrStr} $3 ";$1;" ";$0;"
  StrCmp $3 "" 0 done
  StrCmp $1 "" 0 +3
    StrCpy $1 "$0"
    Goto write
  StrCpy $1 "$1;$0"
write:
  WriteRegExpandStr HKCU "Environment" "Path" $1
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
done:
  Pop $3
  Pop $2
  Pop $1
  Pop $0
FunctionEnd
!endif

!ifdef BUILD_UNINSTALLER
${UnStrStr}
${UnStrRep}

Function un.OfficeVegaRemoveFromUserPath
  Exch $0 ; directory
  Push $1
  Push $2
  ReadRegStr $1 HKCU "Environment" "Path"
  StrCmp $1 "" done
  ${UnStrStr} $2 ";$1;" ";$0;"
  StrCmp $2 "" done
  StrCpy $1 ";$1;"
  ${UnStrRep} $1 $1 ";$0;" ";"
  ; strip the sentinels added above
  StrCpy $1 $1 -1
  StrCpy $1 $1 "" 1
  WriteRegExpandStr HKCU "Environment" "Path" $1
  SendMessage ${HWND_BROADCAST} ${WM_WININICHANGE} 0 "STR:Environment" /TIMEOUT=5000
done:
  Pop $2
  Pop $1
  Pop $0
FunctionEnd
!endif
