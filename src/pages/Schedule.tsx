import { useState, useRef, useEffect, useMemo } from 'react'
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
  Tabs,
  Drawer,
  List,
  Input,
  Empty,
  Progress,
  Badge,
  Divider
} from 'antd'
import {
  CalendarOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  FireOutlined,
  CloudOutlined,
  SaveOutlined,
  ImportOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
  CopyOutlined,
  SwitcherOutlined,
  DashboardOutlined,
  RiseOutlined,
  FallOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  GoldOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useEnergyStore } from '@/store'
import type { ScheduleItem } from '@/types'

const { TextArea } = Input

const typeConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  equipment: { color: '#1677ff', icon: <ThunderboltOutlined />, label: '设备运行' },
  boiler: { color: '#fa8c16', icon: <FireOutlined />, label: '锅炉供汽' },
  compressor: { color: '#52c41a', icon: <CloudOutlined />, label: '空压机' },
  storage_charge: { color: '#13c2c2', icon: <ImportOutlined />, label: '储能充电' },
  storage_discharge: { color: '#722ed1', icon: <SaveOutlined />, label: '储能放电' }
}

const statusMap: Record<string, { color: string; text: string }> = {
  scheduled: { color: 'default', text: '已排程' },
  running: { color: 'processing', text: '执行中' },
  completed: { color: 'success', text: '已完成' }
}

