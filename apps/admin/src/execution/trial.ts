// 「테스트 실행」·「시험 실행」 결과를 메모리에만 두는 보관소 — 실행 기록(test_run)을 만들지 않는다 (도메인/실행 §3.2 · 도메인/시나리오 §7)

import { randomUUID } from 'node:crypto';

import type { ExecuteResponse, ScenarioExecuteResponse } from '@platform/kit';

import { 가린값들 } from '../web/mask.js';

export type 시험읽기 = { status: 'RUNNING' } | { status: 'DONE'; result: ExecuteResponse };

export interface 시험명세 {
  paramSchema: unknown;
  expectedSchema: unknown;
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
}

export class TrialBusyError extends Error {
  readonly code = 'TRIAL_BUSY';
}

interface 항목<R> {
  사람: string;
  서비스: string;
  시작: number;
  결과: R | null;
}

interface 보관소설정<R, S extends string> {
  끝글자: S;
  바쁨문구: string;
  // 실행 함수가 던졌을 때 남길 결과. 사유 원문은 stack 칸으로 보낸다 — 사람이 읽는 문장은 안내 한 줄이다
  실패로: (사유: string, 걸린ms: number) => R;
}

const 하루 = 24 * 60 * 60 * 1000;
const 상한 = 50;
const 가림 = '********';

/** 그 명세의 비밀 칸 값들. 줄 세우기는 보관소가 한다 */
export function 비밀글자들(명세: 시험명세): string[] {
  const 모음 = (값: Record<string, unknown>, schema: unknown): string[] => {
    const 가림본 = 가린값들(값, schema);
    return Object.entries(값).flatMap(([k, v]) => (가림본[k] !== v && typeof v === 'string' && v !== '' ? [v] : []));
  };
  return [...모음(명세.params, 명세.paramSchema), ...모음(명세.expected, 명세.expectedSchema)];
}

// 긴 것부터 바꿔야 짧은 비밀이 긴 비밀의 일부일 때 조각이 남지 않는다
const 긴것부터 = (비밀: string[]): string[] => [...비밀].sort((a, b) => b.length - a.length);

function 가린다(값: unknown, 비밀: string[]): unknown {
  if (typeof 값 === 'string') return 비밀.reduce((글, s) => 글.replaceAll(s, 가림), 값);
  if (Array.isArray(값)) return 값.map((v) => 가린다(v, 비밀));
  if (typeof 값 === 'object' && 값 !== null) {
    return Object.fromEntries(Object.entries(값).map(([k, v]) => [k, 가린다(v, 비밀)]));
  }
  return 값;
}

