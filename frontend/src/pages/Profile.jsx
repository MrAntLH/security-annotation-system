import { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Avatar,
  message,
  Upload,
  Divider,
  Typography,
  Row,
  Col,
  Space
} from 'antd'
import {
  UserOutlined,
  LockOutlined,
  UploadOutlined,
  SaveOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

const Profile = () => {
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [user, setUser] = useState(null)
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const userData = JSON.parse(userStr)
      setUser(userData)
      form.setFieldsValue({
        username: userData.username
      })
    }
  }, [])

  const handleAvatarChange = (info) => {
    if (info.file.status === 'done') {
      message.success('头像上传成功')
      // 这里可以设置新头像URL
    } else if (info.file.status === 'error') {
      message.error('头像上传失败')
    }
  }

  const handleUpdateProfile = async (values) => {
    try {
      setLoading(true)
      // TODO: 调用API更新用户信息
      message.success('信息更新成功')
      // 更新本地存储的用户信息
      const updatedUser = { ...user, username: values.username }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
    } catch (error) {
      message.error('更新失败')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }
    try {
      setLoading(true)
      // TODO: 调用API更新密码
      message.success('密码修改成功')
      passwordForm.resetFields()
    } catch (error) {
      message.error('密码修改失败')
    } finally {
      setLoading(false)
    }
  }

  // 生成渐变色头像
  const getGradientAvatar = () => {
    if (!user) return null
    const colors = user.role === 'requester'
      ? ['#1890ff', '#096dd9']
      : ['#52c41a', '#389e0d']
    return (
      <div style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(24, 144, 255, 0.3)',
        fontSize: 48,
        color: 'white',
        fontWeight: 'bold'
      }}>
        {user.username?.[0]?.toUpperCase() || 'U'}
      </div>
    )
  }

  return (
    <div className="profile-page" style={{ maxWidth: 900, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 24 }}>个人信息</Title>

      <Row gutter={24}>
        {/* 左侧：头像区域 */}
        <Col span={8}>
          <Card className="page-content" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              {avatarUrl ? (
                <Avatar src={avatarUrl} size={120} />
              ) : (
                getGradientAvatar()
              )}
            </div>
            <Upload
              showUploadList={false}
              action="/api/upload-avatar" // TODO: 替换为实际API
              onChange={handleAvatarChange}
              beforeUpload={(file) => {
                const isImage = file.type.startsWith('image/')
                if (!isImage) {
                  message.error('只能上传图片文件!')
                }
                const isLt2M = file.size / 1024 / 1024 < 2
                if (!isLt2M) {
                  message.error('图片大小不能超过 2MB!')
                }
                return isImage && isLt2M
              }}
            >
              <Button icon={<UploadOutlined />} block>
                更换头像
              </Button>
            </Upload>
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
              支持 JPG、PNG 格式，不超过 2MB
            </Text>
          </Card>
        </Col>

        {/* 右侧：信息编辑 */}
        <Col span={16}>
          <Card title="基本信息" className="page-content" style={{ marginBottom: 24 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdateProfile}
            >
              <Form.Item
                label="用户名"
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="请输入用户名" size="large" />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                  size="large"
                >
                  保存修改
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card title="修改密码" className="page-content">
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handleUpdatePassword}
            >
              <Form.Item
                label="当前密码"
                name="currentPassword"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" size="large" />
              </Form.Item>
              <Form.Item
                label="新密码"
                name="newPassword"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码长度不能少于6位' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" size="large" />
              </Form.Item>
              <Form.Item
                label="确认新密码"
                name="confirmPassword"
                rules={[{ required: true, message: '请确认新密码' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请再次输入新密码" size="large" />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                  size="large"
                  danger
                >
                  修改密码
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Profile
