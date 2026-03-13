import { useState, useEffect, useRef } from 'react'
import { Typography, Button, message, Spin, Modal, Select, Space, Divider, Tag, InputNumber, Progress } from 'antd'
import { LeftOutlined, CheckOutlined, DeleteOutlined, EditOutlined, PlusOutlined, LeftCircleOutlined, RightCircleOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { getTaskDetail, submitAnnotation } from '../../api'
import { v4 as uuidv4 } from 'uuid'

const { Title, Text } = Typography
const { Option } = Select

const WorkerTaskAnnotate = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [task, setTask] = useState(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [annotations, setAnnotations] = useState({})

  // 标注框状态：'kept'保留, 'modified'修正, 'deleted'删除, 'pending'待审核, 'addition'新增
  const [boxStates, setBoxStates] = useState({})

  // 当前正在处理的标注框索引（逐框确认模式）
  const [currentBoxIndex, setCurrentBoxIndex] = useState(0)

  // 新增/编辑弹窗
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState('add')
  const [editingBox, setEditingBox] = useState(null)
  const [tempBbox, setTempBbox] = useState({ x: 0.2, y: 0.2, width: 0.3, height: 0.3 })
  const [tempLabel, setTempLabel] = useState('')

  // 画图相关
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState(null)
  const [drawEnd, setDrawEnd] = useState(null)
  const modalImageRef = useRef(null)
  const modalImgRef = useRef(null)
  const mainImageRef = useRef(null)
  const cropCanvasRef = useRef(null)
  const cropContainerRef = useRef(null)
  const sourceImageRef = useRef(null)
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 })
  const [imgLoadTick, setImgLoadTick] = useState(0)
  const [imageDisplayRect, setImageDisplayRect] = useState({ x: 0, y: 0, width: 0, height: 0 })

  // 由于 task 是异步加载的，需要保证访问安全
  const currentImage = task?.images?.[currentImageIndex]

  // 计算图片在容器中的实际显示位置（处理 object-fit: contain 的情况）
  const updateImageDisplayRect = () => {
    const img = mainImageRef.current
    const wrapper = img?.parentElement
    if (!img || !wrapper || !img.naturalWidth || !img.naturalHeight) return

    const wrapperRect = wrapper.getBoundingClientRect()
    const wrapperWidth = wrapperRect.width
    const wrapperHeight = wrapperRect.height

    const imgRatio = img.naturalWidth / img.naturalHeight
    const wrapperRatio = wrapperWidth / wrapperHeight

    let displayWidth, displayHeight

    if (wrapperRatio > imgRatio) {
      // 容器更宽，图片高度填满，宽度按比例
      displayHeight = wrapperHeight
      displayWidth = displayHeight * imgRatio
    } else {
      // 容器更高，图片宽度填满，高度按比例
      displayWidth = wrapperWidth
      displayHeight = displayWidth / imgRatio
    }

    const displayX = (wrapperWidth - displayWidth) / 2
    const displayY = (wrapperHeight - displayHeight) / 2

    setImageDisplayRect({
      x: displayX / wrapperWidth,  // 归一化到 0-1
      y: displayY / wrapperHeight,
      width: displayWidth / wrapperWidth,
      height: displayHeight / wrapperHeight
    })
  }

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  // 当 currentImage 变化时，预加载原图
  useEffect(() => {
    if (!currentImage) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = `/api/${currentImage.filepath}`
    img.onload = () => {
      sourceImageRef.current = img
      setImgLoadTick(prev => prev + 1)
      // 等待 DOM 更新后计算图片显示尺寸
      setTimeout(() => {
        updateImageDisplayRect()
      }, 0)
    }
  }, [currentImage?.id])

  // 监听窗口大小变化更新图片显示尺寸
  useEffect(() => {
    const handleResize = () => updateImageDisplayRect()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 监听预览容器尺寸变化
  useEffect(() => {
    if (!cropContainerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setPreviewSize({ width, height })
      }
    })
    observer.observe(cropContainerRef.current)
    return () => observer.disconnect()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const taskData = await getTaskDetail(id)
      setTask(taskData)

      const initialAnnotations = {}
      const initialBoxStates = {}
      taskData.images.forEach(img => {
        const preAnnotations = JSON.parse(img.pre_annotations || '[]')
        // 对预标注框进行排序：按x轴从左到右，y轴从上到下
        const sortedAnnotations = [...preAnnotations].sort((a, b) => {
          if (a.bbox.x !== b.bbox.x) {
            return a.bbox.x - b.bbox.x
          }
          return a.bbox.y - b.bbox.y
        })
        initialAnnotations[img.id] = sortedAnnotations
        const states = {}
        sortedAnnotations.forEach(ann => {
          states[ann.id] = 'pending'
        })
        initialBoxStates[img.id] = states
      })
      setAnnotations(initialAnnotations)
      setBoxStates(initialBoxStates)
      setCurrentBoxIndex(0)
    } catch (error) {
      message.error('加载任务失败')
    } finally {
      setLoading(false)
    }
  }


  const labelClasses = JSON.parse(task?.label_classes || '[]')
  const currentBoxes = annotations[currentImage?.id] || []

  // 获取当前图片中未删除的框（按pending优先排序）
  const getVisibleBoxes = () => {
    const boxes = currentBoxes.filter(box => {
      const state = boxStates[currentImage?.id]?.[box.id]
      return state !== 'deleted'
    })
    // 按位置排序：x轴从左到右，y轴从上到下
    return boxes.sort((a, b) => {
      if (a.bbox.x !== b.bbox.x) {
        return a.bbox.x - b.bbox.x
      }
      return a.bbox.y - b.bbox.y
    })
  }

  const visibleBoxes = getVisibleBoxes()

  // 获取当前待处理的框（包含 pending、modified、addition 的框）
  const getCurrentPendingBox = () => {
    return visibleBoxes[currentBoxIndex] || null
  }

  const currentPendingBox = getCurrentPendingBox()
  const pendingCount = visibleBoxes.length

  // 键盘事件
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!modalVisible) {
        if (currentPendingBox) {
          if (e.key === 'k' || e.key === 'K') {
            handleKeep()
          } else if (e.key === 'd' || e.key === 'D') {
            handleDelete()
          } else if (e.key === 'm' || e.key === 'M') {
            openEditModal()
          } else if (e.key === 'ArrowLeft') {
            handlePrevBox()
          } else if (e.key === 'ArrowRight') {
            handleNextBox()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPendingBox, modalVisible, currentBoxIndex])

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
      setCurrentBoxIndex(0)
    }
  }

  const handleNextImage = () => {
    if (task && currentImageIndex < task.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
      setCurrentBoxIndex(0)
    }
  }

  const handlePrevBox = () => {
    if (currentBoxIndex > 0) {
      setCurrentBoxIndex(currentBoxIndex - 1)
    }
  }

  const handleNextBox = () => {
    if (currentBoxIndex < pendingCount - 1) {
      setCurrentBoxIndex(currentBoxIndex + 1)
    }
  }

  const handleKeep = () => {
    if (!currentPendingBox) return
    setBoxStates(prev => ({
      ...prev,
      [currentImage.id]: {
        ...prev[currentImage.id],
        [currentPendingBox.id]: 'kept'
      }
    }))
    // 自动移动到下一个
    if (currentBoxIndex < pendingCount - 1) {
      setCurrentBoxIndex(currentBoxIndex + 1)
    } else {
      setCurrentBoxIndex(0)
    }
  }

  const handleDelete = () => {
    if (!currentPendingBox) return
    setBoxStates(prev => ({
      ...prev,
      [currentImage.id]: {
        ...prev[currentImage.id],
        [currentPendingBox.id]: 'deleted'
      }
    }))
    // 自动移动到下一个（索引不需要增加，因为数组变短了）
    // 重新计算 visibleBoxes 后的索引
    setTimeout(() => {
      if (currentBoxIndex >= visibleBoxes.length) {
        setCurrentBoxIndex(Math.max(0, visibleBoxes.length - 1))
      }
    }, 0)
  }

  const openEditModal = () => {
    if (!currentPendingBox) return
    setEditingBox(currentPendingBox)
    setTempBbox({ ...currentPendingBox.bbox })
    setTempLabel(currentPendingBox.label)
    setModalMode('edit')
    setModalVisible(true)
  }

  const openAddModal = () => {
    setEditingBox(null)
    const defaultBbox = { x: 0.2, y: 0.2, width: 0.3, height: 0.3 }
    setTempBbox(defaultBbox)
    setTempLabel(labelClasses[0] || '')
    setModalMode('add')
    setModalVisible(true)
  }

  // 画图事件 - 修正版
  const handleModalMouseDown = (e) => {
    e.preventDefault() // 阻止图片拖拽
    if (!modalImgRef.current) return

    const rect = modalImgRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    setIsDrawing(true)
    setDrawStart({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) })
    setDrawEnd(null)
  }

  const handleModalMouseMove = (e) => {
    e.preventDefault() // 阻止图片拖拽
    if (!isDrawing || !drawStart || !modalImgRef.current) return

    const rect = modalImgRef.current.getBoundingClientRect()
    const currentX = (e.clientX - rect.left) / rect.width
    const currentY = (e.clientY - rect.top) / rect.height

    const x = Math.min(drawStart.x, currentX)
    const y = Math.min(drawStart.y, currentY)
    const width = Math.abs(currentX - drawStart.x)
    const height = Math.abs(currentY - drawStart.y)

    setDrawEnd({
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: Math.min(1, width),
      height: Math.min(1, height)
    })
  }

  const handleModalMouseUp = (e) => {
    e.preventDefault() // 阻止图片拖拽
    if (!isDrawing) return

    setIsDrawing(false)
    if (drawEnd) {
      setTempBbox(drawEnd)
    }
    setDrawEnd(null)
    setDrawStart(null)
  }

  const handleModalMouseLeave = (e) => {
    e.preventDefault() // 阻止图片拖拽
    handleModalMouseUp(e)
  }

  const handleModalOk = () => {
    if (!tempLabel) {
      message.error('请选择标注类别')
      return
    }

    // 检查是否有画框（允许 x 或 y 为 0）
    if (tempBbox.width <= 0 || tempBbox.height <= 0) {
      message.error('请先在图片上画一个标注框')
      return
    }

    if (modalMode === 'add') {
      const newBox = {
        id: uuidv4(),
        bbox: tempBbox,
        label: tempLabel,
        score: 1.0
      }
      setAnnotations(prev => ({
        ...prev,
        [currentImage.id]: [...prev[currentImage.id], newBox]
      }))
      setBoxStates(prev => ({
        ...prev,
        [currentImage.id]: {
          ...prev[currentImage.id],
          [newBox.id]: 'addition'
        }
      }))
    } else {
      setAnnotations(prev => ({
        ...prev,
        [currentImage.id]: prev[currentImage.id].map(box =>
          box.id === editingBox.id ? { ...box, bbox: tempBbox, label: tempLabel } : box
        )
      }))
      setBoxStates(prev => ({
        ...prev,
        [currentImage.id]: {
          ...prev[currentImage.id],
          [editingBox.id]: 'modified'
        }
      }))
      // 不自动前进，让用户可以继续编辑当前框
    }

    setModalVisible(false)
  }

  // 检查图片是否已完成
  const isImageCompleted = (img) => {
    const boxes = annotations[img.id] || []
    const states = boxStates[img.id] || {}
    const pendingCount = boxes.filter(box => states[box.id] === 'pending').length
    return pendingCount === 0 && boxes.length > 0
  }

  const handleSubmit = async () => {
    try {
      const imageAnnotations = task.images.map(img => {
        const boxes = annotations[img.id] || []
        const validBoxes = boxes.filter(box => {
          const state = boxStates[img.id]?.[box.id]
          return state === 'kept' || state === 'modified' || state === 'addition'
        })
        return {
          image_id: img.id,
          annotations: validBoxes.map(box => ({
            bbox: box.bbox,
            label: box.label,
            score: box.score
          }))
        }
      }).filter(item => item.annotations.length > 0)

      await submitAnnotation({
        task_id: id,
        image_annotations: imageAnnotations
      })

      message.success('标注提交成功')
      navigate('/worker/tasks')
    } catch (error) {
      message.error('提交失败')
    }
  }


  // 置信度颜色区分
  const getConfidenceColor = (score) => {
    if (score >= 0.8) return '#52c41a'
    if (score >= 0.5) return '#faad14'
    return '#ff4d4f'
  }

  // 绘制裁剪预览（核心函数）
  const drawCropPreview = () => {
    const canvas = cropCanvasRef.current
    const img = sourceImageRef.current
    if (!canvas || !img || !currentPendingBox) return

    const container = cropContainerRef.current
    if (!container) return

    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    if (containerWidth <= 0 || containerHeight <= 0) return

    canvas.width = containerWidth
    canvas.height = containerHeight

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, containerWidth, containerHeight)

    const { bbox } = currentPendingBox
    const sx = bbox.x * img.naturalWidth
    const sy = bbox.y * img.naturalHeight
    const sw = bbox.width * img.naturalWidth
    const sh = bbox.height * img.naturalHeight

    if (sw <= 0 || sh <= 0) return

    const scaleX = containerWidth / sw
    const scaleY = containerHeight / sh
    const scale = Math.min(scaleX, scaleY)

    const drawWidth = sw * scale
    const drawHeight = sh * scale

    const offsetX = (containerWidth - drawWidth) / 2
    const offsetY = (containerHeight - drawHeight) / 2

    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(0, 0, containerWidth, containerHeight)
    ctx.drawImage(img, sx, sy, sw, sh, offsetX, offsetY, drawWidth, drawHeight)

    ctx.strokeStyle = '#1890ff'
    ctx.lineWidth = 2
    ctx.strokeRect(offsetX, offsetY, drawWidth, drawHeight)
  }

  // 当前标注框变化、预览容器尺寸变化、图片加载完成 时都重新绘制
  useEffect(() => {
    drawCropPreview()
  }, [currentPendingBox, previewSize, imgLoadTick])

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
        <Text type="secondary">任务不存在</Text>
      </div>
    )
  }

  return (
    <div className="annotate-page">
      {/* 顶部导航栏 */}
      <div style={{
        padding: '8px 12px',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #e8e8e8',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        minHeight: 48
      }}>
        <Button icon={<LeftOutlined />} onClick={() => navigate('/worker/tasks')} size="middle">
          返回
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={4} style={{ margin: 0, fontSize: 18 }}>{task.title}</Title>
          <div style={{ display: 'flex', gap: 6 }}>
            {labelClasses.map((cls, index) => (
              <Tag key={index} color="blue" style={{ fontSize: 15 }}>{cls}</Tag>
            ))}
          </div>
        </div>
        <div style={{ width: 80 }} />
      </div>

      <div className="annotate-main">
        <div className="annotate-image-area">
          <div className="image-wrapper">
            <img
              ref={mainImageRef}
              src={`/api/${currentImage.filepath}`}
              className="main-image"
              onLoad={() => {
                setTimeout(() => {
                  updateImageDisplayRect()
                }, 0)
              }}
            />

            {/* 标注框 - 相对于图片实际显示位置定位 */}
            {visibleBoxes.map((box) => {
              const boxState = boxStates[currentImage.id]?.[box.id] || 'pending'
              const isCurrent = box.id === currentPendingBox?.id

              // 根据图片显示偏移和尺寸调整标注框位置
              const actualLeft = imageDisplayRect.x + (box.bbox.x * imageDisplayRect.width)
              const actualTop = imageDisplayRect.y + (box.bbox.y * imageDisplayRect.height)
              const actualWidth = box.bbox.width * imageDisplayRect.width
              const actualHeight = box.bbox.height * imageDisplayRect.height

              return (
                <div
                  key={box.id}
                  className={`bbox-overlay ${isCurrent ? 'bbox-current' : ''} bbox-${boxState}`}
                  style={{
                    position: 'absolute',
                    left: `${actualLeft * 100}%`,
                    top: `${actualTop * 100}%`,
                    width: `${actualWidth * 100}%`,
                    height: `${actualHeight * 100}%`
                  }}
                >
                  <div className="bbox-label" style={{
                    background: isCurrent ? '#faad14' :
                               boxState === 'kept' ? '#52c41a' :
                               boxState === 'modified' ? '#fa8c16' :
                               boxState === 'addition' ? '#1890ff' : '#d9d9d9'
                  }}>
                    {box.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 右侧控制面板 */}
        <div className="annotate-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>
          {currentPendingBox ? (
            <>
              {/* 1. 进度条区域 - 固定高度不缩放 */}
              <div style={{ flexShrink: 0, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Progress
                    percent={Math.round(((currentBoxIndex + 1) / pendingCount) * 100)}
                    status="active"
                    strokeWidth={12}
                    style={{ flex: 1 }}
                  />
                  <Space size="small" style={{ minWidth: 120, justifyContent: 'flex-end' }}>
                    <Button
                      type="text"
                      icon={<LeftCircleOutlined />}
                      disabled={currentBoxIndex === 0}
                      onClick={handlePrevBox}
                      size="small"
                    />
                    <Text type="secondary" style={{ fontSize: 16 }}>{currentBoxIndex + 1} / {pendingCount}</Text>
                    <Button
                      type="text"
                      icon={<RightCircleOutlined />}
                      disabled={currentBoxIndex === pendingCount - 1}
                      onClick={handleNextBox}
                      size="small"
                    />
                  </Space>
                </div>
              </div>

              {/* 2. 标签和置信度 - 固定高度不缩放 */}
              <div style={{
                flexShrink: 0,
                marginBottom: 12,
                background: '#f8f9fa',
                padding: 8,
                borderRadius: 6,
                borderLeft: '3px solid #faad14'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>类别：</Text>
                    <Text strong style={{ fontSize: 15 }}>{currentPendingBox.label}</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>置信度：</Text>
                    <Text strong style={{ fontSize: 15, color: getConfidenceColor(currentPendingBox.score) }}>
                      {(currentPendingBox.score * 100).toFixed(1)}%
                    </Text>
                  </div>
                </div>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              {/* 框选区域预览 - 撑满剩余空间 */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
                <Text strong style={{ fontSize: 13, marginBottom: 6, flexShrink: 0 }}>框选区域预览</Text>
                <div
                  ref={cropContainerRef}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    background: '#f5f5f5',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid #e8e8e8',
                    position: 'relative'
                  }}
                >
                  <canvas
                    ref={cropCanvasRef}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block'
                    }}
                  />
                  {(!currentPendingBox || !sourceImageRef.current) && (
                    <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>暂无框选区域</Text>
                    </div>
                  )}
                </div>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              {/* 操作按钮 - 一行显示 */}
              <div style={{ flexShrink: 0, display: 'flex', gap: 18 }}>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleKeep}
                  style={{
                    flex: 2,
                    height: 40,
                    fontSize: 14,
                    background: '#52c41a',
                    borderColor: '#52c41a'
                  }}
                >
                  正确 (K)
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                  style={{ flex: 1, height: 40, fontSize: 14 }}
                >
                  删除 (D)
                </Button>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={openEditModal}
                  style={{ flex: 1, height: 40, fontSize: 14 }}
                >
                  修正 (M)
                </Button>
              </div>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <CheckOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 12 }} />
                <Title level={5} style={{ marginBottom: 6 }}>所有标注框已处理完毕！</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                  此图片的 {visibleBoxes.length} 个标注框都已确认
                </Text>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  block
                  onClick={openAddModal}
                  style={{ background: '#52c41a', borderColor: '#52c41a' }}
                >
                  新增标注框
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 底部缩略图导航 */}
      <div className="thumbnail-bar" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* 快捷键说明 */}
        <div style={{
          background: 'rgba(0,0,0,0.05)',
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 11,
          flexShrink: 0
        }}>
          <div><strong>快捷键：</strong></div>
          <div>K 正确 | D 删除 | M 修正</div>
          <div>← 上一个框 | → 下一个框</div>
        </div>

        <Divider type="vertical" style={{ height: 40 }} />

        {/* 当前图片信息 */}
        <div style={{ fontSize: 13, flexShrink: 0 }}>
          <Text strong>当前图片：</Text>
          <Text>{currentImageIndex + 1} / {task.images.length}</Text>
        </div>

        <Divider type="vertical" style={{ height: 40 }} />

        {/* 缩略图 */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 0' }}>
          {task.images.map((img, idx) => {
            const completed = isImageCompleted(img)
            return (
              <div
                key={img.id}
                style={{
                  position: 'relative',
                  cursor: 'pointer'
                }}
              >
                <img
                  src={`/api/${img.filepath}`}
                  className={`thumbnail-item ${idx === currentImageIndex ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentImageIndex(idx)
                    setCurrentBoxIndex(0)
                  }}
                  style={{
                    borderColor: completed ? '#52c41a' : idx === currentImageIndex ? '#1890ff' : 'transparent'
                  }}
                />
                {completed && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 12,
                      height: 12,
                      background: '#52c41a',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <CheckOutlined style={{ color: '#fff', fontSize: 8 }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <Space>
            <Button
              disabled={currentImageIndex === 0}
              onClick={handlePrevImage}
              size="middle"
            >
              上一张
            </Button>
            <Button
              disabled={currentImageIndex === task.images.length - 1}
              onClick={handleNextImage}
              size="middle"
            >
              下一张
            </Button>
            <Button type="primary" size="large" icon={<CheckOutlined />} onClick={handleSubmit}>
              提交任务
            </Button>
          </Space>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        title={modalMode === 'add' ? '新增标注框' : '修正标注框'}
        open={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        okText="确认"
        cancelText="取消"
        width={600}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 图片预览和画图区域 */}
          <div style={{ position: 'relative' }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>在图片上画框：</Text>
            <div
              style={{
                background: '#f0f2f5',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
              onMouseDown={handleModalMouseDown}
              onMouseMove={handleModalMouseMove}
              onMouseUp={handleModalMouseUp}
              onMouseLeave={handleModalMouseLeave}
            >
              <div style={{ position: 'relative' }}>
                <img
                  ref={modalImgRef}
                  src={`/api/${currentImage.filepath}`}
                  style={{
                    maxHeight: '350px',
                    cursor: isDrawing ? 'crosshair' : 'crosshair',
                    pointerEvents: 'none'
                  }}
                  alt="preview"
                />

                {/* 临时画框 */}
                {isDrawing && drawStart && drawEnd && modalImgRef.current && (
                  <div
                    style={{
                      position: 'absolute',
                      left: drawEnd.x * modalImgRef.current.getBoundingClientRect().width,
                      top: drawEnd.y * modalImgRef.current.getBoundingClientRect().height,
                      width: drawEnd.width * modalImgRef.current.getBoundingClientRect().width,
                      height: drawEnd.height * modalImgRef.current.getBoundingClientRect().height,
                      border: '2px dashed #faad14',
                      background: 'rgba(250,173,20,0.1)',
                      pointerEvents: 'none'
                    }}
                  />
                )}

                {/* 当前框 */}
                {!isDrawing && tempBbox && modalImgRef.current && modalMode === 'edit' && (
                  <div
                    style={{
                      position: 'absolute',
                      left: tempBbox.x * modalImgRef.current.getBoundingClientRect().width,
                      top: tempBbox.y * modalImgRef.current.getBoundingClientRect().height,
                      width: tempBbox.width * modalImgRef.current.getBoundingClientRect().width,
                      height: tempBbox.height * modalImgRef.current.getBoundingClientRect().height,
                      border: '2px solid #1890ff',
                      background: 'rgba(24,144,255,0.1)',
                      pointerEvents: 'none'
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 标注类别选择 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>标注类别：</Text>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
              {labelClasses.map(cls => (
                <Button
                  key={cls}
                  type={tempLabel === cls ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setTempLabel(cls)}
                  style={{
                    minWidth: 80,
                    borderRadius: 4
                  }}
                >
                  {cls}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default WorkerTaskAnnotate
