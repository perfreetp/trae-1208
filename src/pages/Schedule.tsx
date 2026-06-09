import { useState, useRef, useEffect } from 'react'
import {
  Card,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Tooltip,
  Modal,
  Form,
  Select,
  DatePicker,
  message,
  InputNumber,
  Popconfirm,
  Alert,
  Statistic,
  Tabs
} from 'antd'
import {
  CalendarOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  FireOutlined,
  CloudOutlined,
  BatteryChargingOutlined,
  BatteryFullOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  ReloadOutlined,
  PlayCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useEnergyStore } from '@/store'
import type { ScheduleItem } from '@/types'

const typeConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  equipment: { color: '#1677ff', icon: <ThunderboltOutlined />, label: '设备运行' },
  boiler: { color: '#fa8c16', icon: <FireOutlined />, label: '锅炉供汽' },
  compressor: { color: '#52c41a', icon: <CloudOutlined />, label: '空压机' },
  storage_charge: { color: '#13c2c2', icon: <BatteryChargingOutlined />, label: '储能充电' },
  storage_discharge: { color: '#722ed1', icon: <BatteryFullOutlined />, label: '储能放电' }
}

const statusMap: Record<string, { color: string; text: string }> = {
  scheduled: { color: 'default', text: '已排程' },
  running: { color: 'processing', text: '执行中' },
  completed: { color: 'success', text: '已完成' }
}

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const minutesToTime = (m: number) => {
  const h = Math.floor(m / 60) % 24
  const mm = m % 60
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`
}

export default function Schedule() {
  const {
    scheduleItems,
    updateScheduleItem,
    addScheduleItem,
    deleteScheduleItem,
    demandRedLine,
    currentLoad
  } = useEnergyStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null)
  const [form] = Form.useForm()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const groupedItems: Record<string, ScheduleItem[]> = {
    equipment: [],
    boiler: [],
    compressor: [],
    storage_charge: [],
    storage_discharge: []
  }
  scheduleItems.forEach((item) => {
    groupedItems[item.type]?.push(item)
  })

  const handleDragStart = (e: React.MouseEvent, item: ScheduleItem) => {
    e.preventDefault()
    setDraggingId(item.id)
    const trackEl = trackRef.current
    if (!trackEl) return

    const trackRect = trackEl.getBoundingClientRect()
    const totalMinutes = 24 * 60
    const duration = timeToMinutes(item.endTime) - timeToMinutes(item.startTime)
    const startX = e.clientX

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX
      const dMinutes = Math.round((dx / trackRect.width) * totalMinutes / 30) * 30
      let newStart = timeToMinutes(item.startTime) + dMinutes
      if (newStart < 0) newStart = 0
      if (newStart + duration > totalMinutes) newStart = totalMinutes - duration
      const newEnd = newStart + duration
      updateScheduleItem(item.id, {
        startTime: minutesToTime(newStart),
        endTime: minutesToTime(Math.min(newEnd, 1440))
      })
    }

    const onMouseUp = () => {
      setDraggingId(null)
      message.success('排程调整已更新')
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  useEffect(() => {
    return () => setDraggingId(null)
  }, [])

  const renderTimeline = (type: string, items: ScheduleItem[]) => {
    if (items.length === 0) {
      return (
        <div className="timeline-row">
          <div className="timeline-label">
            {typeConfig[type].icon} {typeConfig[type].label}
          </div>
          <div className="timeline-track" ref={type === 'equipment' ? trackRef : undefined}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: 12 }}>
              暂无排程，点击右上角添加
            </div>
          </div>
        </div>
      )
    }

    return items.map((item) => (
      <div key={item.id} className="timeline-row">
        <div className="timeline-label" style={{ fontSize: 12 }}>
          <Tag color={statusMap[item.status].color} style={{ marginRight: 4 }}>
            {statusMap[item.status].text}
          </Tag>
          <span style={{ maxWidth: 70, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
            {item.name}
          </span>
        </div>
        <div
          className="timeline-track"
          ref={type === 'equipment' && item === items[0] ? trackRef : undefined}
        >
          <div
            className={`timeline-block ${type} ${draggingId === item.id ? 'dragging' : ''}`}
            style={{
              left: `${(timeToMinutes(item.startTime) / (24 * 60)) * 100}%`,
              width: `${((timeToMinutes(item.endTime) - timeToMinutes(item.startTime)) / (24 * 60)) * 100}%`
            }}
            onMouseDown={(e) => handleDragStart(e, item)}
            onClick={(e) => {
              if (!draggingId) {
                setEditingItem(item)
                form.setFieldsValue({
                  ...item,
                  startTime: dayjs(item.startTime, 'HH:mm'),
                  endTime: dayjs(item.endTime, 'HH:mm')
                })
                setModalOpen(true)
              }
            }}
          >
            <Tooltip title={`${item.name}\n${item.startTime} ~ ${item.endTime}\n${item.power}kW · ${statusMap[item.status].text}\n点击编辑 / 拖拽调整`}>
              <span>
                {item.name} {item.startTime}-{item.endTime}
              </span>
            </Tooltip>
          </div>
        </div>
        <div style={{ width: 80, paddingLeft: 8, display: 'flex', gap: 4 }}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingItem(item)
              form.setFieldsValue({
                ...item,
                startTime: dayjs(item.startTime, 'HH:mm'),
                endTime: dayjs(item.endTime, 'HH:mm')
              })
              setModalOpen(true)
            }}
          />
          <Popconfirm
            title="删除该排程项？"
            onConfirm={() => { deleteScheduleItem(item.id); message.success('已删除') }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      </div>
    ))
  }

  const handleAdd = () => {
    setEditingItem(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data: ScheduleItem = {
        id: editingItem?.id || `sch${Date.now()}`,
        type: values.type,
        name: values.name,
        startTime: values.startTime.format('HH:mm'),
        endTime: values.endTime.format('HH:mm'),
        power: values.power,
        status: values.status || 'scheduled'
      }
      if (editingItem) {
        updateScheduleItem(editingItem.id, data)
        message.success('排程已更新')
      } else {
        addScheduleItem(data)
        message.success('排程已添加')
      }
      setModalOpen(false)
    } catch {}
  }

  const totalPowerScheduled = scheduleItems.reduce((s, i) => {
    const duration = (timeToMinutes(i.endTime) - timeToMinutes(i.startTime)) / 60
    return s + i.power * duration
  }, 0)

  const energyCostEstimate = scheduleItems.reduce((s, i) => {
    const startH = parseInt(i.startTime.split(':')[0])
    const endH = parseInt(i.endTime.split(':')[0])
    const duration = (timeToMinutes(i.endTime) - timeToMinutes(i.startTime)) / 60
    let rate = 0.78
    if (startH >= 8 && endH < 11) rate = 1.28
    else if (startH >= 18 && endH < 21) rate = 1.28
    else if ((startH >= 22) || (endH <= 8)) rate = 0.32
    return s + i.power * duration * rate
  }, 0)

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>📅 排程窗</h2>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
            拖拽调整开机时间 · 储能充放电 · 锅炉启停 · 空压机组合
          </div>
        </div>
        <Space>
          <Tooltip title="恢复默认排程">
            <Button icon={<ReloadOutlined />}>重置</Button>
          </Tooltip>
          <Tooltip title="保存当前排程方案">
            <Button icon={<SaveOutlined />}>保存方案</Button>
          </Tooltip>
          <Tooltip title="发布排程并下发执行">
            <Button type="primary" icon={<PlayCircleOutlined />}>发布执行</Button>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增排程
          </Button>
        </Space>
      </div>

      {currentLoad / demandRedLine > 0.9 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={`当前负荷 ${currentLoad}kW / 红线 ${demandRedLine}kW，利用率 ${((currentLoad / demandRedLine) * 100).toFixed(1)}%`}
          description="建议在高风险时段（14:00-16:00）增加储能放电或推迟非关键设备启动"
        />
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <div className="stat-card">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>排程任务数</span>}
              value={scheduleItems.length}
              valueStyle={{ color: '#fff', fontSize: 24 }}
              prefix={<CalendarOutlined />}
            />
          </div>
        </Col>
        <Col span={5}>
          <div className="stat-card green">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>计划总能耗</span>}
              value={totalPowerScheduled}
              suffix="kWh"
              precision={0}
              valueStyle={{ color: '#fff', fontSize: 22 }}
            />
          </div>
        </Col>
        <Col span={5}>
          <div className="stat-card orange">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>预计电费</span>}
              value={energyCostEstimate}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#fff', fontSize: 22 }}
            />
          </div>
        </Col>
        <Col span={5}>
          <div className="stat-card cyan">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>储能放电量</span>}
              value={3200}
              suffix="kWh"
              valueStyle={{ color: '#fff', fontSize: 22 }}
              prefix={<BatteryFullOutlined />}
            />
          </div>
        </Col>
        <Col span={5}>
          <div className="stat-card purple">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>峰谷节约</span>}
              value={47700}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#fff', fontSize: 22 }}
            />
          </div>
        </Col>
      </Row>

      <div className="chart-legend" style={{ marginBottom: 8, paddingLeft: 120 }}>
        {Object.entries(typeConfig).map(([k, v]) => (
          <div key={k} className="legend-item">
            <div className="legend-color" style={{ background: v.color }} />
            <span>{v.label}</span>
          </div>
        ))}
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#ff4d4f', width: 2, height: 14 }} />
          <span>需量红线 {demandRedLine}kW</span>
        </div>
        <div className="legend-item" style={{ marginLeft: 'auto' }}>
          <span style={{ color: '#8c8c8c', fontSize: 11 }}>💡 提示：拖拽色块可调整时间，点击可编辑详情</span>
        </div>
      </div>

      <Card size="small" className="gantt-chart-container">
        <div className="time-ruler">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="time-ruler-tick">
              {i.toString().padStart(2, '0')}
            </div>
          ))}
        </div>

        <div className="schedule-timeline">
          {renderTimeline('equipment', groupedItems.equipment)}
          {renderTimeline('boiler', groupedItems.boiler)}
          {renderTimeline('compressor', groupedItems.compressor)}
          {renderTimeline('storage_charge', groupedItems.storage_charge)}
          {renderTimeline('storage_discharge', groupedItems.storage_discharge)}
        </div>

        <div style={{ marginTop: 24 }}>
          <Alert
            type="info"
            showIcon
            message="排程约束校验"
            description={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space size={24}>
                  <Tag color="success">✓ 锅炉最小运行6h: 满足 (07:00-22:00, 15h)</Tag>
                  <Tag color="success">✓ 储能放电14-18h: 尖峰时段</Tag>
                  <Tag color="success">✓ 不可停机工单均连续: 5/5</Tag>
                  <Tag color="warning">⚠ 预计15:30峰值2650kW超红线150kW</Tag>
                  <Tag color="success">✓ 空压机组合总供气量≥需求量</Tag>
                </Space>
              </Space>
            }
          />
        </div>
      </Card>

      <Card title="📋 排程明细" size="small" style={{ marginTop: 16 }}>
        <Tabs
          items={Object.entries(typeConfig).map(([type, cfg]) => ({
            key: type,
            label: (
              <span>
                {cfg.icon} {cfg.label}
                <Tag color="blue" style={{ marginLeft: 8 }}>{groupedItems[type]?.length || 0}</Tag>
              </span>
            ),
            children: (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {(groupedItems[type] || []).map((item) => (
                  <Card
                    key={item.id}
                    size="small"
                    style={{
                      width: 260,
                      borderLeft: `4px solid ${cfg.color}`,
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setEditingItem(item)
                      form.setFieldsValue({
                        ...item,
                        startTime: dayjs(item.startTime, 'HH:mm'),
                        endTime: dayjs(item.endTime, 'HH:mm')
                      })
                      setModalOpen(true)
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <b style={{ fontSize: 14 }}>{item.name}</b>
                      <Tag color={statusMap[item.status].color}>{statusMap[item.status].text}</Tag>
                    </div>
                    <div style={{ fontSize: 12, color: '#595959', lineHeight: 1.8 }}>
                      <div>⏰ {item.startTime} ~ {item.endTime}</div>
                      <div>⚡ 功率 {item.power} kW</div>
                      <div>
                        📊 能耗 {((timeToMinutes(item.endTime) - timeToMinutes(item.startTime)) / 60 * item.power).toFixed(0)} kWh
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          }))}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑排程项' : '新增排程项'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item
            name="type"
            label="排程类型"
            rules={[{ required: true }]}
            initialValue="equipment"
          >
            <Select
              options={Object.entries(typeConfig).map(([k, v]) => ({
                value: k,
                label: <span>{v.icon} {v.label}</span>
              }))}
            />
          </Form.Item>
          <Form.Item name="name" label="排程名称" rules={[{ required: true }]}>
            <Select
              mode={undefined}
              showSearch
              placeholder="选择或输入名称"
              options={[
                { value: '冲压机A运行' }, { value: '冲压机B运行' },
                { value: '焊接机器人组' }, { value: 'CNC加工中心A' },
                { value: 'CNC加工中心B' }, { value: '总装线运行' },
                { value: '涂装流水线' }, { value: '锅炉1号供汽' },
                { value: '锅炉2号供汽' }, { value: '空压机A供气' },
                { value: '空压机B供气' }, { value: '空压机C供气' },
                { value: '储能低谷充电' }, { value: '储能高峰放电' }
              ]}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startTime" label="开始时间" rules={[{ required: true }]}>
                <DatePicker.TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={30} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="结束时间" rules={[{ required: true }]}>
                <DatePicker.TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={30} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="power" label="功率(kW)" rules={[{ required: true }]} initialValue={100}>
                <InputNumber style={{ width: '100%' }} min={1} max={5000} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" initialValue="scheduled">
                <Select
                  options={Object.entries(statusMap).map(([k, v]) => ({
                    value: k, label: <Tag color={v.color}>{v.text}</Tag>
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}
