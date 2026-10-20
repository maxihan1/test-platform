// API 애플리케이션 작성 — 집기 응답 떼기 · 점검 · 자식 환경 · 프롬프트 절 · 원장 API 줄 · 가림 목록 · 바뀐 API 만 다시 작성 (도메인/API §3.8 「작성」)

import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { 비밀번호들, 환경비밀번호들 } from './authoring-accounts.js';
import { API떼기, API반영줄, API원장읽기, API원장항목, API절, API점검, API환경, 판파일쓰기 } from './authoring-api.js';
import { 돌릴수있나, 입력만 } from './authoring-assets.js';
import { 가족, 번호찾기 } from './authoring-ledger.js';
import { 표준원장 } from './authoring-prd.js';
import type { 집은것 } from './authoring-rules.js';

const 인증 = { name: '고객사 A', tokenUrl: '/v1/oauth/token', clientId: 'a', clientSecret: 'xaw-비밀-0001' };
const 문서 = {
  openapi: '3.0.3',
  paths: {
    '/v1/pushes': { post: { summary: '푸시 보내기', responses: { '400': {}, '201': {}, '4XX': {}, default: {} } }, parameters: [] },
    '/v1/pushes/{id}': { get: { responses: { '200': {}, '404': {} } } },
  },
};
const 집은 = (더: Record<string, unknown> = {}): 집은것 =>
  ({ id: 7, kind: 'AUTHOR', target: { env: 'stg', baseUrl: 'http://127.0.0.1:3003', apiAuths: [인증] }, apiDoc: { version: 3, doc: 문서 }, ...더 }) as unknown as 집은것;

describe('API떼기', () => {
  it('판이 실린 행은 target 을 지우고 api 로 옮긴다 — target 은 역방향 표지다', () => {
    const 뗀 = API떼기(집은());
    expect(뗀.target).toBeUndefined();
    expect(뗀.api).toEqual({ env: 'stg', baseUrl: 'http://127.0.0.1:3003', 인증들: [인증], 판: 3, 문서 });
  });

  it('판 자료가 지워져 apiDoc 만 빠져도 apiAuths 로 API 행임을 알고 점검이 막는다 — 역방향으로 돌지 않고 비밀값도 가린다', () => {
    const 뗀 = API떼기(집은({ apiDoc: undefined }));
    expect(뗀.target).toBeUndefined();
    expect(API점검(뗀.api!)).toContain('판 원문');
    expect(비밀번호들(뗀)).toEqual([인증.clientSecret]);
  });

  it('판이 없는 행(화면 애플리케이션 · 역방향)은 그대로다', () => {
    const 역방향 = { id: 1, kind: 'AUTHOR', target: { env: 'qa', baseUrl: 'http://x', loginId: 'u', loginPassword: 'p' } } as unknown as 집은것;
    expect(API떼기(역방향)).toBe(역방향);
  });
});

describe('API점검', () => {
  const api = API떼기(집은()).api!;
  it('실서비스 서버 · 줄 없음 · 판 원문 없음이면 막는다', () => {
    expect(API점검(api)).toBeNull();
    expect(API점검({ ...api, isProd: true })).toContain('실서비스 서버');
    expect(API점검({ ...api, baseUrl: null })).toContain('줄이 없어졌거나');
    expect(API점검({ ...api, 판: 0 })).toContain('판 원문');
  });
});

describe('자식에게 넘기는 것', () => {
  const api = API떼기(집은()).api!;
  const 폴더 = mkdtempSync(join(tmpdir(), 'xaw-자료-'));

  it('대상 서버 · 인증 · 판 파일을 러너와 같은 이름의 환경 변수로 넘기고 판 원문을 자료 폴더에 쓴다', () => {
    expect(판파일쓰기(api, 폴더)).toBe(true);
    const 환경 = API환경(api, 폴더);
    expect(환경).toEqual({ PLATFORM_BASE_URL: 'http://127.0.0.1:3003', PLATFORM_API_AUTHS: JSON.stringify([인증]), PLATFORM_API_DOC_FILE: join(폴더, 'api-doc.json') });
    expect(JSON.parse(readFileSync(환경.PLATFORM_API_DOC_FILE!, 'utf8'))).toEqual(문서);
  });

  it('프롬프트 절은 인증 이름과 판 번호만 싣고 비밀값은 안 싣는다', () => {
    const 글 = API절(api, 폴더).join('\n');
    expect(글).toContain('「고객사 A」');
    expect(글).toContain('apiDoc: 3');
    expect(글).toContain('references/api.md');
    expect(글).not.toContain(인증.clientSecret);
  });

  it('인증 비밀값은 에이전트 · 자식 양쪽 가림 목록에 든다', () => {
    expect(비밀번호들(API떼기(집은()))).toEqual([인증.clientSecret]);
    expect(환경비밀번호들(API환경(api, 폴더))).toEqual([인증.clientSecret]);
    expect(() => 환경비밀번호들({ PLATFORM_API_AUTHS: '{' })).toThrow('PLATFORM_API_AUTHS 가 JSON 이 아니다');
  });
});

describe('자료', () => {
  it('API 문서 판 자료는 받을 파일이 아니라 빼고, 판만 있어도 돌 수 있다', () => {
    const 자료들 = 입력만([{ id: 1, position: 1, kind: 'API_DOC', name: 'API 문서 판 3', figmaUrl: null }]);
    expect(자료들).toEqual([]);
    expect(돌릴수있나({ api: true }, 자료들)).toBeNull();
    expect(돌릴수있나({}, 자료들)).toContain('자료도 기획서 본문도 없다');
  });
});

