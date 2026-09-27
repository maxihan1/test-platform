// 한 건 처리 전체의 30초 신호 검사 — 마지막 단계 글 · 자식 동안만 진척 · stop · 409 · 거절 (도메인/작성 §7 「중단 · 폐기 · 진척」)
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { 보고손 } from './authoring-io.js';
import { 멈춤 } from './authoring-io.js';
import type { 돌린결과 } from './authoring-spawn.js';
import { 박동손 } from './authoring-heartbeat.js';
import type { 진척 } from './authoring-progress.js';

const 쉬자 = (ms: number) => new Promise((r) => setTimeout(r, ms));
const 진척값: 진척 = { childRunning: true, elapsedSec: 1, limitSec: 1, caseFiles: 0, tokens: 0 };
const 끝난결과: 돌린결과 = { 코드: null, 낸것: '', 오류: '', 시간초과: false, 멈춤으로죽음: true };
const 멈출때까지 = (신호: AbortSignal) =>
  new Promise<돌린결과>((resolve) => 신호.addEventListener('abort', () => resolve(끝난결과)));

function 가짜손(답: (n: number) => { status: number; 몸: unknown } | Error, 늦게 = 0) {
  const 보낸것: [string, 진척 | undefined][] = [];
  const 끝낸것: unknown[] = [];
  const 손: 보고손 = {
    단계: async (글, 진척) => {
      보낸것.push([글, 진척]);
      if (늦게 > 0) await 쉬자(늦게);
      const r = 답(보낸것.length);
      if (r instanceof Error) throw r;
      return r;
    },
    끝내기: async (몸) => {
      끝낸것.push(몸);
    },
  };
  return { 손, 보낸것, 끝낸것 };
}
const 괜찮음 = () => ({ status: 200, 몸: { ok: true, stop: false } });

describe('박동손 — 집은 뒤부터 끝내기 전까지 신호를 보낸다', () => {
  afterEach(() => {
    멈춤.까닭 = null;
    vi.restoreAllMocks();
  });

  it('단계 글이 생기기 전에는 안 보내고, 생기면 마지막 글을 진척 없이 되풀이한다', async () => {
    const { 손, 보낸것 } = 가짜손(괜찮음);
    const 박동 = 박동손(손, 10);
    await 쉬자(35);
    expect(보낸것).toHaveLength(0);
    await 박동.손.단계('작업방을 만드는 중');
    await 쉬자(35);
    await 박동.손.끝내기({ status: 'FAILED' });
    expect(보낸것.length).toBeGreaterThanOrEqual(2);
    expect(보낸것.every(([글, 진]) => 글 === '작업방을 만드는 중' && 진 === undefined)).toBe(true);
  });

  it('끝내기는 떠 있는 틱을 기다린 뒤 보내고, 그 뒤로는 안 보낸다', async () => {
    const 순서: string[] = [];
    const { 손, 보낸것 } = 가짜손(괜찮음, 30);
    const 원래 = 손.단계;
    손.단계 = async (글, 진) => {
      const r = await 원래(글, 진);
      순서.push('틱끝');
      return r;
    };
    손.끝내기 = async () => {
      순서.push('끝내기');
    };
    const 박동 = 박동손(손, 10);
    await 박동.손.단계('자료를 받는 중');
    순서.length = 0;
    await 쉬자(15);
    await 박동.손.끝내기({ status: 'DONE' });
    expect(순서.at(-1)).toBe('끝내기');
    expect(순서).toContain('틱끝');
    const 끝날때 = 보낸것.length;
    await 쉬자(40);
    expect(보낸것.length).toBe(끝날때);
  });

  it('자식을 띄운 직후 진척을 실은 신호를 곧바로 한 번 · 끝나면 다시 진척 없이', async () => {
    const { 손, 보낸것 } = 가짜손(괜찮음);
    const 박동 = 박동손(손, 60_000);
    await 박동.손.단계('케이스를 만드는 중');
    await 박동.자식동안(
      () => 진척값,
      async () => {
        await 쉬자(20);
        return { ...끝난결과, 코드: 0, 멈춤으로죽음: false };
      },
    );
    await 박동.멈추기();
    expect(보낸것[1]).toEqual(['케이스를 만드는 중', 진척값]);
  });

  it('틱 응답이 stop 이면 자식을 멈춘다', async () => {
    const { 손, 보낸것 } = 가짜손((n) => ({ status: 200, 몸: { ok: true, stop: n >= 3 } }));
    const 박동 = 박동손(손, 10);
    await 박동.손.단계('케이스를 만드는 중');
    const 결과 = await 박동.자식동안(() => 진척값, 멈출때까지);
    await 박동.멈추기();
    expect(결과.멈춤으로죽음).toBe(true);
    expect(보낸것.slice(1).every(([, 진]) => 진 !== undefined)).toBe(true);
  });

  it('자식 전 단계 응답이 stop 이면 멈추라했다 가 참이다', async () => {
    const { 손 } = 가짜손(() => ({ status: 200, 몸: { ok: true, stop: true } }));
    const 박동 = 박동손(손, 60_000);
    expect(박동.멈추라했다()).toBe(false);
    await 박동.손.단계('케이스를 만드는 중');
    expect(박동.멈추라했다()).toBe(true);
    await 박동.멈추기();
  });

  it('409(끝난 행)면 자식을 멈추고 로그 · 그 밖 non-200 은 로그만', async () => {
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { 손 } = 가짜손((n) => (n === 2 ? { status: 500, 몸: null } : n >= 3 ? { status: 409, 몸: null } : 괜찮음()));
    const 박동 = 박동손(손, 10);
    await 박동.손.단계('케이스를 만드는 중');
    const 결과 = await 박동.자식동안(() => 진척값, 멈출때까지);
    await 박동.멈추기();
    expect(결과.멈춤으로죽음).toBe(true);
    const 글들 = 오류.mock.calls.map((c) => String(c[0]));
    expect(글들.some((g) => g.includes('500'))).toBe(true);
    expect(글들.some((g) => g.includes('409'))).toBe(true);
  });

  it('거절이면 멈춤.까닭 을 채우고 자식을 멈춘다 · 다른 오류는 로그만', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { 손 } = 가짜손((n) =>
      n === 2 ? new Error('fetch failed') : n >= 3 ? new Error('(401) 서버가 거절했다.') : 괜찮음(),
    );
    const 박동 = 박동손(손, 10);
    await 박동.손.단계('케이스를 만드는 중');
    const 결과 = await 박동.자식동안(() => 진척값, 멈출때까지);
    await 박동.멈추기();
    expect(결과.멈춤으로죽음).toBe(true);
    expect(멈춤.까닭).toContain('서버가 거절했다');
  });

  it('앞 틱이 떠 있으면 겹쳐 보내지 않는다', async () => {
    const { 손, 보낸것 } = 가짜손(괜찮음, 60);
    const 박동 = 박동손(손, 10);
    void 박동.손.단계('케이스를 만드는 중');
    await 쉬자(100);
    await 박동.멈추기();
    expect(보낸것.length).toBeLessThanOrEqual(3);
  });
});
