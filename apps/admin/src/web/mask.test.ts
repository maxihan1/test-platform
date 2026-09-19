import { describe, expect, it } from 'vitest';

import { fieldsOf, 가려야하나, 한줄로 } from './mask.js';

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

describe('어떤 값으로 돌렸는지 한 줄 (SPEC §8.3)', () => {
  it('라벨과 값을 붙여 가운뎃점으로 잇는다', () => {
    const 줄 = 한줄로(
      { 아이디: 'tester', 코드: 200 },
      { properties: { 아이디: { description: '아이디' }, 코드: { description: '응답 코드' } } },
    );
    expect(줄).toBe('아이디 tester · 응답 코드 200');
  });

  it('비밀값은 가린 채로 나간다', () => {
    expect(한줄로({ password: 'hunter2' }, {})).toBe('password ********');
  });

  it('입력이 없으면 빈 글자다. 「입력 없음」을 모든 행에 적으면 목록이 시끄럽다', () => {
    expect(한줄로({}, {})).toBe('');
    expect(한줄로(null, {})).toBe('');
  });

  it('길면 뒤를 …로 자른다. 전부는 상세에서 본다', () => {
    const 값: Record<string, string> = {};
    for (let i = 0; i < 20; i += 1) 값[`칸${String(i)}`] = '아주아주아주긴값';
    const 줄 = 한줄로(값, {});
    expect(줄.length).toBeLessThanOrEqual(80);
    expect(줄.endsWith('…')).toBe(true);
  });

  it('딱 맞는 길이는 자르지 않는다', () => {
    const 줄 = 한줄로({ 아이디: 'tester' }, {});
    expect(줄.endsWith('…')).toBe(false);
  });
});
