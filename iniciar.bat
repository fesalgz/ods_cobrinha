@echo off
echo ===================================================
echo INICIANDO O SISTEMA EM SEGUNDO PLANO
echo ===================================================
echo O servidor ficara oculto e o CMD vai fechar sozinho.
echo.
echo Para abrir o sistema, acesse http://localhost:3000 no navegador.
echo Para desligar o servidor depois, execute o arquivo "parar.bat".
echo.
echo Iniciando em 3 segundos...
timeout /t 3 >nul

echo set WshShell = CreateObject("WScript.Shell") > "%temp%\run_hidden.vbs"
echo WshShell.Run "cmd /c node server.js", 0, False >> "%temp%\run_hidden.vbs"
wscript "%temp%\run_hidden.vbs"
exit
