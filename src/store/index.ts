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
  ForecastFactor,
  ScheduleVersion,
  CrossWindowState
} from '@/types'

const STORAGE_KEY = 'energy-workbench-store-v1'
const CHANNEL_NAME = 'energy-workbench-sync'

let bc: BroadcastChannel | null = null
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try { bc = new BroadcastChannel(CHANNEL_NAME) } catch {}
}

let isApplyingRemote = false
let syncToken = 0

const readFromStorage = <T>(fallback: T): T => {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return { ...fallback, ...parsed }
  } catch { return fallback }
}

const writeToStorage = (state: any) => {
  try {
    if (typeof localStorage === 'undefined') return
    const pick: any = {}
    const syncKeys = [
      'scheduleItems','alarms','workOrders','loadProfiles','peakLoad','workshops',
      'reviewRecords','forecastFactors','scheduleVersions','currentVersionId','crossWindow',
      'selectedPlanId','currentDate','equipments','shifts'
    ]
    syncKeys.forEach((k) => { if ((state as any)[k] !== undefined) pick[k] = (state as any)[k] })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pick))
  } catch {}
}

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const getElectricityRate = (hour: number): number => {
  if (hour >= 8 && hour < 11) return 1.28
  if (hour >= 13 && hour < 15) return 1.28
  if (hour >= 18 && hour < 21) return 1.28
  if ((hour >= 22) || (hour < 8)) return 0.32
  return 0.78
}

const computeLoadProfilesFromSchedule = (items: ScheduleItem[], demandRedLine: number): LoadProfile[] => {
  const hourlyElectricity = new Array(24).fill(400)
  const hourlySteam = new Array(24).fill(80)
  const hourlyAir = new Array(24).fill(50)

  items.forEach((item) => {
    const startMin = timeToMinutes(item.startTime)
    const endMin = timeToMinutes(item.endTime)
    for (let m = startMin; m < endMin; m++) {
      const h = Math.floor(m / 60)
      if (h >= 0 && h < 24) {
        if (item.type === 'equipment') hourlyElectricity[h] += item.power * (1 / 60)
        else if (item.type === 'boiler') {
          hourlySteam[h] += Math.abs(item.power) * (1 / 60) * 4
          hourlyElectricity[h] += item.power * (1 / 60) * 0.2
        } else if (item.type === 'compressor') {
          hourlyAir[h] += Math.abs(item.power) * (1 / 60) * 2
          hourlyElectricity[h] += item.power * (1 / 60)
        } else if (item.type === 'storage_charge') {
          hourlyElectricity[h] += item.power * (1 / 60)
        } else if (item.type === 'storage_discharge') {
          hourlyElectricity[h] -= item.power * (1 / 60)
        }
      }
    }
  })

  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    electricity: Math.max(100, Math.round(hourlyElectricity[h])),
    steam: Math.max(0, Math.round(hourlySteam[h])),
    compressedAir: Math.max(0, Math.round(hourlyAir[h]))
  }))
}

const computePeakFromSchedule = (profiles: LoadProfile[]): { peak: number; peakHour: number; peakHours: number[]; risk: 'low' | 'medium' | 'high'; demandRedLine: number } => {
  let peak = 0
  let peakHour = 0
  const peakHours: number[] = []
  const line = 2500
  profiles.forEach((p, i) => {
    if (p.electricity > peak) {
      peak = p.electricity
      peakHour = i
    }
    if (p.electricity > line * 0.9) peakHours.push(i)
  })
  let risk: 'low' | 'medium' | 'high' = 'low'
  if (peak > line * 1.02) risk = 'high'
  else if (peak > line * 0.95) risk = 'medium'
  return { peak, peakHour, peakHours, risk, demandRedLine: line }
}

const computeCostFromSchedule = (profiles: LoadProfile[], items: ScheduleItem[]): { totalCost: number; electricityCost: number; steamCost: number; airCost: number; demandCharge: number; peakSaving: number } => {
  let electricityCost = 0
  let baseElectricity = 0
  profiles.forEach((p) => {
    const rate = getElectricityRate(p.hour)
    electricityCost += p.electricity * rate
    baseElectricity += p.electricity * 0.78
  })
  const peakSaving = Math.max(0, Math.round(baseElectricity - electricityCost))
  const steamCost = profiles.reduce((s, p) => s + p.steam * 280 / 1000, 0)
  const airCost = profiles.reduce((s, p) => s + p.compressedAir * 0.18, 0)
  const peak = Math.max(...profiles.map((p) => p.electricity))
  let demandCharge = 0
  if (peak > 2500) demandCharge = (peak - 2500) * 80
  else if (peak > 2200) demandCharge = 8000
  else demandCharge = 3000
  return {
    totalCost: Math.round(electricityCost + steamCost + airCost + demandCharge),
    electricityCost: Math.round(electricityCost),
    steamCost: Math.round(steamCost),
    airCost: Math.round(airCost),
    demandCharge,
    peakSaving
  }
}

