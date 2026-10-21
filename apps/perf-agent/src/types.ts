// 부하 발생 에이전트 ↔ QA Hub 통로의 요청 · 응답 꼴 (도메인/성능 §5.4)

export type AgentMode = 'LOAD' | 'MONITOR';

export interface HelloResponse {
  agentId: number;
  name: string;
  mode: AgentMode;
  serverTime: string;
}

export interface Job {
  runId: number;
  kind: 'SMOKE' | 'LOAD' | 'PAGE' | 'MONITOR';
  startAt: string;
  script: string | null;
  segment?: string;
  segmentSequence?: string;
  env: Record<string, string>;
  accountsCsv?: string;
  dummyClient?: { id: number; command: string; users: number };
  allowedHosts: string[];
  durationSec: number;
}

export interface TxSecond {
  name: string;
  requests: number;
  errors: number;
  hist: number[];
}

export interface Resource {
  name: string;
  type: 'document' | 'script' | 'css' | 'img' | 'api' | 'font' | 'other';
  startMs: number;
  durationMs: number;
  bytes: number;
}

// 페이지 한 번 연 표본. url 은 설정의 경로 그대로다
export interface PageSample {
  url: string;
  lcpMs: number | null;
  fcpMs: number | null;
  cls: number | null;
  ttfbMs: number | null;
  lcpElement: string | null;
  resources: Resource[];
}

export interface LoadSecond {
  sec: number;
  vus: number;
  txs: TxSecond[];
  pages?: PageSample[];
}

export interface MonitorSecond {
  sec: number;
  cpu: number;
  mem: number;
  diskIoKbps: number;
  netInKbps: number;
  netOutKbps: number;
}

export interface DoneBody {
  status: 'OK' | 'ERROR';
  reason?: string;
}
