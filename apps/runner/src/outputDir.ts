// Playwright 출력 폴더를 실행마다 가르고 끝나면 지운다 (SPEC 도메인/러너 §5.2 「출력 폴더」)
// Playwright 는 시작할 때 출력 폴더를 통째로 지운다. 나란히 도는 실행이 한 폴더를 쓰면 남의 trace 를 옮기기 전에 지운다

import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

// execute.ts 가 자식에 넘기는 값과 같은 규칙이다 — 러너 cwd 기준으로 못 박는다
export function 산출물폴더(): string {
  return resolve(process.env.PLATFORM_ARTIFACTS_DIR ?? 'artifacts');
}

/** 설정 파일이 읽는 이름(PLATFORM_OUTPUT_ID). 번호만으로는 시나리오(`scenario`) · 시험 실행이 겹쳐 뒤에 무작위를 붙인다 */
export function 출력폴더이름(번호: string | number): string {
  return `${번호}-${randomUUID().slice(0, 8)}`;
}

// trace 는 리포터가 이미 runs 폴더로 옮겼다. 남은 것(error-context.md 등)은 아무도 안 읽는다.
// 못 지워도 판정과 상관없다 — 사유만 남긴다
export async function 출력폴더를지운다(이름: string): Promise<void> {
  try {
    await rm(resolve(산출물폴더(), 'playwright', 이름), { recursive: true, force: true });
  } catch (err) {
    console.warn(`[runner] 출력 폴더 ${이름} 를 지우지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}
