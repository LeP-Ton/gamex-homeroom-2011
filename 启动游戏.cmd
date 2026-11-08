@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 22.12 或更新版本，然后重新打开本文件。
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  echo 正在安装游戏依赖，首次运行需要网络连接。
  call npm.cmd install
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)
echo 正在启动高三班主任模拟器：2011，关闭此窗口将停止本地服务。
call npm.cmd run dev -- --open
pause
