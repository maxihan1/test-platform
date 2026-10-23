// 게임 항목이 부른 대상 서버 API 를 결과 줄 apiCalls 로 모으는 규칙과 절차 기록의 메서드를 검사한다. 실행 문맥만 흉내 낸다

import type { APIRequestContext, APIResponse } from '@playwright/test';
import { describe, expect, it } from 'vitest';

import type { ApiCallSeen } from '../types.js';

import { runScope, stepScope, type RunScope, type StepScope } from './context.js';
import { 부른API를적는다, traced } from './http.js';

const 실행 = (apiCalls?: ApiCallSeen[]): RunScope => ({
  seq: 0,
  failed: false,
  stopped: false,
  capture: async () => undefined,
  emit: async () => {},
  ...(apiCalls === undefined ? {} : { apiCalls }),
});

const base = 'https://ash.example.com';

describe('부른API를적는다', () => {
  it('같은 origin 만 물음표 뒤 없이, 번호 칸은 틀로 접어 (방식 · 경로 · 코드)마다 한 줄로 모은다', () => {
    const 모음: ApiCallSeen[] = [];
    runScope.run(실행(모음), () => {
      부른API를적는다('post', '/gacha/12/draw?token=x', 200, base);
      부른API를적는다('POST', 'https://ash.example.com/gacha/13/draw', 200, base);
      부른API를적는다('GET', '/users/0f8fad5b-d9cb-469f-a165-70867728950e', 404, base);
      부른API를적는다('GET', 'https://ads.example.net/pixel', 200, base);
    });
    expect(모음).toEqual([
      { method: 'POST', path: '/gacha/:n/draw', status: 200 },
      { method: 'GET', path: '/users/:id', status: 404 },
    ]);
  });

  it('게임 항목이 아니면(모음이 없으면) 아무것도 안 남긴다', () => {
    const run = 실행();
    runScope.run(run, () => 부른API를적는다('GET', '/admin/forced', 200, base));
    expect(run.apiCalls).toBeUndefined();
  });
});

describe('traced', () => {
  const 응답 = { status: () => 200, text: async () => '{}' } as unknown as APIResponse;
  const 도구 = { fetch: async () => 응답 } as unknown as APIRequestContext;

  it('request.fetch() 는 절차 기록에 options.method 로 남는다 · 없으면 GET', async () => {
    const 기록: StepScope[] = [{ assertions: [] }, { assertions: [] }];
    await stepScope.run(기록[0]!, () => traced(도구, new Set()).fetch('/v2/orders', { method: 'post' }));
    await stepScope.run(기록[1]!, () => traced(도구, new Set()).fetch('/v2/orders'));
    expect(기록.map((s) => (s.httpTrace?.request as { method: string }).method)).toEqual(['POST', 'GET']);
  });
});
