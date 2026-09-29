// 케이스 「테스트 실행」 결과를 메모리에만 두는 저장소 — 실행 기록(test_run·run_item)을 만들지 않는다 (도메인/실행 §3.2)

import { randomUUID } from 'node:crypto';

import type { ExecuteResponse } from '@platform/kit';

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
  constructor() {
    super('이미 테스트 실행이 돌고 있습니다');
  }
}

interface 항목 {
  사람: string;
  시작: number;
  결과: ExecuteResponse | null;
}

const 하루 = 24 * 60 * 60 * 1000;
const 상한 = 50;
const 가림 = '********';
const 안내 = '내 컴퓨터 러너에 닿지 못했습니다. 맥에서 npm run runner:local 을 켜 두었는지 보세요';

// 프로세스가 죽으면 사라진다. 기록이 아니라 화면이 한 번 보고 갈 임시 결과라서 DB 에 안 둔다
const 저장소 = new Map<string, 항목>();

function 비밀글자들(명세: 시험명세): string[] {
  const 모음 = (값: Record<string, unknown>, schema: unknown): string[] => {
    const 가림본 = 가린값들(값, schema);
    return Object.entries(값).flatMap(([k, v]) => (가림본[k] !== v && typeof v === 'string' && v !== '' ? [v] : []));
  };
  // 긴 것부터 바꿔야 짧은 비밀이 긴 비밀의 일부일 때 조각이 남지 않는다
  return [...모음(명세.params, 명세.paramSchema), ...모음(명세.expected, 명세.expectedSchema)].sort((a, b) => b.length - a.length);
}

function 가린다(값: unknown, 비밀: string[]): unknown {
  if (typeof 값 === 'string') return 비밀.reduce((글, s) => 글.replaceAll(s, 가림), 값);
  if (Array.isArray(값)) return 값.map((v) => 가린다(v, 비밀));
  if (typeof 값 === 'object' && 값 !== null) {
    return Object.fromEntries(Object.entries(값).map(([k, v]) => [k, 가린다(v, 비밀)]));
  }
  return 값;
}

function 치운다(지금: number): void {
  for (const [id, 항] of 저장소) if (지금 - 항.시작 > 하루) 저장소.delete(id);
  if (저장소.size < 상한) return;
  // Map 은 넣은 순서로 돈다. 돌고 있는 것은 버리지 않는다 — 결과가 갈 곳이 사라진다
  for (const [id, 항] of 저장소) {
    if (저장소.size < 상한) break;
    if (항.결과 !== null) 저장소.delete(id);
  }
}

/** 러너 호출은 밖에서 넣는다. 돌려주는 번호로 시작한 사람만 읽는다 */
export function 시작한다(사람: string, 실행: () => Promise<ExecuteResponse>, 명세: 시험명세): string {
  const 지금 = Date.now();
  치운다(지금);
  if ([...저장소.values()].some((항) => 항.사람 === 사람 && 항.결과 === null)) throw new TrialBusyError();

  const id = randomUUID();
  const 이것: 항목 = { 사람, 시작: 지금, 결과: null };
  저장소.set(id, 이것);
  const 비밀 = 비밀글자들(명세);

  void 실행()
    .then((r) => {
      이것.결과 = 가린다(r, 비밀) as ExecuteResponse;
    })
    .catch((err: unknown) => {
      // 원문 사유(주소·포트)는 stack 칸으로 보낸다. 사람이 읽는 문장은 안내 한 줄이다
      const 사유 = err instanceof Error ? err.message : String(err);
      이것.결과 = {
        historyId: 0,
        status: 'NA',
        durationMs: Date.now() - 지금,
        steps: [],
        error: { message: 안내, stack: 가린다(사유, 비밀) as string },
      };
    });
  return id;
}

export function 읽는다(사람: string, id: string): 시험읽기 | null {
  const 항 = 저장소.get(id);
  if (항 === undefined || 항.사람 !== 사람) return null;
  return 항.결과 === null ? { status: 'RUNNING' } : { status: 'DONE', result: 항.결과 };
}

export function 전부비운다(): void {
  저장소.clear();
}
