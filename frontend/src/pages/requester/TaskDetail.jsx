import { useState, useEffect } from 'react'
import { Typography, Descriptions, Tag, Progress, Tabs, Button, Space, Popconfirm, Image, Spin, message, Card } from 'antd'
import { LeftOutlined, DeleteOutlined, LoadingOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { getTaskDetail, getTaskAnnotations, deleteTask, getPreAnnotationStatus } from '../../api'
import dayjs from 'dayjs'

const { Title } = Typography
const { TabPane } = Tabs

const RequesterTaskDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState(null)
  const [annotations, setAnnotations] = useState([])
  const [preAnnotationStatus, setPreAnnotationStatus] = useState(null)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  // 预标注进度轮询
  useEffect(() => {
    if (task && (task.status === 'pending' || task.status === 'pre_annotating')) {
      const interval = setInterval(async () => {
        try {
          const status = await getPreAnnotationStatus(id)
          setPreAnnotationStatus(status)
          if (status.status === 'annotating' || status.status === 'completed') {
            clearInterval(interval)
            loadData()
          }
        } catch (error) {
          console.error('获取预标注状态失败', error)
        }
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [task?.status])

  const loadData = async () => {
    try {
      setLoading(true)
      const taskData = await getTaskDetail(id)
      setTask(taskData)

      if (taskData.status === 'pending' || taskData.status === 'pre_annotating') {
        const status = await getPreAnnotationStatus(id)
        setPreAnnotationStatus(status)
      }

      if (['annotating', 'completed'].includes(taskData.status)) {
        const annotationsData = await getTaskAnnotations(id)
        setAnnotations(annotationsData)
      }
    } catch (error) {
      message.error('加载任务详情失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTask(id)
      message.success('删除成功')
      navigate('/requester/tasks')
    } catch (error) {
      message.error('删除失败')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!task) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Typography.Text type="secondary">任务不存在</Typography.Text>
      </div>
    )
  }

  const labelClasses = JSON.parse(task.label_classes || '[]')
  const progress = task.target_count > 0 ? Math.round((task.current_count / task.target_count) * 100) : 0

  // 预标注进度
  const preProgress = preAnnotationStatus && preAnnotationStatus.total_images > 0
    ? Math.round((preAnnotationStatus.processed_images / preAnnotationStatus.total_images) * 100)
    : 0

  const getStatusTag = () => {
    const statusMap = {
      pending: { color: 'orange', text: '等待预标注' },
      pre_annotating: { color: 'blue', text: '预标注中' },
      annotating: { color: 'green', text: '标注中' },
      completed: { color: 'default', text: '已完成' }
    }
    const { color, text } = statusMap[task.status] || { color: 'default', text: task.status }
    return <Tag color={color}>{text}</Tag>
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button icon={<LeftOutlined />} onClick={() => navigate('/requester/tasks')}>
            返回列表
          </Button>
          {['pending', 'pre_annotating', 'annotating'].includes(task.status) && (
            <Popconfirm
              title="确认删除该任务?"
              onConfirm={handleDelete}
              okText="是"
              cancelText="否"
            >
              <Button danger icon={<DeleteOutlined />}>
                删除任务
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      {/* 预标注状态卡片 */}
      {(task.status === 'pending' || task.status === 'pre_annotating') && preAnnotationStatus && (
        <Card
          title={
            <Space>
              <LoadingOutlined spin />
              <span>AI预标注进行中</span>
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">使用 Grounding DINO 进行自动标注，请勿关闭页面...</Text>
          </div>
          <Progress
            percent={preProgress}
            format={() => `${preAnnotationStatus.processed_images} / ${preAnnotationStatus.total_images} 张图片`}
          />
        </Card>
      )}

      <Descriptions title="任务信息" bordered column={2} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="任务标题" span={2}>{task.title}</Descriptions.Item>
        <Descriptions.Item label="状态">
          {getStatusTag()}
        </Descriptions.Item>
        <Descriptions.Item label="标注类别">
          <Space>
            {labelClasses.map((cls, index) => (
              <Tag key={index} color="blue">{cls}</Tag>
            ))}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="任务描述" span={2}>{task.description || '无'}</Descriptions.Item>
        <Descriptions.Item label="目标收集数">{task.target_count}</Descriptions.Item>
        <Descriptions.Item label="当前收集数">{task.current_count}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{dayjs(task.created_at).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        {task.status !== 'pending' && task.status !== 'pre_annotating' && (
          <Descriptions.Item label="收集进度" span={2}>
            <Progress percent={progress} status={progress >= 100 ? 'success' : 'active'} />
          </Descriptions.Item>
        )}
      </Descriptions>

      <Tabs defaultActiveKey="images">
        <TabPane tab="任务图片" key="images">
          <Image.PreviewGroup>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {(task.images || []).map((image, index) => (
                <div key={image.id} style={{ width: 200 }}>
                  <Image
                    width="100%"
                    height={150}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                    src={`/api/${image.filepath}`}
                  />
                  <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12 }}>
                    {image.filename}
                  </div>
                </div>
              ))}
            </div>
          </Image.PreviewGroup>
        </TabPane>

        {['annotating', 'completed'].includes(task.status) && (
          <TabPane tab="标注记录" key="annotations">
            {annotations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Typography.Text type="secondary">暂无标注记录</Typography.Text>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Typography.Text type="secondary">标注记录列表（开发中）</Typography.Text>
              </div>
            )}
          </TabPane>
        )}

        {task.status === 'completed' && (
          <TabPane tab="标注结果" key="result">
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <Typography.Text type="secondary">真值发现结果（开发中）</Typography.Text>
            </div>
          </TabPane>
        )}
      </Tabs>
    </div>
  )
}

export default RequesterTaskDetail
