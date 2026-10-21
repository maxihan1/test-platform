// 내 컴퓨터 러너의 기기 성능 기록기 — adb 로 폰을 읽어 쌓고 통로 넷으로 내준다 (SPEC 도메인/러너 「성능 테스트 — 녹화 실행 · 기기 측정」)

import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 산출물폴더 } from './outputDir.js';
import { type Adb, type 녹화를띄운다, totalTime을읽는다, 기기목록, 기본Adb, 기본녹화, 컴포넌트를읽는다 } from './perfAdb.js';
import { type 기록기, 한줄을읽는다 } from './perfRead.js';

export interface PerfDeviceDeps {
  adb?: Adb;
  녹화?: 녹화를띄운다;
  /** 녹화 끊은 뒤 폰이 mp4 를 닫을 때까지 기다리는 시간. 테스트가 0 으로 준다 */
  닫기대기ms?: number;
  now?: () => number;
  /** 측정 간격 1초가 실제로 몇 ms 인지. 테스트가 줄여서 빨리 돈다 */
  초ms?: number;
}

// serial · package 는 `adb shell` 을 거쳐 폰 셸에 들어간다. 꼴을 좁혀 셸 문법이 못 들어오게 한다 (첫 글자는 adb 옵션이 못 되게 문자만)
const startRequest = z.object({
  runId: z.number().int().positive(),
  serial: z.string().regex(/^\w[\w.:-]{0,63}$/),
  package: z.string().regex(/^[A-Za-z]\w*(\.[A-Za-z]\w*)+$/),
  intervalSec: z.union([z.literal(1), z.literal(2), z.literal(5)]),
  record: z.boolean(),
});
const sinceQuery = z.object({ since: z.coerce.number().optional() });

