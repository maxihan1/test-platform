// 실행 만들기의 실행 단위 몫 — 고른 케이스를 프로시저로 펼치고 실행 단위(run_exec) 줄을 케이스 줄(run_item)과 같이 넣는다
// 정본은 SPEC 도메인/실행 §3.2 「테스트 프로시저 실행」 · 공통/4-데이터모델 「테스트 프로시저 표」. store.ts 가 300줄을 넘어 여기 둔다

import type { Platform } from '@platform/kit';
import type { PoolClient } from 'pg';

import { 미확정사유SQL } from '../prd/unconfirmed.js';

import { 항목제한ms } from './location.js';
import type { PendingItem, RunItemInput } from './store.js';

type 질의 = Pick<PoolClient, 'query'>;

export interface CaseRow {
  tc_id: string;
  name: string;
  precondition: string[];
  file_path: string;
  param_schema: Record<string, unknown>;
  expected_schema: Record<string, unknown>;
  unconfirmed: string | null;
  platforms: string[];
  is_active: boolean;
  proc_id: string | null;
  proc_seq: number | null;
  proc_name: string | null;
  verify_statements: string[] | null;
}

// 케이스명·사전조건·파일 경로는 카탈로그가 채운 캐시에서 SQL로 읽는다. 카탈로그 코드를 import 하지 않는다.
// 미확정 사유도 여기서 박제한다 — 확인 필요 항목이 나중에 확정돼도 그날 확정이 아니었다는 사실은 남아야 한다 (SPEC 실행 §3.2)
const 케이스칸 = `tc_id, name, precondition, file_path, param_schema, expected_schema, ${미확정사유SQL('c')} AS unconfirmed, platforms, is_active, proc_id, proc_seq, proc_name, verify_statements`;

export async function 케이스를읽는다(client: 질의, tcIds: string[]): Promise<Map<string, CaseRow>> {
  const found = await client.query<CaseRow>(`SELECT ${케이스칸} FROM test_case c WHERE tc_id = ANY($1::text[])`, [tcIds]);
  return new Map(found.rows.map((r) => [r.tc_id, r]));
}

/** 프로시저에서 빠져 내려간 케이스 — 비활성 줄에 옛 프로시저 번호가 남아 있다. 그 프로시저의 케이스가 아니라 펼칠 수도 혼자 돌릴 수도 없다 */
export const 프로시저에서빠졌나 = (c: CaseRow | undefined): boolean => c !== undefined && c.proc_id !== null && !c.is_active;

/**
 * 고른 케이스가 프로시저 안 케이스면 그 프로시저의 케이스 전부로 펼친다 — 앞 흐름 없이는 그 케이스의 시작 상태가 안 맞는다.
 * 더 읽은 케이스는 cases 에 더한다. 프로시저의 디바이스는 그 프로시저 케이스들이 고른 platforms 의 합이고,
 * 펼쳐서 든 케이스는 값이 비어 뒤에서 저장값 → 코드 기본값으로 찬다. 프로시저 안 케이스는 요청의 timeoutMs 를 버린다 —
 * 줄인 값을 합치면 kit 이 케이스마다 거는 한도의 합보다 짧아져 러너가 먼저 끊는다
 */
export async function 프로시저로펼친다(client: 질의, items: RunItemInput[], cases: Map<string, CaseRow>): Promise<RunItemInput[]> {
  const 디바이스 = new Map<string, Platform[]>();
  for (const item of items) {
    const 번호 = cases.get(item.tcId)?.proc_id ?? null;
    if (번호 !== null) 디바이스.set(번호, [...new Set([...(디바이스.get(번호) ?? []), ...item.platforms])]);
  }
  if (디바이스.size === 0) return items;

  // 활성 줄만 읽는다 — 프로시저에서 빠져 내려간 케이스 줄에도 옛 프로시저 번호가 남아 있다 (공통/4 「테스트 프로시저 표」)
  const 같은 = await client.query<CaseRow>(`SELECT ${케이스칸} FROM test_case c WHERE proc_id = ANY($1::text[]) AND is_active`, [[...디바이스.keys()]]);
  for (const r of 같은.rows) if (!cases.has(r.tc_id)) cases.set(r.tc_id, r);

  const 요청 = new Map(items.map((i) => [i.tcId, i]));
  const 넣은 = new Set<string>();
  return items.flatMap((item) => {
    const 번호 = cases.get(item.tcId)?.proc_id ?? null;
    if (번호 === null) return [item];
    if (넣은.has(번호)) return [];
    넣은.add(번호);
    return [...cases.values()]
      .filter((c) => c.proc_id === 번호 && c.is_active)
      .sort((a, b) => (a.proc_seq ?? 0) - (b.proc_seq ?? 0))
      .map((c) => ({ tcId: c.tc_id, platforms: 디바이스.get(번호)!, params: 요청.get(c.tc_id)?.params ?? {}, expected: 요청.get(c.tc_id)?.expected ?? {} }));
  });
}

// 실행 단위 번호는 케이스 줄 번호와 같은 번호 줄에서 뽑는다 — 러너가 historyId 하나로 자식 · 중단 · 진행 · 폴더를 가른다
const INSERT_EXEC = `
  INSERT INTO run_exec (run_id, file_path, proc_id, proc_name, platform, attempt, timeout_ms)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING exec_id`;

