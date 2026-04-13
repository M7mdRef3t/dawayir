/**
 * Dawayir SDK — Analytics Engine
 * Pure functions for cognitive relational mapping analysis.
 */

import type { DawayirNode, Ring } from "./types";

export interface AnalyticNode {
  ring: string;
  archived?: boolean;
  isNodeArchived?: boolean;
  detachmentMode?: boolean;
  isDetached?: boolean;
  recoveryProgress?: {
    ruminationLogCount?: number;
    pathStage?: string;
    boundaryLegitimacyScore?: number;
    completedSteps?: any[];
  };
  missionProgress?: {
    isCompleted?: boolean;
  };
}

export interface TelemetryPulse {
  timestamp: number;
  mood: string;
  energy: number;
}

export interface TelemetrySignal {
  timestamp: number;
  type: string;
  payload?: any;
}

export interface TelemetryJourneyEvent {
  timestamp: number;
  type: string;
  payload?: any;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
export const WINDOW_MS = 7 * DAY_MS;
const BUCKET_MS = 6 * HOUR_MS;
const BUCKET_COUNT = WINDOW_MS / BUCKET_MS; // 28 buckets

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function isUnstableMood(mood: string): boolean {
  return mood === "anxious" || mood === "angry" || mood === "sad" || mood === "tense" || mood === "overwhelmed";
}

function isLateNight(timestamp: number): boolean {
  const hour = new Date(timestamp).getHours();
  return hour >= 22 || hour < 5;
}

function toBucketIndex(timestamp: number, now: number): number {
  const age = now - timestamp;
  if (age < 0 || age > WINDOW_MS) return -1;
  const fromNewest = Math.floor(age / BUCKET_MS);
  return BUCKET_COUNT - 1 - fromNewest;
}

type StageValue = "awareness" | "resistance" | "acceptance" | "integration";

function normalizePathStage(stage: unknown): StageValue {
  if (stage === "integration") return "integration";
  if (stage === "acceptance") return "acceptance";
  if (stage === "resistance") return "resistance";
  return "awareness";
}

function stageScore(stage: StageValue): number {
  if (stage === "integration") return 1;
  if (stage === "acceptance") return 0.72;
  if (stage === "resistance") return 0.38;
  return 0.16;
}

function signalWeight(signal: TelemetrySignal): number {
  switch (signal.type) {
    case "ring_changed":
      return 2.2;
    case "detachment_toggled":
      return signal.payload?.value === true ? 2.8 : -1;
    case "symptoms_updated":
      return 1.3;
    case "situation_logged":
      return 1.6;
    case "path_stage_changed": {
      const next = signal.payload?.toStage;
      if (next === "acceptance" || next === "integration") return -1.8;
      if (next === "resistance") return 1.1;
      return 0.5;
    }
    case "node_added":
      return 0.8;
    default:
      return 0;
  }
}

function journeyEventWeight(event: TelemetryJourneyEvent): number {
  if (event.type === "task_completed") return -1.2;
  if (event.type === "task_started") return 0.4;
  if (event.type === "path_regenerated") return 0.8;
  if (event.type === "mood_logged") return event.payload?.moodScore <= 4 ? 1.2 : -0.4;
  if (event.type !== "flow_event") return 0;

  const flowStep = event.payload?.step;
  if (flowStep === "pulse_abandoned") return 2;
  if (flowStep === "next_step_dismissed") return 1.2;
  if (flowStep === "pulse_completed") return -0.9;
  if (flowStep === "next_step_action_taken") return -1;
  return 0;
}

function pulseWeight(entry: TelemetryPulse): number {
  const moodWeight = isUnstableMood(entry.mood) ? 1.8 : -0.4;
  const energyWeight = entry.energy <= 4 ? 1.2 : entry.energy >= 7 ? -0.6 : 0.2;
  return moodWeight + energyWeight;
}

export function buildStressSeries(
  signals: TelemetrySignal[],
  pulses: TelemetryPulse[],
  journeyEvents: TelemetryJourneyEvent[],
  now: number
): number[] {
  const series = Array.from({ length: BUCKET_COUNT }, () => 0);

  for (const signal of signals) {
    const index = toBucketIndex(signal.timestamp, now);
    if (index >= 0) series[index] += signalWeight(signal);
  }

  for (const pulse of pulses) {
    const index = toBucketIndex(pulse.timestamp, now);
    if (index >= 0) series[index] += pulseWeight(pulse);
  }

  for (const event of journeyEvents) {
    const index = toBucketIndex(event.timestamp, now);
    if (index >= 0) series[index] += journeyEventWeight(event);
  }

  return series;
}

function correlationWithLag(series: number[], lag: number): number {
  if (lag <= 0 || lag >= series.length - 2) return 0;
  const left = series.slice(0, series.length - lag);
  const right = series.slice(lag);
  const leftMean = average(left);
  const rightMean = average(right);

  let numerator = 0;
  let leftVar = 0;
  let rightVar = 0;
  for (let i = 0; i < left.length; i += 1) {
    const l = left[i] - leftMean;
    const r = right[i] - rightMean;
    numerator += l * r;
    leftVar += l * l;
    rightVar += r * r;
  }
  if (leftVar === 0 || rightVar === 0) return 0;
  return numerator / Math.sqrt(leftVar * rightVar);
}

export function computePulseInstability(pulses: TelemetryPulse[], now: number): number {
  const recent = pulses
    .filter((entry) => now - entry.timestamp <= WINDOW_MS)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (recent.length < 2) return 0;

  let points = 0;
  for (let i = 0; i < recent.length; i += 1) {
    const current = recent[i];
    if (isUnstableMood(current.mood)) points += 1;
    if (i > 0) {
      const previous = recent[i - 1];
      if (Math.abs(current.energy - previous.energy) >= 3) points += 1;
      if (current.mood !== previous.mood) points += 0.6;
    }
  }

  const maxPoints = recent.length * 2.2;
  return clamp(points / maxPoints, 0, 1);
}

function computeSessionHesitation(events: TelemetryJourneyEvent[]): number {
  const flowEvents = events.filter((event) => event.type === "flow_event");
  if (flowEvents.length === 0) return 0;

  let abandoned = 0;
  let longDwell = 0;
  let dwellCount = 0;
  for (const event of flowEvents) {
    if (event.payload?.step === "pulse_abandoned") abandoned += 1;
    const dwell = event.payload?.extra?.dwellTime;
    if (typeof dwell === "number") {
      dwellCount += 1;
      if (dwell >= 45_000) longDwell += 1;
    }
  }

  const abandonmentRatio = abandoned / flowEvents.length;
  const longDwellRatio = dwellCount === 0 ? 0 : longDwell / dwellCount;
  return clamp(abandonmentRatio * 0.7 + longDwellRatio * 0.3, 0, 1);
}

function computeTaskCompletion(events: TelemetryJourneyEvent[]): number {
  const started = events.filter((event) => event.type === "task_started").length;
  const completed = events.filter((event) => event.type === "task_completed").length;
  if (started === 0) return completed > 0 ? 1 : 0;
  return clamp(completed / started, 0, 1);
}

function computeShadowIntensity(shadowScores: Record<string, { score: number }>): number {
  const values = Object.values(shadowScores);
  if (values.length === 0) return 0;
  return clamp(average(values.map((s) => s.score)) / 100, 0, 1);
}

function ringRatios(nodes: AnalyticNode[]): { red: number; yellow: number; detached: number } {
  const active = nodes.filter((n) => !n.archived && !n.isNodeArchived);
  if (active.length === 0) return { red: 0, yellow: 0, detached: 0 };
  const red = active.filter((n) => n.ring === "red").length / active.length;
  const yellow = active.filter((n) => n.ring === "yellow").length / active.length;
  const detached = active.filter((n) => n.detachmentMode || n.isDetached).length / active.length;
  return { red, yellow, detached };
}

function computeRuminationNorm(nodes: AnalyticNode[]): number {
  const active = nodes.filter((n) => !n.archived && !n.isNodeArchived);
  if (active.length === 0) return 0;
  const total = active.reduce((sum, n) => sum + (n.recoveryProgress?.ruminationLogCount ?? 0), 0);
  return clamp(total / (active.length * 8), 0, 1);
}

function computeBoundaryMean(nodes: AnalyticNode[]): number {
  const values = nodes
    .filter((n) => !n.archived && !n.isNodeArchived)
    .map((n) => n.recoveryProgress?.boundaryLegitimacyScore)
    .filter((s): s is number => typeof s === "number");
  if (values.length === 0) return 0;
  return clamp(average(values) / 100, 0, 1);
}

function computeStageMaturity(nodes: AnalyticNode[]): number {
  const stages = nodes
    .filter((n) => !n.archived && !n.isNodeArchived)
    .map((n) => normalizePathStage(n.recoveryProgress?.pathStage));
  if (stages.length === 0) return 0;
  return average(stages.map(stageScore));
}

function computeCompletionRatio(nodes: AnalyticNode[]): number {
  const active = nodes.filter((n) => !n.archived && !n.isNodeArchived);
  if (active.length === 0) return 0;
  const completed = active.reduce((sum, n) => sum + (n.recoveryProgress?.completedSteps?.length ?? 0), 0);
  return clamp(completed / (active.length * 6), 0, 1);
}

function computeMissionCompletion(nodes: AnalyticNode[]): number {
  const active = nodes.filter((n) => !n.archived && !n.isNodeArchived);
  if (active.length === 0) return 0;
  const completed = active.filter((n) => n.missionProgress?.isCompleted === true).length;
  return clamp(completed / active.length, 0, 1);
}

function safeRound(value: number): number {
  return Math.round(value * 100) / 100;
}

export type HiddenPatternKind = "recurrence_wave" | "late_night_replay" | "escalation_burst";

export interface HiddenPatternSignal {
  kind: HiddenPatternKind;
  label: string;
  confidence: number;
  periodHours: number;
}

export interface RelationshipFlowVector {
  inflow: number;
  outflow: number;
  netFlux: number;
  stability: number;
  oscillationIndex: number;
  dominantFrequencyHours: number | null;
}

export interface PainFieldMetrics {
  painFieldIntensity: number;
  baselinePain: number;
  recoveryMomentum: number;
  painDividend: number;
}

export type TwinScenarioId = "no_action" | "micro_regulation" | "soft_boundary" | "targeted_reflection" | "mission_focus";

export interface TwinScenario {
  id: TwinScenarioId;
  label: string;
  expectedPainDelta: number;
  predictedPain: number;
  confidence: number;
}

export interface DigitalTwinDecision {
  recommended: TwinScenario;
  scenarios: TwinScenario[];
  rationaleCodes: string[];
}

export interface RelationalFieldSnapshot {
  generatedAt: number;
  flow: RelationshipFlowVector;
  hiddenPattern: HiddenPatternSignal | null;
  pain: PainFieldMetrics;
  twin: DigitalTwinDecision;
}

export interface BuildRelationalFieldInput {
  now?: number;
  nodes: AnalyticNode[];
  pulses: TelemetryPulse[];
  signals: TelemetrySignal[];
  journeyEvents: TelemetryJourneyEvent[];
  shadowScores?: Record<string, { score: number }>;
  entropyScore?: number;
}

export function detectHiddenPattern(
  series: number[],
  pulses: TelemetryPulse[],
  now: number
): HiddenPatternSignal | null {
  const candidates: HiddenPatternSignal[] = [];
  const oscillation = standardDeviation(series);

  let bestLag = -1;
  let bestScore = -1;
  let bestCorrelation = -1;
  for (let lag = 2; lag <= 12; lag += 1) {
    const correlation = correlationWithLag(series, lag);
    const score = correlation - lag * 0.01;
    if (score > bestScore) {
      bestScore = score;
      bestCorrelation = correlation;
      bestLag = lag;
    }
  }
  if (bestLag > 0 && bestCorrelation >= 0.38 && oscillation >= 0.35) {
    candidates.push({
      kind: "recurrence_wave",
      label: `Stress wave repeats every ${bestLag * 6}h`,
      confidence: clamp(bestCorrelation, 0, 0.95),
      periodHours: bestLag * 6
    });
  }

  const recentPulses = pulses.filter((entry) => now - entry.timestamp <= WINDOW_MS);
  const unstable = recentPulses.filter((entry) => isUnstableMood(entry.mood));
  const lateNightUnstable = unstable.filter((entry) => isLateNight(entry.timestamp));
  if (unstable.length >= 4) {
    const ratio = lateNightUnstable.length / unstable.length;
    if (ratio >= 0.45) {
      candidates.push({
        kind: "late_night_replay",
        label: "Stress reactivates late at night",
        confidence: clamp(0.48 + ratio * 0.45, 0, 0.92),
        periodHours: 24
      });
    }
  }

  const quarter = Math.max(4, Math.floor(series.length / 4));
  const older = average(series.slice(0, quarter));
  const recent = average(series.slice(series.length - quarter));
  const burstDelta = recent - older;
  if (burstDelta >= 1.35) {
    candidates.push({
      kind: "escalation_burst",
      label: "Escalation bursts are intensifying",
      confidence: clamp(0.45 + burstDelta / 6, 0, 0.9),
      periodHours: 12
    });
  }

  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => b.confidence - a.confidence)[0];
}

