# SISTEMA DE ORDENS DE SERVIÇO (v3.0.0)

Sistema desktop de alta performance desenvolvido para emissão e gerenciamento de ordens de serviço.

## 🚀 Tecnologias (Migrado na v3.0.0)

- **Tauri v2** (Nativo, leve e ultraveloz)
- **Rust** (Backend nativo e seguro)
- **SQLite3** (rusqlite nativo com modo WAL)
- **Frontend Moderno** (HTML5, CSS3 Tecnológico, JavaScript SPA)
- **Consumo de Memória:** ~30MB a 35MB de RAM (queda drástica de ~500MB no antigo Electron)

## 📦 Como rodar o projeto em ambiente de desenvolvimento

### Pré-requisitos
- Node.js (v18+)
- Rust & Cargo (1.90+)

### Instalar dependências
```bash
npm install
```

### Iniciar em modo desenvolvimento
```bash
npm run dev
```

### Gerar binário / instalador de produção
```bash
npm run build
```

## 🖥️ Instalação no PC do Cliente

1. Acesse [Releases](https://github.com/fesalgz/ods_cobrinha/releases) no GitHub
2. Baixe o instalador da **versão 3.0.0**.
3. Siga os passos do assistente de instalação.
4. O aplicativo abrirá instantaneamente consumindo menos de 60MB de memória RAM, preservando integralmente o banco de dados das versões anteriores.
