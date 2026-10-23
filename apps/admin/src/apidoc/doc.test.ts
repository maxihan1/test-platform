// API 문서 읽기 · 지문 · 판 비교 · 커버리지 틀 검사 (도메인/API §3.8 · §7)

import { describe, expect, it } from 'vitest';

import { 문서읽기, 지문, 커버리지틀, 판비교 } from './doc.js';

const 판1 = {
  openapi: '3.1.0',
  components: {
    schemas: {
      Push: {
        type: 'object',
        required: ['id', 'status'],
        properties: { id: { type: 'string' }, status: { type: 'string', enum: ['QUEUED', 'SENT'] }, total: { type: 'integer' } },
      },
    },
  },
  paths: {
    '/v1/pushes': {
      post: {
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', required: ['title'], properties: { title: { type: 'string' } } } } },
        },
        responses: {
          '201': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Push' } } } },
          '400': { description: '틀림' },
          '4XX': { description: '그 밖' },
        },
      },
    },
    '/v1/pushes/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: { responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/Push' } } } }, '404': {} } },
      delete: { responses: { '204': {} } },
    },
  },
};

const 복사 = <T>(v: T): T => structuredClone(v);

describe('문서읽기', () => {
  it('OpenAPI 3.x JSON 만 받는다', () => {
    expect(문서읽기(JSON.stringify(판1))).toEqual({ 문서: 판1 });
    expect(문서읽기('openapi: 3.0.0')).toEqual({ reason: 'JSON 이 아닙니다 — YAML 은 받지 않습니다' });
    expect(문서읽기('[]')).toEqual({ reason: 'JSON 객체가 아닙니다' });
    expect(문서읽기('{"swagger":"2.0"}')).toEqual({ reason: 'Swagger 2.0 문서입니다 — OpenAPI 3 으로 변환해서 올려 주세요' });
    expect(문서읽기('{"openapi":"4.0"}')).toEqual({ reason: '최상위 openapi 가 3. 으로 시작하지 않습니다' });
  });

  // jsonb 가 거절하는 글자다. 안 바꾸면 저장에서 터져 500 이 된다 (FIX-F2-02 · L5)
  it('NUL 과 짝 없는 서로게이트는 키 · 값 모두 U+FFFD 로 바꿔 받는다', () => {
    expect(문서읽기('{"openapi":"3.0.0","info":{"title":"a\\u0000b","x-\\ud800":["\\udc00😀","\\ud83d\\ud83d\\ude00"]}}')).toEqual({
      문서: { openapi: '3.0.0', info: { title: 'a�b', 'x-�': ['�😀', '�😀'] } },
    });
  });
});

describe('지문', () => {
  it('키 차례 · 들여쓰기만 다른 문서는 같은 지문이다', () => {
    const 뒤집은것 = JSON.parse(JSON.stringify({ paths: 판1.paths, components: 판1.components, openapi: '3.1.0' }, null, 4));
    expect(지문(뒤집은것)).toBe(지문(판1));
    expect(지문({ ...판1, openapi: '3.0.3' })).not.toBe(지문(판1));
  });
});

describe('커버리지틀', () => {
  it('숫자 응답 코드만 세고 모양이 없는 코드를 표시한다', () => {
    expect(커버리지틀(판1)).toEqual([
      { method: 'POST', path: '/v1/pushes', codes: [{ status: 201, noShape: false }, { status: 400, noShape: true }] },
      { method: 'GET', path: '/v1/pushes/{id}', codes: [{ status: 200, noShape: false }, { status: 404, noShape: true }] },
      { method: 'DELETE', path: '/v1/pushes/{id}', codes: [{ status: 204, noShape: true }] },
    ]);
  });
});

