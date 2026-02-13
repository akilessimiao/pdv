<template>
  <div class="pdv-container">
    <!-- Barra superior -->
    <nav class="navbar navbar-dark bg-primary">
      <div class="container-fluid">
        <span class="navbar-brand">
          <i class="bi bi-cash-coin"></i> PDV Tanque Digital
        </span>
        <div class="d-flex align-items-center text-white">
          <span class="me-3">{{ currentTime }}</span>
          <button class="btn btn-light btn-sm me-3" @click="openCashDrawer">
            <i class="bi bi-cash-stack"></i> Caixa
          </button>
          <button class="btn btn-warning btn-sm" @click="goToDashboard">
            <i class="bi bi-speedometer2"></i> Dashboard
          </button>
        </div>
      </div>
    </nav>

    <div class="container-fluid mt-3">
      <div class="row">
        <!-- Coluna de produtos -->
        <div class="col-md-8">
          <div class="card mb-3">
            <div class="card-body">
              <div class="input-group input-group-lg">
                <input 
                  type="text" 
                  class="form-control" 
                  placeholder="Código de barras ou nome do produto"
                  v-model="searchTerm"
                  @keyup.enter="searchProduct"
                  ref="searchInput"
                  autofocus
                >
                <button class="btn btn-primary" @click="searchProduct">
                  <i class="bi bi-search"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="row row-cols-2 row-cols-md-4 g-3">
            <div class="col" v-for="product in filteredProducts" :key="product.id">
              <div class="card product-card h-100" @click="addToCart(product)">
                <div class="card-body">
                  <h6 class="card-title">{{ product.nome }}</h6>
                  <p class="card-text text-success fw-bold">R$ {{ product.preco.toFixed(2) }}</p>
                  <small class="text-muted">Estoque: {{ product.estoque }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Coluna do carrinho -->
        <div class="col-md-4">
          <div class="card sticky-top" style="top: 20px;">
            <div class="card-header bg-success text-white">
              <h5 class="mb-0">
                <i class="bi bi-cart3"></i> Carrinho
                <span class="badge bg-light text-dark ms-2">{{ cart.length }} itens</span>
              </h5>
            </div>

            <div class="card-body">
              <div class="cart-items" style="max-height: 300px; overflow-y: auto;">
                <div v-for="(item, index) in cart" :key="index" class="cart-item mb-2 pb-2 border-bottom">
                  <div class="d-flex justify-content-between">
                    <div>
                      <strong>{{ item.nome }}</strong><br>
                      <small>R$ {{ item.preco.toFixed(2) }}</small>
                    </div>
                    <div class="text-end">
                      <div class="input-group input-group-sm" style="width: 100px;">
                        <button class="btn btn-outline-secondary" @click="updateQuantity(index, -1)">-</button>
                        <input type="text" class="form-control text-center" v-model.number="item.quantity" readonly>
                        <button class="btn btn-outline-secondary" @click="updateQuantity(index, 1)">+</button>
                      </div>
                      <small class="text-success d-block mt-1">
                        R$ {{ (item.preco * item.quantity).toFixed(2) }}
                      </small>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-link text-danger p-0 mt-1" @click="removeFromCart(index)">
                    <i class="bi bi-trash"></i> Remover
                  </button>
                </div>
                
                <div v-if="cart.length === 0" class="text-center text-muted py-4">
                  <i class="bi bi-cart-x" style="font-size: 2rem;"></i>
                  <p class="mt-2">Carrinho vazio</p>
                </div>
              </div>

              <div class="mt-3 border-top pt-3">
                <div class="d-flex justify-content-between mb-2">
                  <span>Subtotal:</span>
                  <span>R$ {{ subtotal.toFixed(2) }}</span>
                </div>
                <div class="d-flex justify-content-between mb-3">
                  <strong>Total:</strong>
                  <strong class="text-success" style="font-size: 1.5rem;">
                    R$ {{ total.toFixed(2) }}
                  </strong>
                </div>

                <div class="mb-3">
                  <label class="form-label">Forma de Pagamento</label>
                  <div class="btn-group w-100" role="group">
                    <button 
                      v-for="method in paymentMethods" 
                      :key="method.value"
                      :class="['btn', paymentMethod === method.value ? 'btn-primary' : 'btn-outline-primary']"
                      @click="paymentMethod = method.value"
                    >
                      <i :class="method.icon"></i> {{ method.label }}
                    </button>
                  </div>
                </div>

                <div v-if="paymentMethod === 'dinheiro'" class="mb-3">
                  <label class="form-label">Valor Recebido</label>
                  <input 
                    type="number" 
                    class="form-control" 
                    v-model="cashReceived"
                    step="0.01"
                    min="0"
                  >
                  <div v-if="cashReceived > 0" class="alert alert-info mt-2">
                    <strong>Troco:</strong> R$ {{ (cashReceived - total).toFixed(2) }}
                  </div>
                </div>

                <button 
                  class="btn btn-success btn-lg w-100 py-3" 
                  @click="finalizeSale"
                  :disabled="cart.length === 0 || (paymentMethod === 'dinheiro' && cashReceived < total)"
                >
                  <i class="bi bi-check2-circle"></i> FINALIZAR VENDA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

// Estado
const products = ref([])
const cart = ref([])
const searchTerm = ref('')
const paymentMethod = ref('dinheiro')
const cashReceived = ref(0)
const currentTime = ref('')

// Configurar axios
const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

// Métodos
const paymentMethods = [
  { value: 'dinheiro', label: 'Dinheiro', icon: 'bi bi-cash-coin' },
  { value: 'cartao', label: 'Cartão', icon: 'bi bi-credit-card' },
  { value: 'pix', label: 'Pix', icon: 'bi bi-qr-code' }
]

// Computed
const filteredProducts = computed(() => {
  if (!searchTerm.value) return products.value
  const term = searchTerm.value.toLowerCase()
  return products.value.filter(p => 
    p.nome.toLowerCase().includes(term) || 
    p.categoria?.toLowerCase().includes(term)
  )
})

const subtotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + (item.preco * item.quantity), 0)
})

