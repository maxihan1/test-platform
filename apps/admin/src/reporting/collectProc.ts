// 증적이 테스트 프로시저를 읽는 조각 — 실행 단위(프로시저 번호 · 이름 · 케이스 수)와 Blocked 사유 (도메인/리포팅 §3.3 「테스트 프로시저」 「증적 문서 · 엑셀」)
// collect.ts 가 300줄을 넘지 않게 뗐다. 화면(TP-F3-16 실행 결과 · 항목 상세)과 같은 글자를 쓴다 — docs/WORDS.md 「판정과 테스트 프로시저 화면에서 쓰는 말」

import type { Pool } from 'pg';

import type { EvidenceItem } from './collect.js';

/** 케이스 줄이 든 실행 단위 — 프로시저면 번호 · 이름이 차고, 옛 꼴 케이스면 null 이다 */
export interface 실행단위 {
  procId: string | null;
  procName: string | null;
  /** 그 실행 단위에 든 케이스 줄 수 — 「5건 중 4번째」의 5 */
  count: number;
  /** 모든 케이스 줄이 통과했나 — 아니면 러너가 영상과 함께 logcat 을 남긴다 (공통/4 「증적은 실행 단위에 단다」) */
  통과: boolean;
}

/** 실행 단위 번호 → 실행 단위. run_item 에는 exec_id 색인이 없어 같은 실행의 줄로 좁혀 센다 */
export async function 실행단위들읽기(pool: Pool, execIds: readonly string[]): Promise<Map<string, 실행단위>> {
  if (execIds.length === 0) return new Map();
  const r = await pool.query<{ exec_id: string; proc_id: string | null; proc_name: string | null; n: string; 통과: boolean }>(
    `SELECT e.exec_id, e.proc_id, e.proc_name, count(*) AS n, bool_and(x.status = 'PASS') AS "통과"
       FROM run_exec e JOIN run_item x ON x.run_id = e.run_id AND x.exec_id = e.exec_id
      WHERE e.exec_id = ANY($1::bigint[])
      GROUP BY e.exec_id`,
    [[...new Set(execIds)]],
  );
  return new Map(r.rows.map((row) => [row.exec_id, { procId: row.proc_id, procName: row.proc_name, count: Number(row.n), 통과: row.통과 }]));
}

/** 시간 초과로 끝난 항목의 사유 글자 — 미실행 사유(collectReason.ts 돈항목사유)가 까닭 TIMEOUT 에 적는 글과 같다 */
export const 시간초과글 = '제한 시간 초과';

/**
 * Blocked 의 사유 — 막은 케이스가 같은 실행 · 같은 디바이스 · 같은 회차에서 어떻게 끝났는지로 까닭을 붙인다.
 * Fail 이면 「실패」, 시간 초과로 끝났으면 「제한 시간 초과」, 그 밖(통과 · 다른 미실행 · 못 찾음)은 번호까지만 — 틀린 까닭을 적지 않는다.
 * 화면(web/proc.tsx use막힘사유글)은 판정만 보고 미실행이면 「제한 시간 초과」다 — 증적은 사유 글자까지 본다(kit 이 낸 Blocked 의 막은 미실행은 거의 늘 시간 초과다)
 */
export function 막힘사유(blockedBy: string, 막은: Pick<EvidenceItem, 'status' | 'notRunReason'> | undefined): string {
  if (막은?.status === 'FAIL') return `선행 케이스 ${blockedBy} 실패`;
  if (막은?.status === 'NA' && 막은.notRunReason === 시간초과글) return `선행 케이스 ${blockedBy} ${시간초과글}`;
  return `선행 케이스 ${blockedBy}`;
}

/**
 * 문서의 항목이 다 모인 뒤 Blocked 줄에 사유를 채운다 — 막은 케이스의 판정은 같은 문서의 다른 항목이다. 막은 케이스 번호가 없는 줄은 사유 없이 「Blocked」만 선다.
 * 한 건 실행이 덮은 항목의 「원래 결과」는 막은 케이스도 원래 결과에서 찾는다 — 다시 돌아 통과한 결과로 적으면 처음의 실패 사슬이 문서에서 사라진다.
 * 문서에 막은 케이스가 없으면(QA 리포트가 고른 케이스만 읽을 때) 번호까지만 적는다
 */
export function 막힘을채운다(items: EvidenceItem[]): EvidenceItem[] {
  const 지금들 = items;
  const 원래들 = items.map((i) => i.rerun?.original ?? i);
  const 채운다 = (item: EvidenceItem, 찾을곳: EvidenceItem[]): EvidenceItem => {
    const 막은번호 = item.blocked?.by;
    if (막은번호 == null) return item;
    const 막은 = 찾을곳.find((i) => i.tcId === 막은번호 && i.platform === item.platform && i.attempt === item.attempt);
    return { ...item, notRunReason: 막힘사유(막은번호, 막은) };
  };
  return items.map((item) =>
    item.rerun === undefined ? 채운다(item, 지금들) : { ...채운다(item, 지금들), rerun: { ...item.rerun, original: 채운다(item.rerun.original, 원래들) } },
  );
}

/** 「MTA-TP-022 글쓰기 · 5건 중 4번째」 — 증적 블록 · 줄의 프로시저 줄. 화면 항목 상세의 프로시저 줄과 같은 꼴이다 */
export function 프로시저글(p: NonNullable<EvidenceItem['procedure']>, 이름까지 = true): string {
  return `${p.id}${이름까지 && p.name !== '' ? ` ${p.name}` : ''} · ${p.count}건 중 ${p.seq}번째`;
}
