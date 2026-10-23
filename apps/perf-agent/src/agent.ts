// 부하 발생 에이전트 본체 — QA Hub 에 연락하고 일을 받아 k6 를 돌리거나 /proc 를 읽어 1초마다 숫자를 보낸다 (도메인/성능 §5.4)

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { setTimeout as sleep } from 'node:timers/promises';

import { diff, readSnapshot } from './proc.js';
import { runDummy } from './dummy.js';
import { Seconds } from './seconds.js';
import { hostProblem, pumpSeconds } from './sendLoop.js';
import type { DoneBody, HelloResponse, Job, LoadSecond, MonitorSecond, PageSample } from './types.js';

export interface AgentConfig {
  url: string;
  token: string;
  version: string;
  maxVus?: number;
  // k6 실행 명령. 검사는 가짜 k6 를 node 로 띄운다
  k6: string[];
  // zip 푸는 명령. 비우면 unzip (Dockerfile 이 넣는다)
  unzip?: string[];
  procRoot: string;
  workDir: string;
  log: (msg: string) => void;
  signal?: AbortSignal;
}

const HELLO_MS = 30_000;
const CLAIM_MS = 2_000;
// 스크립트가 페이지 한 번 잴 때마다 console.log 로 내는 줄의 머리.
// 표본 하나가 리소스 100개면 30KB 쯤이라 1초 숫자 하나에 10개만 싣는다 — 서버 본문 상한(1MiB) 안에 든다
const PAGE_PREFIX = 'QAHUB_PAGE ';
const PAGES_PER_SEC = 10;
const FILE_NAME = /^[A-Za-z0-9_-][A-Za-z0-9_.-]{0,99}$/;

class HttpError extends Error {
  constructor(readonly status: number, path: string) {
    super(`${path} 가 ${status} 로 답했습니다`);
  }
}

export class Agent {
  // 서버 시각 − 이 기계 시각. startAt 은 서버 시각이라 이 차이만큼 옮겨 기다린다
  private offsetMs = 0;

  constructor(private readonly cfg: AgentConfig) {}

  async run(): Promise<void> {
    while (!this.cfg.signal?.aborted && !(await this.hello())) await this.pause(CLAIM_MS);
    const timer = setInterval(() => void this.hello(), HELLO_MS);
    try {
      while (!this.cfg.signal?.aborted) {
        const job = await this.claim();
        if (!job) {
          await this.pause(CLAIM_MS);
          continue;
        }
        this.cfg.log(`일을 받았습니다 — 실행 ${job.runId} · ${job.kind}`);
        const done = await this.runJob(job).catch((e: unknown): DoneBody => ({ status: 'ERROR', reason: String(e instanceof Error ? e.message : e) }));
        await this.post(`/api/perf/agent/runs/${job.runId}/done`, done).catch((e: unknown) => this.cfg.log(`끝 알림을 보내지 못했습니다 — ${String(e)}`));
        this.cfg.log(`일을 끝냈습니다 — 실행 ${job.runId} · ${done.status}${done.reason ? ` · ${done.reason}` : ''}`);
      }
    } finally {
      clearInterval(timer);
    }
  }

  private async hello(): Promise<boolean> {
    try {
      const sentAt = Date.now();
      const res = (await this.post('/api/perf/agent/hello', { version: this.cfg.version, host: hostname(), maxVus: this.cfg.maxVus })) as HelloResponse;
      // 왕복 시간의 절반을 가는 길로 친다. 1초 칸을 나누는 데는 이 정도면 된다
      this.offsetMs = Date.parse(res.serverTime) - (sentAt + Date.now()) / 2;
      return true;
    } catch (e) {
      this.cfg.log(e instanceof HttpError && (e.status === 401 || e.status === 403) ? '토큰이 거절됐습니다 — 설정 › 성능 에이전트에서 다시 발급하세요' : `QA Hub 에 닿지 못했습니다 — ${String(e)}`);
      return false;
    }
  }

  private async claim(): Promise<Job | null> {
    try {
      return ((await this.post('/api/perf/agent/claim', {})) as { job: Job | null }).job;
    } catch (e) {
      this.cfg.log(`일을 받지 못했습니다 — ${String(e)}`);
      return null;
    }
  }

  private runJob(job: Job): Promise<DoneBody> {
    if (job.kind === 'MONITOR') return this.runMonitor(job);
    if (job.dummyClient) return runDummy(this.dummyCtx(), job);
    // 페이지 측정은 부하와 같은 길(k6)로 돈다
    if (!job.script) return Promise.resolve({ status: 'ERROR', reason: '스크립트가 없는 일입니다' });
    return this.runLoad(job);
  }

