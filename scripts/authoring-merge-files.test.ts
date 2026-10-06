// 병합 직전에 PR 의 바뀐 파일을 어떻게 읽고 언제 병합을 막는지 정하는 순수 함수 검사
import { describe, expect, it, vi } from 'vitest';

import { PR수인자, PR파일인자, PR파일읽기, 병합직전막힘, 파일수어긋남 } from './authoring-merge-files.js';

describe('병합 직전 PR 파일 목록 — 페이지로 받고 옛 경로까지', () => {
  it('diff 대신 파일 API 를 쪽당 100 개씩 끝까지 받는다 — gh pr diff 는 300 개를 넘으면 HTTP 406 이다', () => {
    expect(PR파일인자('https://github.com/x/y/pull/3')).toEqual([
      'api',
      '--hostname',
      'github.com',
      '--paginate',
      'repos/x/y/pulls/3/files?per_page=100',
      '--jq',
      '.[] | [.filename, (.previous_filename // "")] | @tsv',
    ]);
  });

  it('회사 GitHub(Enterprise) 주소면 그 호스트로 묻는다 — 서버는 https 저장소면 호스트를 안 가린다', () => {
    expect(PR파일인자('https://git.corp.example:8443/team/app/pull/12')).toEqual([
      'api',
      '--hostname',
      'git.corp.example:8443',
      '--paginate',
      'repos/team/app/pulls/12/files?per_page=100',
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
    'https://user@github.com/x/y/pull/3',
    'https://git hub.com/x/y/pull/3',
    'https://-x.example/x/y/pull/3',
    'https://github.com:/x/y/pull/3',
    'https://github.com:80a/x/y/pull/3',
    'https:///x/y/pull/3',
  ])('PR 주소로 끝나지 않거나 호스트에 이상한 글자가 끼면 인자를 안 만든다: %j', (주소) => {
    expect(PR파일인자(주소)).toBeNull();
  });
});

const 어긋남글 = (PR수: string, 읽은수: number) =>
  `PR 의 바뀐 파일 수(${PR수})와 읽은 목록(${읽은수})이 달라 판정하지 않는다 — 맥은 병합하지 않는다`;
const 상한글 = 'PR 의 바뀐 파일이 3000개 이상이라 목록을 다 못 읽는다 — 맥은 병합하지 않는다';

describe('읽은 수와 PR 의 바뀐 파일 수 대조', () => {
  it('바뀐 파일 수와 그때의 머리 커밋을 PR 을 새로 읽어 한 줄로 받는다', () => {
    expect(PR수인자('https://github.com/x/y/pull/3')).toEqual([
      'pr',
      'view',
      'https://github.com/x/y/pull/3',
      '--json',
      'changedFiles,headRefOid',
      '-q',
      '[.changedFiles, .headRefOid] | @tsv',
    ]);
  });

  it('같으면 막지 않는다', () => {
    expect(파일수어긋남(2, '2\n')).toBeNull();
    expect(파일수어긋남(2999, '2999')).toBeNull();
  });

  it('다르면 병합하지 않는다', () => {
    expect(파일수어긋남(2, '3\n')).toBe(어긋남글('3', 2));
  });

  it.each(['', 'abc', '2.0', '-2', '{"message":"Not Found"}'])('숫자가 아니면 병합하지 않는다: %j', (글) => {
    expect(파일수어긋남(2, 글)).toBe(어긋남글(글.trim(), 2));
  });

  it('읽은 수가 3000 이상이면 둘이 같아도 병합하지 않는다 — 파일 API 는 3000 개에서 멈춘다', () => {
    expect(파일수어긋남(3000, '3000')).toBe(상한글);
    expect(파일수어긋남(3000, '3500')).toBe(상한글);
  });
});

describe('병합 직전 막힘 — 앞 단계가 먼저 걸린다', () => {
  const sha = 'm'.repeat(40);
  const 된것 = (낸것: string) => vi.fn(() => ({ ok: true, 낸것, 까닭: '' }));
  const 실패 = (낸것: string, 까닭: string) => vi.fn(() => ({ ok: false, 낸것, 까닭 }));
  const 머리 = 'a'.repeat(40);
  const 수줄 = (수: string, 그때머리 = 머리) => 된것(`${수}\t${그때머리}\n`);
  const 통과 = {
    메인: { sha } as { sha: string } | { 까닭: string },
    머리,
    목록: 된것('tests/a/A-001.spec.ts\t\n'),
    수: 수줄('1'),
  };
  const 머리글 = 'PR 머리가 판정 사이에 바뀌었다 (aaaaaaa → bbbbbbb) — 판정하지 않는다';
  const 아님 = '이 PR 은 케이스만 바꾼 것이 아니다 — 맥은 병합하지 않는다';

  it('다 통과하고 테스트만이면 막지 않는다 — 판정은 최신 main 기준으로 옛 경로까지 본다', () => {
    const 테스트만 = vi.fn(() => true);
    expect(병합직전막힘({ ...통과, 목록: 된것('tests/a/A-001.spec.ts\tapps/x.ts\n'), 테스트만 })).toBeNull();
    expect(테스트만).toHaveBeenCalledWith(['tests/a/A-001.spec.ts', 'apps/x.ts'], sha);
  });

  it('테스트만이 아니면 병합하지 않는다', () => {
    expect(병합직전막힘({ ...통과, 테스트만: () => false })).toBe(아님);
  });

  it('읽은 목록이 비었으면 병합하지 않는다', () => {
    expect(병합직전막힘({ ...통과, 목록: 된것(''), 수: 수줄('0'), 테스트만: () => true })).toBe(아님);
  });

  it('3000 개 이상이면 테스트만 판정보다 먼저 막는다', () => {
    const 테스트만 = vi.fn(() => true);
    const 줄들 = Array.from({ length: 3000 }, (_, i) => `tests/a/A-${i}.spec.ts\t`).join('\n');
    expect(병합직전막힘({ ...통과, 목록: 된것(줄들), 수: 수줄('3000'), 테스트만 })).toBe(상한글);
    expect(테스트만).not.toHaveBeenCalled();
  });

  it('수가 어긋나면 테스트만 판정보다 먼저 막는다', () => {
    const 테스트만 = vi.fn(() => false);
    expect(병합직전막힘({ ...통과, 수: 수줄('2'), 테스트만 })).toBe(어긋남글('2', 1));
    expect(테스트만).not.toHaveBeenCalled();
  });

  it('판정 사이에 PR 머리가 바뀌었으면 병합하지 않는다 — 읽은 목록이 병합할 커밋의 것이 아니다', () => {
    const 테스트만 = vi.fn(() => true);
    expect(병합직전막힘({ ...통과, 수: 수줄('1', 'b'.repeat(40)), 테스트만 })).toBe(머리글);
    expect(테스트만).not.toHaveBeenCalled();
  });

  it('머리가 바뀌었으면 수 어긋남 · 3000 보다 먼저 막는다', () => {
    const 줄들 = Array.from({ length: 3000 }, (_, i) => `tests/a/A-${i}.spec.ts\t`).join('\n');
    expect(병합직전막힘({ ...통과, 수: 수줄('2', 'b'.repeat(40)), 테스트만: () => false })).toBe(머리글);
    expect(병합직전막힘({ ...통과, 목록: 된것(줄들), 수: 수줄('3000', 'b'.repeat(40)), 테스트만: () => true })).toBe(머리글);
  });

  it('머리를 못 읽었으면 병합하지 않는다', () => {
    expect(병합직전막힘({ ...통과, 수: 된것('1\n'), 테스트만: () => true })).toBe(
      'PR 머리가 판정 사이에 바뀌었다 (aaaaaaa → ) — 판정하지 않는다',
    );
  });

  it('수를 못 읽었으면 머리 · 어긋남 · 테스트만보다 먼저 막는다', () => {
    const 테스트만 = vi.fn(() => false);
    expect(병합직전막힘({ ...통과, 수: 실패(`2\t${'b'.repeat(40)}`, '시간 초과'), 테스트만 })).toBe(
      'PR 의 바뀐 파일 수를 못 읽었다: 시간 초과',
    );
    expect(테스트만).not.toHaveBeenCalled();
  });

  it('목록을 못 읽었으면 낸 글자를 목록으로 읽지 않는다 — gh api 실패는 stdout 에 오류 JSON 한 줄이다', () => {
    const 테스트만 = vi.fn(() => true);
    const 오류 = '{"message":"Sorry","status":"406"}\n';
    expect(병합직전막힘({ ...통과, 목록: 실패(오류, 'HTTP 406'), 테스트만 })).toBe('PR 의 바뀐 파일을 못 읽었다: HTTP 406');
    const 수 = 실패('x', '못 읽음');
    expect(병합직전막힘({ ...통과, 목록: 실패(오류, 'HTTP 406'), 수, 테스트만 })).toBe(
      'PR 의 바뀐 파일을 못 읽었다: HTTP 406',
    );
    expect(테스트만).not.toHaveBeenCalled();
  });

  it('목록을 못 읽었으면 수를 묻지 않는다 — 동기 호출이 겹치면 생존 신호가 끊긴다', () => {
    const 수 = 수줄('1');
    병합직전막힘({ ...통과, 목록: 실패('', 'HTTP 406'), 수, 테스트만: () => true });
    expect(수).not.toHaveBeenCalled();
  });

  it('최신 main 을 못 받았으면 무엇보다 먼저 막고 목록 · 수를 묻지 않는다', () => {
    const 테스트만 = vi.fn(() => false);
    const 목록 = 실패('', 'HTTP 406');
    const 수 = 실패('2', '못 읽음');
    expect(병합직전막힘({ 메인: { 까닭: 'fetch 실패' }, 머리, 목록, 수, 테스트만 })).toBe(
      '최신 main 을 못 받아 판정을 못 했다: fetch 실패',
    );
    expect(목록).not.toHaveBeenCalled();
    expect(수).not.toHaveBeenCalled();
    expect(테스트만).not.toHaveBeenCalled();
  });
});