const total = computed(() => subtotal.value)

// Funções
async function loadProducts() {
  try {
    const response = await api.get('/produtos')
    products.value = response.data
  } catch (error) {
    console.error('Erro ao carregar produtos:', error)
  }
}

function addToCart(product) {
  const existing = cart.value.find(item => item.id === product.id)
  if (existing) {
    existing.quantity += 1
  } else {
    cart.value.push({
      ...product,
      quantity: 1
    })
  }
  searchTerm.value = ''
}

function removeFromCart(index) {
  cart.value.splice(index, 1)
}

function updateQuantity(index, delta) {
  const item = cart.value[index]
  item.quantity += delta
  if (item.quantity < 1) item.quantity = 1
}

function searchProduct() {
  if (!searchTerm.value.trim()) return
  const product = products.value.find(p => 
    p.nome.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
  if (product) {
    addToCart(product)
  }
}

async function finalizeSale() {
  try {
    const venda = {
      itens: cart.value,
      total: total.value,
      forma_pagamento: paymentMethod.value,
      cliente: 'Consumidor'
    }
    
    const response = await api.post('/venda', venda)
    
    // Emitir recibo
    printReceipt(response.data.venda_id)
    
    // Limpar carrinho
    cart.value = []
    cashReceived.value = 0
    
    alert('✅ Venda registrada com sucesso!')
    
  } catch (error) {
    console.error('Erro ao registrar venda:', error)
    alert('Erro ao registrar venda. Verifique o console.')
  }
}

function printReceipt(vendaId) {
  const receipt = `
================================
      PDV TANQUE DIGITAL
================================
Venda #${vendaId}
${new Date().toLocaleString()}
================================
${cart.value.map(item => `
${item.nome}
${item.quantity} × R$ ${item.preco.toFixed(2)} = R$ ${(item.quantity * item.preco).toFixed(2)}
`).join('')}
================================
TOTAL: R$ ${total.value.toFixed(2)}
PAGO: ${paymentMethod.value.toUpperCase()}
${paymentMethod.value === 'dinheiro' ? `TROCO: R$ ${(cashReceived.value - total.value).toFixed(2)}` : ''}
================================
OBRIGADO VOLTE SEMPRE!
================================
  `
  console.log('📋 RECIBO:\n', receipt)
}

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function openCashDrawer() {
  alert('Funcionalidade de caixa em desenvolvimento!')
}

function goToDashboard() {
  router.push('/dashboard')
}

// Inicialização
onMounted(() => {
  loadProducts()
  updateClock()
  setInterval(updateClock, 60000)
})
</script>

<style scoped>
.pdv-container {
  height: 100vh;
  overflow-y: auto;
}

.product-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}

.cart-items {
  scrollbar-width: thin;
}

.cart-items::-webkit-scrollbar {
  width: 6px;
}

.cart-items::-webkit-scrollbar-thumb {
  background-color: #ddd;
  border-radius: 3px;
}
</style>