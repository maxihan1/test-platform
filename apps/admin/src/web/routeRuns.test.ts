// 실행 결과 화면 주소와 옛 좌우 칸 주소 옮기기 검사 (도메인/실행 §8.7 「목록 화면과 결과 화면을 따로」)

import { describe, expect, it } from 'vitest';

import { 실행결과주소, 옛실행주소 } from './route.js';

describe('실행 결과 주소', () => {
  it('실행 결과 주소는 번호 하나이고 펼칠 케이스와 목록 조건은 있을 때만 단다', () => {
    expect(실행결과주소(130)).toBe('#/runs/130');
    expect(실행결과주소(130, { 펼칠: 'MKT-UI-003' })).toBe('#/runs/130?tc=MKT-UI-003');
    expect(실행결과주소(130, { 목록: '' })).toBe('#/runs/130');
    expect(실행결과주소(130, { 펼칠: 'MKT-FN-014', 목록: 'state=failed&service=MKT' })).toBe('#/runs/130?tc=MKT-FN-014&list=state%3Dfailed%26service%3DMKT');
  });

  it('옛 주소(실행을 고른 좌우 칸)는 결과 화면 주소로 옮기고 결과 칸은 그대로 넘기며 목록 조건은 list 로 접는다', () => {
    expect(옛실행주소(new URLSearchParams('run=130'))).toBe('#/runs/130');
    expect(옛실행주소(new URLSearchParams('run=130&tc=MKT-FN-014'))).toBe('#/runs/130?tc=MKT-FN-014');
    expect(옛실행주소(new URLSearchParams('run=130&state=failed&page=2&tc=MKT-FN-014&status=FAIL'))).toBe(
      '#/runs/130?tc=MKT-FN-014&status=FAIL&list=state%3Dfailed%26page%3D2',
    );
  });

  it('옛 주소가 아니면 옮기지 않는다 — 고른 실행이 없거나 숫자가 아닌 경우', () => {
    expect(옛실행주소(new URLSearchParams('state=failed'))).toBeNull();
    expect(옛실행주소(new URLSearchParams('run=abc'))).toBeNull();
    expect(옛실행주소(new URLSearchParams(''))).toBeNull();
  });
});
