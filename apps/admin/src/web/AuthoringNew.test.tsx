// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthoringNew } from './AuthoringNew.js';

const 부름: { service: string; body: { kind: string; specText: string } }[] = [];
let 답: Promise<{ id: number }> = Promise.resolve({ id: 1 });

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      createAuthoringRequest: (service: string, body: { kind: string; specText: string }) => {
        부름.push({ service, body });
        return 답;
      },
    },
  };
});

beforeEach(() => {
  부름.length = 0;
  답 = Promise.resolve({ id: 1 });
});

afterEach(() => {
  cleanup();
});

describe('새 작성 요청', () => {
  it('기획서를 안 적고 보내면 서버를 안 부른다', () => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '보내기' }));
    expect(부름).toHaveLength(0);
  });

  it('기획서를 적고 보내면 그 본문이 그대로 간다. 경로가 아니라 본문이다', async () => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '할 일을 추가할 수 있다' } });
    fireEvent.click(screen.getByRole('button', { name: '보내기' }));

    await waitFor(() => expect(부름).toHaveLength(1));
    expect(부름[0]?.service).toBe('PAY');
    expect(부름[0]?.body.specText).toBe('할 일을 추가할 수 있다');
    expect(부름[0]?.body.kind).toBe('AUTHOR');
  });

  it('보내는 동안 버튼이 꺼진다. 두 번 누르면 줄이 둘 선다', async () => {
    let 풀기: (값: { id: number }) => void = () => {};
    답 = new Promise((resolve) => {
      풀기 = resolve;
    });

    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '기획서' } });
    fireEvent.click(screen.getByRole('button', { name: '보내기' }));

    await waitFor(() => expect(screen.getByRole('button', { name: '보내는 중' })).toBeTruthy());
    풀기({ id: 1 });
  });
});