const defaultScheduleItems: ScheduleItem[] = [
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
]

const initialProfiles = computeLoadProfilesFromSchedule(defaultScheduleItems, 2500)
const initialPeak = computePeakFromSchedule(initialProfiles)
const initialCost = computeCostFromSchedule(initialProfiles, defaultScheduleItems)

const initialVersions: ScheduleVersion[] = [
  {
    id: 'v1',
    name: 'V1 基准方案',
    createdAt: '2026-06-08 09:00',
    remark: '原始基准排程，无储能优化',
    items: [
      { id: 'v1_1', type: 'equipment', name: '冲压机A运行', startTime: '08:00', endTime: '14:00', power: 180, status: 'scheduled' },
      { id: 'v1_2', type: 'equipment', name: '焊接机器人组', startTime: '09:00', endTime: '17:00', power: 220, status: 'scheduled' },
      { id: 'v1_3', type: 'equipment', name: 'CNC加工中心A', startTime: '08:00', endTime: '20:00', power: 95, status: 'scheduled' },
      { id: 'v1_4', type: 'equipment', name: 'CNC加工中心B', startTime: '08:00', endTime: '18:00', power: 95, status: 'scheduled' },
      { id: 'v1_5', type: 'equipment', name: '总装线运行', startTime: '08:00', endTime: '22:00', power: 180, status: 'scheduled' },
      { id: 'v1_6', type: 'boiler', name: '锅炉1号供汽', startTime: '08:00', endTime: '22:00', power: 45, status: 'scheduled' },
      { id: 'v1_7', type: 'compressor', name: '空压机A供气', startTime: '08:00', endTime: '22:00', power: 110, status: 'scheduled' },
      { id: 'v1_8', type: 'compressor', name: '空压机B供气', startTime: '09:00', endTime: '17:00', power: 90, status: 'scheduled' }
    ],
    estimatedCost: 286500,
    estimatedPeak: 2650,
    estimatedPeakRisk: 'high',
    estimatedPeakSaving: 0
  },
  {
    id: 'v2',
    name: 'V2 移峰填谷',
    createdAt: '2026-06-08 11:30',
    remark: '部分设备移至平段，锅炉提前启动',
    items: [
      { id: 'v2_1', type: 'equipment', name: '冲压机A运行', startTime: '09:30', endTime: '15:30', power: 180, status: 'scheduled' },
      { id: 'v2_2', type: 'equipment', name: '焊接机器人组', startTime: '10:00', endTime: '18:00', power: 220, status: 'scheduled' },
      { id: 'v2_3', type: 'equipment', name: 'CNC加工中心A', startTime: '08:00', endTime: '20:00', power: 95, status: 'scheduled' },
      { id: 'v2_4', type: 'equipment', name: 'CNC加工中心B', startTime: '12:00', endTime: '22:00', power: 95, status: 'scheduled' },
      { id: 'v2_5', type: 'equipment', name: '总装线运行', startTime: '08:00', endTime: '22:00', power: 180, status: 'scheduled' },
      { id: 'v2_6', type: 'boiler', name: '锅炉1号供汽', startTime: '06:30', endTime: '21:30', power: 45, status: 'scheduled' },
      { id: 'v2_7', type: 'compressor', name: '空压机A供气', startTime: '07:30', endTime: '21:30', power: 110, status: 'scheduled' },
      { id: 'v2_8', type: 'compressor', name: '空压机B供气', startTime: '11:00', endTime: '17:00', power: 90, status: 'scheduled' },
      { id: 'v2_9', type: 'storage_charge', name: '储能低谷充电', startTime: '02:00', endTime: '05:00', power: 500, status: 'scheduled' }
    ],
    estimatedCost: 254200,
    estimatedPeak: 2520,
    estimatedPeakRisk: 'medium',
    estimatedPeakSaving: 32300
  }
]

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
  scheduleVersions: ScheduleVersion[]
  currentVersionId: string | null
  crossWindow: CrossWindowState

  setCurrentDate: (date: string) => void
  setForecastFactors: (factors: Partial<ForecastFactor>) => void
  addWorkOrder: (order: WorkOrder) => void
  updateWorkOrder: (id: string, updates: Partial<WorkOrder>) => void
  deleteWorkOrder: (id: string) => void
  addScheduleItem: (item: ScheduleItem) => void
  updateScheduleItem: (id: string, updates: Partial<ScheduleItem>) => void
  deleteScheduleItem: (id: string) => void
  recalculateFromSchedule: () => void
  resolveAlarm: (id: string) => void
  resolveAllAlarms: () => void
  selectPlan: (id: string) => void

  saveCurrentAsVersion: (name: string, remark?: string) => void
  switchToVersion: (id: string) => void
  duplicateVersion: (id: string, newName: string) => void
  deleteVersion: (id: string) => void

  setForecastHighRisk: (hours: number[]) => void
  jumpFromForecastToSchedule: (riskHours: number[]) => void
  clearFromForecastFlag: () => void
  setHighlightRiskSlots: (on: boolean) => void
}

