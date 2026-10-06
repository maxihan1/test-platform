// 병합 직전에 PR 의 바뀐 파일을 어떻게 읽고 언제 병합을 막는지 정하는 순수 함수 검사
import { describe, expect, it } from 'vitest';

import { PR파일인자, PR파일읽기 } from './authoring-merge-files.js';

describe('병합 직전 PR 파일 목록 — 페이지로 받고 옛 경로까지', () => {
  it('diff 대신 파일 API 를 쪽당 100 개씩 끝까지 받는다 — gh pr diff 는 300 개를 넘으면 HTTP 406 이다', () => {
    expect(PR파일인자('https://github.com/x/y/pull/3')).toEqual([
      'api',
      '--paginate',
      'repos/x/y/pulls/3/files?per_page=100',
      '--jq',
      '.[] | [.filename, (.previous_filename // "")] | @tsv',
    ]);
  });

  it('줄마다 파일 하나를 세고 이름 바꾼 파일은 옛 경로도 판정에 넣는다', () => {
    expect(PR파일읽기('a\t\nb\tc\n')).toEqual({ 수: 2, 파일들: ['a', 'b', 'c'] });
  });

  it('빈 줄은 세지 않는다', () => {
    expect(PR파일읽기('')).toEqual({ 수: 0, 파일들: [] });
    expect(PR파일읽기('\na\t\n\n')).toEqual({ 수: 1, 파일들: ['a'] });
  });

  it.each([
    'https://github.com/x/y/pull/3/files',
    'https://github.com/x/y/pull/3?x=1',
    'https://github.com/x/y/pull/3\n',
    'https://github.com/x/y/pull/',
    'https://github.com/x/y/issues/3',
    'http://github.com/x/y/pull/3',
    'https://evil.example/https://github.com/x/y/pull/3',
    'https://github.com/x/y/z/pull/3',
  ])('github PR 주소로 끝나지 않으면 인자를 안 만든다: %s', (주소) => {
    expect(PR파일인자(주소)).toBeNull();
  });
});