const 대기 = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function registerPerfDeviceRoutes(app: FastifyInstance, deps: PerfDeviceDeps = {}): void {
  const adb = deps.adb ?? 기본Adb;
  const 녹화띄우기 = deps.녹화 ?? 기본녹화;
  const 닫기대기ms = deps.닫기대기ms ?? 1000;
  const now = deps.now ?? Date.now;
  const 초ms = deps.초ms ?? 1000;
  const 기록기들 = new Map<string, 기록기>();
  // 기록기를 만드는 동안(await 사이)에도 같은 폰이 두 번 잡히지 않게 serial 로 먼저 잡는다
  const 재는중 = new Set<string>();

  const sh = (r: 기록기, ...cmd: string[]) => adb(['-s', r.serial, 'shell', ...cmd]);

  function 읽기를시작한다(r: 기록기): void {
    const 한번 = () => {
      if (r.멈춤 || r.읽는중 !== undefined) return;
      r.읽는중 = 한줄을읽는다(adb, r)
        .then(async (row) => {
          r.rows.push(row);
          try {
            await appendFile(resolve(r.폴더, 'perf-metrics.jsonl'), `${JSON.stringify(row)}\n`);
          } catch (err) {
            console.warn(`[runner] 측정값 파일에 못 썼다: ${err instanceof Error ? err.message : String(err)}`);
          }
        })
        .finally(() => {
          r.읽는중 = undefined;
        });
    };
    한번();
    r.타이머 = setInterval(한번, r.intervalSec * 초ms);
    r.타이머.unref();
  }

  // 조각 하나가 끝나면 받아 오고 폰의 파일을 지운다. 이름의 숫자는 그 조각을 시작한 측정 초다
  async function 조각을받는다(r: 기록기, 원격: string, 시작초: number): Promise<void> {
    try {
      await adb(['-s', r.serial, 'pull', 원격, resolve(r.폴더, `rec-${시작초}.mp4`)], 120_000);
      await adb(['-s', r.serial, 'shell', 'rm', 원격]);
    } catch (err) {
      console.warn(`[runner] 녹화 조각 ${원격} 를 받지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function 녹화한다(r: 기록기): Promise<void> {
    for (let 번호 = 0; !r.멈춤; 번호 += 1) {
      const 원격 = `/sdcard/qahub-${r.recId}-${번호}.mp4`;
      const 시작ms = now();
      const 시작초 = Math.round((시작ms - r.시작ms) / 1000);
      const 자식 = 녹화띄우기(['-s', r.serial, 'shell', 'screenrecord', '--time-limit', '180', 원격]);
      r.녹화자식 = 자식;
      await new Promise<void>((끝) => {
        자식.on('exit', 끝);
        자식.on('error', 끝);
      });
      r.녹화자식 = undefined;
      if (r.멈춤) await 대기(닫기대기ms);
      await 조각을받는다(r, 원격, 시작초);
      // 2초도 못 돌고 끝났으면 녹화를 못 하는 폰이다. 계속 돌리면 adb 만 두들긴다
      if (!r.멈춤 && now() - 시작ms < 2000) {
        console.warn(`[runner] 기기 ${r.serial} 녹화가 곧바로 끝나 더 하지 않는다`);
        return;
      }
    }
  }

  async function 끊는다(r: 기록기): Promise<void> {
    r.멈춤 = true;
    if (r.타이머 !== undefined) clearInterval(r.타이머);
    await r.읽는중;
    if (r.녹화자식 !== undefined) {
      // 로컬 adb 만 끊으면 폰의 screenrecord 가 계속 돌 수 있어 SIGINT(mp4 마무리)를 폰에도 보낸다
      await adb(['-s', r.serial, 'shell', 'pkill', '-2', '-f', `qahub-${r.recId}`]).catch(() => '');
      r.녹화자식.kill('SIGINT');
    }
    await r.녹화루프;
  }

  app.get('/perf/devices', async () => ({ devices: await 기기목록(adb) }));

  app.post('/perf/device/start', async (request, reply) => {
    const parsed = startRequest.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }
    const { runId, serial, package: pkg, intervalSec, record } = parsed.data;
    if (재는중.has(serial)) {
      return reply.code(409).send({ error: 'DEVICE_BUSY', detail: `${serial} 를 이미 재고 있다` });
    }
    재는중.add(serial);
    try {
      if (!(await 기기목록(adb)).some((d) => d.serial === serial)) {
        return reply.code(404).send({ error: 'DEVICE_NOT_FOUND', detail: serial });
      }
      if ((await adb(['-s', serial, 'shell', 'pm', 'path', pkg])).trim() === '') {
        return reply.code(400).send({ error: 'INVALID_REQUEST', detail: `폰에 ${pkg} 앱이 없다` });
      }

      const 폴더 = resolve(산출물폴더(), 'perf', String(runId), serial);
      await mkdir(폴더, { recursive: true });
      const r: 기록기 = {
        recId: randomUUID(), serial, pkg, intervalSec, 폴더, rows: [], launchMs: null,
        n: 0, 시작ms: now(), 멈춤: false, 경고: new Set(),
      };

      // 콜드 스타트 시간 — 앱을 멈췄다 띄워 TotalTime 을 잰다. 못 재도 측정은 계속한다
      try {
        await sh(r, 'am', 'force-stop', pkg);
        const 컴포넌트 = 컴포넌트를읽는다(await sh(r, 'cmd', 'package', 'resolve-activity', '--brief', pkg));
        // 무거운 앱은 10초를 넘겨 뜨기도 한다
        if (컴포넌트 !== null) r.launchMs = totalTime을읽는다(await adb(['-s', serial, 'shell', 'am', 'start', '-W', '-n', 컴포넌트], 30_000));
      } catch (err) {
        console.warn(`[runner] 기기 ${serial} 앱 실행 시간을 못 쟀다: ${err instanceof Error ? err.message : String(err)}`);
      }

      r.시작ms = now();
      기록기들.set(r.recId, r);
      읽기를시작한다(r);
      if (record) r.녹화루프 = 녹화한다(r);
      return reply.code(201).send({ recId: r.recId });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: 'RUNNER_ERROR', detail });
    } finally {
      // 시작이 성공해 기록기가 섰으면 serial 을 계속 잡아 둔다. 그 밖(검사 실패 · 오류)은 놓는다
      if (![...기록기들.values()].some((x) => x.serial === serial)) 재는중.delete(serial);
    }
  });

  app.get<{ Params: { recId: string } }>('/perf/device/:recId', async (request, reply) => {
    const r = 기록기들.get(request.params.recId);
    if (r === undefined) return reply.code(404).send({ error: 'NOT_FOUND', detail: request.params.recId });
    const q = sinceQuery.safeParse(request.query);
    if (!q.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: q.error.message });
    const since = q.data.since;
    return { rows: since === undefined ? r.rows : r.rows.filter((row) => row.sec > since), launchMs: r.launchMs };
  });

  app.post<{ Params: { recId: string } }>('/perf/device/:recId/stop', async (request, reply) => {
    const r = 기록기들.get(request.params.recId);
    if (r === undefined) return reply.code(404).send({ error: 'NOT_FOUND', detail: request.params.recId });
    try {
      await 끊는다(r);
      const files = (await readdir(r.폴더))
        .filter((n) => /^rec-\d+\.mp4$/.test(n))
        .sort((a, b) => Number(a.slice(4, -4)) - Number(b.slice(4, -4)));
      return { files };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: 'RUNNER_ERROR', detail });
    } finally {
      기록기들.delete(r.recId);
      재는중.delete(r.serial);
    }
  });
}
