// 실행 한 부를 읽어 증적 문서가 쓸 표시용 모델로 바꾼다 (SPEC §3.3)
// test_case 는 한 줄도 읽지 않는다. 카탈로그를 섞으면 케이스를 고친 날 과거 증적이 같이 흔들린다

import type { DeviceInfo, ItemStatus, Platform, ShapeCheck } from '@platform/kit';

import type { Pool } from 'pg';
import { 팜기록글 } from '../execution/farmEvidence.js';
import { 종류조건 } from '../execution/runKind.js';
import { 한국시각초 } from '../kst.js';
import { 다시실행칸들, 다시실행칸으로, 지금항목, type 다시실행원재료 } from '../execution/single.js';
import { 단위비밀들 } from '../execution/execRead.js';
import { 항목비밀 } from '../execution/trial.js';
import type { EvidenceTrace } from './apiTrace.js';
import { toFields, toStep, 기기글, type RawStep } from './collectFields.js';
import { 막힘을채운다, 실행단위들읽기 } from './collectProc.js';
import { Blocked인가, 돈항목사유, 미실행사유를찾는다, type RunStatus } from './collectReason.js';
import { 원래항목읽기, 지금열 } from './collectRerun.js';

export { 돈항목사유 } from './collectReason.js';
export { toFields, 값글자, 기기글 } from './collectFields.js';

export interface EvidenceField {
  label: string;
  value: string;
}

export interface EvidenceAssertion {
  statement: string;
  expected: string;
  actual: string;
  status: ItemStatus;
  blocker: boolean;
}

export interface EvidenceStep {
  seq: number;
  /** E2E 프로시저 단계의 절차만 — 그 절차가 든 케이스. 절차를 케이스마다 묶는다 (도메인/시나리오 §3.7 결정 17) */
  tcId?: string;
  title: string;
  status: ItemStatus;
  durationMs: number | null;
  assertions: EvidenceAssertion[];
  screenshotPath: string | null;
  /** API 애플리케이션 항목만 — 가린 요청 · 응답 원문과 응답 형식 검사. 화면 케이스는 원문을 안 넣는다 (도메인/API §3.8) */
  httpTrace?: EvidenceTrace;
  shapeChecks?: ShapeCheck[];
  /** E2E 시나리오에서 사람이 체크를 풀어 건너뛴 「만들기」 절차. 판정 대신 「건너뜀」으로 적는다 (도메인/리포팅 §8.4) */
  skipped?: true;
}

export interface EvidenceItem {
  tcId: string;
  tcName: string;
  platform: Platform;
  /** 앱 항목을 돌린 폰 · 앱 판을 한 줄로(기기글). 브라우저 항목과 연결이 안 열린 앱 항목은 null (APP-F1-05) */
  device?: string | null;
  /** 팜이 찍은 화면 영상 · logcat 이 실행 화면에 있다는 한 줄. 문서에는 영상을 못 넣는다 (도메인/러너 §5.2 · APP-F1-12) */
  farm?: string | null;
  attempt: number;
  /** 'NOT_RUN' 은 돌지 못한 항목이다. finished_at 이 빈 행이 여기로 온다 */
  status: ItemStatus | 'NOT_RUN';
  durationMs: number | null;
  notRunReason: string | null;
  /**
   * 미확정 사유 — 실행을 만들 때 박제된 값(`run_item.unconfirmed`). 비면 확정 항목이다.
   * 케이스가 나중에 확정돼도 그날의 증적은 그대로여야 한다 (도메인/리포팅 · 실행 §3.2)
   */
  unconfirmed: string | null;
  precondition: string[];
  params: EvidenceField[];
  expected: EvidenceField[];
  /** 실행을 만들 때 박제한 케이스 코드의 확인 문장. null 이거나 없으면 이 칸 전의 줄이다 — 문서는 돈 절차의 문장을 쓴다 (reporting/expectedLines.ts) */
  verifyStatements?: string[] | null;
  steps: EvidenceStep[];
  /** 프로시저 안 케이스만 — 프로시저 번호 · 이름 · 그 안 차례 · 실행 단위의 케이스 수. 옛 꼴 케이스와 실행 단위 칸 전의 줄에는 없다 (도메인/리포팅 §3.3 「증적 문서 · 엑셀」) */
  procedure?: { id: string; name: string; seq: number; count: number } | null;
  /** Blocked 로 끝난 줄만 — 막은 케이스 번호(kit 이 못 정했으면 null). 판정은 Not tested 그대로다 (실행 §3.2 「판정이 아닌 결과」) */
  blocked?: { by: string | null };
  /** 한 건 실행이 덮은 항목만 — 이 항목이 다시 돈 결과이고 원래 항목이 여기 남는다 (도메인/리포팅 §8.4 「다시 실행이 붙은 실행」) */
  rerun?: { finishedAt: string; triggeredBy: string; original: EvidenceItem };
}

