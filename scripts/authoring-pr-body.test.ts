// 작성 PR 본문 조립과 GitHub 상한 맞추기 검사
import { describe, expect, it } from 'vitest';

import { PR본문, 본문상한 } from './authoring-pr-body.js';

const 바이트 = (글: string) => Buffer.byteLength(글, 'utf8');
const 경로 = 'docs/cases/MKT.md';
const 셈 = '원장: 요구 172 → 케이스 150 · 제외 22 · 빠짐 0\n⚠️ 빠짐 0\nUI 로만 덮음 11 — REQ-COM-003';
const 꼬리 = '관문 3 3회 실행: 133 passed · EXIT=0';

describe('PR본문 — 절 조립', () => {
  it('요구사항 표와 자식 요약을 싣고, 관문 3 의 3회 실행이 병합 근거라고 적는다', () => {
    const 글 = PR본문({ 표경로: 'docs/cases/MKT.md', 표: '| 요구 | 케이스 |', 요약: '케이스 4건' });
    expect(글).toContain('| 요구 | 케이스 |');
    expect(글).toContain('케이스 4건');
    expect(글).toMatch(/관문 3.*3회.*병합 근거/);
  });

  it('표가 없으면 표 절을 빼고 요약만 싣는다', () => {
    const 글 = PR본문({ 표경로: 'docs/cases/MKT.md', 표: '', 요약: '케이스 4건' });
    expect(글).not.toMatch(/요구사항 표/);
    expect(글).toContain('케이스 4건');
  });

  it('요약도 비면 그 절도 뺀다', () => {
    expect(PR본문({ 표경로: 'docs/cases/MKT.md', 표: '  ', 요약: '' })).not.toMatch(/## /);
  });

  it('단계표를 주면 요약 뒤 · 병합 근거 줄 앞에 「단계 시각 (이번 실행)」 절로 싣는다', () => {
    const 글 = PR본문({ 표경로: 'docs/cases/MKT.md', 표: '', 요약: '케이스 4건', 단계: '| 단계 | 시작 | 걸린 시간 |' });
    expect(글.indexOf('케이스 4건')).toBeLessThan(글.indexOf('## 단계 시각 (이번 실행)'));
    expect(글.indexOf('| 단계 | 시작 | 걸린 시간 |')).toBeLessThan(글.indexOf('병합 근거'));
  });

  it('단계표가 비거나 없으면 그 절을 뺀다', () => {
    expect(PR본문({ 표경로: 'docs/cases/MKT.md', 표: '', 요약: '케이스 4건', 단계: '' })).not.toMatch(/단계 시각/);
    expect(PR본문({ 표경로: 'docs/cases/MKT.md', 표: '', 요약: '케이스 4건' })).not.toMatch(/단계 시각/);
  });
});

describe('PR본문 — GitHub 상한(UTF-8 바이트) 안에 맞춘다', () => {
  it('짧으면 표를 그대로 싣는다', () => {
    expect(PR본문({ 표경로: 경로, 표: '| 요구 | 케이스 |', 요약: '케이스 4건' })).toContain('## 요구사항 표');
  });

  it('표가 길면 표 절을 경로 한 줄로 바꾸고 요약 · 단계 시각 · 병합 근거는 그대로다', () => {
    const 표 = '| 요구 | 케이스 |\n' + '| REQ-001 | 한글로 쓴 긴 케이스 이름 |\n'.repeat(3000);
    const 글 = PR본문({ 표경로: 경로, 표, 요약: `${셈}\n\n${꼬리}`, 단계: '| 단계 | 시작 | 걸린 시간 |' });
    expect(바이트(글)).toBeLessThanOrEqual(본문상한);
    expect(글).not.toContain('REQ-001');
    expect(글).toContain('`docs/cases/MKT.md`');
    expect(글).toContain(셈);
    expect(글).toContain(꼬리);
    expect(글).toContain('## 단계 시각 (이번 실행)');
    expect(글).toMatch(/병합 근거/);
  });

  it('표를 빼도 넘으면 요약의 머리글은 통째로 · 자식 출력은 앞줄부터 깎는다', () => {
    const 가운데 = Array.from({ length: 4000 }, (_, i) => `자식이 남긴 ${i}번째 긴 한글 줄입니다 ─────`);
    const 요약 = [셈, '', ...가운데, 꼬리].join('\n');
    const 글 = PR본문({ 표경로: 경로, 표: '| 짧은 표 |', 요약, 단계: '| 단계 |' });
    expect(바이트(글)).toBeLessThanOrEqual(본문상한);
    expect(글).toContain(셈);
    expect(글).toContain(꼬리);
    expect(글).toContain('…(줄임)…');
    expect(글).toContain('## 단계 시각 (이번 실행)');
  });

  it('관문 3 줄이 끝이 아니고 그 뒤 줄이 아주 길어도 관문 3 기록이 남는다 — 긴 줄을 먼저 자른다', () => {
    const 작업 = Array.from({ length: 28 }, (_, i) => `작업 ${i}`);
    const 결과 = ['관문 0 원장 대조: EXIT=0', '관문 1 형식: EXIT=0', '관문 2 표 대조: 일치', 꼬리, '관문 4 부수기: 기대값을 바꾸자 빨개졌다', `판정 불가·보류: ${'가'.repeat(25000)}`];
    const 글 = PR본문({ 표경로: 경로, 표: '| 표 |'.repeat(20000), 요약: [셈, '', ...작업, ...결과].join('\n') });
    expect(바이트(글)).toBeLessThanOrEqual(본문상한);
    expect(글).toContain(셈);
    expect(글).toContain(꼬리);
    expect(글).toContain('관문 4 부수기');
  });

  it('앞쪽 작업 줄이 모두 길어도 꼬리의 결과 요약(관문 3)을 남긴다 — 앞부터 깎는다', () => {
    const 작업 = Array.from({ length: 34 }, (_, i) => `${i} ${'나'.repeat(950)}`);
    const 결과 = [꼬리, '관문 4 부수기: 빨개졌다', '합친 것: 없음', '판정 불가·보류: 없음', '못 읽은 자료: 없음', '끝'];
    const 글 = PR본문({ 표경로: 경로, 표: '', 요약: [셈, '', ...작업, ...결과].join('\n'), 단계: '| 단계 |\n'.repeat(2500) });
    expect(바이트(글)).toBeLessThanOrEqual(본문상한);
    expect(글).toContain(꼬리);
  });

  it('마지막 줄 하나가 상한보다 길어도 그 줄 안을 잘라 상한 안에 든다 · 이모지를 반으로 가르지 않는다', () => {
    const 글 = PR본문({ 표경로: 경로, 표: '', 요약: `${셈}\n\n${꼬리}\n${'😀'.repeat(30000)}` });
    expect(바이트(글)).toBeLessThanOrEqual(본문상한);
    expect(글).toContain(꼬리);
    expect(글).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });

  it('머리글만으로 상한을 넘어도 끝을 바이트로 잘라 PR 을 열 수 있게 한다', () => {
    const 큰머리 = Array.from({ length: 20000 }, (_, i) => `빠짐 REQ-${i}`).join('\n');
    expect(바이트(PR본문({ 표경로: 경로, 표: '', 요약: `${큰머리}\n\n${꼬리}` }))).toBeLessThanOrEqual(본문상한);
  });

  it('상한은 55,000바이트 — 반영 때 덧붙는 겹침 처리 줄(최대 약 6,000자)이 들어갈 자리를 남긴다', () => {
    expect(본문상한).toBe(55_000);
  });
});
