// 병합 뒤 상태 판단의 판별식 — 된 병합을 실패로 덮지 않는다
import { describe, expect, it } from 'vitest';
import { 병합뒤상태 } from './authoring-merge.js';

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
