import { useState, useEffect } from 'react'
import { Typography, Row, Col, Card, Statistic, List, Spin, message, Progress } from 'antd'
import {
  FileTextOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getTaskStats, getTaskList } from '../../api'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const RequesterDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [tasks, setTasks] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [statsData, tasksData] = await Promise.all([
        getTaskStats(),
        getTaskList()
      ])
      setStats(statsData)

      const inProgressTasks = tasksData.filter(t => t.status !== 'completed')
      setTasks(inProgressTasks)
    } catch (error) {
      message.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>工作看板</Title>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="任务总数"
              value={stats?.total_tasks || 0}
              prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="待处理"
              value={(stats?.pending_tasks || 0) + (stats?.pre_annotating_tasks || 0)}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="标注中"
              value={stats?.annotating_tasks || 0}
              prefix={<SyncOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="已完成"
              value={stats?.completed_tasks || 0}
              prefix={<CheckCircleOutlined style={{ color: '#8c8c8c' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* 下方内容区 */}
      <Row gutter={24}>
        {/* 左侧：任务进度列表 */}
        <Col span={14}>
          <Card title="任务进度" className="page-content">
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Text type="secondary">暂无进行中的任务</Text>
              </div>
            ) : (
              <List
                dataSource={tasks}
                renderItem={(task) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/requester/tasks/${task.id}`)}
                  >
                    <List.Item.Meta
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong>{task.title}</Text>
                          <Text type="secondary">{task.status}</Text>
                        </div>
                      }
                      description={
                        <Progress
                          percent={task.target_count > 0 ? Math.round((task.current_count / task.target_count) * 100) : 0}
                          size="small"
                          style={{ width: '60%', marginTop: 8 }}
                        />
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* 右侧：最近完成 */}
        <Col span={10}>
          <Card title="最近完成" className="page-content">
            {(() => {
              const completedTasks = tasks.filter(t => t.status === 'completed').slice(0, 5)
              if (completedTasks.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '24px' }}>
                    <Text type="secondary">暂无已完成任务</Text>
                  </div>
                )
              }
              return (
                <List
                  dataSource={completedTasks}
                  renderItem={(task) => (
                    <List.Item>
                      <List.Item.Meta
                        title={task.title}
                        description={dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}
                      />
                    </List.Item>
                  )}
                />
              )
            })()}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default RequesterDashboard
