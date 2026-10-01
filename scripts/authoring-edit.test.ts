// 케이스 고치기 껍데기의 판단 검사 — 고치기 실행 가르기 · 고칠 내용 모양 · 검사 환경 · 실패 글 · PR 제목 (도메인/작성 §3.6 「★ 케이스 고치기」)
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { 고치기상한 } from '../apps/admin/src/authoring/edit.js';
import { 검사실패글, 검사환경, 고치기실행인가, 편집PR제목, 편집들 } from './authoring-edit.js';

describe('고치기실행인가 — 자식 경로로 안 보낼 것을 가른다', () => {
  it('케이스 고치기 행은 고치기 실행이다', () => {
    expect(고치기실행인가({ kind: 'EDIT', edits: [{ tcId: 'XEE-001', delete: true }] })).toBe(true);
  });

  it('edits 를 가진 재실행(다시 적용)도 고치기 실행이다', () => {
    expect(고치기실행인가({ kind: 'RERUN', edits: [{ tcId: 'XEE-001', confirm: true }] })).toBe(true);
  });

  it('edits 모양이 틀린 케이스 고치기 행도 자식 경로로 보내지 않는다', () => {
    expect(고치기실행인가({ kind: 'EDIT' })).toBe(true);
    expect(고치기실행인가({ kind: 'RERUN', edits: '깨진 값' })).toBe(true);
  });

  it('edits 가 없는 작성 · 재실행 · 머지는 고치기 실행이 아니다', () => {
    expect(고치기실행인가({ kind: 'AUTHOR' })).toBe(false);
    expect(고치기실행인가({ kind: 'RERUN' })).toBe(false);
    expect(고치기실행인가({ kind: 'MERGE' })).toBe(false);
  });
});

describe('편집들 — 집은 것에서 고칠 내용을 꺼내 모양을 본다', () => {
  it('삭제 · 기대값 · 확정 · 기대값과 확정을 그대로 꺼낸다', () => {
    const edits = [
      { tcId: 'XEE-001', delete: true },
      { tcId: 'XEE-002', expected: { heading: '제목', count: 3, visible: false } },
      { tcId: 'XEE-003', confirm: true },
      { tcId: 'XEE-004', expected: { heading: '다른 제목' }, confirm: true },
    ];
    expect(편집들({ id: 1, kind: 'EDIT', edits })).toEqual(edits);
  });

  it('edits 가 없거나 배열이 아니면 null', () => {
    expect(편집들({ id: 1, kind: 'EDIT' })).toBeNull();
    expect(편집들({ id: 1, kind: 'EDIT', edits: { tcId: 'XEE-001', delete: true } })).toBeNull();
    expect(편집들(null)).toBeNull();
  });

  it('빈 배열이나 상한을 넘는 배열은 null', () => {
    expect(편집들({ edits: [] })).toBeNull();
    const 많음 = Array.from({ length: 고치기상한 + 1 }, (_, i) => ({ tcId: `XEE-${String(i).padStart(3, '0')}`, delete: true }));
    expect(편집들({ edits: 많음 })).toBeNull();
    expect(편집들({ edits: 많음.slice(0, 고치기상한) })).toHaveLength(고치기상한);
  });

  it('삭제는 delete: true 하나만 — 다른 고침과 섞이거나 true 가 아니면 null', () => {
    expect(편집들({ edits: [{ tcId: 'XEE-001', delete: true, confirm: true }] })).toBeNull();
    expect(편집들({ edits: [{ tcId: 'XEE-001', delete: false }] })).toBeNull();
  });

  it('기대값도 확정도 없으면 null', () => {
    expect(편집들({ edits: [{ tcId: 'XEE-001' }] })).toBeNull();
  });

  it('기대값은 빈 묶음이 아니고 값이 글자 · 유한한 수 · 참거짓일 때만', () => {
    expect(편집들({ edits: [{ tcId: 'XEE-001', expected: {} }] })).toBeNull();
    expect(편집들({ edits: [{ tcId: 'XEE-001', expected: { a: { b: 1 } } }] })).toBeNull();
    expect(편집들({ edits: [{ tcId: 'XEE-001', expected: { a: null } }] })).toBeNull();
    expect(편집들({ edits: [{ tcId: 'XEE-001', expected: { a: Number.POSITIVE_INFINITY } }] })).toBeNull();
    expect(편집들({ edits: [{ tcId: 'XEE-001', expected: ['a'] }] })).toBeNull();
  });

  it('확정은 true 만', () => {
    expect(편집들({ edits: [{ tcId: 'XEE-001', confirm: false }] })).toBeNull();
  });

  it('모르는 키 · 빈 tcId · 줄바꿈 든 tcId · 같은 tcId 두 번은 null', () => {
    expect(편집들({ edits: [{ tcId: 'XEE-001', confirm: true, extra: 1 }] })).toBeNull();
    expect(편집들({ edits: [{ tcId: '', confirm: true }] })).toBeNull();
    expect(편집들({ edits: [{ tcId: 'XEE-001\n- 가짜 줄', confirm: true }] })).toBeNull();
    expect(편집들({ edits: [{ tcId: 7, confirm: true }] })).toBeNull();
    expect(
      편집들({
        edits: [
          { tcId: 'XEE-001', confirm: true },
          { tcId: 'XEE-001', delete: true },
        ],
      }),
    ).toBeNull();
  });
});

