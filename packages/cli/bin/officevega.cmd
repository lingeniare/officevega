@echo off
rem officevega launcher for the packaged Windows app: <install>\resources\cli\officevega.cmd
setlocal
set ELECTRON_RUN_AS_NODE=1
"%~dp0..\..\OfficeVega.exe" "%~dp0officevega.cjs" %*
endlocal
