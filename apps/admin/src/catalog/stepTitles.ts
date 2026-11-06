// 스캔이 저장할 케이스 단계 제목을 케이스 파일 글에서 읽는다 (카탈로그 §3.1 「단계 제목」)

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { CaseSpec } from '@platform/kit';

import { caseSteps } from './steps.js';

/**
 * 케이스마다 단계 제목 — 글로만 읽어 import 하지 않는다(지도 ② 와 같다). 못 읽은 케이스는 모른다(null)로 두고 까닭을 돌려준다 —
 * 스캔은 계속하고 화면이 한 줄씩 늘어나는 쪽으로 받친다. 수천 건을 한꺼번에 열지 않게 하나씩 읽는다
 */
export async function 단계제목들(root: string, specs: readonly CaseSpec[]): Promise<{ 제목들: Map<string, string[] | null>; 문제: string[] }> {
  const 제목들 = new Map<string, string[] | null>();
  const 문제: string[] = [];
  for (const s of specs) {
    try {
      제목들.set(s.tcId, caseSteps(await readFile(join(root, s.filePath), 'utf8')).stepTitles);
    } catch (err) {
      제목들.set(s.tcId, null);
      문제.push(`${s.filePath}의 단계 제목을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { 제목들, 문제 };
}
