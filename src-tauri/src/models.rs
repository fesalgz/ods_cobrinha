use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Cliente {
    pub id: i64,
    pub nome: String,
    pub telefone: Option<String>,
    pub cpf: Option<String>,
    pub observacoes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ClienteInput {
    pub nome: String,
    pub telefone: Option<String>,
    pub cpf: Option<String>,
    pub observacoes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ordem {
    pub id: i64,
    pub numero_os: Option<String>,
    pub cliente_id: Option<i64>,
    pub cliente_nome: Option<String>,
    pub cliente_telefone: Option<String>,
    pub cliente_cpf: Option<String>,
    pub data_abertura: Option<String>,
    pub data_entrega: Option<String>,
    pub status: Option<String>,
    pub selecao_aparelho: Option<String>,
    pub aparelho_marca: Option<String>,
    pub aparelho_modelo: Option<String>,
    pub aparelho_cor: Option<String>,
    pub aparelho_ns: Option<String>,
    pub aparelho_imei: Option<String>,
    pub descricao_problema: Option<String>,
    pub observacoes_aparelho: Option<String>,
    pub servico_realizado: Option<String>,
    pub valor: Option<f64>,
    pub funcionario_nome: Option<String>,
    pub is_garantia: Option<i64>,
    pub motivo_finalizacao: Option<String>,
    pub justificativa_finalizacao: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OrdemInput {
    pub numero_os: Option<String>,
    pub cliente_id: i64,
    pub data_abertura: Option<String>,
    pub data_entrega: Option<String>,
    pub status: String,
    pub selecao_aparelho: Option<String>,
    pub aparelho_outro: Option<String>,
    pub aparelho_marca: Option<String>,
    pub aparelho_modelo: Option<String>,
    pub aparelho_cor: Option<String>,
    pub aparelho_ns: Option<String>,
    pub aparelho_imei: Option<String>,
    pub descricao_problema: Option<String>,
    pub observacoes_aparelho: Option<String>,
    pub valor: Option<f64>,
    pub funcionario_nome: Option<String>,
    pub is_garantia: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct FinalizarOrdemInput {
    pub motivo_finalizacao: String,
    pub justificativa_finalizacao: Option<String>,
    pub descricao_problema: Option<String>,
    pub observacoes_aparelho: Option<String>,
    pub valor: Option<f64>,
    pub is_garantia: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Usuario {
    pub id: i64,
    pub username: String,
    pub role: String,
    pub nome: String,
    pub nome_os: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Configuracoes {
    pub id: i64,
    pub nome_sistema: Option<String>,
    pub empresa_nome: Option<String>,
    pub empresa_endereco: Option<String>,
    pub empresa_telefone: Option<String>,
    pub logo_path: Option<String>,
    pub tema_escuro: i64,
    pub senha_painel: Option<String>,
    pub normas_os: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DashboardData {
    pub os_abertas: i64,
    pub os_finalizadas: i64,
    pub valor_faturado: f64,
    pub ultimas_ordens: Vec<Ordem>,
}

#[derive(Debug, Serialize)]
pub struct DadosImpressao {
    pub ordem: Ordem,
    pub config: Configuracoes,
    pub tipo: String,
}