export function buildFlowVector(
  nodes: AnalyticNode[],
  pulseInstability: number,
  hesitation: number,
  shadowIntensity: number,
  hiddenPattern: HiddenPatternSignal | null,
  series: number[]
): RelationshipFlowVector {
  const rings = ringRatios(nodes);
  const rumination = computeRuminationNorm(nodes);
  const completion = computeCompletionRatio(nodes);
  const mission = computeMissionCompletion(nodes);
  const boundary = computeBoundaryMean(nodes);
  const maturity = computeStageMaturity(nodes);
  const oscillation = clamp(standardDeviation(series) / 4.5, 0, 1);

  const inflow = clamp(
    rings.red * 0.42 +
      rings.yellow * 0.18 +
      rings.detached * 0.2 +
      rumination * 0.1 +
      pulseInstability * 0.18 +
      shadowIntensity * 0.12,
    0,
    1
  );
  const outflow = clamp(
    completion * 0.35 +
      mission * 0.18 +
      boundary * 0.2 +
      maturity * 0.17 +
      (1 - hesitation) * 0.1,
    0,
    1
  );
  const netFlux = clamp(inflow - outflow, -1, 1);
  const stability = clamp(1 - Math.abs(netFlux) - oscillation * 0.3, 0, 1);

  return {
    inflow: safeRound(inflow),
    outflow: safeRound(outflow),
    netFlux: safeRound(netFlux),
    stability: safeRound(stability),
    oscillationIndex: safeRound(oscillation),
    dominantFrequencyHours: hiddenPattern?.periodHours ?? null
  };
}

