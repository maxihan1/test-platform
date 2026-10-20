// 응답 모양 확인 — 틀 찾기 · 응답 코드 고르기 · 업계 관례 판정 · 문서 안 참조를 본다 (SPEC 도메인/API §3.8 「응답 모양 확인」)

import { describe, expect, it } from 'vitest';

import { 모양확인 } from './apiShape.js';

const 푸시 = {
  type: 'object',
  required: ['id', 'status'],
  properties: {
    id: { type: 'string' },
    status: { type: 'string', enum: ['QUEUED', 'SENT'] },
    total: { type: 'integer' },
  },
};

const 문서 = {
  openapi: '3.1.0',
  paths: {
    '/v1/pushes': {
      post: {
        responses: {
          '201': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Push' } } } },
          '4XX': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/v1/pushes/{id}': {
      get: {
        responses: {
          '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Push' } } } },
          '404': { description: '없음' },
          default: { $ref: '#/components/responses/Problem' },
        },
      },
    },
    '/v1/pushes/batch': {
      get: { responses: { '200': { content: { 'application/json': { schema: { type: 'array', items: { type: 'string' } } } } } } },
    },
    '/v1/devices': {
      get: {
        responses: {
          '200': {
            content: {
              'application/json; charset=utf-8': {
                schema: { type: 'object', properties: { name: { type: 'string' } }, additionalProperties: false },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Push: 푸시,
      Error: { type: 'object', required: ['code'], properties: { code: { type: 'string' } } },
    },
    responses: {
      Problem: { content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
  },
};

const 본문 = (v: unknown) => JSON.stringify(v);

describe('모양확인', () => {
  it('모양이 맞으면 PASS — 문서에 없는 추가 칸은 통과한다', () => {
    expect(모양확인(문서, 'post', '/v1/pushes', 201, 본문({ id: 'p1', status: 'QUEUED', extra: true }))).toEqual({
      method: 'POST',
      path: '/v1/pushes',
      status: 201,
      result: 'PASS',
    });
  });

  it('필수 칸 빠짐 · 형 다름 · enum 밖 값은 FAIL 과 사람 말 문제', () => {
    const 결과 = 모양확인(문서, 'POST', 'http://stg.example.com/v1/pushes', 201, 본문({ status: 'DONE', total: '3' }));
    expect(결과?.result).toBe('FAIL');
    expect(결과?.problems).toEqual([
      '필수 필드 없음 — id',
      '문서에 없는 값 — status = \"DONE\"',
      '타입이 다름 — total (문서 number · 받은 값 string)',
    ]);
  });

  it('문서에 없는 응답 코드는 FAIL', () => {
    expect(모양확인(문서, 'GET', '/v1/pushes/batch', 418, '')).toMatchObject({ result: 'FAIL', problems: ['문서에 없는 응답 코드 418'] });
  });

  it('4XX 범위 줄과 default 줄을 차례로 찾는다 — 참조로 적은 응답 줄도 푼다', () => {
    expect(모양확인(문서, 'POST', '/v1/pushes', 400, 본문({ code: 'BAD' }))?.result).toBe('PASS');
    expect(모양확인(문서, 'POST', '/v1/pushes', 400, 본문({}))?.problems).toEqual(['필수 필드 없음 — code']);
    expect(모양확인(문서, 'GET', '/v1/pushes/p1', 500, 본문({}))?.problems).toEqual(['필수 필드 없음 — code']);
  });

  it('그 코드에 모양이 없으면 NO_SHAPE — 본문은 안 본다', () => {
    expect(모양확인(문서, 'GET', '/v1/pushes/p1', 404, 'not json')).toEqual({ method: 'GET', path: '/v1/pushes/{id}', status: 404, result: 'NO_SHAPE' });
  });

  it('모양이 있는데 본문이 JSON 이 아니면 FAIL', () => {
    expect(모양확인(문서, 'GET', '/v1/pushes/p1', 200, '<html>')?.problems).toEqual(['JSON 이 아닙니다']);
  });

  it('문서에 없는 경로 · 메서드는 견주지 않는다', () => {
    expect(모양확인(문서, 'POST', '/v1/oauth/token', 200, '{}')).toBeUndefined();
    expect(모양확인(문서, 'DELETE', '/v1/pushes/p1', 204, '')).toBeUndefined();
  });

  it('글자 마디가 많은 틀이 이긴다 — 질의 · 끝 빗금은 뺀다', () => {
    expect(모양확인(문서, 'GET', '/v1/pushes/batch/?page=2', 200, 본문(['a']))?.path).toBe('/v1/pushes/batch');
    expect(모양확인(문서, 'GET', '/v1/pushes/p9', 200, 본문({ id: 'p9', status: 'SENT' }))?.path).toBe('/v1/pushes/{id}');
  });

  it('문서가 additionalProperties: false 라고 적은 곳만 추가 칸을 막는다 · application/json 뒤 charset 도 읽는다', () => {
    expect(모양확인(문서, 'GET', '/v1/devices', 200, 본문({ name: 'a', model: 'x' }))?.problems).toEqual(['문서가 허용하지 않은 필드 — model (본문)']);
  });

  it('servers[0].url 에 경로가 있으면 틀 앞에 붙여 맞춘다', () => {
    const 앞붙은 = { ...문서, servers: [{ url: 'https://api.example.com/api/' }] };
    expect(모양확인(앞붙은, 'POST', '/api/v1/pushes', 201, 본문({ id: 'a', status: 'SENT' }))?.result).toBe('PASS');
    expect(모양확인(앞붙은, 'POST', '/v1/pushes', 201, '{}')).toBeUndefined();
  });

  it('OpenAPI 3.0 문서는 nullable 을 읽는다 · 배열 안 칸 경로를 적는다', () => {
    const 옛 = {
      openapi: '3.0.3',
      paths: {
        '/v1/list': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { $ref: '#/components/schemas/Row' } },
                  },
                },
              },
            },
          },
        },
      },
      components: { schemas: { Row: { type: 'object', required: ['at'], properties: { at: { type: 'string', nullable: true } } } } },
    };
    expect(모양확인(옛, 'GET', '/v1/list', 200, 본문([{ at: null }]))?.result).toBe('PASS');
    expect(모양확인(옛, 'GET', '/v1/list', 200, 본문([{ at: 'x' }, { at: 3 }]))?.problems).toEqual(['타입이 다름 — [1].at (문서 string · 받은 값 integer)']);
  });

  it('자기를 가리키는 스키마도 읽는다', () => {
    const 나무 = {
      openapi: '3.1.0',
      paths: { '/tree': { get: { responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } } } } } } },
      components: {
        schemas: { Node: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, kids: { type: 'array', items: { $ref: '#/components/schemas/Node' } } } } },
      },
    };
    expect(모양확인(나무, 'GET', '/tree', 200, 본문({ name: 'a', kids: [{ name: 'b', kids: [] }] }))?.result).toBe('PASS');
    expect(모양확인(나무, 'GET', '/tree', 200, 본문({ name: 'a', kids: [{ kids: [] }] }))?.problems).toEqual(['필수 필드 없음 — kids[0].name']);
  });

  it('문제는 많아야 5개다', () => {
    const 넓은 = {
      openapi: '3.1.0',
      paths: {
        '/x': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['a', 'b', 'c', 'd', 'e', 'f'],
                      properties: Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f'].map((k) => [k, { type: 'string' }])),
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    expect(모양확인(넓은, 'GET', '/x', 200, '{}')?.problems).toHaveLength(5);
  });

  it('enum 칸이 빠져도 필수 칸 문제로 적는다 — 던지지 않는다', () => {
    const 열거 = {
      openapi: '3.1.0',
      paths: { '/s': { get: { responses: { '200': { content: { 'application/json': { schema: { type: 'object', required: ['s'], properties: { s: { enum: ['A', 'B'] } } } } } } } } } },
    };
    expect(모양확인(열거, 'GET', '/s', 200, '{}')?.problems).toEqual(['필수 필드 없음 — s']);
  });

  it('서버 주소의 변수({port})는 채워 읽고, 못 읽는 주소면 앞을 안 붙인다', () => {
    const 변수 = { ...문서, servers: [{ url: 'http://localhost:{port}/api' }] };
    expect(모양확인(변수, 'POST', '/api/v1/pushes', 201, 본문({ id: 'a', status: 'SENT' }))?.result).toBe('PASS');
    const 못읽음 = { ...문서, servers: [{ url: 'http://[bad' }] };
    expect(모양확인(못읽음, 'POST', '/v1/pushes', 201, 본문({ id: 'a', status: 'SENT' }))?.result).toBe('PASS');
  });
});
