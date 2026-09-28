// @vitest-environment jsdom
// 설정의 승인 대기 묶음 검사 (SPEC 도메인/인증 §8.8 「승인 대기」, 게이트 1 시안 A).
// 수락할 때 권한을 정하는 것은 운영자다 — 가입 신청에는 권한 칸이 없다 (§3.5)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, ApiError, type SettingsServiceRow, type User, type UserRow } from './api.js';
import { Settings } from './Settings.js';
import { PendingSection } from './SettingsPending.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 서비스: SettingsServiceRow = {
  id: 1,
  prefix: 'ZSP',
  name: 'ZSP 서비스',
  color: '#3A5FCD',
  testsRepo: 'https://zsp.example.com',
  testsDir: 'zsp',
  isActive: true,
  envs: [],
  hasSlackWebhook: false,
  caseCount: 0,
};

const 운영자: UserRow = {
  username: 'zsp1',
  displayName: '김운영',
  role: 'admin',
  dashboard: 'read',
  isActive: true,
  isApproved: true,
  services: [{ prefix: 'ZSP', permissions: { cases: 'write', runs: 'write', authoring: 'write' } }],
};

const 신청: UserRow = {
  username: 'minsu',
  displayName: '이민수',
  role: 'member',
  dashboard: 'none',
  isActive: true,
  isApproved: false,
  services: [],
};

function 묶음(rows: UserRow[] = [운영자, 신청], onDone: () => void = () => undefined) {
  return render(<PendingSection rows={rows} services={[서비스]} onDone={onDone} />);
}

