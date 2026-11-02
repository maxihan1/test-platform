// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api.js';
import { AuthoringNew, 거절사유 } from './AuthoringNew.js';

const 부름: { 무엇: string; 값: unknown }[] = [];
let 만들기답: Promise<{ id: number }> = Promise.resolve({ id: 1 });
let 올리기답: (이름: string) => Promise<{ id: number }> = () => Promise.resolve({ id: 1 });
let 치우기답: Promise<unknown> = Promise.resolve({});
let 세우기답: Promise<unknown> = Promise.resolve({ ok: true });

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
      discardAuthoring: (_service: string, id: number) => {
        부름.push({ 무엇: '치우기', 값: { id } });
        return 치우기답;
      },
      submitAuthoringRequest: (_service: string, id: number) => {
        부름.push({ 무엇: '세우기', 값: { id } });
        return 세우기답;
      },
    },
  };
});

beforeEach(() => {
  부름.length = 0;
  만들기답 = Promise.resolve({ id: 7 });
  올리기답 = () => Promise.resolve({ id: 1 });
  치우기답 = Promise.resolve({});
  세우기답 = Promise.resolve({ ok: true });
});

afterEach(() => {
  cleanup();
});

function 파일을고른다(...이름들: string[]) {
  const 칸 = screen.getByLabelText('PRD');
  fireEvent.change(칸, { target: { files: 이름들.map((이름) => new File(['x'], 이름)) } });
}

function 이파일들을고른다(...파일들: File[]) {
  fireEvent.change(screen.getByLabelText('PRD'), { target: { files: 파일들 } });
}

function 크기를단파일(이름: string, 크기: number): File {
  const 파일 = new File(['x'], 이름);
  Object.defineProperty(파일, 'size', { value: 크기 });
  return 파일;
}

function 피그마를적는다(글: string) {
  fireEvent.change(screen.getByLabelText('피그마 주소'), { target: { value: 글 } });
}

const 보내기 = () => screen.getByRole('button', { name: '테스트 작성 시작' });

