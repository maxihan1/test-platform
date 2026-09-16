// 저장된 입력값이 케이스 명세(param_schema)와 맞는지 검사하는지 본다.
// 어긋난 칸과 사람이 읽을 사유가 같이 나와야 화면이 칸 아래에 이유를 붙일 수 있다 (SPEC §8.2)

import { describe, expect, it } from 'vitest';

import type { JsonSchema } from '@platform/kit';

import { validate } from './validate.js';

const 빈스키마: JsonSchema = { type: 'object', properties: {} };

// 데모 케이스가 실제로 들고 있는 모양 그대로다 (zod 4의 z.toJSONSchema(schema, { io: 'input' }) 출력)
const 글쓰기스키마: JsonSchema = {
  type: 'object',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  properties: {
    title: { type: 'string', default: '테스트 자동화 플랫폼', minLength: 1, description: '글 제목' },
    userId: { type: 'number', default: 7, description: '작성자 번호' },
  },
};

const 자원스키마: JsonSchema = {
  type: 'object',
  properties: {
    resource: { enum: ['albums', 'photos', 'todos'], type: 'string', description: '조회할 자원' },
  },
};

describe('validate', () => {
  it('입력값이 없는 케이스에 빈 값을 주면 통과한다', () => {
    expect(validate(빈스키마, {})).toEqual([]);
  });

  it('선언한 대로 채우면 통과한다', () => {
    expect(validate(글쓰기스키마, { title: '제목', userId: 7 })).toEqual([]);
  });

  it('기본값이 있는 칸은 비워도 통과한다', () => {
    expect(validate(글쓰기스키마, {})).toEqual([]);
  });

  it('타입이 다르면 라벨과 함께 사유를 돌려준다', () => {
    const 위반 = validate(글쓰기스키마, { userId: '일곱' });
    expect(위반).toHaveLength(1);
    expect(위반[0]?.path).toBe('userId');
    expect(위반[0]?.message).toContain('작성자 번호');
    expect(위반[0]?.message).toContain('숫자');
  });

  it('고르게 되어 있는 값 밖을 넣으면 고를 수 있는 값을 알려준다', () => {
    const 위반 = validate(자원스키마, { resource: 'comments' });
    expect(위반).toHaveLength(1);
    expect(위반[0]?.path).toBe('resource');
    expect(위반[0]?.message).toContain('albums');
  });

  it('반드시 채워야 하는 칸이 비면 사유를 돌려준다', () => {
    const 스키마: JsonSchema = {
      type: 'object',
      properties: { username: { type: 'string', description: '아이디' } },
      required: ['username'],
    };
    const 위반 = validate(스키마, {});
    expect(위반).toHaveLength(1);
    expect(위반[0]?.path).toBe('username');
    expect(위반[0]?.message).toContain('아이디');
  });

  it('빈 문자열을 막아 둔 칸은 빈 문자열을 거른다', () => {
    const 위반 = validate(글쓰기스키마, { title: '' });
    expect(위반).toHaveLength(1);
    expect(위반[0]?.path).toBe('title');
  });

  it('선언에 없는 칸은 오타로 보고 걸러낸다', () => {
    const 위반 = validate(글쓰기스키마, { titel: '제목' });
    expect(위반).toHaveLength(1);
    expect(위반[0]?.path).toBe('titel');
  });

  it('여러 칸이 한꺼번에 틀리면 전부 돌려준다', () => {
    const 위반 = validate(글쓰기스키마, { title: '', userId: '일곱' });
    expect(위반.map((v) => v.path).sort()).toEqual(['title', 'userId']);
  });

  it('값이 객체가 아니면 그것부터 알린다', () => {
    const 위반 = validate(글쓰기스키마, '문자열');
    expect(위반).toHaveLength(1);
    expect(위반[0]?.path).toBe('');
  });

  it('검사기가 모르는 모양은 통과시킨다', () => {
    const 스키마: JsonSchema = {
      type: 'object',
      properties: { tags: { type: 'array', items: { type: 'string' }, description: '꼬리표' } },
    };
    expect(validate(스키마, { tags: ['가', '나'] })).toEqual([]);
  });
});
