// 빌드 올리기(CI 토큰) · 디바이스 팜이 APK 를 받는 서명 주소 (도메인/실행 §3.11 「빌드마다 돌리기」 · §7 「빌드 통로」)
// 둘 다 사람 로그인 밖이다 — 올리기는 문(auth/gate.ts)이 CI 토큰으로만, 내려받기는 서명이 문이다

import { createReadStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Readable } from 'node:stream';

import { 앱파일값인가 } from '@platform/kit/protocol';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { 올리기거절, 올리기막기, 파일로 } from '../perf/dummy.js';

import { APK인가, 빌드상한, 빌드파일자리, 빌드폴더, 서명맞나, 오래된빌드치우기 } from './buildFile.js';
import { 빌드실행을건다 } from './buildRun.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const APK종류 = ['application/octet-stream', 'application/vnd.android.package-archive'];
const 빌드번호 = z.string().regex(/^[A-Za-z0-9._+-]{1,100}$/);
// JSON 본문은 파일 없이 부를 때다 — 웹 · API 의 배포 알림, 또는 회사 저장소의 APK 주소
const 파일없이 = z
  .object({
    env: z.string().min(1).max(100),
    buildNo: 빌드번호,
    apkUrl: z.string().max(2000).refine((v) => /^https?:\/\//.test(v) && 앱파일값인가(v), 'apkUrl 은 http(s) 주소여야 합니다').optional(),
  })
  .strict();

type 거절 = { status: 400 | 404 | 409 | 413; error: string; detail?: string };
const 거절 = (status: 거절['status'], error: string, detail?: string): 거절 => ({ status, error, ...(detail === undefined ? {} : { detail }) });

/** 요청에서 env · buildNo · apkUrl · APK 본문을 꺼낸다. APK 는 본문 스트림 그대로 — 1GB 넘는 파일을 메모리에 안 올린다 */
function 꺼내기(req: FastifyRequest): { env: string; buildNo: string; apkUrl?: string; apk?: Readable } | 거절 {
  const 종류 = (req.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
  if (APK종류.includes(종류)) {
    const q = req.query as { env?: unknown; buildNo?: unknown };
    const env = typeof q.env === 'string' ? q.env : '';
    const buildNo = 빌드번호.safeParse(q.buildNo);
    if (env === '' || !buildNo.success) return 거절(400, 'INVALID_REQUEST', 'APK 를 보낼 때는 주소에 ?env=&buildNo= 를 붙입니다');
    return { env, buildNo: buildNo.data, apk: req.body as Readable };
  }
  const 몸 = 파일없이.safeParse(req.body ?? req.query);
  if (!몸.success) return 거절(400, 'INVALID_REQUEST', 몸.error.issues.map((i) => i.path.join('.')).join(', '));
  return 몸.data.apkUrl === undefined ? { env: 몸.data.env, buildNo: 몸.data.buildNo } : { ...몸.data, apkUrl: 몸.data.apkUrl };
}

async function 보낸다(reply: FastifyReply, 결과: 거절): Promise<FastifyReply> {
  return reply.code(결과.status).send({ error: 결과.error, ...(결과.detail === undefined ? {} : { detail: 결과.detail }) });
}

export default async function buildRoutes(app: FastifyInstance): Promise<void> {
  // 본문을 읽지 않고 스트림 그대로 넘긴다 — 다른 갈래의 버퍼 파서와 겹치지 않게 이 플러그인 안에서만 건다
  app.addContentTypeParser(APK종류, (_req, payload, done) => done(null, payload));

  app.post('/builds', async (req, reply) => {
    // 문이 CI 토큰을 확인하고 실었다. 여기 없으면 문이 빠진 것이라 막는다
    const 주인 = req.ciToken;
    if (주인 === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    const 값 = 꺼내기(req);
    if ('status' in 값) {
      (req.body as Readable | undefined)?.resume?.();
      return 보낸다(reply, 값);
    }
    const 흘려보내기 = (): void => void 값.apk?.resume();

    const pool = await db();
    // 토큰의 애플리케이션 줄로만 정한다 — 다른 애플리케이션 대상 서버 이름을 보내도 그 줄은 없는 것과 같다
    const 줄 = await pool.query<{ is_prod: boolean; prefix: string }>(
      'SELECT e.is_prod, s.prefix FROM service_env e JOIN service s ON s.id = e.service_id WHERE e.service_id = $1 AND e.env = $2',
      [주인.serviceId, 값.env],
    );
    const 그줄 = 줄.rows[0];
    const 앱인가 = 주인.kind === 'APP' || 주인.kind === 'GAME';
    const 막힘 =
      그줄 === undefined ? 거절(404, 'ENV_NOT_FOUND', 값.env)
      // 게임 · 앱 케이스 준비가 어드민 API 로 상태를 바꿔 운영 서버를 망가뜨린다 — 실서비스 서버 줄에는 빌드 실행을 걸지 않는다
      : 그줄.is_prod ? 거절(400, 'PROD_ENV_BLOCKED', 값.env)
      : 앱인가 && 값.apk === undefined && 값.apkUrl === undefined ? 거절(400, 'APK_REQUIRED', 'Android 앱 · 게임은 APK 나 apkUrl 을 보냅니다')
      : !앱인가 && (값.apk !== undefined || 값.apkUrl !== undefined) ? 거절(400, 'APK_NOT_ALLOWED', '웹 · API 애플리케이션은 파일 없이 빌드 번호만 보냅니다')
      : null;
    if (막힘 !== null) {
      흘려보내기();
      return 보낸다(reply, 막힘);
    }
    const 겹침 = await pool.query('SELECT 1 FROM app_build WHERE service_id = $1 AND env = $2 AND build_no = $3', [주인.serviceId, 값.env, 값.buildNo]);
    if ((겹침.rowCount ?? 0) > 0) {
      흘려보내기();
      return 보낸다(reply, 거절(409, 'BUILD_EXISTS', 값.buildNo));
    }

    let buildId: number;
    if (값.apk !== undefined) {
      // 보낸다고 밝힌 크기가 상한을 넘으면 읽지 않고 돌려보낸다
      if (Number(req.headers['content-length'] ?? 0) > 빌드상한) {
        흘려보내기();
        return 보낸다(reply, 거절(413, 'PAYLOAD_TOO_LARGE'));
      }
      await mkdir(빌드폴더(), { recursive: true });
      const 임시 = join(빌드폴더(), `upload-${String(process.pid)}-${String(Date.now())}-${Math.random().toString(36).slice(2)}.part`);
      try {
        await 파일로(값.apk, 올리기막기(빌드상한), 임시);
        if (!(await APK인가(임시))) throw new 올리기거절(400, 'BAD_FILE_TYPE');
        const 크기 = (await stat(임시)).size;
        const r = await pool.query<{ id: string }>(
          `INSERT INTO app_build (service_id, env, build_no, file_path, size_bytes, uploaded_by) VALUES ($1, $2, $3, '', $4, $5) RETURNING id`,
          [주인.serviceId, 값.env, 값.buildNo, 크기, 주인.username],
        );
        buildId = Number(r.rows[0]!.id);
        await rename(임시, 빌드파일자리(buildId));
        await pool.query('UPDATE app_build SET file_path = $2 WHERE id = $1', [buildId, 빌드파일자리(buildId)]);
      } catch (e) {
        await rm(임시, { force: true });
        // zip 머리가 아니어도 APK 가 아니다 — 더미 올리기의 말(zip 파일이 아닙니다)을 빌드 말로 바꾼다
        if (e instanceof 올리기거절) return 보낸다(reply, e.status === 413 ? 거절(413, 'PAYLOAD_TOO_LARGE') : 거절(400, 'BAD_FILE_TYPE', 'APK 파일만 받습니다(AAB · OBB 는 안 받습니다)'));
        if ((e as { code?: string }).code === '23505') return 보낸다(reply, 거절(409, 'BUILD_EXISTS', 값.buildNo));
        throw e;
      }
    } else {
      try {
        const r = await pool.query<{ id: string }>(
          'INSERT INTO app_build (service_id, env, build_no, app_url, uploaded_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [주인.serviceId, 값.env, 값.buildNo, 값.apkUrl ?? null, 주인.username],
        );
        buildId = Number(r.rows[0]!.id);
      } catch (e) {
        if ((e as { code?: string }).code === '23505') return 보낸다(reply, 거절(409, 'BUILD_EXISTS', 값.buildNo));
        throw e;
      }
    }

    await 오래된빌드치우기(주인.serviceId, 값.env);
    const runIds = await 빌드실행을건다({
      id: buildId,
      serviceId: 주인.serviceId,
      prefix: 그줄!.prefix,
      env: 값.env,
      buildNo: 값.buildNo,
      username: 주인.username,
      displayName: 주인.displayName,
    });
    return reply.code(201).send({ buildId, runIds });
  });

  // 서명이 문이다 — 로그인이 없는 디바이스 팜이 받는다. 틀리거나 기한이 지났으면 있는지도 알리지 않고 403
  app.get<{ Params: { buildId: string }; Querystring: { exp?: string; sig?: string } }>('/builds/:buildId/apk', async (req, reply) => {
    const buildId = /^\d{1,15}$/.test(req.params.buildId) ? Number(req.params.buildId) : null;
    if (buildId === null || !서명맞나(buildId, req.query.exp, req.query.sig)) return reply.code(403).send({ error: 'BAD_SIGNATURE' });
    const r = await (await db()).query<{ file_path: string | null; size_bytes: string | null }>(
      'SELECT file_path, size_bytes FROM app_build WHERE id = $1',
      [buildId],
    );
    const 행 = r.rows[0];
    if (행?.file_path == null || 행.file_path === '') return reply.code(404).send({ error: 'BUILD_GONE' });
    return reply
      .header('content-type', 'application/vnd.android.package-archive')
      .header('content-length', String(행.size_bytes))
      .header('content-disposition', `attachment; filename="build-${String(buildId)}.apk"`)
      // 같은 빌드는 바뀌지 않는다 — Appium 이 받아 둔 파일을 다시 쓰게 한다
      .header('etag', `"build-${String(buildId)}"`)
      .header('cache-control', 'private, max-age=7200, immutable')
      .send(createReadStream(행.file_path));
  });
}
