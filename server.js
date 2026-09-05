const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./database/db');

// Importar dependencias extras
const session = require('express-session');
const methodOverride = require('method-override');

// Importar rotas
const clientesRoutes = require('./routes/clientes');
const osRoutes = require('./routes/os');
const dashboardRoutes = require('./routes/dashboard');
const funcionariosRoutes = require('./routes/funcionarios');
const configuracoesRoutes = require('./routes/configuracoes');
const etiquetasRoutes = require('./routes/etiquetas');

const app = express();
const PORT = 3000;

// Configurar template engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Para ler form data
// Configurar a sessão ANTES das rotas
app.use(session({
    secret: 'os_system_secret_key_123',
    resave: false,
    saveUninitialized: false,
    cookie: {
        // Omitting 'maxAge' or setting 'expires: false' tells the browser 
        // to treat this as a session cookie, which is deleted when the browser closes.
        expires: false
    }
}));
app.use(methodOverride('_method'));

// Middleware global para injetar o usuário mockado (Loja), configurações e status em todas as telas
app.use((req, res, next) => {
    // Bloquear aba de configurações se navegar para qualquer outra página
    const abasDeNavegacao = ['/dashboard', '/clientes', '/os', '/funcionarios', '/'];
    if (req.session && abasDeNavegacao.some(aba => req.path === aba || req.path.startsWith(aba + '/'))) {
        req.session.configAuthenticated = false;
    }

    // Injetar perfil mockado de "Loja" com acesso total (admin) para compatibilidade com as views e rotas
    const lojaUser = { id: 1, username: 'loja', role: 'admin', nome: 'Loja', nome_os: 'Loja' };
    if (req.session) {
        req.session.user = lojaUser;
    }
    res.locals.user = lojaUser;
    res.locals.configAuthenticated = req.session ? req.session.configAuthenticated : false;

    db.get('SELECT * FROM configuracoes WHERE id = 1', [], (err, config) => {
        if (err) {
            console.error("Erro no middleware global de config:", err);
            res.locals.globalConfig = {};
        } else {
            res.locals.globalConfig = config || {};
        }
        next();
    });
});

// Servir arquivos estáticos (colocado antes das rotas protegidas)
app.use(express.static(path.join(__dirname, 'public')));

// Configurar pasta de uploads externa no userData (onde tem permissão de escrita)
let userDataPath;
if (process.versions && process.versions.electron) {
    const { app: electronApp } = require('electron');
    userDataPath = electronApp.getPath('userData');
} else {
    userDataPath = __dirname;
}

const uploadsPath = path.join(userDataPath, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}
// Serve a rota /uploads lendo da pasta do userData
app.use('/uploads', express.static(uploadsPath));

// Redirecionamento da raiz diretamente para o dashboard
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Alternar tema globalmente
app.post('/toggle-tema', (req, res) => {
    db.get('SELECT tema_escuro FROM configuracoes WHERE id = 1', [], (err, config) => {
        if (!err && config) {
            const novoTema = config.tema_escuro === 1 ? 0 : 1;
            db.run('UPDATE configuracoes SET tema_escuro = ? WHERE id = 1', [novoTema], (updateErr) => {
                if (updateErr) {
                    res.status(500).json({ success: false, error: updateErr });
                } else {
                    res.json({ success: true, tema_escuro: novoTema });
                }
            });
        } else {
            res.status(500).json({ success: false, error: 'Config not found' });
        }
    });
});

// Rotas do sistema
app.use('/dashboard', dashboardRoutes);
app.use('/clientes', clientesRoutes);
app.use('/os', osRoutes);
app.use('/funcionarios', funcionariosRoutes);
app.use('/configuracoes', configuracoesRoutes);
app.use('/etiquetas', etiquetasRoutes);

// Rotas de atualização
app.get('/api/updater/status', (req, res) => {
    res.json({ status: global.updateStatus || 'none' });
});

app.post('/api/updater/check', (req, res) => {
    if (global.autoUpdater) {
        global.updateStatus = 'checking';
        global.autoUpdater.checkForUpdates().catch(err => {
            console.error(err);
            global.updateStatus = 'error';
        });
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: 'Updater indisponível' });
    }
});

app.post('/api/updater/download', (req, res) => {
    if (global.autoUpdater) {
        global.updateStatus = 'downloading';
        global.autoUpdater.downloadUpdate().catch(err => {
            console.error(err);
            global.updateStatus = 'error';
        });
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: 'Updater indisponível' });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
