import { useState } from 'react'
import styled from 'styled-components' // 新增：引入styled-components
import { Layout, Menu, Avatar, Button, Space, Tag, Typography } from 'antd'
import {
  DashboardOutlined,
  UnorderedListOutlined,
  PlusCircleOutlined,
  AppstoreOutlined,
  HistoryOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

const { Header, Sider, Content } = Layout
const { Text } = Typography

// 新增：自定义样式按钮（解决hoverStyle不生效问题）
const StyledCollapseButton = styled(Button)`
  border-radius: 8px;
  transition: all 0.3s;
  margin-right: 16px;
  &:hover {
    background: #f5f5f5 !important; // !important 确保覆盖Antd默认样式
    border-color: transparent !important;
  }
`

const StyledLogoutButton = styled(Button)`
  border-radius: 6px;
  color: #8c8c8c;
  transition: all 0.3s;
  &:hover {
    color: #ff4d4f !important;
    background: #fff1f0 !important;
    border-color: transparent !important;
  }
`

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  if (!user) {
    return null
  }

  // 检测是否是标注页面
  const isAnnotatePage = location.pathname.includes('/tasks/')

  // 根据用户角色确定菜单项
  const menuItems = user.role === 'requester'
    ? [
        {
          key: '/requester/dashboard',
          icon: <DashboardOutlined />,
          label: '工作看板',
        },
        {
          key: '/requester/tasks',
          icon: <UnorderedListOutlined />,
          label: '任务管理',
        },
        {
          key: '/requester/tasks/create',
          icon: <PlusCircleOutlined />,
          label: '创建任务',
        },
        {
          key: '/requester/profile',
          icon: <UserOutlined />,
          label: '个人信息',
        },
      ]
    : [
        {
          key: '/worker/dashboard',
          icon: <DashboardOutlined />,
          label: '工作看板',
        },
        {
          key: '/worker/tasks',
          icon: <AppstoreOutlined />,
          label: '任务大厅',
        },
        {
          key: '/worker/history',
          icon: <HistoryOutlined />,
          label: '标注历史',
        },
        {
          key: '/worker/profile',
          icon: <UserOutlined />,
          label: '个人信息',
        },
      ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={180}
        style={{
          background: 'linear-gradient(180deg, #001529 0%, #000d1a 100%)',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {collapsed ? (
            <span style={{ fontSize: 20, color: 'white', fontWeight: 'bold' }}>AI</span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                width: 36,
                height: 36,
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <span style={{ fontSize: 18, color: 'white', fontWeight: 'bold' }}>AI</span>
              </div>
              <span style={{ fontSize: 18, color: 'white', fontWeight: 600 }}>标注系统</span>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{
            borderRight: 0,
            background: 'transparent',
            marginTop: 8
          }}
          itemStyle={{
            margin: '4px 8px',
            borderRadius: 8,
          }}
          selectedItemStyle={{
            background: 'rgba(24, 144, 255, 0.2)',
          }}
          activeKey={location.pathname}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          minHeight: 64, // 修改：固定高度改为最小高度，避免内容裁剪
          height: 'auto' // 新增：允许高度自适应
        }}>
          {/* 修改：替换为自定义样式按钮，移除无效的hoverStyle */}
          <StyledCollapseButton
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
          />
          <Space size="middle" style={{ alignItems: 'center' }}>
            <Avatar
              size="large"
              style={{
                // 修改：渐变背景改为backgroundImage，清空backgroundColor
                backgroundImage: user.role === 'requester'
                  ? 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)'
                  : 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                backgroundColor: 'transparent', // 新增：清空默认背景色
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
                fontSize: 18,
                fontWeight: 600
              }}
            >
              {user.username?.[0]?.toUpperCase() || 'U'} {/* 新增：可选链保护，避免user.username为空报错 */}
            </Avatar>
            {/* 修改：用户信息区域改为flex布局，让用户名和标签同行显示 */}
            <div style={{ 
              minWidth: 0, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, // 新增：间距控制
              flexWrap: 'nowrap' // 新增：禁止换行
            }}>
              <div style={{
                fontWeight: 600,
                fontSize: 14,
                color: '#000000d9',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 80, // 修改：缩小宽度，给标签留空间
                flexShrink: 1 // 新增：允许宽度收缩
              }}>{user.username}</div>
              <Tag
                color={user.role === 'requester' ? 'blue' : 'green'}
                style={{
                  borderRadius: 4,
                  fontSize: 12,
                  padding: '2px 8px',
                  marginLeft: 0,
                  flexShrink: 0 // 新增：标签不收缩
                }}
              >
                {user.role === 'requester' ? '标注请求方' : '标注工人'}
              </Tag>
            </div>
            {/* 修改：替换为自定义样式按钮，移除无效的hoverStyle */}
            <StyledLogoutButton
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              size="small"
            >
              退出
            </StyledLogoutButton>
          </Space>
        </Header>
        <Content
          className={isAnnotatePage ? 'annotate-content' : ''}
          style={{
            background: '#f0f2f5',
            minHeight: 'calc(100vh - 64px)',
            height: 'auto',
            overflow: isAnnotatePage ? 'hidden' : 'auto'
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout