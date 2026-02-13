<!-- frontend/src/App.vue -->
<template>
  <v-app>
    <!-- Login se não autenticado -->
    <div v-if="!logado" class="login-container">
      <v-card width="400" class="pa-6">
        <v-card-title class="text-h5 text-center">
          PDV Tanque Digital
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="chave" label="Chave de Ativação" />
          <v-btn block color="primary" @click="login">
            Entrar no Sistema
          </v-btn>
        </v-card-text>
      </v-card>
    </div>

    <!-- Sistema principal -->
    <div v-else>
      <!-- Barra superior -->
      <v-app-bar color="primary" dark>
        <v-toolbar-title>PDV Tanque Digital</v-toolbar-title>
        <v-spacer />
        <v-chip color="success">Online</v-chip>
        <v-btn icon @click="abrirCaixa = true">
          <v-icon>mdi-cash-register</v-icon>
        </v-btn>
      </v-app-bar>

      <!-- Conteúdo -->
      <v-main>
        <v-container fluid>
          <!-- Busca de produto -->
          <v-row>
            <v-col cols="12">
              <v-text-field 
                v-model="busca"
                label="Buscar produto (código ou nome)"
                append-inner-icon="mdi-magnify"
                @keyup.enter="adicionarProdutoFake"
                autofocus
              />
            </v-col>
          </v-row>

          <!-- Carrinho de vendas -->
          <v-row>
            <v-col cols="8">
              <v-card>
                <v-card-title>Itens da Venda</v-card-title>
                <v-card-text>
                  <v-table density="compact">
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Qtd</th>
                        <th>Preço</th>
                        <th>Total</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, index) in carrinho" :key="index">
                        <td>{{ item.nome }}</td>
                        <td>
                          <v-text-field 
                            v-model.number="item.quantidade"
                            type="number"
                            density="compact"
                            style="max-width: 80px;"
                          />
                        </td>
                        <td>R$ {{ item.preco.toFixed(2) }}</td>
                        <td>R$ {{ (item.preco * item.quantidade).toFixed(2) }}</td>
                        <td>
                          <v-btn icon size="small" @click="removerItem(index)">
                            <v-icon color="red">mdi-delete</v-icon>
                          </v-btn>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Painel de pagamento -->
            <v-col cols="4">
              <v-card>
                <v-card-title>Pagamento</v-card-title>
                <v-card-text>
                  <div class="text-h4 mb-4 text-right">
                    Total: R$ {{ totalCarrinho.toFixed(2) }}
                  </div>

                  <v-radio-group v-model="formaPagamento">
                    <v-radio label="Dinheiro" value="dinheiro" />
                    <v-radio label="Cartão" value="cartao" />
                    <v-radio label="Pix" value="pix" />
                  </v-radio-group>

                  <v-text-field 
                    v-if="formaPagamento === 'dinheiro'"
                    v-model="valorPago"
                    label="Valor recebido"
                    prefix="R$"
                  />

                  <div v-if="formaPagamento === 'dinheiro' && valorPago">
                    <strong>Troco:</strong> R$ {{ (valorPago - totalCarrinho).toFixed(2) }}
                  </div>

                  <v-btn 
                    block 
                    color="success" 
                    size="large"
                    @click="finalizarVenda"
                    :disabled="carrinho.length === 0"
                  >
                    FINALIZAR VENDA
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-main>
    </div>

    <!-- Dialog de abertura de caixa -->
    <v-dialog v-model="abrirCaixa" max-width="400">
      <v-card>
        <v-card-title>Abertura de Caixa</v-card-title>
        <v-card-text>
          <v-text-field 
            v-model="saldoInicial"
            label="Saldo inicial"
            prefix="R$"
            type="number"
          />
        </v-card-text>
        <v-card-actions>
          <v-btn @click="abrirCaixa = false">Cancelar</v-btn>
          <v-btn color="primary" @click="confirmarAbertura">Confirmar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'

// Estado
const logado = ref(false)
const chave = ref('')
const busca = ref('')
const carrinho = ref([])
const formaPagamento = ref('dinheiro')
const valorPago = ref(0)
const abrirCaixa = ref(false)
const saldoInicial = ref(100)

// Computed
const totalCarrinho = computed(() => {
  return carrinho.value.reduce((total, item) => {
    return total + (item.preco * item.quantidade)
  }, 0)
})

// Métodos
const login = () => {
  // Simulação de login
  if (chave.value.trim() !== '') {
    logado.value = true
    // Aqui faria request para backend
  }
}

const adicionarProdutoFake = () => {
  if (!busca.value.trim()) return
  
  carrinho.value.push({
    id: Date.now(),
    nome: `Produto ${busca.value}`,
    preco: Math.random() * 50 + 5,
    quantidade: 1
  })
  
  busca.value = ''
}

const removerItem = (index) => {
  carrinho.value.splice(index, 1)
}

const finalizarVenda = () => {
  alert(`Venda finalizada! Total: R$ ${totalCarrinho.value.toFixed(2)}`)
  
  // Aqui enviaria para backend
  fetch('http://localhost:3000/api/venda', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itens: carrinho.value,
      total: totalCarrinho.value,
      formaPagamento: formaPagamento.value
    })
  })
  
  carrinho.value = []
  valorPago.value = 0
}

const confirmarAbertura = () => {
  alert(`Caixa aberto com R$ ${saldoInicial.value}`)
  abrirCaixa.value = false
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>