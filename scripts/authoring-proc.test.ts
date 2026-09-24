// 작성 에이전트의 프로세스 손 검사 — 다른 uid 환경 · 비동기 실행 · 동시 자리표
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { 도는자식, 돌린다, 자리들, 칠환경 } from './authoring-io.js';

describe('칠환경 — 다른 uid 로 띄우는 것에는 부모 환경(토큰)을 절대 안 물려준다', () => {
  const 부모 = { PATH: '/bin', GH_TOKEN: 'ghp_x', AUTHORING_AGENT_TOKEN: 'tpa_x' };

  it('uid 가 없으면 부모 위에 얹는다 — 에이전트 자신이 치는 git·gh', () => {
    expect(칠환경(부모, { env: { HOME: '/h' } })).toEqual({ ...부모, HOME: '/h' });
    expect(칠환경(부모, {})).toBeUndefined();
  });

  it('uid 가 있으면 준 것만 — 같은 uid 의 남은 자식이 /proc 로 environ 을 읽는다 (2026-09-24 보안 검토)', () => {
    expect(칠환경(부모, { uid: 20000, env: { PATH: '/usr/bin' } })).toEqual({ PATH: '/usr/bin' });
    expect(칠환경(부모, { uid: 20000 })).toEqual({});
  });
});

describe('돌린다 — 오래 걸리는 것은 비동기로. 한 건이 도는 동안 다른 서비스가 서지 않게', () => {
  it('입력을 넣고 표준출력·오류·종료 코드를 모은다', async () => {
    const r = await 돌린다('sh', ['-c', 'cat; echo 오류 >&2; exit 3'], { cwd: tmpdir(), input: '안녕' });
    expect(r).toMatchObject({ 코드: 3, 낸것: '안녕', 시간초과: false });
    expect(r.오류).toContain('오류');
  });

  it('환경을 통째로 준다 — 부모 것이 새지 않는다', async () => {
    const r = await 돌린다('sh', ['-c', 'echo "${HOME:-none}:${X}"'], {
      cwd: tmpdir(),
      env: { X: '1', PATH: process.env.PATH ?? '' },
    });
    expect(r.낸것.trim()).toBe('none:1');
  });

  it('시간이 넘으면 죽이고 시간초과로 낸다', async () => {
    const r = await 돌린다('sh', ['-c', 'sleep 5'], { cwd: tmpdir(), 제한: 200 });
    expect(r.시간초과).toBe(true);
  });

  it('도는 동안 목록에 있고 끝나면 빠진다 — 거절로 나갈 때 남은 자식을 죽인다', async () => {
    const 약속 = 돌린다('sh', ['-c', 'sleep 0.2'], { cwd: tmpdir() });
    expect(도는자식.size).toBe(1);
    await 약속;
    expect(도는자식.size).toBe(0);
  });

  it('없는 명령이면 코드 null 과 까닭을 낸다', async () => {
    const r = await 돌린다('없는-명령-xyz', [], { cwd: tmpdir() });
    expect(r.코드).toBeNull();
    expect(r.오류).not.toBe('');
  });
});

describe('자리들 — 동시에 도는 작업 수를 막는다', () => {
  it('상한만큼 바로 주고, 넘치면 앞 것이 놓을 때까지 기다린다', async () => {
    const 표 = 자리들(2);
    const a = await 표.잡기();
    const b = await 표.잡기();
    expect(new Set([a, b])).toEqual(new Set([0, 1]));
    let 셋째: number | null = null;
    const 기다림 = 표.잡기().then((k) => (셋째 = k));
    await new Promise((r) => setTimeout(r, 10));
    expect(셋째).toBeNull();
    표.놓기(b);
    await 기다림;
    expect(셋째).toBe(b);
  });

  it('도는 수를 센다 — CLI 최신화는 0 일 때만 한다', async () => {
    const 표 = 자리들(2);
    expect(표.도는수()).toBe(0);
    const a = await 표.잡기();
    expect(표.도는수()).toBe(1);
    표.놓기(a);
    expect(표.도는수()).toBe(0);
  });
});
