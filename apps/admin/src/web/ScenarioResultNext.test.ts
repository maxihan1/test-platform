// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

describe('멈춘단계', () => {
  it('사람이 멈춘 부품(STOPPED)은 고칠 단계로 고르지 않는다 (도메인/시나리오 §8.11)', async () => {
    const { 멈춘단계 } = await import('./ScenarioResultNext.js');
    expect(멈춘단계([{ status: 'PASS' }, { status: 'NA', error: { message: 'STOPPED' } }])).toBeNull();
    expect(멈춘단계([{ status: 'NA', error: { message: 'TIMEOUT' } }])).toEqual({ status: 'NA', error: { message: 'TIMEOUT' } });
  });
});