export const useEnergyStore = create<EnergyStore>((set, get) => ({
  currentDate: new Date().toISOString().split('T')[0],
  demandRedLine: 2500,
  currentLoad: initialProfiles[new Date().getHours()]?.electricity || 1680,
  peakLoad: initialPeak.peak,
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
  loadProfiles: initialProfiles,
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
  scheduleItems: defaultScheduleItems,
  alarms: [
    { id: 'a1', type: 'over_demand', level: 'critical', title: '峰值用电超需量预警', description: '14:00-16:00 预计最大负荷将达到2650kW，超出需量红线2500kW', time: '2026-06-09 13:45', source: 'EMS系统', resolved: false },
    { id: 'a2', type: 'low_efficiency', level: 'warning', title: '涂装车间效率偏低', description: '涂装车间当前综合效率72%，低于标准值85%，建议检查设备状态', time: '2026-06-09 11:20', source: '车间监控', resolved: false },
    { id: 'a3', type: 'waste_heat', level: 'warning', title: '焊接车间余热浪费', description: '焊接工段排烟温度285℃，余热回收率仅35%，建议检修余热回收装置', time: '2026-06-09 10:15', source: '能耗分析', resolved: false },
    { id: 'a4', type: 'over_load', level: 'info', title: '空压机负荷偏高', description: '10:00-11:00 空压机A负荷率达到94%，建议启动备用机组', time: '2026-06-09 10:50', source: '动力系统', resolved: true },
    { id: 'a5', type: 'equipment_fault', level: 'critical', title: '涂装线设备维护', description: '涂装流水线循环泵异常，已切换至维护模式，预计16:00恢复', time: '2026-06-09 09:30', source: '设备管理', resolved: false }
  ],
  costPlans: [
    { id: 'p1', name: '方案A：基准方案', totalCost: initialCost.totalCost, electricityCost: initialCost.electricityCost, steamCost: initialCost.steamCost, airCost: initialCost.airCost, carbon: 48.5, risk: 'low', demandCharge: initialCost.demandCharge, peakSaving: initialCost.peakSaving },
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
  scheduleVersions: initialVersions,
  currentVersionId: null,
  crossWindow: {
    forecastHighRiskHours: [],
    fromForecastJump: false,
    highlightRiskSlots: false,
    lastScheduleVersionId: null
  },

  setCurrentDate: (date) => set({ currentDate: date }),
  setForecastFactors: (factors) => set((state) => ({ forecastFactors: { ...state.forecastFactors, ...factors } })),
  addWorkOrder: (order) => set((state) => ({ workOrders: [...state.workOrders, order] })),
  updateWorkOrder: (id, updates) => set((state) => ({
    workOrders: state.workOrders.map((o) => (o.id === id ? { ...o, ...updates } : o))
  })),
  deleteWorkOrder: (id) => set((state) => ({
    workOrders: state.workOrders.filter((o) => o.id !== id)
  })),

  addScheduleItem: (item) => set((state) => {
    const newItems = [...state.scheduleItems, item]
    const profiles = computeLoadProfilesFromSchedule(newItems, state.demandRedLine)
    const peak = computePeakFromSchedule(profiles)
    const workshops = state.workshops.map((w) => w.id === 'w5' && peak.peak < 2500 ? { ...w, status: 'running' as const, efficiency: 88 } : w)
    return {
      scheduleItems: newItems,
      loadProfiles: profiles,
      currentLoad: profiles[new Date().getHours()]?.electricity || state.currentLoad,
      peakLoad: peak.peak,
      workshops,
      currentVersionId: null
    }
  }),
  updateScheduleItem: (id, updates) => set((state) => {
    const newItems = state.scheduleItems.map((s) => (s.id === id ? { ...s, ...updates } : s))
    const profiles = computeLoadProfilesFromSchedule(newItems, state.demandRedLine)
    const peak = computePeakFromSchedule(profiles)
    const prevCritical = state.alarms.filter((a) => a.type === 'over_demand' && a.level === 'critical' && !a.resolved).length
    let alarms = state.alarms
    if (peak.peak > state.demandRedLine && prevCritical === 0) {
      alarms = [
        ...alarms.filter((a) => !(a.type === 'over_demand' && a.title === '峰值用电超需量预警(自动)')),
        {
          id: `auto_alarm_${Date.now()}`,
          type: 'over_demand',
          level: 'critical',
          title: '峰值用电超需量预警(自动)',
          description: `排程调整后，${peak.peakHour}:00 预计最大负荷达到 ${peak.peak}kW，超出需量红线 ${state.demandRedLine}kW`,
          time: new Date().toISOString().slice(0, 16).replace('T', ' '),
          source: '排程引擎',
          resolved: false
        }
      ]
    } else if (peak.peak <= state.demandRedLine && prevCritical > 0) {
      alarms = alarms.map((a) => (a.type === 'over_demand' && a.title.includes('(自动)') ? { ...a, resolved: true } : a))
    }
    return {
      scheduleItems: newItems,
      loadProfiles: profiles,
      currentLoad: profiles[new Date().getHours()]?.electricity || state.currentLoad,
      peakLoad: peak.peak,
      alarms,
      currentVersionId: null
    }
  }),
  deleteScheduleItem: (id) => set((state) => {
    const newItems = state.scheduleItems.filter((s) => s.id !== id)
    const profiles = computeLoadProfilesFromSchedule(newItems, state.demandRedLine)
    const peak = computePeakFromSchedule(profiles)
    return {
      scheduleItems: newItems,
      loadProfiles: profiles,
      currentLoad: profiles[new Date().getHours()]?.electricity || state.currentLoad,
      peakLoad: peak.peak,
      currentVersionId: null
    }
  }),
  recalculateFromSchedule: () => {
    const state = get()
    const profiles = computeLoadProfilesFromSchedule(state.scheduleItems, state.demandRedLine)
    const peak = computePeakFromSchedule(profiles)
    set({
      loadProfiles: profiles,
      peakLoad: peak.peak,
      currentLoad: profiles[new Date().getHours()]?.electricity || state.currentLoad
    })
  },
  resolveAlarm: (id) => set((state) => ({
    alarms: state.alarms.map((a) => (a.id === id ? { ...a, resolved: true } : a))
  })),
  resolveAllAlarms: () => set((state) => ({
    alarms: state.alarms.map((a) => ({ ...a, resolved: true }))
  })),
  selectPlan: (id) => set({ selectedPlanId: id }),
  addReviewRecord: (record) => set((state) => ({ reviewRecords: [record, ...state.reviewRecords] })),
  updateReviewRecord: (id, updates) => set((state) => ({
    reviewRecords: state.reviewRecords.map((r) => (r.id === id ? { ...r, ...updates } : r))
  })),

  saveCurrentAsVersion: (name, remark = '') => set((state) => {
    const profiles = computeLoadProfilesFromSchedule(state.scheduleItems, state.demandRedLine)
    const peak = computePeakFromSchedule(profiles)
    const cost = computeCostFromSchedule(profiles, state.scheduleItems)
    const items = state.scheduleItems.map((i) => ({ ...i }))
    const versionId = `v${Date.now()}`
    const newVersion: ScheduleVersion = {
      id: versionId,
      name,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      remark,
      items,
      estimatedCost: cost.totalCost,
      estimatedPeak: peak.peak,
      estimatedPeakRisk: peak.risk,
      estimatedPeakSaving: cost.peakSaving
    }
    return {
      scheduleVersions: [...state.scheduleVersions, newVersion],
      currentVersionId: versionId,
      crossWindow: { ...state.crossWindow, lastScheduleVersionId: versionId }
    }
  }),
  switchToVersion: (id) => set((state) => {
    const version = state.scheduleVersions.find((v) => v.id === id)
    if (!version) return state
    const items = version.items.map((i) => ({ ...i }))
    const profiles = computeLoadProfilesFromSchedule(items, state.demandRedLine)
    const peak = computePeakFromSchedule(profiles)
    return {
      scheduleItems: items,
      currentVersionId: id,
      loadProfiles: profiles,
      currentLoad: profiles[new Date().getHours()]?.electricity || state.currentLoad,
      peakLoad: peak.peak,
      crossWindow: { ...state.crossWindow, lastScheduleVersionId: id }
    }
  }),
  duplicateVersion: (id, newName) => set((state) => {
    const version = state.scheduleVersions.find((v) => v.id === id)
    if (!version) return state
    const newId = `v${Date.now()}`
    const copy: ScheduleVersion = {
      ...version,
      id: newId,
      name: newName,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      remark: `复制自 ${version.name}`,
      items: version.items.map((i) => ({ ...i, id: `${newId}_${i.id}_${Date.now()}` }))
    }
    return { scheduleVersions: [...state.scheduleVersions, copy] }
  }),
  deleteVersion: (id) => set((state) => ({
    scheduleVersions: state.scheduleVersions.filter((v) => v.id !== id),
    currentVersionId: state.currentVersionId === id ? null : state.currentVersionId
  })),

  setForecastHighRisk: (hours) => set((state) => ({
    crossWindow: { ...state.crossWindow, forecastHighRiskHours: hours }
  })),
  jumpFromForecastToSchedule: (riskHours) => {
    set((state) => ({
      crossWindow: {
        ...state.crossWindow,
        forecastHighRiskHours: riskHours,
        fromForecastJump: true,
        highlightRiskSlots: true
      }
    }))
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      ;(window as any).electronAPI.openWindow('schedule', '/schedule')
    }
  },
  clearFromForecastFlag: () => set((state) => ({
    crossWindow: { ...state.crossWindow, fromForecastJump: false }
  })),
  setHighlightRiskSlots: (on) => set((state) => ({
    crossWindow: { ...state.crossWindow, highlightRiskSlots: on }
  }))
}))

