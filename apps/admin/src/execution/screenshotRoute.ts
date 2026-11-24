// 실행 항목의 스크린샷을 내주는 통로 — routes.ts 가 300줄을 넘어 뗐다 (SPEC 도메인/실행 §7)

import { join } from 'node:path';

import type { FastifyInstance } from 'fastify';

import { artifactsDir, 볼륨파일읽기 } from '../artifactFile.js';
import { 정수 } from '../routeParams.js';
import { 실행단위번호 } from './execRead.js';

export async function 사진경로(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { runId: string; historyId: string; seq: string } }>(
    '/screenshots/:runId/:historyId/:seq.png',
    async (req, reply) => {
      // 경로를 정수로만 조립한다. 볼륨 밖으로 올라가는 경로가 애초에 만들어지지 않는다 — 바로가기는 볼륨파일읽기가 막는다.
      // 여기만 규칙을 따로 적었다가 0 과 지수 표기를 통과시키고 있었다 — 같은 자리를 쓴다
      const runId = 정수(req.params.runId);
      const historyId = 정수(req.params.historyId);
      const seq = 정수(req.params.seq);
      if (runId === null || historyId === null || seq === null) {
        return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.url });
      }

      // 사진은 실행 단위 폴더에 쌓인다 — 프로시저 안 케이스의 줄 번호로 물으면 그 실행 단위 번호로 바꾼다 (도메인/러너 §5.2 「프로시저 실행」 「폴더」)
      const 번호 = (await 실행단위번호(runId, historyId)) ?? historyId;
      const file = join(artifactsDir(), 'runs', String(runId), String(번호), `${String(seq)}.png`);
      let png: Buffer;
      try {
        png = await 볼륨파일읽기(file);
      } catch {
        // 내보낼 것을 손에 쥔 뒤에 형식을 정한다. 먼저 image/png로 박아 두면 404 본문을 png로 쓰려다 500이 난다
        return reply.code(404).send({ error: 'SCREENSHOT_NOT_FOUND', detail: req.url });
      }
      return reply.type('image/png').send(png);
    },
  );
}
