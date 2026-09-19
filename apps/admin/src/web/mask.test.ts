import { describe, expect, it } from 'vitest';

import { fieldsOf, 가려야하나 } from './mask.js';

describe('비밀값 가리기', () => {
  it('secret 표시가 붙은 칸은 가린다', () => {
    expect(가려야하나('무엇이든', { secret: true })).toBe(true);
  });

  it('표시가 없어도 칸 이름이 비밀값이면 가린다. 모르면 보여주는 쪽으로 실패하면 안 된다', () => {
    expect(가려야하나('password', {})).toBe(true);
    expect(가려야하나('userPassword', {})).toBe(true);
    expect(가려야하나('TOKEN', {})).toBe(true);
    expect(가려야하나('apiKey', {})).toBe(true);
    expect(가려야하나('credential', {})).toBe(true);
  });

  it('비밀값이 아닌 칸은 그대로 둔다', () => {
    expect(가려야하나('아이디', {})).toBe(false);
    expect(가려야하나('userId', {})).toBe(false);
  });

  it('라벨은 박제된 스키마의 description 에서 온다', () => {
    const fields = fieldsOf(
      { 아이디: 'tester' },
      { type: 'object', properties: { 아이디: { type: 'string', description: '작성자 아이디' } } },
    );
    expect(fields).toEqual([{ key: '아이디', label: '작성자 아이디', value: 'tester', secret: false }]);
  });

  it('비밀값 칸의 값은 여덟 개의 별로 바뀐다', () => {
    const fields = fieldsOf(
      { password: 'hunter2' },
      { type: 'object', properties: { password: { type: 'string', description: '비밀번호', secret: true } } },
    );
    expect(fields[0]?.value).toBe('********');
    expect(fields[0]?.secret).toBe(true);
  });

  it('박제 이전 행은 스키마가 비어 있다. 그래도 이름으로 가린다', () => {
    const fields = fieldsOf({ 아이디: 'tester', password: 'hunter2' }, {});
    expect(fields.find((f) => f.key === 'password')?.value).toBe('********');
    expect(fields.find((f) => f.key === '아이디')?.value).toBe('tester');
  });

  it('스키마에 라벨이 없으면 칸 이름을 그대로 쓴다', () => {
    const fields = fieldsOf({ 아이디: 'tester' }, {});
    expect(fields[0]?.label).toBe('아이디');
  });

  it('참·거짓은 사람이 읽는 두 낱말로 바꾼다', () => {
    const fields = fieldsOf({ 활성: true, 비활성: false }, {});
    expect(fields[0]?.value).toBe('예');
    expect(fields[1]?.value).toBe('아니오');
  });

  it('값이 없으면 줄표를 쓴다', () => {
    const fields = fieldsOf({ 없음: null }, {});
    expect(fields[0]?.value).toBe('—');
  });

  it('입력값이 없으면 칸도 없다', () => {
    expect(fieldsOf({}, {})).toEqual([]);
  });
});
