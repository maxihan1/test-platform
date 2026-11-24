// E2E 프로시저 단계의 순수 규칙 — 제한 시간 몫 · 프로시저마다 후보 하나만 남기기 (SPEC 도메인/시나리오 §3.7 결정 17)
// DB 와 파일을 모른다. 조립 검사(validate.ts)가 쓰므로 DB 를 끌어오는 가져오기를 두지 않는다

/** 그 케이스가 든 프로시저와 지금 그 프로시저의 활성 케이스 — proc_seq 차례, `-UI-` 케이스도 든다(단계로 못 고를 뿐 같이 돈다) */
export interface 프로시저정보 {
  procId: string;
  procName: string;
  cases: { tcId: string; name: string }[];
}

const 케이스한도 = 120000;
const 단계여유 = 180000;

/** 프로시저 단계의 제한 시간 몫. 케이스가 하나면 300000 으로 케이스 부품 몫과 같다 */
export const 프로시저몫 = (케이스수: number): number => 케이스수 * 케이스한도 + 단계여유;

/** 조립 케이스 번호 → 그 프로시저의 케이스 수. 제한 시간 합이 프로시저 단계를 케이스 수로 세는 재료다 */
export type 프로시저케이스수 = ReadonlyMap<string, number>;

/**
 * 프로시저 안 케이스의 후보를 프로시저마다 하나만 남긴다 — 프로시저 안 차례(procSeq)가 가장 앞인 것.
 * `뺄` 에 든 프로시저(이미 시나리오에 든 것)의 후보는 다 뺀다. 옛 꼴 케이스(procId 없음)는 그대로 둔다
 */
export function 프로시저하나씩<T extends { procId?: string | null | undefined; procSeq?: number | null | undefined }>(
  후보들: T[],
  뺄: ReadonlySet<string> = new Set(),
): T[] {
  const 앞 = new Map<string, T>();
  for (const x of 후보들) {
    if (x.procId == null || 뺄.has(x.procId)) continue;
    const 지금 = 앞.get(x.procId);
    if (지금 === undefined || (x.procSeq ?? 0) < (지금.procSeq ?? 0)) 앞.set(x.procId, x);
  }
  return 후보들.filter((x) => x.procId == null || 앞.get(x.procId) === x);
}
