// All money values are in today's rupees unless noted. Rates are in percent.

export const EXPENSE_ITEMS = [
  { id: 'home', label: 'Household & groceries', hint: 'Usually stays' },
  { id: 'housing', label: 'Rent / home loan EMI', hint: 'Gone if the loan is paid off or you own your home' },
  { id: 'utilities', label: 'Utilities, phone, internet', hint: 'Often rises when you are home all day' },
  { id: 'commute', label: 'Commute & work costs', hint: 'Usually goes away' },
  { id: 'kids', label: 'Children (school, activities)', hint: 'Often grows as children get older' },
  { id: 'leisure', label: 'Eating out & leisure', hint: 'Tends to grow with more free time' },
  { id: 'travel', label: 'Travel', hint: 'Tends to grow with more free time' },
  { id: 'other', label: 'Other', hint: '' },
];

export const LIFESTYLES = {
  lean: { label: 'Lean', mult: 0.75, hint: 'Spend 25% less than your planned retirement budget' },
  regular: { label: 'Regular', mult: 1, hint: 'Your planned retirement budget as entered' },
  fat: { label: 'Fat', mult: 1.5, hint: 'Spend 50% more: frequent travel, upgrades' },
};

export const DEFAULTS = {
  // You
  age: 30,
  retAge: 45,
  lifeExp: 85,
  lifestyle: 'regular',

  // Income & savings
  income: 200000, // monthly take-home
  corpus: 2500000, // investable corpus outside EPF/PPF/NPS
  sip: 60000, // monthly
  stepUp: 10, // % per year

  // Retirement accounts
  epfBal: 800000,
  epfMonthly: 14400, // employee + employer
  epfRate: 8.25,
  epfAge: 58,
  ppfBal: 300000,
  ppfYearly: 150000,
  ppfRate: 7.1,
  ppfAge: 45,
  npsBal: 200000,
  npsMonthly: 5000,
  npsRate: 10,
  npsAge: 60,
  npsAnnuityPct: 40,
  annuityRate: 6,

  // Expenses (monthly, today's money). mode: same | gone | custom
  expenses: [
    { id: 'home', amt: 30000, mode: 'same', custom: 0 },
    { id: 'housing', amt: 20000, mode: 'gone', custom: 0 },
    { id: 'utilities', amt: 5000, mode: 'custom', custom: 6000 },
    { id: 'commute', amt: 5000, mode: 'gone', custom: 0 },
    { id: 'kids', amt: 8000, mode: 'custom', custom: 12000 },
    { id: 'leisure', amt: 5000, mode: 'custom', custom: 8000 },
    { id: 'travel', amt: 3000, mode: 'custom', custom: 8000 },
    { id: 'other', amt: 2000, mode: 'same', custom: 0 },
  ],

  // Health (yearly, today's money)
  healthPremium: 30000,
  medicalOOP: 20000,
  medInf: 12,

  // Family
  children: [{ age: 3, eduCost: 1500000, eduAge: 18, wedCost: 2500000, wedAge: 27 }],
  eduInf: 10,
  wedInf: 8,
  parentMonthly: 10000,
  parentInf: 8,
  parentYears: 15,

  // Big recurring costs (today's money)
  recurring: [
    { name: 'Car', amt: 800000, every: 8, from: 45, to: 77 },
    { name: 'Home repairs', amt: 500000, every: 10, from: 50, to: 80 },
  ],

  // Other income (monthly, today's money)
  incomes: [{ name: 'Consulting', monthly: 30000, from: 45, to: 55, growth: 6 }],

  // Emergency buffer, kept aside at retirement
  buffer: 2500000,

  // Assumptions
  inflation: 7,
  preRet: 11,

  // Buckets
  b1Years: 3,
  b2Years: 5,
  b1Ret: 6.5,
  b2Ret: 8,
  b3Ret: 12,
  b1Tax: 25, // share of returns lost to tax
  b2Tax: 20,
  b3Tax: 10,

  // Withdrawal strategy
  strategy: 'fixed', // fixed | guardrails
  guardBand: 20,
  guardAdj: 10,
  downturnCut: 0,

  // Simulation
  mcOn: true,
  mcRuns: 2000,
  eqVol: 18,
  simBase: 'projected', // projected | target
  confidence: 0, // 0 = average returns, else share of simulated markets
};

export function newChild() {
  return { age: 5, eduCost: 1500000, eduAge: 18, wedCost: 2500000, wedAge: 27 };
}
export function newRecurring(retAge) {
  return { name: 'New cost', amt: 200000, every: 5, from: retAge, to: retAge + 30 };
}
export function newIncome(retAge) {
  return { name: 'Side income', monthly: 20000, from: retAge, to: retAge + 10, growth: 5 };
}
