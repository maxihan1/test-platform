// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GuideVersionRow, ServiceGuide } from '@platform/kit';

import { ApiError } from './api.js';
import { Guide } from './Guide.js';
import { 버리기전 } from './leaveGuard.js';
import type { 판정 } from './role.js';

const { 지금, 저장, 더하기, 빼기, 글자, 기록, 옛판 } = vi.hoisted(() => ({
  지금: vi.fn((_s: string): Promise<ServiceGuide> => Promise.reject(new Error('판을 정하지 않았다'))),
  저장: vi.fn((_s: string, _base: number, _글: unknown) => Promise.resolve({ version: 4 })),
  더하기: vi.fn((_s: string, _section: string, _base: number, _file: File) => Promise.resolve({ version: 4, fileId: 13 })),
  빼기: vi.fn((_s: string, _id: number, _base: number) => Promise.resolve({ version: 4 })),
  글자: vi.fn((_s: string, _id: number) => Promise.resolve({ text: '환불은 7일 안에만 받습니다' })),
  기록: vi.fn((_s: string): Promise<GuideVersionRow[]> => Promise.resolve([])),
  옛판: vi.fn((_s: string, _v: number): Promise<ServiceGuide> => Promise.reject(new Error('옛 판을 정하지 않았다'))),
}));

vi.mock('./guideApi.js', async (importOriginal) => {
  const 진짜 = await importOriginal<typeof import('./guideApi.js')>();
  return {
    guideApi: { ...진짜.guideApi, now: 지금, save: 저장, addFile: 더하기, removeFile: 빼기, text: 글자, versions: 기록, version: 옛판 },
  };
});

const 파일 = (id: number, name: string, section: ServiceGuide['files'][number]['section']) => ({
  id,
  name,
  size: 88_064,
  section,
  uploadedAt: '2026-10-15T01:00:00.000Z',
  uploadedByName: '김QA',
});

const 가이드 = (덮어쓰기: Partial<ServiceGuide> = {}): ServiceGuide => ({
  version: 3,
  intro: '중고 물품을 사고파는 웹 애플리케이션입니다',
  policy: '',
  rules: '테스트로 만든 주문 이름은 qa- 로 시작합니다',
  files: [파일(11, '운영 정책.docx', 'policy'), 파일(12, '애플리케이션 소개서.pdf', 'intro'), 파일(14, '옛 약관.doc', 'policy')],
  savedAt: '2026-10-15T01:00:00.000Z',
  savedByName: '김QA',
  ...덮어쓰기,
});

const 쓰는사람: 판정 = () => true;
const 보는사람: 판정 = () => false;

beforeEach(() => {
  vi.clearAllMocks();
  지금.mockResolvedValue(가이드());
});

afterEach(() => {
  cleanup();
});

const 정책칸 = () => screen.getByRole('textbox', { name: '정책' }) as HTMLTextAreaElement;
// 저장 단추는 맨 위와 글 칸 아래 둘이다 — 같은 일을 한다
const 저장버튼 = () => screen.getAllByRole('button', { name: '저장' })[0] as HTMLButtonElement;

