// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api.js';
import { AuthoringNew } from './AuthoringNew.js';

const 부름: { 무엇: string; 값: unknown }[] = [];
let 만들기답: Promise<{ id: number }> = Promise.resolve({ id: 1 });
let 올리기답: (이름: string) => Promise<{ id: number }> = () => Promise.resolve({ id: 1 });

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      createAuthoringRequest: (service: string, body: unknown) => {
        부름.push({ 무엇: '만들기', 값: { service, body } });
        return 만들기답;
      },
      uploadAuthoringAsset: (_service: string, id: number, file: File) => {
        부름.push({ 무엇: '올리기', 값: { id, 이름: file.name } });
        return 올리기답(file.name);
      },
      submitAuthoringRequest: (_service: string, id: number) => {
        부름.push({ 무엇: '세우기', 값: { id } });
        return Promise.resolve({ ok: true });
      },
    },
  };
});

beforeEach(() => {
  부름.length = 0;
  만들기답 = Promise.resolve({ id: 7 });
  올리기답 = () => Promise.resolve({ id: 1 });
});

afterEach(() => {
  cleanup();
});

function 파일을고른다(...이름들: string[]) {
  const 칸 = screen.getByLabelText('기획서 파일');
  fireEvent.change(칸, { target: { files: 이름들.map((이름) => new File(['x'], 이름)) } });
}

function 이파일들을고른다(...파일들: File[]) {
  fireEvent.change(screen.getByLabelText('기획서 파일'), { target: { files: 파일들 } });
}

function 크기를단파일(이름: string, 크기: number): File {
  const 파일 = new File(['x'], 이름);
  Object.defineProperty(파일, 'size', { value: 크기 });
  return 파일;
}

function 피그마를적는다(글: string) {
  fireEvent.change(screen.getByLabelText('피그마 주소'), { target: { value: 글 } });
}

const 보내기 = () => screen.getByRole('button', { name: '보내기' });

