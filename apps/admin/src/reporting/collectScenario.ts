// 시나리오 실행 한 부를 E2E 증적이 쓸 표시용 모델로 바꾼다 (도메인/리포팅 §8.4 「E2E 시나리오 증적」)
// 글자는 결과 화면과 같은 함수로 만든다 — 증적에 찍는 글자는 결과 화면과 같아야 한다 (도메인/시나리오 §8.11 「화면 글자」)

import type { ItemStatus, Platform } from '@platform/kit';

import { 시나리오결과 } from '../scenario/runRoutes.js';
import { t } from '../web/i18n.js';
import type { ScenarioRunPart, ScenarioRunResult } from '../web/scenarioApi.js';
import { 값연결글, 건너뜀번호, 미확정있나, 접은판정 } from '../web/scenarioResultView.js';
import { 카드요약, 종류글 } from '../web/scenarioView.js';
import { toFields, type EvidenceHeader, type EvidenceItem, type EvidenceStep } from './collect.js';

export interface E2E단계 {
  seq: number;
  /** 단계 종류 글자 — 케이스 · API 호출 · 모킹 켜기 … */
  종류: string;
  /** 케이스가 아닌 단계의 한 줄. 모킹은 「실제 서버 응답이 아님」까지 붙인다 */
  요약: string;
  status: ItemStatus;
  안돌았다: boolean;
  /** 모킹 켜기 · 끄기가 통과하면 판정 대신 「적용됨」이다 (결과 화면과 같다) */
  적용됨: boolean;
  durationMs: number | null;
  /** 이 단계가 도는 동안 걸려 있던 모킹 무늬. 모킹 켜기 자신은 비운다 */
  모킹구간: string[];
  /** 모킹 구간 안의 API 단계 — 그 호출은 모킹되지 않는다 */
  모킹안탐: boolean;
  단독실행: boolean;
  /** 케이스 단계만. 블록 모양은 케이스 증적과 같다 */
  item: EvidenceItem | null;
  건너뜀: string[];
  값연결: { 종류: string; 글: string }[];
  /** 케이스가 아닌 단계가 실패하거나 판정을 못 낸 사유 */
  사유: string | null;
}

export interface E2E증적 {
  runId: number;
  header: EvidenceHeader;
  scenarioId: number;
  version: number;
  platform: Platform;
  /** 도는 중이면 null — 증적은 끝난 실행만 만들므로 실제로는 늘 찬다 */
  verdict: ItemStatus | null;
  unconfirmed: boolean;
  parts: E2E단계[];
  /** 마지막 단계 뒤에 적는 끝에 보낸 정리 — 증적만 「(N번이 미룸)」을 붙인다 (도메인/시나리오 §8.11) */
  정리: string[];
}

type 결과 = Omit<ScenarioRunResult, 'evidence'>;

const 기록없음 = '기록 없음';

function 절차(s: ScenarioRunPart['steps'][number]): EvidenceStep {
  return {
    seq: s.seq,
    title: s.title,
    status: s.status,
    durationMs: s.durationMs,
    assertions: s.assertions.map((a) => ({
      statement: a.statement,
      expected: String(a.expected),
      actual: String(a.actual),
      status: a.status,
      blocker: a.blocker === true,
    })),
    // 사진은 경로만 옮긴다. 심는 것은 generate.ts 가 케이스 증적과 같은 검사를 거쳐 한다
    screenshotPath: s.screenshotPath ?? null,
    ...(s.skipped === true ? { skipped: true as const } : {}),
  };
}

function 케이스항목(p: ScenarioRunPart, platform: Platform, 안돌았다: boolean): EvidenceItem | null {
  if (p.part.kind !== 'case') return null;
  const 판정못냄 = p.status === 'NA' && !안돌았다 && p.error !== null && p.error.message !== '';
  return {
    tcId: p.tcId ?? '',
    tcName: p.tcName ?? '',
    platform,
    attempt: 1,
    status: 안돌았다 ? 'NOT_RUN' : p.status,
    durationMs: 안돌았다 ? null : p.durationMs,
    notRunReason: 판정못냄 ? (p.error?.message ?? null) : null,
    unconfirmed: p.unconfirmed,
    precondition: p.precondition,
    // 결과 화면처럼 꽂은 값을 입력 칸에 겹쳐 보인다. 가리기는 서버 응답이 이미 했고 toFields 가 한 번 더 한다
    params: toFields({ ...p.part.params, ...p.bound }, p.paramSchema),
    expected: toFields(p.part.expected, p.expectedSchema),
    steps: p.steps.map(절차),
  };
}

