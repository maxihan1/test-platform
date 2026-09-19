// @vitest-environment jsdom
// Form 한 조각의 단위 검사 — 스키마가 시킨 대로 칸을 그리는지 본다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { Form } from './Form.js';
import type { Field } from './schema.js';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다 —
// 안 걷으면 앞 검사의 칸이 document 에 남아 id 로 찾을 때 엉뚱한 것이 잡힌다
afterEach(cleanup);

const 칸들: Field[] = [
  { key: 'name', label: '이름', kind: 'text', required: true, optional: false },
  { key: 'age', label: '나이', kind: 'number', required: false, optional: true },
  {
    key: 'mode',
    label: '모드',
    kind: 'enum',
    required: true,
    optional: false,
    options: ['빠름', '느림'],
  },
  { key: 'tag', label: '태그', kind: 'enum', required: false, optional: true, options: ['갑', '을'] },
  { key: 'agree', label: '동의', kind: 'boolean', required: true, optional: false },
];

function 그리기(덮어쓸: Partial<Parameters<typeof Form>[0]> = {}) {
  return render(
    <Form
      idPrefix="p"
      fields={칸들}
      text={{}}
      errors={{}}
      onChange={() => {}}
      {...덮어쓸}
    />,
  );
}

// 라벨 글자로 칸을 찾는다 — 라벨의 for 를 타고 가므로 「묶여 있다」가 깨지면 나머지 검사도 같이 죽는다
function 라벨찾기(뿌리: HTMLElement, 이름: string): HTMLLabelElement {
  const 것 = [...뿌리.querySelectorAll('label')].find((라벨) =>
    (라벨.textContent ?? '').trim().startsWith(이름),
  );
  if (것 === undefined) throw new Error(`라벨이 없다: ${이름}`);
  return 것;
}

function 칸찾기(뿌리: HTMLElement, 이름: string): HTMLElement {
  const id = 라벨찾기(뿌리, 이름).getAttribute('for') ?? '';
  const 것 = 뿌리.querySelector(`#${id}`);
  if (것 === null) throw new Error(`칸이 없다: ${이름}`);
  return 것 as HTMLElement;
}

describe('Form', () => {
  it('칸이 없으면 선언하지 않았다고 알린다', () => {
    그리기({ fields: [] });

    expect(screen.queryByText('이 케이스는 입력값을 선언하지 않았습니다.')).not.toBeNull();
  });

  it('라벨이 for 로 칸에 묶여 있다', () => {
    const { container } = 그리기();

    const 라벨들 = [...container.querySelectorAll('label')];
    const 그린것들 = [...container.querySelectorAll('input, select')];
    expect(라벨들.length).toBe(칸들.length);
    expect(그린것들.length).toBe(칸들.length);

    라벨들.forEach((라벨, 자리) => {
      const 칸 = 그린것들[자리];
      expect(칸?.id).not.toBe('');
      expect(라벨.getAttribute('for')).toBe(칸?.id);
    });
  });

  it('idPrefix 가 다르면 같은 이름의 칸이라도 id 가 안 겹친다', () => {
    const { container } = render(
      <>
        <Form idPrefix="p" fields={칸들} text={{}} errors={{}} onChange={() => {}} />
        <Form idPrefix="e" fields={칸들} text={{}} errors={{}} onChange={() => {}} />
      </>,
    );

    const id들 = [...container.querySelectorAll('input, select')].map((칸) => 칸.id);
    expect(id들.length).toBe(칸들.length * 2);
    expect(new Set(id들).size).toBe(id들.length);

    const 앞 = id들.slice(0, 칸들.length);
    const 뒤 = id들.slice(칸들.length);
    앞.forEach((id, 자리) => expect(뒤[자리]).not.toBe(id));
  });

  it('enum 은 드롭다운이고 선택 칸이면 고르지 않음이 맨 앞이다', () => {
    const { container } = 그리기();

    const 모드 = 칸찾기(container, '모드') as HTMLSelectElement;
    expect(모드.tagName).toBe('SELECT');
    expect([...모드.options].map((것) => 것.textContent)).toEqual(['빠름', '느림']);

    const 태그 = 칸찾기(container, '태그') as HTMLSelectElement;
    expect(태그.tagName).toBe('SELECT');
    expect(태그.options[0]?.textContent).toBe('고르지 않음');
    expect(태그.options[0]?.value).toBe('');
  });

  it('boolean 은 예·아니오 두 낱말짜리 드롭다운이고 코드 낱말은 안 보인다', () => {
    const { container } = 그리기();

    const 동의 = 칸찾기(container, '동의') as HTMLSelectElement;
    expect(동의.tagName).toBe('SELECT');
    // 사람이 읽는 글자는 두 낱말, 실어 보내는 값은 코드 낱말이다
    expect([...동의.options].map((것) => 것.textContent)).toEqual(['예', '아니오']);
    expect([...동의.options].map((것) => 것.value)).toEqual(['true', 'false']);
    expect(screen.queryByText('true')).toBeNull();
    expect(screen.queryByText('false')).toBeNull();
  });

  it('optional 이면 라벨에 선택 배지가 붙는다', () => {
    const { container } = 그리기();

    expect(라벨찾기(container, '나이').textContent).toContain('선택');
    expect(라벨찾기(container, '이름').textContent ?? '').not.toContain('선택');
  });

  it('글자를 치면 그 키와 값으로 onChange 가 불린다', () => {
    const 바뀜 = vi.fn();
    const { container } = 그리기({ onChange: 바뀜 });

    fireEvent.change(칸찾기(container, '이름'), { target: { value: '홍길동' } });

    expect(바뀜).toHaveBeenCalledTimes(1);
    expect(바뀜.mock.calls[0]).toEqual(['name', '홍길동']);
  });

  it('오류는 그 칸 아래에 뜨고 아무것도 비활성화하지 않는다 (SPEC §8.2)', () => {
    const { container } = 그리기({ errors: { name: '이름을 적어 주세요' } });

    const 사유 = screen.queryByText('이름을 적어 주세요');
    expect(사유).not.toBeNull();

    const 묶음 = 칸찾기(container, '이름').closest('.field');
    expect(묶음?.lastElementChild).toBe(사유);

    expect(container.querySelectorAll('button').length).toBe(0);
    expect(container.querySelectorAll('[disabled]').length).toBe(0);
  });
});
