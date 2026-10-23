// 러너와 같이 쓰는 artifacts 볼륨에서 바로가기를 거치지 않은 파일만 내준다 (리뷰 M4 · SPEC 공통/6-인프라 §9)

import { readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

// 러너와 어드민이 같은 볼륨을 본다. 경로 규칙은 artifacts/runs/{runId}/{historyId}/{seq}.png (SPEC §9)
export function artifactsDir(): string {
  return process.env.PLATFORM_ARTIFACTS_DIR ?? resolve(process.cwd(), 'artifacts');
}

/**
 * 볼륨 안 일반 파일의 실제 자리. 볼륨 밖 · 가는 길에 바로가기가 하나라도 낀 것 · 폴더 · 없는 것은 null 이다.
 * 볼륨에 쓰는 쪽은 root 로 도는 케이스라 바로가기를 막을 수 없고, 바로가기는 읽는 admin 쪽에서 풀린다 —
 * 그대로 읽으면 `1.png` 로 건 /proc/self/environ 이 스크린샷으로 나간다
 */
// ponytail: 확인과 읽기 사이에 폴더를 바꿔치기하는 경합은 남는다(케이스가 끝난 뒤에도 볼륨을 고치는 프로세스가 있어야 한다). 막으려면 러너에는 runs 하위 볼륨만 붙인다
export async function 볼륨파일(경로: string): Promise<string | null> {
  const 상대 = relative(artifactsDir(), 경로);
  if (상대 === '' || 상대 === '..' || 상대.startsWith(`..${sep}`) || isAbsolute(상대)) return null;
  try {
    // 뿌리 자체는 바로가기여도 된다(맥 임시 폴더 · 운영자가 건 자리). 그 아래만 본다
    const 진짜 = await realpath(경로);
    if (진짜 !== join(await realpath(artifactsDir()), 상대)) return null;
    return (await stat(진짜)).isFile() ? 진짜 : null;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'ELOOP') return null;
    throw new Error(`볼륨 파일을 확인하지 못했다 (${경로}): ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** readFile 자리에 그대로 쓴다 — 볼륨 안 일반 파일이 아니면 없는 파일처럼 던져, 부르는 쪽의 404 처리를 그대로 탄다 */
export async function 볼륨파일읽기(경로: string): Promise<Buffer> {
  const 진짜 = await 볼륨파일(경로);
  if (진짜 === null) throw new Error(`볼륨 안의 일반 파일이 아니다: ${경로}`);
  return readFile(진짜);
}
