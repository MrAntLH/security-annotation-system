import axios from 'axios'
import { message } from 'antd'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      message.error('登录已过期，请重新登录')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// 用户相关
export const login = (data) => api.post('/users/login', data)
export const register = (data) => api.post('/users/register', data)
export const getMe = () => api.get('/users/me')

// 任务相关
export const createTask = (formData) => api.post('/tasks/create', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const getTaskList = () => api.get('/tasks/')
export const getTaskStats = () => api.get('/tasks/stats')
export const getTaskDetail = (taskId) => api.get(`/tasks/${taskId}`)
export const getTaskAnnotations = (taskId) => api.get(`/tasks/${taskId}/annotations`)
export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`)
export const getPreAnnotationStatus = (taskId) => api.get(`/tasks/${taskId}/pre-annotation-status`)

// 标注相关
export const submitAnnotation = (data) => api.post('/annotations/submit', data)
export const getMyAnnotations = () => api.get('/annotations/my')

