// 수정 AI 넘길 사람 후보 — CODEOWNERS · 옛 줄 범위 · blame 글 · 모으기 (도메인/BTS 「수정 AI」)

import { describe, expect, it } from 'vitest';

import { blame풀기, 넘길사람모으기, 옛범위풀기, 코드주인풀기, 파일주인 } from './authoring-bugfix-owners.js';

describe('CODEOWNERS', () => {
  const 규칙 = 코드주인풀기(
    ['# 전체', '* lead@acme.com', '', '/src/coupon/ coupon@acme.com @coupon-team # 쿠폰', '*.md docs@acme.com', 'src/pay/* pay@acme.com @pay-team', '/legacy/ '].join('\n'),
  );

  it('마지막에 맞는 규칙이 이긴다', () => {
    expect(파일주인(규칙, 'README.md')).toEqual([{ email: 'docs@acme.com', name: 'docs' }]);
    expect(파일주인(규칙, 'src/index.ts')).toEqual([{ email: 'lead@acme.com', name: 'lead' }]);
    expect(파일주인(규칙, 'src/coupon/apply.ts')).toEqual([{ email: 'coupon@acme.com', name: 'coupon' }]);
  });

  it('이메일 꼴만 남기고 @아이디 · 팀은 건너뛴다', () => {
    expect(파일주인(규칙, 'src/coupon/a/b.ts').map((p) => p.email)).toEqual(['coupon@acme.com']);
    expect(파일주인(코드주인풀기('/x/ @team-only'), 'x/a.ts')).toEqual([]);
  });

  it('주인이 없는 줄은 앞 규칙을 지운다', () => {
    expect(파일주인(규칙, 'legacy/old.ts')).toEqual([]);
  });

  it('끝이 단일 * 이면 그 폴더 바로 아래만, 앞 / 는 뿌리부터만 맞는다', () => {
    expect(파일주인(규칙, 'src/pay/charge.ts').map((p) => p.email)).toEqual(['pay@acme.com']);
    expect(파일주인(규칙, 'src/pay/deep/charge.ts').map((p) => p.email)).toEqual(['lead@acme.com']);
    expect(파일주인(규칙, 'lib/src/coupon/a.ts').map((p) => p.email)).toEqual(['lead@acme.com']);
  });

  it('앞 **/ 는 뿌리를 포함한 어느 깊이든 맞는다', () => {
    const 규칙 = 코드주인풀기('**/migrations/ db@acme.com');
    expect(파일주인(규칙, 'migrations/001.sql').map((p) => p.email)).toEqual(['db@acme.com']);
    expect(파일주인(규칙, 'a/b/migrations/001.sql').map((p) => p.email)).toEqual(['db@acme.com']);
    expect(파일주인(규칙, 'a/migrations2/x.sql')).toEqual([]);
  });

  it('가운데 /**/ 는 폴더 0개 이상이다', () => {
    const 규칙 = 코드주인풀기('a/**/z.ts k@acme.com');
    expect(파일주인(규칙, 'a/z.ts')).toHaveLength(1);
    expect(파일주인(규칙, 'a/b/c/z.ts')).toHaveLength(1);
    expect(파일주인(규칙, 'b/z.ts')).toHaveLength(0);
  });

  it('** 는 깊이 상관없이 맞는다', () => {
    const 깊은 = 코드주인풀기('docs/** doc@acme.com');
    expect(파일주인(깊은, 'docs/a/b/c.md').map((p) => p.email)).toEqual(['doc@acme.com']);
    expect(파일주인(깊은, 'other/a.md')).toEqual([]);
  });
});

describe('옛범위풀기', () => {
  it('@@ -a,b 의 옛 범위를 낸다 — b 생략은 한 줄, b 가 0 이면 앞줄 하나, 파일 맨 앞 끼워 넣기는 뺀다', () => {
    const 글 = ['@@ -10,3 +10,4 @@ fn', '@@ -20 +21 @@', '@@ -30,0 +31,2 @@', '@@ -0,0 +1,5 @@'].join('\n');
    expect(옛범위풀기(글)).toEqual([
      { 시작: 10, 줄수: 3 },
      { 시작: 20, 줄수: 1 },
      { 시작: 30, 줄수: 1 },
    ]);
  });
});

describe('blame풀기', () => {
  const 해시A = 'a'.repeat(40);
  const 해시B = 'b'.repeat(40);
  const 해시C = 'c'.repeat(40);

  it('커밋 머리마다 작성자를 한 번씩 읽고 꺾쇠를 뗀다', () => {
    const 글 = [
      `${해시A} 5 5 2`,
      'author Kim',
      'author-mail <kim@acme.com>',
      'summary fix',
      'filename src/a.ts',
      '\tline5',
      `${해시A} 6 6`,
      '\tline6',
      `${해시B} 7 7 1`,
      'author Lee',
      'author-mail <lee@acme.com>',
      'filename src/a.ts',
      '\tline7',
    ].join('\n');
    expect(blame풀기(글)).toEqual([
      { email: 'kim@acme.com', name: 'Kim' },
      { email: 'lee@acme.com', name: 'Lee' },
    ]);
  });

  it('얕은 복제의 맨 아래 커밋(boundary)은 건너뛴다', () => {
    const 글 = [`${해시C} 1 1 1`, 'author Old', 'author-mail <old@acme.com>', 'boundary', 'filename a.ts', '\tx'].join('\n');
    expect(blame풀기(글)).toEqual([]);
  });
});

describe('넘길사람모으기', () => {
  it('차례대로 합쳐 중복(대소문자 무시)과 봇 메일을 뺀다', () => {
    const 결과 = 넘길사람모으기(
      [{ email: 'Kim@acme.com', name: 'kim' }],
      [
        { email: 'kim@acme.com', name: 'Kim' },
        { email: '123+kim@users.noreply.github.com', name: 'Kim' },
        { email: 'ci@acme.com', name: 'dependabot[bot]' },
        { email: 'lee@acme.com', name: 'Lee' },
      ],
    );
    expect(결과).toEqual([
      { email: 'Kim@acme.com', name: 'kim' },
      { email: 'lee@acme.com', name: 'Lee' },
    ]);
  });

  it('스무 명까지만 두고 글은 200자로 자른다', () => {
    const 많이 = Array.from({ length: 30 }, (_, k) => ({ email: `u${k}@acme.com`, name: 'n'.repeat(300) }));
    const 결과 = 넘길사람모으기(많이);
    expect(결과).toHaveLength(20);
    expect(결과[0]!.name).toHaveLength(200);
  });
});