  private async runLoad(job: Job): Promise<DoneBody> {
    const 막힘 = hostProblem(job);
    if (막힘 !== null) return { status: 'ERROR', reason: 막힘 };

    const dir = await mkdtemp(join(this.cfg.workDir, `run-${job.runId}-`));
    try {
      // 환경값은 명령 줄(-e)이 아니라 프로세스 환경으로 넘긴다 — 명령 줄은 ps 로 보이고, 에이전트 환경을 물려주면 AGENT_TOKEN 이 __ENV 로 샌다
      // k6 browser 가 Chromium 을 켜는 데 쓰는 K6_BROWSER_* 만 에이전트 환경에서 물려준다(Dockerfile 이 넣는다)
      const browserEnv = Object.fromEntries(Object.entries(process.env).filter((kv): kv is [string, string] => kv[0].startsWith('K6_BROWSER_') && kv[1] !== undefined));
      const env: Record<string, string> = { PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin', HOME: process.env.HOME ?? '/tmp', ...browserEnv, ...job.env };
      await writeFile(join(dir, 'script.js'), job.script ?? '');
      if (job.accountsCsv) {
        env.ACCOUNTS_CSV = join(dir, 'accounts.csv');
        await writeFile(env.ACCOUNTS_CSV, job.accountsCsv, { mode: 0o600 });
      }
      if (job.files) {
        // 이름에 / · .. 가 들면 폴더 밖에 쓴다
        if (Object.keys(job.files).some((n) => !FILE_NAME.test(n))) return { status: 'ERROR', reason: '일의 파일 이름이 틀렸습니다' };
        env.QAHUB_FILES = join(dir, 'files');
        await mkdir(env.QAHUB_FILES);
        for (const [name, text] of Object.entries(job.files)) await writeFile(join(env.QAHUB_FILES, name), text);
      }
      // 시스템 꼬리표를 비워 줄을 줄인다 — 세는 데 쓰는 꼬리표는 생성기가 다는 tx 하나다.
      // json=/dev/stdout 은 안 된다 — node 가 자식 stdout 을 소켓으로 이어 k6 가 그 경로를 열지 못한다(실측 ENXIO). json=- 는 k6 가 자기 stdout 에 쓴다
      const args = ['run', '-q', '--no-color', '--summary-mode=disabled', '--no-usage-report', '--system-tags=', '--log-format=raw', '--out', 'json=-'];
      if (job.segment) args.push('--execution-segment', job.segment);
      if (job.segmentSequence) args.push('--execution-segment-sequence', job.segmentSequence);
      args.push(join(dir, 'script.js'));

      const startMs = this.localStart(job);
      await this.pause(startMs - Date.now());
      if (this.cfg.signal?.aborted) return { status: 'ERROR', reason: '에이전트가 꺼졌습니다' };
      const seconds = new Seconds(startMs);
      const [cmd, ...pre] = this.cfg.k6;
      const child = spawn(cmd, [...pre, ...args], { stdio: ['ignore', 'pipe', 'pipe'], env });
      // 에이전트가 꺼질 때 k6 를 남겨 두면 아무도 숫자를 읽지 않는 부하가 대상 서버에 계속 간다
      const onAbort = () => child.kill('SIGINT');
      this.cfg.signal?.addEventListener('abort', onAbort, { once: true });
      const errTail: string[] = [];
      createInterface({ input: child.stdout }).on('line', (line) => {
        try {
          seconds.add(line);
        } catch {
          // k6 가 끊길 때 마지막 줄이 반쯤 잘려 올 수 있다. 여기서 던지면 에이전트가 통째로 죽어 끝 알림도 못 보낸다
        }
      });
      // 아직 못 보낸 페이지 표본. 못 보낸 1초 숫자의 표본은 앞으로 되돌려 다음에 다시 붙인다
      const pageBuf: PageSample[] = [];
      const retried = new WeakSet<PageSample>();
      createInterface({ input: child.stderr }).on('line', (line) => {
        if (line.startsWith(PAGE_PREFIX)) {
          try {
            const sample = JSON.parse(line.slice(PAGE_PREFIX.length)) as PageSample;
            if (typeof sample?.url === 'string') pageBuf.push(sample);
          } catch {
            // 반쯤 잘린 줄은 버린다. 던지면 에이전트가 통째로 죽는다
          }
          return;
        }
        errTail.push(line);
        if (errTail.length > 10) errTail.shift();
      });
      // k6 를 못 켜면 error 가 오고 close 는 안 올 수도 있어 error 로도 끝을 낸다. 잡지 않으면 에이전트가 통째로 죽는다
      const exited = new Promise<number | null>((resolve) => {
        child.on('close', resolve);
        child.on('error', (e) => {
          errTail.push(e.message);
          resolve(null);
        });
      });

      let stopping = false;
      // 보내지 못하면 false. 그 틱의 나머지는 다음 틱으로 미룬다 — QA Hub 가 느릴 때 초마다 10초씩 기다리며 밀리지 않게
      const send = async (s: LoadSecond): Promise<boolean> => {
        const pages = pageBuf.splice(0, PAGES_PER_SEC);
        const res = await this.sendMetrics(job.runId, pages.length ? { ...s, pages } : s);
        // 한 번만 다시 싣는다 — 서버가 늘 거절하는 표본을 끝없이 되돌리면 그 뒤 초가 모두 막힌다
        if (!res) pageBuf.unshift(...pages.filter((p) => !retried.has(p) && retried.add(p)));
        if (res?.stop && !stopping) {
          stopping = true;
          // SIGINT 면 k6 가 하던 반복을 마치고 스스로 끝난다
          child.kill('SIGINT');
        }
        return res !== null;
      };
      let next = await pumpSeconds(startMs, seconds, exited, send);
      this.cfg.signal?.removeEventListener('abort', onAbort);
      // 마지막 틱 뒤에 온 표본은 빈 초에 실어 보낸다. 보내기가 실패하면 그만둔다
      while (pageBuf.length && (await send(seconds.take(next)))) next += 1;

      const exitCode = await exited;
      if (this.cfg.signal?.aborted && !stopping) return { status: 'ERROR', reason: '에이전트가 꺼졌습니다' };
      if (exitCode === 0 || stopping) return { status: 'OK' };
      return { status: 'ERROR', reason: `k6 가 ${String(exitCode)} 로 끝났습니다${errTail.length ? ` — ${errTail.join(' / ').slice(-1000)}` : ''}` };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async runMonitor(job: Job): Promise<DoneBody> {
    const startMs = this.localStart(job);
    await this.pause(startMs - Date.now());
    // 이미 지난 초는 건너뛴다 — 늦게 받은 일 · 늦게 끝난 보내기 뒤에 지난 초를 몇 ms 간격 읽기로 채우면 가짜 숫자가 나간다
    const 지금초 = () => Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    let prev = readSnapshot(this.cfg.procRoot);
    for (let sec = 지금초(); sec < job.durationSec && !this.cfg.signal?.aborted; sec = Math.max(sec + 1, 지금초())) {
      await this.pause(startMs + (sec + 1) * 1000 - Date.now());
      const cur = readSnapshot(this.cfg.procRoot);
      const body: MonitorSecond = { sec, ...diff(prev, cur) };
      prev = cur;
      if ((await this.sendMetrics(job.runId, body))?.stop) break;
    }
    return { status: 'OK' };
  }

  // 못 보내면 null. 204 나 빈 본문이어도 던지지 않는다 — 던지면 runLoad 가 k6 를 남긴 채 풀려 버린다
  private async sendMetrics(runId: number, body: LoadSecond | MonitorSecond): Promise<{ stop: boolean } | null> {
    try {
      const res = (await this.post(`/api/perf/agent/runs/${runId}/metrics`, body)) as { stop?: boolean } | null;
      return { stop: res?.stop === true };
    } catch (e) {
      this.cfg.log(`1초 숫자를 보내지 못했습니다 — ${String(e)}`);
      return null;
    }
  }

  private dummyCtx() {
    return {
      cfg: this.cfg,
      localStart: (job: Job) => this.localStart(job),
      pause: (ms: number) => this.pause(ms),
      send: (runId: number, body: LoadSecond) => this.sendMetrics(runId, body),
    };
  }

  private localStart(job: Job): number {
    return Date.parse(job.startAt) - this.offsetMs;
  }

  private async pause(ms: number): Promise<void> {
    if (ms <= 0) return;
    await sleep(ms, undefined, { signal: this.cfg.signal }).catch(() => undefined);
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(this.cfg.url + path, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.cfg.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new HttpError(res.status, path);
    return res.status === 204 ? null : res.json();
  }
}
