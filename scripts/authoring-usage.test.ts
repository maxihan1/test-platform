// 자식 claude 의 stream-json 을 풀어 토큰 사용량·결과 글·로그 줄을 뽑는 순수 함수 검사 (도메인/작성 §7 「토큰 사용량」)
// 샘플은 2026-09-27 author 컨테이너 CLI 2.1.274 로 실제로 돌린 것을 줄인 것이다

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { 흐름풀기, 흘릴줄 } from './authoring-usage.js';

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
