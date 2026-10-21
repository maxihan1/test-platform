// 페이지 성능 한 바퀴를 실제 DB 와 문으로 본다 — 측정 거절 · PAGE 일 · 가운데 값 판정 · 부하 중 측정 · 견줄 실행 · 페이지 추천 · 페이지별 AI 분석

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 분석결과쓰기 } from './analysis.js';
import { 차리기, type 차림 } from './dbFixture.js';
import { 도는실행들, 한번돌기 } from './engine.js';
import { 뒷일기다리기 } from './finish.js';

const 연결 = process.env.DATABASE_URL;
const 에이전트이름 = 'xpp-load';
const 쉼 = (ms: number) => new Promise((r) => setTimeout(r, ms));

const 표본 = (url: string, lcpMs: number, cls = 0.01) => ({
  url, lcpMs, fcpMs: 600, cls, ttfbMs: 120, lcpElement: 'img hero.jpg',
  resources: [{ name: '/', type: 'document', startMs: 0, durationMs: 200, bytes: 3000 }, { name: '/hero.jpg', type: 'img', startMs: 300, durationMs: lcpMs - 300, bytes: 1_900_000 }],
});

describe.skipIf(연결 === undefined)('페이지 성능', { timeout: 60_000 }, () => {
  let 판: 차림;
  let 토큰 = '';
  let API앱 = 0;

  const 에이전트 = (url: string, payload: object = {}) => 판.app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${토큰}` }, payload });
  async function 될때까지<T>(일: () => Promise<T | null>): Promise<T> {
    for (let i = 0; i < 160; i++) {
      await 한번돌기();
      const v = await 일();
      if (v !== null) return v;
      await 쉼(50);
    }
    throw new Error('기다린 일이 오지 않았다');
  }
  const 일받기 = () => 될때까지(async () => (await 에이전트('/api/perf/agent/claim')).json<{ job: Record<string, unknown> | null }>().job);
  const 실행 = async (runId: number) => (await 판.사람(판.관리자, 'GET', `/api/perf/runs/${runId}`)).json<{ status: string; verdict: string | null; targets: { metric: string; scope: string; verdict: string }[] | null; config: { pages: { url: string }[] } }>();
  const 끝날때까지 = (runId: number) => 될때까지(async () => {
    const s = await 실행(runId);
    return ['DONE', 'STOPPED', 'ERROR'].includes(s.status) ? s : null;
  });
  const 측정 = (more: object = {}) => 판.사람(판.쓰기, 'POST', '/api/perf/pages/measure', {
    serviceId: 판.서비스, env: 'qa', pages: [{ url: '/', name: '메인', login: false }, { url: '/cart', name: '장바구니', login: true }], device: 'desktop', network: 'NONE', ...more,
  });

  beforeAll(async () => {
    판 = await 차리기('XPP');
    await 판.pool.query(`UPDATE service_env SET login_id = 'qa-user', login_password = 'qa-pass-1' WHERE service_id = $1 AND env = 'qa'`, [판.서비스]);
    await 판.pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'dev', 'http://dev.xpp.test')`, [판.서비스]);
    await 판.pool.query(
      `INSERT INTO screen_record (service_id, env, state, url, name, text_fp, struct_fp, record, crawled_at) VALUES
         ($1, 'qa', '로그아웃', '/login', '로그인', 'a', 'b', 'http://shop.xpp.test/login\n# 로그인', now()),
         ($1, 'qa', '로그인:일반 회원', '/products/:n', '상품 상세', 'a', 'b', 'http://shop.xpp.test/products/7\n# 상품 상세', now())`,
      [판.서비스],
    );
    const s = await 판.pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id, kind) VALUES ('XPPB', 'XPPB', '#445566', '', 'XPPB', $1, 'API') RETURNING id`,
      [판.프로젝트],
    );
    API앱 = Number(s.rows[0]?.id);
    await 판.pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'qa', 'http://api.xpp.test')`, [API앱]);
    const 발급 = await 판.사람(판.관리자, 'POST', '/api/perf/agents', { name: 에이전트이름, mode: 'LOAD' });
    토큰 = 발급.json<{ token: string }>().token;
    await 에이전트('/api/perf/agent/hello', { version: '0.1.0', host: 'box-1' });
  }, 60_000);

  afterAll(async () => {
    for (const id of 도는실행들().keys()) await 판.사람(판.관리자, 'POST', `/api/perf/runs/${id}/stop`);
    await 뒷일기다리기();
    await 판.pool.query('DELETE FROM perf_ai_job WHERE service_id = $1', [API앱]);
    await 판.pool.query('DELETE FROM perf_run WHERE service_id = $1', [API앱]);
    await 판.pool.query('DELETE FROM service_env WHERE service_id = $1', [API앱]);
    await 판.pool.query('DELETE FROM screen_record WHERE service_id = $1', [판.서비스]);
    await 판.pool.query('DELETE FROM perf_agent WHERE name = $1', [에이전트이름]);
    await 판.정리();
    await 판.pool.query('DELETE FROM service WHERE id = $1', [API앱]);
  }, 60_000);

  it('웹이 아니거나 로그인할 길이 없거나 경로가 틀리면 측정을 만들지 않는다', async () => {
    expect((await 측정({ serviceId: API앱 })).json()).toMatchObject({ error: 'INVALID_REQUEST', detail: '웹 애플리케이션만 페이지 성능을 잽니다' });
    expect((await 측정({ env: 'dev' })).json()).toMatchObject({ detail: '로그인이 필요한 페이지가 있는데 대상 서버에 테스트 계정이 없습니다' });
    expect((await 측정({ pages: [{ url: 'http://evil.test/', name: '밖', login: false }] })).statusCode).toBe(400);
    expect((await 판.사람(판.읽기만, 'POST', '/api/perf/pages/measure', { serviceId: 판.서비스, env: 'qa', pages: [{ url: '/', name: '메인', login: false }], device: 'desktop', network: 'NONE' })).statusCode).toBe(403);
  });

  it('PAGE 일이 가고 세 번 잰 가운데 값으로 판정한다 — 로그인 화면 · 계정을 싣고 못 넘은 목표는 실패', async () => {
    const res = await 측정();
    expect(res.statusCode).toBe(201);
    const runId = res.json<{ runId: number }>().runId;
    const job = await 일받기();
    expect(job).toMatchObject({ runId, kind: 'PAGE', allowedHosts: ['shop.xpp.test'], env: { BASE_URL: 'http://shop.xpp.test', ACCOUNT_ID: 'qa-user', ACCOUNT_PW: 'qa-pass-1' } });
    expect(String(job.script)).toContain('const PAGE_LOGIN_URL = "/login";');
    expect((await 실행(runId)).status).toBe('RUNNING');

    expect((await 에이전트(`/api/perf/agent/runs/${runId}/metrics`, { sec: 0, pages: [표본('/', 1000), 표본('/', 1200), 표본('/', 3000)] })).json()).toEqual({ stop: false });
    await 에이전트(`/api/perf/agent/runs/${runId}/metrics`, { sec: 1, vus: 1, txs: [], pages: [표본('/cart', 2900, 0.18), 표본('/cart', 2800, 0.2), 표본('/cart', 3100, 0.18)] });
    await 에이전트(`/api/perf/agent/runs/${runId}/done`, { status: 'OK' });
    const 끝 = await 끝날때까지(runId);
    expect(끝).toMatchObject({ status: 'DONE', verdict: 'FAIL' });
    expect(끝.targets?.filter((t) => t.verdict === 'FAIL').map((t) => `${t.scope} ${t.metric}`)).toEqual(['/cart LCP', '/cart CLS']);

    const 페이지 = (await 판.사람(판.읽기만, 'GET', `/api/perf/runs/${runId}/pages`)).json<{ pages: { url: string; name: string; lcpMs: number; cls: number; sec: number | null; verdict: string; resources: unknown[] }[]; compare: unknown }>();
    expect(페이지.pages.map((p) => [p.url, p.name, p.lcpMs, p.cls, p.sec, p.verdict])).toEqual([['/', '메인', 1200, 0.01, null, 'PASS'], ['/cart', '장바구니', 2900, 0.18, null, 'FAIL']]);
    expect(페이지.pages[0]?.resources).toHaveLength(2);
    expect(페이지.compare).toBeNull();

    // 끝나면 페이지 재료로 AI 분석 일이 선다
    await 뒷일기다리기();
    const 일 = await 판.pool.query<{ input: { kind: string; pages: { url: string }[] } }>(`SELECT input FROM perf_ai_job WHERE run_id = $1 AND kind = 'ANALYZE_RUN'`, [runId]);
    expect(일.rows[0]?.input.kind).toBe('PAGE');
    expect(일.rows[0]?.input.pages.map((p) => p.url)).toEqual(['/', '/cart']);
    await 분석결과쓰기(runId, { title: '장바구니가 느림', items: ['LCP 지연'], pages: [{ url: '/cart', items: ['이미지 1.9MB'] }] });
    const 다시 = (await 판.사람(판.관리자, 'GET', `/api/perf/runs/${runId}/pages`)).json<{ pages: { url: string; ai: string[] | null }[] }>();
    expect(다시.pages.map((p) => p.ai)).toEqual([null, ['이미지 1.9MB']]);
    expect((await 판.사람(판.관리자, 'GET', `/api/perf/runs/${runId}/report.pdf`)).statusCode).toBe(400);
  });

  it('표본이 하나도 없으면 오류로 닫는다', async () => {
    const runId = (await 측정({ pages: [{ url: '/', name: '메인', login: false }] })).json<{ runId: number }>().runId;
    await 일받기();
    await 에이전트(`/api/perf/agent/runs/${runId}/metrics`, { sec: 0 });
    await 에이전트(`/api/perf/agent/runs/${runId}/done`, { status: 'OK' });
    expect((await 끝날때까지(runId)).status).toBe('ERROR');
  });

  it('부하 중 측정 — 최근 단독 측정의 페이지를 브라우저 시나리오로 재고 그 초의 가상 사용자와 남는다. 두 실행이 서로를 견준다', async () => {
    const 시나리오 = await 판.시나리오만들기('주문', { transactions: [{ name: '목록', method: 'GET', url: '/api/items' }] });
    const res = await 판.사람(판.관리자, 'POST', '/api/perf/runs', {
      scenarioId: 시나리오, env: 'qa', testType: 'LOAD', stages: [{ durationSec: 30, target: 10 }], targets: [], agentIds: [Number((await 판.pool.query<{ id: string }>('SELECT id FROM perf_agent WHERE name = $1', [에이전트이름])).rows[0]?.id)], pageCheck: true,
    });
    expect(res.statusCode).toBe(201);
    const runId = res.json<{ runId: number }>().runId;
    expect((await 실행(runId)).config.pages).toMatchObject({ pages: [{ url: '/' }], loginUrl: null });
    const smoke = await 일받기();
    expect(String(smoke.script)).not.toContain('pageCheck');
    await 에이전트(`/api/perf/agent/runs/${runId}/metrics`, { sec: 0, vus: 1, txs: [{ name: '목록', requests: 3, errors: 0, hist: Array(116).fill(0).map((_, i) => (i === 50 ? 3 : 0)) }] });
    await 에이전트(`/api/perf/agent/runs/${runId}/done`, { status: 'OK' });
    const load = await 일받기();
    expect(String(load.script)).toContain('export async function pageCheck()');

    await 에이전트(`/api/perf/agent/runs/${runId}/metrics`, { sec: 5, vus: 8, txs: [{ name: '목록', requests: 10, errors: 0, hist: Array(116).fill(0).map((_, i) => (i === 50 ? 10 : 0)) }], pages: [표본('/', 2100)] });
    const 중 = (await 판.사람(판.관리자, 'GET', `/api/perf/runs/${runId}/pages`)).json<{ pages: { url: string; sec: number; vus: number; lcpMs: number; verdict: null }[]; compare: { kind: string; pages: { url: string; lcpMs: number }[] } }>();
    expect(중.pages).toMatchObject([{ url: '/', sec: 5, vus: 8, lcpMs: 2100, verdict: null }]);
    expect(중.compare).toMatchObject({ kind: 'PAGE', pages: [{ url: '/', lcpMs: 1200 }, { url: '/cart', lcpMs: 2900 }] });

    await 판.사람(판.관리자, 'POST', `/api/perf/runs/${runId}/stop`);
    const 단독 = (await 판.pool.query<{ id: string }>(`SELECT id FROM perf_run WHERE service_id = $1 AND kind = 'PAGE' AND status = 'DONE' ORDER BY id DESC LIMIT 1`, [판.서비스])).rows[0]?.id;
    const 견줌 = (await 판.사람(판.관리자, 'GET', `/api/perf/runs/${단독}/pages`)).json<{ compare: object }>().compare;
    expect(견줌).toMatchObject({ runId, kind: 'LOAD', vus: 8, pages: [{ url: '/', lcpMs: 2100 }] });
  });

  it('페이지 추천은 화면 기록의 틀 · 이름 · 진짜 주소만 넘기고 기록이 없으면 409', async () => {
    const res = await 판.사람(판.쓰기, 'POST', '/api/perf/suggest', { serviceId: 판.서비스, kind: 'PAGES', env: 'qa' });
    expect(res.statusCode).toBe(202);
    const 일 = await 판.pool.query<{ input: { screens: object[] } }>('SELECT input FROM perf_ai_job WHERE id = $1', [res.json<{ jobId: number }>().jobId]);
    expect(일.rows[0]?.input.screens).toEqual([
      { state: '로그아웃', url: '/login', name: '로그인', address: 'http://shop.xpp.test/login' },
      { state: '로그인:일반 회원', url: '/products/:n', name: '상품 상세', address: 'http://shop.xpp.test/products/7' },
    ]);
    expect((await 판.사람(판.쓰기, 'POST', '/api/perf/suggest', { serviceId: 판.서비스, kind: 'PAGES', env: 'dev' })).json()).toMatchObject({ error: 'NO_DATA' });
  });
});