export interface EvidenceHeader {
  serviceName: string;
  testsRepo: string;
  title: string;
  // 실행 하나에 한 종류다. 사람이 읽는 말로 싣는다 — 「UI 테스트」 · 「기능 테스트」 (SPEC 리포팅 §8.4 · PR #131)
  kind: string;
  startedAt: string;
  triggeredByName: string;
  env: string;
  baseUrl: string;
  /** 이 실행의 앱 항목이 쓴 폰 · 앱 판(겹침 없이). 비면 머리에 「기기」 줄을 안 그린다 — 브라우저 실행 · E2E 증적 (APP-F1-05) */
  devices?: string[];
}

export interface EvidenceDocument {
  runId: number;
  header: EvidenceHeader;
  items: EvidenceItem[];
}

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

interface RawRun {
  run_id: string;
  title: string;
  status: RunStatus;
  service_name: string;
  tests_repo: string;
  triggered_by_name: string | null;
  env: string;
  base_url: string;
  started_at: Date;
  kind: string;
  /** 실행에 박제하지 않고 읽는다 — 종류는 만들 때 정하고 못 바꾼다(settings/routes.ts) · 실행이 있는 애플리케이션은 외래키가 못 지우게 한다 */
  service_kind: 'SCREEN' | 'APP' | 'GAME' | 'API' | null;
}

export interface RawItem {
  history_id: string;
  tc_id: string;
  tc_name: string;
  platform: Platform;
  attempt: number;
  status: ItemStatus;
  duration_ms: number | null;
  finished_at: Date | null;
  error: unknown;
  unconfirmed: string | null;
  precondition: string[];
  params: unknown;
  expected: unknown;
  param_schema: unknown;
  expected_schema: unknown;
  device: DeviceInfo | null;
  verify_statements?: string[] | null;
  /** 실행 단위 칸(2026-11-24 TP-F2-10 · 11) — 그 전의 줄은 비어 있다 */
  exec_id?: string | null;
  exec_seq?: number | null;
  blocked_by?: string | null;
  case_started_at?: Date | null;
  case_finished_at?: Date | null;
}

/** 박제 이전 행의 빈 칸. 지어내지 말고 모른다고 적는다 (SPEC §6) */
const 기록없음 = '기록 없음';

/**
 * 고른 — QA 리포트 구획이 쓴다(「<tcId> <platform>」 목록). 그 케이스 × 디바이스만 읽고, 붙은 실행과 빌드가 다른 한 건 실행은 덮지 않는다 —
 * 첫 장 숫자와 같은 결과를 그리게 한다 (도메인/리포팅 §3.17 「묶음 · 버전」). 없으면 증적대로 실행 전부다
 */
