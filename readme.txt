======================================
SISTEMA DE ORDENS DE SERVIÇO - COBRINHA GAMES
======================================

Para fazer o sistema funcionar em outro computador, siga os passos abaixo.

--------------------------------------------------
1. SOBRE O NODE.JS (MOTOR DO SISTEMA)
--------------------------------------------------
O sistema precisa de um programa chamado "Node.js" para funcionar. 
Você NÃO precisa baixa-lo manualmente. O nosso arquivo "instalar.bat" (explicado no Passo 3) já fará a verificação e a instalação automática dele para você, caso o computador novo não o tenha!

--------------------------------------------------
2. COPIAR OS ARQUIVOS
--------------------------------------------------
1. Copie toda a pasta do projeto (a pasta que contém estes arquivos, como "server.js", "package.json", "views", etc.) para o outro computador usando um pendrive, Google Drive, ou outro método.

--------------------------------------------------
3. INSTALAR AS DEPENDÊNCIAS
--------------------------------------------------
Mesmo com a pasta copiada, o outro computador precisa baixar as bibliotecas específicas do sistema.
1. Abra a pasta do projeto copiada no outro computador.
2. Dê dois cliques no arquivo "instalar.bat".
3. Uma tela preta se abrirá e o sistema começará a baixar os requisitos de operação.
4. Aguarde a mensagem "INSTALACAO CONCLUIDA!" aparecer. Pode fechar essa janela. 

--------------------------------------------------
4. RODAR O SISTEMA
--------------------------------------------------
1. Para iniciar o servidor do sistema, dê dois cliques no arquivo "iniciar.bat".
2. Uma janela preta vai se abrir rapidamente, informar que o sistema está carregando e fechar sozinha em 3 segundos. O sistema continuará funcionando invisível no fundo!
3. Acesse o sistema pelo seu navegador de internet (Google Chrome, Edge, etc.) pelo endereço:

    http://localhost:3000

DICA DE OURO: Para que você não precise abrir isso todo dia: aperte Win + R, digite "shell:startup" e aperte Enter. Na pasta que abrir, você pode colar um atalho desse arquivo "iniciar.bat". Assim ele executa junto com o Windows invisivelmente!

E pronto! O sistema estará disponível para uso com todos os dados salvos. 
IMPORTANTE: Como a janela preta não vai mais existir pra você fechar no X, para desligar o servidor do sistema com segurança depois, basta dar dois cliques no novo arquivo "parar.bat" que foi criado na pasta.

======================================
COMO TRANSFERIR OS DADOS EXISTENTES (Opcional)
======================================
O arquivo que contém todos os seus clientes, ordens de serviço, senhas e configurações é o "database.sqlite" dentro da pasta "database".

Quando você enviar o sistema para outro computador e ele não for mais usado no computador antigo, basta enviar a pasta inteira. O arquivo ".sqlite" irá junto e nada será perdido.
