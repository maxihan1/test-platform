// 케이스가 만들어진 API 문서 판 원문을 파일로 넘기고 지운다 (SPEC 도메인/러너 §5.2 「API 케이스 실행」)
// 판 원문은 수 MB 라 환경값 한 칸(리눅스 128KB)에 안 든다. 사진처럼 남길 것이 아니라 항목이 끝나면 지운다

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function 판쓰기(경로: string, doc: unknown): Promise<string> {
  await mkdir(dirname(경로), { recursive: true });
  await writeFile(경로, JSON.stringify(doc));
  return 경로;
}

// 못 지워도 판정과 상관없다 — 사유만 남긴다
export async function 판지우기(경로들: readonly string[]): Promise<void> {
  for (const 경로 of 경로들) {
    try {
      await rm(경로, { force: true });
    } catch (err) {
      console.warn(`[runner] API 문서 판 파일 ${경로} 를 지우지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
