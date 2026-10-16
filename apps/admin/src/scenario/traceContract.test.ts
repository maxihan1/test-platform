// 진짜 Playwright 로 E2E 실패 기록이 이어지는지 지킨다 — 러너가 시나리오를 돌려 zip 을 옮김 → 서버가 실패 부품 몫만 뗀다 (SPEC 도메인/시나리오 §7 「실패 기록」)
// 단계 번호 경계는 kit 이 시나리오 모드에서도 남겨야 생긴다. 단위 검사로는 원리상 안 보여 여기서만 잡힌다

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { ScenarioExecuteRequest, ScenarioExecuteResponse } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { executeScenario } from '../../../runner/src/scenario.js';
import { type 부품기록, 실패부품trace, 시나리오trace경로, trace를지운다 } from './runTrace.js';

const trialId = '6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const 화면 = [
  '<button id="b">지우기</button><span id="n">1</span>',
  '<script>function busy(el) { return el.innerHTML; }',
  // 한 박자(확인 창 · fetch) 쉰 뒤면 e.currentTarget 이 null 이다. await 0 은 이벤트 처리 안에서 풀려 안 터진다
  'document.getElementById("b").addEventListener("click", async (e) => { await new Promise((r) => setTimeout(r)); busy(e.currentTarget); });</script>',
].join('');
const 케이스 = (tcId: string, 폴더: string): ScenarioExecuteRequest['parts'][number] => ({
  kind: 'case', tcId, params: {}, expected: {}, skipSteps: [], filePath: join(폴더, `${tcId}.case.ts`),
});

const 원래 = process.env.PLATFORM_ARTIFACTS_DIR;
let 임시 = '';
let 결과: ScenarioExecuteResponse;
let 기록: Map<number, 부품기록>;
let 서버: Server;

describe('E2E 실패 기록', () => {
  beforeAll(async () => {
    임시 = mkdtempSync(join(tmpdir(), 'scenario-trace-contract-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 임시;
    // API 부품은 브라우저 모킹을 안 탄다 — 화면과 API 를 진짜 서버가 준다
    서버 = createServer((req, res) => {
      if (req.url === '/api/between') res.writeHead(200, { 'content-type': 'application/json' }).end('{}');
      else res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(화면);
    });
    await new Promise<void>((done) => 서버.listen(0, '127.0.0.1', done));
    결과 = await executeScenario({
      runId: null,
      trialId,
      platform: 'desktop',
      baseUrl: `http://127.0.0.1:${(서버.address() as AddressInfo).port}`,
      parts: [
        케이스('XSF-001', resolve(import.meta.dirname, '../../../runner/scenario/fixtures')),
        { kind: 'api', method: 'GET', path: '/api/between', expectStatus: 200 },
        케이스('XTE-001', resolve(import.meta.dirname, 'traceFixture')),
      ],
      timeoutMs: 90_000,
    });
    기록 = await 실패부품trace(시나리오trace경로({ trialId }), 결과, []);
    await trace를지운다(시나리오trace경로({ trialId }), 기록);
  }, 120_000);

  afterAll(() => {
    서버.close();
    if (원래 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = 원래;
    rmSync(임시, { recursive: true, force: true });
  });

  it('실패한 부품에만 기록이 붙고 풀고 나면 zip 을 지운다', () => {
    expect(결과.parts.map((p) => p.status)).toEqual(['PASS', 'PASS', 'FAIL']);
    expect([...기록.keys()]).toEqual([3]);
    expect(기록.get(3)?.status).toBe('DONE');
    expect(existsSync(시나리오trace경로({ trialId }))).toBe(false);
  });

  it('잡히지 않은 화면 오류가 실패 부품의 단계 번호로 남는다', () => {
    const 오류 = 기록.get(3)?.console.find((c) => c.level === 'pageerror');
    expect(오류?.text).toContain("reading 'innerHTML'");
    expect(오류?.text).toContain('at busy');
    expect(오류?.seq).toBe(결과.parts[2]?.steps.find((s) => s.title === '지우고 0건을 본다')?.seq);
  });

  it('앞 부품 · 사이의 API 부품 기록은 섞이지 않는다 — 실패 부품이 부른 것만 남는다', () => {
    const 셋 = 기록.get(3)!;
    expect(셋.actions.map((a) => a.title.split(' ')[0])).toEqual(['Navigate', 'Click', 'Wait', 'Get']);
    expect(셋.network.map((n) => [n.resourceType, new URL(n.url).pathname])).toEqual([['document', '/']]);
  });
});
