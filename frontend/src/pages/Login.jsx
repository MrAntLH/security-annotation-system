import { useState } from 'react'
import { Card, Form, Input, Button, Typography, message, Divider } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api'
import '../styles/global.css'

const { Title, Text, Paragraph } = Typography

const Login = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (values) => {
    setLoading(true)
    try {
      const response = await login({
        username: values.username,
        password: values.password
      })
      localStorage.setItem('token', response.access_token)
      localStorage.setItem('user', JSON.stringify(response.user))
      message.success('登录成功')
      if (response.user.role === 'requester') {
        navigate('/requester/dashboard')
      } else {
        navigate('/worker/dashboard')
      }
    } catch (error) {
      message.error('登录失败：用户名或密码错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card" bordered={false}>
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{
            width: 64,
            height: 64,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.35)'
          }}>
            <span style={{ fontSize: 28, color: 'white', fontWeight: 'bold' }}>AI</span>
          </div>
          <Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>标注系统</Title>
          <Paragraph style={{ color: '#8c8c8c', marginBottom: 0 }}>
            智能辅助标注平台
          </Paragraph>
        </div>

        <Divider style={{ margin: '8px 0 24px' }} />

        <Form
          name="login"
          onFinish={handleLogin}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入用户名"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="请输入密码"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{
                height: 48,
                fontSize: 16,
                fontWeight: 600
              }}
            >
              登录
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: '#595959' }}>
              还没有账号？
              <Link to="/register" style={{ color: '#1890ff', fontWeight: 500, marginLeft: 4 }}>立即注册</Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default Login