export function computePainMetrics(input: {
  nodes: AnalyticNode[];
  pulseInstability: number;
  hesitation: number;
  shadowIntensity: number;
  entropyScore: number;
  signals: TelemetrySignal[];
  series: number[];
  flow: RelationshipFlowVector;
  journeyEvents: TelemetryJourneyEvent[];
}): PainFieldMetrics {
  const rings = ringRatios(input.nodes);
  const rumination = computeRuminationNorm(input.nodes);
  const volatility = clamp(
    input.signals.filter((signal) => signal.type === "ring_changed").length /
      Math.max(4, input.nodes.filter((node) => !node.archived && !node.isNodeArchived).length * 2),
    0,
    1
  );
  const entropyNorm = clamp(input.entropyScore / 100, 0, 1);

  const painFieldIntensity = Math.round(
    clamp(
      rings.red * 0.32 +
        rings.detached * 0.16 +
        input.pulseInstability * 0.18 +
        rumination * 0.12 +
        input.shadowIntensity * 0.08 +
        entropyNorm * 0.1 +
        input.hesitation * 0.1 +
        volatility * 0.04,
      0,
      1
    ) * 100
  );

  const midpoint = Math.floor(input.series.length / 2);
  const olderStress = average(input.series.slice(0, midpoint));
  const recentStress = average(input.series.slice(midpoint));
  const trend = recentStress - olderStress;
  const improvementFromTrend = Math.max(0, -trend * 10);
  const baselinePain = Math.round(clamp(painFieldIntensity + improvementFromTrend, 0, 100));

  const taskCompleted = input.journeyEvents.filter((event) => event.type === "task_completed").length;
  const pulseAbandoned = input.journeyEvents.filter(
    (event) => event.type === "flow_event" && event.payload?.step === "pulse_abandoned"
  ).length;
  const stageUp = input.signals.filter(
    (signal) =>
      signal.type === "path_stage_changed" &&
      (signal.payload?.toStage === "acceptance" || signal.payload?.toStage === "integration")
  ).length;
  const stageDown = input.signals.filter(
    (signal) =>
      signal.type === "path_stage_changed" &&
      (signal.payload?.toStage === "awareness" || signal.payload?.toStage === "resistance")
  ).length;
  const redShifts = input.signals.filter(
    (signal) => signal.type === "ring_changed" && signal.payload?.toRing === "red"
  ).length;
  const greenShifts = input.signals.filter(
    (signal) => signal.type === "ring_changed" && signal.payload?.toRing === "green"
  ).length;

  const recoveryMomentumRaw =
    taskCompleted * 5 +
      stageUp * 7 +
      greenShifts * 4 -
      pulseAbandoned * 5 -
      stageDown * 4 -
      redShifts * 4 -
      input.hesitation * 15 -
      Math.max(0, input.flow.netFlux) * 12 +
      Math.max(0, input.flow.outflow - input.flow.inflow) * 10;
  const recoveryMomentum = Math.round(clamp(recoveryMomentumRaw, -100, 100));

  const painDividend = Math.round(
    clamp((baselinePain - painFieldIntensity) * 1.2 + Math.max(0, recoveryMomentum) * 0.35, 0, 100)
  );

  return { painFieldIntensity, baselinePain, recoveryMomentum, painDividend };
}