describe('새 작성 요청 — 자료 목록', () => {
  it('파일 둘과 피그마 한 줄이면 만들기 하나 → 올리기 둘 → 세우기 하나 순서로 부른다', async () => {
    let 넣었다 = 0;
    render(<AuthoringNew service="PAY" on넣었다={() => (넣었다 += 1)} />);
    파일을고른다('결제 기획서.pdf', '화면정의서.docx');
    피그마를적는다('https://www.figma.com/design/AbC/결제?node-id=12-34&t=xY\n\n');
    fireEvent.click(보내기());

    await waitFor(() => expect(넣었다).toBe(1));
    expect(부름.map((b) => b.무엇)).toEqual(['만들기', '올리기', '올리기', '세우기']);
    expect(부름[0]?.값).toEqual({
      service: 'PAY',
      body: { kind: 'AUTHOR', figma: ['https://www.figma.com/design/AbC/결제?node-id=12-34&t=xY'] },
    });
    expect(부름[1]?.값).toEqual({ id: 7, 이름: '결제 기획서.pdf' });
    expect(부름[2]?.값).toEqual({ id: 7, 이름: '화면정의서.docx' });
    expect(부름[3]?.값).toEqual({ id: 7 });
  });

  it('파일도 피그마 주소도 없으면 버튼이 꺼져 있다', () => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    피그마를적는다('   \n ');
    expect(보내기()).toHaveProperty('disabled', true);
    fireEvent.click(보내기());
    expect(부름).toHaveLength(0);
  });

  it('피그마 주소만 있어도 보낼 수 있다', async () => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    피그마를적는다('https://www.figma.com/design/AbC/');
    fireEvent.click(보내기());
    await waitFor(() => expect(부름.map((b) => b.무엇)).toEqual(['만들기', '세우기']));
  });

  it('보내는 동안 버튼이 꺼진다. 두 번 누르면 줄이 둘 선다', async () => {
    let 풀기: (값: { id: number }) => void = () => {};
    만들기답 = new Promise((resolve) => {
      풀기 = resolve;
    });

    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    파일을고른다('기획서.pdf');
    fireEvent.click(보내기());

    const 꺼진것 = await screen.findByRole('button', { name: '보내는 중' });
    expect(꺼진것).toHaveProperty('disabled', true);
    풀기({ id: 1 });
  });

  it('올리다 중간에 실패하면 줄에 세우지 않고 새 요청으로 다시 넣으라고 알린다', async () => {
    let 넣었다 = 0;
    올리기답 = (이름) =>
      이름 === '둘.docx' ? Promise.reject(new ApiError(413, 'Payload Too Large', '')) : Promise.resolve({ id: 1 });

    render(<AuthoringNew service="PAY" on넣었다={() => (넣었다 += 1)} />);
    파일을고른다('하나.pdf', '둘.docx', '셋.md');
    fireEvent.click(보내기());

    await screen.findByText(/이 요청은 줄에 서지 않았습니다\. 새 요청으로 다시 넣으세요/);
    expect(부름.map((b) => b.무엇)).toEqual(['만들기', '올리기', '올리기']);
    expect(screen.getByText(/둘\.docx/)).toBeTruthy();
    expect(넣었다).toBe(0);
  });

  it('받지 않는 종류를 고르면 보내기 전에 이유를 보이고 버튼을 끈다', () => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    파일을고른다('기획서.pdf', '회의록.hwp');

    expect(screen.getByText(/회의록\.hwp/)).toBeTruthy();
    expect(screen.getByText(/받지 않는 파일입니다/)).toBeTruthy();
    expect(보내기()).toHaveProperty('disabled', true);
  });

  it('받는 종류만 고를 수 있게 파일 칸이 여럿 고르기와 종류 제한을 단다', () => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    const 칸 = screen.getByLabelText('기획서 파일');
    expect(칸.getAttribute('accept')).toBe('.pdf,.docx,.doc,.md,.txt');
    expect(칸.hasAttribute('multiple')).toBe(true);
  });

  it('피그마 주소 모양이 틀리면 서버 코드 대신 사람 말로 알린다', async () => {
    만들기답 = Promise.reject(new ApiError(400, 'BAD_FIGMA_URL', 'https://www.figma.com/board/x'));
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    피그마를적는다('https://www.figma.com/board/x');
    fireEvent.click(보내기());

    await screen.findByText(/피그마 주소 모양이 다릅니다/);
    expect(부름.map((b) => b.무엇)).toEqual(['만들기']);
  });

  it.each([
    ['20MB 를 넘는 파일', () => 이파일들을고른다(크기를단파일('큰.pdf', 20 * 1024 * 1024 + 1)), /한 파일 상한/],
    ['0바이트 파일', () => 이파일들을고른다(크기를단파일('빈.pdf', 0)), /빈 파일/],
    ['이름에 따옴표가 든 파일', () => 파일을고른다('a"b.pdf'), /쓸 수 없는 글자/],
    ['이름에 ..가 든 파일', () => 파일을고른다('a..b.pdf'), /쓸 수 없는 글자/],
    [
      '파일과 피그마 줄을 합쳐 20을 넘는 것',
      () => {
        파일을고른다(...Array.from({ length: 18 }, (_, i) => `${i}.pdf`));
        피그마를적는다('https://www.figma.com/design/A/\nhttps://www.figma.com/design/B/\nhttps://www.figma.com/design/C/');
      },
      /개수를 넘었습니다/,
    ],
  ])('%s 는 보내기 전에 이유를 보이고 버튼을 끈다', (_이름, 고른다, 문구) => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    고른다();
    expect(screen.getByText(문구)).toBeTruthy();
    expect(보내기()).toHaveProperty('disabled', true);
    fireEvent.click(보내기());
    expect(부름).toHaveLength(0);
  });

  it('20MB 딱 맞는 파일과 합쳐 20개는 보낼 수 있다', () => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    이파일들을고른다(크기를단파일('딱.pdf', 20 * 1024 * 1024), ...Array.from({ length: 18 }, (_, i) => new File(['x'], `${i}.pdf`)));
    피그마를적는다('https://www.figma.com/design/A/');
    expect(보내기()).toHaveProperty('disabled', false);
  });
});
