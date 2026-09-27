// 자식 claude 의 stream-json 을 풀어 토큰 사용량·결과 글·로그 줄을 뽑는 순수 함수 검사 (도메인/작성 §7 「토큰 사용량」)
// 샘플은 2026-09-27 author 컨테이너 CLI 2.1.274 로 실제로 돌린 것을 줄인 것이다

import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { 사용량보고, 흐름풀기, 흘릴줄 } from './authoring-usage.js';

const 샘플 = readFileSync(new URL('./fixtures/stream-json-sample.jsonl', import.meta.url), 'utf8');
const 결과빼고 = 샘플
  .split('\n')
  .filter((줄) => !줄.includes('"type": "result"'))
  .join('\n');

const 턴 = (id: string, output: number, model = 'claude-opus-5-5') =>
  JSON.stringify({
    type: 'assistant',
    message: {
      id,
      model,
      content: [{ type: 'text', text: '글' }],
      usage: { input_tokens: 10, cache_creation_input_tokens: 5, cache_read_input_tokens: 100, output_tokens: output },
    },
  });

describe('흐름풀기 — 정상 종료', () => {
  it('result 의 modelUsage 를 더하고 비용·결과 글을 쓴다', () => {
    const 풀린 = 흐름풀기(샘플);
    expect(풀린.사용량).toEqual({
      input: 952,
      output: 475,
      cacheRead: 55784,
      cacheWrite: 8219,
      partial: false,
      costUsd: 0.0253434,
      model: 'claude-haiku-4-5-20251001',
    });
    expect(풀린.글).toBe('ok');
  });

  it('모델이 여럿이면 출력 토큰이 가장 많은 모델을 남긴다', () => {
    const 결과 = JSON.stringify({
      type: 'result',
      result: '끝',
      total_cost_usd: 1.5,
      modelUsage: {
        'claude-sonnet-5': { inputTokens: 1, outputTokens: 900, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 },
        'claude-opus-5-5': { inputTokens: 2, outputTokens: 100, cacheReadInputTokens: 3, cacheCreationInputTokens: 4 },
      },
    });
    const 풀린 = 흐름풀기(결과);
    expect(풀린.사용량.model).toBe('claude-sonnet-5');
    expect(풀린.사용량.input).toBe(3);
    expect(풀린.사용량.output).toBe(1000);
  });
});

describe('흐름풀기 — result 는 왔는데 modelUsage 가 없다 (CLI 판 차이)', () => {
  it('끝까지 돈 것이다 — 결과 글·비용을 쓰고 result.usage 로 센다', () => {
    const 결과 = JSON.stringify({
      type: 'result',
      result: '요약',
      total_cost_usd: 0.5,
      usage: { input_tokens: 4, output_tokens: 40, cache_read_input_tokens: 400, cache_creation_input_tokens: 4000 },
    });
    const 풀린 = 흐름풀기([턴('m1', 1), 결과].join('\n'));
    expect(풀린.글).toBe('요약');
    expect(풀린.사용량).toEqual({
      input: 4,
      output: 40,
      cacheRead: 400,
      cacheWrite: 4000,
      partial: false,
      costUsd: 0.5,
      model: 'claude-opus-5-5',
    });
  });

  it('usage 도 없으면 턴 합으로 세되 끊김은 아니다', () => {
    const 풀린 = 흐름풀기([턴('m1', 7), JSON.stringify({ type: 'result', result: '끝' })].join('\n'));
    expect(풀린.글).toBe('끝');
    expect(풀린.사용량).toMatchObject({ output: 7, partial: false, costUsd: null });
  });
});

describe('흐름풀기 — 끊김 (result 없음)', () => {
  it('턴 이벤트를 메시지 id 마다 한 번 더하고 하한값으로 표시한다', () => {
    const 풀린 = 흐름풀기(결과빼고);
    expect(풀린.사용량).toEqual({
      input: 27,
      output: 5,
      cacheRead: 55784,
      cacheWrite: 8219,
      partial: true,
      costUsd: null,
      model: 'claude-haiku-4-5-20251001',
    });
  });

  it('같은 id 가 다시 오면 마지막 사본을 쓴다 — 앞 사본의 출력은 스트리밍 중간값이다', () => {
    const 풀린 = 흐름풀기([턴('m1', 3), 턴('m1', 120)].join('\n'));
    expect(풀린.사용량.output).toBe(120);
    expect(풀린.사용량.input).toBe(10);
  });

  it('JSON 이 아닌 줄과 잘린 마지막 줄은 건너뛴다', () => {
    const 풀린 = 흐름풀기(`경고 한 줄\n${턴('m1', 7)}\n{"type":"assist`);
    expect(풀린.사용량.output).toBe(7);
  });

  it('빈 입력은 0 이고 모델이 없다', () => {
    expect(흐름풀기('').사용량).toEqual({
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      partial: true,
      costUsd: null,
      model: null,
    });
  });

  it('결과 글은 assistant 글만 잇는다 — 도구 결과(훑은 화면 글)는 싣지 않는다', () => {
    const 도구결과 = JSON.stringify({
      type: 'user',
      message: { role: 'user', content: [{ type: 'tool_result', content: 'rate limit exceeded on this page' }] },
    });
    const 풀린 = 흐름풀기([턴('m1', 1), 도구결과].join('\n'));
    expect(풀린.글).toBe('글');
    expect(풀린.글).not.toContain('rate limit');
  });
});

