// 서비스 가이드 순수 규칙 — 판 번호 · 글 칸 검사 · 변경 기록이 앞 판과 견줘 계산되는지 본다

import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { 글검사, 글상한, 글자판번호, 변경기록 } from './rules.js';

const md5 = (s: string) => createHash('md5').update(s).digest('hex');
const 판 = (version: number, 글: [string, string, string], files: { id: number; section: 'intro' | 'policy' | 'rules' }[]) => ({
  version,
  md5: { intro: md5(글[0]), policy: md5(글[1]), rules: md5(글[2]) },
  files,
  savedAt: `2026-10-17T00:0${String(version)}:00.000Z`,
  savedByName: '검사',
});

describe('글자판번호', () => {
  it('숫자 글자만 받고 음수 · 소수 · 1e3 · 빈 값 · 숫자 값은 거른다', () => {
    expect(글자판번호('0')).toBe(0);
    expect(글자판번호('3')).toBe(3);
    expect(글자판번호('0', 1)).toBeNull();
    for (const 틀림 of ['-1', '1.5', '1e3', '', 3, undefined, null]) expect(글자판번호(틀림)).toBeNull();
  });
});

describe('글검사', () => {
  it('셋 다 문자열이고 상한 안이면 받는다', () => {
    expect(글검사({ intro: '소개', policy: '', rules: '규칙' })).toEqual({ intro: '소개', policy: '', rules: '규칙' });
  });

  it('빠졌거나 문자열이 아니거나 상한을 넘으면 그 칸 이름을 준다', () => {
    expect(글검사({ intro: '', policy: 1, rules: '' })).toEqual({ error: 'BAD_GUIDE', detail: 'policy' });
    expect(글검사({ intro: '', policy: '' })).toEqual({ error: 'BAD_GUIDE', detail: 'rules' });
    expect(글검사({ intro: 'ㄱ'.repeat(글상한 + 1), policy: '', rules: '' })).toEqual({ error: 'BAD_GUIDE', detail: 'intro' });
    expect(글검사({ intro: 'ㄱ'.repeat(글상한), policy: '', rules: '' })).not.toHaveProperty('error');
    expect(글검사(null)).toEqual({ error: 'BAD_GUIDE', detail: 'intro' });
  });
});

describe('변경기록', () => {
  const 이름 = new Map([
    [10, '소개.pdf'],
    [11, '정책.docx'],
  ]);

  it('최신 먼저이고 판마다 글이 바뀐 구획 · 더한 파일 · 뺀 파일을 앞 판과 견줘 준다', () => {
    const 줄 = 변경기록(
      [
        판(3, ['소개', '', '규칙'], [{ id: 11, section: 'policy' }]),
        판(1, ['소개', '', ''], []),
        판(2, ['소개', '', ''], [{ id: 10, section: 'intro' }, { id: 11, section: 'policy' }]),
      ],
      이름,
    );
    expect(줄.map((x) => x.version)).toEqual([3, 2, 1]);
    expect(줄[0]!.changed).toEqual({ sections: ['rules'], added: [], removed: [{ name: '소개.pdf', section: 'intro' }] });
    expect(줄[1]!.changed).toEqual({
      sections: [],
      added: [
        { name: '소개.pdf', section: 'intro' },
        { name: '정책.docx', section: 'policy' },
      ],
      removed: [],
    });
    expect(줄[2]).toEqual({ version: 1, savedAt: '2026-10-17T00:01:00.000Z', savedByName: '검사', changed: { sections: ['intro'], added: [], removed: [] } });
  });

  it('판이 없으면 빈 목록', () => {
    expect(변경기록([], 이름)).toEqual([]);
  });
});
