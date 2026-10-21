// 성능 AI 일 — 프롬프트 만들기 · 답 읽기 · 집기 → claude → 끝내기 순서 검사
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 멈춤 } from './authoring-io.js';
import { 답에서JSON, 성능일돌기, 성능일하기, 성능프롬프트, type 성능손 } from './authoring-perf.js';

afterEach(() => {
  멈춤.까닭 = null;
});

describe('성능프롬프트', () => {
  const 재료 = { 표식: '재료-표식-123' };

  it.each([
    ['DRAFT_RECORD', 'excluded', 'extract'],
    ['DRAFT_SWAGGER', 'transactions', '경로 변수'],
    ['DRAFT_FILE', 'unconverted', 'BeanShell'],
    ['SUGGEST_LOAD', 'dailyVisitors', '지어내지 않는다'],
    ['SUGGEST_TARGETS', 'ERROR_RATE', '서비스 가이드는 쓰지 않는다'],
  ])('%s 는 공통 머리 · 규칙 · 내는 모양 · 재료 JSON 을 담는다', (kind, 모양낱말, 규칙낱말) => {
    const 글 = 성능프롬프트(kind, 재료)!;
    expect(글).toContain('QA Hub 성능 테스트 도우미다. 아래 재료만 보고 JSON 객체 하나만 답한다. 설명 글 · 코드 울타리 없이.');
    expect(글).toContain(모양낱말);
    expect(글).toContain(규칙낱말);
    expect(글).toContain(JSON.stringify(재료));
  });

  it('초안 종류만 트랜잭션 모양을 적는다', () => {
    expect(성능프롬프트('DRAFT_RECORD', 재료)).toContain('Transaction = {');
    expect(성능프롬프트('SUGGEST_LOAD', 재료)).not.toContain('Transaction = {');
  });

  it('모르는 kind 는 null 이다', () => {
    expect(성능프롬프트('SUGGEST_PAGES', 재료)).toBeNull();
  });
});

describe('답에서JSON', () => {
  it('앞뒤 글과 코드 울타리를 견딘다', () => {
    expect(답에서JSON('답은 이렇다.\n```json\n{"a": {"b": 1}}\n```\n끝')).toEqual({ a: { b: 1 } });
  });

  it('깨진 JSON · 객체가 없는 글 · 배열은 null 이다', () => {
    expect(답에서JSON('{"a": ')).toBeNull();
    expect(답에서JSON('그냥 글')).toBeNull();
    expect(답에서JSON('} 거꾸로 {')).toBeNull();
  });
});

describe('성능일하기 · 성능일돌기', () => {
  const 일 = { id: 7, kind: 'SUGGEST_LOAD', input: { prd: [], guide: null } };
  const 돌림 = (칸: Partial<Awaited<ReturnType<성능손['돌린다']>>> = {}) =>
    vi.fn(async () => ({ 코드: 0, 낸것: '{"dailyVisitors": 1000}', 오류: '', 시간초과: false, 멈춤으로죽음: false, ...칸 }));

  it('claude 를 도구 없이 표준 입력 프롬프트로 부른다', async () => {
    const 돌린다 = 돌림();
    const 몸 = await 성능일하기(일, { 돌린다 } as unknown as 성능손);
    expect(몸).toEqual({ output: { dailyVisitors: 1000 } });
    const [명령, 인자, 선택] = 돌린다.mock.calls[0] as unknown as [string, string[], { input: string; 제한: number; env: Record<string, string> }];
    expect(명령).toBe('claude');
    expect(인자.slice(0, 1)).toEqual(['-p']);
    expect(인자[인자.indexOf('--output-format') + 1]).toBe('text');
    expect(인자.slice(인자.indexOf('--disallowedTools') + 1)).toContain('Bash');
    expect(선택.input).toContain('"prd":[]');
    expect(선택.제한).toBe(900_000);
    expect(선택.env.AUTHORING_AGENT_TOKEN).toBeUndefined();
  });

  it('claude 가 실패하거나 답이 깨지면 error 로 낸다', async () => {
    expect(await 성능일하기(일, { 돌린다: 돌림({ 코드: 1, 오류: '한도' }) } as unknown as 성능손)).toMatchObject({ error: expect.stringContaining('1') });
    expect(await 성능일하기(일, { 돌린다: 돌림({ 낸것: '글만' }) } as unknown as 성능손)).toMatchObject({ error: expect.stringContaining('JSON') });
    expect(await 성능일하기(일, { 돌린다: 돌림({ 시간초과: true }) } as unknown as 성능손)).toMatchObject({ error: expect.stringContaining('15분') });
  });

  it('모르는 kind 는 claude 를 부르지 않고 error 로 낸다', async () => {
    const 돌린다 = 돌림();
    expect(await 성능일하기({ ...일, kind: 'ZZZ' }, { 돌린다 } as unknown as 성능손)).toEqual({ error: '이 에이전트가 모르는 일: ZZZ' });
    expect(돌린다).not.toHaveBeenCalled();
  });

  it('고리는 집기 → claude → 끝내기 순으로 부르고, 일이 없으면 쉰다', async () => {
    const 순서: string[] = [];
    const 신호 = new AbortController();
    let 번 = 0;
    const 부른다 = vi.fn(async (_주소: string, _토큰: string, 길: string, 옵션?: { body?: unknown }) => {
      순서.push(길);
      if (길.endsWith('/claim')) return { status: 200, 몸: { job: 번++ === 0 ? 일 : null } };
      expect(옵션?.body).toEqual({ output: { dailyVisitors: 1000 } });
      return { status: 204, 몸: null };
    });
    const 돌린다 = vi.fn(async () => {
      순서.push('claude');
      return { 코드: 0, 낸것: '{"dailyVisitors": 1000}', 오류: '', 시간초과: false, 멈춤으로죽음: false };
    });
    const 쉬기 = vi.fn(async () => {
      순서.push('쉼');
      신호.abort();
    });

    await 성능일돌기('http://admin', 'tpa_x', 신호.signal, { 부른다, 돌린다, 쉬기 } as unknown as 성능손);

    expect(순서).toEqual(['/perf/ai-jobs/claim', 'claude', '/perf/ai-jobs/7/finish', '/perf/ai-jobs/claim', '쉼']);
    expect(쉬기).toHaveBeenCalledWith(5000);
  });

  it('거절이 오면 멈춤 까닭을 적고 끝낸다', async () => {
    const 부른다 = vi.fn(async () => {
      throw new Error('(403) 서버가 거절했다.');
    });
    await 성능일돌기('http://admin', 'tpa_x', undefined, { 부른다, 돌린다: vi.fn(), 쉬기: vi.fn() } as unknown as 성능손);
    expect(멈춤.까닭).toContain('서버가 거절했다');
  });
});
