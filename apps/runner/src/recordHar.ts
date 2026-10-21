// 성능 시나리오 녹화 실행의 HAR 자리 — 폴더를 만들고 다음 파일 이름을 센다 (SPEC 도메인/러너 「성능 테스트 — 녹화 실행 · 기기 측정」)

import { mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { 산출물폴더 } from './outputDir.js';

/** artifacts/perf-record/<jobId>/ 를 만들어 돌려준다. admin 이 이 폴더에서 HAR 를 가져간다 */
export function 녹화폴더(jobId: number): string {
  const 폴더 = resolve(산출물폴더(), 'perf-record', String(jobId));
  mkdirSync(폴더, { recursive: true });
  return 폴더;
}

/**
 * 폴더의 .har 수 + 1 번째 파일 경로. HAR 는 창을 닫을 때 써지므로 열려 있는 창끼리는 수가 같다 —
 * 이미 내준 번호(이미준)보다 작지 않게 해서 같은 파일을 두 번 내주지 않는다
 */
export function 다음HAR경로(폴더: string, 이미준 = 0): string {
  const 수 = readdirSync(폴더).filter((n) => n.endsWith('.har')).length;
  return resolve(폴더, `${Math.max(수, 이미준) + 1}.har`);
}
