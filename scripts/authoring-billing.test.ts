// 작성 에이전트가 API 크레딧을 먼저 쓰고 떨어지면 구독으로 넘어가는 판단 검사
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { 결제환경, 크레딧먼저, 크레딧바닥났나, 크레딧키검사 } from './authoring-billing.js';
import type { 돌린결과 } from './authoring-spawn.js';

const 결과줄 = (글: string, 출력: number) =>
  JSON.stringify({ type: 'result', is_error: 출력 === 0, result: 글, usage: { input_tokens: 3, output_tokens: 출력 } });
const 실행 = (낸것: string, 코드: number | null = 1, 오류 = ''): 돌린결과 => ({ 코드, 낸것, 오류, 시간초과: false, 멈춤으로죽음: false });

describe('크레딧바닥났나 — 끝 몇 줄과 표준 오류만 본다', () => {
  it('잔액 부족 · 지출 한도 안내를 알아본다', () => {
    expect(크레딧바닥났나('API Error: 400 Your credit balance is too low to access the Anthropic API.')).toBe(true);
    expect(크레딧바닥났나('', 'You have reached your specified workspace API usage limits')).toBe(true);
    expect(크레딧바닥났나('Insufficient credits')).toBe(true);
  });

  it('평범한 결과 · 구독 한도 문장은 크레딧 바닥이 아니다', () => {
    expect(크레딧바닥났나('케이스 71건을 만들었다')).toBe(false);
    expect(크레딧바닥났나("You've hit your limit · resets 3pm")).toBe(false);
  });

  it('앞쪽에 인용된 글은 안 본다 — 대상 화면 문구를 인용한 채 끝난 것까지 바닥으로 세지 않는다', () => {
    expect(크레딧바닥났나(['화면 안내: credit balance is too low', '1', '2', '3', '끝'].join('\n'))).toBe(false);
  });
});

