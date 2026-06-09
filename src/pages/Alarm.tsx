import { useState } from 'react'
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Row,
  Col,
  Statistic,
  Tabs,
  Input,
  Select,
  Form,
  Modal,
  message,
  Badge,
  Tooltip,
  List,
  Timeline,
  Empty,
  Alert as AntAlert
} from 'antd'
import {
  WarningOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  FireOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  BellOutlined,
  EyeOutlined,
  SolutionOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
  RiseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useEnergyStore } from '@/store'
import type { AlarmItem } from '@/types'

const levelMap: Record<string, { color: string; bgColor: string; text: string; icon: React.ReactNode }> = {
  critical: { color: '#ff4d4f', bgColor: '#fff1f0', text: '严重', icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> },
  warning: { color: '#faad14', bgColor: '#fffbe6', text: '警告', icon: <WarningOutlined style={{ color: '#faad14' }} /> },
  info: { color: '#1677ff', bgColor: '#e6f4ff', text: '提示', icon: <BellOutlined style={{ color: '#1677ff' }} /> }
}

const typeMap: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  over_load: { label: '设备过载', icon: <ThunderboltOutlined />, color: 'orange' },
  low_efficiency: { label: '效率偏低', icon: <RiseOutlined />, color: 'purple' },
  waste_heat: { label: '余热浪费', icon: <FireOutlined />, color: 'red' },
  over_demand: { label: '超需量', icon: <ExclamationCircleOutlined />, color: 'magenta' },
  equipment_fault: { label: '设备故障', icon: <WarningOutlined />, color: 'volcano' }
}

