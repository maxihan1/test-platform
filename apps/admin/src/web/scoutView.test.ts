import { describe, expect, it } from 'vitest';

import { t } from './i18n.js';
import { 답풀기, 단계글, 링크주소, 조각붙이기, type 질문 } from './scoutView.js';

const 한국어 = (키: string, 값?: Record<string, string | number>) => t(키, 'ko', 값);
const 영어 = (키: string, 값?: Record<string, string | number>) => t(키, 'en', 값);
const 빈질문: 질문 = { id: 1, text: '질문', status: 'QUEUED', createdAt: '2026-11-11T00:00:00Z', answer: '', steps: [], lastSeq: 0 };

describe('Scout 답의 링크 꼴 넷 (도메인/챗봇 §3.14 「링크 꼴」)', () => {
  it('실행은 종류마다 그 결과 화면으로 간다', () => {
    expect(링크주소('run/FN/12', null)).toBe('#/runs/12');
    expect(링크주소('run/SCENARIO/5', null)).toBe('#/runs/5');
    expect(링크주소('run/CASE_RUN/7', null)).toBe('#/runs/7');
    expect(링크주소('run/COMPAT/3', null)).toBe('#/compat/runs/3');
    expect(링크주소('run/PERF_PAGE/87', null)).toBe('#/perf/runs/87');
  });

  it('케이스는 그 애플리케이션의 케이스 상세, 화면 키는 왼쪽 메뉴 주소다', () => {
    expect(링크주소('case/MKW-FN-001', null)).toBe('#/cases/fn?q=MKW-FN-001&case=MKW-FN-001&service=MKW');
    expect(링크주소('screen/cases', null)).toBe('#/cases');
    expect(링크주소('screen/perf', null)).toBe('#/perf/scenarios');
  });

  it('이슈는 그 프로젝트가 이은 Issue Bunker 주소로 가고, 잇지 않았으면 링크가 아니다', () => {
    expect(링크주소('issue/DM-12', 'https://bunker.test')).toBe('https://bunker.test/issues/DM-12');
    expect(링크주소('issue/DM-12', null)).toBeNull();
  });

  it('네 꼴 밖의 대상은 링크가 아니다 — 답에 심은 주소가 눌리지 않는다', () => {
    for (const 대상 of ['https://evil.test', '#/settings', 'javascript:alert(1)', 'run/RM/1', 'screen/settings', 'case/../x', 'run/FN/0']) {
      expect(링크주소(대상, 'https://bunker.test'), 대상).toBeNull();
    }
  });
});

describe('Scout 답 풀기 (§8.18 「답 모양」)', () => {
  it('표는 그리지 않고 줄마다 칸 · 칸 한 줄 목록으로 푼다 — 머리 줄은 버린다', () => {
    const 답 = '실패는 둘이에요.\n\n| 케이스 | 결과 |\n|---|---|\n| [MKW-FN-001](case/MKW-FN-001) | 실패 |\n| MKW-FN-002 | 통과 |';
    expect(답풀기(답, null)).toEqual([
      { 꼴: 'para', 줄: [{ 글: '실패는 둘이에요.' }] },
      {
        꼴: 'list',
        rows: [
          { 배지: null, 글: [{ 글: 'MKW-FN-001', 주소: '#/cases/fn?q=MKW-FN-001&case=MKW-FN-001&service=MKW' }, { 글: ' · 실패' }] },
          { 배지: null, 글: [{ 글: 'MKW-FN-002 · 통과' }] },
        ],
      },
    ]);
  });

  it('목록 줄 맨 앞의 [구분] 은 배지다. 링크가 아닌 주소는 글로 남는다', () => {
    const 덩이들 = 답풀기('- [회귀 실패] [MKW-UI-012](case/MKW-UI-012) · 쿠폰 — [여기](https://evil.test)', null);
    expect(덩이들).toEqual([
      {
        꼴: 'list',
        rows: [
          {
            배지: '회귀 실패',
            글: [{ 글: 'MKW-UI-012', 주소: '#/cases/ui?q=MKW-UI-012&case=MKW-UI-012&service=MKW' }, { 글: ' · 쿠폰 — ' }, { 글: '여기' }],
          },
        ],
      },
    ]);
  });
});

describe('Scout 진행 줄 (§8.18 「진행 줄」)', () => {
  it('도구 이름으로 글을 짓고 도는 줄은 「하는 중」 이 붙는다. 모르는 도구는 데이터 확인', () => {
    expect(단계글({ tool: 'run_result', ref: '12', done: true }, 한국어)).toBe('실행 #12 결과 확인');
    expect(단계글({ tool: 'perf_result', ref: '87', done: false }, 한국어)).toBe('성능 실행 #87 결과 확인하는 중');
    expect(단계글({ tool: 'bts_search', done: true }, 한국어)).toBe('이슈 검색');
    expect(단계글({ tool: 'map_search', done: true }, 한국어)).toBe('케이스 검색');
    expect(단계글({ tool: 'mystery', done: false }, 한국어)).toBe('데이터 확인하는 중');
    expect(단계글({ tool: 'run_list', done: false }, 영어)).toBe('Searching recent runs');
  });

  it('이어 받은 조각을 붙인다 — STEP_DONE 은 같은 도구의 안 끝난 첫 줄을 끝내고, 이미 받은 번호는 두 번 붙지 않는다', () => {
    let q = 조각붙이기(빈질문, 1, 'STEP', { tool: 'run_search' });
    expect(q.status).toBe('RUNNING');
    q = 조각붙이기(q, 2, 'STEP', { tool: 'run_result', ref: '12' });
    q = 조각붙이기(q, 3, 'STEP_DONE', { tool: 'run_result' });
    q = 조각붙이기(q, 4, 'TEXT', '실패가 ');
    q = 조각붙이기(q, 4, 'TEXT', '실패가 ');
    q = 조각붙이기(q, 5, 'TEXT', '3건이에요.');
    expect(q).toMatchObject({
      lastSeq: 5,
      answer: '실패가 3건이에요.',
      steps: [
        { tool: 'run_search', done: false },
        { tool: 'run_result', ref: '12', done: true },
      ],
    });
  });
});
