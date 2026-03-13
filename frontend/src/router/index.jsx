import { createBrowserRouter, Navigate } from 'react-router-dom'
import Login from '../pages/Login'
import Register from '../pages/Register'
import AppLayout from '../components/AppLayout'
import ProtectedRoute from '../components/ProtectedRoute'
import Profile from '../pages/Profile'

import RequesterDashboard from '../pages/requester/Dashboard'
import RequesterTaskList from '../pages/requester/TaskList'
import RequesterTaskCreate from '../pages/requester/TaskCreate'
import RequesterTaskDetail from '../pages/requester/TaskDetail'

import WorkerDashboard from '../pages/worker/Dashboard'
import WorkerTaskPool from '../pages/worker/TaskPool'
import WorkerTaskAnnotate from '../pages/worker/TaskAnnotate'
import WorkerMyHistory from '../pages/worker/MyHistory'

// 根据角色重定向
const RoleRedirect = () => {
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')

  if (!token || !userStr) {
    return <Navigate to="/login" replace />
  }

  try {
    const user = JSON.parse(userStr)
    if (user.role === 'requester') {
      return <Navigate to="/requester/dashboard" replace />
    } else if (user.role === 'worker') {
      return <Navigate to="/worker/dashboard" replace />
    }
  } catch {
    return <Navigate to="/login" replace />
  }

  return <Navigate to="/login" replace />
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RoleRedirect />
  },
  {
    path: 'login',
    element: <Login />
  },
  {
    path: 'register',
    element: <Register />
  },

  // Requester 相关路由
  {
    element: (
      <ProtectedRoute requiredRole="requester">
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'requester',
        element: <Navigate to="dashboard" replace />
      },
      {
        path: 'requester/dashboard',
        element: <RequesterDashboard />
      },
      {
        path: 'requester/tasks',
        element: <RequesterTaskList />
      },
      {
        path: 'requester/tasks/create',
        element: <RequesterTaskCreate />
      },
      {
        path: 'requester/tasks/:id',
        element: <RequesterTaskDetail />
      },
      {
        path: 'requester/profile',
        element: <Profile />
      }
    ]
  },

  // Worker 相关路由
  {
    element: (
      <ProtectedRoute requiredRole="worker">
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'worker',
        element: <Navigate to="dashboard" replace />
      },
      {
        path: 'worker/dashboard',
        element: <WorkerDashboard />
      },
      {
        path: 'worker/tasks',
        element: <WorkerTaskPool />
      },
      {
        path: 'worker/tasks/:id',
        element: <WorkerTaskAnnotate />
      },
      {
        path: 'worker/history',
        element: <WorkerMyHistory />
      },
      {
        path: 'worker/profile',
        element: <Profile />
      }
    ]
  }
])

export default router
