// 병합 뒤 상태 판단의 판별식 — 된 병합을 실패로 덮지 않는다
import { describe, expect, it } from 'vitest';
import { 당길까, 당김인자, 병합뒤상태 } from './authoring-merge.js';

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

  it('당길 때는 빨리감기만 한다 — 병합 커밋을 몰래 만들지 않는다', () => {
    expect(당김인자).toEqual(['pull', '--ff-only', 'origin', 'main']);
  });
});
