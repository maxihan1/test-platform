// 부하 발생 에이전트 본체 — QA Hub 에 연락하고 일을 받아 k6 를 돌리거나 /proc 를 읽어 1초마다 숫자를 보낸다 (도메인/성능 §5.4)

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { setTimeout as sleep } from 'node:timers/promises';

import { diff, readSnapshot } from './proc.js';
import { Seconds } from './seconds.js';
import type { DoneBody, HelloResponse, Job, LoadSecond, MonitorSecond } from './types.js';

export interface AgentConfig {
  url: string;
  token: string;
  version: string;
  maxVus?: number;
  // k6 실행 명령. 검사는 가짜 k6 를 node 로 띄운다
  k6: string[];
  procRoot: string;
  workDir: string;
  log: (msg: string) => void;
  signal?: AbortSignal;
}

const HELLO_MS = 30_000;
const CLAIM_MS = 2_000;
// k6 JSON 출력은 1초마다 몰아서 쓴다. 2초를 기다려야 그 초의 줄이 다 와 있다 — QA Hub 가 합치기를 기다리는 2초와 같다(§5.4)
const LAG_SEC = 2;

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
    // 페이지 단독 측정은 PERF-F1-07, 더미 클라이언트는 PERF-F1-10 에서 더한다
    if (job.kind === 'PAGE' || job.dummyClient || !job.script) return Promise.resolve({ status: 'ERROR', reason: `이 에이전트는 아직 ${job.kind === 'PAGE' ? '페이지 측정' : '더미 클라이언트'}을 하지 못합니다` });
    return this.runLoad(job);
  }

  private async runLoad(job: Job): Promise<DoneBody> {
    const base = job.env.BASE_URL;
    if (base && !job.allowedHosts.includes(new URL(base).host)) return { status: 'ERROR', reason: `허용 호스트 밖의 대상 서버입니다 — ${new URL(base).host}` };

    const dir = await mkdtemp(join(this.cfg.workDir, `run-${job.runId}-`));
    try {
      const env = { ...job.env };
      await writeFile(join(dir, 'script.js'), job.script ?? '');
      if (job.accountsCsv) {
        env.ACCOUNTS_CSV = join(dir, 'accounts.csv');
        await writeFile(env.ACCOUNTS_CSV, job.accountsCsv, { mode: 0o600 });
      }
      // 시스템 꼬리표를 비워 줄을 줄인다 — 세는 데 쓰는 꼬리표는 생성기가 다는 tx 하나다.
      // json=/dev/stdout 은 안 된다 — node 가 자식 stdout 을 소켓으로 이어 k6 가 그 경로를 열지 못한다(실측 ENXIO). json=- 는 k6 가 자기 stdout 에 쓴다
      const args = ['run', '-q', '--no-color', '--summary-mode=disabled', '--no-usage-report', '--system-tags=', '--out', 'json=-'];
      if (job.segment) args.push('--execution-segment', job.segment);
      if (job.segmentSequence) args.push('--execution-segment-sequence', job.segmentSequence);
      for (const [k, v] of Object.entries(env)) args.push('-e', `${k}=${v}`);
      args.push(join(dir, 'script.js'));

      const startMs = this.localStart(job);
      await this.pause(startMs - Date.now());
      const seconds = new Seconds(startMs);
      const [cmd, ...pre] = this.cfg.k6;
      const child = spawn(cmd, [...pre, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
      const errTail: string[] = [];
      createInterface({ input: child.stdout }).on('line', (line) => {
        try {
          seconds.add(line);
        } catch {
          // k6 가 끊길 때 마지막 줄이 반쯤 잘려 올 수 있다. 여기서 던지면 에이전트가 통째로 죽어 끝 알림도 못 보낸다
        }
      });
      createInterface({ input: child.stderr }).on('line', (line) => {
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
      let finished = false;
      void exited.then(() => {
        finished = true;
      });

      let next = 0;
      let stopping = false;
      const send = async (s: LoadSecond) => {
        const res = (await this.post(`/api/perf/agent/runs/${job.runId}/metrics`, s).catch((e: unknown) => {
          this.cfg.log(`1초 숫자를 보내지 못했습니다 — ${String(e)}`);
          return { stop: false };
        })) as { stop: boolean };
        if (res.stop && !stopping) {
          stopping = true;
          // SIGINT 면 k6 가 하던 반복을 마치고 스스로 끝난다
          child.kill('SIGINT');
        }
      };
      const flush = async (upTo: number) => {
        for (const late of seconds.leftovers().filter((s) => s < next)) await send(seconds.take(late));
        for (; next <= upTo; next += 1) await send(seconds.take(next));
      };
      while (!finished) {
        await Promise.race([sleep(1000), exited]);
        await flush(Math.floor((Date.now() - startMs) / 1000) - LAG_SEC);
      }
      // 끝난 뒤에는 남은 초를 다 보낸다
      await flush(Math.max(next - 1, ...seconds.leftovers()));

      const exitCode = await exited;
      if (exitCode === 0 || stopping) return { status: 'OK' };
      return { status: 'ERROR', reason: `k6 가 ${String(exitCode)} 로 끝났습니다${errTail.length ? ` — ${errTail.join(' / ').slice(-1000)}` : ''}` };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  private async runMonitor(job: Job): Promise<DoneBody> {
    const startMs = this.localStart(job);
    await this.pause(startMs - Date.now());
    let prev = readSnapshot(this.cfg.procRoot);
    for (let sec = 0; sec < job.durationSec && !this.cfg.signal?.aborted; sec += 1) {
      await this.pause(startMs + (sec + 1) * 1000 - Date.now());
      const cur = readSnapshot(this.cfg.procRoot);
      const body: MonitorSecond = { sec, ...diff(prev, cur) };
      prev = cur;
      const res = (await this.post(`/api/perf/agent/runs/${job.runId}/metrics`, body).catch((e: unknown) => {
        this.cfg.log(`1초 숫자를 보내지 못했습니다 — ${String(e)}`);
        return { stop: false };
      })) as { stop: boolean };
      if (res.stop) break;
    }
    return { status: 'OK' };
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
