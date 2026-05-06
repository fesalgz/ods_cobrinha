@echo off
title Instalador do Sistema
echo ===================================================
echo INSTALANDO O SISTEMA DE ORDENS DE SERVICO
echo ===================================================
echo.
echo Verificando se o Node.js esta instalado...

node -v >nul 2>&1
if errorlevel 1 goto install_node

echo Node.js ja esta instalado!
goto install_deps

:install_node
echo Node.js nao encontrado! Iniciando o download e instalacao automatica (isso pode demorar alguns minutos)...
echo Baixando o Node.js LTS...
powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -OutFile '$env:TEMP\node_installer.msi'"

echo Instalando o Node.js silenciosamente...
msiexec /i "%TEMP%\node_installer.msi" /quiet /norestart

echo.
echo Node.js instalado!
echo ATENCAO: Como uma nova instalacao do Node foi feita, ela so funcionara na proxima vez que voce abrir um script.
echo Por favor, feche esta janela e de dois cliques no "instalar.bat" NOVAMENTE para continuar as instalacoes!
pause
exit

:install_deps
echo.
echo Por favor, aguarde enquanto baixamos as bibliotecas do sistema...
echo.

call npm install

echo.
echo ===================================================
echo INSTALACAO CONCLUIDA COM SUCESSO!
echo ===================================================
echo Pode fechar esta janela ou pressionar qualquer tecla.
pause >nul
