@if (@CodeSection == @Batch) @then
@echo off
cd /d "%~dp0"
start /min "" wscript.exe "%~dp0run.vbs"
exit /b
@end
