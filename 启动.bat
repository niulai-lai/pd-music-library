@echo off
chcp 65001 >nul
title 公有领域音乐图书馆 - 本地服务器
cd /d "%~dp0"

set PORT=8080

rem 若 8080 已被占用，换用 8180
netstat -ano | findstr ":%PORT% " | findstr LISTENING >nul 2>nul
if not errorlevel 1 set PORT=8180

where python >nul 2>nul
if not errorlevel 1 (
  start "公有领域音乐图书馆服务器" /min python -m http.server %PORT%
) else (
  where py >nul 2>nul
  if not errorlevel 1 (
    start "公有领域音乐图书馆服务器" /min py -m http.server %PORT%
  ) else (
    echo 未找到 Python，将直接以文件方式打开（功能完整，数据读取 data/music.js）。
    timeout /t 2 /nobreak >nul
    start "" "index.html"
    exit /b
  )
)

echo 正在打开默认浏览器：http://localhost:%PORT%/
timeout /t 1 /nobreak >nul
start "" "http://localhost:%PORT%/"
echo.
echo 本地服务器已启动（任务栏最小化窗口"公有领域音乐图书馆服务器"）。
echo 关闭那个窗口即可停止服务器。直接关闭本窗口不影响运行。
timeout /t 4 /nobreak >nul
