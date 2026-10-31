// 닫을 PR 처리 — 닫은 · 이미 닫힌 PR 만 서버에 적고, 못 닫았고 열려 있거나 상태를 못 읽으면 다음에 다시 본다

import { describe, expect, it } from 'vitest';

import { PR닫기인자, 닫을PR처리 } from './authoring-pr-close.js';

describe('닫을PR처리', () => {
  it('닫은 PR · 이미 병합된 PR 은 적고 · 열린 채 남은 PR 은 안 적는다', async () => {
    const 부른것: string[] = [];
    const 부른다 = async (길: string) => {
      부른것.push(길);
      return 길.startsWith('/authoring/requests/closing')
        ? { status: 200, 몸: { prs: [{ id: 1, prUrl: 'u/1' }, { id: 2, prUrl: 'u/2' }, { id: 3, prUrl: 'u/3' }, { id: 4, prUrl: 'u/4' }] } }
        : { status: 204, 몸: null };
    };
    const gh = (인자: string[]) => {
      const url = 인자[2]!;
      if (인자[1] === 'close') return { ok: url === 'u/1', 낸것: '', 까닭: '안 닫힘' };
      return { 'u/2': { ok: true, 낸것: 'MERGED\n' }, 'u/3': { ok: true, 낸것: 'OPEN\n' }, 'u/4': { ok: false, 낸것: '' } }[url]! as { ok: boolean; 낸것: string; 까닭: string };
    };
    expect(await 닫을PR처리('MKW', 부른다, gh)).toBe(2);
    expect(부른것).toEqual(['/authoring/requests/closing?service=MKW', '/authoring/requests/1/closed', '/authoring/requests/2/closed']);
  });

  it('브랜치는 안 지우고 닫는 까닭 댓글을 단다', () => {
    expect(PR닫기인자('u/1')).toEqual(['pr', 'close', 'u/1', '--comment', expect.stringContaining('롤백')]);
  });
});
