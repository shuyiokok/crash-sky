import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'config')
const outFile = path.join(outDir, '冲上云霄配置表.xlsx')

const config = {
  growth: {
    decimals: 2,
    stages: [
      { rate: 0.07, until: 20 },
      { rate: 0.04, until: 100 },
      { rate: 0.025, until: Infinity },
    ],
  },
  round: {
    bettingMs: 5000,
    crashHoldMs: 2800,
    historyLimit: 24,
    sessionPlays: 10,
  },
  economy: {
    startingBalance: 5_000_000,
    minBet: 10_000,
    hardMaxBet: 100_000_000,
    defaultBet: 10_000,
    betStep: 10_000,
    maxBetDivisor: 5,
  },
  crash: { rtp: 0.98 },
  participants: {
    countMin: 65,
    countMax: 200,
    refreshMsMin: 5000,
    refreshMsMax: 10000,
    listSize: 12,
    betMin: 10_000,
    betMax: 500_000,
    skipRatio: 0.15,
  },
}

const paramRows = [
  ['分组', '参数名', '当前值', '说明'],
  ['crash', 'rtp', config.crash.rtp, '返奖率；C=max(1,rtp/U)'],
  ['round', 'bettingMs', config.round.bettingMs, '下注倒计时毫秒'],
  ['round', 'sessionPlays', config.round.sessionPlays, '单次会话局数'],
  ['economy', 'startingBalance', config.economy.startingBalance, '初始筹码'],
  ['economy', 'minBet', config.economy.minBet, '最低参与分'],
  ['economy', 'hardMaxBet', config.economy.hardMaxBet, 'MAX硬上限'],
  ['economy', 'maxBetDivisor', config.economy.maxBetDivisor, 'MAX=金币/该值'],
  ['participants', 'countMin', config.participants.countMin, '机器人数下限'],
  ['participants', 'countMax', config.participants.countMax, '机器人数上限'],
  ['participants', 'skipRatio', config.participants.skipRatio, '不下注比例'],
  ['growth', 'stage1.rate', config.growth.stages[0].rate, '1→20x 增长率'],
  ['growth', 'stage2.rate', config.growth.stages[1].rate, '20→100x 增长率'],
  ['growth', 'stage3.rate', config.growth.stages[2].rate, '100x+ 增长率'],
]

fs.mkdirSync(outDir, { recursive: true })
const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(paramRows), '综合参数')
XLSX.writeFile(wb, outFile)
console.log('wrote', outFile)
