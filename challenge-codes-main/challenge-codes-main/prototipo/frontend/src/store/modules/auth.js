import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

const state = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null
}

const mutations = {
  SET_LOADING(state, loading) {
    state.loading = loading
  },
  
  SET_ERROR(state, error) {
    state.error = error
  },
  
  SET_AUTH(state, { user, token }) {
    state.user = user
    state.token = token
    state.isAuthenticated = true
    state.error = null
    
    // Salvar token no localStorage
    if (token) {
      localStorage.setItem('auth_token', token)
    }
  },
  
  CLEAR_AUTH(state) {
    state.user = null
    state.token = null
    state.isAuthenticated = false
    state.error = null
    
    // Remover token do localStorage
    localStorage.removeItem('auth_token')
  },
  
  SET_USER(state, user) {
    state.user = user
  }
}

const actions = {
  async login({ commit }, credentials) {
    commit('SET_LOADING', true)
    commit('SET_ERROR', null)
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials)
      const { access_token, user } = response.data
      
      commit('SET_AUTH', { user, token: access_token })
      
      // Configurar token no axios para próximas requisições
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      
      return { success: true, user }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Erro ao fazer login'
      commit('SET_ERROR', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  async logout({ commit }) {
    commit('SET_LOADING', true)
    
    try {
      // Tentar fazer logout no servidor
      await axios.post(`${API_BASE_URL}/auth/logout`)
    } catch (error) {
      console.warn('Erro ao fazer logout no servidor:', error)
    } finally {
      // Limpar estado local independentemente do servidor
      commit('CLEAR_AUTH')
      delete axios.defaults.headers.common['Authorization']
      commit('SET_LOADING', false)
    }
  },
  
  async checkAuth({ commit, state }) {
    const token = localStorage.getItem('auth_token')
    
    if (!token) {
      commit('CLEAR_AUTH')
      return false
    }
    
    // Se já temos usuário e token, verificar se ainda é válido
    if (state.token && state.user) {
      try {
        await axios.post(`${API_BASE_URL}/auth/verify-token`)
        return true
      } catch (error) {
        commit('CLEAR_AUTH')
        return false
      }
    }
    
    // Se não temos usuário, buscar dados do token
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      const response = await axios.get(`${API_BASE_URL}/auth/me`)
      const user = response.data
      
      commit('SET_AUTH', { user, token })
      return true
    } catch (error) {
      commit('CLEAR_AUTH')
      return false
    }
  },
  
  async fetchUser({ commit }) {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`)
      commit('SET_USER', response.data)
      return response.data
    } catch (error) {
      commit('SET_ERROR', 'Erro ao buscar dados do usuário')
      throw error
    }
  }
}

const getters = {
  isAuthenticated: state => state.isAuthenticated,
  user: state => state.user,
  token: state => state.token,
  loading: state => state.loading,
  error: state => state.error,
  isAdmin: state => state.user?.role === 'administrador'
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}
