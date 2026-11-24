// 케이스 부품 재료를 만든다 — 카탈로그 행과 소스를 tcId 마다 한 번 읽어 조립 검사·점검·case-parts 가 같이 쓴다
// 소스 판별이 두 벌이 되지 않게 한 자리에서 만든다 (SPEC 도메인/시나리오 §3.7 결정 4·8 · §7)

import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

import type { CaseSpec } from '@platform/kit';
import ts from 'typescript';

import { tcId종류, 게임시나리오인가 } from '../catalog/rules.js';
import { testsRoot } from '../catalog/scanner.js';
import { caseSteps } from '../catalog/steps.js';
import { findCase } from '../catalog/store.js';

import type { 프로시저정보 } from './procStep.js';
import type { 카탈로그 } from './validate.js';

export interface 케이스부품재료 {
  tcId: string;
  name: string;
  platforms: CaseSpec['platforms'];
  precondition: string[];
  paramSchema: CaseSpec['paramSchema'];
  expectedSchema: CaseSpec['expectedSchema'];
  steps: { title: string; skippable: boolean }[];
  r16: boolean;
  unconfirmed: string | null;
  // 프로시저 안 케이스만 — 그 프로시저가 통째로 돈다. 건너뛸 절차는 없다 (결정 17)
  procId?: string;
  procName?: string;
  cases?: 프로시저정보['cases'];
}

/** 프로시저 번호 → 지금 그 프로시저의 활성 케이스(proc_seq 차례). `-UI-` 케이스도 든다 — 단계로 못 고를 뿐 같이 돈다 */
async function 프로시저들읽기(번호들: string[]): Promise<Map<string, 프로시저정보>> {
  const 프로시저 = new Map<string, 프로시저정보>();
  if (번호들.length === 0) return 프로시저;
  const { pool } = await import('../db/index.js');
  const r = await pool.query<{ tc_id: string; name: string; proc_id: string; proc_name: string | null }>(
    'SELECT tc_id, name, proc_id, proc_name FROM test_case WHERE proc_id = ANY($1::text[]) AND is_active ORDER BY proc_id, proc_seq',
    [번호들],
  );
  for (const 행 of r.rows) {
    const 앞 = 프로시저.get(행.proc_id) ?? { procId: 행.proc_id, procName: 행.proc_name ?? 행.proc_id, cases: [] };
    앞.cases.push({ tcId: 행.tc_id, name: 행.name });
    프로시저.set(행.proc_id, 앞);
  }
  return 프로시저;
}

/**
 * 없는 케이스 · 비활성 케이스 · 파일을 못 읽는 케이스 · tests 뿌리 밖을 가리키는 케이스는 **둘 다에서 빠진다** —
 * 받는 쪽이 비활성으로 친다. 던지면 한 건 때문에 그 서비스의 시나리오 목록 전체가 죽는다.
 * 뿌리 밖 경로는 막아야 할 값이라 서버 로그에만 남긴다. 내부 경로를 응답에 싣지 않는다.
 *
 * `service` 를 주면 그 접두사(여럿이면 그 가운데 하나)의 케이스만 읽는다. 남의 서비스 케이스 파일을 열 까닭이 없다.
 * 여럿은 시작 애플리케이션과 같은 프로젝트의 접두사다 (SPEC 도메인/시나리오 §3.7 결정 13)
 */
export async function 케이스재료(
  tcIds: Iterable<string>,
  service?: string | readonly string[],
): Promise<{ 카탈로그: 카탈로그; 부품재료: Map<string, 케이스부품재료> }> {
  const 카탈로그재료: 카탈로그 = new Map();
  const 부품재료 = new Map<string, 케이스부품재료>();
  const 뿌리 = resolve(testsRoot());
  const 허용 = service === undefined ? undefined : [service].flat();
  const 소속 = new Map<string, string>();

  for (const tcId of new Set(tcIds)) {
    if (허용 !== undefined && !허용.some((접두사) => tcId.startsWith(`${접두사}-`))) continue;
    // UI 테스트는 E2E 부품이 아니다 — case-parts 는 404, 저장된 부품은 CASE_INACTIVE 로 드러난다
    if (tcId종류(tcId) === 'UI' || 게임시나리오인가(tcId)) continue;
    const 행 = await findCase(tcId);
    if (행 === null || !행.isActive) continue;

    const 경로 = resolve(뿌리, 행.filePath);
    // file_path 는 DB 를 거쳐 오지만 결국 파일을 여는 자리다 (catalog/source.ts readExcerpt 와 같은 규칙)
    if (!경로.startsWith(뿌리 + sep)) {
      console.warn(`tests 폴더 밖의 경로라 비활성으로 친다: ${tcId} ${행.filePath}`);
      continue;
    }
    let 소스: string;
    try {
      소스 = await readFile(경로, 'utf8');
    } catch {
      continue;
    }

    const 판별 = caseSteps(소스);
    // 파서가 너그러워 깨진 소스에서도 「만들기」 모양을 찾아낸다. 애매하면 만들기로 치지 않는다 (결정 4)
    const 깨짐 = (ts.transpileModule(소스, { reportDiagnostics: true }).diagnostics ?? []).length > 0;
    // 프로시저 안 케이스는 건너뛸 절차가 없다 — 프로시저가 자기 시작 상태를 스스로 맞춘다 (결정 17)
    if (행.procId !== null) 소속.set(tcId, 행.procId);
    const steps = 판별.steps.map((s) => ({ title: s.title, skippable: s.skippable && !깨짐 && 행.procId === null }));
    // jsonb 라 null 이나 properties 없는 스키마도 올 수 있다 — 입력값 칸이 없는 것으로 친다
    const 칸들: unknown = 행.paramSchema?.properties;
    카탈로그재료.set(tcId, {
      platforms: 행.platforms,
      isActive: true,
      skippable: steps.filter((s) => s.skippable).map((s) => s.title),
      titles: steps.map((s) => s.title),
      params: typeof 칸들 === 'object' && 칸들 !== null ? Object.keys(칸들) : [],
    });
    부품재료.set(tcId, {
      tcId,
      name: 행.name,
      platforms: 행.platforms,
      precondition: 행.precondition,
      paramSchema: 행.paramSchema,
      expectedSchema: 행.expectedSchema,
      steps,
      r16: steps.some((s) => s.skippable),
      unconfirmed: 행.unconfirmed,
    });
  }

  const 프로시저 = await 프로시저들읽기([...new Set(소속.values())]);
  for (const [tcId, procId] of 소속) {
    const 정보 = 프로시저.get(procId);
    // 읽는 사이 프로시저가 비면 옛 꼴로 둔다 — 실행 만들기가 다시 읽어 막는다
    if (정보 === undefined) continue;
    카탈로그재료.get(tcId)!.proc = 정보;
    Object.assign(부품재료.get(tcId)!, { procId: 정보.procId, procName: 정보.procName, cases: 정보.cases });
  }
  return { 카탈로그: 카탈로그재료, 부품재료 };
}
