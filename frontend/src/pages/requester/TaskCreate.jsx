import { useState } from 'react'
import { Typography, Form, Input, InputNumber, Select, Upload, Button, message, Space, Tag } from 'antd'
import { PlusOutlined, InboxOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { createTask } from '../../api'

const { Title } = Typography
const { TextArea } = Input

const RequesterTaskCreate = () => {
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState([])
  const [labelClasses, setLabelClasses] = useState([])
  const [labelInput, setLabelInput] = useState('')
  const navigate = useNavigate()

  const handleUploadChange = ({ fileList: newFileList }) => {
    setFileList(newFileList)
  }

  const addLabel = () => {
    if (labelInput && !labelClasses.includes(labelInput)) {
      setLabelClasses([...labelClasses, labelInput])
      setLabelInput('')
    }
  }

  const removeLabel = (label) => {
    setLabelClasses(labelClasses.filter(item => item !== label))
  }

  const handleSubmit = async (values) => {
    if (fileList.length === 0) {
      message.error('请至少选择一个图片文件')
      return
    }

    if (labelClasses.length === 0) {
      message.error('请至少添加一个标注类别')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('title', values.title)
    formData.append('description', values.description || '')
    formData.append('label_classes', JSON.stringify(labelClasses))
    formData.append('target_count', values.target_count)

    fileList.forEach(file => {
      if (file.originFileObj) {
        formData.append('files', file.originFileObj)
      }
    })

    try {
      await createTask(formData)
      message.success('任务创建成功')
      navigate('/requester/tasks')
    } catch (error) {
      message.error('创建任务失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={2} style={{ marginBottom: 8 }}>创建任务</Title>
      </div>

      <Form
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          target_count: 3
        }}
      >
        <Form.Item
          name="title"
          label="任务标题"
          rules={[{ required: true, message: '请输入任务标题' }, { max: 100, message: '标题长度不能超过100个字符' }]}
        >
          <Input placeholder="请输入任务标题" />
        </Form.Item>

        <Form.Item
          name="description"
          label="任务描述"
        >
          <TextArea
            rows={4}
            placeholder="请输入任务描述（可选，最多500个字符）"
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Form.Item
          label="标注类别"
          rules={[{ required: true, message: '请至少添加一个标注类别' }]}
        >
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="输入类别名称后回车或点击添加"
                onPressEnter={addLabel}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={addLabel}>
                添加
              </Button>
            </Space>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {labelClasses.map((label, index) => (
              <Tag
                key={index}
                closable
                onClose={() => removeLabel(label)}
                color="blue"
              >
                {label}
              </Tag>
            ))}
          </div>
        </Form.Item>

        <Form.Item
          name="target_count"
          label="目标收集数"
          rules={[{ required: true, message: '请输入目标收集数' }]}
        >
          <InputNumber
            min={1}
            max={100}
            placeholder="请输入目标收集数"
            style={{ width: '100%' }}
            addonAfter="份标注"
          />
        </Form.Item>

        <Form.Item
          label="上传图片"
          rules={[{ required: true, message: '请选择图片文件' }]}
        >
          <Upload.Dragger
            fileList={fileList}
            onChange={handleUploadChange}
            beforeUpload={() => false}
            accept=".jpg,.jpeg,.png,.bmp"
            listType="picture-card"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持 .jpg, .jpeg, .png, .bmp 格式图片</p>
          </Upload.Dragger>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              创建任务
            </Button>
            <Button size="large" onClick={() => navigate('/requester/tasks')}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}

export default RequesterTaskCreate
