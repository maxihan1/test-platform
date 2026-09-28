// 작성 이어하기의 보관 판정 검사 — 보관 표시 · 훑기 · 이어받을 폴더 · 넘겨받기 · 잠그기 (도메인/작성 §7 「이어하기」)
import { describe, expect, it } from 'vitest';

import { 사본자리 } from './authoring-copy.js';
import { type 보관, 보관글, 보관읽기, 이어받을폴더, 잠그기명령, 넘겨받기명령, 훑기판정 } from './authoring-keep.js';

const 기준 = 'a'.repeat(40);
const 좋은것: 보관 = { 서비스: 'PAY', 기준, 옛케이스: ['pay/a.spec.ts'], 끝: true };

describe('보관읽기 — 폴더의 보관 표시를 좁혀 읽는다', () => {
  it('쓴 그대로 읽힌다', () => {
    expect(보관읽기(보관글(좋은것))).toEqual(좋은것);
  });

  it('JSON 이 아니거나 모양이 틀리면 null — 그 폴더는 지운다', () => {
    for (const 글 of [
      '',
      '{',
      '[]',
      JSON.stringify({ ...좋은것, 기준: 'main' }),
      JSON.stringify({ ...좋은것, 서비스: '../x' }),
      JSON.stringify({ ...좋은것, 옛케이스: [1] }),
      JSON.stringify({ ...좋은것, 끝: 'yes' }),
    ]) {
      expect(보관읽기(글), 글).toBeNull();
    }
  });
});

describe('훑기판정 — 남은 폴더를 둘지 지울지', () => {
  const 도는것 = new Set([7]);

  it('지금 잡은 번호는 건드리지 않는다 — 도는 건의 트리를 지우면 안 된다', () => {
    expect(훑기판정(7, null, 도는것, 'NOT_FOUND')).toBe('둔다');
  });

  it('보관 표시가 없거나 틀리면 지운다', () => {
    expect(훑기판정(8, null, 도는것, { keepWorkspace: true })).toBe('지운다');
  });

  it('서버가 남기라 하면 두고, 아니거나 없는 요청이면 지운다', () => {
    expect(훑기판정(8, 좋은것, 도는것, { keepWorkspace: true })).toBe('둔다');
    expect(훑기판정(8, 좋은것, 도는것, { keepWorkspace: false })).toBe('지운다');
    expect(훑기판정(8, 좋은것, 도는것, 'NOT_FOUND')).toBe('지운다');
  });

  it('서버에 못 물었으면 둔다 — 모르는 채 지우면 이어갈 것을 잃는다', () => {
    expect(훑기판정(8, 좋은것, 도는것, 'UNKNOWN')).toBe('둔다');
  });

  it('보관 끝 표시가 없는데 남기라 하면 잠근다 — 꺼지며 끊긴 건이다', () => {
    expect(훑기판정(8, { ...좋은것, 끝: false }, 도는것, { keepWorkspace: true })).toBe('잠근다');
  });
});

describe('이어받을폴더 — 이어받은 사슬을 거슬러 처음 찾은 보관 폴더', () => {
  it('가까운 것부터 보고, 보관 끝이 아닌 것은 건너뛴다', () => {
    const 폴더들 = new Map<number, 보관 | null>([
      [30, { ...좋은것, 끝: false }],
      [20, 좋은것],
      [10, 좋은것],
    ]);
    expect(이어받을폴더([30, 20, 10], 폴더들)).toBe(20);
  });

  it('하나도 없으면 null — 처음부터 한다', () => {
    expect(이어받을폴더([5, 4], new Map())).toBeNull();
  });
});

describe('넘겨받기명령 · 잠그기명령', () => {
  const 자리 = 사본자리(40, '/work');
  const 자식 = { uid: 20001, gid: 20001 };

  it('넘겨받으면 앞 실행이 남긴 커밋을 기준으로 되감는다 — 파일은 그대로 둔다', () => {
    const 명령들 = 넘겨받기명령(자리, 기준, 자식);
    expect(명령들[0]).toEqual({
      명령: 'git',
      인자: [`--git-dir=${자리.git}`, `--work-tree=${자리.트리}`, '-c', 'core.hooksPath=/dev/null', 'reset', '-q', 기준],
    });
    expect(명령들[0]!.인자).not.toContain('--hard');
  });

  it('넘겨받으면 새 자리 uid 로 넘기고, 보관하면 root 로 잠근다 — 같은 자리의 다음 건이 못 읽는다', () => {
    const 넘김 = 넘겨받기명령(자리, 기준, 자식).slice(1);
    expect(넘김.every((c) => c.명령 === 'chown' && c.인자[1] === '20001:20001')).toBe(true);
    expect(넘김.map((c) => c.인자[2])).toEqual([자리.트리, 자리.집, 자리.자료, 자리.gh, 자리.임시]);
    const 잠금 = 잠그기명령(자리, 자식);
    expect(잠금.every((c) => c.명령 === 'chown' && c.인자[1] === '0:0')).toBe(true);
  });

  it('맥(자식 uid 없음)은 소유를 안 바꾼다', () => {
    expect(넘겨받기명령(자리, 기준, null)).toHaveLength(1);
    expect(잠그기명령(자리, null)).toEqual([]);
  });
});
