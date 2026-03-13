import { Navigate, useLocation } from 'react-router-dom'

const ProtectedRoute = ({ children, requiredRole }) => {
  const location = useLocation()
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')

  // 未登录用户直接跳登录页
  if (!token || !userStr) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  let user
  try {
    user = JSON.parse(userStr)
  } catch {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // 有角色限制时检查用户角色
  if (requiredRole && user.role !== requiredRole) {
    // 角色不匹配，跳转到对应仪表板
    const targetPath = user.role === 'requester' ? '/requester/dashboard' : '/worker/dashboard'
    return <Navigate to={targetPath} replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute
