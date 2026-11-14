// QA 리포트 첫 장 글 — 시안 B 차례 · 빈 값 문구 · 기대 결과 변경 강조 (도메인/리포팅 §3.17)
import { describe, expect, it } from 'vitest';

import type { 리포트응답 } from './qaReportDoc.js';
import type { 변경사항 } from './qaReportChanges.js';
import type { 첫장 } from './qaReportSummary.js';
import { 첫장글, 결과글, type 덩이 } from './qaReportText.js';

const 첫장재료 = (changes: 변경사항 | null): 첫장 => ({
  kinds: ['FN', 'UI'],
  overview: {
    serviceName: '데모마켓 웹', env: 'qa', baseUrl: 'https://qa.demo.test', buildNo: '1.4.2', testsRepo: null,
    startedAt: '2026-11-12T01:00:00.000Z', finishedAt: '2026-11-12T02:30:00.000Z', performers: [{ username: 'kim', name: '김' }], runs: 2, running: 0,
  },
  results: {
    functional: [
      { kind: 'FN', result: { pass: 3, fail: 1, notRun: 0, unconfirmed: 2 } },
      { kind: 'UI', result: { pass: 1, fail: 0, notRun: 0, unconfirmed: 0 } },
      { kind: 'E2E', result: null },
    ],
    nonFunctional: [
      { kind: 'COMPAT', quality: 'COMPATIBILITY', result: null },
      { kind: 'PERF', quality: 'PERFORMANCE_EFFICIENCY', result: null },
      { kind: 'STAB', quality: 'RELIABILITY', result: null },
    ],
  },
  plan: { cases: [{ kind: 'FN', planned: 5, ran: 4, notIncluded: [{ tcId: 'DM-FN-005', name: '쿠폰' }], notRun: [] }], e2e: ['구매 흐름'], compat: [], perf: [] },
  failures: { counts: { PRODUCT: 0, TEST: 0, ENV: 0, UNCLASSIFIED: 1 }, items: [{ kind: 'FN', tcId: 'DM-FN-001', platform: 'desktop', runId: 7, class: 'UNCLASSIFIED', by: null, issueKey: null }] },
  previous: null,
  changes,
});

const 리포트 = (summary: 첫장, approval: 리포트응답['approval'] = null): 리포트응답 => ({
  id: 1, service: 'DM', env: 'qa', buildNo: summary.overview.buildNo, runId: null, perfRunId: null, version: 1, versions: [],
  summary, ai: null, runIds: [7], perfRunIds: [], performers: ['kim'], approval, updatedAt: '2026-11-12T02:31:00.000Z',
});

const 절들 = (덩이들: 덩이[]) => 덩이들.flatMap((d) => (d.꼴 === '절' ? [d.글] : []));
const 글들 = (덩이들: 덩이[]) => 덩이들.flatMap((d) => (d.꼴 === '글' ? [d.글] : d.꼴 === '표' ? d.줄.flatMap((z) => z.칸) : []));

const 첫빌드: 변경사항 = { product: { linked: false }, requirements: null, tests: null, confirmed: [] };

