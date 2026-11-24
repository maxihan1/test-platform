// E2E 증적이 프로시저 단계를 프로시저 이름과 케이스마다의 판정으로 적는지 본다 (도메인/시나리오 §3.7 결정 17 · 도메인/리포팅 §8.4). 순수 함수라 DB 를 쓰지 않는다

import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import type { ScenarioRunPart, ScenarioRunResult } from '../web/scenarioApi.js';
import { E2E모양, 프로시저요약 } from './collectScenario.js';
import { renderScenarioHtml } from './htmlScenario.js';
import { renderScenarioXlsx } from './xlsx.js';

const 프로시저부품: ScenarioRunPart = {
  seq: 1,
  kind: 'case',
  tcId: 'MTA-FN-101',
  tcName: '글쓰기',
  part: { kind: 'case', tcId: 'MTA-FN-101', params: { 제목: '안녕' }, expected: {}, skipSteps: [] },
  status: 'FAIL',
  durationMs: 9000,
  skippedSteps: [],
  mocks: [],
  paramSchema: null,
  expectedSchema: null,
  precondition: ['앱이 켜져 있다'],
  unconfirmed: null,
  bound: {},
  cleanup: [],
  steps: [
    { seq: 1, tcId: 'MTA-FN-100', title: '로그인한다', status: 'PASS', durationMs: 10, assertions: [] },
    { seq: 2, tcId: 'MTA-FN-101', title: '글을 쓴다', status: 'FAIL', durationMs: 10, assertions: [{ statement: '글이 올라간다', status: 'FAIL', expected: '완료', actual: '실패' }] },
  ],
  error: { message: '버튼이 없습니다' },
  trace: null,
  procId: 'MTA-TP-022',
  procName: '글쓰기 흐름',
  cases: [
    { tcId: 'MTA-FN-100', name: '로그인', status: 'PASS', durationMs: 1000 },
    { tcId: 'MTA-FN-101', name: '글쓰기', status: 'FAIL', durationMs: 8000, error: { message: '버튼이 없습니다' } },
    { tcId: 'MTA-FN-102', name: '글 지우기', status: 'NA', error: { message: 'BLOCKED' }, blockedBy: 'MTA-FN-101' },
    { tcId: 'MTA-FN-103', name: '로그아웃', status: 'NA', error: { message: 'BLOCKED' }, blockedBy: 'MTA-FN-101' },
  ],
};

const 결과 = (parts: ScenarioRunPart[]): Omit<ScenarioRunResult, 'evidence'> => ({
  scenarioId: 12,
  version: 3,
  status: 'FINISHED',
  platform: 'android',
  title: '글쓰기 시나리오',
  env: 'qa',
  baseUrl: 'https://qa.example.com',
  triggeredBy: 'kim',
  triggeredByName: '김검사',
  startedAt: '2026-11-24T05:20:00.000Z',
  finishedAt: '2026-11-24T05:21:00.000Z',
  parts,
});

const 모양 = E2E모양(77, 결과([프로시저부품]), { serviceName: '마스토돈', testsRepo: 'https://git.example.com/t' });
const html = renderScenarioHtml(모양, { generatedAt: '2026-11-24 15:00' });

describe('E2E 증적 · 프로시저 단계', () => {
  it('단계 머리가 프로시저 번호 · 이름이고 요약 한 줄에 Blocked 를 괄호로 센다', () => {
    expect(html).toContain('<span class="tc-id">MTA-TP-022</span><span class="tc-name">글쓰기 흐름</span>');
    expect(html).toContain('<span class="badge">프로시저</span>');
    expect(html).toContain('4건 · Pass 1 · Fail 1 · Not tested 2 (Blocked 2)');
  });

  it('케이스마다 판정 줄이 서고 Blocked 는 Blocked 배지와 사유다', () => {
    expect(html).toContain('<span class="verdict v-pass">Pass</span><span class="tc-id">MTA-FN-100</span>');
    expect(html).toContain('<span class="verdict v-fail">Fail</span><span class="tc-id">MTA-FN-101</span>');
    expect(html).toContain('<span class="verdict v-na">Blocked</span><span class="tc-id">MTA-FN-102</span>');
    expect(html).toContain('선행 케이스 MTA-FN-101 실패');
  });

  it('절차는 케이스 블록 안에 tcId 로 갈려 들고, 고른 케이스만 사전 조건과 입력을 든다', () => {
    const 첫 = html.indexOf('MTA-FN-100</span>');
    const 둘 = html.indexOf('MTA-FN-101</span>', 첫);
    expect(html.slice(첫, 둘)).toContain('로그인한다');
    expect(html.slice(첫, 둘)).not.toContain('글을 쓴다');
    expect(html.slice(둘)).toContain('글을 쓴다');
    expect(html.slice(둘)).toContain('앱이 켜져 있다');
    expect(html.slice(둘)).toContain('제목');
  });

  it('프로시저가 없는 케이스 단계는 케이스 번호 · 이름 그대로다', () => {
    const 옛 = renderScenarioHtml(
      E2E모양(78, 결과([{ ...프로시저부품, procId: undefined, procName: undefined, cases: undefined, steps: [] }]), { serviceName: 'x', testsRepo: 'y' }),
      { generatedAt: '2026-11-24 15:00' },
    );
    expect(옛).toContain('<span class="tc-id">MTA-FN-101</span><span class="tc-name">글쓰기</span>');
    expect(옛).not.toContain('<span class="badge">프로시저</span>');
  });

  it('안 돈 케이스(status 없음)는 Not tested 로 센다', () => {
    const 단계 = E2E모양(79, 결과([{ ...프로시저부품, cases: [{ tcId: 'MTA-FN-100', name: '로그인' }, { tcId: 'MTA-FN-101', name: '글쓰기' }] }]), { serviceName: 'x', testsRepo: 'y' }).parts[0]!;
    expect(프로시저요약(단계.프로시저!)).toBe('2건 · Pass 0 · Fail 0 · Not tested 2');
  });

  it('엑셀은 케이스마다 행을 내고 케이스 칸이 그 케이스 번호다', async () => {
    const 통 = await renderScenarioXlsx(모양, { generatedAt: '2026-11-24 15:00' });
    const 책 = new ExcelJS.Workbook();
    await 책.xlsx.load(통 as unknown as ArrayBuffer);
    const 전부: string[] = [];
    책.getWorksheet('E2E 리포트')!.eachRow((행) => 전부.push(행.values.toString()));
    for (const tc of ['MTA-FN-100', 'MTA-FN-101', 'MTA-FN-102', 'MTA-FN-103']) expect(전부.some((줄) => 줄.includes(tc))).toBe(true);
    expect(전부.some((줄) => 줄.includes('프로시저 MTA-TP-022 글쓰기 흐름'))).toBe(true);
  });
});
