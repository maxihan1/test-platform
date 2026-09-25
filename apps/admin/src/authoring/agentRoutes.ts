// 작성 에이전트가 부르는 통로 — 집기 · 단계 올리기 · 사진 올리기 · 끝내기 (SPEC 도메인/작성 §7)
// routes.ts 가 300줄을 넘어 뗐다. app.ts 가 routes.ts 와 같은 /api 접두사로 등록한다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { 작성계정인가 } from '../auth/agentToken.js';
import { 자료목록 } from './assetStore.js';
import { 집기대상 } from './reverse.js';
import { 번호, 사진뿌리, 서비스번호 } from './routes.js';
import {
  끝내기,
  단계올리기,
  병합주소인가,
  사진자리,
  사진자리적기,
  서비스저장소,
  집기,
  집기되돌리기,
  피그마토큰,
  한건,
  type 요청,
} from './store.js';

// 한 장 상한. 스크린샷 한 장이 이보다 크면 화면 캡처가 아니라 뭔가 잘못 온 것이다.
// **기존 JSON 통로의 상한이 1MB 다** — 여기만 넓히는 것이므로 화면 한 장에 필요한 만큼만 넓힌다
const 사진상한 = 4 * 1024 * 1024;

// 한 요청이 올릴 수 있는 장수. 러너 스크린샷과 같은 저장 공간을 쓰므로
// 안 막으면 채워서 **다른 팀의 실행 증적까지 죽인다** (2026-09-22 보안 검토가 잡았다)
const 요청당장수 = 200;

/**
 * **맥 전용 계정인가.**
 *
 * 명세는 「집어 가는 쪽은 맥 하나다. 그래서 줄도 하나다」를 **전제로** 삼고
 * 「★ 그 계정은 `operator` 다」로 계정까지 지목하는데, **서버가 그 지목을 안 보면
 * 전제가 전제로만 남는다** (2026-09-22 보안 검토가 잡았다).
 *
 * 안 보면 이렇게 뚫린다 — 그 서비스에 배정된 **아무 `operator`** 가 집기를 두드려
 * 맥보다 먼저 집고, `finish` 에 **자기가 고른 `pr_url`** 을 실는다. 그 행은 정상 완료로 보이고,
 * `admin` 이 「이 요청을 머지할까」에 예를 누르면 **그 사람이 고른 PR 이 병합된다.**
 * **집은 쪽 대조만으로는 못 막는다** — 그것은 「A 가 집은 행에 B 가 쓰는 것」을 막을 뿐이고
 * B 는 그냥 **먼저 집으면** 된다. 경계가 아니라 경주다.
 *
 * **이름이 안 정해져 있으면 아무도 못 집는다.** `scope.ts` 의 「모르면 막는다」와 같은 방향이다 —
 * 열어 두면 위 공격이 그대로 살고, 닫아 두면 맥이 안 돌아 **그 자리에서 시끄럽게 드러난다.**
 */
function 맥계정인가(req: FastifyRequest): boolean {
  // 토큰 발급과 같은 판정을 쓴다 — 둘이 갈리면 발급할 수 있는 계정과 집을 수 있는 계정이 달라진다
  return 작성계정인가(req.user?.username ?? '');
}

/**
 * 이 행을 집은 사람이 지금 부르는 사람인가.
 *
 * **집은 쪽을 안 보면 실행 등급 누구나 남의 작업에 임의의 PR 주소를 실을 수 있다.**
 * 뒤에 운영 등급이 머지를 누르면 그 사람이 고른 PR 이 병합된다 — 사람 게이트는
 * 「이 요청을 머지할까」만 묻고 「이 주소가 그 요청이 만든 것 맞나」는 아무도 안 본다
 * (2026-09-22 검토가 잡았다).
 */
export async function 집은쪽인가(req: FastifyRequest, reply: FastifyReply): Promise<요청 | null> {
  // 집은 쪽 대조 앞에 맥 계정을 먼저 본다. 넷(집기·단계·사진·끝내기)이 전부 맥의 일이다
  if (!맥계정인가(req)) {
    await reply.code(403).send({ error: 'NOT_AUTHORING_AGENT' });
    return null;
  }
  const id = 번호((req.params as { id?: string }).id);
  if (id === null) {
    await reply.code(400).send({ error: 'BAD_ID' });
    return null;
  }
  const 행 = await 한건(id);
  if (행 === null) {
    await reply.code(404).send({ error: 'NOT_FOUND' });
    return null;
  }
  // **서비스 경계는 문이 이미 봤다.** `auth/scope.ts` 가 이 틀을 「번호로 서비스를 찾는」 갈래로
  // 분류해 뒀고, 문이 그 행의 실제 서비스를 DB 에서 되찾아 배정과 대조한다.
  // 그래서 여기서 `?service=` 를 또 요구하지 않는다 — 명세 §7 도 이 넷에는 필수 표시가 없다
  if (행.claimedBy !== req.user?.username) {
    await reply.code(403).send({ error: 'NOT_CLAIMER' });
    return null;
  }
  return 행;
}