describe('원장의 API 줄', () => {
  it('API × 숫자 응답 코드마다 한 줄 — 4XX · default 는 안 든다, 코드는 작은 것부터', () => {
    expect(API원장항목(문서).map((h) => h.번호)).toEqual([
      'API POST /v1/pushes 201',
      'API POST /v1/pushes 400',
      'API GET /v1/pushes/{id} 200',
      'API GET /v1/pushes/{id} 404',
    ]);
    expect(API원장항목(문서)[0]).toMatchObject({ 자료: 'API 문서', 문장: 'POST /v1/pushes 가 201 로 응답한다 — 푸시 보내기' });
  });

  it('빈칸 · 표 칸 · 백틱이 든 경로는 덮을 수 없어 줄을 만들지 않는다', () => {
    expect(API원장항목({ paths: { '/v1/a|b': { get: { responses: { '200': {} } } }, '/v1/`c`': { get: { responses: { '200': {} } } } } })).toEqual([]);
  });

  it('표준 기획서 항목 뒤에 붙고 API 가족으로 센다 — 기획서가 비어도 원장이 선다', () => {
    const r = 표준원장([{ reqId: 'NTF-REQ-001', feature: '푸시', text: '예약 발송은 5분 뒤부터다', basis: [], status: 'CONFIRMED' }], API원장항목(문서));
    expect('항목' in r && r.항목.map((h) => h.번호)[0]).toBe('NTF-REQ-001');
    expect('가족' in r && r.가족).toEqual({ 'NTF-REQ': 1, API: 4 });
    expect('항목' in 표준원장([], API원장항목(문서))).toBe(true);
  });

  it('번호 찾기는 표 칸의 API 줄을 한 번호로 읽고 경로 속 글자를 요구 번호로 또 잡지 않는다', () => {
    expect(번호찾기('NTF-REQ-001 · API GET /v1/A-1/{id} 404, API POST /v1/pushes 201').번호들).toEqual([
      'NTF-REQ-001',
      'API GET /v1/A-1/{id} 404',
      'API POST /v1/pushes 201',
    ]);
    expect(가족('API POST /v1/pushes 201')).toBe('API');
    expect(번호찾기('API POST /v1/pushes 201 · NTF-REQ-001', false).번호들).toEqual(['NTF-REQ-001']);
  });

  it('자식의 원장 다시 만들기는 자료 폴더의 판 파일을 읽고, 깨졌으면 던진다', () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'xaw-원장-'));
    expect(API원장읽기(폴더)).toEqual([]);
    writeFileSync(join(폴더, 'api-doc.json'), JSON.stringify(문서));
    expect(API원장읽기(폴더)).toHaveLength(4);
    writeFileSync(join(폴더, 'api-doc.json'), '{');
    expect(() => API원장읽기(폴더)).toThrow('API 문서 판 파일이 JSON 이 아니다');
  });
});

describe('바뀐 API 만 다시 작성', () => {
  const apiApply = {
    fromVersion: 2,
    toVersion: 3,
    operations: [
      { method: 'POST', path: '/v1/pushes', change: 'CHANGED', breaking: true, notes: ['응답 409 가 없어졌다'], tcIds: ['NTF-FN-001'] },
      { method: 'DELETE', path: '/v1/old', change: 'REMOVED', breaking: true, notes: ['API 가 없어졌다'], tcIds: ['NTF-FN-007', 'NTF-FN-008'] },
    ],
  };

  it('params.apiApply 를 api.반영 으로 옮기고, 사본에 맡을 API 마다 새 판의 원장 번호를 붙여 쓴다 — 없어진 API 는 번호가 없다', () => {
    const 뗀 = API떼기(집은({ params: { apiApply } }));
    expect(뗀.api?.반영).toEqual(apiApply);
    expect(API점검(뗀.api!)).toBeNull();
    const 폴더 = mkdtempSync(join(tmpdir(), 'api-apply-'));
    expect(판파일쓰기(뗀.api!, 폴더)).toBe(true);
    const 사본 = JSON.parse(readFileSync(join(폴더, 'api-apply.json'), 'utf8')) as { 작업: { 원장번호: string[] }[] };
    expect(사본.작업.map((o) => o.원장번호)).toEqual([['API POST /v1/pushes 201', 'API POST /v1/pushes 400'], []]);
    expect(API원장읽기(폴더).map((h) => h.번호)).toEqual(['API POST /v1/pushes 201', 'API POST /v1/pushes 400']);
    expect(API절(뗀.api!, 폴더).join('\n')).toContain('--- 바뀐 API 만 다시 작성 ---');
  });

  it('PR 머리에 판 견줌과 없어진 API 케이스의 지우기 제안을 띄운다 — 보통 작성은 줄이 없다', () => {
    expect(API반영줄(API떼기(집은({ params: { apiApply } })).api)).toEqual([
      'API 문서 반영: 판 2 → 판 3 · 바뀜 1 · 새 API 0 · 없어진 API 1',
      '지우기 제안 — DELETE /v1/old 가 없어졌다: NTF-FN-007 · NTF-FN-008',
    ]);
    expect(API반영줄(API떼기(집은()).api)).toEqual([]);
    expect(API절(API떼기(집은()).api!, '/자료').join('\n')).not.toContain('바뀐 API 만 다시 작성');
  });

  it('칸 모양이 틀리거나 새 판이 자료의 판과 다르면 자식을 띄우기 전에 막는다', () => {
    expect(API점검(API떼기(집은({ params: { apiApply: { ...apiApply, operations: [] } } })).api!)).toContain('모양이 틀렸다');
    expect(API점검(API떼기(집은({ params: { apiApply: { ...apiApply, operations: [{ method: 'POST' }] } } })).api!)).toContain('모양이 틀렸다');
    expect(API점검(API떼기(집은({ params: { apiApply: { ...apiApply, toVersion: 4 } } })).api!)).toContain('다르다');
  });
});