describe('애플리케이션 가이드 — 시안 A', () => {
  it('가이드가 없으면 그렇다고 말하고 버전 기록은 없다', async () => {
    지금.mockResolvedValue(가이드({ version: 0, intro: '', policy: '', rules: '', files: [], savedAt: null, savedByName: null }));
    render(<Guide service="MKT" 할수={쓰는사람} />);
    expect(await screen.findByText(/아직 가이드가 없습니다/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '버전 기록' })).toBeNull();
    expect(저장버튼().disabled).toBe(true);
  });

  it('구획 셋에 글과 그 구획의 첨부를 나눠 보이고 머리에 버전과 첨부 수를 적는다', async () => {
    render(<Guide service="MKT" 할수={쓰는사람} />);
    expect(await screen.findByText(/버전 3 · 첨부 3건/)).toBeTruthy();
    const 정책 = screen.getByRole('region', { name: '정책' });
    expect(within(정책).getByText('운영 정책.docx')).toBeTruthy();
    expect(within(정책).queryByText('애플리케이션 소개서.pdf')).toBeNull();
    expect(within(정책).getAllByText(/86KB/)).toHaveLength(2);
    expect((screen.getByRole('textbox', { name: '애플리케이션 소개' }) as HTMLTextAreaElement).value).toBe('중고 물품을 사고파는 웹 애플리케이션입니다');
  });

  it('글을 고치면 저장이 켜지고 지금 버전 위에 세 구획 글을 보낸 뒤 다시 읽는다', async () => {
    render(<Guide service="MKT" 할수={쓰는사람} />);
    await screen.findByText(/버전 3/);
    expect(저장버튼().disabled).toBe(true);
    fireEvent.change(정책칸(), { target: { value: '결제는 테스트 카드만 씁니다' } });
    fireEvent.click(저장버튼());
    await vi.waitFor(() =>
      expect(저장).toHaveBeenCalledWith('MKT', 3, {
        intro: '중고 물품을 사고파는 웹 애플리케이션입니다',
        policy: '결제는 테스트 카드만 씁니다',
        rules: '테스트로 만든 주문 이름은 qa- 로 시작합니다',
      }),
    );
    expect(await screen.findByText('저장했습니다 (버전 4)')).toBeTruthy();
    expect(지금).toHaveBeenCalledTimes(2);
  });

  it('다른 사람이 먼저 바꿨으면 까닭을 말하고 판을 다시 읽되 고치던 글은 남긴다', async () => {
    저장.mockRejectedValueOnce(new ApiError(409, 'GUIDE_STALE', ''));
    render(<Guide service="MKT" 할수={쓰는사람} />);
    await screen.findByText(/버전 3/);
    fireEvent.change(정책칸(), { target: { value: '결제는 테스트 카드만 씁니다' } });
    fireEvent.click(저장버튼());
    expect(await screen.findByText(/다른 사람이 먼저 가이드를 바꿨습니다/)).toBeTruthy();
    await vi.waitFor(() => expect(지금).toHaveBeenCalledTimes(2));
    expect(정책칸().value).toBe('결제는 테스트 카드만 씁니다');
  });

  it('파일 더하기는 그 구획과 지금 버전으로 보내고, 받지 않는 파일은 보내기 전에 막는다', async () => {
    render(<Guide service="MKT" 할수={쓰는사람} />);
    await screen.findByText(/버전 3/);
    const 고르개 = screen.getByLabelText('정책에 파일 더하기');
    const 문서 = new File(['정책'], '환불 정책.docx');
    fireEvent.change(고르개, { target: { files: [문서] } });
    await vi.waitFor(() => expect(더하기).toHaveBeenCalledWith('MKT', 'policy', 3, 문서));

    fireEvent.change(고르개, { target: { files: [new File(['x'], '설치.exe')] } });
    expect(await screen.findByText(/지원하지 않는 파일입니다/)).toBeTruthy();
    expect(더하기).toHaveBeenCalledTimes(1);
  });

  it('빼기는 그 파일 번호와 지금 버전으로 보낸다', async () => {
    render(<Guide service="MKT" 할수={쓰는사람} />);
    await screen.findByText(/버전 3/);
    fireEvent.click(screen.getByRole('button', { name: '운영 정책.docx 빼기' }));
    expect(빼기).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '운영 정책.docx 빼기 확인' }));
    await vi.waitFor(() => expect(빼기).toHaveBeenCalledWith('MKT', 11, 3));
  });

  it('빼기는 한 번 더 묻고, 취소하면 아무것도 보내지 않고 다시 빼기 단추로 돌아간다 (점검 9.2)', async () => {
    render(<Guide service="MKT" 할수={쓰는사람} />);
    await screen.findByText(/버전 3/);
    fireEvent.click(screen.getByRole('button', { name: '운영 정책.docx 빼기' }));
    const 정책 = screen.getByRole('region', { name: '정책' });
    fireEvent.click(within(정책).getByRole('button', { name: '취소' }));
    expect(빼기).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '운영 정책.docx 빼기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '운영 정책.docx 빼기 확인' })).toBeNull();
  });

  it('글 칸 아래에도 저장 단추가 있어 둘 다 같은 일을 한다 (점검 9.3)', async () => {
    render(<Guide service="MKT" 할수={쓰는사람} />);
    await screen.findByText(/버전 3/);
    const 저장들 = screen.getAllByRole('button', { name: '저장' }) as HTMLButtonElement[];
    expect(저장들).toHaveLength(2);
    expect(저장들.every((b) => b.disabled)).toBe(true);
    fireEvent.change(정책칸(), { target: { value: '고친 정책' } });
    expect(screen.getByText('저장하지 않은 변경이 있습니다')).toBeTruthy();
    fireEvent.click((screen.getAllByRole('button', { name: '저장' }) as HTMLButtonElement[])[1]!);
    await vi.waitFor(() => expect(저장).toHaveBeenCalledTimes(1));
  });

  it('글이 길어지면 글 칸이 줄 수만큼 커진다', async () => {
    render(<Guide service="MKT" 할수={쓰는사람} />);
    await screen.findByText(/버전 3/);
    expect(정책칸().rows).toBe(4);
    fireEvent.change(정책칸(), { target: { value: '1\n2\n3\n4\n5\n6' } });
    expect(정책칸().rows).toBe(7);
  });

  it('열기 — 워드는 뽑은 글자를 그 자리에 보이고 PDF 는 새 탭, .doc 은 이름으로 내려받기만 된다', async () => {
    render(<Guide service="MKT" 할수={쓰는사람} />);
    await screen.findByText(/버전 3/);
    const 정책 = screen.getByRole('region', { name: '정책' });
    const 열기들 = within(정책).getAllByRole('button', { name: '열기' });
    expect(열기들).toHaveLength(1);
    fireEvent.click(열기들[0]!);
    expect(await within(정책).findByText('환불은 7일 안에만 받습니다')).toBeTruthy();
    expect(글자).toHaveBeenCalledWith('MKT', 11);
    expect(within(정책).getByRole('link', { name: '옛 약관.doc' }).getAttribute('href')).toBe('/api/guide/files/14?service=MKT');

    const PDF = within(screen.getByRole('region', { name: '애플리케이션 소개' })).getByRole('link', { name: '열기' });
    expect(PDF.getAttribute('href')).toBe('/api/guide/files/12/pdf?service=MKT');
    expect(PDF.getAttribute('target')).toBe('_blank');
  });

  it('보기 권한이면 글을 읽기만 하고 저장 · 파일 더하기 · 빼기가 없다', async () => {
    render(<Guide service="MKT" 할수={보는사람} />);
    expect(await screen.findByText('테스트로 만든 주문 이름은 qa- 로 시작합니다')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(screen.queryByRole('button', { name: '파일 더하기' })).toBeNull();
    expect(screen.queryByRole('button', { name: /빼기$/ })).toBeNull();
    expect(screen.getByText('적은 글이 없습니다')).toBeTruthy();
  });

  it('버전 기록은 판마다 바뀐 것을 적고, 누르면 그 판을 읽기 전용으로 본다', async () => {
    기록.mockResolvedValue([
      { version: 3, savedAt: '2026-10-15T01:00:00.000Z', savedByName: '김QA', changed: { sections: ['policy'], added: [], removed: [] } },
      {
        version: 2,
        savedAt: '2026-10-14T01:00:00.000Z',
        savedByName: '이QA',
        changed: { sections: [], added: [{ name: '운영 정책.docx', section: 'policy' }], removed: [{ name: '옛 정책.docx', section: 'policy' }] },
      },
    ]);
    옛판.mockResolvedValue(가이드({ version: 2, policy: '옛 정책 글', files: [파일(9, '옛 정책.docx', 'policy')] }));
    render(<Guide service="MKT" 할수={쓰는사람} />);
    await screen.findByText(/버전 3/);
    fireEvent.click(screen.getByRole('button', { name: '버전 기록' }));
    const 표 = await screen.findByRole('table');
    expect(within(표).getByText('글 고침 — 정책')).toBeTruthy();
    expect(within(표).getByText('더함 — 운영 정책.docx · 뺌 — 옛 정책.docx')).toBeTruthy();
    expect(within(표).getByText('현재 버전')).toBeTruthy();

    fireEvent.click(within(표).getByRole('button', { name: '버전 2 보기' }));
    const 옛 = await screen.findByRole('group', { name: '버전 2 읽기 전용' });
    expect(옛판).toHaveBeenCalledWith('MKT', 2);
    expect(within(옛).getByText('옛 정책 글')).toBeTruthy();
    expect(within(옛).getByRole('link', { name: '옛 정책.docx' })).toBeTruthy();
    expect(within(옛).queryByRole('textbox')).toBeNull();
    expect(within(옛).queryByRole('button', { name: /빼기$/ })).toBeNull();
  });
});

