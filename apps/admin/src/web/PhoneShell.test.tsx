// @vitest-environment jsdom
// 휴대폰 껍데기 검사 — 위 줄 · 아래 탭 다섯 · 전체 메뉴판 · 애플리케이션 고르기 판 · 내 메뉴 판 · 표 카드 줄 라벨 (SPEC 공통/5-화면공통 §8 「휴대폰 화면」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, type ServiceRow, type User } from './api.js';
import { decideApi, type 결정목록 } from './decideApi.js';
import { 언어함 } from './i18n.js';
import { Modal } from './Modal.js';
import { 표에라벨을단다 } from './phone.js';
import { Shell } from './Shell.js';

const 결제: ServiceRow = {
  id: 1,
  prefix: 'ZPH',
  name: '결제 애플리케이션',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 앱: ServiceRow = { ...결제, id: 2, prefix: 'ZPA', name: '쇼핑 앱', kind: 'APP' };

const 사람: User = {
  username: 'zph1',
  displayName: '김수민',
  role: 'admin',
  dashboard: 'read',
  mustChangePassword: false,
  services: [결제, 앱],
};

const 나가기 = vi.fn();
const 고름 = vi.fn();

const 결정 = (count: number): 결정목록 => ({ prdVersion: 1, count, open: [], items: [], failMore: 0 });

beforeEach(() => {
  localStorage.clear();
  나가기.mockClear();
  고름.mockClear();
  vi.stubGlobal('matchMedia', (질의: string) => ({ matches: true, media: 질의, addEventListener: () => {}, removeEventListener: () => {} }));
  vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
  vi.spyOn(decideApi, 'list').mockResolvedValue(결정(0));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function 껍데기(current: string, user: User = 사람, service: ServiceRow = 결제) {
  return (
    <언어함 value="ko">
      <Shell user={user} service={service} onService={고름} 언어="ko" on언어={() => {}} onLogout={나가기} current={current}>
        <div>본문</div>
      </Shell>
    </언어함>
  );
}

const 띄운다 = (current: string, user: User = 사람, service: ServiceRow = 결제) => render(껍데기(current, user, service));

const 탭 = () => screen.getByRole('navigation', { name: '휴대폰 메뉴' });
const 전체판 = () => {
  fireEvent.click(within(탭()).getByRole('button', { name: '전체' }));
  return screen.getByRole('dialog', { name: '전체 메뉴' });
};

describe('휴대폰 껍데기', () => {
  it('사이드바 대신 아래 탭 다섯 — 대시보드 · 테스트 · 실행 기록 · 작성 · 전체', () => {
    띄운다('#/runs/fn');
    expect(document.querySelector('.side')).toBeNull();
    const 이름들 = [...탭().children].map((it) => it.textContent);
    expect(이름들).toEqual(['대시보드', '테스트', '실행 기록', '작성', '전체']);
    expect(within(탭()).getByRole('link', { name: '실행 기록' }).getAttribute('aria-current')).toBe('page');
    expect(within(탭()).getByRole('link', { name: '테스트' }).getAttribute('href')).toBe('#/cases');
    expect(within(탭()).getByRole('link', { name: '작성' }).getAttribute('href')).toBe('#/authoring');
  });

  it.each(['#/authoring', '#/prd', '#/cases/fn', '#/scenarios', '#/settings', '#/perf/runs'])('%s 도 휴대폰에서 연다 — 「PC 에서 여세요」로 막지 않는다', (자리) => {
    띄운다(자리);
    expect(screen.getByText('본문')).toBeTruthy();
    expect(screen.queryByText(/PC 에서/)).toBeNull();
  });

  it('지금 탭 — 케이스 목록이면 테스트, 작성 상세면 작성', () => {
    띄운다('#/cases/ui');
    expect(within(탭()).getByRole('link', { name: '테스트' }).getAttribute('aria-current')).toBe('page');
    cleanup();
    띄운다('#/authoring/12');
    expect(within(탭()).getByRole('link', { name: /작성/ }).getAttribute('aria-current')).toBe('page');
  });

  it('알림 종은 위 줄에 선다 — 누르면 알림 서랍이 열린다', async () => {
    띄운다('#/runs/fn');
    const 위 = screen.getByRole('banner');
    const 알림 = await within(위).findByRole('button', { name: /알림/ });
    fireEvent.click(알림);
    expect(알림.getAttribute('aria-expanded')).toBe('true');
    expect(await screen.findByRole('complementary', { name: '알림' })).toBeTruthy();
  });

  it('작성 탭에 결정 필요 수 배지가 붙는다 — 0 이면 없다', async () => {
    vi.mocked(decideApi.list).mockResolvedValue(결정(3));
    띄운다('#/runs/fn');
    expect(await within(탭()).findByLabelText('결정 필요 3건')).toBeTruthy();
    expect(decideApi.list).toHaveBeenCalledWith('ZPH');
    cleanup();
    vi.mocked(decideApi.list).mockResolvedValue(결정(0));
    띄운다('#/runs/fn');
    await vi.waitFor(() => expect(decideApi.list).toHaveBeenCalledTimes(2));
    expect(within(탭()).queryByLabelText(/결정 필요/)).toBeNull();
  });

  it('작성 칸이 없으면 작성 탭이 없고 결정 수도 읽지 않는다 · 실행 칸이 없으면 실행 기록 탭이 없다', () => {
    const 칸없음 = { ...결제, permissions: { cases: 'read' as const, runs: 'none' as const, authoring: 'none' as const } };
    띄운다('#/cases', { ...사람, role: 'member', services: [칸없음] }, 칸없음);
    expect(within(탭()).queryByRole('link', { name: '작성' })).toBeNull();
    expect(within(탭()).queryByRole('link', { name: '실행 기록' })).toBeNull();
    expect(within(탭()).getByRole('button', { name: '전체' })).toBeTruthy();
    expect(decideApi.list).not.toHaveBeenCalled();
  });

  it('API 애플리케이션 — 테스트 탭은 기능 테스트 목록, 실행 기록 탭은 묶음 주소다', () => {
    const API = { ...결제, kind: 'API' as const };
    띄운다('#/runs/fn', { ...사람, role: 'member', services: [API] }, API);
    expect(within(탭()).getByRole('link', { name: '테스트' }).getAttribute('href')).toBe('#/cases/fn');
    const 링크 = within(탭()).getByRole('link', { name: '실행 기록' });
    expect(링크.getAttribute('href')).toBe('#/runs');
    expect(링크.getAttribute('aria-current')).toBe('page');
  });

  it('실행 기록 목록이면 하위 고르개 줄이 있고, 실행 결과에서는 없다', () => {
    띄운다('#/runs/ui');
    const 하위 = screen.getByRole('navigation', { name: '실행 기록' });
    expect(within(하위).getByRole('link', { name: '실행 기록 · UI 테스트' }).getAttribute('aria-current')).toBe('page');
    expect(within(하위).getByRole('link', { name: '실행 기록 · E2E' }).getAttribute('href')).toBe('#/runs/e2e');
    cleanup();

    띄운다('#/runs');
    expect(screen.queryByRole('navigation', { name: '실행 기록' })).toBeNull();
    expect(within(탭()).getByRole('link', { name: '실행 기록' }).getAttribute('aria-current')).toBe('page');
  });
});

describe('애플리케이션 고르기 판', () => {
  it('대시보드에서도 위 줄 고르개가 선다 — PC 왼쪽 줄과 같다', () => {
    띄운다('#/dashboard');
    expect(screen.getByRole('button', { name: '애플리케이션 선택' }).textContent).toContain('결제 애플리케이션');
  });

  it('고르개를 누르면 프로젝트의 애플리케이션 칸이 올라오고, 고르면 바꾸고 닫힌다', () => {
    띄운다('#/runs/fn');
    fireEvent.click(screen.getByRole('button', { name: '애플리케이션 선택' }));
    const 판 = screen.getByRole('dialog', { name: '애플리케이션 선택' });
    expect(within(판).getByText('애플리케이션 바꾸기 · 데모마켓')).toBeTruthy();
    expect(within(판).getByRole('button', { name: '결제 애플리케이션 · 웹' }).getAttribute('aria-current')).toBe('page');
    fireEvent.click(within(판).getByRole('button', { name: /쇼핑 앱/ }));
    expect(고름).toHaveBeenCalledWith('ZPA');
    expect(screen.queryByRole('dialog', { name: '애플리케이션 선택' })).toBeNull();
  });
});

describe('전체 메뉴판', () => {
  it('애플리케이션 · <이름> 메뉴 · 계정 차례이고 묶음은 하위를 다 편다', () => {
    띄운다('#/runs/fn');
    const 판 = 전체판();
    expect([...판.querySelectorAll('.sheet-h')].map((it) => it.textContent)).toEqual(['애플리케이션', '결제 애플리케이션 메뉴', '계정']);
    expect(within(판).getByRole('link', { name: 'PRD 관리 · 요구사항' }).getAttribute('href')).toBe('#/prd');
    expect(within(판).getByRole('link', { name: '실행 기록 · 기능 테스트' }).getAttribute('aria-current')).toBe('page');
    expect(within(판).getByRole('link', { name: '성능 테스트 · 부하 테스트' })).toBeTruthy();
    expect(within(판).getByRole('link', { name: /그래프\(Grafana\)/ }).getAttribute('target')).toBe('_blank');
    // 설정은 메뉴가 아니라 계정 줄에 선다 — PC 왼쪽 줄 톱니와 같은 자리
    expect(within(판).getAllByRole('link', { name: '설정' })).toHaveLength(1);
    expect(within(판).getByRole('button', { name: /밝게 보기|어둡게 보기/ })).toBeTruthy();
    expect(within(판).getByLabelText('언어')).toBeTruthy();
  });

  it('메뉴를 누르면 판이 닫힌다', () => {
    띄운다('#/runs/fn');
    fireEvent.click(within(전체판()).getByRole('link', { name: 'E2E 시나리오' }));
    expect(screen.queryByRole('dialog', { name: '전체 메뉴' })).toBeNull();
  });

  it('바깥을 누르거나 Esc 를 누르면 닫힌다', () => {
    띄운다('#/runs/fn');
    전체판();
    fireEvent.mouseDown(document.querySelector('.sheet-back')!);
    expect(screen.queryByRole('dialog', { name: '전체 메뉴' })).toBeNull();
    전체판();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '전체 메뉴' })).toBeNull();
  });

  it('손잡이를 80px 넘게 끌어 내리면 닫히고, 덜 끌면 남는다', () => {
    띄운다('#/runs/fn');
    const 손잡이 = 전체판().querySelector('.sheet-grab')!;
    fireEvent.pointerDown(손잡이, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(손잡이, { clientY: 140, pointerId: 1 });
    expect(screen.getByRole('dialog', { name: '전체 메뉴' })).toBeTruthy();
    fireEvent.pointerDown(손잡이, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(손잡이, { clientY: 200, pointerId: 1 });
    expect(screen.queryByRole('dialog', { name: '전체 메뉴' })).toBeNull();
  });
});

describe('내 메뉴 판', () => {
  it('내 동그라미를 누르면 언어 · 비밀번호 변경 · 로그아웃이 올라온다', () => {
    띄운다('#/runs/fn');
    fireEvent.click(screen.getByRole('button', { name: '내 메뉴 · 김수민' }));
    const 판 = screen.getByRole('dialog', { name: '내 메뉴' });
    expect(within(판).getByText('김수민')).toBeTruthy();
    expect(within(판).getByLabelText('언어')).toBeTruthy();
    expect(within(판).getByRole('link', { name: '비밀번호 변경' }).getAttribute('href')).toBe('#/password');
    fireEvent.click(within(판).getByRole('button', { name: '로그아웃' }));
    expect(나가기).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: '내 메뉴' })).toBeNull();
  });

  // useSSO 가 답을 기억하므로 맨 끝에 둔다 — 앞 검사들은 비밀번호 로그인 설치로 본다
  it('maxihan 계정 설치는 내 메뉴에 비밀번호 변경 대신 통합계정 토큰이 있다', async () => {
    vi.spyOn(api, 'methods').mockResolvedValue({ sso: true });
    띄운다('#/runs/fn');
    fireEvent.click(screen.getByRole('button', { name: '내 메뉴 · 김수민' }));
    const 판 = screen.getByRole('dialog', { name: '내 메뉴' });
    expect(await within(판).findByRole('button', { name: '통합계정 토큰' })).toBeTruthy();
    expect(within(판).queryByRole('link', { name: '비밀번호 변경' })).toBeNull();
  });
});

