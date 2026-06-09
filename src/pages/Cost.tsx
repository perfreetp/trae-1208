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
  Radio,
  Tooltip,
  Tabs,
  Divider,
  Empty,
  Badge
} from 'antd'
import {
  DollarOutlined,
  ThunderboltOutlined,
  FireOutlined,
  CloudOutlined,
  EnvironmentOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  FallOutlined,
  ArrowDownOutlined,
  BarChartOutlined,
  PieChartOutlined,
  ExportOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useEnergyStore } from '@/store'
import type { CostPlan } from '@/types'

const riskMap: Record<string, { color: string; text: string; level: number }> = {
  low: { color: 'green', text: '低风险', level: 1 },
  medium: { color: 'orange', text: '中风险', level: 2 },
  high: { color: 'red', text: '高风险', level: 3 }
}

export default function Cost() {
  const { costPlans, selectedPlanId, selectPlan } = useEnergyStore()
  const [compareMode, setCompareMode] = useState<'single' | 'compare'>('compare')
  const [compareIds, setCompareIds] = useState<string[]>(['p1', 'p3', 'p4'])

  const selectedPlan = costPlans.find((p) => p.id === selectedPlanId) || costPlans[0]
  const basePlan = costPlans[0]

  const barOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['电费', '蒸汽费', '空压费', '需量费'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: costPlans.map((p) => p.name.replace(/方案.：/, ''))
    },
    yAxis: { type: 'value', name: '费用 (元)', axisLabel: { formatter: '{value}' } },
    series: [
      {
        name: '电费',
        type: 'bar',
        stack: 'total',
        data: costPlans.map((p) => p.electricityCost),
        itemStyle: { color: '#1677ff', borderRadius: [0, 0, 0, 0] },
        barWidth: 36
      },
      {
        name: '蒸汽费',
        type: 'bar',
        stack: 'total',
        data: costPlans.map((p) => p.steamCost),
        itemStyle: { color: '#fa8c16' }
      },
      {
        name: '空压费',
        type: 'bar',
        stack: 'total',
        data: costPlans.map((p) => p.airCost),
        itemStyle: { color: '#52c41a' }
      },
      {
        name: '需量费',
        type: 'bar',
        stack: 'total',
        data: costPlans.map((p) => p.demandCharge),
        itemStyle: { color: '#722ed1', borderRadius: [4, 4, 0, 0] },
        label: {
          show: true, position: 'top', formatter: (params: any) => {
            const total = costPlans[params.dataIndex].totalCost
            return `¥${total.toLocaleString()}`
          },
          fontSize: 11, fontWeight: 600
        }
      }
    ]
  }

  const savingOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['峰谷节约', '总节约率'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: costPlans.map((p) => p.name.replace(/方案.：/, ''))
    },
    yAxis: [
      { type: 'value', name: '节约金额 (元)' },
      { type: 'value', name: '节约率 (%)', max: 25 }
    ],
    series: [
      {
        name: '峰谷节约',
        type: 'bar',
        data: costPlans.map((p) => p.peakSaving),
        itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] },
        barWidth: 40,
        label: { show: true, position: 'top', formatter: '¥{c}', fontSize: 11, fontWeight: 600 }
      },
      {
        name: '总节约率',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 10,
        data: costPlans.map((p) => ((basePlan.totalCost - p.totalCost) / basePlan.totalCost * 100).toFixed(1)),
        lineStyle: { width: 3, color: '#fa8c16' },
        itemStyle: { color: '#fa8c16' },
        label: { show: true, formatter: '{c}%', fontSize: 11, fontWeight: 600 }
      }
    ]
  }

  const carbonRiskOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['碳排放 (tCO2e)', '风险等级'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: costPlans.map((p) => p.name.replace(/方案.：/, ''))
    },
    yAxis: [
      { type: 'value', name: '碳排放 (吨)' },
      { type: 'value', name: '风险评分', max: 10 }
    ],
    series: [
      {
        name: '碳排放 (tCO2e)',
        type: 'bar',
        data: costPlans.map((p) => p.carbon),
        itemStyle: {
          color: (params: any) => {
            const colors = ['#ff7875', '#ffa940', '#95de64', '#69b1ff']
            return colors[params.dataIndex] || '#1677ff'
          },
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: 40,
        label: { show: true, position: 'top', formatter: '{c}t', fontSize: 11, fontWeight: 600 }
      },
      {
        name: '风险等级',
        type: 'line',
        yAxisIndex: 1,
        step: 'middle',
        symbol: 'diamond',
        symbolSize: 12,
        data: costPlans.map((p) => riskMap[p.risk].level * 3),
        lineStyle: { width: 3, color: '#eb2f96' },
        itemStyle: { color: '#eb2f96' }
      }
    ]
  }

  const radarOption = {
    tooltip: {},
    legend: {
      data: compareIds.map((id) => costPlans.find((p) => p.id === id)?.name || ''),
      bottom: 0
    },
    radar: {
      indicator: [
        { name: '成本优势', max: 100 },
        { name: '碳排友好', max: 100 },
        { name: '风险可控', max: 100 },
        { name: '峰谷节约', max: 100 },
        { name: '产能保障', max: 100 },
        { name: '实施难度', max: 100 }
      ]
    },
    series: [{
      type: 'radar',
      data: compareIds.map((id) => {
        const p = costPlans.find((x) => x.id === id)!
        const saving = (1 - p.totalCost / basePlan.totalCost) * 100
        return {
          value: [
            saving,
            ((basePlan.carbon - p.carbon) / basePlan.carbon * 50 + 50),
            p.risk === 'low' ? 90 : p.risk === 'medium' ? 60 : 30,
            (p.peakSaving / basePlan.totalCost * 100 + 20),
            p.risk === 'low' ? 95 : p.risk === 'medium' ? 80 : 65,
            p.id === 'p1' ? 95 : p.id === 'p2' ? 85 : p.id === 'p3' ? 90 : 75
          ],
          name: p.name,
          areaStyle: { opacity: 0.2 }
        }
      })
    }]
  }

  const columns = [
    {
      title: '方案名称',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, record: CostPlan) => (
        <Space>
          {record.id === selectedPlanId && <Badge status="processing" color="#1677ff" />}
          <span style={{ fontWeight: record.id === selectedPlanId ? 600 : 400 }}>{v}</span>
          {record.id === selectedPlanId && <Tag color="blue">当前选中</Tag>}
        </Space>
      )
    },
    {
      title: '总费用',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      render: (v: number) => (
        <span style={{ fontWeight: 700, color: '#1677ff', fontSize: 15 }}>
          ¥{v.toLocaleString()}
        </span>
      )
    },
    {
      title: '对比基准',
      key: 'diff',
      width: 120,
      render: (_: any, record: CostPlan) => {
        const diff = basePlan.totalCost - record.totalCost
        const rate = (diff / basePlan.totalCost * 100).toFixed(1)
        if (diff === 0) return <Tag color="default">基准方案</Tag>
        return (
          <Tag color={diff > 0 ? 'green' : 'red'} icon={diff > 0 ? <ArrowDownOutlined /> : <RiseOutlined />}>
            {diff > 0 ? '节约' : '增加'} ¥{Math.abs(diff).toLocaleString()} ({rate}%)
          </Tag>
        )
      }
    },
    {
      title: '需量费',
      dataIndex: 'demandCharge',
      key: 'demandCharge',
      width: 100,
      render: (v: number) => `¥${v.toLocaleString()}`
    },
    {
      title: '峰谷节约',
      dataIndex: 'peakSaving',
      key: 'peakSaving',
      width: 110,
      render: (v: number) => (
        <span style={{ color: '#52c41a', fontWeight: 500 }}>¥{v.toLocaleString()}</span>
      )
    },
    {
      title: '碳排放',
      dataIndex: 'carbon',
      key: 'carbon',
      width: 90,
      render: (v: number) => <span>{v} tCO₂e</span>
    },
    {
      title: '风险等级',
      dataIndex: 'risk',
      key: 'risk',
      width: 100,
      render: (v: string) => <Tag color={riskMap[v].color}>{riskMap[v].text}</Tag>
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: CostPlan) => (
        <Space size="small">
          <Button
            type={record.id === selectedPlanId ? 'primary' : 'default'}
            size="small"
            onClick={() => selectPlan(record.id)}
            icon={<CheckCircleOutlined />}
          >
            {record.id === selectedPlanId ? '已选用' : '选用'}
          </Button>
          {compareMode === 'compare' && (
            <Checkbox
              checked={compareIds.includes(record.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setCompareIds([...compareIds, record.id].slice(-3))
                } else {
                  setCompareIds(compareIds.filter((id) => id !== record.id))
                }
              }}
            />
          )}
        </Space>
      )
    }
  ]

  function Checkbox({ checked, onChange }: { checked: boolean; onChange: (e: any) => void }) {
    return (
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 16, height: 16, cursor: 'pointer' }}
      />
    )
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>💰 成本窗</h2>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
            多方案费用对比 · 碳排放评估 · 风险分析 · 峰谷收益测算
          </div>
        </div>
        <Space>
          <Radio.Group
            value={compareMode}
            onChange={(e) => setCompareMode(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="single">单方案详情</Radio.Button>
            <Radio.Button value="compare">多方案对比</Radio.Button>
          </Radio.Group>
          <Button icon={<ExportOutlined />}>导出分析报告</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <div className="stat-card">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}><DollarOutlined /> 当前方案总费用</span>}
              value={selectedPlan?.totalCost || 0}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#fff', fontSize: 22 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
              <Tag color="white" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff' }}>
                {selectedPlan?.name}
              </Tag>
            </div>
          </div>
        </Col>
        <Col span={5}>
          <div className="stat-card green">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}><FallOutlined /> 对比基准节约</span>}
              value={selectedPlan ? basePlan.totalCost - selectedPlan.totalCost : 0}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#fff', fontSize: 22 }}
              suffix={
                <span style={{ fontSize: 12, opacity: 0.9, marginLeft: 4 }}>
                  ({selectedPlan ? ((basePlan.totalCost - selectedPlan.totalCost) / basePlan.totalCost * 100).toFixed(1) : 0}%)
                </span>
              }
            />
          </div>
        </Col>
        <Col span={5}>
          <div className="stat-card cyan">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}><EnvironmentOutlined /> 碳排放</span>}
              value={selectedPlan?.carbon || 0}
              suffix="tCO₂e"
              valueStyle={{ color: '#fff', fontSize: 22 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
              <Progress
                percent={85}
                size="small"
                showInfo={false}
                strokeColor="#fff"
                trailColor="rgba(255,255,255,0.25)"
              />
              <span>达成减排目标 85%</span>
            </div>
          </div>
        </Col>
        <Col span={5}>
          <div className="stat-card orange">
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}><ThunderboltOutlined /> 峰谷节约</span>}
              value={selectedPlan?.peakSaving || 0}
              prefix="¥"
              precision={0}
              valueStyle={{ color: '#fff', fontSize: 22 }}
            />
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
              储能放电 3,200kWh · 移峰填谷 180kW
            </div>
          </div>
        </Col>
        <Col span={4}>
          <div className="stat-card purple">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.85 }}><SafetyOutlined /> 风险等级</div>
                <Tag color="white" style={{ background: selectedPlan ? (riskMap[selectedPlan.risk].color === 'green' ? 'rgba(82,196,26,0.7)' : riskMap[selectedPlan.risk].color === 'orange' ? 'rgba(250,140,22,0.7)' : 'rgba(255,77,79,0.7)') : 'rgba(255,255,255,0.3)', border: 'none', color: '#fff', marginTop: 10, fontSize: 15, fontWeight: 700 }}>
                  {selectedPlan ? riskMap[selectedPlan.risk].text : '-'}
                </Tag>
              </div>
              <SafetyOutlined style={{ fontSize: 36, opacity: 0.4 }} />
            </div>
          </div>
        </Col>
      </Row>

      <Card
        size="small"
        style={{ marginBottom: 16 }}
        title={
          <Space>
            <BarChartOutlined />
            <span>方案综合对比表</span>
            {compareMode === 'compare' && (
              <Tooltip title="勾选后将在下方雷达图中对比（最多3个）">
                <Tag color="blue">已选 {compareIds.length}/3</Tag>
              </Tooltip>
            )}
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={costPlans}
          rowKey="id"
          size="small"
          pagination={false}
          rowClassName={(r) => r.id === selectedPlanId ? 'ant-table-row-selected' : ''}
        />
      </Card>

      <Row gutter={16}>
        <Col span={12}>
          <Card
            size="small"
            title={<span><BarChartOutlined /> 费用构成对比</span>}
            style={{ marginBottom: 16 }}
          >
            <ReactECharts option={barOption} style={{ height: 300 }} />
          </Card>
          <Card
            size="small"
            title={<span><EnvironmentOutlined /> 碳排放 & 风险评估</span>}
          >
            <ReactECharts option={carbonRiskOption} style={{ height: 300 }} />
          </Card>
        </Col>

        <Col span={12}>
          <Card
            size="small"
            title={<span><PieChartOutlined /> 节约收益分析</span>}
            style={{ marginBottom: 16 }}
          >
            <ReactECharts option={savingOption} style={{ height: 300 }} />
          </Card>
          <Card
            size="small"
            title={
              <Space>
                <span>🧭 方案多维评估雷达图</span>
                <Tag color="purple">{compareIds.map((id) => costPlans.find((p) => p.id === id)?.name.replace(/方案.：/, '')).join(' vs ')}</Tag>
              </Space>
            }
          >
            {compareIds.length >= 2 ? (
              <ReactECharts option={radarOption} style={{ height: 300 }} />
            ) : (
              <Empty description="请至少勾选2个方案进行对比" style={{ padding: 40 }} />
            )}
          </Card>
        </Col>
      </Row>

      <Divider style={{ margin: '16px 0' }} />

      <Card size="small" title={<span><CheckCircleOutlined /> 推荐方案评估说明</span>}>
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ padding: 16, borderRadius: 10, background: 'linear-gradient(135deg, #e6f4ff, #bae0ff)' }}>
              <Space style={{ marginBottom: 8 }}>
                <Tag color="blue">推荐指数 ⭐⭐⭐⭐⭐</Tag>
              </Space>
              <h3 style={{ marginBottom: 8 }}>方案C：储能优化</h3>
              <div style={{ fontSize: 13, color: '#595959', lineHeight: 1.8 }}>
                <div>• 总费用：¥238,800（最低之一）</div>
                <div>• 峰谷节约：¥47,700（效果显著）</div>
                <div>• 碳排放：42.8tCO₂e（较低）</div>
                <div>• 风险等级：<Tag color="green">低风险</Tag></div>
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ fontSize: 12, color: '#0958d9' }}>
                综合评分：<b style={{ fontSize: 18 }}>92.5</b> / 100
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ padding: 16, borderRadius: 10, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <h4 style={{ color: '#389e0d', marginBottom: 10 }}>✅ 优势分析</h4>
              <div style={{ fontSize: 13, color: '#595959', lineHeight: 2 }}>
                <div>• 利用谷段电价充电节约50%电费</div>
                <div>• 尖峰时段削峰降低需量费55%</div>
                <div>• 不改变生产节拍，风险可控</div>
                <div>• 投资回收期约2.1年</div>
                <div>• 碳排放降低11.7%，达标绿证</div>
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ padding: 16, borderRadius: 10, background: '#fff7e6', border: '1px solid #ffd591' }}>
              <h4 style={{ color: '#d46b08', marginBottom: 10 }}>⚠️ 注意事项</h4>
              <div style={{ fontSize: 13, color: '#595959', lineHeight: 2 }}>
                <div>• 储能容量建议预留10%冗余</div>
                <div>• 极端高温天气需调整放电策略</div>
                <div>• 每月进行电池健康度检测</div>
                <div>• 需配备双回路电源保障</div>
                <div>• 制定应急预案应对突发停电</div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  )
}