useEnergyStore.subscribe((state, prevState) => {
  if (isApplyingRemote) return
  syncToken++
  writeToStorage(state)
  if (bc) {
    try {
      const payload: any = {}
      const syncKeys = [
        'scheduleItems','alarms','workOrders','loadProfiles','peakLoad','workshops',
        'reviewRecords','forecastFactors','scheduleVersions','currentVersionId','crossWindow',
        'selectedPlanId','currentDate','equipments','shifts'
      ]
      syncKeys.forEach((k) => { payload[k] = (state as any)[k] })
      bc.postMessage({ type: 'STATE_SYNC', token: syncToken, payload })
    } catch {}
  }
})

const applyRemoteState = (payload: any) => {
  isApplyingRemote = true
  try {
    useEnergyStore.setState((prev) => ({
      ...prev,
      scheduleItems: payload.scheduleItems ?? prev.scheduleItems,
      alarms: payload.alarms ?? prev.alarms,
      workOrders: payload.workOrders ?? prev.workOrders,
      loadProfiles: payload.loadProfiles ?? prev.loadProfiles,
      peakLoad: payload.peakLoad ?? prev.peakLoad,
      workshops: payload.workshops ?? prev.workshops,
      reviewRecords: payload.reviewRecords ?? prev.reviewRecords,
      forecastFactors: payload.forecastFactors ?? prev.forecastFactors,
      scheduleVersions: payload.scheduleVersions ?? prev.scheduleVersions,
      currentVersionId: payload.currentVersionId ?? prev.currentVersionId,
      crossWindow: payload.crossWindow ?? prev.crossWindow,
      selectedPlanId: payload.selectedPlanId ?? prev.selectedPlanId,
      currentDate: payload.currentDate ?? prev.currentDate,
      equipments: payload.equipments ?? prev.equipments,
      shifts: payload.shifts ?? prev.shifts
    }))
  } finally {
    setTimeout(() => { isApplyingRemote = false }, 0)
  }
}

if (typeof window !== 'undefined') {
  if (bc) {
    bc.onmessage = (ev) => {
      if (ev.data?.type === 'STATE_SYNC') {
        applyRemoteState(ev.data.payload)
      }
    }
  }
  window.addEventListener('storage', (ev) => {
    if (ev.key === STORAGE_KEY && ev.newValue && !isApplyingRemote) {
      try {
        const parsed = JSON.parse(ev.newValue)
        applyRemoteState(parsed)
      } catch {}
    }
  })
  const stored = readFromStorage<any>(null)
  if (stored) applyRemoteState(stored)
}