describe('새 작성 요청 — 자료 목록', () => {
  it('파일 둘과 피그마 한 줄이면 만들기 하나 → 올리기 둘 → 세우기 하나 순서로 부른다', async () => {
    let 넣었다 = 0;
    let 받은번호 = 0;
    render(
      <AuthoringNew
        service="PAY"
        on넣었다={(n) => {
          넣었다 += 1;
          받은번호 = n;
        }}
      />,
    );
    파일을고른다('결제 기획서.pdf', '화면정의서.docx');
    피그마를적는다('https://www.figma.com/design/AbC/결제?node-id=12-34&t=xY\n\n');
    fireEvent.click(보내기());

    await waitFor(() => expect(넣었다).toBe(1));
    expect(받은번호).toBe(7);
    expect(부름.map((b) => b.무엇)).toEqual(['만들기', '올리기', '올리기', '세우기']);
    expect(부름[0]?.값).toEqual({
      service: 'PAY',
      body: { kind: 'AUTHOR', figma: ['https://www.figma.com/design/AbC/결제?node-id=12-34&t=xY'] },
    });
    expect(부름[1]?.값).toEqual({ id: 7, 이름: '결제 기획서.pdf' });
    expect(부름[2]?.값).toEqual({ id: 7, 이름: '화면정의서.docx' });
    expect(부름[3]?.값).toEqual({ id: 7 });
  });

  it('보내고 나면 고른 파일 목록이 비고 같은 파일을 다시 고를 수 있다', async () => {
    let 넣었다 = 0;
    render(<AuthoringNew service="PAY" on넣었다={() => (넣었다 += 1)} />);
    파일을고른다('기획서.pdf');
    fireEvent.click(보내기());

    await waitFor(() => expect(넣었다).toBe(1));
    expect(screen.queryByText('기획서.pdf')).toBeNull();
    expect((screen.getByLabelText('PRD') as HTMLInputElement).value).toBe('');
    파일을고른다('기획서.pdf');
    expect(screen.getByText('기획서.pdf')).toBeTruthy();
  });

  it('브라우저 파일 칸은 숨기고 「파일 첨부」 단추가 그 칸을 연다', () => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    const 칸 = screen.getByLabelText('PRD') as HTMLInputElement;
    const 열기 = vi.spyOn(칸, 'click');

    expect(칸.hidden).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '파일 첨부' }));
    expect(열기).toHaveBeenCalledOnce();
  });

  it('두 번 나눠 고르면 둘 다 남고 보내는 요청에 둘 다 실린다', async () => {
    let 넣었다 = 0;
    render(<AuthoringNew service="PAY" on넣었다={() => (넣었다 += 1)} />);
    파일을고른다('결제 기획서.pdf');
    파일을고른다('화면정의서.docx');
    expect(screen.getByText('결제 기획서.pdf')).toBeTruthy();
    expect(screen.getByText('화면정의서.docx')).toBeTruthy();
    fireEvent.click(보내기());

    await waitFor(() => expect(넣었다).toBe(1));
    expect(부름.filter((b) => b.무엇 === '올리기').map((b) => (b.값 as { 이름: string }).이름)).toEqual(['결제 기획서.pdf', '화면정의서.docx']);
  });

  it('낱개 제거는 그 파일만 목록과 요청에서 뺀다', async () => {
    let 넣었다 = 0;
    render(<AuthoringNew service="PAY" on넣었다={() => (넣었다 += 1)} />);
    파일을고른다('결제 기획서.pdf', '화면정의서.docx');
    fireEvent.click(screen.getByRole('button', { name: '결제 기획서.pdf 제거' }));
    expect(screen.queryByText('결제 기획서.pdf')).toBeNull();
    expect(screen.getByText('화면정의서.docx')).toBeTruthy();
    fireEvent.click(보내기());

    await waitFor(() => expect(넣었다).toBe(1));
    expect(부름.filter((b) => b.무엇 === '올리기').map((b) => (b.값 as { 이름: string }).이름)).toEqual(['화면정의서.docx']);
  });

  it('같은 파일을 두 번 고르면 한 번만 남는다', () => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    const 파일 = new File(['x'], '결제 기획서.pdf');
    이파일들을고른다(파일);
    이파일들을고른다(파일);
    expect(screen.getAllByText('결제 기획서.pdf')).toHaveLength(1);
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

    const 꺼진것 = await screen.findByRole('button', { name: '시작하는 중…' });
    expect(꺼진것).toHaveProperty('disabled', true);
    풀기({ id: 1 });
  });

  it('올리다 중간에 실패하면 줄에 세우지 않고 그 요청을 치운 뒤 새 요청으로 다시 넣으라고 알린다 (⑫ 점검 11.6)', async () => {
    let 넣었다 = 0;
    올리기답 = (이름) =>
      이름 === '둘.docx' ? Promise.reject(new ApiError(413, 'Payload Too Large', '')) : Promise.resolve({ id: 1 });

    render(<AuthoringNew service="PAY" on넣었다={() => (넣었다 += 1)} />);
    파일을고른다('하나.pdf', '둘.docx', '셋.md');
    fireEvent.click(보내기());

    await screen.findByText(/이 요청은 대기열에 들어가지 못했습니다\. 새 요청으로 다시 넣으세요/);
    expect(부름.map((b) => b.무엇)).toEqual(['만들기', '올리기', '올리기', '치우기']);
    expect(부름.at(-1)?.값).toEqual({ id: 7 });
    expect(screen.getByText(/\(둘\.docx — /)).toBeTruthy();
    expect(screen.queryByText(/목록에 남은 그 줄은 폐기하세요/)).toBeNull();
    expect(넣었다).toBe(0);
  });

  it('줄에 세우기가 서버 막기(AUTHORING_OPEN)로 거절되면 안 섰다는 뜻이라 그 요청을 치운다', async () => {
    세우기답 = Promise.reject(new ApiError(409, 'AUTHORING_OPEN', '6101'));
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    파일을고른다('하나.pdf');
    fireEvent.click(보내기());
    expect(await screen.findByText(/반영하지 않은 테스트 작성 요청이 있습니다/)).toBeTruthy();
    expect(screen.getByText(/#6101/)).toBeTruthy();
    expect(부름.map((b) => b.무엇)).toEqual(['만들기', '올리기', '세우기', '치우기']);
  });

  it('치우기도 실패하면 남은 줄을 폐기하라고 덧붙인다 — 왜 줄이 남았는지 말한다', async () => {
    올리기답 = () => Promise.reject(new ApiError(500, 'boom', ''));
    치우기답 = Promise.reject(new ApiError(500, 'boom', ''));
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    파일을고른다('하나.pdf');
    fireEvent.click(보내기());
    expect(await screen.findByText(/목록에 남은 그 줄은 폐기하세요/)).toBeTruthy();
  });

  it('받지 않는 종류를 고르면 보내기 전에 이유를 보이고 버튼을 끈다', () => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    파일을고른다('기획서.pdf', '회의록.hwp');

    expect(screen.getByText(/ — 회의록\.hwp/)).toBeTruthy();
    expect(screen.getByText(/지원하지 않는 파일입니다/)).toBeTruthy();
    expect(보내기()).toHaveProperty('disabled', true);
  });

  it('받는 종류만 고를 수 있게 파일 칸이 여럿 고르기와 종류 제한을 단다', () => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    const 칸 = screen.getByLabelText('PRD');
    expect(칸.getAttribute('accept')).toBe('.pdf,.docx,.doc,.md,.txt,.xlsx,.csv');
    expect(칸.hasAttribute('multiple')).toBe(true);
  });

  it('피그마 주소 모양이 틀리면 서버 코드 대신 사람 말로 알린다', async () => {
    만들기답 = Promise.reject(new ApiError(400, 'BAD_FIGMA_URL', 'https://www.figma.com/board/x'));
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    피그마를적는다('https://www.figma.com/board/x');
    fireEvent.click(보내기());

    await screen.findByText(/피그마 주소 형식이 맞지 않습니다/);
    expect(부름.map((b) => b.무엇)).toEqual(['만들기']);
  });

  it.each([
    ['20MB 를 넘는 파일', () => 이파일들을고른다(크기를단파일('큰.pdf', 20 * 1024 * 1024 + 1)), /크기 상한/],
    ['0바이트 파일', () => 이파일들을고른다(크기를단파일('빈.pdf', 0)), /빈 파일/],
    ['이름에 따옴표가 든 파일', () => 파일을고른다('a"b.pdf'), /쓸 수 없는 글자/],
    ['이름에 ..가 든 파일', () => 파일을고른다('a..b.pdf'), /쓸 수 없는 글자/],
    ['점으로 시작하고 확장자가 없는 이름(.md)', () => 파일을고른다('.md'), /지원하지 않는 파일/],
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

describe('피그마를 미리 막는다 (점검 11.5)', () => {
  it('애플리케이션에 피그마 토큰이 없어도 칸은 열려 있고 비어 있으면 안내가 없다', () => {
    render(<AuthoringNew service="PAY" 운영자 피그마토큰={false} on넣었다={() => {}} />);
    expect(screen.getByLabelText('피그마 주소')).toHaveProperty('disabled', false);
    expect(screen.queryByText(/피그마 토큰/)).toBeNull();
  });

  it('토큰 없이 주소를 적으면 운영자에게는 설정 길을 안내하고 보내기를 막는다', () => {
    render(<AuthoringNew service="PAY" 운영자 피그마토큰={false} on넣었다={() => {}} />);
    파일을고른다('기획서.pdf');
    피그마를적는다('https://www.figma.com/design/A/');
    expect(screen.getByText(/피그마 토큰이 없어 피그마 주소를 받을 수 없습니다\. 설정 > 애플리케이션에서 피그마 토큰을 넣으세요/)).toBeTruthy();
    expect(보내기()).toHaveProperty('disabled', true);
    피그마를적는다('');
    expect(보내기()).toHaveProperty('disabled', false);
  });

  it('운영자가 아니면 운영자에게 요청하라고 안내한다', () => {
    render(<AuthoringNew service="PAY" 피그마토큰={false} on넣었다={() => {}} />);
    피그마를적는다('https://www.figma.com/design/A/');
    expect(screen.getByText(/관리자에게 피그마 토큰을 넣어 달라고 요청하세요/)).toBeTruthy();
  });

  it('토큰이 없어도 파일만 올리는 요청은 보낸다 — 피그마 칸은 싣지 않는다', async () => {
    render(<AuthoringNew service="PAY" 피그마토큰={false} on넣었다={() => {}} />);
    파일을고른다('기획서.pdf');
    fireEvent.click(보내기());
    await waitFor(() => expect(부름.map((b) => b.무엇)).toEqual(['만들기', '올리기', '세우기']));
    expect(부름[0]?.값).toMatchObject({ body: { figma: [] } });
  });

  it('토큰이 있으면 칸이 열려 있고 안내가 없다', () => {
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    expect(screen.getByLabelText('피그마 주소')).toHaveProperty('disabled', false);
    expect(screen.queryByText(/피그마 토큰/)).toBeNull();
  });

  it.each([
    ['NO_TOKEN', /토큰이 없어 피그마 주소를 받을 수 없습니다/],
    ['TOKEN', /토큰이 틀렸거나 만료됐거나 읽기 권한이 모자랍니다\. 관리자에게 새 피그마 토큰을 넣어 달라고 요청하세요/],
    ['FILE:https://www.figma.com/design/A/', /파일이 없거나 이 토큰으로 볼 권한이 없습니다 \(https:\/\/www\.figma\.com\/design\/A\/\)/],
  ])('서버가 %s 로 거절하면 사람 말로 알리고 줄에 안 세운다', async (까닭, 문구) => {
    만들기답 = Promise.reject(new ApiError(400, 'FIGMA_DENIED', 까닭));
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    피그마를적는다('https://www.figma.com/design/A/');
    fireEvent.click(보내기());

    await screen.findByText(문구);
    expect(부름.map((b) => b.무엇)).toEqual(['만들기']);
  });

  it('까닭 없이 FIGMA_DENIED 만 오면 빈 주소를 단 문장을 짓지 않는다', async () => {
    만들기답 = Promise.reject(new ApiError(400, 'FIGMA_DENIED', ''));
    render(<AuthoringNew service="PAY" on넣었다={() => {}} />);
    피그마를적는다('https://www.figma.com/design/A/');
    fireEvent.click(보내기());

    await waitFor(() => expect(document.querySelector('.error-text')).not.toBeNull());
    expect(screen.queryByText(/피그마 파일을 열지 못했습니다/)).toBeNull();
  });

  it('토큰이 틀린 까닭도 운영자에게는 설정 길을 안내한다', async () => {
    만들기답 = Promise.reject(new ApiError(400, 'FIGMA_DENIED', 'TOKEN'));
    render(<AuthoringNew service="PAY" 운영자 on넣었다={() => {}} />);
    피그마를적는다('https://www.figma.com/design/A/');
    fireEvent.click(보내기());

    await screen.findByText(/설정 > 애플리케이션에서 새 피그마 토큰을 넣으세요/);
  });
});

describe('보내기 전 파일 거르기', () => {
  it('작성 자료는 엑셀 · CSV 를 받고 서비스 가이드는 안 받는다', () => {
    const 파일 = (name: string) => new File(['x'], name);
    expect(거절사유(파일('확률표.xlsx'))).toBeNull();
    expect(거절사유(파일('아이템.csv'))).toBeNull();
    expect(거절사유(파일('확률표.xlsx'), true)).toBe('지원하지 않는 파일입니다. PDF · 워드 · md · txt 만 올릴 수 있습니다');
    expect(거절사유(파일('소개.md'), true)).toBeNull();
  });
});
