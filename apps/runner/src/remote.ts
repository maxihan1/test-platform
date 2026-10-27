// 러너가 admin 옆이 아닐 때(터널로 이은 맥 러너) 필요한 둘 — 토큰 검사와 결과 파일 내주기 (SPEC 도메인/러너 §5.2 「러너 토큰 · 파일 내주기」)

import { createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, normalize, sep } from 'node:path';

import type { FastifyInstance } from 'fastify';

import { 산출물폴더 } from './outputDir.js';

// 러너가 쓰는 폴더만 내준다. 증적 문서 · 빌드 · 작성 자료는 admin 의 것이라 이 러너에 없다
const 내주는뿌리 = ['runs', 'perf'];

const 해시 = (글: string): Buffer => createHash('sha256').update(글).digest();

/** runs/ · perf/ 아래 상대 경로면 정리한 값, 아니면 null */
export function 상대경로(값: unknown): string | null {
  if (typeof 값 !== 'string' || 값 === '' || 값.includes('\0') || isAbsolute(값)) return null;
  const 정리 = normalize(값).replace(/[/\\]+$/, '');
  if (정리 === '..' || 정리.startsWith(`..${sep}`)) return null;
  return 내주는뿌리.includes(정리.split(sep)[0] ?? '') ? 정리 : null;
}

// 케이스가 root 로 돌아 볼륨에 바로가기를 걸 수 있다. 따라가면 /proc/self/environ 같은 러너의 파일이 나간다 — admin 의 볼륨파일과 같은 기준이다
async function 진짜자리(상대: string): Promise<string | null> {
  const 뿌리 = 산출물폴더();
  try {
    const 진짜 = await realpath(join(뿌리, 상대));
    return 진짜 === join(await realpath(뿌리), 상대) ? 진짜 : null;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'ELOOP') return null;
    throw new Error(`산출물 파일을 확인하지 못했다 (${상대}): ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function registerRemote(app: FastifyInstance, 토큰 = process.env.RUNNER_TOKEN ?? ''): void {
  if (토큰 !== '') {
    const 기대 = 해시(`Bearer ${토큰}`);
    // 해시끼리 견줘 길이가 달라도 시간이 같다. /health 는 터널 스크립트 · admin 의 잠자기 감지가 토큰 없이 묻는다
    app.addHook('onRequest', async (request, reply) => {
      if (request.method === 'GET' && request.url === '/health') return;
      if (!timingSafeEqual(기대, 해시(request.headers.authorization ?? ''))) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', detail: 'RUNNER_TOKEN 이 맞지 않는다' });
      }
    });
  }

  // path 는 파일 하나, dir 은 그 폴더의 일반 파일 이름들이다. admin 이 자기 볼륨에 없을 때만 부른다
  app.get<{ Querystring: { path?: string; dir?: string } }>('/files', async (request, reply) => {
    const { path, dir } = request.query;
    const 상대 = (path === undefined) === (dir === undefined) ? null : 상대경로(path ?? dir);
    if (상대 === null) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'path 나 dir 하나에 runs/ · perf/ 아래 상대 경로를 준다' });
    }
    const 진짜 = await 진짜자리(상대);
    const 정보 = 진짜 === null ? null : await stat(진짜);
    if (진짜 !== null && dir !== undefined && 정보?.isDirectory() === true) {
      return { names: (await readdir(진짜, { withFileTypes: true })).filter((d) => d.isFile()).map((d) => d.name) };
    }
    if (진짜 !== null && path !== undefined && 정보?.isFile() === true) {
      // 길이를 먼저 알려야 admin 이 상한을 넘는 파일을 받기 전에 거른다
      return reply.header('content-type', 'application/octet-stream').header('content-length', 정보.size).send(createReadStream(진짜));
    }
    return reply.code(404).send({ error: 'NOT_FOUND', detail: 상대 });
  });
}
