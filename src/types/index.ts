export interface EnergyPrice {
  electricity: { peak: number; flat: number; valley: number }
  steam: number
  compressedAir: number
  storage: { charge: number; discharge: number }
}

export interface WorkshopStatus {
  id: string
  name: string
  status: 'running' | 'idle' | 'maintenance' | 'alarm'
  load: number
  efficiency: number
}

export interface LoadProfile {
  hour: number
  electricity: number
  steam: number
  compressedAir: number
}

export interface Shift {
  id: string
  name: string
  startTime: string
  endTime: string
  workers: number
}

export interface Equipment {
  id: string
  name: string
  workshop: string
  power: number
  steamConsumption: number
  airConsumption: number
  status: 'available' | 'running' | 'maintenance'
  minRunHours: number
  minStopHours: number
}

export interface WorkOrder {
  id: string
  name: string
  equipment: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  plannedStart: string
  plannedEnd: string
  quantity: number
  nonStopRequired: boolean
}

export interface ScheduleItem {
  id: string
  type: 'equipment' | 'boiler' | 'compressor' | 'storage_charge' | 'storage_discharge'
  name: string
  startTime: string
  endTime: string
  power: number
  status: 'scheduled' | 'running' | 'completed'
}

export interface AlarmItem {
  id: string
  type: 'over_load' | 'low_efficiency' | 'waste_heat' | 'over_demand' | 'equipment_fault'
  level: 'critical' | 'warning' | 'info'
  title: string
  description: string
  time: string
  source: string
  resolved: boolean
}

export interface CostPlan {
  id: string
  name: string
  totalCost: number
  electricityCost: number
  steamCost: number
  airCost: number
  carbon: number
  risk: 'low' | 'medium' | 'high'
  demandCharge: number
  peakSaving: number
}

export interface ReviewRecord {
  id: string
  date: string
  schedulePlan: string
  actualExecution: string
  deviation: number
  deviationReason: string
  approver: string
  approvalOpinion: string
  approvalStatus: 'pending' | 'approved' | 'rejected'
  remarks: string
}

export interface ForecastFactor {
  historicalProduction: number
  temperature: number
  humidity: number
  weatherCondition: string
  shiftArrangement: string
}

export interface ScheduleVersion {
  id: string
  name: string
  createdAt: string
  remark: string
  items: ScheduleItem[]
  estimatedCost: number
  estimatedPeak: number
  estimatedPeakRisk: 'low' | 'medium' | 'high'
  estimatedPeakSaving: number
}

export interface CrossWindowState {
  forecastHighRiskHours: number[]
  fromForecastJump: boolean
  highlightRiskSlots: boolean
  lastScheduleVersionId: string | null
}
