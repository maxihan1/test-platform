// 더미 클라이언트 일 — zip 을 받아 풀고 명령을 띄워 표준 출력 줄을 1초 숫자로 묶어 보낸다 (도메인/성능 §3.9 「게임 서버 부하」 · §5.4)

import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import type { ReadableStream as WebStream } from 'node:stream/web';
import { pipeline } from 'node:stream/promises';

import type { AgentConfig } from './agent.js';
import { DummySeconds, parseStages } from './dummySeconds.js';
import { hostProblem, pumpSeconds } from './sendLoop.js';
import type { DoneBody, Job, LoadSecond } from './types.js';

// 끝낼 때 SIGTERM 을 먼저 보내고 이만큼 기다려도 살아 있으면 SIGKILL 이다
const KILL_GRACE_MS = 5_000;

function killGroup(pid: number, sig: NodeJS.Signals): void {
  try {
    process.kill(-pid, sig);
  } catch {
    // 이미 끝난 묶음이다
  }
}

export interface DummyCtx {
  cfg: AgentConfig;
  localStart: (job: Job) => number;
  pause: (ms: number) => Promise<void>;
  send: (runId: number, body: LoadSecond) => Promise<{ stop: boolean } | null>;
}

async function download(ctx: DummyCtx, id: number, to: string): Promise<void> {
  const res = await fetch(`${ctx.cfg.url}/api/perf/agent/dummy-clients/${id}`, { headers: { authorization: `Bearer ${ctx.cfg.token}` }, signal: ctx.cfg.signal });
  if (!res.ok || !res.body) throw new Error(`더미 클라이언트를 받지 못했습니다 — ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as unknown as WebStream), createWriteStream(to));
}

// Info-ZIP unzip 은 경고만 있으면 1 로 끝난다 — 파일은 풀렸으니 통과시킨다
function unzip(ctx: DummyCtx, zip: string, to: string): Promise<string | null> {
  const [cmd = 'unzip', ...pre] = ctx.cfg.unzip ?? ['unzip'];
  return new Promise((resolve) => {
    const err: string[] = [];
    const child = spawn(cmd, [...pre, '-q', '-o', zip, '-d', to], { stdio: ['ignore', 'ignore', 'pipe'] });
    child.stderr.on('data', (c: Buffer) => err.push(String(c)));
    child.on('error', (e) => resolve(e.message));
    child.on('close', (code) => resolve(code === 0 || code === 1 ? null : `unzip 이 ${String(code)} 로 끝났습니다 — ${err.join('').trim().slice(-500)}`));
  });
}

export async function runDummy(ctx: DummyCtx, job: Job): Promise<DoneBody> {
  const spec = job.dummyClient;
  if (spec === undefined) return { status: 'ERROR', reason: '더미 클라이언트 정보가 없는 일입니다' };
  const 막힘 = hostProblem(job);
  if (막힘 !== null) return { status: 'ERROR', reason: 막힘 };

  const dir = await mkdtemp(join(ctx.cfg.workDir, `dummy-${job.runId}-`));
  try {
    const app = join(dir, 'app');
    // 에이전트 환경(AGENT_TOKEN)은 물려주지 않는다 — 회사가 만든 프로그램이 읽는다
    const env: Record<string, string> = { PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin', HOME: process.env.HOME ?? '/tmp', ...job.env };
    // 몫이 0 이면 받지도 띄우지도 않는다 — 빈 1초 숫자만 실행 시간 동안 보내 연락을 지킨다
    if (spec.users > 0) {
      await mkdir(app);
      await download(ctx, spec.id, join(dir, 'client.zip'));
      const 풀기오류 = await unzip(ctx, join(dir, 'client.zip'), app);
      if (풀기오류 !== null) return { status: 'ERROR', reason: `더미 클라이언트 압축을 풀지 못했습니다 — ${풀기오류}` };
      if (job.accountsCsv) {
        env.QAHUB_ACCOUNTS_CSV = join(dir, 'accounts.csv');
        await writeFile(env.QAHUB_ACCOUNTS_CSV, job.accountsCsv, { mode: 0o600 });
      }
    }

    const startMs = ctx.localStart(job);
    await ctx.pause(startMs - Date.now());
    if (ctx.cfg.signal?.aborted) return { status: 'ERROR', reason: '에이전트가 꺼졌습니다' };

    const seconds = new DummySeconds(startMs, parseStages(job.env.QAHUB_STAGES, spec.users, job.durationSec));
    const errTail: string[] = [];
    let child: ChildProcess | undefined;
    let idleDone: () => void = () => undefined;
    const exited = new Promise<number | null>((resolve) => {
      idleDone = () => resolve(0);
      if (spec.users <= 0) return;
      // 새 프로세스 묶음으로 띄워 끝낼 때 sh 밑에 달린 손자까지 한꺼번에 끊는다
      child = spawn('sh', ['-c', spec.command], { cwd: app, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
      child.on('close', resolve);
      child.on('error', (e) => {
        errTail.push(e.message);
        resolve(null);
      });
      createInterface({ input: child.stdout! }).on('line', (line) => seconds.add(line));
      createInterface({ input: child.stderr! }).on('line', (line) => {
        errTail.push(line);
        if (errTail.length > 10) errTail.shift();
      });
    });

    let killTimer: NodeJS.Timeout | undefined;
    const terminate = () => {
      const pid = child?.pid;
      if (pid === undefined) return idleDone();
      killGroup(pid, 'SIGTERM');
      killTimer ??= setTimeout(() => killGroup(pid, 'SIGKILL'), KILL_GRACE_MS);
    };
    let stopping = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      terminate();
    }, Math.max(0, startMs + job.durationSec * 1000 - Date.now()));
    ctx.cfg.signal?.addEventListener('abort', terminate, { once: true });

    const send = async (s: LoadSecond): Promise<boolean> => {
      const res = await ctx.send(job.runId, s);
      if (res?.stop && !stopping) {
        stopping = true;
        terminate();
      }
      return res !== null;
    };
    let next = await pumpSeconds(startMs, seconds, exited, send);
    // 실행 시간이 다 돼 끊었으면 줄이 없던 마지막 초들도 계획 사용자 수와 함께 보낸다 — 그래야 결과 화면의 최대 동시 사용자가 계획과 같다
    while (timedOut && next < job.durationSec && (await send(seconds.take(next)))) next += 1;
    clearTimeout(timer);
    clearTimeout(killTimer);
    ctx.cfg.signal?.removeEventListener('abort', terminate);
    // sh 가 먼저 끝나도 손자가 남아 대상 서버를 계속 두드리지 않게 묶음을 마저 끊는다
    if (child?.pid !== undefined) killGroup(child.pid, 'SIGKILL');

    const exitCode = await exited;
    if (ctx.cfg.signal?.aborted && !stopping) return { status: 'ERROR', reason: '에이전트가 꺼졌습니다' };
    if (stopping || timedOut || exitCode === 0) return { status: 'OK' };
    return { status: 'ERROR', reason: `더미 클라이언트가 ${String(exitCode)} 로 끝났습니다${errTail.length ? ` — ${errTail.join(' / ').slice(-1000)}` : ''}` };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