export default function Alarm() {
  const { alarms, resolveAlarm, resolveAllAlarms } = useEnergyStore()
  const [detailModal, setDetailModal] = useState(false)
  const [currentAlarm, setCurrentAlarm] = useState<AlarmItem | null>(null)
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchText, setSearchText] = useState('')

  const unresolved = alarms.filter((a) => !a.resolved)
  const criticalCount = alarms.filter((a) => a.level === 'critical' && !a.resolved).length
  const warningCount = alarms.filter((a) => a.level === 'warning' && !a.resolved).length

  const filteredAlarms = alarms.filter((a) => {
    if (filterLevel !== 'all' && a.level !== filterLevel) return false
    if (filterType !== 'all' && a.type !== filterType) return false
    if (filterStatus === 'unresolved' && a.resolved) return false
    if (filterStatus === 'resolved' && !a.resolved) return false
    if (searchText && !a.title.includes(searchText) && !a.description.includes(searchText)) return false
    return true
  }).sort((a, b) => {
    const levelOrder = ['critical', 'warning', 'info']
    const la = levelOrder.indexOf(a.level)
    const lb = levelOrder.indexOf(b.level)
    if (la !== lb) return la - lb
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1
    return dayjs(b.time).valueOf() - dayjs(a.time).valueOf()
  })

  const handleResolve = (id: string) => {
    resolveAlarm(id)
    message.success('告警已标记为处理')
  }

  const handleResolveAll = () => {
    const unresolvedCount = alarms.filter((a) => !a.resolved).length
    if (unresolvedCount === 0) {
      message.info('暂无可处理的告警')
      return
    }
    resolveAllAlarms()
    message.success(`已一键处理 ${unresolvedCount} 条告警`)
  }

  const handleViewDetail = (item: AlarmItem) => {
    setCurrentAlarm(item)
    setDetailModal(true)
  }

  const columns = [
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 90,
      render: (v: string) => (
        <Tag color={levelMap[v].color.replace('#', '') === 'ff4d4f' ? 'red' : levelMap[v].color.replace('#', '') === 'faad14' ? 'gold' : 'blue'} style={{ margin: 0, fontWeight: 600 }}>
          {levelMap[v].icon} {levelMap[v].text}
        </Tag>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (v: string) => (
        <Tag color={typeMap[v].color}>
          {typeMap[v].icon} {typeMap[v].label}
        </Tag>
      )
    },
    {
      title: '告警标题',
      dataIndex: 'title',
      key: 'title',
      render: (v: string, record: AlarmItem) => (
        <Space>
          <span style={{ fontWeight: record.resolved ? 400 : 600, color: record.resolved ? '#8c8c8c' : '#262626', textDecoration: record.resolved ? 'line-through' : 'none' }}>
            {v}
          </span>
          {!record.resolved && record.level === 'critical' && (
            <Badge dot status="processing" color="#ff4d4f" />
          )}
        </Space>
      )
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 110,
      render: (v: string) => <span style={{ color: '#595959' }}>{v}</span>
    },
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 160,
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', color: '#8c8c8c', fontSize: 12 }}>
          {v}
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'resolved',
      key: 'resolved',
      width: 90,
      render: (v: boolean) => v
        ? <Tag color="success"><CheckCircleOutlined /> 已处理</Tag>
        : <Tag color="red"><ClockCircleOutlined style={{ color: '#ff4d4f' }} /> 待处理</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: AlarmItem) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {!record.resolved && (
            <Button type="link" size="small" icon={<SolutionOutlined />} onClick={() => handleResolve(record.id)}>
              处理
            </Button>
          )}
        </Space>
      )
    }
  ]

  const tabItems = [
    {
      key: 'all',
      label: (
        <span>
          <WarningOutlined /> 全部告警
          <Tag color="blue" style={{ marginLeft: 8 }}>{alarms.length}</Tag>
        </span>
      )
    },
    {
      key: 'unresolved',
      label: (
        <span>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> 待处理
          <Badge count={unresolved.length} size="small" style={{ marginLeft: 8 }} />
        </span>
      )
    },
    {
      key: 'critical',
      label: (
        <span>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> 严重
          <Tag color="red" style={{ marginLeft: 8 }}>
            {alarms.filter((a) => a.level === 'critical').length}
          </Tag>
        </span>
      )
    }
  ]

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>🚨 告警窗</h2>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
            超需量预警 · 低效率提示 · 余热浪费 · 设备故障告警
          </div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />}>刷新</Button>
          <Button type="primary" icon={<SolutionOutlined />} onClick={handleResolveAll}>
            一键处理全部
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <div className="stat-card red">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>严重告警</div>
                <div style={{ fontSize: 36, fontWeight: 700, marginTop: 4 }}>{criticalCount}</div>
              </div>
              <ExclamationCircleOutlined style={{ fontSize: 40, opacity: 0.4 }} />
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card orange">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>警告提示</div>
                <div style={{ fontSize: 36, fontWeight: 700, marginTop: 4 }}>{warningCount}</div>
              </div>
              <WarningOutlined style={{ fontSize: 40, opacity: 0.4 }} />
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card cyan">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>今日处理</div>
                <div style={{ fontSize: 36, fontWeight: 700, marginTop: 4 }}>
                  {alarms.filter((a) => a.resolved).length}
                </div>
              </div>
              <CheckCircleOutlined style={{ fontSize: 40, opacity: 0.4 }} />
            </div>
          </div>
        </Col>
        <Col span={6}>
          <div className="stat-card green">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>处理率</div>
                <div style={{ fontSize: 36, fontWeight: 700, marginTop: 4 }}>
                  {alarms.length > 0
                    ? ((alarms.filter((a) => a.resolved).length / alarms.length) * 100).toFixed(0)
                    : 0}%
                </div>
              </div>
              <CheckOutlined style={{ fontSize: 40, opacity: 0.4 }} />
            </div>
          </div>
        </Col>
      </Row>

      {criticalCount > 0 && (
        <AntAlert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message={`有 ${criticalCount} 条严重告警待处理，请立即关注！`}
          description="超需量预警和设备故障可能直接影响生产，请优先处理"
          action={
            <Button size="small" danger type="primary">
              立即处理
            </Button>
          }
        />
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap style={{ marginBottom: 12 }}>
          <Input
            allowClear
            placeholder="搜索告警标题或内容..."
            prefix={<SearchOutlined />}
            style={{ width: 260 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Select
            prefix={<FilterOutlined />}
            style={{ width: 140 }}
            value={filterLevel}
            onChange={setFilterLevel}
            options={[
              { value: 'all', label: '全部级别' },
              { value: 'critical', label: '仅严重' },
              { value: 'warning', label: '仅警告' },
              { value: 'info', label: '仅提示' }
            ]}
          />
          <Select
            style={{ width: 140 }}
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: 'all', label: '全部类型' },
              { value: 'over_demand', label: '超需量' },
              { value: 'low_efficiency', label: '低效率' },
              { value: 'waste_heat', label: '余热浪费' },
              { value: 'over_load', label: '设备过载' },
              { value: 'equipment_fault', label: '设备故障' }
            ]}
          />
          <Select
            style={{ width: 140 }}
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'unresolved', label: '待处理' },
              { value: 'resolved', label: '已处理' }
            ]}
          />
        </Space>

        <Tabs
          activeKey={
            filterStatus === 'all' && filterLevel === 'all' ? 'all'
            : filterStatus === 'unresolved' ? 'unresolved'
            : filterLevel === 'critical' ? 'critical' : 'all'
          }
          onChange={(k) => {
            if (k === 'unresolved') { setFilterStatus('unresolved'); setFilterLevel('all') }
            else if (k === 'critical') { setFilterLevel('critical'); setFilterStatus('all') }
            else { setFilterStatus('all'); setFilterLevel('all') }
          }}
          items={tabItems}
        />

        <Table
          columns={columns}
          dataSource={filteredAlarms}
          rowKey="id"
          size="small"
          rowClassName={(record) => record.resolved ? 'row-muted' : record.level === 'critical' ? 'row-critical' : ''}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条告警`
          }}
          locale={{
            emptyText: <Empty description="暂无告警，系统运行正常 🎉" />
          }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: '8px 16px', background: levelMap[record.level].bgColor, borderRadius: 6 }}>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>📝 详细描述：</div>
                <div style={{ color: '#595959', lineHeight: 1.7, marginBottom: 10 }}>{record.description}</div>
                <Row gutter={16}>
                  <Col span={8}>
                    <b>告警来源：</b>{record.source}
                  </Col>
                  <Col span={8}>
                    <b>告警时间：</b>{record.time}
                  </Col>
                  <Col span={8}>
                    <b>当前状态：</b>
                    <Tag color={record.resolved ? 'success' : 'red'}>
                      {record.resolved ? '已处理' : '待处理'}
                    </Tag>
                  </Col>
                </Row>
              </div>
            )
          }}
        />
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card
            title={<span><ClockCircleOutlined /> 告警处理时间线</span>}
            size="small"
          >
            <Timeline
              mode="left"
              items={[
                {
                  color: 'red',
                  label: '13:45',
                  children: (
                    <div style={{ padding: 8 }}>
                      <div style={{ fontWeight: 500 }}>超需量预警</div>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                        EMS系统 · 预计峰值2650kW超红线
                      </div>
                    </div>
                  )
                },
                {
                  color: 'orange',
                  label: '11:20',
                  children: (
                    <div style={{ padding: 8 }}>
                      <div style={{ fontWeight: 500 }}>涂装车间效率偏低</div>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                        车间监控 · 综合效率72%低于标准85%
                      </div>
                    </div>
                  )
                },
                {
                  color: 'orange',
                  label: '10:15',
                  children: (
                    <div style={{ padding: 8 }}>
                      <div style={{ fontWeight: 500 }}>焊接车间余热浪费</div>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                        能耗分析 · 余热回收率仅35%
                      </div>
                    </div>
                  )
                },
                {
                  color: 'blue',
                  label: '10:50',
                  dot: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                  children: (
                    <div style={{ padding: 8 }}>
                      <div style={{ fontWeight: 500, textDecoration: 'line-through', color: '#8c8c8c' }}>
                        空压机负荷偏高 [已处理]
                      </div>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                        处理人：王工 · 启动空压机B分担负荷
                      </div>
                    </div>
                  )
                },
                {
                  color: 'volcano',
                  label: '09:30',
                  children: (
                    <div style={{ padding: 8 }}>
                      <div style={{ fontWeight: 500 }}>涂装线设备故障</div>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
                        设备管理 · 循环泵异常切换维护模式
                      </div>
                    </div>
                  )
                }
              ]}
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card
            title={<span><SolutionOutlined /> 处理建议与知识库</span>}
            size="small"
          >
            <List
              size="small"
              dataSource={[
                {
                  title: '超需量紧急处理方案',
                  steps: ['1. 立即启动储能系统放电，预计削峰150kW', '2. 将冲压机B延迟至16:30后启动', '3. 通知车间降低非关键设备负荷10%', '4. 若仍超限，申请临时增加需量额度'],
                  color: 'red'
                },
                {
                  title: '涂装车间效率提升建议',
                  steps: ['1. 检查涂装流水线加热系统保温层', '2. 校准循环泵流量与压力参数', '3. 清洗换热器，预计提升效率8-10%', '4. 计划16:00完成检修恢复'],
                  color: 'orange'
                },
                {
                  title: '焊接余热回收优化',
                  steps: ['1. 检修余热回收装置，清理换热管', '2. 调整排烟风机转速，回收温差≥80℃', '3. 预热新风供车间空调，预计节能5%'],
                  color: 'blue'
                }
              ]}
              renderItem={(item) => (
                <List.Item style={{ alignItems: 'flex-start' }}>
                  <div style={{ width: '100%' }}>
                    <div
                      style={{
                        fontWeight: 600,
                        marginBottom: 6,
                        padding: '6px 10px',
                        borderRadius: 4,
                        background: item.color === 'red' ? '#fff1f0' : item.color === 'orange' ? '#fffbe6' : '#e6f4ff',
                        color: item.color === 'red' ? '#cf1322' : item.color === 'orange' ? '#d46b08' : '#0958d9'
                      }}
                    >
                      {item.title}
                    </div>
                    {item.steps.map((step: string, i: number) => (
                      <div key={i} style={{ fontSize: 12, color: '#595959', padding: '3px 10px', lineHeight: 1.7 }}>
                        {step}
                      </div>
                    ))}
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={currentAlarm ? (
          <Space>
            {levelMap[currentAlarm.level].icon}
            <span>{currentAlarm.title}</span>
            <Tag color={levelMap[currentAlarm.level].color === '#ff4d4f' ? 'red' : levelMap[currentAlarm.level].color === '#faad14' ? 'gold' : 'blue'}>
              {levelMap[currentAlarm.level].text}
            </Tag>
          </Space>
        ) : '告警详情'}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={
          currentAlarm && !currentAlarm.resolved ? (
            <Space>
              <Button onClick={() => setDetailModal(false)}>关闭</Button>
              <Button
                type="primary"
                icon={<SolutionOutlined />}
                onClick={() => {
                  if (currentAlarm) handleResolve(currentAlarm.id)
                  setDetailModal(false)
                }}
              >
                标记已处理
              </Button>
            </Space>
          ) : (
            <Button onClick={() => setDetailModal(false)}>关闭</Button>
          )
        }
        width={640}
      >
        {currentAlarm && (
          <div>
            <AntAlert
              type={currentAlarm.level === 'critical' ? 'error' : currentAlarm.level === 'warning' ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 16 }}
              message={currentAlarm.description}
            />
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>告警类型</div>
                <Tag color={typeMap[currentAlarm.type].color}>
                  {typeMap[currentAlarm.type].icon} {typeMap[currentAlarm.type].label}
                </Tag>
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>来源系统</div>
                <div style={{ fontWeight: 500 }}>{currentAlarm.source}</div>
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>发生时间</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 500 }}>{currentAlarm.time}</div>
              </Col>
            </Row>
            <Card title="📋 处理记录" size="small" type="inner">
              <Timeline
                size="small"
                items={[
                  { color: 'blue', children: `${currentAlarm.time} 系统自动触发告警` },
                  { color: 'green', children: `${dayjs(currentAlarm.time).add(3, 'minute').format('YYYY-MM-DD HH:mm')} 推送给能源主管李明（APP+短信）` },
                  currentAlarm.resolved
                    ? { color: 'success', dot: <CheckCircleOutlined />, children: `${dayjs().format('YYYY-MM-DD HH:mm')} 已标记处理完成` }
                    : { color: 'gray', children: '待处理中...', dot: <ClockCircleOutlined /> }
                ]}
              />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  )
}