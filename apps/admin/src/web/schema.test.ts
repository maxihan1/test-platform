// 폼 자동 생성 규칙의 단위 테스트. 입력 스키마는 test_case에 실제로 들어 있는 것을 그대로 옮겼다

import { describe, expect, it } from 'vitest';

import { initialText, schemaToFields, toValues } from './schema.js';

// DEMO-004 — enum 파라미터
const ENUM_SCHEMA = {
  type: 'object',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  properties: {
    resource: {
      enum: ['albums', 'photos', 'todos'],
      type: 'string',
      default: 'albums',
      description: '조회할 자원',
    },
  },
};

// DEMO-005 — optional 파라미터. required에도 없고 default도 없다
const OPTIONAL_SCHEMA = {
  type: 'object',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  properties: {
    postId: { type: 'number', description: '댓글을 조회할 글 번호. 비워 두면 전체 댓글을 조회한다' },
  },
};

// DEMO-003 — 파라미터 3개
const THREE_SCHEMA = {
  type: 'object',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  properties: {
    body: { type: 'string', default: '명세가 곧 테스트다', minLength: 1, description: '글 본문' },
    title: { type: 'string', default: '테스트 자동화 플랫폼', minLength: 1, description: '글 제목' },
    userId: { type: 'number', default: 7, description: '작성자 번호' },
  },
};

// DEMO-003 expected — boolean
const BOOLEAN_SCHEMA = {
  type: 'object',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  properties: {
    statusCode: { type: 'number', default: 201, description: '응답 코드' },
    echoesInput: { type: 'boolean', default: true, description: '등록한 내용이 그대로 돌아오는지' },
  },
};

// DEMO-001 — params: null 로 선언한 케이스. 스캐너가 빈 객체 스키마로 기록한다 (SPEC §4)
const EMPTY_SCHEMA = { type: 'object', properties: {} };

// 값을 반드시 채워야 하는 칸. 데모에는 없지만 K4가 허용하는 모양이다
const REQUIRED_SCHEMA = {
  type: 'object',
  properties: { username: { type: 'string', minLength: 1, description: '아이디' } },
  required: ['username'],
};

describe('schemaToFields', () => {
  it('enum은 셀렉트가 되고 선택지를 그대로 갖는다', () => {
    const [field] = schemaToFields(ENUM_SCHEMA);
    expect(field).toMatchObject({
      key: 'resource',
      label: '조회할 자원',
      kind: 'enum',
      options: ['albums', 'photos', 'todos'],
      optional: false,
    });
  });

  it('boolean은 토글이 된다', () => {
    const field = schemaToFields(BOOLEAN_SCHEMA).find((f) => f.key === 'echoesInput');
    expect(field).toMatchObject({ kind: 'boolean', label: '등록한 내용이 그대로 돌아오는지' });
  });

  it('required에도 없고 default도 없으면 선택 입력이다', () => {
    const [field] = schemaToFields(OPTIONAL_SCHEMA);
    expect(field).toMatchObject({ key: 'postId', kind: 'number', optional: true });
  });

  it('default가 있으면 선택 입력이 아니다 — 값이 이미 정해져 있다', () => {
    for (const field of schemaToFields(THREE_SCHEMA)) {
      expect(field.optional).toBe(false);
    }
  });

  it('required에 적힌 칸은 반드시 채워야 한다', () => {
    const [field] = schemaToFields(REQUIRED_SCHEMA);
    expect(field).toMatchObject({ key: 'username', required: true, optional: false });
  });

  it('라벨은 describe 값이다. 없으면 코드의 칸 이름이라도 보여준다', () => {
    const [field] = schemaToFields({ type: 'object', properties: { raw: { type: 'string' } } });
    expect(field?.label).toBe('raw');
  });

  it('파라미터 3개는 칸 3개가 된다', () => {
    expect(schemaToFields(THREE_SCHEMA)).toHaveLength(3);
  });

  it('빈 스키마는 입력칸을 만들지 않는다', () => {
    expect(schemaToFields(EMPTY_SCHEMA)).toEqual([]);
  });

  it('스키마가 통째로 비어도 깨지지 않는다', () => {
    expect(schemaToFields({})).toEqual([]);
  });
});

describe('initialText', () => {
  it('default가 있으면 그 값으로 칸을 미리 채운다', () => {
    expect(initialText(schemaToFields(THREE_SCHEMA))).toEqual({
      body: '명세가 곧 테스트다',
      title: '테스트 자동화 플랫폼',
      userId: '7',
    });
  });

  it('default가 없으면 빈 칸이다', () => {
    expect(initialText(schemaToFields(OPTIONAL_SCHEMA))).toEqual({ postId: '' });
  });

  it('boolean의 default도 글자로 담는다', () => {
    expect(initialText(schemaToFields(BOOLEAN_SCHEMA))).toEqual({ statusCode: '201', echoesInput: 'true' });
  });
});

describe('toValues', () => {
  const three = schemaToFields(THREE_SCHEMA);

  it('숫자 칸은 숫자로 보낸다. 글자로 보내면 명세 검증이 틀린 사유를 낸다', () => {
    const values = toValues(three, { body: '본문', title: '제목', userId: '9' });
    expect(values).toEqual({ body: '본문', title: '제목', userId: 9 });
  });

  it('boolean 칸은 참·거짓으로 보낸다', () => {
    const fields = schemaToFields(BOOLEAN_SCHEMA);
    expect(toValues(fields, { statusCode: '201', echoesInput: 'false' })).toEqual({
      statusCode: 201,
      echoesInput: false,
    });
  });

  it('선택 입력을 비워 두면 칸 자체를 보내지 않는다', () => {
    expect(toValues(schemaToFields(OPTIONAL_SCHEMA), { postId: '' })).toEqual({});
  });

  it('숫자로 읽을 수 없는 글자는 글자 그대로 보낸다 — 검증기가 사유를 내야 한다', () => {
    const values = toValues(three, { body: '본문', title: '제목', userId: '아홉' });
    expect(values.userId).toBe('아홉');
  });

  it('반드시 채워야 하는 칸을 비우면 빈 글자로 보낸다 — 검증기가 사유를 낸다', () => {
    expect(toValues(schemaToFields(REQUIRED_SCHEMA), { username: '' })).toEqual({ username: '' });
  });
});
