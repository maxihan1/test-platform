// @vitest-environment jsdom
// 애플리케이션 종류 「게임」 화면 검사 — 종류 표 GAME 줄과 대상 서버 줄 어드민 키 칸 (GAME-F1-08)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';

import { api, type ServiceRow, type SettingsServiceRow } from './api.js';
import { AuthoringNew } from './AuthoringNew.js';
import { use검색조건 } from './CaseListFilter.js';
import { use필터조건들 } from './CaseListFilterBar.js';
import { 떠나기막기 } from './leaveGuard.js';
import { RunLocation } from './RunLocation.js';
import { ServicePanel } from './SettingsService.js';
import { 서비스고르개 } from './ShellPickers.js';
import { 애플리케이션줄 } from './ShellRail.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
});

const 게임앱 = (envs: SettingsServiceRow['envs']): SettingsServiceRow => ({
  id: 11,
  prefix: 'ASH',
  name: 'Ashveil',
  color: '#3A5FCD', projectId: 1, projectName: 'Ashveil',
  kind: 'GAME',
  envs,
  hasSlackWebhook: false,
  testsRepo: '',
  testsDir: 'ash',
  isActive: true,
  caseCount: 0,
});

const 키있는줄 = { env: 'qa', baseUrl: 'https://qa.ashveil.dev', adminKey: { header: 'X-Admin-Key', valueLast4: 'a91f' } };

async function 고친본문() {
  const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
  return 고침.mock.calls[0]?.[1];
}

const 머리칸 = () => screen.getByLabelText('대상 서버 1 어드민 키 머리 이름');
const 값칸 = () => screen.getByLabelText('대상 서버 1 어드민 키 값');

describe('게임 애플리케이션 설정 — 어드민 키 (도메인/인증 §7 adminKey · GAME-F1-08)', () => {
  it('저장된 키는 끝 4자리만 보이고 손대지 않으면 값 없이 머리만 보내 서버가 옛 값을 잇는다', async () => {
    render(<ServicePanel row={게임앱([키있는줄])} onDone={() => {}} />);

    expect((머리칸() as HTMLInputElement).value).toBe('X-Admin-Key');
    expect(값칸().getAttribute('placeholder')).toBe('•••• a91f');
    expect((await 고친본문())?.envs?.[0]?.adminKey).toEqual({ header: 'X-Admin-Key' });
  });

  it('두 칸을 비우고 저장하면 null 을 보내 지운다', async () => {
    render(<ServicePanel row={게임앱([키있는줄])} onDone={() => {}} />);

    expect(screen.queryByText('이대로 저장하면 이 서버의 어드민 키가 지워집니다')).toBeNull();
    fireEvent.change(머리칸(), { target: { value: '' } });
    expect(screen.getByText('이대로 저장하면 이 서버의 어드민 키가 지워집니다')).toBeTruthy();
    expect(값칸().getAttribute('placeholder')).toBe('키 값');
    expect((await 고친본문())?.envs?.[0]?.adminKey).toBeNull();
  });

  it('머리 이름이나 대상 서버 이름 · 주소를 바꾸고 값을 안 넣으면 저장 전에 까닭을 말한다', () => {
    render(<ServicePanel row={게임앱([키있는줄])} onDone={() => {}} />);
    const 까닭 = '새 어드민 키는 값을 입력해 주세요. 머리 이름이나 대상 서버 이름 · 주소를 바꾸면 다시 넣어야 합니다';

    fireEvent.change(머리칸(), { target: { value: 'X-Gm-Key' } });
    expect(screen.getByText(까닭)).toBeTruthy();
    expect(값칸().getAttribute('placeholder')).toBe('키 값');
    fireEvent.change(머리칸(), { target: { value: 'X-Admin-Key' } });
    fireEvent.change(screen.getByLabelText('대상 서버 1 키'), { target: { value: 'stage' } });
    expect(screen.getByText(까닭)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('대상 서버 1 키'), { target: { value: 'qa' } });
    expect(screen.queryByText(까닭)).toBeNull();
    fireEvent.change(screen.getByLabelText('대상 서버 1 주소'), { target: { value: 'https://other.ashveil.dev' } });
    expect(screen.getByText(까닭)).toBeTruthy();
  });

  it('서버와 같은 규칙으로 머리 이름 · 값 꼴을 먼저 짚는다', () => {
    render(<ServicePanel row={게임앱([키있는줄])} onDone={() => {}} />);

    fireEvent.change(머리칸(), { target: { value: 'X Admin' } });
    expect(screen.getByText('어드민 키 머리 이름은 영문 · 숫자 · - 로 100자까지입니다')).toBeTruthy();
    fireEvent.change(머리칸(), { target: { value: '' } });
    fireEvent.change(값칸(), { target: { value: 'secret-admin-0001' } });
    expect(screen.getByText('어드민 키 머리 이름을 입력해 주세요')).toBeTruthy();
    fireEvent.change(머리칸(), { target: { value: 'X-Admin-Key' } });
    fireEvent.change(값칸(), { target: { value: 'has space 12345' } });
    expect(screen.getByText('어드민 키 값은 공백 없이 12자 이상 500자 이하로 입력해 주세요')).toBeTruthy();
  });

  it('게임이 아닌 애플리케이션에는 칸이 없고 adminKey 를 안 보낸다', async () => {
    render(<ServicePanel row={{ ...게임앱([{ env: 'qa', baseUrl: 'https://qa.example.com' }]), kind: 'APP' }} onDone={() => {}} />);

    expect(screen.queryByLabelText('대상 서버 1 어드민 키 머리 이름')).toBeNull();
    expect((await 고친본문())?.envs?.[0]).not.toHaveProperty('adminKey');
  });
});

