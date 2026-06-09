import { useState } from 'react'
import { Avatar, Badge, Dropdown, Button } from 'antd'
import {
  DashboardOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  CalendarOutlined,
  WarningOutlined,
  DollarOutlined,
  FileDoneOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useEnergyStore } from '@/store'

declare global {
  interface Window {
    electronAPI: {
      openWindow: (key: string, route: string) => Promise<void>
      closeWindow: (key: string) => Promise<void>
    }
  }
}

interface WindowItem {
  key: string
  route: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

const windows: WindowItem[] = [
  {
    key: 'overview',
    route: '/overview',
    title: '总览窗',
    description: '今日负荷监控、需量红线预警、能源单价看板和各车间运行状态总览',
    icon: <DashboardOutlined />,
    color: '#1677ff',
    bgColor: 'rgba(22, 119, 255, 0.1)'
  },
  {
    key: 'production',
    route: '/production',
    title: '产线窗',
    description: '班次配置录入、设备功率参数、工单优先级排序和不可停机规则管理',
    icon: <ThunderboltOutlined />,
    color: '#52c41a',
    bgColor: 'rgba(82, 196, 26, 0.1)'
  },
  {
    key: 'forecast',
    route: '/forecast',
    title: '预测窗',
    description: '基于历史产量、天气数据和班次安排智能估算多能源负荷曲线',
    icon: <RiseOutlined />,
    color: '#722ed1',
    bgColor: 'rgba(114, 46, 209, 0.1)'
  },
  {
    key: 'schedule',
    route: '/schedule',
    title: '排程窗',
    description: '拖拽式甘特图调整开机时间、储能充放电、锅炉启停和空压机组合',
    icon: <CalendarOutlined />,
    color: '#fa8c16',
    bgColor: 'rgba(250, 140, 22, 0.1)'
  },
  {
    key: 'alarm',
    route: '/alarm',
    title: '告警窗',
    description: '超需量预警、设备低效率提示、余热浪费告警及实时处理跟踪',
    icon: <WarningOutlined />,
    color: '#ff4d4f',
    bgColor: 'rgba(255, 77, 79, 0.1)'
  },
  {
    key: 'cost',
    route: '/cost',
    title: '成本窗',
    description: '多方案费用对比分析、碳排放评估、风险等级评定与峰谷收益测算',
    icon: <DollarOutlined />,
    color: '#13c2c2',
    bgColor: 'rgba(19, 194, 194, 0.1)'
  },
  {
    key: 'review',
    route: '/review',
    title: '复盘窗',
    description: '计划与实际偏差分析、原因备注记录、审批意见管理和报表导出',
    icon: <FileDoneOutlined />,
    color: '#eb2f96',
    bgColor: 'rgba(235, 47, 150, 0.1)'
  }
]

export default function Home() {
  const [currentTime, setCurrentTime] = useState(dayjs().format('YYYY-MM-DD HH:mm:ss'))
  const { alarms } = useEnergyStore()
  const unresolvedCount = alarms.filter((a) => !a.resolved).length

  useState(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('YYYY-MM-DD HH:mm:ss'))
    }, 1000)
    return () => clearInterval(timer)
  })

  const handleOpenWindow = async (item: WindowItem) => {
    if (window.electronAPI?.openWindow) {
      await window.electronAPI.openWindow(item.key, item.route)
    } else {
      window.open(`#${item.route}`, item.key, `width=1200,height=800`)
    }
  }

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人设置' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }
    ]
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="main-layout-header">
        <div className="main-layout-title">
          <span style={{ fontSize: 24 }}>⚡</span>
          工厂多能源排程工作台
          <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.6)', marginLeft: 8 }}>
            Energy Scheduling Workbench v1.0
          </span>
        </div>
        <div className="main-layout-user">
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{currentTime}</span>
          <Badge count={unresolvedCount} size="small">
            <Button
              type="text"
              shape="circle"
              icon={<BellOutlined style={{ color: '#fff', fontSize: 18 }} />}
            />
          </Badge>
          <Dropdown menu={userMenu} placement="bottomRight">
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
              <span>能源主管 · 李明</span>
            </span>
          </Dropdown>
        </div>
      </header>

      <div className="window-grid">
        {windows.map((item) => (
          <div
            key={item.key}
            className="window-card"
            onClick={() => handleOpenWindow(item)}
          >
            <div
              className="window-card-icon"
              style={{ background: item.bgColor, color: item.color }}
            >
              {item.icon}
            </div>
            <div className="window-card-title" style={{ color: item.color }}>
              {item.title}
            </div>
            <div className="window-card-desc">{item.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
