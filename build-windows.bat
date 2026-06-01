@echo off
REM =========================================================
REM  Prava Online — Windows installer (.exe va .msi) qurish
REM  Bu faylni oddiy CMD yoki PowerShell dan ishga tushiring
REM  (Git Bash dan EMAS — link.exe ziddiyati bo'ladi)
REM =========================================================

echo.
echo ==========================================
echo  Prava Online Windows Build
echo ==========================================
echo.

REM Visual Studio 2022 muhitini yoqish
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if not exist "%VSWHERE%" (
    set "VSWHERE=%ProgramFiles%\Microsoft Visual Studio\Installer\vswhere.exe"
)

if exist "%VSWHERE%" (
    for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -property installationPath`) do set "VS_PATH=%%i"
    if defined VS_PATH (
        echo Visual Studio: %VS_PATH%
        call "%VS_PATH%\VC\Auxiliary\Build\vcvars64.bat" 2>nul || (
            echo [XATO] C++ Build Tools topilmadi!
            echo.
            echo Visual Studio Installer'ni oching va
            echo "Desktop development with C++" workload'ini o'rnating.
            pause
            exit /b 1
        )
    ) else (
        echo [XATO] Visual Studio topilmadi!
        pause
        exit /b 1
    )
) else (
    echo [OGOHLANTIRISH] vswhere.exe topilmadi. VS muhiti o'rnatilmagan bo'lishi mumkin.
)

echo.
echo npm paketlarni tekshirilmoqda...
call npm ci
if errorlevel 1 (
    echo [XATO] npm ci muvaffaqiyatsiz
    pause
    exit /b 1
)

echo.
echo Tauri build boshlanmoqda...
call npx tauri build
if errorlevel 1 (
    echo.
    echo [XATO] Build muvaffaqiyatsiz tugadi!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo  BUILD MUVAFFAQIYATLI!
echo ==========================================
echo.
echo Installerlar quyidagi papkada:
echo   src-tauri\target\release\bundle\
echo.
echo   .exe  →  nsis\
echo   .msi  →  msi\
echo.
pause
