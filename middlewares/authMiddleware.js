const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        // Disponibilizar user nas views EJS
        res.locals.user = req.session.user;
        return next();
    }
    res.redirect('/login');
};

function ensureAdmin(req, res, next) {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).send('Acesso negado. Apenas administradores podem acessar esta página.');
}

function ensureAdminOrGerente(req, res, next) {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'gerente')) {
        return next();
    }
    res.status(403).send('Acesso negado. Privilégios insuficientes.');
}

module.exports = {
    ensureAuthenticated,
    ensureAdmin,
    ensureAdminOrGerente
};
