// backend/index.js (SEM SQLITE - usando arquivos JSON)
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

// Arquivos de dados
const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'produtos.json');
const SALES_FILE = path.join(DATA_DIR, 'vendas.json');
const USERS_FILE = path.join(DATA_DIR, 'usuarios.json');

// Inicializar dados
async function initData() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        // Verificar se os arquivos existem
        try {
            await fs.access(PRODUCTS_FILE);
        } catch {
            // Criar produtos iniciais
            const produtosIniciais = [
                { id: 1, nome: "Café Premium", preco: 12.90, estoque: 50, categoria: "Bebidas" },
                { id: 2, nome: "Energético", preco: 8.50, estoque: 30, categoria: "Bebidas" },
                { id: 3, nome: "Água 500ml", preco: 3.00, estoque: 100, categoria: "Bebidas" },
                { id: 4, nome: "Chocolate", preco: 6.90, estoque: 80, categoria: "Doces" },
                { id: 5, nome: "Salgadinho", preco: 5.50, estoque: 60, categoria: "Salgados" },
                { id: 6, nome: "Pastel", preco: 7.90, estoque: 40, categoria: "Salgados" },
                { id: 7, nome: "Refrigerante Lata", preco: 6.50, estoque: 70, categoria: "Bebidas" },
                { id: 8, nome: "Suco Natural", preco: 9.90, estoque: 30, categoria: "Bebidas" },
                { id: 9, nome: "Pão de Queijo", preco: 4.50, estoque: 45, categoria: "Salgados" },
                { id: 10, nome: "Brigadeiro", preco: 3.50, estoque: 120, categoria: "Doces" }
            ];
            await fs.writeFile(PRODUCTS_FILE, JSON.stringify(produtosIniciais, null, 2));
        }
        
        try {
            await fs.access(SALES_FILE);
        } catch {
            await fs.writeFile(SALES_FILE, JSON.stringify([], null, 2));
        }
        
        try {
            await fs.access(USERS_FILE);
        } catch {
            const usuariosIniciais = [
                { 
                    id: 1, 
                    nome: "Administrador", 
                    email: "admin@pdv.com", 
                    tipo: "admin", 
                    chave_ativacao: "TANQUE-2024-ABC123",
                    ativo: true
                }
            ];
            await fs.writeFile(USERS_FILE, JSON.stringify(usuariosIniciais, null, 2));
        }
        
        console.log('✅ Dados inicializados com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar dados:', error);
    }
}

// Funções auxiliares para ler/escrever dados
async function readJson(file) {
    try {
        const data = await fs.readFile(file, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function writeJson(file, data) {
    await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// Inicializar na startup
initData();

// ========== ROTAS DA API ==========

// Status do sistema
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ONLINE',
        sistema: 'PDV Tanque Digital',
        versao: '1.0.0',
        mensagem: 'API rodando! Vamos ficar ricos! 💰',
        hora: new Date().toISOString(),
        backend: 'JSON Database'
    });
});

