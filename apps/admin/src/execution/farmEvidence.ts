// 러너가 받아 둔 팜 증적(화면 영상 · logcat)을 찾아 목록과 파일로 내준다 (SPEC 도메인/러너 §5.2 「디바이스 팜 접속 방식」)

import { Readable } from 'node:stream';
import type { ReadableStream as 웹스트림 } from 'node:stream/web';
import { basename, dirname, join, resolve } from 'node:path';

import fastifyStatic from '@fastify/static';
import { APPIUM_SESSION_ID_FILE, FARM_EVIDENCE_DIR, runDir } from '@platform/kit';
import type { FastifyInstance, FastifyReply } from 'fastify';

import { 정수 } from '../routeParams.js';
import { 볼륨목록, 볼륨파일, 볼륨파일읽기 } from '../artifactFile.js';

import { 팜머리, 팜주소 } from './farm.js';
import { 실행팜토큰 } from './farmToken.js';

export interface 팜파일 {
  name: string;
  bytes: number;
}

// 러너가 쓴 자리와 어긋나지 않게 kit 의 계산을 그대로 쓴다. E2E 시나리오는 항목 번호 자리가 'scenario' 다 (러너 scenario.ts 시나리오폴더)
const 폴더 = (runId: number, historyId: number | 'scenario'): string => join(runDir(String(runId), String(historyId)), FARM_EVIDENCE_DIR);

// video-10 이 video-2 앞에 오지 않게 숫자를 숫자로 비교한다
const 차례 = new Intl.Collator('en', { numeric: true });

/** 없으면 빈 목록이다 — 통과 항목 · 브라우저 항목 · 팜이 아닌 Appium · 아직 받는 중. 'scenario' 는 E2E 시나리오 한 벌이다 (도메인/시나리오 §3.7 결정 16) */
export async function 팜증적목록(runId: number, historyId: number | 'scenario'): Promise<팜파일[]> {
  const 곳 = 폴더(runId, historyId);
  // 정식 실행을 터널로 이은 맥 러너가 돌렸으면 그 러너의 것도 합친다 — 이름과 크기만 받고 내용은 내려받을 때 받는다 (SPEC 공통/3 §5.3 「러너 여러 대」).
  // 바로가기 · 폴더는 볼륨목록이 뺀다 — 통로가 이 목록에 있는 이름만 내준다
  return (await 볼륨목록(곳)).sort((a, b) => 차례.compare(a.name, b.name));
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

const 팜_제한_ms = 10_000;
const 영상글 = {
  기록없음: '이 항목은 Device VISION 영상 기록이 없습니다',
  팜없음: '이 서버에는 Device VISION 이 연결되어 있지 않습니다',
  지남: 'Device VISION 에 이 영상이 없습니다 — 30일이 지났을 수 있습니다',
  못닿음: 'Device VISION 에 닿지 못했습니다',
  영상없음: 'Device VISION 에 이 항목의 화면 영상이 없습니다',
} as const;

// 통과한 정식 실행 항목은 영상을 받아 두지 않고 연결 번호만 남긴다(러너). 번호가 없으면 팜 기록이 없는 항목이다.
// 바로가기는 없는 파일로 친다 — 따라가면 admin 의 아무 파일이나 팜 주소에 실려 나간다 (리뷰 M4)
async function 연결번호(runId: number, historyId: number): Promise<string | null> {
  try {
    return (await 볼륨파일읽기(join(runDir(String(runId), String(historyId)), APPIUM_SESSION_ID_FILE))).toString('utf8').trim() || null;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error(`팜 연결 번호를 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** 팜이 들고 있는 그 연결의 첫 영상 조각 주소. 팜이 다른 출처를 가리키면 따라가지 않는다 */
async function 첫영상주소(팜: string, sessionId: string, 토큰: string | undefined): Promise<URL | keyof typeof 영상글> {
  const 목록 = await fetch(`${팜}/api/sessions/${encodeURIComponent(sessionId)}/artifacts`, { headers: 팜머리(process.env, 토큰), signal: AbortSignal.timeout(팜_제한_ms) });
  if (목록.status === 404) return '지남';
  if (!목록.ok) return '못닿음';
  const 값 = ((await 목록.json().catch(() => null)) as { value?: { ready?: unknown; files?: { name?: unknown; url?: unknown }[] } } | null)?.value;
  const 첫조각 = (값?.files ?? [])
    .filter((f): f is { name: string; url: string } => typeof f.name === 'string' && typeof f.url === 'string' && f.name.endsWith('.mp4'))
    .sort((a, b) => 차례.compare(a.name, b.name))[0];
  if (값?.ready === false || 첫조각 === undefined) return '영상없음';
  const 주소 = new URL(첫조각.url, 팜);
  return 주소.origin === new URL(팜).origin ? 주소 : '영상없음';
}

/** GET /api/runs/:runId/items/:historyId/farm-video — 통과 항목의 영상. 팜이 30일 들고 있어 받아 저장하지 않고 그대로 흘려보낸다 */
export async function 팜영상경로(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { runId: string; historyId: string } }>('/runs/:runId/items/:historyId/farm-video', async (req, reply) => {
    const runId = 정수(req.params.runId);
    const historyId = 정수(req.params.historyId);
    if (runId === null || historyId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.url });
    const 없음 = (까닭: keyof typeof 영상글) => reply.code(404).send({ error: 'GONE', detail: 영상글[까닭] });
    const sessionId = await 연결번호(runId, historyId);
    if (sessionId === null) return 없음('기록없음');
    const 팜 = 팜주소();
    if (팜 === undefined) return 없음('팜없음');
    // 머리가 올 때까지만 제한을 건다 — 몸통을 흘려보내는 동안 끊기면 긴 영상이 잘린다. 보는 사람이 닫으면 팜 쪽도 끊는다
    const 끊기 = new AbortController();
    const 타이머 = setTimeout(() => 끊기.abort(), 팜_제한_ms);
    reply.raw.on('close', () => 끊기.abort());
    try {
      // 팜은 연결을 연 사람에게만 영상을 준다(남의 것은 404). 그 실행을 누른 사람의 지금 토큰으로 먼저 묻고, 없다면 서버 몫으로 한 번 더 묻는다 —
      // 토큰을 넣기 전에 돈 실행은 서버 몫이 주인이다 (러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)
      const 사람 = await 실행팜토큰(runId).catch((err: unknown) => {
        // 토큰을 못 읽었다고 영상을 버리지 않는다 — 서버 몫으로 묻고, 까닭은 팜이 아니라 DB 라고 남긴다
        console.error(`[farm] 실행 ${runId} 를 누른 사람의 팜 토큰을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
        return undefined;
      });
      let 토큰 = 사람;
      let 주소 = await 첫영상주소(팜, sessionId, 토큰);
      // 404 만이 아니다 — 그 사람 토큰을 Auth 에서 폐기했거나 기간이 끝나면 401 이다
      if (typeof 주소 === 'string' && 사람 !== undefined) {
        토큰 = undefined;
        주소 = await 첫영상주소(팜, sessionId, 토큰);
      }
      if (typeof 주소 === 'string') return 없음(주소);
      const range = req.headers.range;
      // 팜과 같은 출처만 따라가므로(첫영상주소) 토큰이 다른 곳에 실려 나가지 않는다
      const 영상 = await fetch(주소, { headers: { ...팜머리(process.env, 토큰), ...(range === undefined ? {} : { range }) }, signal: 끊기.signal });
      if (영상.status === 404) return 없음('지남');
      if (!영상.ok && 영상.status !== 416) return 없음('못닿음');
      for (const 머리 of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
        const 값 = 영상.headers.get(머리);
        if (값 !== null) reply.header(머리, 값);
      }
      if (!영상.headers.has('content-type')) reply.header('content-type', 'video/mp4');
      reply.code(영상.status);
      return 영상.body === null ? reply.send() : reply.send(Readable.fromWeb(영상.body as unknown as 웹스트림));
    } catch {
      return 없음('못닿음');
    } finally {
      clearTimeout(타이머);
    }
  });
}