export function buildTwinDecision(input: {
  pain: PainFieldMetrics;
  flow: RelationshipFlowVector;
  hiddenPattern: HiddenPatternSignal | null;
  pulseInstability: number;
  hesitation: number;
  nodes: AnalyticNode[];
  journeyEvents: TelemetryJourneyEvent[];
}): DigitalTwinDecision {
  const rings = ringRatios(input.nodes);
  const taskCompletion = computeTaskCompletion(input.journeyEvents);
  const rumination = computeRuminationNorm(input.nodes);
  const pressure = input.pain.painFieldIntensity / 100;
  const friction = Math.max(0, input.flow.netFlux);
  const recurrenceBoost = input.hiddenPattern?.kind === "recurrence_wave" ? 1.2 : 1;

  const baseScenarios: Omit<TwinScenario, "predictedPain">[] = [
    {
      id: "no_action",
      label: "No intervention",
      expectedPainDelta: Math.round(4 + pressure * 9 + friction * 6),
      confidence: 0.88
    },
    {
      id: "micro_regulation",
      label: "90s regulation reset",
      expectedPainDelta: -Math.round((5 + input.pulseInstability * 8 + input.hesitation * 4) * recurrenceBoost),
      confidence: clamp(0.55 + input.pulseInstability * 0.28, 0.35, 0.93)
    },
    {
      id: "soft_boundary",
      label: "Soft boundary with top stress node",
      expectedPainDelta: -Math.round((6 + rings.red * 14 + rings.detached * 8) * recurrenceBoost),
      confidence: clamp(0.52 + (rings.red + rings.detached) * 0.35, 0.35, 0.94)
    },
    {
      id: "targeted_reflection",
      label: "Targeted reflective log",
      expectedPainDelta: -Math.round(4 + rumination * 8 + (input.hiddenPattern ? 2 : 0)),
      confidence: clamp(0.5 + rumination * 0.3, 0.3, 0.88)
    },
    {
      id: "mission_focus",
      label: "Single mission step in 12h",
      expectedPainDelta: -Math.round(3 + Math.max(0, 1 - taskCompletion) * 9),
      confidence: clamp(0.45 + (1 - taskCompletion) * 0.32, 0.3, 0.86)
    }
  ];

  const scenarios: TwinScenario[] = baseScenarios.map((scenario) => ({
    ...scenario,
    predictedPain: Math.round(clamp(input.pain.painFieldIntensity + scenario.expectedPainDelta, 0, 100))
  }));

  const recommended = [...scenarios].sort((a, b) => {
    if (a.predictedPain === b.predictedPain) return b.confidence - a.confidence;
    return a.predictedPain - b.predictedPain;
  })[0];

  const rationaleCodes: string[] = [];
  if (input.pain.painFieldIntensity >= 65) rationaleCodes.push("high_pain_field");
  if (input.flow.netFlux > 0.2) rationaleCodes.push("inflow_overload");
  if (input.hesitation >= 0.45) rationaleCodes.push("session_hesitation");
  if (input.hiddenPattern) rationaleCodes.push(input.hiddenPattern.kind);
  if (input.pain.recoveryMomentum >= 20) rationaleCodes.push("momentum_available");
  if (rationaleCodes.length === 0) rationaleCodes.push("steady_field");

  return { recommended, scenarios, rationaleCodes };
}

