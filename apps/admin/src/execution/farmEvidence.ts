// 러너가 받아 둔 팜 증적(화면 영상 · logcat)을 찾아 목록과 파일로 내준다 (SPEC 도메인/러너 §5.2 「디바이스 팜 접속 방식」)

import { readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import fastifyStatic from '@fastify/static';
import { FARM_EVIDENCE_DIR, runDir } from '@platform/kit';
import type { FastifyInstance } from 'fastify';

import { 정수 } from '../routeParams.js';

export interface 팜파일 {
  name: string;
  bytes: number;
}

// 러너가 쓴 자리와 어긋나지 않게 kit 의 계산을 그대로 쓴다
const 폴더 = (runId: number, historyId: number): string => join(runDir(String(runId), String(historyId)), FARM_EVIDENCE_DIR);

// video-10 이 video-2 앞에 오지 않게 숫자를 숫자로 비교한다
const 차례 = new Intl.Collator('en', { numeric: true });

/** 없으면 빈 목록이다 — 통과 항목 · 브라우저 항목 · 팜이 아닌 Appium · 아직 받는 중 */
export async function 팜증적목록(runId: number, historyId: number): Promise<팜파일[]> {
  const 곳 = 폴더(runId, historyId);
  let 이름들: string[];
  try {
    이름들 = await readdir(곳);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw new Error(`팜 증적 폴더를 읽지 못했다 (${곳}): ${err instanceof Error ? err.message : String(err)}`);
  }
  const 파일들 = await Promise.all(
    이름들.sort(차례.compare).map(async (name) => ({ name, bytes: (await stat(join(곳, name))).size })),
  );
  return 파일들;
}

/** 증적 문서용 한 줄. 문서에는 영상을 넣을 수 없어 어디서 보는지만 적는다. 받은 것이 없으면 null */
export async function 팜기록글(runId: number, historyId: number): Promise<string | null> {
  const 파일들 = await 팜증적목록(runId, historyId);
  if (파일들.length === 0) return null;
  const 영상 = 파일들.filter((f) => f.name.endsWith('.mp4')).length;
  const 그밖 = 파일들.filter((f) => !f.name.endsWith('.mp4')).map((f) => f.name);
  const 조각 = [...(영상 === 0 ? [] : [`화면 영상 ${String(영상)}개`]), ...그밖];
  return `${조각.join(' · ')} — 실행 화면의 이 항목에서 받는다`;
}

/** GET /api/runs/:runId/items/:historyId/farm/:name — 영상을 앞뒤로 넘길 수 있게 Range 를 받는 sendFile 로 내준다 */
export async function 팜증적경로(app: FastifyInstance): Promise<void> {
  // 화면 산출물용 등록과 따로 이 플러그인 안에서만 sendFile 을 단다. 경로를 스스로 내주지는 않는다
  // root 는 등록에 필요할 뿐이고 파일마다 그 항목 폴더를 root 로 넘긴다
  await app.register(fastifyStatic, { root: resolve(process.env.PLATFORM_ARTIFACTS_DIR ?? 'artifacts'), serve: false });

  app.get<{ Params: { runId: string; historyId: string; name: string } }>(
    '/runs/:runId/items/:historyId/farm/:name',
    async (req, reply) => {
      const runId = 정수(req.params.runId);
      const historyId = 정수(req.params.historyId);
      if (runId === null || historyId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.url });
      // 폴더에 실제로 있는 이름만 내준다 — 받은 이름으로 경로를 조립하지 않아 폴더 밖으로 못 나간다
      const 있음 = (await 팜증적목록(runId, historyId)).some((f) => f.name === req.params.name);
      if (!있음) return reply.code(404).send({ error: 'FARM_FILE_NOT_FOUND', detail: req.url });
      // logcat 은 화면에 펼치지 않고 받게 한다
      if (req.params.name.endsWith('.txt')) reply.header('Content-Disposition', `attachment; filename="${req.params.name}"`);
      return reply.sendFile(req.params.name, 폴더(runId, historyId));
    },
  );
}