describe('승인 대기 묶음', () => {
  it('승인 대기가 없으면 묶음 자체가 없다', () => {
    const { container } = 묶음([운영자]);

    expect(container.textContent).toBe('');
  });

  it('있으면 건수와 이름 · 아이디를 보여 준다', () => {
    묶음();

    expect(screen.getByText('승인 대기 1')).toBeTruthy();
    expect(screen.getByText('이민수')).toBeTruthy();
    expect(screen.getByText('minsu')).toBeTruthy();
    expect(screen.queryByText('김운영')).toBeNull();
  });

  it('수락하면 권한 고르개가 열리고 처음 값은 대시보드 읽기 · 서비스 없음이다', () => {
    묶음();
    fireEvent.click(screen.getByRole('button', { name: '수락' }));

    const 서비스칸 = screen.getByRole('checkbox', { name: /ZSP 서비스/ }) as HTMLInputElement;
    expect(서비스칸.checked).toBe(false);
    const 대시보드 = within(screen.getByRole('group', { name: '대시보드' }));
    expect(대시보드.getByRole('button', { name: '읽기' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('확정하면 고른 권한으로 수락을 부르고 목록을 다시 읽는다 — 서비스를 켜면 세 칸 모두 읽기다', async () => {
    const 수락 = vi.spyOn(api, 'approveUser').mockResolvedValue({ ok: true });
    const 다시 = vi.fn();
    묶음([운영자, 신청], 다시);
    fireEvent.click(screen.getByRole('button', { name: '수락' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /ZSP 서비스/ }));
    fireEvent.click(screen.getByRole('button', { name: '수락한다' }));

    await waitFor(() => expect(다시).toHaveBeenCalled());
    expect(수락).toHaveBeenCalledWith('minsu', {
      role: 'member',
      dashboard: 'read',
      services: [{ prefix: 'ZSP', permissions: { cases: 'read', runs: 'read', authoring: 'read' } }],
    });
  });

  it('거절은 확인 줄을 거쳐 지운다', async () => {
    const 거절 = vi.spyOn(api, 'rejectUser').mockResolvedValue(undefined);
    const 다시 = vi.fn();
    묶음([운영자, 신청], 다시);
    fireEvent.click(screen.getByRole('button', { name: '거절' }));

    expect(screen.getByText(/가입 신청을 지웁니다. 되돌릴 수 없습니다/)).toBeTruthy();
    expect(거절).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '지운다' }));

    await waitFor(() => expect(다시).toHaveBeenCalled());
    expect(거절).toHaveBeenCalledWith('minsu');
  });

  it('확인 줄에서 그만두면 지우지 않는다', () => {
    const 거절 = vi.spyOn(api, 'rejectUser');
    묶음();
    fireEvent.click(screen.getByRole('button', { name: '거절' }));
    fireEvent.click(screen.getByRole('button', { name: '그만두기' }));

    expect(screen.queryByText(/가입 신청을 지웁니다/)).toBeNull();
    expect(거절).not.toHaveBeenCalled();
  });

  it.each([
    ['approve', 409, 'ALREADY_APPROVED'],
    ['approve', 404, 'NOT_FOUND'],
    ['reject', 409, 'APPROVED_USER'],
    ['reject', 404, 'NOT_FOUND'],
  ])('%s 가 %s %s 면 먼저 처리됐다고 알리고 목록을 다시 읽는다', async (일, status, code) => {
    const 오류 = new ApiError(status, code, '');
    vi.spyOn(api, 'approveUser').mockRejectedValue(오류);
    vi.spyOn(api, 'rejectUser').mockRejectedValue(오류);
    const 다시 = vi.fn();
    묶음([운영자, 신청], 다시);
    if (일 === 'approve') {
      fireEvent.click(screen.getByRole('button', { name: '수락' }));
      fireEvent.click(screen.getByRole('button', { name: '수락한다' }));
    } else {
      fireEvent.click(screen.getByRole('button', { name: '거절' }));
      fireEvent.click(screen.getByRole('button', { name: '지운다' }));
    }

    expect(await screen.findByText('다른 운영자가 먼저 처리했습니다')).toBeTruthy();
    expect(다시).toHaveBeenCalled();
  });
});

describe('두 번 누름과 빈 묶음', () => {
  it('지운다를 두 번 눌러도 거절 요청은 한 번만 간다', () => {
    const 거절 = vi.spyOn(api, 'rejectUser').mockReturnValue(new Promise(() => undefined));
    묶음();
    fireEvent.click(screen.getByRole('button', { name: '거절' }));
    fireEvent.click(screen.getByRole('button', { name: '지운다' }));
    fireEvent.click(screen.getByRole('button', { name: '지운다' }));

    expect(거절).toHaveBeenCalledTimes(1);
  });

  it('수락한다를 두 번 눌러도 수락 요청은 한 번만 간다', () => {
    const 수락 = vi.spyOn(api, 'approveUser').mockReturnValue(new Promise(() => undefined));
    묶음();
    fireEvent.click(screen.getByRole('button', { name: '수락' }));
    fireEvent.click(screen.getByRole('button', { name: '수락한다' }));
    fireEvent.click(screen.getByRole('button', { name: '수락한다' }));

    expect(수락).toHaveBeenCalledTimes(1);
  });

  it('도는 동안에는 다른 줄의 수락 · 거절도 잠근다', () => {
    vi.spyOn(api, 'rejectUser').mockReturnValue(new Promise(() => undefined));
    묶음();
    fireEvent.click(screen.getByRole('button', { name: '거절' }));
    fireEvent.click(screen.getByRole('button', { name: '지운다' }));

    expect((screen.getByRole('button', { name: '지운다' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '수락' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('마지막 신청이 사라지면 알림이 있어도 묶음을 그리지 않는다', async () => {
    vi.spyOn(api, 'rejectUser').mockRejectedValue(new ApiError(409, 'APPROVED_USER', ''));
    const { container, rerender } = 묶음();
    fireEvent.click(screen.getByRole('button', { name: '거절' }));
    fireEvent.click(screen.getByRole('button', { name: '지운다' }));
    await screen.findByText('다른 운영자가 먼저 처리했습니다');

    rerender(<PendingSection rows={[운영자]} services={[서비스]} onDone={() => undefined} />);

    expect(screen.queryByText('승인 대기 0')).toBeNull();
    expect(container.textContent).toBe('');
  });
});

describe('설정 화면에서의 자리', () => {
  function 사람(): User {
    return { username: 'zsp1', displayName: '김운영', role: 'admin', dashboard: 'read', mustChangePassword: false, services: [] };
  }

  it('승인 대기는 계정 목록 위에 따로 묶이고 계정 목록에는 안 섞인다', async () => {
    vi.spyOn(api, 'settingsServices').mockResolvedValue({ items: [서비스] });
    vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [운영자, 신청] });
    render(<Settings user={사람()} onMeChanged={() => undefined} />);

    const 대기머리 = await screen.findByText('승인 대기 1');
    const 계정머리 = screen.getByText('계정', { selector: '.sec-h span' });
    expect(대기머리.compareDocumentPosition(계정머리) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText('이민수')).toHaveLength(1);
    expect(within(계정머리.closest('section')!).queryByText('이민수')).toBeNull();
  });
});