export function buildRelationalFieldSnapshot(input: BuildRelationalFieldInput): RelationalFieldSnapshot {
  const now = input.now ?? Date.now();
  
  // Sort and limit in the wrapper to avoid heavy operations, or assume callers pass limited arrays.
  // For safety, assume callers handles sorting and limiting, we just execute the math.
  const nodes = input.nodes;
  const pulses = input.pulses;
  const signals = input.signals;
  const journeyEvents = input.journeyEvents;
  const shadowScores = input.shadowScores ?? {};

  const series = buildStressSeries(signals, pulses, journeyEvents, now);
  const hiddenPattern = detectHiddenPattern(series, pulses, now);
  const pulseInstability = computePulseInstability(pulses, now);
  const hesitation = computeSessionHesitation(journeyEvents);
  const shadowIntensity = computeShadowIntensity(shadowScores);
  const entropyScore = input.entropyScore ?? 10; // default entropy

  const flow = buildFlowVector(nodes, pulseInstability, hesitation, shadowIntensity, hiddenPattern, series);
  const pain = computePainMetrics({
    nodes,
    pulseInstability,
    hesitation,
    shadowIntensity,
    entropyScore,
    signals,
    series,
    flow,
    journeyEvents
  });
  const twin = buildTwinDecision({
    pain,
    flow,
    hiddenPattern,
    pulseInstability,
    hesitation,
    nodes,
    journeyEvents
  });

  return {
    generatedAt: now,
    flow,
    hiddenPattern,
    pain,
    twin
  };
}