describe('흘릴줄 — 에이전트 로그에 남길 한 줄', () => {
  it('도구 호출은 도구 이름만', () => {
    const 줄 = JSON.stringify({ type: 'assistant', message: { id: 'm', content: [{ type: 'tool_use', name: 'Bash' }] } });
    expect(흘릴줄(줄)).toBe('· Bash');
  });

  it('글은 첫 줄만 120자까지', () => {
    const 긴글 = `${'가'.repeat(200)}\n둘째 줄`;
    const 줄 = JSON.stringify({ type: 'assistant', message: { id: 'm', content: [{ type: 'text', text: 긴글 }] } });
    expect(흘릴줄(줄)).toBe(`» ${'가'.repeat(120)}`);
  });

  it('도구 결과·사고·그 밖 이벤트는 흘리지 않는다 — 계정 원문이 섞일 수 있다', () => {
    const 결과 = JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', content: 'pw' }] } });
    const 사고 = JSON.stringify({ type: 'assistant', message: { id: 'm', content: [{ type: 'thinking' }] } });
    expect(흘릴줄(결과)).toBeNull();
    expect(흘릴줄(사고)).toBeNull();
    expect(흘릴줄('{"type":"system","subtype":"init"}')).toBeNull();
    expect(흘릴줄('JSON 아님')).toBeNull();
  });
});

describe('사용량보고 — 자식이 끝나면 서버에 한 번 알린다', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const 답 = (status: number) => new Response(JSON.stringify({}), { status });

  it('usage 통로로 풀린 사용량을 보내고 풀린 흐름을 돌려준다', async () => {
    const 건것: { url: string; body: unknown }[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      건것.push({ url, body: JSON.parse(String(init.body)) });
      return 답(200);
    });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const 풀린 = await 사용량보고({ 주소기지: 'http://admin:3000', 토큰: 't' }, 'MKT', 5871, 샘플);
    expect(풀린.글).toBe('ok');
    expect(건것).toHaveLength(1);
    expect(건것[0]!.url).toBe('http://admin:3000/api/authoring/requests/5871/usage?service=MKT');
    expect(건것[0]!.body).toMatchObject({ input: 952, output: 475, partial: false, costUsd: 0.0253434 });
  });

  it('끊긴 흐름은 비용·모델 칸을 빼고 partial 로 보낸다', async () => {
    let 몸: Record<string, unknown> = {};
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      몸 = JSON.parse(String(init.body)) as Record<string, unknown>;
      return 답(200);
    });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await 사용량보고({ 주소기지: 'http://a', 토큰: 't' }, 'MKT', 1, '');
    expect(몸).toEqual({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, partial: true });
  });

  it('409 같은 실패는 로그만 남기고 요청을 깨지 않는다', async () => {
    vi.stubGlobal('fetch', async () => 답(409));
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await expect(사용량보고({ 주소기지: 'http://a', 토큰: 't' }, 'MKT', 1, 샘플)).resolves.toBeDefined();
    expect(오류).toHaveBeenCalled();
  });

  it('거절(403)은 던진다 — 다른 통로처럼 줄 돌기가 보고 멈춘다', async () => {
    vi.stubGlobal('fetch', async () => 답(403));
    await expect(사용량보고({ 주소기지: 'http://a', 토큰: 't' }, 'MKT', 1, 샘플)).rejects.toThrow(/403/);
  });
});

describe('보내는 순서 — 어떤 끝내기보다 먼저 (작성 §7 「토큰 사용량」 · 계획 검토 BLOCKER)', () => {
  it('authoring-run 에서 사용량보고가 자식을 띄운 뒤 첫 끝내기·자식거두기보다 앞에 있다', () => {
    const 글 = readFileSync(new URL('./authoring-run.ts', import.meta.url), 'utf8');
    const 띄움 = 글.indexOf('클로드인자(');
    const 보고 = 글.indexOf('사용량보고(', 띄움);
    expect(띄움).toBeGreaterThan(0);
    expect(보고).toBeGreaterThan(띄움);
    expect(보고).toBeLessThan(글.indexOf('손.끝내기(', 띄움));
    expect(보고).toBeLessThan(글.indexOf('자식거두기(', 띄움));
  });
});
