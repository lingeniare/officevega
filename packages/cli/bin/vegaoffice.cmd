@echo off
rem vegaoffice launcher for the packaged Windows app: <install>\resources\cli\vegaoffice.cmd
setlocal
set ELECTRON_RUN_AS_NODE=1
"%~dp0..\..\VegaOffice.exe" "%~dp0vegaoffice.cjs" %*
endlocal
