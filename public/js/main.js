// Lógica para alternar campos dependendo do tipo de aparelho
function toggleCamposAparelho() {
    const selecao = document.getElementById('selecao_aparelho');

    if (!selecao) return; // Se não estiver na página de formulário de OS

    const valor = selecao.value;
    const campoImei = document.querySelector('.campo-celular');
    const camposComuns = document.querySelectorAll('.campos-comuns');
    const campoOutro = document.querySelector('.campo-outro');
    const inputOutro = document.getElementById('aparelho_outro');

    if (valor === '') {
        // Esconder tudo
        campoImei.style.display = 'none';
        if (campoOutro) campoOutro.style.display = 'none';
        if (inputOutro) inputOutro.removeAttribute('required');
        camposComuns.forEach(campo => campo.style.display = 'none');
        // Remover obrigatoriedade
        removerRequired(camposComuns);
    } else {
        // Mostrar campos comuns
        camposComuns.forEach(campo => campo.style.display = 'block');
        adicionarRequired(camposComuns);

        // Se for celular, mostrar IMEI
        if (valor === 'Celular') {
            campoImei.style.display = 'block';
        } else {
            campoImei.style.display = 'none';
        }

        // Se for outro, mostrar campo de descrição
        if (valor === 'Outro') {
            if (campoOutro) campoOutro.style.display = 'block';
            if (inputOutro) inputOutro.setAttribute('required', 'required');
        } else {
            if (campoOutro) campoOutro.style.display = 'none';
            if (inputOutro) inputOutro.removeAttribute('required');
        }
    }
}

function adicionarRequired(elementos) {
    elementos.forEach(el => {
        const input = el.querySelector('input');
        if (input && (input.id === 'aparelho_marca' || input.id === 'aparelho_modelo')) {
            input.setAttribute('required', 'required');
        }
    });
}

function removerRequired(elementos) {
    elementos.forEach(el => {
        const input = el.querySelector('input');
        if (input) {
            input.removeAttribute('required');
        }
    });
}

function toggleDataEntrega() {
    const statusSelect = document.getElementById('status');
    const dataEntregaContainer = document.getElementById('container_data_entrega');
    const dataEntregaInput = document.getElementById('data_entrega');

    if (!statusSelect || !dataEntregaContainer || !dataEntregaInput) return;

    if (statusSelect.value === 'Finalizado') {
        dataEntregaContainer.style.display = 'block';
        dataEntregaInput.setAttribute('required', 'required');
    } else {
        dataEntregaContainer.style.display = 'none';
        dataEntregaInput.removeAttribute('required');
        dataEntregaInput.value = ''; // Limpa a data se não estiver finalizado
    }
}

// Inicializar na carga da página
document.addEventListener('DOMContentLoaded', () => {
    toggleCamposAparelho();
    toggleDataEntrega();
});
