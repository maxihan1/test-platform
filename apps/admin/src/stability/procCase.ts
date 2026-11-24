// 프로시저 실행 단위에 한 벌 남은 오류를 그 단위의 케이스 하나에 붙인다 — logcat 은 흐름이 깨진 케이스에, 게임 Exception 은 시각으로 (도메인/안정화 §3.15 「테스트 프로시저」)

import { 판정아닌까닭을가른다 } from '../execution/notVerdict.js';

export interface 단위케이스 {
  status: string;
  message: string | null;
  /** 시작한 케이스만 넘기므로 늘 차 있다 */
  caseStartedAt: string;
  단계: readonly { seq: number; startedAt: string | null }[];
}

/**
 * 흐름이 멈춘 케이스 — 흐름이 멈추면 뒤 케이스는 시작하지 않으니 시작한 케이스 중 마지막이고, 판정은 실패 · 제한 시간 초과 · 자기 준비 구간에서 깨진 Blocked 다.
 * 판정 확인만 틀린 실패는 흐름을 안 멈춰(공통/2 §4 「계속 간다」) 앞에 실패가 있어도 마지막 케이스를 본다.
 * 마지막이 통과면 끝까지 갔다 — 첫 케이스에 붙인다. logcat 은 폰 시각이라 서버 시각에 못 맞춰 케이스는 어림이다
 */
export function 깨진케이스<T extends 단위케이스>(시작한: readonly [T, ...T[]]): T {
  const 마지막 = 시작한[시작한.length - 1]!;
  const 까닭 = 판정아닌까닭을가른다(마지막.status, 마지막.message);
  return 마지막.status === 'FAIL' || 까닭 === 'TIMEOUT' || 까닭 === 'BLOCKED' ? 마지막 : 시작한[0];
}

/**
 * 오류 시각(`occurredAt` · UTC) 이상인 마지막 절차 시작의 케이스와 단계. 절차 시작이 다 늦거나 없으면 케이스 시작 시각으로 케이스만 맞추고 단계는 비운다.
 * 그 절차 뒤 오류 전에 다음 케이스가 시작했으면 그 케이스의 준비 구간에서 난 것이라 그 케이스에 붙이고 단계는 비운다.
 * 그것도 안 맞거나 시각이 없으면(옛 SDK) logcat 과 같이 깨진 케이스다. 시각이 같으면 뒤 차례가 이긴다 — 넘기는 차례가 프로시저 안 차례다
 */
export function 시각으로붙인다<T extends 단위케이스>(때: string | null, 시작한: readonly [T, ...T[]]): { 케이스: T; seq: number | null } {
  const 오류때 = 때 === null ? Number.NaN : Date.parse(때);
  if (!Number.isNaN(오류때)) {
    let 절차: { 케이스: T; seq: number; 시작: number } | null = null;
    let 케이스: { 케이스: T; 시작: number } | null = null;
    for (const c of 시작한) {
      const 케이스시작 = Date.parse(c.caseStartedAt);
      if (케이스시작 <= 오류때 && (케이스 === null || 케이스시작 >= 케이스.시작)) 케이스 = { 케이스: c, 시작: 케이스시작 };
      for (const s of c.단계) {
        const 시작 = s.startedAt === null ? Number.NaN : Date.parse(s.startedAt);
        if (시작 <= 오류때 && (절차 === null || 시작 >= 절차.시작)) 절차 = { 케이스: c, seq: s.seq, 시작 };
      }
    }
    if (케이스 !== null) return { 케이스: 케이스.케이스, seq: 절차?.케이스 === 케이스.케이스 ? 절차.seq : null };
    if (절차 !== null) return { 케이스: 절차.케이스, seq: 절차.seq };
  }
  return { 케이스: 깨진케이스(시작한), seq: null };
}
