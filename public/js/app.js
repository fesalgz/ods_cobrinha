// ========================================================
// ods_cobrinha v3.0.0 - Tauri v2 Native Frontend Client
// ========================================================

const invoke = async (cmd, payload = {}) => {
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
        return await window.__TAURI__.core.invoke(cmd, payload);
    }
    if (window.__TAURI_INTERNALS__ && typeof window.__TAURI_INTERNALS__.invoke === 'function') {
        return await window.__TAURI_INTERNALS__.invoke(cmd, payload);
    }
    if (window.__TAURI__ && typeof window.__TAURI__.invoke === 'function') {
        return await window.__TAURI__.invoke(cmd, payload);
    }
    throw new Error('Ambiente Tauri não detectado. Abra pelo aplicativo (npm run dev ou ods_cobrinha.exe), e não direto no navegador comum.');
};

// Utilitários de Formatação
function formatMoney(val) {
    const num = Number(val) || 0;
    return 'R$ ' + num.toFixed(2).replace('.', ',');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function maskCPF(cpf) {
    if (!cpf) return '';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length !== 11) return cpf;
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function maskTel(tel) {
    if (!tel) return '';
    const clean = tel.replace(/\D/g, '');
    if (clean.length === 11) {
        return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (clean.length === 10) {
        return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return tel;
}

function showToast(msg, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const bg = type === 'error' ? '#e53e3e' : type === 'success' ? '#38a169' : '#3182ce';
    toast.style.cssText = `background: ${bg}; color: #fff; padding: 12px 20px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 14px; font-weight: 500; min-width: 250px; display: flex; justify-content: space-between; align-items: center;`;
    toast.innerHTML = `<span>${msg}</span><button style="background:none; border:none; color:#fff; font-size:16px; cursor:pointer; margin-left:10px;" onclick="this.parentElement.remove()">&times;</button>`;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 4000);
}

// --------------------------------------------------------
// NAVEGAÇÃO ENTRE TELAS (SPA)
// --------------------------------------------------------
let currentSection = 'dashboard';

function navigate(section) {
    currentSection = section;
    const sections = ['dashboard', 'clientes', 'os', 'etiquetas', 'funcionarios', 'configuracoes', 'sistema'];
    
    sections.forEach(s => {
        const el = document.getElementById(`section-${s}`);
        if (el) el.style.display = (s === section) ? 'block' : 'none';
        
        const navLink = document.getElementById(`nav-${s}`);
        if (navLink) {
            if (s === section) navLink.classList.add('active');
            else navLink.classList.remove('active');
        }
    });

    const titleMap = {
        'dashboard': 'Dashboard',
        'clientes': 'Clientes',
        'os': 'Ordens de Serviço',
        'etiquetas': 'Etiquetas',
        'funcionarios': 'Funcionários',
        'configuracoes': 'Identidade do Sistema',
        'sistema': 'Configurações do Sistema'
    };
    const topTitle = document.getElementById('topbar-title');
    if (topTitle) topTitle.textContent = titleMap[section] || 'Sistema OS';

    if (section === 'dashboard') loadDashboard();
    else if (section === 'clientes') loadClientes();
    else if (section === 'os') loadOrdens();
    else if (section === 'funcionarios') loadFuncionarios();
    else if (section === 'configuracoes') loadConfiguracoes();
    else if (section === 'sistema') loadSistema();
}

// --------------------------------------------------------
// 1. DASHBOARD
// --------------------------------------------------------
async function loadDashboard() {
    try {
        const data = await invoke('get_dashboard_data');
        const abertasEl = document.getElementById('stat-abertas');
        const finalizadasEl = document.getElementById('stat-finalizadas');
        const faturadoEl = document.getElementById('stat-faturado');
        const tbody = document.getElementById('tabela-ultimas-ordens');

        if (abertasEl) abertasEl.textContent = data.os_abertas;
        if (finalizadasEl) finalizadasEl.textContent = data.os_finalizadas;
        if (faturadoEl) faturadoEl.textContent = formatMoney(data.valor_faturado);

        if (tbody) {
            if (!data.ultimas_ordens || data.ultimas_ordens.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma ordem de serviço cadastrada.</td></tr>';
            } else {
                tbody.innerHTML = data.ultimas_ordens.map(o => `
                    <tr>
                        <td><strong>${o.numero_os || '-'}</strong></td>
                        <td>${o.cliente_nome || '-'}</td>
                        <td>${formatDate(o.data_abertura)}</td>
                        <td><span class="badge badge-${(o.status || '').toLowerCase().replace(/\s+/g, '-')}">${o.status || '-'}</span></td>
                        <td>${formatMoney(o.valor)}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
    }
}

// --------------------------------------------------------
// 2. CLIENTES
// --------------------------------------------------------
let clientesList = [];

async function loadClientes() {
    try {
        const searchInput = document.getElementById('input-busca-cliente');
        const busca = searchInput ? searchInput.value.trim() : '';
        const data = await invoke('listar_clientes', { busca: busca || null });
        clientesList = data;
        const tbody = document.getElementById('tabela-clientes-body');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum cliente encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(c => `
            <tr>
                <td><strong>${c.nome}</strong></td>
                <td>${maskCPF(c.cpf)}</td>
                <td>${maskTel(c.telefone)}</td>
                <td>${c.observacoes || '-'}</td>
                <td style="white-space: nowrap;">
                    <button class="btn btn-sm btn-primary" onclick="abrirModalCliente(${c.id})" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="excluirCliente(${c.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                    <button class="btn btn-sm btn-success" onclick="abrirNovaOsParaCliente(${c.id})" title="Nova OS"><i class="fas fa-plus"></i> OS</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Erro ao carregar clientes:', err);
        showToast('Erro ao carregar clientes: ' + err, 'error');
    }
}

function abrirModalCliente(id = null) {
    const modal = document.getElementById('modal-cliente');
    const modalTitle = document.getElementById('modal-cliente-title');
    const inputId = document.getElementById('cliente-id');
    const inputNome = document.getElementById('cliente-nome');
    const inputCpf = document.getElementById('cliente-cpf');
    const inputTel = document.getElementById('cliente-tel');
    const inputObs = document.getElementById('cliente-obs');

    if (id) {
        const cliente = clientesList.find(c => c.id === id);
        if (!cliente) return;
        modalTitle.textContent = 'Editar Cliente';
        inputId.value = cliente.id;
        inputNome.value = cliente.nome;
        inputCpf.value = cliente.cpf || '';
        inputTel.value = cliente.telefone || '';
        inputObs.value = cliente.observacoes || '';
    } else {
        modalTitle.textContent = 'Novo Cliente';
        inputId.value = '';
        inputNome.value = '';
        inputCpf.value = '';
        inputTel.value = '';
        inputObs.value = '';
    }

    modal.style.display = 'flex';
}

function fecharModalCliente() {
    const modal = document.getElementById('modal-cliente');
    if (modal) modal.style.display = 'none';
}

async function salvarClienteForm(e) {
    e.preventDefault();
    const id = document.getElementById('cliente-id').value;
    const nome = document.getElementById('cliente-nome').value.trim();
    const cpf = document.getElementById('cliente-cpf').value.trim();
    const telefone = document.getElementById('cliente-tel').value.trim();
    const observacoes = document.getElementById('cliente-obs').value.trim();

    const payload = {
        cliente: {
            nome,
            cpf: cpf || null,
            telefone: telefone || null,
            observacoes: observacoes || null
        }
    };

    try {
        if (id) {
            await invoke('atualizar_cliente', { id: Number(id), cliente: payload.cliente });
            showToast('Cliente atualizado com sucesso!', 'success');
        } else {
            await invoke('salvar_cliente', payload);
            showToast('Cliente cadastrado com sucesso!', 'success');
        }
        fecharModalCliente();
        loadClientes();
    } catch (err) {
        showToast(err, 'error');
    }
}

async function excluirCliente(id) {
    if (!confirm('Deseja realmente excluir este cliente?')) return;
    try {
        await invoke('excluir_cliente', { id: Number(id) });
        showToast('Cliente excluído com sucesso!', 'success');
        loadClientes();
    } catch (err) {
        showToast(err, 'error');
    }
}

// --------------------------------------------------------
// 3. ORDENS DE SERVIÇO
// --------------------------------------------------------
let ordensList = [];
let statusFiltroAtual = '';

async function loadOrdens(statusFilter = '') {
    statusFiltroAtual = statusFilter;
    try {
        const searchInput = document.getElementById('input-busca-os');
        const busca = searchInput ? searchInput.value.trim() : '';

        const data = await invoke('listar_ordens', {
            statusFilter: statusFilter || null,
            busca: busca || null
        });
        ordensList = data;
        const tbody = document.getElementById('tabela-os-body');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Nenhuma ordem de serviço encontrada.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(o => `
            <tr>
                <td><strong>${o.numero_os || '-'}</strong></td>
                <td>${o.cliente_nome || '-'}</td>
                <td>${formatDate(o.data_abertura)}</td>
                <td><span class="badge badge-${(o.status || '').toLowerCase().replace(/\s+/g, '-')}">${o.status || '-'}</span></td>
                <td>${o.selecao_aparelho || '-'} - ${o.aparelho_modelo || '-'}</td>
                <td>${formatMoney(o.valor)}</td>
                <td style="white-space: nowrap;">
                    <button class="btn btn-sm btn-info" onclick="imprimirOs(${o.id}, 'Entrada')" title="Imprimir Entrada"><i class="fas fa-print"></i></button>
                    ${o.status !== 'Finalizado' ? `
                        <button class="btn btn-sm btn-primary" onclick="abrirModalOs(${o.id})" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-success" onclick="abrirModalFinalizar(${o.id})" title="Finalizar"><i class="fas fa-check"></i></button>
                    ` : `
                        <button class="btn btn-sm btn-secondary" onclick="imprimirOs(${o.id}, 'Saída')" title="Imprimir Saída"><i class="fas fa-receipt"></i></button>
                    `}
                    <button class="btn btn-sm btn-danger" onclick="excluirOrdem(${o.id})" title="Excluir"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Erro ao carregar OS:', err);
        showToast('Erro ao listar OS: ' + err, 'error');
    }
}

async function abrirModalOs(id = null, preSelectedClientId = null) {
    const modal = document.getElementById('modal-os');
    const modalTitle = document.getElementById('modal-os-title');
    
    // Carregar selects de clientes e funcionários
    const [clientes, funcionarios] = await Promise.all([
        invoke('listar_clientes', { busca: null }),
        invoke('listar_nomes_os')
    ]);

    const selectCliente = document.getElementById('os-cliente-id');
    selectCliente.innerHTML = '<option value="">Selecione um cliente...</option>' + 
        clientes.map(c => `<option value="${c.id}">${c.nome} (CPF: ${maskCPF(c.cpf)})</option>`).join('');

    const selectFunc = document.getElementById('os-funcionario-nome');
    selectFunc.innerHTML = '<option value="">Selecione o atendente/técnico...</option>' + 
        funcionarios.map(f => `<option value="${f}">${f}</option>`).join('');

    const inputId = document.getElementById('os-id');
    const inputNumero = document.getElementById('os-numero');
    const inputDataAbertura = document.getElementById('os-data-abertura');
    const selectStatus = document.getElementById('os-status');
    const selectAparelho = document.getElementById('os-selecao-aparelho');
    const inputOutro = document.getElementById('os-aparelho-outro');
    const inputMarca = document.getElementById('os-aparelho-marca');
    const inputModelo = document.getElementById('os-aparelho-modelo');
    const inputCor = document.getElementById('os-aparelho-cor');
    const inputNs = document.getElementById('os-aparelho-ns');
    const inputImei = document.getElementById('os-aparelho-imei');
    const inputDefeito = document.getElementById('os-descricao-problema');
    const inputObs = document.getElementById('os-observacoes-aparelho');
    const inputValor = document.getElementById('os-valor');
    const checkGarantia = document.getElementById('os-is-garantia');

    if (id) {
        const os = ordensList.find(o => o.id === id);
        if (!os) return;
        modalTitle.textContent = `Editar OS #${os.numero_os}`;
        inputId.value = os.id;
        inputNumero.value = os.numero_os || '';
        inputDataAbertura.value = os.data_abertura || '';
        selectStatus.value = os.status || 'Aberto';
        selectCliente.value = os.cliente_id || '';
        selectFunc.value = os.funcionario_nome || '';
        
        const tiposPadrao = ['Celular', 'Console', 'Controle', 'Computador', 'Notebook'];
        if (tiposPadrao.includes(os.selecao_aparelho)) {
            selectAparelho.value = os.selecao_aparelho;
            inputOutro.value = '';
        } else if (os.selecao_aparelho) {
            selectAparelho.value = 'Outro';
            inputOutro.value = os.selecao_aparelho;
        } else {
            selectAparelho.value = '';
        }

        inputMarca.value = os.aparelho_marca || '';
        inputModelo.value = os.aparelho_modelo || '';
        inputCor.value = os.aparelho_cor || '';
        inputNs.value = os.aparelho_ns || '';
        inputImei.value = os.aparelho_imei || '';
        inputDefeito.value = os.descricao_problema || '';
        inputObs.value = os.observacoes_aparelho || '';
        inputValor.value = os.valor || 0;
        checkGarantia.checked = os.is_garantia === 1;
    } else {
        modalTitle.textContent = 'Nova Ordem de Serviço';
        inputId.value = '';
        const suggestedNum = Math.floor(100000 + Math.random() * 900000).toString();
        inputNumero.value = suggestedNum;
        const now = new Date().toISOString().split('T')[0];
        inputDataAbertura.value = now;
        selectStatus.value = 'Aberto';
        if (preSelectedClientId) selectCliente.value = preSelectedClientId;
        selectAparelho.value = '';
        inputOutro.value = '';
        inputMarca.value = '';
        inputModelo.value = '';
        inputCor.value = '';
        inputNs.value = '';
        inputImei.value = '';
        inputDefeito.value = '';
        inputObs.value = '';
        inputValor.value = 0;
        checkGarantia.checked = false;
    }

    onAparelhoChange();
    modal.style.display = 'flex';
}

function fecharModalOs() {
    const modal = document.getElementById('modal-os');
    if (modal) modal.style.display = 'none';
}

function onAparelhoChange() {
    const val = document.getElementById('os-selecao-aparelho').value;
    const campoImei = document.getElementById('container-imei');
    const campoOutro = document.getElementById('container-outro');

    if (campoImei) campoImei.style.display = (val === 'Celular') ? 'block' : 'none';
    if (campoOutro) campoOutro.style.display = (val === 'Outro') ? 'block' : 'none';
}

async function salvarOsForm(e) {
    e.preventDefault();
    const id = document.getElementById('os-id').value;
    const numero_os = document.getElementById('os-numero').value.trim();
    const cliente_id = Number(document.getElementById('os-cliente-id').value);
    const data_abertura = document.getElementById('os-data-abertura').value;
    const status = document.getElementById('os-status').value;
    const selecao_aparelho = document.getElementById('os-selecao-aparelho').value;
    const aparelho_outro = document.getElementById('os-aparelho-outro').value.trim();
    const aparelho_marca = document.getElementById('os-aparelho-marca').value.trim();
    const aparelho_modelo = document.getElementById('os-aparelho-modelo').value.trim();
    const aparelho_cor = document.getElementById('os-aparelho-cor').value.trim();
    const aparelho_ns = document.getElementById('os-aparelho-ns').value.trim();
    const aparelho_imei = document.getElementById('os-aparelho-imei').value.trim();
    const descricao_problema = document.getElementById('os-descricao-problema').value.trim();
    const observacoes_aparelho = document.getElementById('os-observacoes-aparelho').value.trim();
    const valor = parseFloat(document.getElementById('os-valor').value) || 0;
    const funcionario_nome = document.getElementById('os-funcionario-nome').value;
    const is_garantia = document.getElementById('os-is-garantia').checked;

    if (!cliente_id) {
        showToast('Por favor, selecione um cliente.', 'error');
        return;
    }

    const payload = {
        ordem: {
            numero_os: numero_os || null,
            cliente_id,
            data_abertura: data_abertura || null,
            data_entrega: null,
            status,
            selecao_aparelho: selecao_aparelho || null,
            aparelho_outro: aparelho_outro || null,
            aparelho_marca: aparelho_marca || null,
            aparelho_modelo: aparelho_modelo || null,
            aparelho_cor: aparelho_cor || null,
            aparelho_ns: aparelho_ns || null,
            aparelho_imei: aparelho_imei || null,
            descricao_problema: descricao_problema || null,
            observacoes_aparelho: observacoes_aparelho || null,
            valor,
            funcionario_nome: funcionario_nome || null,
            is_garantia
        }
    };

    try {
        if (id) {
            await invoke('atualizar_ordem', { id: Number(id), ordem: payload.ordem });
            showToast('OS atualizada com sucesso!', 'success');
        } else {
            await invoke('salvar_ordem', payload);
            showToast('OS criada com sucesso!', 'success');
        }
        fecharModalOs();
        loadOrdens(statusFiltroAtual);
        loadDashboard();
    } catch (err) {
        showToast(err, 'error');
    }
}

function abrirNovaOsParaCliente(clienteId) {
    navigate('os');
    setTimeout(() => {
        abrirModalOs(null, clienteId);
    }, 200);
}

// Finalização de OS
function abrirModalFinalizar(id) {
    const os = ordensList.find(o => o.id === id);
    if (!os) return;
    document.getElementById('finalizar-os-id').value = os.id;
    document.getElementById('finalizar-os-numero').textContent = os.numero_os;
    document.getElementById('finalizar-motivo').value = '';
    document.getElementById('finalizar-justificativa').value = '';
    document.getElementById('finalizar-defeito').value = os.descricao_problema || '';
    document.getElementById('finalizar-obs').value = os.observacoes_aparelho || '';
    document.getElementById('finalizar-valor').value = os.valor || 0;
    document.getElementById('finalizar-garantia').checked = os.is_garantia === 1;

    document.getElementById('modal-finalizar-os').style.display = 'flex';
}

function fecharModalFinalizar() {
    const modal = document.getElementById('modal-finalizar-os');
    if (modal) modal.style.display = 'none';
}

async function salvarFinalizacaoForm(e) {
    e.preventDefault();
    const id = Number(document.getElementById('finalizar-os-id').value);
    const motivo_finalizacao = document.getElementById('finalizar-motivo').value;
    const justificativa_finalizacao = document.getElementById('finalizar-justificativa').value.trim();
    const descricao_problema = document.getElementById('finalizar-defeito').value.trim();
    const observacoes_aparelho = document.getElementById('finalizar-obs').value.trim();
    const valor = parseFloat(document.getElementById('finalizar-valor').value) || 0;
    const is_garantia = document.getElementById('finalizar-garantia').checked;

    if (!motivo_finalizacao) {
        showToast('Informe o motivo da finalização.', 'error');
        return;
    }

    try {
        await invoke('finalizar_ordem', {
            id,
            payload: {
                motivo_finalizacao,
                justificativa_finalizacao: justificativa_finalizacao || null,
                descricao_problema: descricao_problema || null,
                observacoes_aparelho: observacoes_aparelho || null,
                valor,
                is_garantia
            }
        });
        showToast('OS finalizada com sucesso!', 'success');
        fecharModalFinalizar();
        loadOrdens(statusFiltroAtual);
        loadDashboard();
    } catch (err) {
        showToast(err, 'error');
    }
}

async function excluirOrdem(id) {
    if (!confirm('Deseja realmente excluir esta Ordem de Serviço?')) return;
    try {
        await invoke('excluir_ordem', { id: Number(id) });
        showToast('OS excluída com sucesso!', 'success');
        loadOrdens(statusFiltroAtual);
        loadDashboard();
    } catch (err) {
        showToast(err, 'error');
    }
}

// Impressão de OS via iframe invisível (evita bloqueio de popup no WebView2)
async function imprimirOs(id, tipo = 'Entrada') {
    try {
        const dados = await invoke('get_dados_impressao', { id: Number(id), tipo });
        const { ordem, config } = dados;

        let iframe = document.getElementById('print-iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'print-iframe';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>OS ${ordem.numero_os} - ${tipo}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #222; margin: 0; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 15px; margin-bottom: 20px; }
                    .header h1 { margin: 0; font-size: 24px; }
                    .header p { margin: 3px 0; font-size: 13px; color: #555; }
                    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; background: #eee; font-size: 14px; }
                    .section { margin-bottom: 18px; }
                    .section h3 { margin: 0 0 8px 0; font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 4px; text-transform: uppercase; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
                    .normas { font-size: 10px; color: #666; white-space: pre-line; border: 1px dashed #ccc; padding: 10px; border-radius: 4px; margin-top: 20px; }
                    .assinaturas { margin-top: 40px; display: flex; justify-content: space-around; font-size: 12px; }
                    .assinatura-linha { border-top: 1px solid #222; width: 220px; text-align: center; padding-top: 5px; }
                    @media print { body { padding: 15px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>${config.empresa_nome || 'Cobrinha Games'}</h1>
                        <p>${config.empresa_endereco || ''}</p>
                        <p>${config.empresa_telefone || ''}</p>
                    </div>
                    <div style="text-align: right;">
                        <span class="badge">OS #${ordem.numero_os}</span>
                        <p><strong>Comprovante de ${tipo}</strong></p>
                        <p>Data: ${formatDate(ordem.data_abertura)}</p>
                    </div>
                </div>

                <div class="section">
                    <h3>Dados do Cliente</h3>
                    <div class="grid">
                        <div><strong>Nome:</strong> ${ordem.cliente_nome || '-'}</div>
                        <div><strong>Telefone:</strong> ${maskTel(ordem.cliente_telefone)}</div>
                        <div><strong>CPF:</strong> ${maskCPF(ordem.cliente_cpf)}</div>
                    </div>
                </div>

                <div class="section">
                    <h3>Aparelho</h3>
                    <div class="grid">
                        <div><strong>Tipo:</strong> ${ordem.selecao_aparelho || '-'}</div>
                        <div><strong>Marca/Modelo:</strong> ${ordem.aparelho_marca || ''} ${ordem.aparelho_modelo || ''}</div>
                        <div><strong>Cor:</strong> ${ordem.aparelho_cor || '-'}</div>
                        <div><strong>Nº de Série/IMEI:</strong> ${ordem.aparelho_ns || ordem.aparelho_imei || '-'}</div>
                    </div>
                </div>

                <div class="section">
                    <h3>Defeito Relatado / Observações</h3>
                    <p style="font-size: 13px; margin: 4px 0;"><strong>Relato:</strong> ${ordem.descricao_problema || '-'}</p>
                    <p style="font-size: 13px; margin: 4px 0;"><strong>Estado do Aparelho:</strong> ${ordem.observacoes_aparelho || '-'}</p>
                    ${ordem.motivo_finalizacao ? `<p style="font-size: 13px; margin: 4px 0;"><strong>Finalização:</strong> ${ordem.motivo_finalizacao} ${ordem.justificativa_finalizacao ? '(' + ordem.justificativa_finalizacao + ')' : ''}</p>` : ''}
                    <p style="font-size: 15px; margin: 10px 0 0 0;"><strong>Valor Total:</strong> ${formatMoney(ordem.valor)}</p>
                </div>

                ${config.normas_os ? `<div class="normas"><strong>Termos e Normas:</strong>\n${config.normas_os}</div>` : ''}

                <div class="assinaturas">
                    <div class="assinatura-linha">Assinatura do Cliente</div>
                    <div class="assinatura-linha">Responsável Técnico / Loja</div>
                </div>
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }, 200);
    } catch (err) {
        showToast('Erro ao carregar dados para impressão: ' + err, 'error');
    }
}

// --------------------------------------------------------
// 4. FUNCIONÁRIOS
// --------------------------------------------------------
async function loadFuncionarios() {
    try {
        const funcionarios = await invoke('listar_funcionarios');
        const tbody = document.getElementById('tabela-funcionarios-body');
        if (!tbody) return;

        if (funcionarios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum funcionário cadastrado.</td></tr>';
            return;
        }

        tbody.innerHTML = funcionarios.map(f => `
            <tr>
                <td><strong>${f.nome}</strong></td>
                <td>${f.nome_os || '-'}</td>
                <td><span class="badge badge-em-andamento">${f.role}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="abrirModalFuncionario(${f.id}, '${f.nome}', '${f.nome_os || ''}', '${f.role}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="excluirFuncionario(${f.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showToast('Erro ao carregar funcionários: ' + err, 'error');
    }
}

function abrirModalFuncionario(id = null, nome = '', nome_os = '', role = 'atendente') {
    document.getElementById('func-id').value = id || '';
    document.getElementById('func-nome').value = nome;
    document.getElementById('func-nome-os').value = nome_os;
    document.getElementById('func-role').value = role;
    document.getElementById('modal-func-title').textContent = id ? 'Editar Funcionário' : 'Novo Funcionário';
    document.getElementById('modal-funcionario').style.display = 'flex';
}

function fecharModalFuncionario() {
    const modal = document.getElementById('modal-funcionario');
    if (modal) modal.style.display = 'none';
}

async function salvarFuncionarioForm(e) {
    e.preventDefault();
    const id = document.getElementById('func-id').value;
    const nome = document.getElementById('func-nome').value.trim();
    const nome_os = document.getElementById('func-nome-os').value.trim();
    const role = document.getElementById('func-role').value;

    try {
        if (id) {
            await invoke('atualizar_funcionario', { id: Number(id), nome, nomeOs: nome_os, role });
            showToast('Funcionário atualizado com sucesso!', 'success');
        } else {
            await invoke('salvar_funcionario', { nome, nomeOs: nome_os, role });
            showToast('Funcionário cadastrado com sucesso!', 'success');
        }
        fecharModalFuncionario();
        loadFuncionarios();
    } catch (err) {
        showToast(err, 'error');
    }
}

async function excluirFuncionario(id) {
    if (!confirm('Deseja excluir este funcionário?')) return;
    try {
        await invoke('excluir_funcionario', { id: Number(id) });
        showToast('Funcionário excluído!', 'success');
        loadFuncionarios();
    } catch (err) {
        showToast(err, 'error');
    }
}

// --------------------------------------------------------
// 5. CONFIGURAÇÕES (IDENTIDADE)
// --------------------------------------------------------
async function loadConfiguracoes() {
    try {
        const config = await invoke('get_configuracoes');
        document.getElementById('conf-empresa-nome').value = config.empresa_nome || '';
        document.getElementById('conf-empresa-endereco').value = config.empresa_endereco || '';
        document.getElementById('conf-empresa-telefone').value = config.empresa_telefone || '';
        document.getElementById('conf-normas-os').value = config.normas_os || '';
    } catch (err) {
        showToast('Erro ao carregar configurações: ' + err, 'error');
    }
}

async function salvarIdentidadeForm(e) {
    e.preventDefault();
    const empresa_nome = document.getElementById('conf-empresa-nome').value.trim();
    const empresa_endereco = document.getElementById('conf-empresa-endereco').value.trim();
    const empresa_telefone = document.getElementById('conf-empresa-telefone').value.trim();
    const normas_os = document.getElementById('conf-normas-os').value.trim();

    try {
        await invoke('salvar_identidade', {
            empresaNome: empresa_nome,
            empresaEndereco: empresa_endereco,
            empresaTelefone: empresa_telefone,
            normasOs: normas_os
        });
        showToast('Identidade do sistema salva com sucesso!', 'success');
    } catch (err) {
        showToast(err, 'error');
    }
}

// --------------------------------------------------------
// 6. SISTEMA (PAINEL PROTEGIDO)
// --------------------------------------------------------
let sistemaAutenticado = false;

async function loadSistema() {
    const authBox = document.getElementById('sistema-auth-box');
    const panelBox = document.getElementById('sistema-panel-box');

    if (!sistemaAutenticado) {
        authBox.style.display = 'block';
        panelBox.style.display = 'none';
        document.getElementById('sistema-senha-input').value = '';
    } else {
        authBox.style.display = 'none';
        panelBox.style.display = 'block';

        const [config, dbSize] = await Promise.all([
            invoke('get_configuracoes'),
            invoke('get_tamanho_banco')
        ]);

        document.getElementById('sistema-nome-input').value = config.nome_sistema || '';
        document.getElementById('sistema-db-size').textContent = dbSize;
    }
}

async function autenticarSistema(e) {
    e.preventDefault();
    const senha = document.getElementById('sistema-senha-input').value;
    try {
        const ok = await invoke('verificar_senha_painel', { senha });
        if (ok) {
            sistemaAutenticado = true;
            loadSistema();
        } else {
            showToast('Senha incorreta!', 'error');
        }
    } catch (err) {
        showToast(err, 'error');
    }
}

async function salvarNomeSistema(e) {
    e.preventDefault();
    const nome = document.getElementById('sistema-nome-input').value.trim();
    try {
        await invoke('salvar_nome_sistema', { nomeSistema: nome });
        document.getElementById('brand-nome').textContent = nome;
        showToast('Nome do sistema atualizado!', 'success');
    } catch (err) {
        showToast(err, 'error');
    }
}

async function alterarSenhaPainel(e) {
    e.preventDefault();
    const atual = document.getElementById('sistema-senha-atual').value;
    const nova = document.getElementById('sistema-senha-nova').value;
    const conf = document.getElementById('sistema-senha-conf').value;

    if (nova !== conf) {
        showToast('A nova senha e a confirmação não coincidem.', 'error');
        return;
    }

    try {
        await invoke('alterar_senha_painel', { senhaAtual: atual, novaSenha: nova });
        showToast('Senha alterada com sucesso!', 'success');
        document.getElementById('sistema-senha-atual').value = '';
        document.getElementById('sistema-senha-nova').value = '';
        document.getElementById('sistema-senha-conf').value = '';
    } catch (err) {
        showToast(err, 'error');
    }
}

async function limparOsSistema() {
    if (!confirm('ATENÇÃO: Deseja realmente excluir TODAS as Ordens de Serviço do banco de dados? Esta ação não pode ser desfeita.')) return;
    try {
        await invoke('limpar_ordens_servico');
        showToast('Ordens de serviço limpas com sucesso!', 'success');
        loadDashboard();
        loadSistema();
    } catch (err) {
        showToast(err, 'error');
    }
}

async function limparClientesSistema() {
    if (!confirm('ATENÇÃO: Deseja realmente excluir TODOS os Clientes do banco de dados? Esta ação não pode ser desfeita.')) return;
    try {
        await invoke('limpar_todos_clientes');
        showToast('Clientes limpos com sucesso!', 'success');
        loadDashboard();
        loadSistema();
    } catch (err) {
        showToast(err, 'error');
    }
}

// --------------------------------------------------------
// INICIALIZAÇÃO GLOBAL E TEMA
// --------------------------------------------------------
async function alternarTema() {
    try {
        const novoTema = await invoke('toggle_tema');
        if (novoTema === 1) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('tema_escuro', '1');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('tema_escuro', '0');
        }
    } catch (err) {
        // Fallback local
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('tema_escuro', isDark ? '1' : '0');
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    // Sincronizar tema e nome do sistema
    try {
        const config = await invoke('get_configuracoes');
        if (config.tema_escuro === 1) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('tema_escuro', '1');
        }
        if (config.nome_sistema) {
            document.getElementById('brand-nome').textContent = config.nome_sistema;
        }
    } catch (e) {
        if (localStorage.getItem('tema_escuro') === '1') {
            document.body.classList.add('dark-theme');
        }
    }

    navigate('dashboard');
});

