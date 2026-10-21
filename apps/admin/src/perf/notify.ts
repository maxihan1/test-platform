// 성능 실행이 끝났을 때 Slack 으로 알린다 — 정기 실행은 늘, 사람이 건 실행은 「성능 저하 알림」을 켜 둔 시나리오가 저하일 때만 (도메인/성능 §7 「정기 실행」 · 도메인/실행 §8.9)

import { 슬랙으로 } from '../execution/notify.js';
import { 실행번호글 } from './pdf.js';
import { 사유 } from './reasons.js';
import * as 표 from './store.js';

const 유형글: Record<string, string> = { LOAD: '부하 테스트', STRESS: '스트레스 테스트', SPIKE: '스파이크 테스트', SOAK: '내구성 테스트' };

export interface 알림재료 {
  id: number;
  scenarioName: string;
  status: string;
  verdict: 'PASS' | 'FAIL' | null;
  stopReason: string | null;
  testType: string | null;
  env: string;
  peakVus: number | null;
  p95Ms: number | null;
  errorRate: number | null;
  degraded: boolean;
}

/** 늘 보내는 쪽은 정기 실행뿐이다. 사람이 건 실행은 성능 저하 알림을 끄지 않았고(칸이 없으면 마법사 기본처럼 켬) 실제로 저하일 때만 보낸다 */
export function 알림보낼까(origin: 'MANUAL' | 'SCHEDULED', degradeAlert: boolean, degraded: boolean): boolean {
  return origin === 'SCHEDULED' || (degradeAlert && degraded);
}

// 색 막대를 쓰지 않는다. 판정은 글자로도 읽혀야 한다 (DESIGN.md). 판정이 없는 중단은 [중단], 고장은 [오류]
function 머리글(r: 알림재료): string {
  if (r.status === 'ERROR') return '[오류]';
  if (r.verdict === 'PASS') return '[통과]';
  if (r.verdict === 'FAIL') return '[실패]';
  return '[중단]';
}

export function 알림문장(r: 알림재료): string {
  const 숫자 = [
    유형글[r.testType ?? ''] ?? r.testType ?? '성능 테스트',
    r.env,
    ...(r.peakVus === null ? [] : [`최대 동시 사용자 ${r.peakVus}명`]),
    ...(r.p95Ms === null ? [] : [`95% 응답시간 ${(r.p95Ms / 1000).toFixed(1)}초`]),
    ...(r.errorRate === null ? [] : [`에러율 ${r.errorRate.toFixed(1)}%`]),
  ];
  const 첫줄 = `${머리글(r)}${r.degraded ? ' [성능 저하]' : ''} ${r.scenarioName} ${실행번호글(r.id)} · ${숫자.join(' · ')}`;
  return r.stopReason === null ? 첫줄 : `${첫줄}\n${사유[r.stopReason] ?? r.stopReason}`;
}

type 줄 = {
  status: string; verdict: 'PASS' | 'FAIL' | null; stop_reason: string | null; test_type: string | null; env: string; origin: 'MANUAL' | 'SCHEDULED';
  degraded: boolean | null; peak_vus: number | null; p95_ms: number | null; error_rate: string | null; name: string | null; alert: boolean | null; webhook: string | null;
};

/**
 * 끝쓰기에 성공한 실행의 알림을 보낸다. 웹훅이 없으면 안 보내고, 보내기 실패는 실행 결과와 상관없어 로그만 남긴다 — 재시도하지 않는다.
 * 보내는 쪽을 받는 것은 검사가 실제 Slack 을 부르지 않으려는 것이다
 */
export async function 성능알림(runId: number, 보내기: (웹훅: string, 글: string) => Promise<boolean> = 슬랙으로): Promise<boolean> {
  const r = await (await 표.풀()).query<줄>(
    `SELECT r.status, r.verdict, r.stop_reason, r.test_type, r.env, r.origin, r.degraded, r.peak_vus, r.p95_ms, r.error_rate,
            s.name, (v.body->'run'->>'degradeAlert')::boolean AS alert, svc.slack_webhook AS webhook
       FROM perf_run r
       JOIN service svc ON svc.id = r.service_id
       LEFT JOIN perf_scenario s ON s.id = r.scenario_id
       LEFT JOIN perf_scenario_version v ON v.scenario_id = r.scenario_id AND v.version = r.scenario_version
      WHERE r.id = $1`,
    [runId],
  );
  const x = r.rows[0];
  if (x === undefined || x.webhook === null || x.webhook === '') return false;
  if (!알림보낼까(x.origin, x.alert !== false, x.degraded === true)) return false;
  const 글 = 알림문장({
    id: runId, scenarioName: x.name ?? '', status: x.status, verdict: x.verdict, stopReason: x.stop_reason, testType: x.test_type, env: x.env,
    peakVus: x.peak_vus, p95Ms: x.p95_ms, errorRate: x.error_rate === null ? null : Number(x.error_rate), degraded: x.degraded === true,
  });
  try {
    if (await 보내기(x.webhook, 글)) return true;
    console.error(`성능 실행 ${runId} 의 Slack 알림을 Slack 이 받지 않았습니다`);
  } catch (e) {
    console.error(`성능 실행 ${runId} 의 Slack 알림을 보내지 못했습니다`, e);
  }
  return false;
}
