const express = require('express');
const path = require('path');
const db = require('./database/db');

// Importar dependencias extras
const session = require('express-session');
const methodOverride = require('method-override');

// Importar middlewares
const { ensureAuthenticated, ensureAdmin, ensureAdminOrGerente } = require('./middlewares/authMiddleware');

// Importar rotas
const clientesRoutes = require('./routes/clientes');
const osRoutes = require('./routes/os');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');
const funcionariosRoutes = require('./routes/funcionarios');
const configuracoesRoutes = require('./routes/configuracoes');

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

// Middleware global para injetar configurações e status em todas as telas (Ex: Tema Escuro, Cores de Status)
app.use((req, res, next) => {
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

// Rotas abertas (login/logout)
app.use('/', authRoutes);

// Redirecionamento da raiz
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Rotas protegidas
app.use('/dashboard', ensureAuthenticated, dashboardRoutes);
app.use('/clientes', ensureAuthenticated, clientesRoutes);
app.use('/os', ensureAuthenticated, osRoutes);
app.use('/funcionarios', ensureAuthenticated, ensureAdminOrGerente, funcionariosRoutes);
app.use('/configuracoes', ensureAuthenticated, ensureAdmin, configuracoesRoutes);

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
