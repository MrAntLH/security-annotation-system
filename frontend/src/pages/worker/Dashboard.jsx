import { useState, useEffect } from 'react'
import { Typography, Row, Col, Card, Statistic, List, Spin, message, Tag, Progress } from 'antd'
import {
  CheckCircleOutlined,
  AppstoreOutlined,
  TrophyOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getTaskStats, getTaskList } from '../../api'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const WorkerDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [availableTasks, setAvailableTasks] = useState([])
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
      setAvailableTasks(tasksData.slice(0, 6))
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
        <Col span={8}>
          <Card className="stat-card" style={{ padding: '16px' }}>
            <Statistic
              title="已标注任务数"
              value={stats?.my_annotations || 0}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px' }} />}
              titleStyle={{
                fontWeight: 600,
                color: '#000000d9',
                marginBottom: 8,
                fontSize: '16px'
              }}
              valueStyle={{
                fontSize: '24px',
                fontWeight: 500
              }}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card className="stat-card" style={{ padding: '16px' }}>
            <Statistic
              title="可用任务数"
              value={stats?.available_tasks || 0}
              prefix={<AppstoreOutlined style={{ color: '#1890ff', fontSize: '20px' }} />}
              titleStyle={{
                fontWeight: 600,
                color: '#000000d9',
                marginBottom: 8,
                fontSize: '16px'
              }}
              valueStyle={{
                fontSize: '24px',
                fontWeight: 500
              }}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card className="stat-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                fontWeight: 600,
                color: '#000000d9',
                marginBottom: 8,
                fontSize: '16px'
              }}>
                我的得分
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <TrophyOutlined style={{ color: '#faad14', fontSize: '20px' }} />
                <div style={{ flex: 1 }}>
                  <Progress
                    type="line"
                    size="small"
                    percent={Math.round((stats?.my_weight || 0) / 2 * 100)}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068'
                    }}
                    format={(percent) => `${Math.round((stats?.my_weight || 0) * 50)}/100`}
                  />
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 待标注任务快速入口 */}
      <Card title="待标注任务" className="page-content">
        {availableTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <Text type="secondary">暂无可用任务</Text>
          </div>
        ) : (
          <Row gutter={16}>
            {availableTasks.map(task => {
              let labelClasses = []
              try {
                labelClasses = JSON.parse(task.label_classes || '[]')
              } catch (e) {
                console.error('解析 label_classes 失败:', task.label_classes)
                labelClasses = []
              }
              return (
                <Col span={8} key={task.id}>
                  <Card
                    className="task-card"
                    hoverable
                    onClick={() => navigate(`/worker/tasks/${task.id}`)}
                  >
                    <Card.Meta
                      title={
                        <div style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {task.title}
                        </div>
                      }
                      description={
                        <div>
                          <div style={{ marginBottom: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              图片数：{task.image_count}
                            </Text>
                          </div>
                          <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                              标注类别：
                            </Text>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                              {labelClasses.slice(0, 3).map((cls, idx) => (
                                <Tag key={idx} size="small" color="blue">
                                  {cls}
                                </Tag>
                              ))}
                              {labelClasses.length > 3 && (
                                <Tag size="small" color="default">
                                  +{labelClasses.length - 3}
                                </Tag>
                              )}
                              {labelClasses.length === 0 && (
                                <Tag size="small" color="default">
                                  未设置
                                </Tag>
                              )}
                            </div>
                          </div>
                        </div>
                      }
                    />
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                      <Tag color={task.status === 'annotating' ? 'success' : 'default'}>
                        {task.status === 'annotating' ? '可标注' : '待处理'}
                      </Tag>
                    </div>
                  </Card>
                </Col>
              )
            })}
            {availableTasks.length >= 6 && (
              <Col span={24} style={{ textAlign: 'center', marginTop: 16 }}>
                <Text
                  type="secondary"
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => navigate('/worker/tasks')}
                >
                  查看全部...
                </Text>
              </Col>
            )}
          </Row>
        )}
      </Card>
    </div>
  )
}

export default WorkerDashboard