describe('휴대폰의 창', () => {
  const 창 = (바깥눌러닫기: boolean, onClose = () => {}) =>
    render(
      <Modal 제목="창" onClose={onClose} 바깥눌러닫기={바깥눌러닫기} 버튼={<button type="button">확인</button>}>
        <input aria-label="값" />
      </Modal>,
    );

  it('작은 창은 손잡이가 있는 아래 판이고 끌어 내리면 닫힌다', () => {
    const 닫힘 = vi.fn();
    창(true, 닫힘);
    const 상자 = screen.getByRole('dialog', { name: '창' });
    expect(상자.classList.contains('full')).toBe(false);
    const 손잡이 = 상자.querySelector('.sheet-grab')!;
    fireEvent.pointerDown(손잡이, { clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(손잡이, { clientY: 120, pointerId: 1 });
    expect(닫힘).toHaveBeenCalledOnce();
  });

  it('값을 넣는 창(바깥 누르기로 안 닫히는 창)은 전체 화면이고 손잡이가 없다', () => {
    창(false);
    const 상자 = screen.getByRole('dialog', { name: '창' });
    expect(상자.classList.contains('full')).toBe(true);
    expect(상자.querySelector('.sheet-grab')).toBeNull();
  });
});

describe('표에라벨을단다', () => {
  it('표머리 이름을 칸마다 data-label 로 붙인다 — 이름이 빈 칸은 건너뛰고 칸 합치기를 센다', () => {
    const 그릇 = document.createElement('div');
    그릇.innerHTML =
      '<table><thead><tr><th></th><th>이름</th><th>상태</th><th>시간</th></tr></thead>' +
      '<tbody><tr><td>□</td><td>로그인</td><td>통과</td><td>3초</td></tr><tr><td colspan="2">묶음</td><td>실패</td><td>1초</td></tr></tbody></table>';
    표에라벨을단다(그릇);
    const 줄들 = 그릇.querySelectorAll('tbody tr');
    expect([...줄들[0]!.children].map((칸) => 칸.getAttribute('data-label'))).toEqual([null, '이름', '상태', '시간']);
    expect([...줄들[1]!.children].map((칸) => 칸.getAttribute('data-label'))).toEqual([null, '상태', '시간']);
  });
});