export async function collectRun(runId: number, 고른?: string[]): Promise<EvidenceDocument | null> {
  const pool = await db();
  // 시나리오 실행은 run_item 이 없어 케이스 모양이 비어 나온다. 번호가 맞아도 없는 실행으로 본다 (도메인/시나리오 §3.7 결정 10)
  const runs = await pool.query<RawRun>(
    `SELECT run_id, title, status, service_name, tests_repo, triggered_by_name, env, base_url, started_at, kind,
            (SELECT kind FROM service WHERE id = test_run.service_id) AS service_kind
       FROM test_run WHERE run_id = $1 AND ${종류조건('case', '')}`,
    [runId],
  );
  const run = runs.rows[0];
  if (run === undefined) return null;

  // 지금 결과로 읽는다 — 한 건 실행이 덮은 자리는 다시 돈 항목이다. 줄 차례는 원래 항목 차례를 지킨다
  const items = await pool.query<RawItem & 다시실행원재료>(
    `SELECT ${지금열}, ${다시실행칸들}
       FROM ${
         고른 === undefined
           ? 지금항목('o.run_id = $1')
           : 지금항목("o.run_id = $1 AND o.tc_id || ' ' || o.platform = ANY($2::text[])", ' AND sr.build_no IS NOT DISTINCT FROM (SELECT build_no FROM test_run WHERE run_id = $1)')
       } i ORDER BY COALESCE(i.orig_history_id, i.history_id)`,
    고른 === undefined ? [runId] : [runId, 고른],
  );
  const 원래들 = await 원래항목읽기(pool, items.rows);

  // 다시 돈 항목 · 원래 항목의 절차는 다른 history_id 라 번호 목록으로 읽는다
  const steps = await pool.query<RawStep>(
    `SELECT s.history_id, s.seq, s.title, s.status, s.duration_ms, s.assertions, s.screenshot_path, s.error, s.http_trace, s.shape_checks
       FROM run_item_step s WHERE s.history_id = ANY($1::bigint[]) ORDER BY s.seq`,
    [[...items.rows.map((r) => r.history_id), ...원래들.keys()]],
  );

  // 프로시저 줄은 실행 단위 하나를 여러 케이스 줄이 나눠 든다 — 이름 · 케이스 수 · 영상 폴더 · 비밀값이 실행 단위에 한 벌이다 (공통/4 「테스트 프로시저 표」)
  const 모든줄 = [...items.rows, ...원래들.values()];
  const 단위들 = await 실행단위들읽기(pool, 모든줄.flatMap((r) => (r.exec_id == null ? [] : [r.exec_id])));
  const 프로시저단위 = [...단위들].flatMap(([번호, u]) => (u.procId === null ? [] : [Number(번호)]));
  const 단위비밀 = await 단위비밀들(프로시저단위);

  // 팜 기록은 항목이 돈 실행 폴더에 있다 — 다시 돈 항목은 한 건 실행 번호다
  const 항목으로 = async (row: RawItem, 돈실행: number): Promise<EvidenceItem> => {
    // 못 돈 항목을 'NA' 로 그대로 찍으면 「돌았는데 판정이 없다」로 읽혀 문서에서 사라진다.
    // 40건 중 12건 돌고 멈춘 실행은 「12건 돌았다」가 아니라 「28건은 이래서 못 돌았다」여야 한다 (SPEC §8.4)
    const 못돈사유 = 미실행사유를찾는다(row, run.status);
    const 단위 = row.exec_id == null ? undefined : 단위들.get(row.exec_id);
    const 프로시저 = 단위 !== undefined && 단위.procId !== null && row.exec_seq != null ? { id: 단위.procId, name: 단위.procName ?? '', seq: row.exec_seq, count: 단위.count } : null;
    // 키로 가린 칸 밖에도 비밀값이 되비친다 — 확인의 기대 · 실제 값과 판정 못 낸 사유. 실행 조회 응답(execution/queries.ts)과 같은 규칙이다 (공통/2 §4.1).
    // 프로시저 줄은 같은 프로세스에서 돈 다른 케이스의 비밀값까지 가린다
    const 비밀 = (프로시저 === null ? undefined : 단위비밀.get(Number(row.exec_id))) ?? 항목비밀(row);
    const 절차들 = steps.rows.filter((s) => s.history_id === row.history_id);

    return {
      tcId: row.tc_id,
      tcName: row.tc_name,
      platform: row.platform,
      device: row.device === null ? null : 기기글(row.device),
      // 실제 폰에서 돈 모바일 항목도 러너가 폰 영상 · logcat 을 받아 둔다 — 기기 칸이 찬 것이 그 표시다
      farm: row.platform === 'android' || row.device !== null ? await 팜글(돈실행, row, 단위?.통과) : null,
      attempt: row.attempt,
      status: 못돈사유 === null ? row.status : ('NOT_RUN' as const),
      // 중단 처리가 박아 넣은 duration_ms 0 은 「0밀리초 걸렸다」가 아니라 「안 돌았다」다
      durationMs: 못돈사유 === null ? row.duration_ms : null,
      notRunReason: 못돈사유 ?? 돈항목사유(row, 절차들, 비밀),
      unconfirmed: row.unconfirmed,
      precondition: row.precondition,
      params: toFields(row.params, row.param_schema),
      expected: toFields(row.expected, row.expected_schema),
      verifyStatements: row.verify_statements ?? null,
      steps: 절차들.map((s) => toStep(s, 비밀, run.service_kind === 'API')),
      procedure: 프로시저,
      ...(못돈사유 === null && Blocked인가(row) ? { blocked: { by: row.blocked_by ?? null } } : {}),
    };
  };

  const 증적항목들 = await Promise.all(
    items.rows.map(async (row) => {
      const 덮음 = 다시실행칸으로(row);
      if (덮음 === null) return 항목으로(row, runId);
      const 지금 = await 항목으로(row, 덮음.runId);
      const 원래 = 원래들.get(row.orig_history_id!)!;
      return {
        ...지금,
        // 실행자 문구는 머리말과 같다 — 빈칸이면 「없는 사람」으로 읽힌다
        rerun: { finishedAt: 덮음.finishedAt, triggeredBy: 덮음.triggeredBy === '' ? '실행자 미상 (인증 도입 이전)' : 덮음.triggeredBy, original: await 항목으로(원래, runId) },
      };
    }),
  );

  return {
    runId: Number(run.run_id),
    header: {
      serviceName: run.service_name === '' ? 기록없음 : run.service_name,
      testsRepo: run.tests_repo === '' ? 기록없음 : run.tests_repo,
      title: run.title,
      kind: run.kind === 'UI' ? 'UI 테스트' : '기능 테스트',
      startedAt: run.started_at.toISOString(),
      // 실행자만 문구가 다르다. 「기록이 없다」가 아니라 「그때는 로그인이 없었다」가 사실이다 (SPEC §8.4)
      triggeredByName:
        run.triggered_by_name === null || run.triggered_by_name === ''
          ? '실행자 미상 (인증 도입 이전)'
          : run.triggered_by_name,
      env: run.env === '' ? 기록없음 : run.env,
      baseUrl: run.base_url === '' ? 기록없음 : run.base_url,
      devices: [...new Set(증적항목들.flatMap((i) => (i.device == null ? [] : [i.device])))],
    },
    // Blocked 사유는 막은 케이스가 이 문서에서 어떻게 끝났는지로 적는다 — 항목이 다 모인 뒤에 채운다
    items: 막힘을채운다(증적항목들),
  };
}