export function interpretPainLevel(intensity: number): {
  label: string;
  color: string;
  action: string;
} {
  if (intensity >= 80) {
    return {
      label: "حرج",
      color: "var(--color-danger)",
      action: "اتخاذ إجراء فوري مطلوب",
    };
  }
  if (intensity >= 60) {
    return {
      label: "مرتفع",
      color: "var(--color-warning)",
      action: "مراجعة خطة التعافي",
    };
  }
  if (intensity >= 40) {
    return {
      label: "متوسط",
      color: "var(--color-caution)",
      action: "المتابعة اليومية كافية",
    };
  }
  return {
    label: "منخفض",
    color: "var(--color-success)",
    action: "استمر في نهجك الحالي",
  };
}

export function summarizeTwinRecommendation(snapshot: RelationalFieldSnapshot): string {
  const { recommended } = snapshot.twin;
  const painLabel = interpretPainLevel(snapshot.pain.painFieldIntensity).label;

  const actionMap: Record<string, string> = {
    no_action: "لا يوجد إجراء مطلوب حالياً",
    micro_regulation: "جلسة تنظيم 90 ثانية موصى بها",
    soft_boundary: "وضع حدود ناعمة مع أكثر الأشخاص استنزافاً",
    targeted_reflection: "كتابة تأمل موجه الآن",
    mission_focus: "ركز على خطوة واحدة من مهمتك",
  };

  return `[${painLabel}] ${actionMap[recommended.id] ?? recommended.label}`;
}
