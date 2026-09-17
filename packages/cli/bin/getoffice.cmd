@echo off
rem getoffice launcher for the packaged Windows app: <install>\resources\cli\getoffice.cmd
setlocal
set ELECTRON_RUN_AS_NODE=1
"%~dp0..\..\GetOffice.exe" "%~dp0getoffice.cjs" %*
endlocal
