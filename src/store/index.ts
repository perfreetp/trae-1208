import { create } from 'zustand'
import type {
  EnergyPrice,
  WorkshopStatus,
  LoadProfile,
  Shift,
  Equipment,
  WorkOrder,
  ScheduleItem,
  AlarmItem,
  CostPlan,
  ReviewRecord,
  ForecastFactor
} from '@/types'

interface EnergyStore {
  currentDate: string
  demandRedLine: number
  currentLoad: number
  peakLoad: number
  energyPrices: EnergyPrice
  workshops: WorkshopStatus[]
  loadProfiles: LoadProfile[]
  shifts: Shift[]
  equipments: Equipment[]
  workOrders: WorkOrder[]
  scheduleItems: ScheduleItem[]
  alarms: AlarmItem[]
  costPlans: CostPlan[]
  reviewRecords: ReviewRecord[]
  forecastFactors: ForecastFactor
  selectedPlanId: string

  setCurrentDate: (date: string) => void
  setForecastFactors: (factors: Partial<ForecastFactor>) => void
  addWorkOrder: (order: WorkOrder) => void
  updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => void
  deleteWorkOrder: (id: string) => void
  addScheduleItem: (item: ScheduleItem) => void
  updateScheduleItem: (id: string, updates: Partial<ScheduleItem>) => void
  deleteScheduleItem: (id: string) => void
  resolveAlarm: (id: string) => void
  selectPlan: (id: string) => void
  addReviewRecord: (record: ReviewRecord) => void
  updateReviewRecord: (id: string, updates: Partial<ReviewRecord>) => void
}

const generateLoadProfiles = (): LoadProfile[] => {
  return Array.from({ length: 24 }, (_, i) => {
    let base = 500
    if (i >= 8 && i < 12) base = 1800
    else if (i >= 13 && i < 18) base = 2000
    else if (i >= 18 && i < 22) base = 1500
    else if (i >= 0 && i < 6) base = 400
    else base = 900
    const random = Math.floor(Math.random() * 200 - 100)
    return {
      hour: i,
      electricity: base + random,
      steam: Math.floor((base + random) * 0.35),
      compressedAir: Math.floor((base + random) * 0.25)
    }
  })
}