/**
 * 「Device VISION 기록」 한 줄 — 영상 · logcat 은 실행 단위 폴더에 한 벌이라 그 폴더를 읽는다(옛 줄은 케이스 줄 번호 폴더다).
 * 실행 단위에 통과가 아닌 케이스가 하나라도 있으면 logcat 까지 센다 — 화면 항목 상세와 같다(execution/farmEvidence.ts 항목팜증적).
 * 프로시저 줄은 영상 안 그 케이스의 자리를 시작 ~ 끝 시각으로 덧붙인다 (도메인/리포팅 §3.3 「증적 문서 · 엑셀」)
 */
async function 팜글(돈실행: number, row: RawItem, 단위통과: boolean | undefined): Promise<string | null> {
  const 글 = await 팜기록글(돈실행, Number(row.exec_id ?? row.history_id), 단위통과 ?? row.status === 'PASS');
  // 프로시저 줄만 시각이 찬다(kit 이 잰 값). 끝을 못 쟀으면 「~ 」로 끝나는 줄이 되니 둘 다 있을 때만 붙인다
  if (글 === null || row.case_started_at == null || row.case_finished_at == null) return 글;
  return `${글} · 이 케이스 ${한국시각초(row.case_started_at.toISOString())} ~ ${한국시각초(row.case_finished_at.toISOString())}`;
}
