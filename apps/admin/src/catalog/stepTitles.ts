// 스캔이 저장할 케이스 단계 제목을 케이스 파일 글에서 읽는다 (카탈로그 §3.1 「단계 제목」)

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CaseSpec } from '@platform/kit';
import { 정리제목 } from '@platform/kit/protocol';

import { 프로시저글읽기 } from './procedure.js';
import { caseSteps } from './steps.js';

/**
 * 프로시저 파일의 케이스마다(cases 차례대로) 단계 제목 — kit 이 돌릴 때 절차를 케이스에 붙이는 규칙 그대로다 (카탈로그 §3.1 「케이스 구간」).
 * 케이스 사이 절차는 다음 케이스, 보류 케이스 앞 절차는 그 뒤의 보류 아닌 케이스, 시작 정리는 처음 도는 케이스, 끝 정리는 마지막으로 도는 케이스 것이다.
 * 보류 케이스는 건너뛰어 단계가 없다. 그래서 케이스 차례대로 이으면 러너가 매기는 단계 번호 차례와 같다.
 * 프로시저 파일이 아니거나 구간을 못 가르면 null, 다 셀 수 없는 케이스는 그 케이스만 null 이다
 */
export function 프로시저단계제목(글: string, 보류: readonly boolean[]): (string[] | null)[] | null {
  const 읽은 = 프로시저글읽기(글);
  if (읽은 === null || 읽은.구간 === null) return null;
  const { found, cleanups } = caseSteps(글);
  type 절차 = (typeof found)[number];
  const 안인가 = (s: { getStart(): number; end: number }, pos: number): boolean => pos >= s.getStart() && pos < s.end;

  const 준비몫 = 읽은.구간.map((): 절차[] => []);
  const 본문몫 = 읽은.구간.map((): 절차[] => []);
  for (const s of found) {
    const 본문 = 읽은.구간.findIndex((c) => 안인가(c.부름, s.pos));
    const 준비 = 본문 >= 0 ? -1 : 읽은.구간.findIndex((c) => c.준비.some((문) => 안인가(문, s.pos)));
    // 어느 구간에도 안 든 절차(정리 안의 절차)가 있으면 번호 차례를 장담할 수 없다
    if (본문 < 0 && 준비 < 0) return 읽은.구간.map(() => null);
    (본문 >= 0 ? 본문몫[본문]! : 준비몫[준비]!).push(s);
  }

  const 몫: 절차[][] = [];
  let 넘김: 절차[] = [];
  읽은.구간.forEach((_, i) => {
    넘김.push(...준비몫[i]!);
    if (보류[i] === true) {
      몫.push([]);
      return;
    }
    몫.push([...넘김, ...본문몫[i]!]);
    넘김 = [];
  });

  const 도는 = 읽은.구간.flatMap((_, i) => (보류[i] === true ? [] : [i]));
  const 정리 = cleanups.every((t) => t !== undefined) ? (cleanups as string[]) : null;
  return 몫.map((절차들, i) => {
    if (!절차들.every((s) => s.counted)) return null;
    const 처음 = i === 도는[0] && cleanups.length > 0;
    const 끝 = i === 도는.at(-1) && cleanups.length > 0;
    if ((처음 || 끝) && 정리 === null) return null;
    return [...(처음 ? 정리!.map((t) => 정리제목('시작', t)) : []), ...절차들.map((s) => s.title!), ...(끝 ? 정리!.map((t) => 정리제목('끝', t)) : [])];
  });
}

/**
 * 케이스마다 단계 제목 — 글로만 읽어 import 하지 않는다(지도 ② 와 같다). 못 읽은 케이스는 모른다(null)로 두고 까닭을 돌려준다 —
 * 스캔은 계속하고 화면이 한 줄씩 늘어나는 쪽으로 받친다. 수천 건을 한꺼번에 열지 않게 하나씩 읽는다
 */
export async function 단계제목들(root: string, specs: readonly CaseSpec[]): Promise<{ 제목들: Map<string, string[] | null>; 문제: string[] }> {
  const 제목들 = new Map<string, string[] | null>();
  const 문제: string[] = [];
  // 프로시저 파일은 케이스 여럿이 한 파일이라 한 번만 읽는다
  const 프로시저 = new Map<string, (string[] | null)[] | null>();
  for (const s of specs) {
    try {
      if (s.procSeq === undefined) {
        제목들.set(s.tcId, caseSteps(await readFile(join(root, s.filePath), 'utf8')).stepTitles);
        continue;
      }
      if (!프로시저.has(s.filePath)) {
        // 못 읽으면 문제 줄은 한 번만 남기고 그 파일의 나머지 케이스는 모른다로 둔다
        프로시저.set(s.filePath, null);
        const 보류: boolean[] = [];
        for (const c of specs) if (c.filePath === s.filePath && c.procSeq !== undefined) 보류[c.procSeq - 1] = c.held !== undefined;
        프로시저.set(s.filePath, 프로시저단계제목(await readFile(join(root, s.filePath), 'utf8'), 보류));
      }
      제목들.set(s.tcId, 프로시저.get(s.filePath)?.[s.procSeq - 1] ?? null);
    } catch (err) {
      제목들.set(s.tcId, null);
      문제.push(`${s.filePath}의 단계 제목을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { 제목들, 문제 };
}