describe('게임 종류가 그리는 곳 (도메인/러너 §5.2 종류 표 GAME 줄)', () => {
  const 행 = { ...게임앱([]), envs: [{ env: 'qa', baseUrl: 'https://qa.ashveil.dev' }], permissions: { cases: 'write', runs: 'write', authoring: 'write' } } as ServiceRow;

  it('헤더 고르개에 게임 묶음이 Android 앱 다음에 서고, 애플리케이션 줄에는 폰과 다른 게임 아이콘이 붙는다', () => {
    const 웹 = { ...행, id: 1, prefix: 'MKW', name: '데모마켓 웹', kind: 'SCREEN' } as ServiceRow;
    const 폰 = { ...행, id: 3, prefix: 'MKA', name: '데모마켓 앱', kind: 'APP' } as ServiceRow;
    const user = { username: 'z', displayName: 'z', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [행, 웹, 폰] };
    render(<서비스고르개 user={user} service={웹} onService={() => {}} />);
    expect([...document.querySelectorAll('optgroup')].map((g) => g.label)).toEqual(['웹', 'Android 앱', '게임']);
    cleanup();
    render(<애플리케이션줄 user={user} service={행} onService={() => {}} 새로만들기={false} />);
    const 게임아이콘 = screen.getByRole('button', { name: `${행.name} · 게임` }).querySelector('svg')?.innerHTML;
    expect(게임아이콘).toBeTruthy();
    expect(게임아이콘).not.toBe(screen.getByRole('button', { name: '데모마켓 앱 · Android 앱' }).querySelector('svg')?.innerHTML);
  });

  it('케이스 목록 필터 판에 디바이스 줄이 없고 실행 위치는 늘 보인다', () => {
    const 줄들 = renderHook(() => use필터조건들(use검색조건('ASH', 'FN', undefined, 'GAME'), { kind: 'FN', 앱있음: true, 앱종류: 'GAME', 서버목록: [] })).result.current;
    expect(줄들.map((x) => x.이름)).not.toContain('디바이스');
    cleanup();
    render(<RunLocation android={false} 앱종류="GAME" />);
    expect(screen.getByText('실행 위치 · Device VISION')).toBeTruthy();
  });

  it('작성 새 요청은 「실제 화면과 대조」 없이 「게임 화면 읽기」 안내가 선다', () => {
    render(<AuthoringNew service="ASH" envs={[{ env: 'qa', baseUrl: 'https://qa.ashveil.dev' }]} 앱종류="GAME" on넣었다={() => {}} />);

    expect(screen.queryByLabelText('실제 화면과 대조')).toBeNull();
    expect(screen.getByText('게임 화면 읽기')).toBeTruthy();
    expect(screen.queryByText('앱 화면 읽기')).toBeNull();
  });
});
