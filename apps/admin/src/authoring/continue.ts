// 남은 요구로 이어 작성 — 원본 뿌리의 상태 판정 · 상세 칸 (SPEC 도메인/작성 §3.6 「★ 원장」 「남은 요구로 이어 작성」 · §7)
// 반영 끝난 작성 요청의 「다음 요청」 · 「빠짐」 번호를 새 작성 요청(새 번호 · 새 PR)이 맡는다

import type { FastifyReply } from 'fastify';

import { 행커버리지 } from './coverage.js';
import { 최신실행, 뿌리잠그고 } from './history.js';
import { 역방향칸판정 } from './reverse.js';
import { db, 한건, type 요청 } from './store.js';

/**
 * 반영된 실행의 셈이 말하는 남은 요구. `모름` 은 셈이 없는 옛 요청이다 — 막지 않고 에이전트가 main 표로 다시 센다.
 * 셈은 사본이라 사람이 표를 고치면 낡는다 — 여기서는 「남은 것이 없다」가 확실할 때만 막는다
 */
export type 남은요구 = '있음' | '없음' | '원장없음' | '모름';

export interface 이어작성상태 {
  /** 뿌리의 최신 실행(실패한 머지는 뺀다)이 성공한 반영인가 — GitHub 에서 직접 병합한 것은 반영을 한 번 눌러야 선다(게이트 0) */
  병합됨: boolean;
  남음: 남은요구;
  /** 원본에 사람이 넣은 자료가 있나 — 본문만 있는 옛 행 · 화면만은 원장을 못 만들어 이어 작성할 번호가 없다 */
  입력있음: boolean;
  /** 폐기 안 된 이어 작성 요청 번호 — 한 원본에 하나뿐이다(유일 색인) */
  이은것: number | null;
}

function 남은것(result: unknown): 남은요구 {
  const 셈 = 행커버리지(result);
  if (셈 === null) return '모름';
  if ('none' in 셈) return '원장없음';
  return 셈.later.length + 셈.missing.length > 0 ? '있음' : '없음';
}

/** 뿌리 번호로 읽는다. 어느 실행 번호로 상세를 읽어도 같은 값이 나와야 한다 — 화면은 최신 실행 상세로 버튼을 그린다 */
export async function 이어작성상태읽기(뿌리번호: number): Promise<이어작성상태> {
  const 최신 = await 한건(await 최신실행(뿌리번호));
  const 병합됨 = 최신 !== null && 최신.kind === 'MERGE' && 최신.status === 'DONE';
  // 셈은 반영된 그 실행(머지의 원본) 것이다 — 머지 행에는 셈이 없다 (LEARNINGS 2026-09-30)
  const 반영된것 = 병합됨 && 최신.sourceId !== null ? await 한건(최신.sourceId) : null;
  const r = await (await db()).query<{ 입력: boolean; 이은것: string | null }>(
    `SELECT EXISTS (SELECT 1 FROM authoring_asset WHERE request_id = $1 AND role = 'INPUT') AS "입력",
            (SELECT id FROM authoring_request WHERE continue_from = $1 AND discarded_at IS NULL) AS "이은것"`,
    [뿌리번호],
  );
  const 줄 = r.rows[0]!;
  return {
    병합됨,
    남음: 반영된것 === null ? '모름' : 남은것(반영된것.result),
    입력있음: 줄.입력,
    이은것: 줄.이은것 === null ? null : Number(줄.이은것),
  };
}

/** 이어 작성을 막는 까닭. 없으면 null — 통로의 409 와 상세의 canContinue 가 같은 판정을 쓴다 */
export function 막는까닭(상태: 이어작성상태): 'NOT_MERGED' | 'ALREADY_CONTINUED' | 'NOTHING_LEFT' | null {
  if (!상태.병합됨) return 'NOT_MERGED';
  if (상태.이은것 !== null) return 'ALREADY_CONTINUED';
  if (!상태.입력있음 || 상태.남음 === '없음' || 상태.남음 === '원장없음') return 'NOTHING_LEFT';
  return null;
}

/** 상세에 싣는 두 칸. 권한은 화면이 본다 — canResume 과 같다 */
export async function 이어작성상세(뿌리번호: number): Promise<{ canContinue: boolean; continuedBy: number | null }> {
  const 상태 = await 이어작성상태읽기(뿌리번호);
  return { canContinue: 막는까닭(상태) === null, continuedBy: 상태.이은것 };
}

/**
 * 본문에 같이 오면 안 되는 칸. 자료 · 대조 설정은 원본 것을 물려받는다 — 재실행이 역방향 칸을 거절하는 것과 같은 코드다.
 * 원본 확인보다 먼저 본다 — 모양이 틀린 요청에 DB 를 읽지 않는다
 */
export function 같이온칸(본문: Record<string, unknown>): 'BAD_FIGMA_URL' | 'BAD_ENV' | null {
  const 피그마 = 본문.figma;
  if (피그마 !== undefined && !(Array.isArray(피그마) && 피그마.length === 0)) return 'BAD_FIGMA_URL';
  if (['compare', 'env', 'startUrl'].some((칸) => 본문[칸] !== undefined)) return 'BAD_ENV';
  return null;
}

/**
 * 원본(이미 서비스 경계를 본 행)에서 이어 작성 요청을 세운다. 병합 · 한 번만 · 남은 것 판정은 뿌리 잠금 안에서 —
 * 판정과 넣기 사이에 다른 누름이나 원본의 다시 작성이 끼면 두 요청이 같은 남은 번호를 맡는다
 */
export async function 이어작성세우기(
  reply: FastifyReply,
  입력: { 서비스: number; 원본: 요청; 누가: string; 이름: string },
): Promise<FastifyReply> {
  const { 원본 } = 입력;
  // 뿌리(작성 요청)만 받는다 — 화면은 rootId 를 보낸다. 실행 번호를 받아 주면 무엇을 물려받는지가 흐려진다
  if (원본.kind !== 'AUTHOR' || 원본.status === 'DRAFT' || 원본.discardedAt !== null) {
    return reply.code(409).send({ error: 'BAD_SOURCE', detail: `${원본.kind} ${원본.status}` });
  }
  const 결과 = await 뿌리잠그고(원본.id, async (): Promise<{ code: number; error: string } | { id: number }> => {
    const 까닭 = 막는까닭(await 이어작성상태읽기(원본.id));
    if (까닭 !== null) return { code: 409, error: 까닭 };
    // 대조 원본이면 같은 대상 서버 · 시작 주소를 물려받는다. 그 사이 계정이 빠졌을 수 있어 다시 판정한다 — 재실행과 같다
    const 대조 = 원본.compare
      ? await 역방향칸판정({ compare: true, env: 원본.env, startUrl: 원본.startUrl }, 입력.서비스)
      : ({ compare: false } as const);
    if ('error' in 대조) return { code: 400, error: 대조.error };
    throw new Error('자료 복사는 할 일 5');
  });
  if ('error' in 결과) return reply.code(결과.code).send({ error: 결과.error });
  return reply.code(201).send({ id: 결과.id });
}
