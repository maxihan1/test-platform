// 자식 claude 의 stream-json 을 풀어 토큰 사용량·결과 글·로그 한 줄을 뽑는다 (도메인/작성 §7 「토큰 사용량」)
// 다른 실행 도구(Codex CLI 등)를 붙이면 이 파일만 갈아 끼운다 — 에이전트의 나머지는 이 모양만 본다

export interface 사용량 {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  /** 끊겨서 result 가 없었다 — 턴 이벤트로 센 하한값이다 */
  partial: boolean;
  /** API 요금으로 친 참고값. 구독이라 청구액이 아니다. 끊기면 없다 */
  costUsd: number | null;
  model: string | null;
}

export interface 풀린흐름 {
  /** 결과 요약 — result 글, 없으면 assistant 글을 이은 것. 도구 결과는 싣지 않는다 */
  글: string;
  사용량: 사용량;
}

type 쪽 = { type?: string; text?: string; name?: string };
type 턴사용 = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
};
type 모델사용 = {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
};
type 이벤트 = {
  type?: string;
  message?: { id?: string; model?: string; content?: 쪽[]; usage?: 턴사용 };
  result?: string;
  total_cost_usd?: number;
  modelUsage?: Record<string, 모델사용>;
};

function 읽기(줄: string): 이벤트 | null {
  try {
    const 값: unknown = JSON.parse(줄);
    return typeof 값 === 'object' && 값 !== null ? (값 as 이벤트) : null;
  } catch {
    // 경고 글·잘린 마지막 줄(SIGKILL)은 이벤트가 아니다
    return null;
  }
}

const 수 = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);

function 가장많이쓴(출력: Map<string, number>): string | null {
  let 이름: string | null = null;
  let 최대 = -1;
  for (const [모델, n] of 출력) {
    if (n > 최대) {
      이름 = 모델;
      최대 = n;
    }
  }
  return 이름;
}

export function 흐름풀기(낸것: string): 풀린흐름 {
  // 같은 메시지가 콘텐츠 블록마다 되풀이된다. 앞 사본의 출력은 스트리밍 중간값이라 마지막 사본을 쓴다
  const 턴들 = new Map<string, { model: string; usage: 턴사용 }>();
  const 글들: string[] = [];
  let 결과: 이벤트 | null = null;

  for (const 줄 of 낸것.split('\n')) {
    const e = 읽기(줄);
    if (e === null) continue;
    if (e.type === 'result') {
      결과 = e;
      continue;
    }
    if (e.type !== 'assistant' || e.message === undefined) continue;
    const { id, model, content, usage } = e.message;
    if (id !== undefined && usage !== undefined) 턴들.set(id, { model: model ?? '', usage });
    for (const c of content ?? []) if (c.type === 'text' && c.text) 글들.push(c.text);
  }

  if (결과 !== null && 결과.modelUsage !== undefined) {
    // 하위 에이전트·보조 호출까지 든 넓은 합이다 — 메인 루프의 usage 는 그보다 좁다 (2026-09-27 실측)
    const 출력 = new Map<string, number>();
    const 합 = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
    for (const [모델, m] of Object.entries(결과.modelUsage)) {
      합.input += 수(m.inputTokens);
      합.output += 수(m.outputTokens);
      합.cacheRead += 수(m.cacheReadInputTokens);
      합.cacheWrite += 수(m.cacheCreationInputTokens);
      출력.set(모델, 수(m.outputTokens));
    }
    const 비용 = 결과.total_cost_usd;
    return {
      글: typeof 결과.result === 'string' ? 결과.result : 글들.join('\n'),
      사용량: {
        ...합,
        partial: false,
        costUsd: typeof 비용 === 'number' && Number.isFinite(비용) && 비용 >= 0 ? 비용 : null,
        model: 가장많이쓴(출력),
      },
    };
  }

  const 출력 = new Map<string, number>();
  const 합 = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  for (const { model, usage } of 턴들.values()) {
    합.input += 수(usage.input_tokens);
    합.output += 수(usage.output_tokens);
    합.cacheRead += 수(usage.cache_read_input_tokens);
    합.cacheWrite += 수(usage.cache_creation_input_tokens);
    if (model !== '') 출력.set(model, (출력.get(model) ?? 0) + 수(usage.output_tokens));
  }
  return { 글: 글들.join('\n'), 사용량: { ...합, partial: true, costUsd: null, model: 가장많이쓴(출력) } };
}

/** 에이전트 로그에 흘릴 한 줄. 도구 결과·사고는 흘리지 않는다 — 훑은 화면 글과 계정 원문이 섞일 수 있다 */
export function 흘릴줄(줄: string): string | null {
  const e = 읽기(줄);
  if (e === null || e.type !== 'assistant') return null;
  for (const c of e.message?.content ?? []) {
    if (c.type === 'tool_use' && c.name) return `· ${c.name}`;
    if (c.type === 'text' && c.text) return `» ${c.text.split('\n')[0]!.slice(0, 120)}`;
  }
  return null;
}
