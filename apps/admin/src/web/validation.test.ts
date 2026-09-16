// 칸 아래에 붙일 사유를 만드는 규칙. 판정 문장 자체는 서버(execution/validate.ts)가 낸다

import { describe, expect, it } from 'vitest';

import { schemaToFields, toValues } from './schema.js';
import { fieldErrors, messagesByKey } from './validation.js';

const THREE_SCHEMA = {
  type: 'object',
  properties: {
    body: { type: 'string', default: '명세가 곧 테스트다', minLength: 1, description: '글 본문' },
    title: { type: 'string', default: '테스트 자동화 플랫폼', minLength: 1, description: '글 제목' },
    userId: { type: 'number', default: 7, description: '작성자 번호' },
  },
};

describe('fieldErrors', () => {
  const fields = schemaToFields(THREE_SCHEMA);

  it('제대로 채운 값에는 사유가 없다', () => {
    const values = toValues(fields, { body: '본문', title: '제목', userId: '9' });
    expect(fieldErrors(THREE_SCHEMA, values)).toEqual({});
  });

  it('숫자 칸에 글자를 넣으면 그 칸 이름으로 사유가 붙는다', () => {
    const values = toValues(fields, { body: '본문', title: '제목', userId: '아홉' });
    expect(fieldErrors(THREE_SCHEMA, values)).toEqual({ userId: '작성자 번호(userId)은 숫자여야 한다' });
  });

  it('비워 둘 수 없는 칸을 비우면 그 칸에 사유가 붙는다', () => {
    const values = toValues(fields, { body: '', title: '제목', userId: '9' });
    expect(fieldErrors(THREE_SCHEMA, values).body).toBe('글 본문(body)은 비워 둘 수 없다');
  });
});

describe('messagesByKey', () => {
  it('한 칸에 사유가 여럿이면 처음 것만 남는다', () => {
    const messages = messagesByKey([
      { path: 'title', message: '먼저 온 사유' },
      { path: 'title', message: '나중에 온 사유' },
    ]);
    expect(messages).toEqual({ title: '먼저 온 사유' });
  });
});
