// @vitest-environment jsdom
// 새 작성 서랍 — 파일 · 피그마 주소 · 시작 주소를 넣었으면 화면을 떠나기 전에 묻는다 (공통/5-화면공통 §8 「저장 안 한 내용이 있으면 떠나기 전에 묻는다」)
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthoringNew } from './AuthoringNew.js';
import { 주소로간다, 주소보기, 주소에선다 } from './keepState.fixture.js';

function 그리기() {
  주소에선다('#/authoring');
  render(
    <>
      <주소보기 />
      <AuthoringNew service="PAY" envs={[{ env: 'qa', baseUrl: 'https://qa.example.com' }]} on넣었다={() => {}} />
    </>,
  );
}

afterEach(cleanup);

describe('새 작성 서랍 떠나기 묻기', () => {
  it('아무것도 안 넣었으면 그냥 간다', async () => {
    그리기();
    await 주소로간다('#/cases');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('hash').textContent).toBe('#/cases');
  });

  it('피그마 주소를 적었으면 묻고 주소는 그대로다', async () => {
    그리기();
    fireEvent.change(screen.getByLabelText('피그마 주소'), { target: { value: 'https://www.figma.com/design/AbC/x' } });
    await 주소로간다('#/cases');
    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    expect(screen.getByTestId('hash').textContent).toBe('#/authoring');
  });

  it('파일을 넣었으면 묻고, 제거하면 묻지 않는다', async () => {
    그리기();
    fireEvent.change(screen.getByLabelText('PRD'), { target: { files: [new File(['x'], '기획서.pdf')] } });
    await 주소로간다('#/cases');
    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '머무르기' }));
    fireEvent.click(screen.getByRole('button', { name: '기획서.pdf 제거' }));
    await 주소로간다('#/cases');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('hash').textContent).toBe('#/cases');
  });
});
