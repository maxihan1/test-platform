// 부하 발생 에이전트 진입점 — 환경값을 읽어 에이전트를 켠다. 토큰이 없으면 끝나지 않고 일하지 않은 채 떠 있는다 (공통/6 §9)

import { tmpdir } from 'node:os';

import { Agent } from './agent.js';

const token = process.env.AGENT_TOKEN ?? '';
const maxVus = Number(process.env.MAX_VUS) || undefined;

if (!token) {
  // 끝나 버리면 restart: unless-stopped 가 끝없이 다시 띄워 2 vCPU 서버를 갉아먹는다
  console.log('토큰이 없습니다 — 설정 › 성능 에이전트에서 발급한 토큰을 AGENT_TOKEN 에 넣고 다시 띄우세요');
  setInterval(() => undefined, 2 ** 31 - 1);
} else {
  await new Agent({
    url: (process.env.QAHUB_URL ?? 'http://admin:3000').replace(/\/$/, ''),
    token,
    version: '0.1.0',
    maxVus,
    k6: ['k6'],
    procRoot: '/proc',
    workDir: tmpdir(),
    log: (msg) => console.log(`${new Date().toISOString()} ${msg}`),
  }).run();
}
