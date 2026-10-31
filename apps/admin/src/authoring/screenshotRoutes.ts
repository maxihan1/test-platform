// 작성 에이전트가 화면 사진을 한 장씩 올리는 통로 (SPEC 도메인/작성 §7)
// agentRoutes.ts 가 300줄을 넘어 뗐다. 같은 플러그인 안에서 부르므로 본문 파서도 그 통로들과 같은 자리에 걸린다

import type { FastifyInstance } from 'fastify';

import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { 집은쪽인가 } from './agentRoutes.js';
import { 사진뿌리 } from './routes.js';
import { 사진자리, 사진자리적기 } from './store.js';

// 한 장 상한. 스크린샷 한 장이 이보다 크면 화면 캡처가 아니라 뭔가 잘못 온 것이다.
// **기존 JSON 통로의 상한이 1MB 다** — 여기만 넓히는 것이므로 화면 한 장에 필요한 만큼만 넓힌다
const 사진상한 = 4 * 1024 * 1024;

// 한 요청이 올릴 수 있는 장수. 러너 스크린샷과 같은 저장 공간을 쓰므로
// 안 막으면 채워서 **다른 팀의 실행 증적까지 죽인다** (2026-09-22 보안 검토가 잡았다)
const 요청당장수 = 200;

export async function 사진통로(app: FastifyInstance): Promise<void> {
  // 사진은 파일이라 JSON 파서가 못 받는다. **새 부품을 넣지 않고** Fastify 가 이미 가진
  // 본문 파서 등록으로 원시 바이트를 그대로 받는다 — 한 번에 한 장이라 여러 장을 가르는 부품이 필요 없다.
  // 글자로 바꿔 보내면(base64) 사진이 커질수록 메모리에 통째로 올라간다 (SPEC §7)
  app.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer', bodyLimit: 사진상한 },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.post<{ Querystring: { service?: string; name?: string }; Params: { id: string } }>(
    '/authoring/requests/:id/screenshots',
    async (req, reply) => {
      const 행 = await 집은쪽인가(req, reply);
      if (행 === null) return reply;
      if (행.status !== 'RUNNING') {
        return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
      }
      // 노트 고치기 줄은 화면을 안 본다 — 사진 폴더가 애플리케이션 칸 없이 서면 화면 목록이 그 줄을 못 그린다 (도메인/BTS §7)
      if (행.serviceId === null) return reply.code(400).send({ error: 'BAD_KIND', detail: 행.kind });

      const 이름 = req.query.name ?? '';
      // 파일 이름이 폴더를 거슬러 올라가면 뿌리 밖에 쓴다. 모양을 좁혀 그 틈을 없앤다
      if (!/^[A-Za-z0-9._-]{1,80}\.png$/.test(이름)) {
        return reply.code(400).send({ error: 'BAD_NAME', detail: 이름 });
      }
      const 몸 = req.body;
      if (!Buffer.isBuffer(몸) || 몸.length === 0) {
        return reply.code(400).send({ error: 'EMPTY_BODY' });
      }

      const 자리 = 사진자리(행.id);
      const 폴더 = join(사진뿌리(), 자리);
      await mkdir(폴더, { recursive: true });
      if ((await readdir(폴더)).length >= 요청당장수) {
        return reply.code(409).send({ error: 'TOO_MANY_SCREENSHOTS' });
      }
      await writeFile(join(폴더, 이름), 몸);
      // 적는 데 실패하면 파일만 남고 아무도 그 폴더를 못 찾는다. 그 사실을 그 자리에서 알린다
      if (!(await 사진자리적기(행.id, 자리))) {
        return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
      }
      return { dir: 자리 };
    },
  );
}