function 단계(p: ScenarioRunPart, 결과: 결과): E2E단계 {
  const 안돌았다 = p.status === 'NA' && p.error?.message === 'NOT_RUN';
  const 케이스 = p.part.kind === 'case' ? p.part : null;
  const 모킹구간 = p.kind === 'mock' ? [] : p.mocks;
  const 요약 = 케이스 !== null ? '' : 카드요약(p.part, undefined, 'ko');
  return {
    seq: p.seq,
    종류: t(종류글[p.kind], 'ko'),
    요약: p.kind === 'mock' ? `${요약} (실제 서버 응답이 아님)` : 요약,
    status: p.status,
    안돌았다,
    적용됨: (p.kind === 'mock' || p.kind === 'unmock') && p.status === 'PASS',
    durationMs: p.durationMs,
    모킹구간,
    모킹안탐: 모킹구간.length > 0 && p.kind === 'api',
    단독실행: 케이스?.carryOver === false,
    item: 케이스항목(p, 결과.platform, 안돌았다),
    건너뜀: p.skippedSteps.map((제목) => {
      const 번호 = 건너뜀번호(결과.parts, p.seq, 제목);
      return 번호 === null
        ? t('준비 「{제목}」 건너뜀', 'ko', { 제목 })
        : t('준비 「{제목}」 — {번호}번에서 이미 실행', 'ko', { 제목, 번호 });
    }),
    값연결: (케이스?.links ?? []).map((link) => 값연결글(link, p.bound, 'ko')),
    사유:
      케이스 === null && !안돌았다 && p.status !== 'PASS' && p.error !== null && p.error.message !== ''
        ? p.error.message
        : null,
  };
}

/** 순수 함수 — DB 없이 검사한다. 머리 둘(서비스 이름 · 저장소)만 test_run 에서 따로 온다 */
export function E2E모양(runId: number, 결과: 결과, 머리: { serviceName: string; testsRepo: string }): E2E증적 {
  return {
    runId,
    header: {
      serviceName: 머리.serviceName === '' ? 기록없음 : 머리.serviceName,
      testsRepo: 머리.testsRepo === '' ? 기록없음 : 머리.testsRepo,
      title: 결과.title,
      kind: 'E2E 시나리오',
      startedAt: 결과.startedAt,
      triggeredByName:
        결과.triggeredByName === null || 결과.triggeredByName === '' ? '실행자 미상 (인증 도입 이전)' : 결과.triggeredByName,
      env: 결과.env === '' ? 기록없음 : 결과.env,
      baseUrl: 결과.baseUrl === '' ? 기록없음 : 결과.baseUrl,
    },
    scenarioId: 결과.scenarioId,
    version: 결과.version,
    platform: 결과.platform,
    verdict: 접은판정(결과.parts, 결과.status),
    unconfirmed: 미확정있나(결과.parts),
    parts: 결과.parts.map((p) => 단계(p, 결과)),
    정리: 결과.parts.flatMap((p) =>
      p.cleanup.map((c) =>
        c.error === undefined
          ? `정리 · 마지막에 실행 ${c.method} ${c.url} → ${c.status ?? '—'} (${p.seq}번이 미룸)`
          : `정리 · 마지막에 실행 ${c.method} ${c.url} — ${c.error} (${p.seq}번이 미룸)`,
      ),
    ),
  };
}

export async function collectScenario(runId: number): Promise<E2E증적 | null> {
  // 화면 응답과 같은 값이다 — 비밀값 가리기도 거기서 한 번에 끝났다 (도메인/시나리오 §7)
  const 결과 = await 시나리오결과(runId);
  if (결과 === null) return null;
  const { pool } = await import('../db/index.js');
  const 머리 = await pool.query<{ service_name: string; tests_repo: string }>(
    'SELECT service_name, tests_repo FROM test_run WHERE run_id = $1',
    [runId],
  );
  const 행 = 머리.rows[0];
  return E2E모양(runId, 결과, { serviceName: 행?.service_name ?? '', testsRepo: 행?.tests_repo ?? '' });
}
