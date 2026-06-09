import { useState } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Tag,
  Space,
  Table,
  Progress,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  message,
  Divider,
  Tabs,
  Drawer,
  Descriptions,
  Tooltip,
  Avatar,
  Timeline,
  Empty,
  Alert as AntAlert
} from 'antd'
import {
  FileDoneOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  FileTextOutlined,
  PrinterOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  RiseOutlined,
  FallOutlined,
  UserOutlined,
  CommentOutlined,
  SearchOutlined,
  HistoryOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { useEnergyStore } from '@/store'
import type { ReviewRecord } from '@/types'

const statusMap: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
  pending: { color: 'orange', icon: <ClockCircleOutlined />, text: '待审批' },
  approved: { color: 'green', icon: <CheckCircleOutlined />, text: '已通过' },
  rejected: { color: 'red', icon: <CloseCircleOutlined />, text: '已驳回' }
}

export default function Review() {
  const { reviewRecords, addReviewRecord, updateReviewRecord } = useEnergyStore()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [detailDrawer, setDetailDrawer] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<ReviewRecord | null>(null)
  const [editingRecord, setEditingRecord] = useState<ReviewRecord | null>(null)
  const [addForm] = Form.useForm()
  const [searchDate, setSearchDate] = useState<string | null>(null)
  const [searchStatus, setSearchStatus] = useState<string>('all')

  const pendingCount = reviewRecords.filter((r) => r.approvalStatus === 'pending').length
  const avgDeviation = reviewRecords.length > 0
    ? (reviewRecords.reduce((s, r) => s + r.deviation, 0) / reviewRecords.length).toFixed(2)
    : '0'
  const approvedRate = reviewRecords.length > 0
    ? ((reviewRecords.filter((r) => r.approvalStatus === 'approved').length / reviewRecords.length) * 100).toFixed(0)
    : '0'

  const filteredRecords = reviewRecords.filter((r) => {
    if (searchDate && r.date !== searchDate) return false
    if (searchStatus !== 'all' && r.approvalStatus !== searchStatus) return false
    return true
  }).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())

  const handleAdd = () => {
    setEditingRecord(null)
    addForm.resetFields()
    setAddModalOpen(true)
  }

  const handleEdit = (record: ReviewRecord) => {
    setEditingRecord(record)
    addForm.setFieldsValue({
      ...record,
      date: dayjs(record.date),
      deviation: record.deviation
    })
    setAddModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await addForm.validateFields()
      const data: ReviewRecord = {
        id: editingRecord?.id || `r${Date.now()}`,
        date: values.date.format('YYYY-MM-DD'),
        schedulePlan: values.schedulePlan,
        actualExecution: values.actualExecution,
        deviation: values.deviation,
        deviationReason: values.deviationReason,
        approver: values.approver || editingRecord?.approver || '待审批',
        approvalOpinion: values.approvalOpinion || editingRecord?.approvalOpinion || '',
        approvalStatus: values.approvalStatus || editingRecord?.approvalStatus || 'pending',
        remarks: values.remarks || ''
      }
      if (editingRecord) {
        updateReviewRecord(editingRecord.id, data)
        message.success('复盘记录已更新')
      } else {
        addReviewRecord(data)
        message.success('复盘记录已创建')
      }
      setAddModalOpen(false)
    } catch {}
  }

  const handleViewDetail = (record: ReviewRecord) => {
    setCurrentRecord(record)
    setDetailDrawer(true)
  }

  const deviationTrendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['偏差率 (%)', '计划费用', '实际费用'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: filteredRecords.slice(0, 7).reverse().map((r) => r.date.slice(5))
    },
    yAxis: [
      { type: 'value', name: '偏差率 (%)', max: 15 },
      { type: 'value', name: '费用 (万元)' }
    ],
    series: [
      {
        name: '偏差率 (%)',
        type: 'bar',
        data: filteredRecords.slice(0, 7).reverse().map((r) => r.deviation),
        itemStyle: {
          color: (params: any) =>
            params.value > 5 ? '#ff4d4f' : params.value > 3 ? '#faad14' : '#52c41a',
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: 28,
        label: { show: true, position: 'top', formatter: '{c}%', fontSize: 11 }
      },
      {
        name: '计划费用',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: [26.5, 25.8, 27.2, 28.6, 26.1, 29.0, 27.8],
        lineStyle: { width: 3, color: '#1677ff' },
        itemStyle: { color: '#1677ff' }
      },
      {
        name: '实际费用',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: [28.2, 26.4, 28.8, 28.9, 27.5, 29.6, 28.5],
        lineStyle: { width: 3, color: '#fa8c16', type: 'dashed' },
        itemStyle: { color: '#fa8c16' }
      }
    ]
  }

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (v: string) => (
        <Space>
          <HistoryOutlined style={{ color: '#1677ff' }} />
          <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{v}</span>
        </Space>
      )
    },
    {
      title: '排程方案',
      dataIndex: 'schedulePlan',
      key: 'schedulePlan',
      width: 150,
      render: (v: string) => <Tag color="purple">{v}</Tag>
    },
    {
      title: '实际执行情况',
      dataIndex: 'actualExecution',
      key: 'actualExecution',
      ellipsis: true,
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{ color: '#595959' }}>{v}</span>
        </Tooltip>
      )
    },
    {
      title: '偏差率',
      dataIndex: 'deviation',
      key: 'deviation',
      width: 150,
      render: (v: number) => (
        <Space>
          <Progress
            percent={Math.min(v, 10)}
            size="small"
            showInfo={false}
            strokeColor={v > 5 ? '#ff4d4f' : v > 3 ? '#faad14' : '#52c41a'}
            style={{ width: 80 }}
          />
          <Tag
            color={v > 5 ? 'red' : v > 3 ? 'orange' : 'green'}
            icon={v > 3 ? <RiseOutlined /> : <CheckCircleOutlined />}
          >
            {v.toFixed(1)}%
          </Tag>
        </Space>
      ),
      sorter: (a: ReviewRecord, b: ReviewRecord) => a.deviation - b.deviation
    },
    {
      title: '偏差原因',
      dataIndex: 'deviationReason',
      key: 'deviationReason',
      width: 180,
      ellipsis: true,
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>{v}</span>
        </Tooltip>
      )
    },
    {
      title: '审批人',
      dataIndex: 'approver',
      key: 'approver',
      width: 90,
      render: (v: string) => (
        <Space size={4}>
          <Avatar size={20} style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
          <span>{v}</span>
        </Space>
      )
    },
    {
      title: '审批状态',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 100,
      render: (v: string) => (
        <Tag color={statusMap[v].color} icon={statusMap[v].icon}>
          {statusMap[v].text}
        </Tag>
      ),
      filters: [
        { text: '待审批', value: 'pending' },
        { text: '已通过', value: 'approved' },
        { text: '已驳回', value: 'rejected' }
      ],
      onFilter: (v, record) => record.approvalStatus === v
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: ReviewRecord) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Tooltip title="导出该日报告">
            <Button
              type="link"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => handleExportExcel(record)}
            >
              导出
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ]

  const formItems = [
    {
      key: 'cost',
      label: '费用对比分析',
      children: currentRecord ? (
        <Row gutter={16}>
          <Col span={12}>
            <Card size="small" style={{ background: '#f0f5ff', border: '1px solid #d6e4ff' }}>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>计划费用</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1677ff', marginTop: 4 }}>
                ¥{(260000 + currentRecord.deviation * 2000).toLocaleString()}
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ background: '#fff7e6', border: '1px solid #ffd591' }}>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>实际费用</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fa8c16', marginTop: 4 }}>
                ¥{(260000 + currentRecord.deviation * 5000).toLocaleString()}
              </div>
            </Card>
          </Col>
          <Col span={24} style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: currentRecord.deviation > 5 ? '#fff1f0' : '#f6ffed', borderRadius: 6 }}>
              <span>
                {currentRecord.deviation > 5 ? <FallOutlined style={{ color: '#ff4d4f' }} /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                <span style={{ marginLeft: 6, fontWeight: 500 }}>费用偏差</span>
              </span>
              <Tag color={currentRecord.deviation > 5 ? 'red' : 'green'} style={{ margin: 0 }}>
                +¥{(currentRecord.deviation * 3000).toLocaleString()} ({currentRecord.deviation}%)
              </Tag>
            </div>
          </Col>
        </Row>
      ) : <Empty />
    }
  ]

  const handleExportExcel = (record: ReviewRecord) => {
    const planCost = 260000 + record.deviation * 2000
    const actualCost = 260000 + record.deviation * 5000
    const diff = actualCost - planCost

    const header = [
      ['工厂多能源排程复盘报表'],
      ['生成时间', new Date().toLocaleString()],
      ['', ''],
      ['一、复盘基础信息'],
      ['复盘日期', record.date],
      ['排程方案', record.schedulePlan],
      ['创建时间', new Date().toLocaleString()],
      ['', ''],
      ['二、执行情况'],
      ['实际执行摘要', record.actualExecution],
      ['偏差率', `${record.deviation}%`],
      ['偏差原因分析', record.deviationReason],
      ['', ''],
      ['三、费用对比分析'],
      ['项目', '计划金额(¥)', '实际金额(¥)', '偏差(¥)'],
      ['总费用', planCost.toLocaleString(), actualCost.toLocaleString(), `+${diff.toLocaleString()}`],
      ['其中：电费', Math.round(planCost * 0.65).toLocaleString(), Math.round(actualCost * 0.65).toLocaleString(), `+${Math.round(diff * 0.65).toLocaleString()}`],
      ['其中：蒸汽费', Math.round(planCost * 0.2).toLocaleString(), Math.round(actualCost * 0.2).toLocaleString(), `+${Math.round(diff * 0.2).toLocaleString()}`],
      ['其中：空压费', Math.round(planCost * 0.08).toLocaleString(), Math.round(actualCost * 0.08).toLocaleString(), `+${Math.round(diff * 0.08).toLocaleString()}`],
      ['其中：需量费', Math.round(planCost * 0.07).toLocaleString(), Math.round(actualCost * 0.07).toLocaleString(), `+${Math.round(diff * 0.07).toLocaleString()}`],
      ['', ''],
      ['四、审批信息'],
      ['审批人', record.approver],
      ['审批状态', record.approvalStatus === 'approved' ? '已通过' : record.approvalStatus === 'rejected' ? '已驳回' : '待审批'],
      ['审批意见', record.approvalOpinion || '（无）'],
      ['', ''],
      ['五、备注', record.remarks || '（无）'],
      ['', ''],
      ['--- 报表结束 ---']
    ]

    const csvContent = header.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const fileName = `复盘报表_${record.date}_${Date.now()}.csv`

    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    message.success({
      content: (
        <div>
          Excel 报表导出成功！
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
            文件名: {fileName}<br />
            已保存至浏览器默认下载目录
          </div>
        </div>
      ),
      duration: 4
    })
  }

  const handleExportPDF = (record: ReviewRecord) => {
    const planCost = 260000 + record.deviation * 2000
    const actualCost = 260000 + record.deviation * 5000
    const diff = actualCost - planCost
    const diffPct = record.deviation

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>复盘报表 - ${record.date}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Microsoft YaHei', sans-serif; padding: 40px; color: #262626; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 2px solid #1677ff; padding-bottom: 20px; margin-bottom: 24px; }
  .header h1 { color: #1677ff; font-size: 28px; margin-bottom: 8px; }
  .header p { color: #8c8c8c; font-size: 13px; }
  .section { margin-bottom: 28px; }
  .section h2 { font-size: 16px; color: #1677ff; border-left: 4px solid #1677ff; padding-left: 10px; margin-bottom: 14px; background: #e6f4ff; padding: 8px 12px; border-radius: 0 4px 4px 0; }
  .info-grid { display: grid; grid-template-columns: 120px 1fr; gap: 10px; font-size: 14px; }
  .info-grid .label { color: #8c8c8c; }
  .info-grid .value { font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
  th, td { border: 1px solid #d9d9d9; padding: 10px 12px; text-align: left; }
  th { background: #fafafa; color: #595959; font-weight: 600; }
  .row-diff { color: ${diff > 0 ? '#ff4d4f' : '#52c41a'}; font-weight: 600; }
  .deviation-tag { display: inline-block; padding: 4px 12px; border-radius: 4px; background: ${diffPct > 5 ? '#fff1f0' : '#f6ffed'}; color: ${diffPct > 5 ? '#ff4d4f' : '#52c41a'}; font-weight: 600; border: 1px solid ${diffPct > 5 ? '#ffa39e' : '#b7eb8f'}; }
  .approval-box { padding: 16px; background: ${record.approvalStatus === 'approved' ? '#f6ffed' : record.approvalStatus === 'rejected' ? '#fff1f0' : '#fff7e6'}; border-radius: 6px; border-left: 4px solid ${record.approvalStatus === 'approved' ? '#52c41a' : record.approvalStatus === 'rejected' ? '#ff4d4f' : '#faad14'}; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px dashed #d9d9d9; text-align: center; color: #8c8c8c; font-size: 12px; }
  .stamp-box { float: right; width: 120px; height: 80px; border: 2px dashed ${record.approvalStatus === 'approved' ? '#52c41a' : '#d9d9d9'}; color: ${record.approvalStatus === 'approved' ? '#52c41a' : '#bfbfbf'}; display: flex; align-items: center; justify-content: center; font-weight: 700; transform: rotate(-10deg); border-radius: 50%; }
</style>
</head>
<body>
  <div class="header">
    <h1>📊 工厂多能源排程复盘报表</h1>
    <p>报告编号: ESR-${record.date}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')} | 生成时间: ${new Date().toLocaleString()}</p>
  </div>

  <div class="section">
    <h2>一、复盘基础信息</h2>
    <div style="display: flex; justify-content: space-between;">
      <div class="info-grid">
        <div class="label">复盘日期</div><div class="value">${record.date}</div>
        <div class="label">排程方案</div><div class="value">${record.schedulePlan}</div>
        <div class="label">审批人</div><div class="value">${record.approver}</div>
      </div>
      <div class="stamp-box">
        ${record.approvalStatus === 'approved' ? '✓ 已通过' : record.approvalStatus === 'rejected' ? '✗ 已驳回' : '待审批'}
      </div>
    </div>
  </div>

  <div class="section">
    <h2>二、执行情况与偏差分析</h2>
    <div class="info-grid" style="grid-template-columns: 140px 1fr; margin-bottom: 14px;">
      <div class="label">实际执行摘要</div>
      <div class="value">${record.actualExecution}</div>
      <div class="label">偏差率</div>
      <div class="value"><span class="deviation-tag">${diffPct}%</span></div>
      <div class="label">偏差原因分析</div>
      <div class="value">${record.deviationReason}</div>
    </div>
  </div>

  <div class="section">
    <h2>三、费用对比分析（单位：元）</h2>
    <table>
      <thead>
        <tr>
          <th>项目</th>
          <th style="text-align:right">计划金额</th>
          <th style="text-align:right">实际金额</th>
          <th style="text-align:right">偏差</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>电费</td>
          <td style="text-align:right">¥${Math.round(planCost * 0.65).toLocaleString()}</td>
          <td style="text-align:right">¥${Math.round(actualCost * 0.65).toLocaleString()}</td>
          <td class="row-diff" style="text-align:right">+¥${Math.round(diff * 0.65).toLocaleString()}</td>
        </tr>
        <tr>
          <td>蒸汽费</td>
          <td style="text-align:right">¥${Math.round(planCost * 0.2).toLocaleString()}</td>
          <td style="text-align:right">¥${Math.round(actualCost * 0.2).toLocaleString()}</td>
          <td class="row-diff" style="text-align:right">+¥${Math.round(diff * 0.2).toLocaleString()}</td>
        </tr>
        <tr>
          <td>空压费</td>
          <td style="text-align:right">¥${Math.round(planCost * 0.08).toLocaleString()}</td>
          <td style="text-align:right">¥${Math.round(actualCost * 0.08).toLocaleString()}</td>
          <td class="row-diff" style="text-align:right">+¥${Math.round(diff * 0.08).toLocaleString()}</td>
        </tr>
        <tr>
          <td>需量费</td>
          <td style="text-align:right">¥${Math.round(planCost * 0.07).toLocaleString()}</td>
          <td style="text-align:right">¥${Math.round(actualCost * 0.07).toLocaleString()}</td>
          <td class="row-diff" style="text-align:right">+¥${Math.round(diff * 0.07).toLocaleString()}</td>
        </tr>
        <tr style="background:#fafafa; font-weight:600">
          <td>合计</td>
          <td style="text-align:right">¥${planCost.toLocaleString()}</td>
          <td style="text-align:right">¥${actualCost.toLocaleString()}</td>
          <td class="row-diff" style="text-align:right">+¥${diff.toLocaleString()} (${diffPct}%)</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>四、审批记录</h2>
    <div class="approval-box">
      <div style="margin-bottom:8px;"><b>审批人：</b>${record.approver} &nbsp;&nbsp; <b>状态：</b>${record.approvalStatus === 'approved' ? '✅ 已通过' : record.approvalStatus === 'rejected' ? '❌ 已驳回' : '⏳ 待审批'}</div>
      <div><b>审批意见：</b>${record.approvalOpinion || '（暂无审批意见）'}</div>
    </div>
  </div>

  <div class="section">
    <h2>五、备注说明</h2>
    <div style="padding: 12px; background: #fafafa; border-radius: 4px; font-size: 14px; line-height: 1.8;">
      ${record.remarks || '（无）'}
    </div>
  </div>

  <div class="footer">
    <p>本报表由「工厂多能源排程工作台」自动生成 | ESR-v1.0</p>
    <p style="margin-top: 4px;">如有疑问请联系能源管理部门 · 本报告为系统导出版本</p>
  </div>
</body>
</html>`

    const fileName = `复盘报表_${record.date}_${Date.now()}.html`
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const printWindow = window.open(url, '_blank', 'width=900,height=1000')
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus()
          try { printWindow.print() } catch {}
        }, 800)
      }
    }

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    message.success({
      content: (
        <div>
          PDF 报表已生成！
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
            1. 已在新窗口打开（可 Ctrl+P 保存为PDF）<br />
            2. 同时下载了 HTML 版本: {fileName}<br />
            3. 浏览器默认下载目录
          </div>
        </div>
      ),
      duration: 5
    })

    setTimeout(() => URL.revokeObjectURL(url), 30000)
  }

  const handlePrint = (record: ReviewRecord) => {
    handleExportPDF(record)
  }

  const handleBatchExportExcel = () => {
    const header = [
      ['复盘日期', '排程方案', '实际执行摘要', '偏差率%', '偏差原因', '审批人', '审批状态', '审批意见', '备注'],
      ...reviewRecords.map((r) => [
        r.date,
        r.schedulePlan,
        r.actualExecution,
        r.deviation.toString(),
        r.deviationReason,
        r.approver,
        r.approvalStatus === 'approved' ? '已通过' : r.approvalStatus === 'rejected' ? '已驳回' : '待审批',
        r.approvalOpinion,
        r.remarks
      ])
    ]
    const csvContent = header.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const fileName = `复盘报表_批量_${new Date().toISOString().slice(0,10)}.csv`
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    message.success(`批量导出 ${reviewRecords.length} 条复盘记录成功！`)
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>📝 复盘窗</h2>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
            计划与实际偏差分析 · 原因记录 · 审批管理 · 报表导出
          </div>
        </div>
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleBatchExportExcel}>批量导出</Button>
          <Button icon={<PrinterOutlined />} onClick={() => reviewRecords[0] && handlePrint(reviewRecords[0])}>打印</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建复盘
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <div className="stat-card">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}><FileDoneOutlined /> 复盘记录总数</span>}
              value={reviewRecords.length}
              valueStyle={{ color: '#fff', fontSize: 26 }}
            />
          </div>
        </Col>
        <Col span={5}>
          <div className="stat-card orange">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}><ClockCircleOutlined /> 待审批</span>}
              value={pendingCount}
              valueStyle={{ color: '#fff', fontSize: 26 }}
              prefix={<ClockCircleOutlined />}
            />
          </div>
        </Col>
        <Col span={5}>
          <div className="stat-card green">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>📊 平均偏差率</span>}
              value={parseFloat(avgDeviation)}
              suffix="%"
              valueStyle={{ color: '#fff', fontSize: 26 }}
            />
          </div>
        </Col>
        <Col span={5}>
          <div className="stat-card cyan">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}><CheckCircleOutlined /> 审批通过率</span>}
              value={parseInt(approvedRate)}
              suffix="%"
              valueStyle={{ color: '#fff', fontSize: 26 }}
            />
          </div>
        </Col>
        <Col span={4}>
          <div className="stat-card purple">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>💰 累计节约</span>}
              value={186400}
              prefix="¥"
              valueStyle={{ color: '#fff', fontSize: 20 }}
            />
          </div>
        </Col>
      </Row>

      {pendingCount > 0 && (
        <AntAlert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={`有 ${pendingCount} 条复盘记录待审批`}
          description="请及时处理待审批记录，完成月度复盘工作"
          action={<Button size="small" type="primary">去审批</Button>}
        />
      )}

      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <SearchOutlined />
            <span>复盘记录列表</span>
          </Space>
        }
        extra={
          <Space size="small">
            <DatePicker
              size="small"
              placeholder="选择日期"
              onChange={(d) => setSearchDate(d ? d.format('YYYY-MM-DD') : null)}
              allowClear
              style={{ width: 150 }}
            />
            <Select
              size="small"
              style={{ width: 120 }}
              value={searchStatus}
              onChange={setSearchStatus}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'pending', label: '待审批' },
                { value: 'approved', label: '已通过' },
                { value: 'rejected', label: '已驳回' }
              ]}
            />
            <Button size="small" icon={<FileExcelOutlined />} onClick={() => filteredRecords[0] && handleExportExcel(filteredRecords[0])}>Excel</Button>
            <Button size="small" icon={<FilePdfOutlined />} onClick={() => filteredRecords[0] && handleExportPDF(filteredRecords[0])}>PDF</Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredRecords}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 6,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条复盘记录`
          }}
          locale={{ emptyText: <Empty description="暂无复盘记录，点击右上角新建" /> }}
        />
      </Card>

      <Card
        size="small"
        title={
          <Space>
            <BarChartOutlined />
            <span>近7日偏差率趋势分析</span>
          </Space>
        }
      >
        {filteredRecords.length > 0 ? (
          <ReactECharts option={deviationTrendOption} style={{ height: 320 }} />
        ) : (
          <Empty description="暂无数据" style={{ padding: 40 }} />
        )}
      </Card>

      <Modal
        title={editingRecord ? '编辑复盘记录' : '新建复盘记录'}
        open={addModalOpen}
        onOk={handleSubmit}
        onCancel={() => setAddModalOpen(false)}
        width={640}
        destroyOnClose
      >
        <Form form={addForm} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="date" label="复盘日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="deviation"
                label="偏差率 (%)"
                rules={[{ required: true }]}
                initialValue={0}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  step={0.1}
                  addonAfter="%"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="schedulePlan"
            label="排程方案"
            rules={[{ required: true, message: '请选择排程方案' }]}
          >
            <Select
              options={[
                { value: '方案A：基准方案' },
                { value: '方案B：移峰填谷' },
                { value: '方案C：储能优化' },
                { value: '方案D：全面优化' }
              ]}
              placeholder="选择当日采用的排程方案"
            />
          </Form.Item>
          <Form.Item
            name="actualExecution"
            label="实际执行情况"
            rules={[{ required: true, message: '请描述实际执行情况' }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="请描述当日实际执行情况，包括设备启停、负荷变化等"
              maxLength={200}
              showCount
            />
          </Form.Item>
          <Form.Item
            name="deviationReason"
            label="偏差原因分析"
            rules={[{ required: true, message: '请填写偏差原因' }]}
          >
            <Input.TextArea
              rows={2}
              placeholder="请分析与计划产生偏差的具体原因"
              maxLength={200}
              showCount
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="approver" label="审批人" initialValue="张工">
                <Select
                  options={[
                    { value: '张工' },
                    { value: '李总' },
                    { value: '王经理' },
                    { value: '赵总监' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="approvalStatus"
                label="审批状态"
                initialValue="pending"
              >
                <Select
                  options={Object.entries(statusMap).map(([k, v]) => ({
                    value: k,
                    label: (
                      <span>
                        {v.icon} {v.text}
                      </span>
                    )
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="approvalOpinion" label="审批意见">
            <Input.TextArea
              rows={2}
              placeholder="请输入审批意见（可选）"
              maxLength={200}
              showCount
            />
          </Form.Item>
          <Form.Item name="remarks" label="备注" initialValue="">
            <Input.TextArea
              rows={2}
              placeholder="其他备注信息（可选）"
              maxLength={200}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1677ff' }} />
            <span>复盘详情 - {currentRecord?.date}</span>
            {currentRecord && (
              <Tag color={statusMap[currentRecord.approvalStatus].color}>
                {statusMap[currentRecord.approvalStatus].icon} {statusMap[currentRecord.approvalStatus].text}
              </Tag>
            )}
          </Space>
        }
        width={720}
        open={detailDrawer}
        onClose={() => setDetailDrawer(false)}
        extra={
          <Space>
            <Button size="small" icon={<PrinterOutlined />}>打印</Button>
            <Button size="small" icon={<ExportOutlined />}>导出PDF</Button>
            {currentRecord && (
              <Button
                size="small"
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  handleEdit(currentRecord)
                  setDetailDrawer(false)
                }}
              >
                编辑
              </Button>
            )}
          </Space>
        }
      >
        {currentRecord && (
          <div>
            <Descriptions
              bordered
              size="small"
              column={1}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="复盘日期">
                <b>{currentRecord.date}</b>
              </Descriptions.Item>
              <Descriptions.Item label="排程方案">
                <Tag color="purple">{currentRecord.schedulePlan}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="实际执行">
                <span style={{ lineHeight: 1.8 }}>{currentRecord.actualExecution}</span>
              </Descriptions.Item>
              <Descriptions.Item label="偏差率">
                <Tag
                  color={currentRecord.deviation > 5 ? 'red' : currentRecord.deviation > 3 ? 'orange' : 'green'}
                >
                  {currentRecord.deviation}%
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="偏差原因">
                <span style={{ lineHeight: 1.8 }}>{currentRecord.deviationReason}</span>
              </Descriptions.Item>
              <Descriptions.Item label="审批人">
                <Space>
                  <Avatar size={24} style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />
                  <span>{currentRecord.approver}</span>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="审批意见">
                <div
                  style={{
                    padding: 10,
                    background: statusMap[currentRecord.approvalStatus].color === 'red' ? '#fff1f0' : '#f6ffed',
                    borderRadius: 6,
                    borderLeft: `4px solid ${statusMap[currentRecord.approvalStatus].color === 'red' ? '#ff4d4f' : '#52c41a'}`
                  }}
                >
                  <CommentOutlined style={{ marginRight: 6 }} />
                  {currentRecord.approvalOpinion || '（暂无审批意见）'}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="备注">
                {currentRecord.remarks || <span style={{ color: '#8c8c8c' }}>（无）</span>}
              </Descriptions.Item>
            </Descriptions>

            <Tabs
              size="small"
              items={[
                ...formItems,
                {
                  key: 'timeline',
                  label: (<span><HistoryOutlined /> 执行时间线</span>),
                  children: (
                    <Timeline
                      mode="left"
                      items={[
                        {
                          color: 'blue',
                          label: '06:00',
                          children: <div><b>方案下发</b><div style={{ color: '#8c8c8c', fontSize: 12 }}>排程方案推送至各车间执行</div></div>
                        },
                        {
                          color: 'green',
                          label: '07:00',
                          children: <div><b>设备启动</b><div style={{ color: '#8c8c8c', fontSize: 12 }}>锅炉、空压机、储能系统按计划启动</div></div>
                        },
                        {
                          color: 'green',
                          label: '08:00',
                          children: <div><b>早班开工</b><div style={{ color: '#8c8c8c', fontSize: 12 }}>产线设备全部就绪，正常生产</div></div>
                        },
                        {
                          color: 'orange',
                          label: '09:30',
                          children: <div><b>异常事件</b><div style={{ color: '#8c8c8c', fontSize: 12 }}>涂装流水线设备故障，切换维护</div></div>
                        },
                        {
                          color: 'green',
                          label: '14:00',
                          children: <div><b>储能放电</b><div style={{ color: '#8c8c8c', fontSize: 12 }}>尖峰时段开始储能放电削峰</div></div>
                        },
                        {
                          color: 'green',
                          label: '16:00',
                          children: <div><b>设备恢复</b><div style={{ color: '#8c8c8c', fontSize: 12 }}>涂装线检修完成，恢复运行</div></div>
                        },
                        {
                          color: 'gray',
                          label: '22:00',
                          children: <div><b>停产结算</b><div style={{ color: '#8c8c8c', fontSize: 12 }}>当日生产结束，统计能耗数据</div></div>
                        }
                      ]}
                    />
                  )
                },
                {
                  key: 'export',
                  label: (<span><ExportOutlined /> 报表导出</span>),
                  children: (
                    <div style={{ padding: 16, textAlign: 'center' }}>
                      <div style={{ marginBottom: 16 }}>选择导出格式：</div>
                      <Space>
                        <Button
                          type="primary"
                          size="large"
                          icon={<FileExcelOutlined />}
                          onClick={() => currentRecord && handleExportExcel(currentRecord)}
                        >
                          导出 Excel
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          icon={<FilePdfOutlined />}
                          style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}
                          onClick={() => currentRecord && handleExportPDF(currentRecord)}
                        >
                          导出 PDF
                        </Button>
                        <Button
                          size="large"
                          icon={<PrinterOutlined />}
                          onClick={() => currentRecord && handlePrint(currentRecord)}
                        >
                          打印报表
                        </Button>
                      </Space>
                      <Divider>报表内容</Divider>
                      <div style={{ textAlign: 'left', fontSize: 13, color: '#595959', lineHeight: 2 }}>
                        <div>✅ 当日排程方案与执行对比</div>
                        <div>✅ 24小时负荷曲线对比图</div>
                        <div>✅ 分时段能耗明细表</div>
                        <div>✅ 偏差率统计与原因分析</div>
                        <div>✅ 能源费用结算清单</div>
                        <div>✅ 审批记录与意见汇总</div>
                        <div>✅ 次日优化建议方案</div>
                      </div>
                    </div>
                  )
                }
              ]}
            />
          </div>
        )}
      </Drawer>
    </div>
  )
}