/** GET /api/runs/:runId/items/:historyId/farm/:name — 영상을 앞뒤로 넘길 수 있게 Range 를 받는 sendFile 로 내준다 */
export async function 팜증적경로(app: FastifyInstance): Promise<void> {
  // 화면 산출물용 등록과 따로 이 플러그인 안에서만 sendFile 을 단다. 경로를 스스로 내주지는 않는다
  // root 는 등록에 필요할 뿐이고 파일마다 그 항목 폴더를 root 로 넘긴다
  await app.register(fastifyStatic, { root: resolve(process.env.PLATFORM_ARTIFACTS_DIR ?? 'artifacts'), serve: false });

  // 이름 하나만 받아 폴더 밖으로 못 나가고, 바로가기 · 폴더는 볼륨파일이 거른다 — 목록과 같은 기준이다
  const 내준다 = async (reply: FastifyReply, url: string, 곳: string, name: string) => {
    const 진짜 = name === basename(name) ? await 볼륨파일(join(곳, name)) : null;
    if (진짜 === null) return reply.code(404).send({ error: 'FARM_FILE_NOT_FOUND', detail: url });
    // logcat 은 화면에 펼치지 않고 받게 한다. 이름은 팜이 지어 따옴표 · 한글이 섞여도 머리가 안 깨지게 RFC 5987 로 싼다
    if (name.endsWith('.txt')) {
      reply.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    }
    // 확인한 실제 자리로 보낸다 — 이름으로 다시 풀면 그사이 바꿔 건 바로가기를 따라간다
    return reply.sendFile(basename(진짜), dirname(진짜));
  };

  app.get<{ Params: { runId: string; historyId: string; name: string } }>(
    '/runs/:runId/items/:historyId/farm/:name',
    async (req, reply) => {
      const runId = 정수(req.params.runId);
      const historyId = 정수(req.params.historyId);
      if (runId === null || historyId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.url });
      return 내준다(reply, req.url, 폴더(runId, historyId), req.params.name);
    },
  );

  // E2E 시나리오는 팜 증적이 시나리오에 한 벌이다 (도메인/시나리오 §3.7 결정 16 「결과」)
  app.get<{ Params: { runId: string; name: string } }>('/runs/:runId/scenario/farm/:name', async (req, reply) => {
    const runId = 정수(req.params.runId);
    if (runId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.url });
    return 내준다(reply, req.url, 폴더(runId, 'scenario'), req.params.name);
  });
}
