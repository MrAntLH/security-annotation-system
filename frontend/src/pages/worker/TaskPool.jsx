import { useState, useEffect } from 'react'
import { Typography, Row, Col, Card, Tag, Progress, Button, Input, Empty, Spin, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { getTaskList } from '../../api'
import dayjs from 'dayjs'

const { Title } = Typography
const { Search } = Input

const WorkerTaskPool = () => {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [filteredTasks, setFilteredTasks] = useState([])
  const [searchText, setSearchText] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getTaskList()
      const availableTasks = data.filter(t => t.status === 'annotating')
      setTasks(availableTasks)
      setFilteredTasks(availableTasks)
    } catch (error) {
      message.error('加载任务失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value) => {
    const searchValue = value.toLowerCase()
    const filtered = tasks.filter(task =>
      task.title.toLowerCase().includes(searchValue)
    )
    setFilteredTasks(filtered)
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
      <Title level={2} style={{ marginBottom: 16 }}>任务大厅</Title>

      <div style={{ marginBottom: 24, maxWidth: 400 }}>
        <Search
          placeholder="搜索任务标题..."
          onSearch={handleSearch}
          onChange={(e) => {
            if (!e.target.value) {
              handleSearch('')
            }
          }}
        />
      </div>

      {filteredTasks.length === 0 ? (
        <Empty description="暂无可用任务" />
      ) : (
        <Row gutter={16}>
          {filteredTasks.map(task => {
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
                  style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{ flex: 1 }}>
                    <Card.Meta
                      title={
                        <div style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginBottom: 8
                        }}>
                          {task.title}
                        </div>
                      }
                      description={
                        <div>
                          <div style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            marginBottom: 12,
                            fontSize: 12
                          }}>
                            {task.description || '无任务描述'}
                          </div>
                          <div style={{ marginBottom: 8, fontSize: 12, display: 'flex', alignItems: 'center' }}>
                            <span style={{ color: '#666', whiteSpace: 'nowrap' }}>标注类别：</span>
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
                          <div style={{ marginBottom: 8, fontSize: 12 }}>
                            <span style={{ color: '#666' }}>图片数：</span>
                            {task.image_count}
                          </div>
                          <div style={{
                            marginBottom: 8,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            color: '#666' 
                          }}>
                            <span>进度：</span>
                            <Progress
                              percent={task.target_count > 0 ? Math.round((task.current_count / task.target_count) * 100) : 0}
                              size="small"
                              status="active"
                              style={{ flex: 1, maxWidth: 150 }}
                              format={() => ''} 
                              strokeColor="#1890ff" 
                              trailColor="#f0f0f0" 
                            />
                            <span style={{
                              color: '#333', 
                              fontWeight: 500,
                              minWidth: 40, 
                              textAlign: 'right'
                            }}>
                              {task.target_count > 0
                                ? `${task.current_count}/${task.target_count}`
                                : '0/0（未设置总数）'}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#999' }}>
                            创建者：{task.creator_name} · {dayjs(task.created_at).format('YYYY-MM-DD')}
                          </div>
                        </div>
                      }
                    />
                  </div>
                  <div style={{ paddingTop: 12 }}>
                    <Button
                      type="primary"
                      onClick={() => navigate(`/worker/tasks/${task.id}`)}
                      size="middle"
                      block
                    >
                      开始标注
                    </Button>
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}
    </div>
  )
}

export default WorkerTaskPool