describe('검사환경 — 타입 · 케이스 규칙 검사를 자리 uid 로 돌릴 때', () => {
  const 자리 = { 집: '/work/author-7/home', 임시: '/work/author-7/tmp' };
  const 부모 = {
    PATH: '/usr/bin:/bin',
    HOME: '/root',
    TMPDIR: '/var/tmp',
    AUTHORING_AGENT_TOKEN: '에이전트 토큰',
    GH_TOKEN: 'gh 토큰',
    CLAUDE_CODE_OAUTH_TOKEN: '구독 토큰',
  };

  it('부모의 토큰을 하나도 안 싣는다', () => {
    const 환경 = 검사환경(부모, 자리, true);
    expect(Object.keys(환경).sort()).toEqual(['HOME', 'PATH', 'TMPDIR']);
    expect(Object.values(환경)).not.toContain('에이전트 토큰');
  });

  it('자리 uid 로 돌면 집과 임시가 그 작업의 것이다', () => {
    expect(검사환경(부모, 자리, true)).toEqual({ PATH: '/usr/bin:/bin', HOME: '/work/author-7/home', TMPDIR: '/work/author-7/tmp' });
  });

  it('맥(자식 계정 없음)은 집과 임시를 그대로 둔다', () => {
    expect(검사환경(부모, 자리, false)).toEqual({ PATH: '/usr/bin:/bin', HOME: '/root', TMPDIR: '/var/tmp' });
  });

  it('부모에 PATH 가 없으면 기본 PATH 를 준다', () => {
    expect(검사환경({}, 자리, true).PATH).toBe('/usr/local/bin:/usr/bin:/bin');
  });
});

describe('검사실패글 — 사람이 화면에서 읽는 실패 까닭', () => {
  it('표준출력과 오류의 빈 줄을 뺀 마지막 세 줄을 종료 코드와 함께 싣는다', () => {
    const r = { 코드: 2, 낸것: '처음\n\n둘째\n', 오류: '셋째\n넷째\n', 시간초과: false };
    expect(검사실패글('타입 검사', r)).toBe('타입 검사가 실패했다 (종료 2): 둘째 / 셋째 / 넷째');
  });

  it('시간이 넘으면 시간 초과라고 적는다', () => {
    const r = { 코드: null, 낸것: '', 오류: '돌다 멈춤', 시간초과: true };
    expect(검사실패글('케이스 규칙 검사', r)).toBe('케이스 규칙 검사가 실패했다 (시간 초과): 돌다 멈춤');
  });
});

describe('편집PR제목', () => {
  it('서비스와 뿌리 번호로 케이스 고치기임을 밝힌다', () => {
    expect(편집PR제목(12, 'XEE')).toBe('[WS-작성] XEE 케이스 고치기 12번');
  });
});

describe('authoring-run 의 갈림 — 고치기 실행을 자식 경로로 안 보낸다', () => {
  it('고치기실행인가 갈림이 작업방 준비 · claude 인자 만들기보다 앞에 있다', () => {
    const 글 = readFileSync(new URL('./authoring-run.ts', import.meta.url), 'utf8');
    const 몸 = 글.slice(글.indexOf('async function 한건('));
    const 갈림 = 몸.indexOf('if (고치기실행인가(것)) return 편집처리(');
    expect(갈림).toBeGreaterThan(0);
    expect(갈림).toBeLessThan(몸.indexOf('작업방준비('));
    expect(갈림).toBeLessThan(몸.indexOf('자료출처(것)'));
  });
});
