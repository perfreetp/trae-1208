import { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Switch,
  Tag,
  Space,
  Popconfirm,
  message,
  Row,
  Col,
  Statistic,
  Tooltip,
  Tabs
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  FireOutlined,
  CloudOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useEnergyStore } from '@/store'
import type { WorkOrder, Shift, Equipment } from '@/types'

const priorityMap: Record<string, { color: string; text: string }> = {
  urgent: { color: 'red', text: '紧急' },
  high: { color: 'orange', text: '高' },
  normal: { color: 'blue', text: '普通' },
  low: { color: 'default', text: '低' }
}

const equipmentStatusMap: Record<string, { color: string; text: string }> = {
  available: { color: 'green', text: '可用' },
  running: { color: 'blue', text: '运行中' },
  maintenance: { color: 'orange', text: '维护中' }
}

export default function Production() {
  const {
    shifts,
    equipments,
    workOrders,
    addWorkOrder,
    updateWorkOrder,
    deleteWorkOrder
  } = useEnergyStore()

  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null)
  const [form] = Form.useForm()

  const equipmentNames = equipments.map((e) => ({ label: e.name, value: e.name }))

  const handleAddOrder = () => {
    setEditingOrder(null)
    form.setFieldsValue({
      priority: 'normal',
      quantity: 100,
      nonStopRequired: false,
      plannedStart: dayjs('08:00', 'HH:mm'),
      plannedEnd: dayjs('16:00', 'HH:mm')
    })
    setOrderModalOpen(true)
  }

  const handleEditOrder = (record: WorkOrder) => {
    setEditingOrder(record)
    form.setFieldsValue({
      ...record,
      plannedStart: dayjs(record.plannedStart, 'HH:mm'),
      plannedEnd: dayjs(record.plannedEnd, 'HH:mm')
    })
    setOrderModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const orderData: WorkOrder = {
        id: editingOrder?.id || `wo${Date.now()}`,
        name: values.name,
        equipment: values.equipment,
        priority: values.priority,
        plannedStart: values.plannedStart.format('HH:mm'),
        plannedEnd: values.plannedEnd.format('HH:mm'),
        quantity: values.quantity,
        nonStopRequired: values.nonStopRequired
      }
      if (editingOrder) {
        updateWorkOrder(editingOrder.id, orderData)
        message.success('工单更新成功')
      } else {
        addWorkOrder(orderData)
        message.success('工单添加成功')
      }
      setOrderModalOpen(false)
    } catch {
      // 表单校验失败
    }
  }

  const orderColumns = [
    {
      title: '工单编号',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (v: string) => <span style={{ fontFamily: 'monospace', color: '#8c8c8c' }}>{v.toUpperCase()}</span>
    },
    {
      title: '工单名称',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, record: WorkOrder) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{v}</span>
          {record.nonStopRequired && (
            <Tooltip title="不可停机">
              <Tag color="red" icon={<ExclamationCircleOutlined />}>不可停机</Tag>
            </Tooltip>
          )}
        </Space>
      )
    },
    {
      title: '关联设备',
      dataIndex: 'equipment',
      key: 'equipment',
      width: 140,
      render: (v: string) => <Tag icon={<ThunderboltOutlined />} color="blue">{v}</Tag>
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (v: string) => <Tag color={priorityMap[v].color}>{priorityMap[v].text}</Tag>,
      sorter: (a: WorkOrder, b: WorkOrder) => {
        const order = ['urgent', 'high', 'normal', 'low']
        return order.indexOf(a.priority) - order.indexOf(b.priority)
      }
    },
    {
      title: '计划时间',
      key: 'time',
      width: 160,
      render: (_: any, record: WorkOrder) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#1677ff' }} />
          <span style={{ fontFamily: 'monospace' }}>
            {record.plannedStart} ~ {record.plannedEnd}
          </span>
        </Space>
      )
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      align: 'right' as const,
      render: (v: number) => <Statistic value={v} valueStyle={{ fontSize: 14 }} suffix="件" />
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: WorkOrder) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditOrder(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该工单？"
            description="删除后将无法恢复"
            onConfirm={() => { deleteWorkOrder(record.id); message.success('删除成功') }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const shiftColumns = [
    {
      title: '班次名称',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, record: Shift) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#722ed1' }} />
          <span style={{ fontWeight: 500 }}>{v}</span>
        </Space>
      )
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      width: 120,
      render: (v: string) => <Tag color="blue" style={{ fontFamily: 'monospace' }}>{v}</Tag>
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      width: 120,
      render: (v: string) => <Tag color="orange" style={{ fontFamily: 'monospace' }}>{v}</Tag>
    },
    {
      title: '时长',
      key: 'duration',
      width: 100,
      render: (_: any, record: Shift) => {
        const start = dayjs(record.startTime, 'HH:mm')
        let end = dayjs(record.endTime, 'HH:mm')
        if (end.isBefore(start)) end = end.add(1, 'day')
        return <span>{end.diff(start, 'hour')} 小时</span>
      }
    },
    {
      title: '配置人数',
      dataIndex: 'workers',
      key: 'workers',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Statistic value={v} suffix="人" valueStyle={{ fontSize: 14 }} />
    }
  ]

  const equipmentColumns = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, record: Equipment) => (
        <Space>
          <ThunderboltOutlined style={{ color: '#fa8c16' }} />
          <span style={{ fontWeight: 500 }}>{v}</span>
          <Tag color={equipmentStatusMap[record.status].color}>
            {equipmentStatusMap[record.status].text}
          </Tag>
        </Space>
      )
    },
    {
      title: '所属车间',
      dataIndex: 'workshop',
      key: 'workshop',
      width: 120,
      render: (v: string) => <span style={{ color: '#595959' }}>{v}</span>
    },
    {
      title: '额定功率',
      dataIndex: 'power',
      key: 'power',
      width: 120,
      render: (v: number) => (
        <Space size={4}>
          <ThunderboltOutlined style={{ color: '#1677ff' }} />
          <span style={{ color: '#1677ff', fontWeight: 500 }}>{v} kW</span>
        </Space>
      )
    },
    {
      title: '蒸汽消耗',
      dataIndex: 'steamConsumption',
      key: 'steamConsumption',
      width: 120,
      render: (v: number) => (
        <Space size={4}>
          <FireOutlined style={{ color: v > 0 ? '#fa541c' : v < 0 ? '#52c41a' : '#8c8c8c' }} />
          <span style={{ color: v > 0 ? '#fa541c' : v < 0 ? '#52c41a' : '#8c8c8c', fontWeight: 500 }}>
            {v > 0 ? `+${v}` : v} kg/h
          </span>
        </Space>
      )
    },
    {
      title: '压缩空气',
      dataIndex: 'airConsumption',
      key: 'airConsumption',
      width: 130,
      render: (v: number) => (
        <Space size={4}>
          <CloudOutlined style={{ color: v > 0 ? '#13c2c2' : v < 0 ? '#52c41a' : '#8c8c8c' }} />
          <span style={{ color: v > 0 ? '#13c2c2' : v < 0 ? '#52c41a' : '#8c8c8c', fontWeight: 500 }}>
            {v > 0 ? `+${v}` : v} m³/min
          </span>
        </Space>
      )
    },
    {
      title: '最小运行',
      dataIndex: 'minRunHours',
      key: 'minRunHours',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <Tag color="purple">{v}h</Tag>
    },
    {
      title: '最小停机',
      dataIndex: 'minStopHours',
      key: 'minStopHours',
      width: 100,
      align: 'right' as const,
      render: (v: number) => <Tag color="cyan">{v}h</Tag>
    }
  ]

  const tabItems = [
    {
      key: 'orders',
      label: (
        <span>
          <FileTextOutlined />
          工单管理
          <Tag color="blue" style={{ marginLeft: 8 }}>{workOrders.length}</Tag>
        </span>
      ),
      children: (
        <>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              <Tag color="red">紧急 {workOrders.filter((w) => w.priority === 'urgent').length}</Tag>
              <Tag color="orange">高 {workOrders.filter((w) => w.priority === 'high').length}</Tag>
              <Tag color="blue">普通 {workOrders.filter((w) => w.priority === 'normal').length}</Tag>
              <Tag color="default">低 {workOrders.filter((w) => w.priority === 'low').length}</Tag>
              <Tag icon={<ExclamationCircleOutlined />} color="magenta">
                不可停机 {workOrders.filter((w) => w.nonStopRequired).length}
              </Tag>
            </Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddOrder}>
              新增工单
            </Button>
          </div>
          <Table
            columns={orderColumns}
            dataSource={workOrders}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </>
      )
    },
    {
      key: 'shifts',
      label: (
        <span>
          <ClockCircleOutlined />
          班次配置
          <Tag color="purple" style={{ marginLeft: 8 }}>{shifts.length}</Tag>
        </span>
      ),
      children: (
        <Table
          columns={shiftColumns}
          dataSource={shifts}
          rowKey="id"
          size="small"
          pagination={false}
        />
      )
    },
    {
      key: 'equipments',
      label: (
        <span>
          <ThunderboltOutlined />
          设备清单
          <Tag color="green" style={{ marginLeft: 8 }}>{equipments.length}</Tag>
        </span>
      ),
      children: (
        <>
          <Row gutter={12} style={{ marginBottom: 12 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="总设备"
                  value={equipments.length}
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ fontSize: 20 }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="运行中"
                  value={equipments.filter((e) => e.status === 'running').length}
                  valueStyle={{ fontSize: 20, color: '#1677ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="可用备用"
                  value={equipments.filter((e) => e.status === 'available').length}
                  valueStyle={{ fontSize: 20, color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="总装机功率"
                  value={equipments.reduce((sum, e) => sum + e.power, 0)}
                  suffix="kW"
                  valueStyle={{ fontSize: 20, color: '#fa8c16' }}
                />
              </Card>
            </Col>
          </Row>
          <Table
            columns={equipmentColumns}
            dataSource={equipments}
            rowKey="id"
            size="small"
            pagination={false}
          />
        </>
      )
    }
  ]

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>⚙️ 产线窗</h2>
        <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
          班次配置、设备参数、工单管理与不可停机规则
        </div>
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Tabs items={tabItems} />
      </Card>

      <Card title="📋 不可停机规则说明" size="small" type="inner">
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ padding: 12, background: '#fff2e8', borderRadius: 8 }}>
              <h4 style={{ color: '#d4380d', marginBottom: 8 }}>🔴 强制不可停机</h4>
              <div style={{ fontSize: 13, color: '#595959', lineHeight: 1.8 }}>
                <div>• 车架冲压批次（批量生产过程中）</div>
                <div>• 车身焊接流水线（连续作业）</div>
                <div>• 整车总装线（节拍约束）</div>
                <div>• 涂装流水线（工艺温度要求）</div>
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ padding: 12, background: '#fff7e6', borderRadius: 8 }}>
              <h4 style={{ color: '#d46b08', marginBottom: 8 }}>🟡 条件可停机</h4>
              <div style={{ fontSize: 13, color: '#595959', lineHeight: 1.8 }}>
                <div>• CNC加工中心（批次间隔≥30min）</div>
                <div>• 辅助设备（主设备停机时）</div>
                <div>• 锅炉组（低负荷时段切换）</div>
                <div>• 空压机（气压充足时轮休）</div>
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ padding: 12, background: '#e6f4ff', borderRadius: 8 }}>
              <h4 style={{ color: '#0958d9', marginBottom: 8 }}>🔵 灵活调度</h4>
              <div style={{ fontSize: 13, color: '#595959', lineHeight: 1.8 }}>
                <div>• 储能系统（随时充放）</div>
                <div>• 备用冲压机（按需启停）</div>
                <div>• 冷却水塔（变频调节）</div>
                <div>• 照明系统（分区控制）</div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <Modal
        title={editingOrder ? '编辑工单' : '新增工单'}
        open={orderModalOpen}
        onOk={handleSubmit}
        onCancel={() => setOrderModalOpen(false)}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item
                name="name"
                label="工单名称"
                rules={[{ required: true, message: '请输入工单名称' }]}
              >
                <Input placeholder="如：车架冲压批次A" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="priority"
                label="优先级"
                rules={[{ required: true, message: '请选择优先级' }]}
              >
                <Select
                  options={[
                    { value: 'urgent', label: <Tag color="red">紧急</Tag> },
                    { value: 'high', label: <Tag color="orange">高</Tag> },
                    { value: 'normal', label: <Tag color="blue">普通</Tag> },
                    { value: 'low', label: <Tag>低</Tag> }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item
                name="equipment"
                label="关联设备"
                rules={[{ required: true, message: '请选择设备' }]}
              >
                <Select options={equipmentNames} placeholder="选择设备" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="quantity"
                label="工单数量"
                rules={[{ required: true, message: '请输入数量' }]}
              >
                <InputNumber style={{ width: '100%' }} min={1} addonAfter="件" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="plannedStart"
                label="计划开始时间"
                rules={[{ required: true, message: '请选择开始时间' }]}
              >
                <DatePicker.TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={30} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="plannedEnd"
                label="计划结束时间"
                rules={[{ required: true, message: '请选择结束时间' }]}
              >
                <DatePicker.TimePicker style={{ width: '100%' }} format="HH:mm" minuteStep={30} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="nonStopRequired"
            label="是否不可停机"
            valuePropName="checked"
          >
            <Switch
              checkedChildren={<ExclamationCircleOutlined />}
              unCheckedChildren="否"
            />
            <span style={{ marginLeft: 10, color: '#8c8c8c', fontSize: 12 }}>
              开启后排程时不可中途停止
            </span>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
