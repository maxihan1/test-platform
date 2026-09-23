// 병합 뒤 상태 판단의 판별식 — 된 병합을 실패로 덮지 않는다
import { describe, expect, it } from 'vitest';
import { 당길까, 당김인자, 머지브랜치거부사유, 병합뒤상태, 한번에하나 } from './authoring-merge.js';

describe('머지브랜치거부사유 — 에이전트가 올린 그 PR 만 병합한다', () => {
  it('원본 요청이 올린 author-<번호> 이고 같은 저장소 것이면 통과다', () => {
    expect(머지브랜치거부사유({ headRefName: 'author-12', isCrossRepository: false }, 12)).toBeNull();
  });

  it('다른 브랜치면 거부한다 — 끝내기에 아무 PR 주소나 실려도 병합되지 않게', () => {
    expect(머지브랜치거부사유({ headRefName: 'feature-x', isCrossRepository: false }, 12)).toContain('author-12');
    expect(머지브랜치거부사유({ headRefName: 'author-13', isCrossRepository: false }, 12)).not.toBeNull();
  });

  it('포크에서 같은 이름으로 연 PR 은 거부한다', () => {
    expect(머지브랜치거부사유({ headRefName: 'author-12', isCrossRepository: true }, 12)).not.toBeNull();
  });

  it('원본 번호가 없으면 거부한다', () => {
    expect(머지브랜치거부사유({ headRefName: 'author-12', isCrossRepository: false }, undefined)).not.toBeNull();
  });
});

describe('한번에하나 — 서버 저장소에 쓰는 git 은 줄을 세운다', () => {
  it('앞 일이 끝나야 다음 일이 시작한다. 앞 일이 던져도 다음은 돈다', async () => {
    const 기록: string[] = [];
    const 쉬기 = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const a = 한번에하나(async () => {
      기록.push('a 시작');
      await 쉬기(20);
      기록.push('a 끝');
      throw new Error('a 실패');
    });
    const b = 한번에하나(async () => {
      기록.push('b 시작');
      return 'b';
    });
    await expect(a).rejects.toThrow('a 실패');
    await expect(b).resolves.toBe('b');
    expect(기록).toEqual(['a 시작', 'a 끝', 'b 시작']);
  });
});

describe('병합뒤상태 — 병합 명령이 성공했으면 상태를 못 읽어도 병합된 것이다', () => {
  it('상태를 읽었으면 그 값이다', () => {
    expect(병합뒤상태(true, { ok: true, 낸것: '{"state":"MERGED"}' })).toBe('MERGED');
    expect(병합뒤상태(false, { ok: true, 낸것: '{"state":"OPEN"}' })).toBe('OPEN');
  });

  it('풀기가 던져도 병합 명령이 성공했으면 MERGED', () => {
    expect(병합뒤상태(true, { ok: true, 낸것: '<html>나쁜 응답' })).toBe('MERGED');
    expect(병합뒤상태(true, { ok: false, 낸것: '' })).toBe('MERGED');
  });

  it('병합 명령이 실패했고 상태도 못 읽었으면 못 읽음', () => {
    expect(병합뒤상태(false, { ok: true, 낸것: '<html>' })).toBe('못 읽음');
    expect(병합뒤상태(false, { ok: false, 낸것: '' })).toBe('못 읽음');
  });
});

describe('당길까 — 병합 뒤 맥의 main 체크아웃을 당길지 (서버가 새 테스트를 보게)', () => {
  const 됨 = (낸것: string) => ({ ok: true, 낸것 });

  it('main 이고 깨끗하면 당긴다', () => {
    expect(당길까(됨('main\n'), 됨(''))).toBeNull();
  });

  it('main 이 아니면 건너뛰고 사유를 낸다', () => {
    expect(당길까(됨('feature\n'), 됨(''))).toMatch(/main 이 아니/);
  });

  it('고친 파일이 있으면 건너뛴다 — 사람의 작업을 건드리지 않는다', () => {
    expect(당길까(됨('main\n'), 됨(' M docs/a.md\n'))).toMatch(/고친 파일/);
  });

  it('가지나 상태를 못 읽으면 건너뛴다', () => {
    expect(당길까({ ok: false, 낸것: '' }, 됨(''))).toMatch(/못 읽/);
    expect(당길까(됨('main\n'), { ok: false, 낸것: '' })).toMatch(/못 읽/);
  });

  it('당길 때는 빨리감기만 하고 저장소 훅·fsmonitor 를 끈다 — 자식이 써 둔 훅이 맥 권한으로 돌지 않게', () => {
    expect(당김인자).toEqual([
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'core.fsmonitor=false',
      'pull',
      '--ff-only',
      'origin',
      'main',
    ]);
  });
});