describe('QA 리포트 첫 장 글', () => {
  it('시안 B 차례로 선다', () => {
    expect(절들(첫장글(리포트(첫장재료(첫빌드))))).toEqual(['개요', '결과 요약', '변경 사항', '계획 대비 차이', '실패 분류', '남은 리스크', '승인']);
  });

  it('빌드 없는 리포트는 변경 사항 절이 없다', () => {
    expect(절들(첫장글(리포트(첫장재료(null))))).not.toContain('변경 사항');
  });

  it('앞 빌드가 없으면 요구사항 · 테스트는 「견줄 이전 빌드 없음」, Issue Bunker 를 안 이었으면 「Issue Bunker 미연결」', () => {
    const 글 = 글들(첫장글(리포트(첫장재료(첫빌드))));
    expect(글.filter((x) => x === '견줄 이전 빌드 없음')).toHaveLength(2);
    expect(글).toContain('Issue Bunker 미연결');
  });

  it('배포가 없으면 「연결된 배포 없음」, 테스트 버전이 없으면 「기록 없음」', () => {
    const 글 = 글들(첫장글(리포트(첫장재료({ ...첫빌드, product: { linked: true, deploys: [], issues: [] }, tests: { recorded: false } }))));
    expect(글).toContain('연결된 배포 없음');
    expect(글).toContain('기록 없음');
  });

  it('기대 결과가 바뀐 케이스를 따로 강조해 맨 앞에 두고, 까닭이 없으면 「사유 기록 없음」 · PR 제목이 비면 번호와 주소만', () => {
    const 덩이들 = 첫장글(
      리포트(
        첫장재료({
          product: { linked: true, deploys: [{ buildNo: 'abc1234-1112', at: '2026-11-12T00:30:00.000Z' }], issues: [{ key: 'DM-12', type: 'BUG', title: null, prs: [{ number: 31, url: 'https://git.test/pr/31', title: '' }] }] },
          requirements: { from: 3, to: 4, added: [], changed: [{ reqId: 'DM-REQ-002', text: '비밀번호는 10자 이상' }], removed: [] },
          tests: {
            recorded: true, fromCommit: 'aaaaaaaaaa', toCommit: null, added: [], removed: [],
            modified: [
              { tcId: 'DM-FN-002', name: '이름', reason: { kind: 'EDIT', requestId: 5, issueKey: null, prUrl: null }, file: true, expected: false },
              { tcId: 'DM-FN-001', name: '가입', reason: null, file: false, expected: true },
            ],
          },
          confirmed: [],
        }),
      ),
    );
    const 테스트표 = 덩이들.find((d) => d.꼴 === '표' && d.머리[0] === '구분' && d.머리[3] === '까닭');
    expect(테스트표).toMatchObject({ 줄: [{ 칸: ['수정', 'DM-FN-001 가입', '기대 결과 변경', '사유 기록 없음'], 결: '강조' }, { 칸: ['수정', 'DM-FN-002 이름', '케이스 파일', '케이스 수정 요청 (작성 요청 #5)'] }] });
    expect(덩이들).toContainEqual({ 꼴: '글', 글: '기대 결과가 바뀐 케이스 1건', 결: '강조' });
    const 글 = 글들(덩이들);
    expect(글).toContain('#31\nhttps://git.test/pr/31');
    expect(글).toContain('제목 기록 없음');
    expect(글).toContain('테스트 커밋 aaaaaaa → 기록 없음');
    expect(글).toContain('PRD 버전 3 → 4');
  });

  it('미확정 · 판정이 필요한 실패 · 승인 상태를 적는다', () => {
    const 글 = 글들(첫장글(리포트(첫장재료(첫빌드))));
    expect(글).toContain('통과 3 · 실패 1 · 미실행 0 (그중 미확정 2건)');
    expect(글).toContain('판정이 필요한 실패 1건');
    expect(글).toContain('승인 전');
    expect(글).toContain('이번 빌드에 실행하지 않은 E2E 시나리오: 구매 흐름');
    const 승인 = 글들(첫장글(리포트(첫장재료(첫빌드), { by: 'lee', byName: '이', at: '2026-11-13T00:00:00.000Z', late: true, sha256: 'ab' })));
    expect(승인).toContain('승인됨 · 이 · 2026-11-13 00:00 UTC · 버전 1 · 사후 승인');
  });

  it('안정화 줄은 세 겹이고 기록이 없으면 「이 빌드로 실행한 정기 실행 없음」', () => {
    expect(결과글({ kind: 'STAB', quality: 'RELIABILITY', result: null })).toBe('이 빌드로 실행한 정기 실행 없음');
    expect(
      결과글({
        kind: 'STAB', quality: 'RELIABILITY',
        result: { day: '2026-11-12', days: 3, passErrorCases: 2, cases: 5, residual: 3, newErrors: 1, reopened: 1, confirmed: 0, sources: [{ source: 'APP_CRASH', cases: 2 }, { source: 'APP_ANR', cases: 0 }] },
      }),
    ).toBe('판정은 통과했지만 오류가 난 케이스 2건 / 기록이 있는 케이스 5건 (3일 중 마지막 날 기준)\n크래시 발생 케이스 2건 · ANR 발생 케이스 0건\n잔여 오류 3 · 신규 1 · 재발 1 · 해결 확인 0');
  });
});