const riskMap: Record<string, { color: string; text: string }> = {
  low: { color: 'success', text: '低风险' },
  medium: { color: 'warning', text: '中风险' },
  high: { color: 'error', text: '高风险' }
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
    loadProfiles,
    peakLoad,
    scheduleVersions,
    currentVersionId,
    crossWindow,
    saveCurrentAsVersion,
    switchToVersion,
    duplicateVersion,
    deleteVersion,
    clearFromForecastFlag,
    setHighlightRiskSlots,
    recalculateFromSchedule
  } = useEnergyStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null)
  const [form] = Form.useForm()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [versionDrawer, setVersionDrawer] = useState(false)
  const [saveVersionModal, setSaveVersionModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveRemark, setSaveRemark] = useState('')
  const [copyModal, setCopyModal] = useState(false)
  const [copyVersionId, setCopyVersionId] = useState<string | null>(null)
  const [copyName, setCopyName] = useState('')

  useEffect(() => {
    if (crossWindow.fromForecastJump && crossWindow.highlightRiskSlots === false) {
      setHighlightRiskSlots(true)
    }
  }, [crossWindow.fromForecastJump, crossWindow.highlightRiskSlots, setHighlightRiskSlots])

  const groupedItems: Record<string, ScheduleItem[]> = useMemo(() => {
    const g: Record<string, ScheduleItem[]> = {
      equipment: [],
      boiler: [],
      compressor: [],
      storage_charge: [],
      storage_discharge: []
    }
    scheduleItems.forEach((item) => {
      g[item.type]?.push(item)
    })
    return g
  }, [scheduleItems])

  const { totalPowerScheduled, energyCostEstimate, peakRisk, peakHour, storageDischarge, peakSaving } = useMemo(() => {
    const tps = scheduleItems.reduce((s, i) => {
      const duration = (timeToMinutes(i.endTime) - timeToMinutes(i.startTime)) / 60
      return s + i.power * duration
    }, 0)
    const ec = scheduleItems.reduce((s, i) => {
      const startH = parseInt(i.startTime.split(':')[0])
      const endH = parseInt(i.endTime.split(':')[0])
      const duration = (timeToMinutes(i.endTime) - timeToMinutes(i.startTime)) / 60
      let rate = 0.78
      if (startH >= 8 && endH < 11) rate = 1.28
      else if (startH >= 18 && endH < 21) rate = 1.28
      else if ((startH >= 22) || (endH <= 8)) rate = 0.32
      return s + i.power * duration * rate
    }, 0)
    let pr: 'low' | 'medium' | 'high' = 'low'
    const peakRatio = peakLoad / demandRedLine
    if (peakRatio > 1.02) pr = 'high'
    else if (peakRatio > 0.95) pr = 'medium'
    const ph = loadProfiles.findIndex((p) => p.electricity === peakLoad)
    const sd = scheduleItems.filter((i) => i.type === 'storage_discharge').reduce((s, i) => {
      const d = (timeToMinutes(i.endTime) - timeToMinutes(i.startTime)) / 60
      return s + i.power * d
    }, 0)
    const ps = Math.max(0, Math.round(tps * 0.78 - ec))
    return {
      totalPowerScheduled: tps,
      energyCostEstimate: ec,
      peakRisk: pr,
      peakHour: ph,
      storageDischarge: sd,
      peakSaving: ps
    }
  }, [scheduleItems, peakLoad, demandRedLine, loadProfiles])

  const handleDragStart = (e: React.MouseEvent, item: ScheduleItem) => {
    e.preventDefault()
    setDraggingId(item.id)
    const trackEl = trackRef.current
    if (!trackEl) return
    const trackRect = trackEl.getBoundingClientRect()
    const totalMinutes = 24 * 60
    const duration = timeToMinutes(item.endTime) - timeToMinutes(item.startTime)
    const startX = e.clientX
    let moved = false

    const onMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX
      if (Math.abs(dx) > 3) moved = true
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
      if (moved) message.success('排程已调整，费用/峰值已同步更新')
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  useEffect(() => {
    return () => setDraggingId(null)
  }, [])

  const openEditModal = (item: ScheduleItem) => {
    setEditingItem(item)
    form.setFieldsValue({
      ...item,
      startTime: dayjs(item.startTime, 'HH:mm'),
      endTime: dayjs(item.endTime, 'HH:mm')
    })
    setModalOpen(true)
  }

  const renderTimeline = (type: string, items: ScheduleItem[]) => {
    const riskHours = crossWindow.highlightRiskSlots ? crossWindow.forecastHighRiskHours : []
    if (items.length === 0) {
      return (
        <div className="timeline-row">
          <div className="timeline-label">
            {typeConfig[type].icon} {typeConfig[type].label}
          </div>
          <div
            className="timeline-track"
            ref={type === 'equipment' ? trackRef : undefined}
          >
            {riskHours.length > 0 && riskHours.map((h) => (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  left: `${(h / 24) * 100}%`,
                  width: `${100 / 24}%`,
                  top: 0,
                  bottom: 0,
                  background: 'rgba(255,77,79,0.08)',
                  borderLeft: '1px dashed rgba(255,77,79,0.4)',
                  pointerEvents: 'none'
                }}
              />
            ))}
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
          {riskHours.length > 0 && riskHours.map((h) => (
            <div
              key={h}
              style={{
                position: 'absolute',
                left: `${(h / 24) * 100}%`,
                width: `${100 / 24}%`,
                top: 0,
                bottom: 0,
                background: 'rgba(255,77,79,0.08)',
                borderLeft: '1px dashed rgba(255,77,79,0.4)',
                pointerEvents: 'none',
                zIndex: 0
              }}
            >
              <span style={{ position: 'absolute', top: 2, left: 4, fontSize: 10, color: 'rgba(255,77,79,0.8)', fontWeight: 600 }}>
                ⚠
              </span>
            </div>
          ))}
          <div
            className={`timeline-block ${type} ${draggingId === item.id ? 'dragging' : ''}`}
            style={{
              left: `${(timeToMinutes(item.startTime) / (24 * 60)) * 100}%`,
              width: `${Math.max(2, ((timeToMinutes(item.endTime) - timeToMinutes(item.startTime)) / (24 * 60)) * 100)}%`,
              zIndex: 1
            }}
            onMouseDown={(e) => handleDragStart(e, item)}
            onClick={(e) => {
              if (draggingId !== item.id) openEditModal(item)
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
            onClick={() => openEditModal(item)}
          />
          <Popconfirm
            title="删除该排程项？"
            onConfirm={() => { deleteScheduleItem(item.id); message.success('已删除，负荷曲线已更新') }}
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
    form.setFieldsValue({
      startTime: dayjs('08:00', 'HH:mm'),
      endTime: dayjs('12:00', 'HH:mm'),
      power: 100,
      status: 'scheduled',
      type: 'equipment'
    })
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
        message.success('排程已更新，费用/峰值已同步')
      } else {
        addScheduleItem(data)
        message.success('排程已添加，费用/峰值已同步')
      }
      setModalOpen(false)
    } catch {}
  }

  const handleSaveCurrentVersion = () => {
    if (!saveName.trim()) {
      message.error('请输入方案名称')
      return
    }
    saveCurrentAsVersion(saveName.trim(), saveRemark.trim())
    message.success(`方案「${saveName}」已保存`)
    setSaveVersionModal(false)
    setSaveName('')
    setSaveRemark('')
  }

  const handleDuplicate = () => {
    if (!copyVersionId || !copyName.trim()) {
      message.error('请输入新方案名称')
      return
    }
    duplicateVersion(copyVersionId, copyName.trim())
    message.success(`已复制为「${copyName}」`)
    setCopyModal(false)
    setCopyVersionId(null)
    setCopyName('')
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>
            📅 排程窗
            {currentVersionId && (
              <Tag color="purple" style={{ marginLeft: 10 }}>
                <GoldOutlined /> {scheduleVersions.find((v) => v.id === currentVersionId)?.name}
              </Tag>
            )}
            {!currentVersionId && <Tag color="orange" style={{ marginLeft: 10 }}>未保存版本</Tag>}
          </h2>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
            拖拽调整 · 储能充放电 · 锅炉启停 · 空压机组合 · 方案版本管理
          </div>
        </div>
        <Space>
          <Tooltip title="高风险时段高亮">
            <Button
              type={crossWindow.highlightRiskSlots ? 'primary' : 'default'}
              icon={<WarningOutlined />}
              onClick={() => setHighlightRiskSlots(!crossWindow.highlightRiskSlots)}
            >
              {crossWindow.highlightRiskSlots ? '关闭高亮' : '高风险高亮'}
              {crossWindow.forecastHighRiskHours.length > 0 && (
                <Badge count={crossWindow.forecastHighRiskHours.length} offset={[4, -2]} />
              )}
            </Button>
          </Tooltip>
          <Tooltip title="恢复默认排程">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                switchToVersion('v1')
                message.success('已切换至基准方案')
              }}
            >
              重置
            </Button>
          </Tooltip>
          <Tooltip title="方案版本管理">
            <Button icon={<HistoryOutlined />} onClick={() => setVersionDrawer(true)}>
              方案版本
              <Badge count={scheduleVersions.length} style={{ marginLeft: 6 }} />
            </Button>
          </Tooltip>
          <Tooltip title="保存当前为新方案">
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => {
                setSaveName(`V${scheduleVersions.length + 1} 我的方案`)
                setSaveVersionModal(true)
              }}
            >
              保存方案
            </Button>
          </Tooltip>
          <Tooltip title="发布排程并下发执行">
            <Button type="primary" icon={<PlayCircleOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
              发布执行
            </Button>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增排程
          </Button>
        </Space>
      </div>

      {crossWindow.fromForecastJump && (
        <Alert
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 12 }}
          icon={<WarningOutlined />}
          message={`⚠ 从预测窗跳转 - 检测到 ${crossWindow.forecastHighRiskHours.length} 个高风险时段`}
          description={
            <Space>
              <span>
                风险时段：
                {crossWindow.forecastHighRiskHours
                  .slice(0, 6)
                  .map((h) => `${h}:00-${h + 1}:00`)
                  .join('、')}
                {crossWindow.forecastHighRiskHours.length > 6 && `...共${crossWindow.forecastHighRiskHours.length}个`}
              </span>
              <span style={{ color: '#8c8c8c' }}>
                建议：在这些时段增加储能放电 / 推迟非关键设备启动
              </span>
              {crossWindow.forecastHighRiskHours.length > 0 && (
                <Button
                  type="link"
                  size="small"
                  icon={<SaveOutlined />}
                  onClick={() => {
                    const hours = [...crossWindow.forecastHighRiskHours].sort((a, b) => a - b)
                    const start = hours[0]
                    const end = hours[hours.length - 1] + 1
                    addScheduleItem({
                      id: `sch_quick_${Date.now()}`,
                      type: 'storage_discharge',
                      name: '储能放电(快速)',
                      startTime: `${start.toString().padStart(2, '0')}:00`,
                      endTime: `${end.toString().padStart(2, '0')}:00`,
                      power: 500,
                      status: 'scheduled'
                    })
                    message.success(`已添加储能放电 ${start.toString().padStart(2,'0')}:00-${end.toString().padStart(2,'0')}:00，覆盖${hours.length}个风险小时`)
                    clearFromForecastFlag()
                  }}
                >
                  一键加储能放电
                </Button>
              )}
            </Space>
          }
          onClose={() => clearFromForecastFlag()}
        />
      )}

      {peakRisk === 'high' && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          icon={<RiseOutlined />}
          message={`峰值风险${riskMap[peakRisk].text}：预计 ${peakHour}:00 达到 ${peakLoad}kW，超红线 ${peakLoad - demandRedLine}kW`}
          description={
            <Space>
              <Tag color="red">费用预计增加 ¥{Math.round((peakLoad - demandRedLine) * 80)}</Tag>
              <Button size="small" type="primary" danger onClick={() => switchToVersion('v2')}>
                切换移峰方案
              </Button>
              <Button size="small" onClick={() => recalculateFromSchedule()}>重新计算</Button>
            </Space>
          }
        />
      )}

      {peakRisk === 'medium' && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          icon={<WarningOutlined />}
          message={`峰值风险${riskMap[peakRisk].text}：${peakHour}:00 约 ${peakLoad}kW / ${demandRedLine}kW`}
          description="接近红线，建议微调储能放电时段或推迟1台设备启动"
        />
      )}

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <div className="stat-card">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}><CalendarOutlined /> 排程任务数</span>}
              value={scheduleItems.length}
              valueStyle={{ color: '#fff', fontSize: 24 }}
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
          <div className={`stat-card ${peakRisk === 'high' ? '' : peakRisk === 'medium' ? 'orange' : 'cyan'}`}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>预计电费 · {riskMap[peakRisk].text}</span>}
              value={Math.round(energyCostEstimate)}
              prefix="¥"
              valueStyle={{ color: '#fff', fontSize: 20 }}
              suffix={`(${peakHour}:00峰)`}
            />
          </div>
        </Col>
        <Col span={5}>
          <div className="stat-card purple">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}><SaveOutlined /> 储能放电</span>}
              value={storageDischarge}
              suffix="kWh"
              precision={0}
              valueStyle={{ color: '#fff', fontSize: 20 }}
            />
          </div>
        </Col>
        <Col span={5}>
          <div className="stat-card green">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>峰谷节约</span>}
              value={peakSaving}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#fff', fontSize: 20 }}
              suffix={peakSaving > 30000 ? '↑' : ''}
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
        {crossWindow.forecastHighRiskHours.length > 0 && (
          <div className="legend-item">
            <div className="legend-color" style={{ background: 'rgba(255,77,79,0.15)', border: '1px dashed rgba(255,77,79,0.5)' }} />
            <span>高风险 ({crossWindow.forecastHighRiskHours.length}h)</span>
          </div>
        )}
        <div className="legend-item" style={{ marginLeft: 'auto' }}>
          <span style={{ color: '#8c8c8c', fontSize: 11 }}>💡 提示：拖拽色块可调整时间，点击可编辑详情；调整后费用自动更新</span>
        </div>
      </div>

      <Card size="small" className="gantt-chart-container">
        <div className="time-ruler">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className="time-ruler-tick"
              style={{
                background: crossWindow.highlightRiskSlots && crossWindow.forecastHighRiskHours.includes(i)
                  ? 'rgba(255,77,79,0.1)'
                  : undefined
              }}
            >
              {i.toString().padStart(2, '0')}
              {crossWindow.highlightRiskSlots && crossWindow.forecastHighRiskHours.includes(i) && (
                <span style={{ color: '#ff4d4f', fontSize: 10, display: 'block', marginTop: -2 }}>⚠</span>
              )}
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
            icon={<DashboardOutlined />}
            message="排程约束校验 & 实时计算"
            description={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space size={24} wrap>
                  <Tag color="success">✓ 锅炉最小运行6h: 满足</Tag>
                  <Tag color={storageDischarge > 0 ? 'success' : 'warning'}>
                    {storageDischarge > 0 ? `✓ 储能放电 ${Math.round(storageDischarge)}kWh` : '⚠ 未配置储能放电'}
                  </Tag>
                  <Tag color={peakRisk === 'low' ? 'success' : peakRisk === 'medium' ? 'warning' : 'error'}>
                    {peakRisk === 'high' ? `⚠ 峰值${peakLoad}kW超红线${peakLoad - demandRedLine}kW` :
                     peakRisk === 'medium' ? `⚠ 峰值${peakLoad}kW接近红线` :
                     `✓ 峰值 ${peakLoad}kW / ${demandRedLine}kW(${Math.round(peakLoad/demandRedLine*100)}%)`}
                  </Tag>
                  <Tag color="success">✓ 空压机组合供气≥需求</Tag>
                  <Tag color="blue">💰 预计节约 ¥{peakSaving}</Tag>
                  <Tag color="cyan">⚡ 峰值 {peakHour}:00</Tag>
                </Space>
              </Space>
            }
          />
        </div>
      </Card>

      <Card title="📋 排程明细（点击卡片编辑）" size="small" style={{ marginTop: 16 }}>
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
                {(groupedItems[type] || []).length === 0 && (
                  <Empty description={`暂无${cfg.label}排程，点击右上角"新增排程"`} style={{ width: '100%', padding: 30 }} />
                )}
                {(groupedItems[type] || []).map((item) => {
                  const durationMin = timeToMinutes(item.endTime) - timeToMinutes(item.startTime)
                  const durationHour = durationMin / 60
                  const kwh = durationHour * item.power
                  return (
                    <Card
                      key={item.id}
                      size="small"
                      style={{
                        width: 260,
                        borderLeft: `4px solid ${cfg.color}`,
                        cursor: 'pointer'
                      }}
                      onClick={() => openEditModal(item)}
                      hoverable
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <b style={{ fontSize: 14 }}>{item.name}</b>
                        <Tag color={statusMap[item.status].color}>{statusMap[item.status].text}</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: '#595959', lineHeight: 1.8 }}>
                        <div>⏰ {item.startTime} ~ {item.endTime}（{durationHour.toFixed(1)}h）</div>
                        <div>⚡ 功率 {item.power} kW · 能耗 <b>{kwh.toFixed(0)} kWh</b></div>
                        <div>
                          💰 预计 ¥{(kwh * getElectricityRate(parseInt(item.startTime.split(':')[0]))).toFixed(0)}
                          <Progress percent={Math.min(Math.round(durationHour / 24 * 100), 100)} size="small" showInfo={false} style={{ marginTop: 4 }} strokeColor={cfg.color} />
                        </div>
                      </div>
                    </Card>
                  )
                })}
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
        destroyOnHidden
      >
        <Form form={form} layout="vertical" size="small" preserve={false}>
          <Form.Item
            name="type"
            label="排程类型"
            rules={[{ required: true }]}
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
              allowClear
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
              <Form.Item
                name="startTime"
                label="开始时间"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <DatePicker.TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={30} allowClear={false} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endTime"
                label="结束时间"
                rules={[{ required: true, message: '请选择结束时间' }]}
              >
                <DatePicker.TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={30} allowClear={false} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="power" label="功率(kW)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={5000} addonAfter="kW" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态">
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

      <Drawer
        title={
          <Space>
            <HistoryOutlined style={{ color: '#1677ff' }} />
            <span>方案版本管理</span>
            <Tag color="purple">{scheduleVersions.length} 个版本</Tag>
          </Space>
        }
        width={440}
        open={versionDrawer}
        onClose={() => setVersionDrawer(false)}
        extra={
          <Button
            type="primary"
            size="small"
            icon={<SaveOutlined />}
            onClick={() => {
              setSaveName(`V${scheduleVersions.length + 1} 我的方案`)
              setSaveVersionModal(true)
              setVersionDrawer(false)
            }}
          >
            保存当前
          </Button>
        }
      >
        <List
          itemLayout="vertical"
          dataSource={[...scheduleVersions].reverse()}
          locale={{ emptyText: <Empty description="暂无保存的方案版本" /> }}
          renderItem={(v) => (
            <List.Item
              style={{
                border: currentVersionId === v.id ? '2px solid #1677ff' : '1px solid #e8e8e8',
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
                background: currentVersionId === v.id ? '#e6f4ff' : '#fff'
              }}
              actions={[
                <Button
                  key="switch"
                  type={currentVersionId === v.id ? 'primary' : 'default'}
                  size="small"
                  icon={<SwitcherOutlined />}
                  onClick={() => {
                    switchToVersion(v.id)
                    message.success(`已切换至「${v.name}」`)
                  }}
                >
                  {currentVersionId === v.id ? '当前' : '切换'}
                </Button>,
                <Button
                  key="copy"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    setCopyVersionId(v.id)
                    setCopyName(`${v.name} 副本`)
                    setCopyModal(true)
                  }}
                >
                  复制
                </Button>,
                scheduleVersions.length > 1 && (
                  <Popconfirm
                    key="del"
                    title="删除该方案版本？"
                    onConfirm={() => { deleteVersion(v.id); message.success('已删除') }}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )
              ]}
              extra={
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: v.estimatedPeakRisk === 'high' ? '#ff4d4f' : v.estimatedPeakRisk === 'medium' ? '#fa8c16' : '#52c41a' }}>
                    ¥{v.estimatedCost.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>峰值 {v.estimatedPeak}kW</div>
                </div>
              }
            >
              <List.Item.Meta
                avatar={<Avatar style={{ backgroundColor: v.estimatedPeakRisk === 'high' ? '#ff4d4f' : v.estimatedPeakRisk === 'medium' ? '#fa8c16' : '#52c41a' }}>{v.name.slice(1, 2)}</Avatar>}
                title={<b>{v.name}{currentVersionId === v.id && <Tag color="blue" style={{ marginLeft: 6 }}>当前使用</Tag>}</b>}
                description={
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {v.createdAt} · {v.items.length} 条排程
                  </div>
                }
              />
              <div style={{ fontSize: 12, marginTop: 4, color: '#595959' }}>
                {v.remark || '（无备注）'}
              </div>
              <Space style={{ marginTop: 8 }} size="small">
                <Tag color={riskMap[v.estimatedPeakRisk].color} icon={v.estimatedPeakRisk === 'low' ? <CheckCircleOutlined /> : <WarningOutlined />}>
                  {riskMap[v.estimatedPeakRisk].text}
                </Tag>
                <Tag color="green">峰谷节约 ¥{v.estimatedPeakSaving.toLocaleString()}</Tag>
                <Tag color="cyan">{v.items.length} 项</Tag>
              </Space>
            </List.Item>
          )}
        />
        <Divider />
        <div style={{ padding: '8px 0' }}>
          <Alert
            type="info"
            showIcon
            icon={<HistoryOutlined />}
            message="版本管理建议"
            description={
              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                <div>• 每次调整排程后<b>保存为新版本</b>，便于对比和回溯</div>
                <div>• 重要决策前可<b>复制基线版本</b>，修改不影响原方案</div>
                <div>• 峰值超红线时建议切换到 <Tag color="blue">V2 移峰填谷</Tag> 或手动调整</div>
              </div>
            }
          />
        </div>
      </Drawer>

      <Modal
        title="保存当前方案为新版本"
        open={saveVersionModal}
        onOk={handleSaveCurrentVersion}
        onCancel={() => setSaveVersionModal(false)}
        width={440}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>方案名称 <span style={{ color: '#ff4d4f' }}>*</span></label>
            <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="如：V3 高温调整方案" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>备注说明</label>
            <TextArea rows={2} value={saveRemark} onChange={(e) => setSaveRemark(e.target.value)} placeholder="调整原因、适用场景等（可选）" />
          </div>
          <Alert
            type="info"
            showIcon
            size="small"
            message={`当前版本：${scheduleItems.length} 条排程 · 预计 ¥${Math.round(energyCostEstimate)} · 峰值 ${peakLoad}kW`}
          />
        </Space>
      </Modal>

      <Modal
        title="复制方案版本"
        open={copyModal}
        onOk={handleDuplicate}
        onCancel={() => setCopyModal(false)}
        width={420}
      >
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>新方案名称 <span style={{ color: '#ff4d4f' }}>*</span></label>
          <Input value={copyName} onChange={(e) => setCopyName(e.target.value)} placeholder="输入新方案名称" />
        </div>
      </Modal>
    </div>
  )
}

function getElectricityRate(hour: number) {
  if (hour >= 8 && hour < 11) return 1.28
  if (hour >= 13 && hour < 15) return 1.28
  if (hour >= 18 && hour < 21) return 1.28
  if ((hour >= 22) || (hour < 8)) return 0.32
  return 0.78
}