// 확인 문장도 같은 까닭으로 박제한다 — 기대 결과는 실행 전부터 있던 성공 조건이다.
// 라벨·제한 시간·파일 경로도 실행 시점 값으로 박제한다. 카탈로그는 스캔 때마다 덮어쓰는 캐시라
// 나중에 읽으면 그날 무엇으로 돌렸는지가 달라진다 (SPEC §3.3 · §6).
// 옛 꼴 케이스 줄은 번호를 새로 뽑지 않고 실행 단위 번호를 그대로 쓴다($18) — 러너에 가는 번호 · 폴더 · trace 길이 안 바뀐다
const INSERT_ITEM = `
  INSERT INTO run_item (run_id, tc_id, platform, tc_name, precondition, params, expected, status,
                        file_path, param_schema, expected_schema, timeout_ms, attempt, unconfirmed, tests_commit, case_sha256,
                        exec_id, exec_seq, history_id, verify_statements)
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'NA', $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, COALESCE($18::bigint, nextval('run_item_history_id_seq')), $19::text[])
  RETURNING history_id`;

/** 같이 도는 케이스 묶음 — 프로시저면 그 프로시저의 케이스들, 옛 꼴 케이스면 하나다. 펼친 목록은 프로시저 케이스가 붙어 있다 */
function 단위로묶는다(items: RunItemInput[], cases: Map<string, CaseRow>): { 번호: string | null; 케이스들: RunItemInput[] }[] {
  const 묶음: { 번호: string | null; 케이스들: RunItemInput[] }[] = [];
  for (const item of items) {
    const 번호 = cases.get(item.tcId)!.proc_id;
    const 앞 = 묶음.at(-1);
    if (번호 !== null && 앞?.번호 === 번호) 앞.케이스들.push(item);
    else 묶음.push({ 번호, 케이스들: [item] });
  }
  return 묶음;
}

export interface 넣을것 {
  runId: number;
  repeat: number;
  /** 펼치고 값을 채운 항목 */
  items: RunItemInput[];
  cases: Map<string, CaseRow>;
  커밋: string | null;
  지문들: Map<string, string | null>;
  /** 디바이스마다 같은 칸 — 주소 · 앱 · 엔진처럼 케이스와 상관없이 실행과 디바이스로 정해지는 것 */
  줄칸: (platform: Platform) => Pick<PendingItem, 'baseUrl'> & Partial<PendingItem>;
}

/**
 * 실행 단위와 케이스 줄을 같이 넣는다 — 프로시저는 (프로시저 · 디바이스 · 회차)마다, 옛 꼴 케이스는 (케이스 · 디바이스 · 회차)마다 실행 단위 한 줄이다.
 * 길이 하나라 옛 파일과 프로시저 파일이 한 실행에 섞여 돈다
 */
export async function 실행단위를넣는다(client: 질의, 것: 넣을것): Promise<PendingItem[]> {
  const items: PendingItem[] = [];
  for (const 단위 of 단위로묶는다(것.items, 것.cases)) {
    for (const platform of new Set(단위.케이스들.flatMap((c) => c.platforms))) {
      const 줄들 = 단위.케이스들.filter((c) => c.platforms.includes(platform)).map((item) => ({ item, timeoutMs: 항목제한ms(item.tcId, item.timeoutMs) }));
      const 첫 = 것.cases.get(줄들[0]!.item.tcId)!;
      // 회차는 1부터다. 러너에는 보이지 않는다 — historyId 만 다른 같은 요청을 N번 보낼 뿐이다 (SPEC §5.2)
      for (let attempt = 1; attempt <= 것.repeat; attempt += 1) {
        const 낸 = await client.query<{ exec_id: string }>(INSERT_EXEC, [
          것.runId,
          첫.file_path,
          단위.번호,
          단위.번호 === null ? null : 첫.proc_name,
          platform,
          attempt,
          // 러너에 줄 한도는 그 실행 단위 케이스 줄 한도의 합이다 (도메인/러너 §5.2 「케이스별 한도」)
          줄들.reduce((n, 줄) => n + 줄.timeoutMs, 0),
        ]);
        const execId = Number(낸.rows[0]!.exec_id);
        for (const [k, { item, timeoutMs }] of 줄들.entries()) {
          const spec = 것.cases.get(item.tcId)!;
          const row = await client.query<{ history_id: string }>(INSERT_ITEM, [
            것.runId,
            item.tcId,
            platform,
            spec.name,
            JSON.stringify(spec.precondition),
            JSON.stringify(item.params),
            JSON.stringify(item.expected),
            spec.file_path,
            JSON.stringify(spec.param_schema),
            JSON.stringify(spec.expected_schema),
            timeoutMs,
            attempt,
            spec.unconfirmed,
            것.커밋,
            것.지문들.get(item.tcId) ?? null,
            execId,
            k + 1,
            단위.번호 === null ? execId : null,
            spec.verify_statements,
          ]);
          items.push({
            historyId: Number(row.rows[0]!.history_id),
            execId,
            ...(단위.번호 !== null && { procId: 단위.번호 }),
            tcId: item.tcId,
            platform,
            filePath: spec.file_path,
            params: item.params,
            expected: item.expected,
            timeoutMs,
            ...것.줄칸(platform),
          });
        }
      }
    }
  }
  return items;
}
