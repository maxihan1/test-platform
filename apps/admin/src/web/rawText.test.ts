// 「원문 보기」에서 같은 문장이 두 번 나오지 않게 걷는 함수 검사

import { describe, expect, it } from 'vitest';

import { 겹침걷기 } from './rawText.js';

describe('겹침걷기', () => {
  it('오류 메시지와 스택 첫 줄이 같은 문장이면 스택 하나만 남긴다', () => {
    const 글 = 'Error: X wasn\'t found\n\nError: X wasn\'t found\n    at click (a.ts:1:1)';

    expect(겹침걷기(글)).toBe('Error: X wasn\'t found\n    at click (a.ts:1:1)');
  });

  it('메시지에 이름이 없고 스택 첫 줄에만 Error: 가 붙어도 겹친 것으로 본다', () => {
    const 글 = 'X wasn\'t found\n\nError: X wasn\'t found\n    at click (a.ts:1:1)';

    expect(겹침걷기(글)).toBe('Error: X wasn\'t found\n    at click (a.ts:1:1)');
  });

  it('겹치지 않으면 그대로 둔다', () => {
    const 글 = 'Timeout 30000ms exceeded.\n\nError: locator.click\n    at a.ts:1:1';

    expect(겹침걷기(글)).toBe(글);
  });

  it('짧은 다른 문장이 다음 첫 줄 안에 들어 있기만 하면 지우지 않는다', () => {
    const 글 = 'TIMEOUT\n\nError: locator TIMEOUT 30000ms\n    at a.ts:1:1';

    expect(겹침걷기(글)).toBe(글);
  });

  it('문단이 하나면 그대로 둔다', () => {
    expect(겹침걷기('한 줄')).toBe('한 줄');
  });
});
