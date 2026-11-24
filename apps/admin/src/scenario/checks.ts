// 저장된 조립을 지금 카탈로그에 대 본다 — 「확인 필요」와 실행 가능 여부 (SPEC 도메인/시나리오 §3.7 결정 8)
// 목록·상세를 줄 때마다 계산한다. 스캔 때 따로 적어 두면 들고 있을 상태가 는다

import type { ScenarioPart } from '@platform/kit';

import { 제한시간크기사유, 프로시저수, type 카탈로그 } from './validate.js';

export interface 점검줄 {
  seq: number;
  reason: 'STEP_GONE' | 'CASE_INACTIVE' | 'PROC_DUP' | 'PROC_SKIP';
}

export interface 점검결과 {
  checks: 점검줄[];
  needsCheck: boolean;
  runnable: boolean;
}

export function 점검(parts: ScenarioPart[], 재료: 카탈로그): 점검결과 {
  const checks: 점검줄[] = [];
  const 본프로시저 = new Set<string>();
  parts.forEach((p, i) => {
    if (p.kind !== 'case') return;
    const 케이스 = 재료.get(p.tcId);
    if (케이스 === undefined || !케이스.isActive) {
      checks.push({ seq: i + 1, reason: 'CASE_INACTIVE' });
      return;
    }
    if (케이스.proc !== undefined) {
      // 둘 다 실행은 그대로 된다 — 같은 프로시저가 두 번 돌아 느려질 뿐이고 저장해 둔 건너뛸 제목은 무시한다 (결정 17)
      if (본프로시저.has(케이스.proc.procId)) checks.push({ seq: i + 1, reason: 'PROC_DUP' });
      if (p.skipSteps.length > 0) checks.push({ seq: i + 1, reason: 'PROC_SKIP' });
      본프로시저.add(케이스.proc.procId);
    }
    // 사라진 제목은 무시하고 실행한다 — 느려질 뿐 틀리지 않는다
    else if (p.skipSteps.some((제목) => !케이스.skippable.includes(제목))) checks.push({ seq: i + 1, reason: 'STEP_GONE' });
  });
  return {
    checks,
    needsCheck: checks.length > 0,
    // 옛 버전은 되돌리기로 60분·크기 규칙을 안 거치고 들어온다 — 러너 400 으로 쓰레기 실행이 남지 않게 여기서 막는다
    runnable: !checks.some((c) => c.reason === 'CASE_INACTIVE') && 제한시간크기사유(parts, 프로시저수(재료)).length === 0,
  };
}
