import { useState, useEffect } from 'react'
import { Typography, Table, Tag, Spin, Empty, message } from 'antd'
import { getMyAnnotations } from '../../api'
import dayjs from 'dayjs'

const { Title } = Typography

const WorkerMyHistory = () => {
  const [loading, setLoading] = useState(true)
  const [annotations, setAnnotations] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getMyAnnotations()
      setAnnotations(data)
    } catch (error) {
      message.error('加载标注历史失败')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: '任务标题',
      dataIndex: 'task_title',
      key: 'task_title'
    },
    {
      title: '任务状态',
      dataIndex: 'task_status',
      key: 'task_status',
      render: (status) => {
        let color = 'default'
        if (status === 'annotating') color = 'success'
        if (status === 'completed') color = 'default'
        return <Tag color={color}>{status}</Tag>
      }
    },
    {
      title: '标注图片数',
      dataIndex: 'image_count',
      key: 'image_count'
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm')
    }
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Title level={2} style={{ marginBottom: 16 }}>标注历史</Title>

      {annotations.length === 0 ? (
        <Empty description="您还没有标注记录" />
      ) : (
        <Table
          dataSource={annotations}
          columns={columns}
          rowKey="annotation_id"
          bordered
        />
      )}
    </div>
  )
}

export default WorkerMyHistory