export const useEnergyStore = create<EnergyStore>((set) => ({
  currentDate: new Date().toISOString().split('T')[0],
  demandRedLine: 2500,
  currentLoad: 1680,
  peakLoad: 2150,
  energyPrices: {
    electricity: { peak: 1.28, flat: 0.78, valley: 0.32 },
    steam: 280,
    compressedAir: 0.18,
    storage: { charge: 0.25, discharge: 0.15 }
  },
  workshops: [
    { id: 'w1', name: '冲压车间', status: 'running', load: 420, efficiency: 92 },
    { id: 'w2', name: '焊接车间', status: 'running', load: 380, efficiency: 88 },
    { id: 'w3', name: '机加工车间', status: 'running', load: 560, efficiency: 94 },
    { id: 'w4', name: '装配车间', status: 'running', load: 320, efficiency: 96 },
    { id: 'w5', name: '涂装车间', status: 'alarm', load: 180, efficiency: 72 },
    { id: 'w6', name: '动力车间', status: 'running', load: 240, efficiency: 89 }
  ],
  loadProfiles: generateLoadProfiles(),
  shifts: [
    { id: 's1', name: '早班', startTime: '08:00', endTime: '16:00', workers: 120 },
    { id: 's2', name: '中班', startTime: '16:00', endTime: '00:00', workers: 80 },
    { id: 's3', name: '夜班', startTime: '00:00', endTime: '08:00', workers: 40 }
  ],
  equipments: [
    { id: 'e1', name: '冲压机A', workshop: '冲压车间', power: 180, steamConsumption: 0, airConsumption: 12, status: 'running', minRunHours: 2, minStopHours: 1 },
    { id: 'e2', name: '冲压机B', workshop: '冲压车间', power: 160, steamConsumption: 0, airConsumption: 10, status: 'available', minRunHours: 2, minStopHours: 1 },
    { id: 'e3', name: '焊接机器人组', workshop: '焊接车间', power: 220, steamConsumption: 0, airConsumption: 8, status: 'running', minRunHours: 3, minStopHours: 0.5 },
    { id: 'e4', name: 'CNC加工中心A', workshop: '机加工车间', power: 95, steamConsumption: 0, airConsumption: 5, status: 'running', minRunHours: 4, minStopHours: 0.5 },
    { id: 'e5', name: 'CNC加工中心B', workshop: '机加工车间', power: 95, steamConsumption: 0, airConsumption: 5, status: 'running', minRunHours: 4, minStopHours: 0.5 },
    { id: 'e6', name: '涂装流水线', workshop: '涂装车间', power: 310, steamConsumption: 280, airConsumption: 25, status: 'maintenance', minRunHours: 8, minStopHours: 2 },
    { id: 'e7', name: '总装线', workshop: '装配车间', power: 180, steamConsumption: 0, airConsumption: 15, status: 'running', minRunHours: 4, minStopHours: 1 },
    { id: 'e8', name: '锅炉1号', workshop: '动力车间', power: 45, steamConsumption: -2000, airConsumption: 0, status: 'running', minRunHours: 6, minStopHours: 2 },
    { id: 'e9', name: '锅炉2号', workshop: '动力车间', power: 40, steamConsumption: -1500, airConsumption: 0, status: 'available', minRunHours: 6, minStopHours: 2 },
    { id: 'e10', name: '空压机A', workshop: '动力车间', power: 110, steamConsumption: 0, airConsumption: -300, status: 'running', minRunHours: 2, minStopHours: 0.5 },
    { id: 'e11', name: '空压机B', workshop: '动力车间', power: 90, steamConsumption: 0, airConsumption: -250, status: 'available', minRunHours: 2, minStopHours: 0.5 },
    { id: 'e12', name: '储能系统', workshop: '动力车间', power: 500, steamConsumption: 0, airConsumption: 0, status: 'available', minRunHours: 1, minStopHours: 0.5 }
  ],
  workOrders: [
    { id: 'wo1', name: '车架冲压批次A', equipment: '冲压机A', priority: 'urgent', plannedStart: '08:00', plannedEnd: '14:00', quantity: 500, nonStopRequired: true },
    { id: 'wo2', name: '车身焊接批次B', equipment: '焊接机器人组', priority: 'high', plannedStart: '09:00', plannedEnd: '17:00', quantity: 200, nonStopRequired: true },
    { id: 'wo3', name: '发动机缸体加工', equipment: 'CNC加工中心A', priority: 'normal', plannedStart: '08:00', plannedEnd: '20:00', quantity: 100, nonStopRequired: false },
    { id: 'wo4', name: '变速箱零件加工', equipment: 'CNC加工中心B', priority: 'high', plannedStart: '08:00', plannedEnd: '18:00', quantity: 150, nonStopRequired: false },
    { id: 'wo5', name: '整车装配C200', equipment: '总装线', priority: 'urgent', plannedStart: '08:00', plannedEnd: '22:00', quantity: 80, nonStopRequired: true }
  ],
  scheduleItems: [
    { id: 'sch1', type: 'equipment', name: '冲压机A运行', startTime: '08:00', endTime: '14:00', power: 180, status: 'running' },
    { id: 'sch2', type: 'equipment', name: '焊接机器人组', startTime: '09:00', endTime: '17:00', power: 220, status: 'running' },
    { id: 'sch3', type: 'equipment', name: 'CNC加工中心A', startTime: '08:00', endTime: '20:00', power: 95, status: 'running' },
    { id: 'sch4', type: 'equipment', name: 'CNC加工中心B', startTime: '08:00', endTime: '18:00', power: 95, status: 'running' },
    { id: 'sch5', type: 'equipment', name: '总装线运行', startTime: '08:00', endTime: '22:00', power: 180, status: 'running' },
    { id: 'sch6', type: 'boiler', name: '锅炉1号供汽', startTime: '07:00', endTime: '22:00', power: 45, status: 'running' },
    { id: 'sch7', type: 'compressor', name: '空压机A供气', startTime: '07:30', endTime: '22:30', power: 110, status: 'running' },
    { id: 'sch8', type: 'compressor', name: '空压机B供气', startTime: '10:00', endTime: '16:00', power: 90, status: 'scheduled' },
    { id: 'sch9', type: 'storage_charge', name: '储能低谷充电', startTime: '02:00', endTime: '06:00', power: 500, status: 'completed' },
    { id: 'sch10', type: 'storage_discharge', name: '储能高峰放电', startTime: '14:00', endTime: '18:00', power: 500, status: 'scheduled' }
  ],
  alarms: [
    { id: 'a1', type: 'over_demand', level: 'critical', title: '峰值用电超需量预警', description: '14:00-16:00 预计最大负荷将达到2650kW，超出需量红线2500kW', time: '2026-06-09 13:45', source: 'EMS系统', resolved: false },
    { id: 'a2', type: 'low_efficiency', level: 'warning', title: '涂装车间效率偏低', description: '涂装车间当前综合效率72%，低于标准值85%，建议检查设备状态', time: '2026-06-09 11:20', source: '车间监控', resolved: false },
    { id: 'a3', type: 'waste_heat', level: 'warning', title: '焊接车间余热浪费', description: '焊接工段排烟温度285℃，余热回收率仅35%，建议检修余热回收装置', time: '2026-06-09 10:15', source: '能耗分析', resolved: false },
    { id: 'a4', type: 'over_load', level: 'info', title: '空压机负荷偏高', description: '10:00-11:00 空压机A负荷率达到94%，建议启动备用机组', time: '2026-06-09 10:50', source: '动力系统', resolved: true },
    { id: 'a5', type: 'equipment_fault', level: 'critical', title: '涂装线设备维护', description: '涂装流水线循环泵异常，已切换至维护模式，预计16:00恢复', time: '2026-06-09 09:30', source: '设备管理', resolved: false }
  ],
  costPlans: [
    { id: 'p1', name: '方案A：基准方案', totalCost: 286500, electricityCost: 182400, steamCost: 58800, airCost: 25300, carbon: 48.5, risk: 'low', demandCharge: 20000, peakSaving: 0 },
    { id: 'p2', name: '方案B：移峰填谷', totalCost: 254200, electricityCost: 156300, steamCost: 54500, airCost: 23400, carbon: 45.2, risk: 'medium', demandCharge: 15000, peakSaving: 32300 },
    { id: 'p3', name: '方案C：储能优化', totalCost: 238800, electricityCost: 142500, steamCost: 53200, airCost: 22100, carbon: 42.8, risk: 'low', demandCharge: 11000, peakSaving: 47700 },
    { id: 'p4', name: '方案D：全面优化', totalCost: 229600, electricityCost: 135800, steamCost: 51500, airCost: 21300, carbon: 40.1, risk: 'medium', demandCharge: 9000, peakSaving: 56900 }
  ],
  reviewRecords: [
    { id: 'r1', date: '2026-06-08', schedulePlan: '方案B：移峰填谷', actualExecution: '基本按计划执行，涂装线故障导致部分调整', deviation: 8.5, deviationReason: '涂装流水线设备故障，停机维护3小时', approver: '张工', approvalOpinion: '基本完成，需加强设备预防性维护', approvalStatus: 'approved', remarks: '储能放电时间调整为14:30开始' },
    { id: 'r2', date: '2026-06-07', schedulePlan: '方案C：储能优化', actualExecution: '完全按计划执行', deviation: 2.3, deviationReason: '天气温度较预期高1℃，空调负荷增加', approver: '李总', approvalOpinion: '执行良好，成本节约达到目标', approvalStatus: 'approved', remarks: '建议高温天气增加10%制冷负荷预估' },
    { id: 'r3', date: '2026-06-06', schedulePlan: '方案A：基准方案', actualExecution: '夜班负荷超预期', deviation: 5.8, deviationReason: '紧急插单，夜班增加冲压机B运行6小时', approver: '王经理', approvalOpinion: '需加强订单预测准确性', approvalStatus: 'approved', remarks: '' }
  ],
  forecastFactors: {
    historicalProduction: 12500,
    temperature: 32,
    humidity: 65,
    weatherCondition: '晴',
    shiftArrangement: '正常三班'
  },
  selectedPlanId: 'p3',

  setCurrentDate: (date) => set({ currentDate: date }),
  setForecastFactors: (factors) => set((state) => ({ forecastFactors: { ...state.forecastFactors, ...factors } })),
  addWorkOrder: (order) => set((state) => ({ workOrders: [...state.workOrders, order] })),
  updateWorkOrder: (id, updates) => set((state) => ({
    workOrders: state.workOrders.map((o) => (o.id === id ? { ...o, ...updates } : o))
  })),
  deleteWorkOrder: (id) => set((state) => ({
    workOrders: state.workOrders.filter((o) => o.id !== id)
  })),
  addScheduleItem: (item) => set((state) => ({ scheduleItems: [...state.scheduleItems, item] })),
  updateScheduleItem: (id, updates) => set((state) => ({
    scheduleItems: state.scheduleItems.map((s) => (s.id === id ? { ...s, ...updates } : s))
  })),
  deleteScheduleItem: (id) => set((state) => ({
    scheduleItems: state.scheduleItems.filter((s) => s.id !== id)
  })),
  resolveAlarm: (id) => set((state) => ({
    alarms: state.alarms.map((a) => (a.id === id ? { ...a, resolved: true } : a))
  })),
  selectPlan: (id) => set({ selectedPlanId: id }),
  addReviewRecord: (record) => set((state) => ({ reviewRecords: [record, ...state.reviewRecords] })),
  updateReviewRecord: (id, updates) => set((state) => ({
    reviewRecords: state.reviewRecords.map((r) => (r.id === id ? { ...r, ...updates } : r))
  }))
}))
