// 스크린샷 저장 위치. 러너와 어드민이 공유 볼륨으로 같은 경로를 본다 (SPEC §9)
// 러너가 실행할 때 runId·historyId를 환경변수로 넘긴다. 사람이 직접 돌릴 때는 0/0으로 떨어진다

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export function artifactsDir(): string {
  return process.env.PLATFORM_ARTIFACTS_DIR ?? resolve(process.cwd(), 'artifacts');
}

export interface ShotPath {
  absolute: string;
  // StepResult.screenshotPath에 남길 값. 어드민이 같은 볼륨에서 이 경로로 찾는다
  recorded: string;
}

export async function shotPath(seq: number): Promise<ShotPath> {
  const runId = process.env.PLATFORM_RUN_ID ?? '0';
  const historyId = process.env.PLATFORM_HISTORY_ID ?? '0';
  const recorded = `artifacts/runs/${runId}/${historyId}/${seq}.png`;
  const absolute = resolve(artifactsDir(), `runs/${runId}/${historyId}/${seq}.png`);
  await mkdir(dirname(absolute), { recursive: true });
  return { absolute, recorded };
}
