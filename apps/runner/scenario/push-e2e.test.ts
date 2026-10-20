// 시나리오 실측 — 「웹 가입 → 알림 서버에 기기 등록 → 웹 주문 → 푸시 확인 → 기기 지우기」를 진짜 Playwright 자식으로 돌린다 (진행판 API-F1-10 · SPEC 도메인/시나리오 §3.7 결정 14)
// API 호출 단계가 API 인증 토큰을 붙이고, 앞 단계 응답 값을 주소 · 본문에 넣고, 응답 값을 확인하는지 서버 쪽 기록으로 본다

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ScenarioExecuteRequest, ScenarioResponseRef } from '@platform/kit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { executeScenario } from '../src/scenario.js';
import { 클라이언트, 푸시서버열기, type 푸시서버 } from './push-server.js';

type Part = ScenarioExecuteRequest['parts'][number];
type ApiPart = Extract<Part, { kind: 'api' }>;

const fixtures = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const 가입아이디: ScenarioResponseRef = { fromSeq: 1, method: 'POST', urlPattern: '**/api/auth/signup', jsonPath: 'loginId' };
const 인증 = [{ name: '데모마켓', tokenUrl: '/v1/oauth/token', clientId: 클라이언트.id, clientSecret: 클라이언트.secret }];

let 산출물 = '';
let 서버: 푸시서버;
const 옛값 = process.env.PLATFORM_ARTIFACTS_DIR;

beforeAll(async () => {
  산출물 = mkdtempSync(join(tmpdir(), 'xsf-push-'));
  process.env.PLATFORM_ARTIFACTS_DIR = 산출물;
  서버 = await 푸시서버열기();
});

afterAll(async () => {
  if (옛값 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
  else process.env.PLATFORM_ARTIFACTS_DIR = 옛값;
  rmSync(산출물, { recursive: true, force: true });
  await 서버.닫기();
});

const 알림단계 = (part: Omit<ApiPart, 'kind' | 'baseUrl' | 'apiAuths'>): ApiPart => ({ kind: 'api', baseUrl: 서버.알림, apiAuths: 인증, ...part });
const 가입: Part = { kind: 'case', tcId: 'XSF-009', params: {}, expected: {}, skipSteps: [], filePath: join(fixtures, 'XSF-009.case.ts') };
const 주문: Part = {
  kind: 'case', tcId: 'XSF-010', params: { 비밀번호: 'Passw0rd!' }, expected: {}, skipSteps: [], filePath: join(fixtures, 'XSF-010.case.ts'),
  links: [{ kind: 'bind', param: '아이디', value: 가입아이디 }],
};
const 기기등록 = () => 알림단계({
  method: 'POST', path: '/v1/devices', expectStatus: 201, auth: '데모마켓',
  body: { userId: '{아이디}', platform: 'android', pushToken: 'e2e-{아이디}' },
  values: [{ name: '아이디', value: 가입아이디 }],
});
const 푸시확인 = () => 알림단계({
  method: 'GET', path: '/v1/pushes?userId={아이디}', expectStatus: 200, auth: '데모마켓',
  values: [{ name: '아이디', value: 가입아이디 }],
  expectJson: [{ jsonPath: 'items.0.title', equals: '주문이 완료되었습니다' }],
});
const 요청 = (parts: Part[]): ScenarioExecuteRequest => ({
  runId: null, trialId: '7a1c2b3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', platform: 'desktop', baseUrl: 서버.쇼핑몰, parts, timeoutMs: 60_000,
});

describe('E2E — 웹 가입 → 기기 등록 → 웹 주문 → 푸시 확인', () => {
  it('API 호출 단계가 토큰을 붙이고 가입 아이디를 넣고, 주문 뒤 그 회원의 푸시를 확인하고, 만든 기기를 지운다', async () => {
    const 기기지우기 = 알림단계({
      method: 'DELETE', path: '/v1/devices/{기기}', expectStatus: 204, auth: '데모마켓',
      values: [{ name: '기기', value: { fromSeq: 2, method: 'POST', urlPattern: '**', jsonPath: 'id' } }],
    });

    const 결과 = await executeScenario(요청([가입, 기기등록(), 주문, 푸시확인(), 기기지우기]));

    expect(결과.parts.map((p) => [p.seq, p.status, p.error?.message])).toEqual([
      [1, 'PASS', undefined], [2, 'PASS', undefined], [3, 'PASS', undefined], [4, 'PASS', undefined], [5, 'PASS', undefined],
    ]);
    expect(결과.status).toBe('PASS');
    const 아이디 = 결과.parts[1]?.bound?.['아이디'];
    expect(아이디).toMatch(/^qa_/);
    expect(결과.parts[2]?.bound).toEqual({ 아이디 });
    expect(결과.parts[4]?.bound?.['기기']).toMatch(/^dev-/);
    expect(서버.기기.size).toBe(0);
    expect(서버.받은인증.every((h) => /^Bearer tok-\d+$/.test(h))).toBe(true);
    // 같은 인증 이름 · 같은 주소면 시나리오 안에서 토큰 하나를 나눠 쓴다
    expect(new Set(서버.받은인증).size).toBe(1);
  }, 90_000);

  it('기기 등록을 빼면 주문 푸시가 안 가서 푸시 확인 단계가 받은 값과 함께 빨갛게 멈춘다', async () => {
    const 결과 = await executeScenario(요청([가입, 주문, 푸시확인()]));

    expect(결과.status).toBe('FAIL');
    expect(결과.parts[2]?.error?.message).toBe('응답 값이 다릅니다 — items.0.title (기대 주문이 완료되었습니다 · 받은 값 없음)');
  }, 90_000);

  it('인증을 고르지 않은 API 호출 단계는 토큰 없이 가서 401 로 멈추고, 없는 인증 이름은 그 이름으로 알린다', async () => {
    const { auth: _뺌, ...인증없이 } = 기기등록();
    const 없음 = await executeScenario(요청([가입, 인증없이]));
    const 틀린이름 = await executeScenario(요청([가입, { ...기기등록(), auth: '고객사 B' }]));

    expect(없음.parts[1]?.error?.message).toBe('응답 코드 401 — 기대 201');
    expect(틀린이름.parts[1]?.error?.message).toBe("이 대상 서버에 API 인증 '고객사 B' 가 없습니다");
  }, 90_000);

  it('토큰을 못 받으면 비밀값을 드러내지 않고 그 까닭으로 멈춘다', async () => {
    const 틀린비밀 = [{ ...인증[0]!, clientSecret: 'wrong-secret' }];
    const 결과 = await executeScenario(요청([가입, { ...기기등록(), apiAuths: 틀린비밀 }]));

    expect(결과.parts[1]?.error?.message).toBe("API 인증 '데모마켓' 토큰을 받지 못했습니다 — 401");
    expect(JSON.stringify(결과)).not.toContain('wrong-secret');
  }, 90_000);
});
