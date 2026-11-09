// 병합 직전에 PR 의 바뀐 파일을 어떻게 읽고 언제 병합을 막는지 정하는 순수 함수 검사
import { describe, expect, it, vi } from 'vitest';

import { 바탕보기, 병합직전막힘 } from './authoring-merge-files.js';
import { 바탕파일 } from './authoring-repo-base.js';

describe('병합 직전 막힘 — 앞 단계가 먼저 걸린다', () => {
  const sha = 'm'.repeat(40);
  const 머리sha = 'a'.repeat(40);
  const 된것 = (낸것: string) => vi.fn((_기준: string, _머리: string) => ({ ok: true, 낸것, 까닭: '' }));
  const 실패 = (까닭: string) => vi.fn((_기준: string, _머리: string) => ({ ok: false, 낸것: '', 까닭 }));
  const 통과 = {
    메인: { sha } as { sha: string } | { 까닭: string },
    머리: { sha: 머리sha } as { sha: string } | { 까닭: string },
    목록: 된것('tests/a/A-001.spec.ts\n'),
    바탕: () => null,
  };
  const 아님 = '이 PR 은 케이스만 바꾼 것이 아니다 — 맥은 병합하지 않는다';

  it('목록은 main 과 병합할 머리 커밋의 diff 다 — 판정 사이에 브랜치가 움직여도 병합할 커밋의 것이다', () => {
    const 목록 = 된것('tests/a/A-001.spec.ts\n');
    const 테스트만 = vi.fn(() => true);
    expect(병합직전막힘({ ...통과, 목록, 테스트만 })).toBeNull();
    expect(목록).toHaveBeenCalledWith(sha, 머리sha);
    expect(테스트만).toHaveBeenCalledWith(['tests/a/A-001.spec.ts'], sha);
  });

  it('3000 개가 넘어도 다 판정한다 — 파일 API 상한이 없어졌다', () => {
    const 줄들 = Array.from({ length: 3500 }, (_, i) => `tests/a/A-${i}.spec.ts`).join('\n');
    const 테스트만 = vi.fn((파일들: string[], _기준: string) => 파일들.length === 3500);
    expect(병합직전막힘({ ...통과, 목록: 된것(`${줄들}\n`), 테스트만 })).toBeNull();
  });

  it('테스트만이 아니면 병합하지 않는다', () => {
    expect(병합직전막힘({ ...통과, 테스트만: () => false })).toBe(아님);
  });

  it('읽은 목록이 비었으면 병합하지 않는다', () => {
    expect(병합직전막힘({ ...통과, 목록: 된것(''), 테스트만: () => true })).toBe(아님);
  });

  it('목록을 못 읽었으면 테스트만을 묻지 않는다', () => {
    const 테스트만 = vi.fn(() => true);
    expect(병합직전막힘({ ...통과, 목록: 실패('bad object'), 테스트만 })).toBe('PR 의 바뀐 파일을 못 읽었다: bad object');
    expect(테스트만).not.toHaveBeenCalled();
  });

  it('머리 커밋을 못 받았으면 목록 · 테스트만을 묻지 않는다', () => {
    const 목록 = 된것('tests/a/A-001.spec.ts\n');
    const 테스트만 = vi.fn(() => true);
    expect(병합직전막힘({ ...통과, 머리: { 까닭: 'fetch 실패' }, 목록, 테스트만 })).toBe(
      'PR 머리를 못 받아 판정을 못 했다: fetch 실패',
    );
    expect(목록).not.toHaveBeenCalled();
    expect(테스트만).not.toHaveBeenCalled();
  });

  it('최신 main 을 못 받았으면 무엇보다 먼저 막고 목록을 묻지 않는다', () => {
    const 목록 = 된것('tests/a/A-001.spec.ts\n');
    const 테스트만 = vi.fn(() => false);
    expect(병합직전막힘({ ...통과, 메인: { 까닭: 'fetch 실패' }, 머리: { 까닭: 'x' }, 목록, 테스트만 })).toBe(
      '최신 main 을 못 받아 판정을 못 했다: fetch 실패',
    );
    expect(목록).not.toHaveBeenCalled();
    expect(테스트만).not.toHaveBeenCalled();
  });
});

describe('병합 직전 바탕 파일 — 판정이 이름만 보고 받은 셋을 다시 본다', () => {
  const sha = 'm'.repeat(40);
  const 머리sha = 'a'.repeat(40);
  const 파일들 = ['tests/package.json', 'tests/dmw/DMW-001.spec.ts'];
  const 막힘 = (바탕: ReturnType<typeof 바탕보기>) =>
    병합직전막힘({ 메인: { sha }, 머리: { sha: 머리sha }, 목록: () => ({ ok: true, 낸것: 파일들.join('\n'), 까닭: '' }), 테스트만: () => true, 바탕 });
  const 깃 = (기준에있음: boolean, 글: string) => (인자: string[]) =>
    인자[0] === 'cat-file' ? { ok: 기준에있음, 낸것: '', 까닭: '' } : { ok: true, 낸것: 글, 까닭: '' };

  it('대상 저장소 main 에 없던 것을 고정 글 그대로 새로 만들었으면 지나간다', () => {
    expect(막힘(바탕보기(깃(false, 바탕파일['tests/package.json']!), true))).toBeNull();
  });

  it('누가 PR 에 얹어 글이 바뀌었으면 막는다 — 설치 스크립트를 심을 수 있다', () => {
    expect(막힘(바탕보기(깃(false, '{"scripts":{"postinstall":"curl x"}}'), true))).toMatch(/정해 둔 꼴과 다르다/);
  });

  it('main 에 이미 있으면 바꾸지 않는다', () => {
    expect(막힘(바탕보기(깃(true, 바탕파일['tests/package.json']!), true))).toMatch(/이미 있는 바탕 파일/);
  });

  it('Commander(자기 저장소)에는 글이 같아도 막는다', () => {
    expect(막힘(바탕보기(깃(false, 바탕파일['tests/package.json']!), false))).toMatch(/Commander 저장소에는/);
  });

  it('바탕 파일이 없으면 git 을 안 친다', () => {
    const 친것 = vi.fn(() => ({ ok: true, 낸것: '', 까닭: '' }));
    expect(바탕보기(친것, true)(['tests/dmw/DMW-001.spec.ts'], sha, 머리sha)).toBeNull();
    expect(친것).not.toHaveBeenCalled();
  });
});