describe('결제환경 — 자식 claude 가 어느 쪽으로 도는지 환경으로 못 박는다', () => {
  const 부모 = { PATH: '/bin', CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat01-x', AUTHORING_CREDIT_KEY: 'sk-ant-api03-k' };

  it('크레딧이면 키를 ANTHROPIC_API_KEY 로 넣고 구독 토큰을 뺀다 — 둘 다 있으면 어느 쪽인지 장담 못 한다', () => {
    const e = 결제환경(부모, 'sk-ant-api03-k');
    expect(e.ANTHROPIC_API_KEY).toBe('sk-ant-api03-k');
    expect(e.CLAUDE_CODE_OAUTH_TOKEN).toBeUndefined();
    expect(e.AUTHORING_CREDIT_KEY).toBeUndefined();
    expect(e.PATH).toBe('/bin');
  });

  it('구독이면 키를 다 빼고 구독 토큰은 둔다 — 전용 이름의 키도 자식 셸에 안 남긴다', () => {
    const e = 결제환경({ ...부모, ANTHROPIC_API_KEY: 'sk-ant-api03-stray' }, undefined);
    expect(e.ANTHROPIC_API_KEY).toBeUndefined();
    expect(e.AUTHORING_CREDIT_KEY).toBeUndefined();
    expect(e.CLAUDE_CODE_OAUTH_TOKEN).toBe('sk-ant-oat01-x');
  });
});

describe('크레딧키검사 — Console API 키만 받는다', () => {
  it('비었으면 통과', () => {
    expect(크레딧키검사(undefined)).toBeNull();
    expect(크레딧키검사('')).toBeNull();
  });

  it('Console API 키는 접두사 꼴이 달라도 통과한다 — 2026-10 크레딧 조직에서 만든 키는 sk-ant-usr… 였고 /v1/models 가 200 이었다', () => {
    expect(크레딧키검사('sk-ant-api03-abc')).toBeNull();
    expect(크레딧키검사('sk-ant-usr01-abc')).toBeNull();
  });

  it('구독 토큰 · 갱신 토큰 · 관리자 키 · 엉뚱한 값은 막는다', () => {
    expect(크레딧키검사('sk-ant-oat01-abc')).toMatch(/AUTHORING_CREDIT_KEY/);
    expect(크레딧키검사('sk-ant-ort01-abc')).toMatch(/AUTHORING_CREDIT_KEY/);
    expect(크레딧키검사('sk-ant-admin01-abc')).toMatch(/AUTHORING_CREDIT_KEY/);
    expect(크레딧키검사('hello')).toMatch(/AUTHORING_CREDIT_KEY/);
  });
});

describe('크레딧먼저 — 크레딧으로 먼저, 처음부터 없으면 구독으로 한 번 더', () => {
  const 띄우기 = (결과들: 돌린결과[]) => {
    const 받은키: (string | undefined)[] = [];
    const 띄운다 = async (키: string | undefined) => {
      받은키.push(키);
      return 결과들[받은키.length - 1];
    };
    return { 받은키, 띄운다 };
  };

  it('키가 없으면 구독으로 한 번만', async () => {
    const f = 띄우기([실행(결과줄('끝', 10), 0)]);
    const r = await 크레딧먼저(undefined, f.띄운다, () => {});
    expect(f.받은키).toEqual([undefined]);
    expect(r.크레딧으로).toBe(false);
  });

  it('크레딧으로 끝까지 돌면 그대로 — 다시 띄우지 않는다', async () => {
    const f = 띄우기([실행(결과줄('끝', 10), 0)]);
    const r = await 크레딧먼저('sk-ant-api03-k', f.띄운다, () => {});
    expect(f.받은키).toEqual(['sk-ant-api03-k']);
    expect(r.크레딧으로).toBe(true);
  });

  it('시작하자마자 크레딧이 없으면(출력 0) 알리고 구독으로 다시 띄운다', async () => {
    let 알림 = 0;
    const 둘째 = 실행(결과줄('끝', 10), 0);
    const f = 띄우기([실행(결과줄('Credit balance is too low', 0)), 둘째]);
    const r = await 크레딧먼저('sk-ant-api03-k', f.띄운다, () => { 알림 += 1; });
    expect(f.받은키).toEqual(['sk-ant-api03-k', undefined]);
    expect(r).toEqual({ 돌린것: 둘째, 크레딧으로: false });
    expect(알림).toBe(1);
  });

  it('일하다 도중에 떨어졌으면 다시 띄우지 않는다 — 처음부터 다시 쓰면 만든 것이 겹친다. 한도 멈춤 뒤 이어하기가 잇는다', async () => {
    const f = 띄우기([실행(결과줄('Credit balance is too low', 500))]);
    const r = await 크레딧먼저('sk-ant-api03-k', f.띄운다, () => {});
    expect(f.받은키).toEqual(['sk-ant-api03-k']);
    expect(r.크레딧으로).toBe(true);
  });

  it('시작하자마자(출력 0) 다른 까닭으로 실패해도 구독으로 한 번 더 — 폐기된 키 · 새 조직 속도 제한으로 작성이 막히지 않고, 구독은 돈이 안 나간다', async () => {
    let 알림 = '';
    const f = 띄우기([실행(결과줄('API Error: 429 rate_limit_error', 0)), 실행(결과줄('끝', 10), 0)]);
    const r = await 크레딧먼저('sk-ant-api03-k', f.띄운다, (까닭) => { 알림 = 까닭; });
    expect(f.받은키).toEqual(['sk-ant-api03-k', undefined]);
    expect(r.크레딧으로).toBe(false);
    expect(알림).toMatch(/429/);
  });

  it('출력이 0 이어도 성공으로 끝났으면 다시 띄우지 않는다', async () => {
    const f = 띄우기([실행(결과줄('할 것이 없다', 0), 0)]);
    await 크레딧먼저('sk-ant-api03-k', f.띄운다, () => {});
    expect(f.받은키).toEqual(['sk-ant-api03-k']);
  });

  it('시작하자마자 크레딧이 없다는 까닭을 알림에 싣는다', async () => {
    let 알림 = '';
    const f = 띄우기([실행(결과줄('Credit balance is too low', 0)), 실행(결과줄('끝', 10), 0)]);
    await 크레딧먼저('sk-ant-api03-k', f.띄운다, (까닭) => { 알림 = 까닭; });
    expect(알림).toMatch(/Credit balance is too low/);
  });

  it('사람이 멈췄으면 다시 띄우지 않는다', async () => {
    const f = 띄우기([{ ...실행(결과줄('Credit balance is too low', 0)), 멈춤으로죽음: true }]);
    await 크레딧먼저('sk-ant-api03-k', f.띄운다, () => {});
    expect(f.받은키).toEqual(['sk-ant-api03-k']);
  });
});

// 순수 함수만 보면 배선을 지워도 초록이다 — 2026-10-09 spec-review 가 사본에서 두 곳을 지워 1027건 그대로 통과했다
describe('배선 — 돈이 지나는 마지막 자리', () => {
  const 글 = (경로: string) => readFileSync(new URL(경로, import.meta.url), 'utf8');

  it('자식 claude 의 환경은 결제환경을 거친다 — 구독 토큰과 크레딧 키가 같이 가지 않는다', () => {
    const 실행글 = 글('./authoring-run.ts');
    expect(실행글).toMatch(/크레딧먼저\(process\.env\[크레딧키이름\]/);
    expect(실행글).toMatch(/env: 결제환경\(환경, 키\)/);
  });

  it('크레딧이 도중에 떨어지면 한도 멈춤이다 — 이어하기가 구독으로 잇는다', () => {
    expect(글('./authoring-run.ts')).toMatch(/크레딧으로 && 크레딧바닥났나\(풀린\.글, 돌린것\.오류\)/);
  });

  it('호스트 uid 로 도는 명령(부품 설치 스크립트 포함)에는 크레딧 키를 안 넘긴다', () => {
    const 시작 = 글('../apps/authoring/start.sh');
    const 줄 = 시작.split('\n').find((l) => l.includes('env -u AUTHORING_AGENT_TOKEN')) ?? '';
    expect(줄.length).toBeGreaterThan(10);
    expect(줄).toContain('-u AUTHORING_CREDIT_KEY');
  });
});