describe('애플리케이션 가이드 — 쓰던 글을 두고 떠나기 (점검 9.1)', () => {
  it('글을 고친 채 애플리케이션을 바꾸려 하면 묻고, 떠나기를 눌러야 바꾼다', async () => {
    render(<Guide service="MKT" 할수={쓰는사람} />);
    await screen.findByText(/버전 3/);
    fireEvent.change(정책칸(), { target: { value: '쓰다 만 글' } });
    const 바꾼다 = vi.fn();
    act(() => 버리기전(바꾼다));

    expect(screen.getByRole('dialog', { name: '저장 안 된 변경 있음' })).toBeTruthy();
    expect(바꾼다).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '저장하지 않고 떠나기' }));
    expect(바꾼다).toHaveBeenCalledOnce();
  });

  it('저장한 뒤에는 묻지 않는다', async () => {
    render(<Guide service="MKT" 할수={쓰는사람} />);
    await screen.findByText(/버전 3/);
    fireEvent.change(정책칸(), { target: { value: '저장할 글' } });
    fireEvent.click(저장버튼());
    await vi.waitFor(() => expect(정책칸().value).not.toBe('저장할 글'));
    // 떠나기 막이를 푸는 effect 가 아직 안 돌았을 수 있다 — 부하가 크면 이 순간에 걸린다
    await act(async () => undefined);
    const 바꾼다 = vi.fn();
    버리기전(바꾼다);
    expect(바꾼다).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
