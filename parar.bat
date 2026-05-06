@echo off
echo ===================================================
echo DESLIGANDO O SERVIDOR DO SISTEMA
echo ===================================================
taskkill /IM node.exe /F
echo.
echo Servidor desligado com sucesso! Pode fechar esta janela.
pause >nul
