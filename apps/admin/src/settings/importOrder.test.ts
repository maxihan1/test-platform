// 설정 모듈을 어떤 차례로 읽어도 뜨는지 — envs 를 먼저 읽으면 순환 import 로 store 가 죽었다 (2026-11-11 배포 사고)
// vitest 의 모듈 변환은 순환에서 다르게 돌아 재현이 안 된다 — 서버처럼 node --import tsx 로 따로 띄워 읽는다
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { expect, it } from 'vitest';

const 설정폴더 = fileURLToPath(new URL('.', import.meta.url));

it('envs.ts 를 store.ts 보다 먼저 읽어도 서버가 뜬다', () => {
  const 글 = `await import(${JSON.stringify(`${설정폴더}envs.ts`)}); await import(${JSON.stringify(`${설정폴더}store.ts`)}); console.log('읽힘');`;
  const 출력 = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', 글], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  expect(출력.trim()).toBe('읽힘');
}, 30_000);
