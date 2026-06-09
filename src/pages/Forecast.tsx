import { useState, useMemo, useEffect } from 'react'
import {
  Card,
  Form,
  InputNumber,
  Select,
  Button,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Slider,
  Tabs,
  DatePicker,
  Alert
} from 'antd'
import {
  RiseOutlined,
  ThunderboltOutlined,
  FireOutlined,
  CloudOutlined,
  CloudServerOutlined,
  ExperimentOutlined,
  BarChartOutlined,
  CloudSyncOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { useEnergyStore } from '@/store'

export default function Forecast() {
  const {
    forecastFactors,
    setForecastFactors,
    loadProfiles,
    demandRedLine,
    jumpFromForecastToSchedule,
    setForecastHighRisk
  } = useEnergyStore()
  const [form] = Form.useForm()
  const [forecastDate, setForecastDate] = useState<dayjs.Dayjs | null>(dayjs().add(1, 'day'))

  const weatherOptions = [
    { value: '晴', label: '☀️ 晴' },
    { value: '多云', label: '⛅ 多云' },
    { value: '阴', label: '☁️ 阴' },
    { value: '小雨', label: '🌧️ 小雨' },
    { value: '中雨', label: '🌧️ 中雨' },
    { value: '雷阵雨', label: '⛈️ 雷阵雨' },
    { value: '雪', label: '❄️ 雪' }
  ]

  const shiftOptions = [
    { value: '正常三班', label: '正常三班（24h）' },
    { value: '双班制', label: '双班制（16h）' },
    { value: '单班制', label: '单班制（8h）' },
    { value: '赶工模式', label: '赶工模式（加班）' }
  ]

  const weatherFactor = useMemo(() => {
    const { weatherCondition, temperature, humidity } = forecastFactors
    let factor = 1.0
    if (weatherCondition === '晴' && temperature >= 30) factor += 0.08
    if (weatherCondition === '多云') factor += 0.02
    if (weatherCondition === '小雨') factor += 0.03
    if (weatherCondition === '中雨' || weatherCondition === '雷阵雨') factor += 0.06
    if (weatherCondition === '雪') factor += 0.12
    if (temperature >= 35) factor += 0.06
    if (temperature <= 5) factor += 0.09
    if (humidity >= 80) factor += 0.03
    return factor
  }, [forecastFactors])

  const productionFactor = useMemo(() => {
    const base = 12500
    return forecastFactors.historicalProduction / base
  }, [forecastFactors.historicalProduction])

  const shiftFactor = useMemo(() => {
    const map: Record<string, number> = {
      '正常三班': 1.0,
      '双班制': 0.75,
      '单班制': 0.45,
      '赶工模式': 1.25
    }
    return map[forecastFactors.shiftArrangement] || 1.0
  }, [forecastFactors.shiftArrangement])

  const forecastProfiles = useMemo(() => {
    const combinedFactor = weatherFactor * productionFactor * shiftFactor
    return loadProfiles.map((p) => ({
      hour: p.hour,
      electricity: Math.round(p.electricity * combinedFactor),
      steam: Math.round(p.steam * combinedFactor),
      compressedAir: Math.round(p.compressedAir * combinedFactor)
    }))
  }, [loadProfiles, weatherFactor, productionFactor, shiftFactor])

  const totalElectricity = forecastProfiles.reduce((s, p) => s + p.electricity, 0)
  const totalSteam = forecastProfiles.reduce((s, p) => s + p.steam, 0)
  const totalAir = forecastProfiles.reduce((s, p) => s + p.compressedAir, 0)
  const peakForecast = Math.max(...forecastProfiles.map((p) => p.electricity))
  const peakHour = forecastProfiles.find((p) => p.electricity === peakForecast)?.hour

  const highRiskHours = forecastProfiles
    .filter((p) => p.electricity > demandRedLine * 0.9)
    .map((p) => p.hour)
    .sort((a, b) => a - b)

  useEffect(() => {
    if (highRiskHours.length > 0) setForecastHighRisk(highRiskHours)
  }, [highRiskHours, setForecastHighRisk])

  const compareOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['历史平均', '预测值', '需量红线'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: forecastProfiles.map((p) => `${p.hour.toString().padStart(2, '0')}:00`),
      axisLabel: { interval: 1, fontSize: 10 }
    },
    yAxis: { type: 'value', name: '电力负荷 (kW)' },
    series: [
      {
        name: '历史平均',
        type: 'line',
        data: loadProfiles.map((p) => p.electricity),
        lineStyle: { width: 2, type: 'dashed', color: '#8c8c8c' },
        symbol: 'none',
        itemStyle: { color: '#8c8c8c' }
      },
      {
        name: '预测值',
        type: 'line',
        data: forecastProfiles.map((p) => p.electricity),
        lineStyle: { width: 3, color: '#1677ff' },
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#1677ff' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 119, 255, 0.35)' },
              { offset: 1, color: 'rgba(22, 119, 255, 0.05)' }
            ]
          }
        }
      },
      {
        name: '需量红线',
        type: 'line',
        data: Array(24).fill(demandRedLine),
        lineStyle: { width: 2, color: '#ff4d4f', type: 'dashed' },
        symbol: 'none'
      }
    ]
  }

  const multiEnergyOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['电力', '蒸汽', '压缩空气'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: forecastProfiles.map((p) => `${p.hour.toString().padStart(2, '0')}时`),
      axisLabel: { interval: 2, fontSize: 11 }
    },
    yAxis: { type: 'value', name: '预测消耗量' },
    series: [
      {
        name: '电力',
        type: 'bar',
        data: forecastProfiles.map((p) => p.electricity),
        itemStyle: { color: '#1677ff', borderRadius: [3, 3, 0, 0] }
      },
      {
        name: '蒸汽',
        type: 'bar',
        data: forecastProfiles.map((p) => p.steam),
        itemStyle: { color: '#fa8c16', borderRadius: [3, 3, 0, 0] }
      },
      {
        name: '压缩空气',
        type: 'bar',
        data: forecastProfiles.map((p) => p.compressedAir),
        itemStyle: { color: '#52c41a', borderRadius: [3, 3, 0, 0] }
      }
    ]
  }

  const historicalTrendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['近7天', '近30天', '去年同期'], top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      boundaryGap: false
    },
    yAxis: { type: 'value', name: '日用电量 (MWh)' },
    series: [
      {
        name: '近7天',
        type: 'line',
        smooth: true,
        data: [38.2, 41.5, 40.8, 43.6, 45.2, 32.1, 28.5],
        lineStyle: { width: 3, color: '#1677ff' },
        areaStyle: { color: 'rgba(22, 119, 255, 0.15)' },
        symbol: 'circle',
        symbolSize: 8
      },
      {
        name: '近30天',
        type: 'line',
        smooth: true,
        data: [36.5, 39.8, 40.2, 41.5, 42.8, 30.5, 27.2],
        lineStyle: { width: 2, color: '#52c41a' },
        symbol: 'none'
      },
      {
        name: '去年同期',
        type: 'line',
        smooth: true,
        data: [34.2, 37.1, 36.5, 39.0, 41.3, 29.5, 25.8],
        lineStyle: { width: 2, color: '#8c8c8c', type: 'dashed' },
        symbol: 'none'
      }
    ]
  }

  const forecastTabItems = [
    {
      key: 'electricity',
      label: <span><ThunderboltOutlined /> 电力负荷预测</span>,
      children: (
        <ReactECharts option={compareOption} style={{ height: 380 }} />
      )
    },
    {
      key: 'multi',
      label: <span><BarChartOutlined /> 多能源综合预测</span>,
      children: (
        <ReactECharts option={multiEnergyOption} style={{ height: 380 }} />
      )
    },
    {
      key: 'history',
      label: <span><CloudSyncOutlined /> 历史趋势对比</span>,
      children: (
        <ReactECharts option={historicalTrendOption} style={{ height: 380 }} />
      )
    }
  ]

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>🔮 预测窗</h2>
        <div style={{ color: '#8c8c8c', fontSize: 13, marginTop: 4 }}>
          基于历史产量、天气、班次智能估算多能源负荷曲线
        </div>
      </div>

      <Row gutter={16}>
        <Col span={7}>
          <Card
            title={<span><ExperimentOutlined /> 预测参数配置</span>}
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Form
              form={form}
              layout="vertical"
              size="small"
              initialValues={{
                historicalProduction: forecastFactors.historicalProduction,
                temperature: forecastFactors.temperature,
                humidity: forecastFactors.humidity,
                weatherCondition: forecastFactors.weatherCondition,
                shiftArrangement: forecastFactors.shiftArrangement,
                forecastDate: forecastDate
              }}
              onValuesChange={(changed) => {
                if ('forecastDate' in changed) {
                  setForecastDate(changed.forecastDate)
                  return
                }
                setForecastFactors(changed)
              }}
            >
              <Form.Item name="forecastDate" label="预测日期" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" disabledDate={(d) => d.isBefore(dayjs(), 'day')} />
              </Form.Item>

              <Form.Item name="weatherCondition" label="天气状况" rules={[{ required: true }]}>
                <Select options={weatherOptions} />
              </Form.Item>

              <Form.Item name="temperature" label={`最高温度: ${forecastFactors.temperature}°C`}>
                <Slider min={-10} max={45} />
              </Form.Item>

              <Form.Item name="humidity" label={`相对湿度: ${forecastFactors.humidity}%`}>
                <Slider min={0} max={100} />
              </Form.Item>

              <Form.Item
                name="historicalProduction"
                label="历史产量参考 (件/日)"
                rules={[{ required: true }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1000}
                  max={50000}
                  step={100}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>

              <Form.Item name="shiftArrangement" label="班次安排" rules={[{ required: true }]}>
                <Select options={shiftOptions} />
              </Form.Item>
            </Form>
          </Card>

          <Card
            title={<span><RiseOutlined /> 预测影响因子</span>}
            size="small"
            style={{ marginBottom: 16 }}
          >
            <Row gutter={[8, 12]}>
              <Col span={12}>
                <div style={{ padding: 8, background: '#f6ffed', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>天气因子</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a', marginTop: 4 }}>
                    ×{(weatherFactor * 100 - 100).toFixed(1)}%
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: 8, background: '#e6f4ff', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>产量因子</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1677ff', marginTop: 4 }}>
                    ×{((productionFactor - 1) * 100).toFixed(1)}%
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: 8, background: '#f9f0ff', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>班次因子</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#722ed1', marginTop: 4 }}>
                    ×{((shiftFactor - 1) * 100).toFixed(1)}%
                  </div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ padding: 8, background: '#fff2e8', borderRadius: 6, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>综合倍率</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#fa8c16', marginTop: 4 }}>
                    ×{((weatherFactor * productionFactor * shiftFactor - 1) * 100).toFixed(1)}%
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          <Card title="🎯 预测结果汇总" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Row gutter={8}>
                <Col span={12}>
                  <Statistic
                    title={<span><ThunderboltOutlined style={{ color: '#1677ff' }} /> 日用电预测</span>}
                    value={totalElectricity}
                    suffix="kWh"
                    precision={0}
                    valueStyle={{ fontSize: 16, color: '#1677ff' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span><FireOutlined style={{ color: '#fa8c16' }} /> 蒸汽预测</span>}
                    value={totalSteam}
                    suffix="t"
                    valueStyle={{ fontSize: 16, color: '#fa8c16' }}
                  />
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <Statistic
                    title={<span><CloudOutlined style={{ color: '#52c41a' }} /> 压缩空气</span>}
                    value={totalAir}
                    suffix="m³"
                    valueStyle={{ fontSize: 16, color: '#52c41a' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span><CloudServerOutlined style={{ color: '#722ed1' }} /> 峰值负荷</span>}
                    value={peakForecast}
                    suffix="kW"
                    valueStyle={{ fontSize: 16, color: peakForecast > demandRedLine ? '#ff4d4f' : '#722ed1' }}
                  />
                </Col>
              </Row>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                预计峰值时间: <Tag color={peakForecast > demandRedLine ? 'red' : 'blue'}>
                  {peakHour?.toString().padStart(2, '0')}:00
                </Tag>
              </div>
            </Space>
          </Card>
        </Col>

        <Col span={17}>
          {peakForecast > demandRedLine && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              message={
                <Space>
                  <span>⚠️ 预测峰值负荷 <b>{peakForecast}kW</b> 超过需量红线 <b>{demandRedLine}kW</b>，超 {(peakForecast - demandRedLine).toFixed(0)}kW</span>
                  <Tag color="red">高风险时段: {highRiskHours.slice(0, 4).map((h) => h + ':00').join(', ')}{highRiskHours.length > 4 ? `…+${highRiskHours.length - 4}h` : ''}</Tag>
                </Space>
              }
              description={
                <Space>
                  <span>
                    预计 {peakHour?.toString().padStart(2, '0')}:00 左右出现峰值，可通过储能放电或负荷转移降低
                  </span>
                  <Button
                    size="small"
                    type="primary"
                    danger
                    onClick={() => {
                      jumpFromForecastToSchedule(highRiskHours)
                    }}
                  >
                    去排程优化 →
                  </Button>
                </Space>
              }
              action={<div />}
            />
          )}
          {peakForecast <= demandRedLine && peakForecast > demandRedLine * 0.9 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={`预测峰值 ${peakForecast}kW 接近红线 (${demandRedLine}kW)，利用率 ${Math.round(peakForecast / demandRedLine * 100)}%`}
              description="可提前调整排程以预留安全裕度"
              action={
                <Button
                  size="small"
                  onClick={() => jumpFromForecastToSchedule(highRiskHours)}
                >
                  去排程
                </Button>
              }
            />
          )}

          <Card size="small">
            <Tabs items={forecastTabItems} />
          </Card>

          <Row gutter={12} style={{ marginTop: 16 }}>
            <Col span={8}>
              <Card size="small" title="📊 用电时段分布">
                <div style={{ padding: '8px 0' }}>
                  {[
                    { label: '尖峰 10:00-12:00', pct: 18, color: '#ff4d4f' },
                    { label: '高峰 14:00-16:00', pct: 22, color: '#fa8c16' },
                    { label: '平段 12:00-14:00, 18:00-22:00', pct: 35, color: '#1677ff' },
                    { label: '谷段 22:00-次日08:00', pct: 25, color: '#52c41a' }
                  ].map((item) => (
                    <div key={item.label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span>{item.label}</span>
                        <span style={{ color: item.color, fontWeight: 600 }}>{item.pct}%</span>
                      </div>
                      <div style={{ height: 8, background: '#f5f5f5', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${item.pct}%`, height: '100%', background: item.color, borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="⚡ 峰值预警窗口">
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {[
                    { time: '10:30 - 12:00', level: 'high', kw: 2350, diff: '-150kW' },
                    { time: '14:30 - 16:30', level: 'critical', kw: 2680, diff: '+180kW' },
                    { time: '19:00 - 21:00', level: 'warning', kw: 2450, diff: '-50kW' }
                  ].map((w, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 8,
                        borderRadius: 6,
                        background: w.level === 'critical'
                          ? '#fff1f0'
                          : w.level === 'high' ? '#fff7e6' : '#e6f4ff',
                        border: `1px solid ${w.level === 'critical' ? '#ffa39e' : w.level === 'high' ? '#ffd591' : '#91caff'}`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{w.time}</span>
                        <Tag color={w.level === 'critical' ? 'red' : w.level === 'high' ? 'orange' : 'blue'}>
                          {w.level === 'critical' ? '超红线' : w.level === 'high' ? '高风险' : '警戒'}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                        <span style={{ color: '#595959' }}>预计 {w.kw}kW</span>
                        <span style={{ color: w.diff.startsWith('+') ? '#ff4d4f' : '#52c41a', fontWeight: 600 }}>
                          {w.diff}
                        </span>
                      </div>
                    </div>
                  ))}
                </Space>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" title="📈 预测置信度">
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 48, fontWeight: 800, color: '#1677ff' }}>92.6%</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>模型预测准确度</div>
                </div>
                <div style={{ fontSize: 12, color: '#595959', lineHeight: 1.8 }}>
                  <div>• 训练数据量: <b style={{ color: '#1677ff' }}>2,847 天</b></div>
                  <div>• 模型版本: <b>LSTM-v3.2</b></div>
                  <div>• 最后更新: <b>{dayjs().subtract(2, 'hour').format('MM-DD HH:mm')}</b></div>
                  <div>• 特征维度: <b>48 个因子</b></div>
                </div>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  )
}
