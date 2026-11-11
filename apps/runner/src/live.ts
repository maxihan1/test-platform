// 테스트 모드 장면 — 도는 실행의 장면 열쇠를 쥐고 마지막 장면 한 장을 GET /live/:key 로 낸다 (SPEC 도메인/러너 §5.2 「테스트 모드 — 실시간 장면」)
// 장면은 자식(kit runtime/live.ts)이 live/<열쇠>.jpg 에 덮어 쓴다. 러너는 열쇠가 도는 동안만 내주고 끝나면 지운다

import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { FastifyInstance } from 'fastify';

import { 산출물폴더 } from './outputDir.js';

const 장면폴더 = (): string => resolve(산출물폴더(), 'live');
const 장면파일 = (열쇠: string): string => resolve(장면폴더(), `${열쇠}.jpg`);

// 도는 실행의 열쇠. 메모리에만 산다 — 러너가 다시 뜨면 남은 파일은 켤 때 폴더째 지운다
const 도는열쇠 = new Set<string>();

// 자식 환경 — 둘 다 늘 적는다. 러너를 켠 셸에 값이 있으면 자식이 물려받아 정식 실행까지 늦춘다.
// 시험 실행은 동작마다 1초 쉰다 — 창이 뜨는지는 안 본다 (§5.2 「천천히 돈다」). 늦추기는 열쇠가 아니라 시험인지로 가른다 —
// 정식 실행도 열쇠를 실어 장면만 찍는다. 늦추기 값이 자식에게는 「시험 실행」 표시다(한도 다섯 배)
export function 장면환경(live: string | undefined, 시험: boolean): { PLATFORM_LIVE_FILE: string; PLATFORM_SLOW_MO: string } {
  if (live === undefined) return { PLATFORM_LIVE_FILE: '', PLATFORM_SLOW_MO: '' };
  return { PLATFORM_LIVE_FILE: 장면파일(live), PLATFORM_SLOW_MO: 시험 ? '1000' : '' };
}

// 실행 하나를 감싼다 — 도는 동안만 열쇠를 열고, 끝나면 장면을 지운다. 자식이 쓰다 죽어 남은 임시 파일도 같이
export async function 장면과돌린다<T>(live: string | undefined, 돌리기: () => Promise<T>): Promise<T> {
  if (live === undefined) return 돌리기();
  도는열쇠.add(live);
  try {
    return await 돌리기();
  } finally {
    도는열쇠.delete(live);
    for (const 파일 of [장면파일(live), `${장면파일(live)}.tmp`]) {
      await rm(파일, { force: true }).catch((err: unknown) => console.warn(`[runner] 장면 파일을 못 지웠다 (${파일}): ${err instanceof Error ? err.message : String(err)}`));
    }
  }
}

export async function 장면폴더를비운다(): Promise<void> {
  await rm(장면폴더(), { recursive: true, force: true });
}

// 모르는 열쇠 · 끝난 실행은 404, 첫 장면 전은 204. 도는 열쇠는 요청 검사에서 UUID 만 받았으니 경로가 밖으로 안 샌다
export function registerLive(app: FastifyInstance): void {
  app.get<{ Params: { key: string } }>('/live/:key', async (request, reply) => {
    const { key } = request.params;
    if (!도는열쇠.has(key)) return reply.code(404).send({ error: 'LIVE_NOT_FOUND', detail: '도는 실행의 장면 열쇠가 아니다' });
    let 장: Buffer;
    try {
      장 = await readFile(장면파일(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return reply.code(204).send();
      throw new Error(`장면 파일을 못 읽었다 (${key}): ${err instanceof Error ? err.message : String(err)}`);
    }
    // 앱 · 게임 폰 장면은 Appium 이 주는 PNG 그대로다 (§5.2 「테스트 모드 — 실시간 장면」)
    return reply.header('cache-control', 'no-store').type(장[0] === 0x89 ? 'image/png' : 'image/jpeg').send(장);
  });
}
