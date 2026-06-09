import { Card, Progress, Row, Col, Statistic, Tag, Table, List, Space, Tooltip, Badge } from 'antd'
import { ThunderboltOutlined, FireOutlined, CloudOutlined, SaveOutlined, SafetyOutlined, AlertOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useEnergyStore } from '@/store'

const statusTextMap: Record<string, { text: string; color: string }> = {
  running: { text: '运行中', color: 'green' },
  idle: { text: '空闲', color: 'default' },
  maintenance: { text: '维护中', color: 'warning' },
  alarm: { text: '异常', color: 'red' }
}

export default function Overview() {
  const {
    currentLoad,
    demandRedLine,
    peakLoad,
    energyPrices,
    workshops,
    loadProfiles,
    currentDate
  } = useEnergyStore()

  const loadPercentage = (currentLoad / demandRedLine) * 100
  const peakPercentage = (peakLoad / demandRedLine) * 100
  const isOverload = loadPercentage > 90

  const loadOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['电力负荷', '蒸汽负荷', '压缩空气', '需量红线'],
      top: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 40,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: loadProfiles.map((p) => `${p.hour.toString().padStart(2, '0')}:00`),
      axisLabel: { interval: 1, fontSize: 10 }
    },
    yAxis: [
      {
        type: 'value',
        name: '电力(kW)/蒸汽(t/h)',
        position: 'left'
      },
      {
        type: 'value',
        name: '压缩空气(m³/min)',
        position: 'right'
      }
    ],
    series: [
      {
        name: '电力负荷',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: loadProfiles.map((p) => p.electricity),
        lineStyle: { width: 3, color: '#1677ff' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 119, 255, 0.3)' },
              { offset: 1, color: 'rgba(22, 119, 255, 0.05)' }
            ]
          }
        }
      },
      {
        name: '蒸汽负荷',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: loadProfiles.map((p) => p.steam),
        lineStyle: { width: 2, color: '#fa8c16' }
      },
      {
        name: '压缩空气',
        type: 'line',
        smooth: true,
        symbol: 'none',
        yAxisIndex: 1,
        data: loadProfiles.map((p) => p.compressedAir),
        lineStyle: { width: 2, color: '#52c41a' }
      },
      {
        name: '需量红线',
        type: 'line',
        symbol: 'none',
        data: Array(24).fill(demandRedLine),
        lineStyle: { width: 2, color: '#ff4d4f', type: 'dashed' },
        markPoint: {
          data: [{ type: 'max', name: '峰值' }],
          symbolSize: 50
        }
      }
    ]
  }

  const energyPieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, left: 'center' },
    series: [
      {
        name: '能源消耗占比',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' }
        },
        data: [
          { value: 62, name: '电力', itemStyle: { color: '#1677ff' } },
          { value: 22, name: '蒸汽', itemStyle: { color: '#fa8c16' } },
          { value: 11, name: '压缩空气', itemStyle: { color: '#52c41a' } },
          { value: 5, name: '储能净耗', itemStyle: { color: '#722ed1' } }
        ]
      }
    ]
  }

  const workshopColumns = [
    {
      title: '车间',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space>
          <span className={`workshop-status-dot ${record.status}`} />
          <span style={{ fontWeight: 500 }}>{text}</span>
          <Tag color={statusTextMap[record.status].color}>
            {statusTextMap[record.status].text}
          </Tag>
        </Space>
      )
    },
    {
      title: '当前负荷(kW)',
      dataIndex: 'load',
      key: 'load',
      width: 140,
      render: (v: number) => (
        <Statistic value={v} valueStyle={{ fontSize: 14, fontWeight: 600 }} />
      )
    },
    {
      title: '运行效率',
      dataIndex: 'efficiency',
      key: 'efficiency',
      width: 220,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          status={v < 80 ? 'exception' : v < 90 ? 'normal' : 'success'}
          strokeColor={v >= 90 ? '#52c41a' : v >= 80 ? '#faad14' : '#ff4d4f'}
        />
      )
    }
  ]

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>📊 总览窗</h2>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
            {currentDate} · 能源运行实时监控总览
          </div>
        </div>
        <Space>
          <Tag icon={<SafetyOutlined />} color="blue">
            需量红线: {demandRedLine} kW
          </Tag>
        </Space>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>当前总负荷</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>
                {currentLoad} <span style={{ fontSize: 16, opacity: 0.8 }}>kW</span>
              </div>
            </div>
            <ThunderboltOutlined style={{ fontSize: 32, opacity: 0.4 }} />
          </div>
          <Progress
            percent={Math.round(loadPercentage)}
            showInfo={false}
            strokeColor={isOverload ? '#ff4d4f' : '#fff'}
            trailColor="rgba(255,255,255,0.3)"
            style={{ marginTop: 12 }}
          />
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
            {isOverload ? (
              <Badge status="error" text="⚠ 接近需量红线" />
            ) : (
              <Badge status="success" text={`距红线 ${(demandRedLine - currentLoad).toFixed(0)} kW`} />
            )}
          </div>
        </div>

        <div className="stat-card orange">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>今日峰值负荷</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>
                {peakLoad} <span style={{ fontSize: 16, opacity: 0.8 }}>kW</span>
              </div>
            </div>
            <ArrowUpOutlined style={{ fontSize: 32, opacity: 0.4 }} />
          </div>
          <Progress
            percent={Math.round(peakPercentage)}
            showInfo={false}
            strokeColor="#fff"
            trailColor="rgba(255,255,255,0.3)"
            style={{ marginTop: 12 }}
          />
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
            峰值时间: 15:30 · 占红线 {peakPercentage.toFixed(1)}%
          </div>
        </div>

        <div className="stat-card green">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>今日峰谷节约</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>
                ¥47,700
              </div>
            </div>
            <ArrowDownOutlined style={{ fontSize: 32, opacity: 0.4 }} />
          </div>
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.9, lineHeight: 1.8 }}>
            <div>储能放电: 3,200 kWh</div>
            <div>需量管控: 节省罚金 ¥9,000</div>
          </div>
        </div>

        <div className="stat-card purple">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>运行车间</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>
                {workshops.filter((w) => w.status === 'running').length}
                <span style={{ fontSize: 16, opacity: 0.8 }}> / {workshops.length}</span>
              </div>
            </div>
            <AlertOutlined style={{ fontSize: 32, opacity: 0.4 }} />
          </div>
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.9 }}>
            <Space size={8}>
              <Tag color="success" style={{ margin: 0 }}>
                运行 {workshops.filter((w) => w.status === 'running').length}
              </Tag>
              <Tag color="red" style={{ margin: 0 }}>
                告警 {workshops.filter((w) => w.status === 'alarm').length}
              </Tag>
              <Tag color="warning" style={{ margin: 0 }}>
                维护 {workshops.filter((w) => w.status === 'maintenance').length}
              </Tag>
            </Space>
          </div>
        </div>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card title="💰 能源单价" className="card-margin" size="small">
            <List
              size="small"
              dataSource={[
                { icon: <ThunderboltOutlined style={{ color: '#1677ff' }} />, name: '尖峰电价', value: `¥${energyPrices.electricity.peak}/kWh`, tag: '08:00-11:00 18:00-21:00' },
                { icon: <ThunderboltOutlined style={{ color: '#fa8c16' }} />, name: '平段电价', value: `¥${energyPrices.electricity.flat}/kWh`, tag: '11:00-18:00' },
                { icon: <ThunderboltOutlined style={{ color: '#52c41a' }} />, name: '谷段电价', value: `¥${energyPrices.electricity.valley}/kWh`, tag: '21:00-次日08:00' },
                { icon: <FireOutlined style={{ color: '#fa541c' }} />, name: '蒸汽', value: `¥${energyPrices.steam}/吨`, tag: '自产为主' },
                { icon: <CloudOutlined style={{ color: '#13c2c2' }} />, name: '压缩空气', value: `¥${energyPrices.compressedAir}/m³`, tag: '0.7MPa标准' },
                { icon: <SaveOutlined style={{ color: '#722ed1' }} />, name: '储能效率', value: `${(1 - energyPrices.storage.discharge / energyPrices.storage.charge * 0.8) * 100}%综合`, tag: '充放循环' }
              ]}
              renderItem={(item) => (
                <List.Item>
                  <Space style={{ width: '100%' }} size={8}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>{item.tag}</div>
                    </div>
                    <div style={{ fontWeight: 600, color: '#1677ff', fontSize: 13 }}>
                      {item.value}
                    </div>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col span={12}>
          <Card title="📈 24小时多能源负荷曲线" size="small">
            <ReactECharts option={loadOption} style={{ height: 320 }} />
          </Card>
        </Col>

        <Col span={6}>
          <Card title="🥧 能源消耗结构" size="small" style={{ marginBottom: 16 }}>
            <ReactECharts option={energyPieOption} style={{ height: 200 }} />
          </Card>
          <Card title="🌡️ 今日关键指标" size="small">
            <Row gutter={8}>
              <Col span={12} style={{ textAlign: 'center', padding: 8, borderRight: '1px solid #f0f0f0' }}>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>综合能效</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a', marginTop: 4 }}>89.6%</div>
                <div style={{ fontSize: 10, color: '#52c41a' }}>↑ 2.3%</div>
              </Col>
              <Col span={12} style={{ textAlign: 'center', padding: 8 }}>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>碳排放</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#722ed1', marginTop: 4 }}>42.8t</div>
                <div style={{ fontSize: 10, color: '#ff4d4f' }}>↓ 5.7%</div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Card title="🏭 车间运行状态" size="small">
        <Table
          columns={workshopColumns}
          dataSource={workshops}
          rowKey="id"
          size="small"
          pagination={false}
        />
      </Card>
    </div>
  )
}
