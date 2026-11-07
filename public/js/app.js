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
        const { ordem, config, logo_base64 } = dados;

        // Logo da empresa: usa Base64 direto ou fallback
        let logoHtml = '';
        if (logo_base64) {
            logoHtml = `<div class="cabecalho-logo"><img src="${logo_base64}" alt="Logo da Empresa" /></div>`;
        } else {
            logoHtml = `<div class="cabecalho-logo-placeholder">Logo da Empresa</div>`;
        }

        // Telefone formatado
        const telEmpresa = config.empresa_telefone 
            ? (config.empresa_telefone.toLowerCase().includes('telefone') ? config.empresa_telefone : `Telefone: ${config.empresa_telefone}`)
            : '';

        // Normas: 8 cláusulas padrão se não cadastrado
        let normasHtml = '';
        const textoNormas = (config.normas_os && config.normas_os.trim().length > 0)
            ? config.normas_os.split('\n').filter(l => l.trim()).join('<br>')
            : [
                "1. O prazo para elaboração do orçamento é de 5 à 15 dias úteis;",
                "2. Não nos responsabilizamos por perda de dados, armazenamentos, agenda, jogos, músicas e etc.;",
                "3. O prazo de retirada do aparelho é de até 30 dias, após esse prazo será cobrado uma taxa diária de R$1,00 pelo armazenamento;",
                "4. Caso outra pessoa venha retirar o aparelho, será obrigatório a apresentação da OS com autorização prévia;",
                "5. Garantia de 90 dias para todos os tipos de consertos;",
                "6. Horário de funcionamento de Segunda a Sábado 10h00 às 22h00, Domingo 13h00 as 20h00;",
                "7. Não sendo retirado o aparelho em até 90 dias, tal fato será considerado como abandono;",
                "8. Os aparelhos dado como abandono, serão vendidos pelo valor do serviço contratado."
            ].join('<br>');

        normasHtml = `
        <div class="normas-container">
            <div class="normas-titulo">Normas Importantes:</div>
            <div class="normas-texto">${textoNormas}</div>
        </div>`;

        // Assinaturas pontilhadas
        const assinaturasHtml = `
        <div class="assinaturas-container">
            <div class="assinatura-bloco">
                <div class="assinatura-linha-pontilhada"></div>
                <div class="assinatura-rotulo">Assinatura do Atendente</div>
            </div>
            <div class="assinatura-bloco">
                <div class="assinatura-linha-pontilhada"></div>
                <div class="assinatura-rotulo">Assinatura do Cliente</div>
            </div>
        </div>`;

        // Conteúdo condicional de Entrada vs Saída
        let corpoDocumento = '';

        if (tipo === 'Saída') {
            // ESTRUTURA SAÍDA
            corpoDocumento = `
            <!-- 2. Metadados de Controle (3 colunas) -->
            <div class="meta-grade meta-saida">
                <div>
                    <div class="label">Data de Abertura:</div>
                    <div class="valor">${formatDate(ordem.data_abertura)}</div>
                </div>
                <div>
                    <div class="label">Data de Entrega:</div>
                    <div class="valor">${formatDate(ordem.data_entrega || ordem.data_abertura)}</div>
                </div>
                <div>
                    <div class="label">Funcionário:</div>
                    <div class="valor">${ordem.funcionario_nome || '-'}</div>
                </div>
            </div>

            <!-- 3. Dados do Cliente -->
            <div class="bloco-secao">
                <div class="secao-titulo">Dados do Cliente</div>
                <div class="grade-3col">
                    <div>
                        <div class="label">Nome:</div>
                        <div class="valor">${ordem.cliente_nome || '-'}</div>
                    </div>
                    <div>
                        <div class="label">Telefone:</div>
                        <div class="valor">${maskTel(ordem.cliente_telefone) || 'Não informado'}</div>
                    </div>
                    <div>
                        <div class="label">CPF/CNPJ:</div>
                        <div class="valor">${maskCPF(ordem.cliente_cpf) || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- 4. Dados do Aparelho -->
            <div class="bloco-secao">
                <div class="secao-titulo">Dados do Aparelho</div>
                <div class="grade-3col" style="margin-bottom: 6px;">
                    <div>
                        <div class="label">Tipo:</div>
                        <div class="valor">${ordem.selecao_aparelho || '-'}</div>
                    </div>
                    <div>
                        <div class="label">Marca:</div>
                        <div class="valor">${ordem.aparelho_marca || '-'}</div>
                    </div>
                    <div>
                        <div class="label">Modelo:</div>
                        <div class="valor">${ordem.aparelho_modelo || '-'}</div>
                    </div>
                </div>
                <div class="grade-3col">
                    <div>
                        <div class="label">Cor:</div>
                        <div class="valor">${ordem.aparelho_cor || '-'}</div>
                    </div>
                    <div>
                        <div class="label">Número de Série:</div>
                        <div class="valor">${ordem.aparelho_ns || '-'}</div>
                    </div>
                    <div>
                        <div class="label">IMEI:</div>
                        <div class="valor">${ordem.aparelho_imei || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- 5. Detalhes do Serviço -->
            <div class="bloco-secao">
                <div class="secao-titulo">Detalhes do Serviço</div>
                <div class="label">Problema Relatado:</div>
                <div class="caixa-texto caixa-saida-problema">${ordem.descricao_problema || ''}</div>
                <div class="label">Estado do Aparelho / Observações:</div>
                <div class="caixa-texto caixa-saida-obs">${ordem.observacoes_aparelho || ''}</div>
            </div>

            <!-- 6. Detalhes da Finalização (Exclusivo da OS de Saída) -->
            <div class="bloco-secao">
                <div class="secao-titulo">Detalhes da Finalização</div>
                <div style="margin-bottom: 6px;">
                    <div class="label">Motivo:</div>
                    <div class="valor" style="font-weight: bold; font-size: 12.5px;">${ordem.motivo_finalizacao || 'Reparo Concluído'}</div>
                </div>
                <div class="label">Justificativa / Observações da Finalização:</div>
                <div class="caixa-texto caixa-saida-fin">${ordem.justificativa_finalizacao || ''}</div>
                <div class="valor-total-linha">
                    <span class="valor-total-label">Valor Total:</span>
                    <span class="valor-total-num">${formatMoney(ordem.valor)}</span>
                </div>
            </div>
            `;
        } else {
            // ESTRUTURA ENTRADA
            corpoDocumento = `
            <!-- 2. Metadados de Controle (2 colunas) -->
            <div class="meta-grade meta-entrada">
                <div>
                    <div class="label">Data de Abertura:</div>
                    <div class="valor">${formatDate(ordem.data_abertura)}</div>
                </div>
                <div>
                    <div class="label">Funcionário:</div>
                    <div class="valor">${ordem.funcionario_nome || '-'}</div>
                </div>
            </div>

            <!-- 3. Dados do Cliente (formato caixa/card) -->
            <div class="bloco-secao">
                <div class="secao-titulo">Dados do Cliente</div>
                <div class="grade-3col">
                    <div>
                        <div class="label">Nome:</div>
                        <div class="valor">${ordem.cliente_nome || '-'}</div>
                    </div>
                    <div>
                        <div class="label">Telefone:</div>
                        <div class="valor">${maskTel(ordem.cliente_telefone) || 'Não informado'}</div>
                    </div>
                    <div>
                        <div class="label">CPF/CNPJ:</div>
                        <div class="valor">${maskCPF(ordem.cliente_cpf) || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- 4. Dados do Aparelho -->
            <div class="bloco-secao">
                <div class="secao-titulo">Dados do Aparelho</div>
                <div class="grade-3col" style="margin-bottom: 6px;">
                    <div>
                        <div class="label">Tipo:</div>
                        <div class="valor">${ordem.selecao_aparelho || '-'}</div>
                    </div>
                    <div>
                        <div class="label">Marca:</div>
                        <div class="valor">${ordem.aparelho_marca || '-'}</div>
                    </div>
                    <div>
                        <div class="label">Modelo:</div>
                        <div class="valor">${ordem.aparelho_modelo || '-'}</div>
                    </div>
                </div>
                <div class="grade-3col">
                    <div>
                        <div class="label">Cor:</div>
                        <div class="valor">${ordem.aparelho_cor || '-'}</div>
                    </div>
                    <div>
                        <div class="label">Número de Série:</div>
                        <div class="valor">${ordem.aparelho_ns || '-'}</div>
                    </div>
                    <div>
                        <div class="label">IMEI:</div>
                        <div class="valor">${ordem.aparelho_imei || '-'}</div>
                    </div>
                </div>
            </div>

            <!-- 5. Detalhes do Serviço -->
            <div class="bloco-secao">
                <div class="secao-titulo">Detalhes do Serviço</div>
                <div class="label">Problema Relatado:</div>
                <div class="caixa-texto caixa-entrada-problema">${ordem.descricao_problema || ''}</div>
                <div class="label">Estado do Aparelho / Observações:</div>
                <div class="caixa-texto caixa-entrada-obs">${ordem.observacoes_aparelho || ''}</div>
                <div class="valor-total-linha">
                    <span class="valor-total-label">Valor Total:</span>
                    <span class="valor-total-num">${formatMoney(ordem.valor)}</span>
                </div>
            </div>
            `;
        }

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
        doc.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>OS ${ordem.numero_os} - ${tipo}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 12mm 14mm 10mm 14mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  html, body {
    width: 100%;
    background: #fff;
    color: #111;
    font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    padding: 0;
    line-height: 1.3;
  }

  .pagina-os {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 265mm;
    page-break-inside: avoid;
  }

  /* ── 1. CABEÇALHO ── */
  .cabecalho-container {
    text-align: center;
    position: relative;
    padding-bottom: 12px;
    border-bottom: 2.5px solid #111;
    margin-bottom: 12px;
  }
  .cabecalho-logo {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    max-width: 160px;
    max-height: 65px;
    display: flex;
    align-items: center;
  }
  .cabecalho-logo img {
    max-width: 160px;
    max-height: 65px;
    object-fit: contain;
  }
  .cabecalho-logo-placeholder {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    font-size: 11px;
    color: #666;
  }
  .empresa-nome {
    font-size: 20px;
    font-weight: bold;
    color: #111;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 3px;
  }
  .empresa-info {
    font-size: 12px;
    color: #222;
    line-height: 1.35;
  }

  /* ── TÍTULO DA OS ── */
  .titulo-os {
    text-align: center;
    font-size: 15px;
    font-weight: bold;
    letter-spacing: 0.4px;
    margin-bottom: 14px;
    color: #111;
  }

  /* ── 2. METADADOS ── */
  .meta-grade {
    display: grid;
    margin-bottom: 14px;
  }
  .meta-entrada {
    grid-template-columns: 220px 1fr;
  }
  .meta-saida {
    grid-template-columns: 180px 180px 1fr;
  }

  /* ── SEÇÕES ── */
  .bloco-secao {
    margin-bottom: 12px;
  }
  .secao-titulo {
    font-size: 13.5px;
    font-weight: bold;
    color: #111;
    border-bottom: 1px solid #c5c5c5;
    padding-bottom: 3px;
    margin-bottom: 6px;
  }

  /* ── TIPOGRAFIA DOS CAMPOS ── */
  .label {
    font-size: 10px;
    font-weight: 600;
    color: #444;
    margin-bottom: 2px;
  }
  .valor {
    font-size: 12px;
    font-weight: normal;
    color: #111;
  }

  /* ── GRADES DE CAMPOS ── */
  .grade-3col {
    display: grid;
    grid-template-columns: 2fr 1.3fr 1.3fr;
    gap: 10px;
  }

  /* ── CAIXAS DE TEXTO ── */
  .caixa-texto {
    border: 1px solid #bfbfbf;
    border-radius: 4px;
    padding: 8px 10px;
    font-size: 11.5px;
    color: #111;
    background: #fff;
    margin-top: 3px;
    margin-bottom: 8px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .caixa-entrada-problema {
    min-height: 68px;
  }
  .caixa-entrada-obs {
    min-height: 105px;
  }
  .caixa-saida-problema {
    min-height: 52px;
  }
  .caixa-saida-obs {
    min-height: 64px;
  }
  .caixa-saida-fin {
    min-height: 58px;
  }

  /* ── VALOR TOTAL ── */
  .valor-total-linha {
    text-align: right;
    margin-top: 10px;
    margin-bottom: 8px;
  }
  .valor-total-label {
    font-size: 16px;
    font-weight: bold;
    color: #222;
  }
  .valor-total-num {
    font-size: 18px;
    font-weight: bold;
    color: #000;
  }

  /* ── NORMAS IMPORTANTES (RODAPÉ) ── */
  .normas-container {
    border-top: 1px dotted #888;
    padding-top: 8px;
    margin-top: 6px;
    margin-bottom: 18px;
  }
  .normas-titulo {
    font-size: 10px;
    font-weight: bold;
    color: #111;
    margin-bottom: 3px;
  }
  .normas-texto {
    font-size: 8.5px;
    color: #333;
    line-height: 1.35;
  }

  /* ── ASSINATURAS PONTILHADAS ── */
  .assinaturas-container {
    display: flex;
    justify-content: space-around;
    padding: 0 10px;
    margin-top: 24px;
    margin-bottom: 4px;
  }
  .assinatura-bloco {
    text-align: center;
    width: 240px;
  }
  .assinatura-linha-pontilhada {
    border-top: 1.8px dotted #111;
    margin-bottom: 4px;
  }
  .assinatura-rotulo {
    font-size: 12px;
    font-weight: bold;
    color: #111;
  }

  @media print {
    html, body {
      height: 100%;
      page-break-after: avoid;
    }
    .pagina-os {
      min-height: auto;
    }
  }
</style>
</head>
<body>

<div class="pagina-os">
  <div>
    <!-- 1. CABEÇALHO -->
    <div class="cabecalho-container">
      ${logoHtml}
      <div class="empresa-nome">${config.empresa_nome || 'COBRINHA GAMES'}</div>
      <div class="empresa-info">${config.empresa_endereco || ''}</div>
      <div class="empresa-info">${telEmpresa}</div>
    </div>

    <!-- TÍTULO DESTACADO -->
    <div class="titulo-os">ORDEM DE SERVIÇO (${tipo.toUpperCase()}) Nº ${ordem.numero_os}</div>

    <!-- BLOCOS ESPECÍFICOS DE ENTRADA / SAÍDA -->
    ${corpoDocumento}
  </div>

  <div>
    <!-- 6/7. RODAPÉ (NORMAS E ASSINATURAS) -->
    ${normasHtml}
    ${assinaturasHtml}
  </div>
</div>

</body>
</html>`);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }, 300);
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
let logoFileSelected = null;

function onLogoSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WEBP).', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
        logoFileSelected = {
            base64Data: evt.target.result,
            extensao: file.name.split('.').pop() || 'png'
        };
        const img = document.getElementById('conf-logo-preview');
        const placeholder = document.getElementById('conf-logo-placeholder');
        const btnRemover = document.getElementById('btn-remover-logo');
        if (img) {
            img.src = evt.target.result;
            img.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';
        if (btnRemover) btnRemover.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
}

async function removerLogoClick() {
    if (!confirm('Deseja realmente remover o logotipo da empresa?')) return;
    try {
        await invoke('remover_logo');
        logoFileSelected = null;
        const img = document.getElementById('conf-logo-preview');
        const placeholder = document.getElementById('conf-logo-placeholder');
        const btnRemover = document.getElementById('btn-remover-logo');
        const input = document.getElementById('conf-logo-input');
        if (img) {
            img.src = '';
            img.style.display = 'none';
        }
        if (placeholder) placeholder.style.display = 'block';
        if (btnRemover) btnRemover.style.display = 'none';
        if (input) input.value = '';
        showToast('Logotipo removido com sucesso!', 'success');
    } catch (err) {
        showToast('Erro ao remover logotipo: ' + err, 'error');
    }
}

async function loadConfiguracoes() {
    try {
        const config = await invoke('get_configuracoes');
        document.getElementById('conf-empresa-nome').value = config.empresa_nome || '';
        document.getElementById('conf-empresa-endereco').value = config.empresa_endereco || '';
        document.getElementById('conf-empresa-telefone').value = config.empresa_telefone || '';
        document.getElementById('conf-normas-os').value = config.normas_os || '';

        // Carrega prévia do logotipo atual
        logoFileSelected = null;
        const img = document.getElementById('conf-logo-preview');
        const placeholder = document.getElementById('conf-logo-placeholder');
        const btnRemover = document.getElementById('btn-remover-logo');
        const input = document.getElementById('conf-logo-input');
        if (input) input.value = '';

        try {
            const logoBase64 = await invoke('get_logo_base64');
            if (logoBase64) {
                if (img) {
                    img.src = logoBase64;
                    img.style.display = 'block';
                }
                if (placeholder) placeholder.style.display = 'none';
                if (btnRemover) btnRemover.style.display = 'inline-block';
            } else {
                if (img) {
                    img.src = '';
                    img.style.display = 'none';
                }
                if (placeholder) placeholder.style.display = 'block';
                if (btnRemover) btnRemover.style.display = 'none';
            }
        } catch (_) {}
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

        if (logoFileSelected) {
            await invoke('salvar_logo', {
                base64Data: logoFileSelected.base64Data,
                extensao: logoFileSelected.extensao
            });
            logoFileSelected = null;
        }

        showToast('Configurações salvas com sucesso!', 'success');
        loadConfiguracoes();
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