describe('판비교', () => {
  it('같은 판이면 바뀐 것이 없다', () => {
    expect(판비교(판1, 복사(판1))).toEqual([]);
  });

  it('새 API · 없어진 API 를 가른다 — 없어짐은 깨는 변경이다', () => {
    const 판2 = 복사(판1) as typeof 판1 & { paths: Record<string, unknown> };
    delete (판2.paths['/v1/pushes/{id}'] as Record<string, unknown>).delete;
    판2.paths['/v1/devices'] = { post: { responses: { '201': {} } } };
    expect(판비교(판1, 판2)).toEqual([
      { method: 'DELETE', path: '/v1/pushes/{id}', change: 'REMOVED', breaking: true, notes: ['API 삭제'] },
      { method: 'POST', path: '/v1/devices', change: 'NEW', breaking: false, notes: [] },
    ]);
  });

  it('참조한 스키마에서 응답 칸이 빠지면 그 스키마를 쓰는 API 마다 깨는 변경이다', () => {
    const 판2 = 복사(판1);
    판2.components.schemas.Push.required = ['id'];
    delete (판2.components.schemas.Push.properties as Record<string, unknown>).status;
    const 결과 = 판비교(판1, 판2);
    expect(결과.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /v1/pushes/{id}', 'POST /v1/pushes']);
    expect(결과[1]).toEqual({
      method: 'POST',
      path: '/v1/pushes',
      change: 'CHANGED',
      breaking: true,
      notes: ['응답 201 필드 status 삭제'],
    });
  });

  it('요청 필수 칸이 생기거나 형이 바뀌면 깨고, 칸 · 응답이 더 생기기만 하면 안 깬다', () => {
    const 판2 = 복사(판1);
    const 본문 = 판2.paths['/v1/pushes'].post.requestBody.content['application/json'].schema as {
      required: string[];
      properties: Record<string, unknown>;
    };
    본문.required = ['title', 'deviceId'];
    본문.properties.deviceId = { type: 'string' };
    판2.components.schemas.Push.properties.total = { type: 'string' };
    (판2.paths['/v1/pushes'].post.responses as Record<string, unknown>)['409'] = {};
    expect(판비교(판1, 판2).find((r) => r.path === '/v1/pushes')).toEqual({
      method: 'POST',
      path: '/v1/pushes',
      change: 'CHANGED',
      breaking: true,
      notes: ['요청 필수 필드 deviceId 추가', '응답 201 필드 total 타입 변경 (integer → string)', '응답 409 추가'],
    });

    const 판3 = 복사(판1);
    (판3.paths['/v1/pushes/{id}'].get.responses as Record<string, unknown>)['410'] = {};
    expect(판비교(판1, 판3)).toEqual([
      { method: 'GET', path: '/v1/pushes/{id}', change: 'CHANGED', breaking: false, notes: ['응답 410 추가'] },
    ]);
  });

  it('응답 코드가 없어지면 깨는 변경이고 세부 규칙만 바뀌면 그렇게 적는다 — 설명 글만 바뀐 것은 안 싣는다', () => {
    const 판2 = 복사(판1) as typeof 판1 & { paths: Record<string, Record<string, Record<string, unknown>>> };
    delete (판2.paths['/v1/pushes/{id}'].get.responses as Record<string, unknown>)['404'];
    (판2.paths['/v1/pushes/{id}'].delete as Record<string, unknown>).summary = '푸시 지우기';
    const 제목 = 판2.paths['/v1/pushes'].post.requestBody as { content: Record<string, { schema: { properties: { title: object } } }> };
    제목.content['application/json']!.schema.properties.title = { type: 'string', maxLength: 100 };
    expect(판비교(판1, 판2)).toEqual([
      { method: 'GET', path: '/v1/pushes/{id}', change: 'CHANGED', breaking: true, notes: ['응답 404 삭제'] },
      { method: 'POST', path: '/v1/pushes', change: 'CHANGED', breaking: false, notes: ['설명이나 세부 규칙 변경'] },
    ]);
  });

  it('같은 스키마를 겹겹이 가리키는 문서도 거듭제곱으로 불지 않고 끝난다', () => {
    const schemas: Record<string, unknown> = { S7: { type: 'string' } };
    for (let i = 0; i < 7; i++) {
      schemas[`S${String(i)}`] = {
        type: 'object',
        properties: Object.fromEntries(Array.from({ length: 8 }, (_, k) => [`p${String(k)}`, { $ref: `#/components/schemas/S${String(i + 1)}` }])),
      };
    }
    const 큰문서 = {
      openapi: '3.1.0',
      components: { schemas },
      paths: { '/x': { get: { responses: { '200': { content: { 'application/json': { schema: { $ref: '#/components/schemas/S0' } } } } } } } },
    };
    const 시작 = Date.now();
    expect(판비교(큰문서, 복사(큰문서))).toEqual([]);
    expect(Date.now() - 시작).toBeLessThan(3000);
  });

  it('돌고 도는 참조에서 멈춘다', () => {
    const 판2 = 복사(판1) as typeof 판1 & { components: { schemas: Record<string, unknown> } };
    판2.components.schemas.Node = { type: 'object', properties: { child: { $ref: '#/components/schemas/Node' } } };
    판2.paths['/v1/pushes/{id}'].get.responses['200'] = { content: { 'application/json': { schema: { $ref: '#/components/schemas/Node' } } } };
    expect(판비교(판1, 판2)[0]?.breaking).toBe(true);
  });
});