/** 보관 규칙(24시간 · 사람당 1건 · 전체 50건 · 비밀값 가림)은 하나다. 결과 모양과 문구만 보관소마다 다르다 */
export function 시험보관소<R, S extends string>(설정: 보관소설정<R, S>) {
  // 프로세스가 죽으면 사라진다. 기록이 아니라 화면이 한 번 보고 갈 임시 결과라서 DB 에 안 둔다
  const 저장소 = new Map<string, 항목<R>>();

  function 치운다(지금: number): void {
    for (const [id, 항] of 저장소) if (지금 - 항.시작 > 하루) 저장소.delete(id);
    if (저장소.size < 상한) return;
    // Map 은 넣은 순서로 돈다. 돌고 있는 것은 버리지 않는다 — 결과가 갈 곳이 사라진다
    for (const [id, 항] of 저장소) {
      if (저장소.size < 상한) break;
      if (항.결과 !== null) 저장소.delete(id);
    }
  }

  // 남의 번호 · 없는 번호 · 24시간 지난 번호를 가르지 않는다 — 있는지도 알리지 않는다.
  // 지난 것은 새 시험이 와야 지워지므로 읽을 때도 시각을 본다 — 사진 폴더는 이미 치워졌을 수 있다
  function 내것(사람: string, id: string): 항목<R> | null {
    const 항 = 저장소.get(id);
    return 항 === undefined || 항.사람 !== 사람 || Date.now() - 항.시작 > 하루 ? null : 항;
  }

  return {
    /** 실행은 밖에서 넣는다. 번호를 실행에도 넘긴다(시나리오 사진 폴더 이름). 돌려주는 번호로 시작한 사람만 읽는다 */
    시작한다(사람: string, 서비스: string, 실행: (id: string) => Promise<R>, 비밀: string[]): string {
      const 지금 = Date.now();
      치운다(지금);
      if ([...저장소.values()].some((항) => 항.사람 === 사람 && 항.결과 === null)) {
        throw new TrialBusyError(설정.바쁨문구);
      }
      // 50건이 전부 돌고 있으면 버릴 것이 없다. 상한을 넘겨 받지 않고 거절한다
      if (저장소.size >= 상한) throw new TrialBusyError(설정.바쁨문구);

      const id = randomUUID();
      const 이것: 항목<R> = { 사람, 서비스, 시작: 지금, 결과: null };
      저장소.set(id, 이것);
      // 부품 여럿에서 모은 비밀은 이어 붙인 순서라 여기서 다시 줄 세운다
      const 가릴것 = 긴것부터(비밀);

      void 실행(id)
        .then((r) => {
          이것.결과 = 가린다(r, 가릴것) as R;
        })
        .catch((err: unknown) => {
          const 사유 = err instanceof Error ? err.message : String(err);
          이것.결과 = 가린다(설정.실패로(사유, Date.now() - 지금), 가릴것) as R;
        });
      return id;
    },

    읽는다(사람: string, id: string): { status: 'RUNNING' } | { status: S; result: R } | null {
      const 항 = 내것(사람, id);
      if (항 === null) return null;
      return 항.결과 === null ? { status: 'RUNNING' } : { status: 설정.끝글자, result: 항.결과 };
    },

    /** 문(auth/gate.ts)이 배정을 볼 서비스. 남의 번호면 null 이라 문이 지나보내고 라우트가 404 를 낸다 */
    서비스(사람: string, id: string): string | null {
      return 내것(사람, id)?.서비스 ?? null;
    },

    전부비운다(): void {
      저장소.clear();
    },
  };
}

const 케이스시험 = 시험보관소<ExecuteResponse, 'DONE'>({
  끝글자: 'DONE',
  바쁨문구: '이미 테스트 실행이 돌고 있습니다',
  실패로: (사유, 걸린ms) => ({
    historyId: 0,
    status: 'NA',
    durationMs: 걸린ms,
    steps: [],
    error: { message: '내 컴퓨터 러너에 닿지 못했습니다. 맥에서 npm run runner:local 을 켜 두었는지 보세요', stack: 사유 },
  }),
});

/** 케이스 「테스트 실행」 — 내 컴퓨터 러너. 케이스에는 서비스 칸을 안 쓴다(문이 tcId 로 본다) */
export function 시작한다(사람: string, 실행: () => Promise<ExecuteResponse>, 명세: 시험명세): string {
  return 케이스시험.시작한다(사람, '', 실행, 비밀글자들(명세));
}

export function 읽는다(사람: string, id: string): 시험읽기 | null {
  return 케이스시험.읽는다(사람, id);
}

export function 전부비운다(): void {
  케이스시험.전부비운다();
}

/** E2E 시나리오 「시험 실행」 — 서버 러너. 문(auth/scope.ts)이 이 인스턴스에서 서비스를 읽어 여기 둔다 — scenario/trial.ts 는 무겁다 */
export const 시나리오시험 = 시험보관소<ScenarioExecuteResponse, 'FINISHED'>({
  끝글자: 'FINISHED',
  바쁨문구: '이미 시험 실행이 돌고 있습니다',
  실패로: (사유, 걸린ms) => ({
    status: 'NA',
    durationMs: 걸린ms,
    parts: [],
    error: { message: '시험 실행을 끝내지 못했습니다', stack: 사유 },
  }),
});
