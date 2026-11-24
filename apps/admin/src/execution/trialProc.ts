// 케이스 테스트 실행의 프로시저 몫 — 프로시저 안 케이스를 누르면 프로시저가 통째로 돌고 결과는 케이스마다 한 건이다
// (도메인/실행 §3.2 「테스트 프로시저 실행」 「한 건 · 다시 돌리기 · 시험 실행」). 앞 흐름 없이는 그 케이스의 시작 상태가 안 맞는다

import type { ExecuteRequest, ExecuteResponse, Platform } from '@platform/kit';

import type { 대상줄 } from '../authoring/reverse.js';

import { 돌발팝업을싣는다, 엔진칸 } from './engineField.js';
import { DEFAULT_TIMEOUT_MS } from './location.js';
import { 못간답 } from './runner.js';
import { 저장값을채운다 } from './savedInput.js';
import type { 시험결과, 시험명세 } from './trial.js';
import type { 못감함수 } from './trialPhone.js';
import { validate, type Violation } from './validate.js';

/** 시험 한 번에 드는 것 — 옛 꼴 케이스와 프로시저가 잡고 돌리는 길은 같다 */
export interface 시험감 {
  요청: ExecuteRequest;
  못감: 못감함수;
  /** 러너 답을 화면이 읽는 결과로 — 누른 케이스 한 건(프로시저면 케이스마다 한 건을 더 싣는다) */
  결과로: (답: ExecuteResponse) => 시험결과;
  /** 가릴 비밀값을 고를 명세 — 프로시저는 케이스마다 하나 */
  명세: 시험명세[];
  stepTitles?: string[];
  /** 요청에 더 실을 칸이나 러너에 안 보낼 사유 — API 애플리케이션 케이스의 문서 판. 프로시저(Android 앱 · 게임)에는 없다 */
  판?: () => Promise<Partial<ExecuteRequest> | { 사유: string }>;
}

export interface 프로시저재료 {
  tcId: string;
  procId: string;
  platform: Platform;
  historyId: number;
  줄: 대상줄;
  종류: string;
  serviceId: number;
  /** 누른 케이스의 요청 값 — 다른 케이스는 저장값으로 채운다 */
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
}

interface 케이스줄 {
  tc_id: string;
  file_path: string;
  param_schema: Record<string, unknown>;
  expected_schema: Record<string, unknown>;
  step_titles: string[] | null;
}

// 화면의 결과 칸은 누른 케이스의 판정 · 사유를 그린다 — 옛 꼴 케이스의 화면도 이 칸을 그대로 읽는다.
// 절차만은 프로시저 전체를 차례대로 싣는다 — 화면의 단계 목록이 프로시저 전체라(stepTitles) 누른 케이스 것만 실으면 실제로 돈 다른 케이스의 단계가 「실행 안 함」으로 뜬다
function 누른케이스로(답: ExecuteResponse, tcId: string): 시험결과 {
  const 것 = 답.results.find((r) => r.tcId === tcId);
  if (것 === undefined) {
    return { historyId: 답.historyId, status: 'NA', durationMs: 답.durationMs, steps: [], error: 답.error ?? { message: '러너 답에 이 케이스의 결과가 없습니다' }, results: 답.results };
  }
  return {
    historyId: 답.historyId,
    status: 것.status,
    durationMs: 것.durationMs,
    steps: 답.results.flatMap((r) => r.steps),
    ...(것.error !== undefined && { error: 것.error }),
    ...(답.device !== undefined && { device: 답.device }),
    results: 답.results,
  };
}

/**
 * 프로시저 시험 한 번에 드는 것을 만든다. 그 프로시저의 활성 케이스에 누른 케이스가 없으면 null(스캔 뒤 프로시저에서 빠졌다),
 * 누른 케이스의 값이 명세에 어긋나면 violations 다. 펼쳐서 든 케이스는 정기 실행처럼 저장값 → 코드 기본값으로 돌아 검증하지 않는다
 */
export async function 프로시저시험감(
  재료: 프로시저재료,
): Promise<시험감 | { violations: Violation[] } | null> {
  const { pool } = await import('../db/index.js');
  const r = await pool.query<케이스줄>(
    'SELECT tc_id, file_path, param_schema, expected_schema, step_titles FROM test_case WHERE proc_id = $1 AND is_active ORDER BY proc_seq',
    [재료.procId],
  );
  const 줄들 = r.rows;
  const 누른 = 줄들.find((c) => c.tc_id === 재료.tcId);
  if (누른 === undefined) return null;

  const 채움 = await 저장값을채운다(
    pool,
    줄들.map((c) => ({ tcId: c.tc_id, params: c.tc_id === 재료.tcId ? 재료.params : {}, expected: c.tc_id === 재료.tcId ? 재료.expected : {} })),
    new Map(줄들.map((c) => [c.tc_id, c])),
    재료.줄.계정들,
  );
  const 누른값 = 채움.find((c) => c.tcId === 재료.tcId)!;
  const violations = [...validate(누른.param_schema, 누른값.params), ...validate(누른.expected_schema, 누른값.expected)];
  if (violations.length > 0) return { violations };

  const 요청: ExecuteRequest = {
    runId: 0,
    historyId: 재료.historyId,
    platform: 재료.platform,
    filePath: 누른.file_path,
    baseUrl: 재료.줄.baseUrl,
    procId: 재료.procId,
    cases: 채움.map((c) => ({ tcId: c.tcId, params: c.params, expected: c.expected })),
    // 러너에 줄 한도는 케이스 한도의 합이다 — 정식 실행의 실행 단위와 같다 (도메인/러너 §5.2 「케이스별 한도」)
    timeoutMs: 줄들.length * DEFAULT_TIMEOUT_MS,
    ...엔진칸(재료.종류, 재료.platform, 재료.줄.adminKey),
    ...(await 돌발팝업을싣는다(재료.종류, 재료.platform, 재료.serviceId)),
  };
  // 한 프로시저의 케이스 단계 제목을 차례대로 이으면 러너의 단계 번호 차례다. 하나라도 못 셌으면 싣지 않는다 (카탈로그 §3.1 「케이스 구간」)
  const 제목들 = 줄들.every((c) => c.step_titles !== null) ? 줄들.flatMap((c) => c.step_titles ?? []) : undefined;
  return {
    요청,
    못감: (까닭, stack) => 못간답(요청, 까닭, stack),
    결과로: (답) => 누른케이스로(답, 재료.tcId),
    명세: 채움.map((c, k) => ({ paramSchema: 줄들[k]!.param_schema, expectedSchema: 줄들[k]!.expected_schema, params: c.params, expected: c.expected })),
    ...(제목들 !== undefined && { stepTitles: 제목들 }),
  };
}
