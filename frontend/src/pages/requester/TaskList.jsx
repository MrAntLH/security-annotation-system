import { useState, useEffect } from 'react'
import { Typography, Button, Table, Tag, Progress, Space, Popconfirm, message, Spin } from 'antd'
import { PlusOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getTaskList, deleteTask } from '../../api'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const RequesterTaskList = () => {
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getTaskList()
      setTasks(data)
    } catch (error) {
      message.error('加载任务列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (taskId) => {
    try {
      await deleteTask(taskId)
      message.success('任务删除成功')
      loadData()
    } catch (error) {
      message.error('删除任务失败')
    }
  }

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 80
    },
    {
      title: '任务标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <a onClick={() => navigate(`/requester/tasks/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default'
        if (status === 'annotating') color = 'success'
        if (status === 'pending' || status === 'pre_annotating') color = 'processing'
        if (status === 'completed') color = 'default'
        return <Tag color={color}>{status}</Tag>
      }
    },
    {
      title: '标注类别',
      dataIndex: 'label_classes',
      key: 'label_classes',
      render: (text) => {
        try {
          const classes = JSON.parse(text)
          return (
            <Space>
              {classes.slice(0, 3).map((cls, index) => (
                <Tag key={index}>{cls}</Tag>
              ))}
              {classes.length > 3 && <Tag>...</Tag>}
            </Space>
          )
        } catch {
          return <Text type="secondary">无效格式</Text>
        }
      }
    },
    {
      title: '图片数',
      dataIndex: 'image_count',
      key: 'image_count'
    },
    {
      title: '进度',
      key: 'progress',
      render: (_, record) => {
        const percent = record.target_count > 0 ? Math.round((record.current_count / record.target_count) * 100) : 0
        return <Progress percent={percent} size="small" />
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time) => dayjs(time).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/requester/tasks/${record.id}`)}
          >
            查看
          </Button>
          <Popconfirm
            title="确认删除该任务?"
            description="删除后无法恢复，请谨慎操作"
            onConfirm={() => handleDelete(record.id)}
            okText="是"
            cancelText="否"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2}>任务管理</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/requester/tasks/create')}
        >
          创建任务
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Table
          dataSource={tasks}
          columns={columns}
          rowKey="id"
          bordered
          pagination={{
            pageSize: 10,
            showSizeChanger: true
          }}
        />
      )}
    </div>
  )
}

export default RequesterTaskList