// Listar produtos
app.get('/api/produtos', async (req, res) => {
    try {
        const produtos = await readJson(PRODUCTS_FILE);
        const produtosAtivos = produtos.filter(p => p.estoque > 0);
        res.json(produtosAtivos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar produtos' });
    }
});

// Buscar produto por ID
app.get('/api/produtos/:id', async (req, res) => {
    try {
        const produtos = await readJson(PRODUCTS_FILE);
        const produto = produtos.find(p => p.id === parseInt(req.params.id));
        
        if (produto) {
            res.json(produto);
        } else {
            res.status(404).json({ error: 'Produto não encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar produto' });
    }
});

// Cadastrar novo produto
app.post('/api/produtos', async (req, res) => {
    try {
        const produtos = await readJson(PRODUCTS_FILE);
        const novoProduto = {
            id: produtos.length > 0 ? Math.max(...produtos.map(p => p.id)) + 1 : 1,
            nome: req.body.nome,
            preco: req.body.preco,
            estoque: req.body.estoque || 0,
            categoria: req.body.categoria || 'Geral',
            data_cadastro: new Date().toISOString()
        };
        
        produtos.push(novoProduto);
        await writeJson(PRODUCTS_FILE, produtos);
        
        res.status(201).json({
            success: true,
            message: 'Produto cadastrado com sucesso!',
            produto: novoProduto
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao cadastrar produto' });
    }
});

// Registrar venda
app.post('/api/venda', async (req, res) => {
    try {
        const { itens, total, forma_pagamento, cliente } = req.body;
        
        // Ler dados atuais
        const produtos = await readJson(PRODUCTS_FILE);
        const vendas = await readJson(SALES_FILE);
        
        // Gerar ID da venda
        const vendaId = vendas.length > 0 ? Math.max(...vendas.map(v => v.id)) + 1 : 1;
        
        // Criar objeto da venda
        const novaVenda = {
            id: vendaId,
            total: total,
            forma_pagamento: forma_pagamento || 'dinheiro',
            itens: itens,
            cliente: cliente || 'Consumidor',
            vendedor: 'Sistema',
            data: new Date().toISOString()
        };
        
        // Atualizar estoque
        for (const item of itens) {
            const produtoIndex = produtos.findIndex(p => p.id === item.id);
            if (produtoIndex !== -1) {
                produtos[produtoIndex].estoque -= (item.quantidade || 1);
                if (produtos[produtoIndex].estoque < 0) {
                    produtos[produtoIndex].estoque = 0;
                }
            }
        }
        
        // Salvar dados
        vendas.push(novaVenda);
        await writeJson(SALES_FILE, vendas);
        await writeJson(PRODUCTS_FILE, produtos);
        
        res.status(201).json({
            success: true,
            message: 'Venda registrada com sucesso!',
            venda_id: vendaId,
            recibo: {
                numero: vendaId,
                data: novaVenda.data,
                total: total,
                itens: itens.length
            }
        });
    } catch (error) {
        console.error('Erro ao registrar venda:', error);
        res.status(500).json({ error: 'Erro ao registrar venda' });
    }
});

// Listar vendas
app.get('/api/vendas', async (req, res) => {
    try {
        const vendas = await readJson(SALES_FILE);
        const limite = parseInt(req.query.limit) || 20;
        res.json(vendas.slice(0, limite));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar vendas' });
    }
});

// Dashboard
app.get('/api/dashboard', async (req, res) => {
    try {
        const vendas = await readJson(SALES_FILE);
        const produtos = await readJson(PRODUCTS_FILE);
        
        const hoje = new Date().toISOString().split('T')[0];
        const vendasHoje = vendas.filter(v => v.data.split('T')[0] === hoje);
        
        const baixoEstoque = produtos.filter(p => p.estoque < 10).length;
        
        const totalVendasHoje = vendasHoje.reduce((sum, v) => sum + v.total, 0);
        const totalGeral = vendas.reduce((sum, v) => sum + v.total, 0);
        
        res.json({
            vendas_hoje: {
                quantidade: vendasHoje.length,
                valor: totalVendasHoje
            },
            baixo_estoque: baixoEstoque,
            total_geral: totalGeral,
            total_produtos: produtos.length,
            status: 'online',
            atualizado_em: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar dashboard' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { chave } = req.body;
        const usuarios = await readJson(USERS_FILE);
        
        const usuario = usuarios.find(u => 
            u.chave_ativacao === chave && u.ativo !== false
        );
        
        if (usuario) {
            res.json({
                success: true,
                token: `jwt-${usuario.id}-${Date.now()}`,
                user: {
                    id: usuario.id,
                    nome: usuario.nome,
                    tipo: usuario.tipo,
                    email: usuario.email
                },
                message: 'Login realizado com sucesso!'
            });
        } else {
            // Permitir login de desenvolvimento
            if (chave === 'dev' || chave === 'TANQUE-2024-ABC123') {
                res.json({
                    success: true,
                    token: `jwt-dev-${Date.now()}`,
                    user: {
                        id: 0,
                        nome: 'Desenvolvedor',
                        tipo: 'admin',
                        email: 'dev@pdv.com'
                    },
                    message: 'Modo desenvolvimento ativado'
                });
            } else {
                res.status(401).json({
                    success: false,
                    error: 'Chave de ativação inválida ou expirada'
                });
            }
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar login' });
    }
});

// Atualizar produto
app.put('/api/produtos/:id', async (req, res) => {
    try {
        const produtos = await readJson(PRODUCTS_FILE);
        const index = produtos.findIndex(p => p.id === parseInt(req.params.id));
        
        if (index === -1) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        produtos[index] = {
            ...produtos[index],
            ...req.body,
            id: parseInt(req.params.id) // Garantir que o ID não mude
        };
        
        await writeJson(PRODUCTS_FILE, produtos);
        res.json({
            success: true,
            message: 'Produto atualizado com sucesso!',
            produto: produtos[index]
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
});

// Deletar produto
app.delete('/api/produtos/:id', async (req, res) => {
    try {
        let produtos = await readJson(PRODUCTS_FILE);
        const index = produtos.findIndex(p => p.id === parseInt(req.params.id));
        
        if (index === -1) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        produtos.splice(index, 1);
        await writeJson(PRODUCTS_FILE, produtos);
        
        res.json({
            success: true,
            message: 'Produto removido com sucesso!'
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover produto' });
    }
});

// Repor estoque
app.post('/api/repor-estoque', async (req, res) => {
    try {
        const { produto_id, quantidade } = req.body;
        const produtos = await readJson(PRODUCTS_FILE);
        const index = produtos.findIndex(p => p.id === produto_id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        produtos[index].estoque += (quantidade || 1);
        await writeJson(PRODUCTS_FILE, produtos);
        
        res.json({
            success: true,
            message: `Estoque reposto! Novo estoque: ${produtos[index].estoque}`,
            produto: produtos[index]
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao repor estoque' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║     🚀 PDV TANQUE DIGITAL - BACKEND     ║
╠══════════════════════════════════════════╣
║ 📡 URL: http://localhost:${PORT}          ║
║ 🗄️  Banco: JSON Files (sem SQLite)       ║
║ 🕐 ${new Date().toLocaleString('pt-BR')}   ║
╠══════════════════════════════════════════╣
║ 📊 ROTAS DISPONÍVEIS:                    ║
║ • GET  /api/status                       ║
║ • GET  /api/produtos                     ║
║ • POST /api/venda                        ║
║ • GET  /api/vendas                       ║
║ • GET  /api/dashboard                    ║
║ • POST /api/login                        ║
║ • POST /api/produtos                     ║
║ • PUT  /api/produtos/:id                 ║
║ • DELETE /api/produtos/:id               ║
║ • POST /api/repor-estoque                ║
╠══════════════════════════════════════════╣
║ 💡 CHAVE DE DESENVOLVIMENTO:             ║
║   "TANQUE-2024-ABC123" ou "dev"          ║
╚══════════════════════════════════════════╝
    `);
});