export default async function authoringAgentRoutes(app: FastifyInstance): Promise<void> {
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

  app.post<{ Querystring: { service?: string } }>(
    '/authoring/requests/claim',
    async (req, reply) => {
      // 집는 쪽이 맥 하나라는 명세의 전제를 여기서 지킨다. 안 지키면 아무 operator 가 맥인 척한다
      if (!맥계정인가(req)) return reply.code(403).send({ error: 'NOT_AUTHORING_AGENT' });

      const 서비스 = await 서비스번호(req, reply);
      if (서비스 === null) return reply;

      const 집은것 = await 집기(서비스, req.user?.username ?? '');
      // 줄이 비었으면 204 다. 맥이 폴링하므로 「없음」이 오류가 아니다
      if (집은것 === null) return reply.code(204).send();
      // 집기는 이미 커밋됐다. 아래가 던지면 맥은 번호를 모르므로 줄로 되돌려 다음 폴링이 다시 집게 한다
      try {
        // RERUN 은 자기 자료가 없다. 원본 행의 자료는 맥이 원본 번호로 따로 읽는다
        const assets = await 자료목록(집은것.id);
        // 토큰은 피그마 자료가 있을 때만 싣는다. 필요 없는 응답에까지 비밀값을 흘리지 않는다.
        // RERUN 은 원본의 자료를 읽으므로 원본에 피그마가 있는지를 본다
        const 읽을자료 =
          집은것.kind === 'RERUN' && 집은것.sourceId !== null ? await 자료목록(집은것.sourceId) : assets;
        const 토큰 = 읽을자료.some((a) => a.kind === 'FIGMA') ? await 피그마토큰(서비스) : null;
        // 테스트 계정도 같은 길이다 — 대조 행에만 싣고, 에이전트는 자식 환경에만 넘긴다 (§3.6 「로그인」)
        const target = await 집기대상(서비스, 집은것);
        return {
          ...집은것,
          assets,
          ...(토큰 === null ? {} : { figmaToken: 토큰 }),
          ...(target === undefined ? {} : { target }),
        };
      } catch (e) {
        // 되돌리기마저 던지면(DB 가 끊긴 같은 원인일 공산이 크다) 그 오류가 원래 원인을 덮는다.
        // 되돌리기 실패는 로그로 남기고 원래 오류를 낸다 — 오래된 RUNNING 을 치우는 장치는 아직 없다
        try {
          await 집기되돌리기(집은것.id, req.user?.username ?? '');
        } catch (되돌리기오류) {
          req.log.error({ err: 되돌리기오류, id: 집은것.id }, '집기 되돌리기 실패 — 행이 RUNNING 으로 남았다');
        }
        throw e;
      }
    },
  );

  app.patch<{ Querystring: { service?: string }; Params: { id: string }; Body: { stage?: unknown } }>(
    '/authoring/requests/:id/stage',
    async (req, reply) => {
      const 행 = await 집은쪽인가(req, reply);
      if (행 === null) return reply;

      const 단계 = req.body?.stage;
      if (typeof 단계 !== 'string' || 단계 === '') {
        return reply.code(400).send({ error: 'STAGE_REQUIRED' });
      }
      // 상태 전이 표 밖이면 409 다. 끝난 행의 단계를 올리면 화면이 끝난 것을 도는 중으로 그린다
      if (!(await 단계올리기(행.id, 단계))) {
        return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
      }
      return { ok: true };
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

  app.post<{
    Querystring: { service?: string };
    Params: { id: string };
    Body: Record<string, unknown>;
  }>('/authoring/requests/:id/finish', async (req, reply) => {
    const 행 = await 집은쪽인가(req, reply);
    if (행 === null) return reply;

    const status = req.body?.status;
    if (status !== 'DONE' && status !== 'FAILED') {
      return reply.code(400).send({ error: 'BAD_STATUS', detail: String(status) });
    }

    // ★ 맥이 보낸 주소를 그대로 믿지 않는다. 이 값이 나중에 admin 승인을 거쳐 실제로 병합된다 —
    // 다른 저장소의 PR 이거나 명령줄에 위험한 글자가 섞여 있으면 여기서 끊는다
    const prUrl = req.body?.prUrl;
    if (prUrl !== undefined) {
      const 저장소 = await 서비스저장소(행.serviceId);
      if (!병합주소인가(prUrl, 저장소)) {
        return reply.code(400).send({ error: 'BAD_PR_URL' });
      }
    }
    const error = req.body?.error;
    // 끝난 행에 또 오면 409 다. 안 막으면 판정과 PR 주소가 덮어써진다
    const 바뀌었나 = await 끝내기(행.id, {
      status,
      result: req.body?.result,
      testSource: req.body?.testSource,
      prUrl: typeof prUrl === 'string' ? prUrl : undefined,
      error: typeof error === 'string' ? error : undefined,
    });
    if (!바뀌었나) return reply.code(409).send({ error: 'NOT_RUNNING', detail: 행.status });
    return { ok: true };
  });
}