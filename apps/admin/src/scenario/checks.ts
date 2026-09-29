// 저장된 조립을 지금 카탈로그에 대 본다 — 「확인 필요」와 실행 가능 여부 (SPEC 도메인/시나리오 §3.7 결정 8)
// 목록·상세를 줄 때마다 계산한다. 스캔 때 따로 적어 두면 들고 있을 상태가 는다

import type { ScenarioPart } from '@platform/kit';

import type { 카탈로그 } from './validate.js';

export interface 점검줄 {
  seq: number;
  reason: 'STEP_GONE' | 'CASE_INACTIVE';
}

export interface 점검결과 {
  checks: 점검줄[];
  needsCheck: boolean;
  runnable: boolean;
}

export function 점검(parts: ScenarioPart[], 재료: 카탈로그): 점검결과 {
  const checks: 점검줄[] = [];
  parts.forEach((p, i) => {
    if (p.kind !== 'case') return;
    const 케이스 = 재료.get(p.tcId);
    if (케이스 === undefined || !케이스.isActive) checks.push({ seq: i + 1, reason: 'CASE_INACTIVE' });
    // 사라진 제목은 무시하고 실행한다 — 느려질 뿐 틀리지 않는다
    else if (p.skipSteps.some((제목) => !케이스.skippable.includes(제목))) checks.push({ seq: i + 1, reason: 'STEP_GONE' });
  });
  return {
    checks,
    needsCheck: checks.length > 0,
    runnable: !checks.some((c) => c.reason === 'CASE_INACTIVE'),
  };
}
