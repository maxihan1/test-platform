// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api } from './api.js';
import { 떠나기막기 } from './leaveGuard.js';
import { ServicePanel } from './SettingsService.js';
import { 물음누름 } from './startConfirm.fixture.js';
import { 그린다, 서비스 } from './SettingsService.fixture.js';
import { 탭열기 } from './SettingsTabs.fixture.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
});

describe('애플리케이션 설정은 탭 넷으로 나뉘고 구획마다 「어디에 쓰이나」를 단다 (도메인/인증 §8.8 · 2026-11-27 시안 A)', () => {
  const 구획제목들 = () => [...document.querySelectorAll('.set-card')].map((el) => el.querySelector('h3')?.textContent);

  it('탭이 넷이고 기본은 「기본 정보」다 — 탭 줄 · 탭 · 탭 칸 역할이 붙는다', () => {
    그린다();

    expect(screen.getByRole('tablist', { name: '애플리케이션 설정' })).toBeTruthy();
    expect(screen.getAllByRole('tab').map((el) => el.querySelector('.set-tab-name')?.textContent)).toEqual(['기본 정보', '실행', '테스트 작성', '알림 · 연동']);
    expect(screen.getByRole('tab', { name: /^기본 정보/ }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(screen.getByRole('tab', { name: /^기본 정보/ }).id);
  });

  it('탭마다 제 구획만 그리고 구획은 제목과 쓰임 한 줄을 갖는다', () => {
    그린다();
    expect(구획제목들()).toEqual(['기본 정보', '애플리케이션 비활성화']);

    탭열기('실행');
    expect(구획제목들()).toEqual(['대상 서버']);
    탭열기('테스트 작성');
    expect(구획제목들()).toEqual(['테스트 작성', '화면 크기']);
    탭열기('알림');
    expect(구획제목들()).toEqual(['실행 알림', '결함 등록', 'CI 토큰']);
    for (const 구획 of document.querySelectorAll('.set-card')) {
      expect(구획.querySelector('.set-card-h p')?.textContent?.length ?? 0).toBeGreaterThan(10);
    }
  });

  it('API 애플리케이션은 테스트 작성 탭에 API 문서 구획이 더 있다', () => {
    render(<ServicePanel row={{ ...서비스, kind: 'API' }} onDone={() => {}} />);
    탭열기('테스트 작성');

    expect(구획제목들()).toEqual(['테스트 작성', 'API 문서', '화면 크기']);
  });

  it('칸이 제 탭 안에 선다 — Slack 은 알림 · 연동, 피그마와 탐색 제외 경로는 테스트 작성, 대상 서버 목록은 실행', () => {
    그린다();
    expect(screen.queryByLabelText('테스트 저장소')).not.toBeNull();
    expect(screen.queryByText('Slack 웹훅')).toBeNull();

    탭열기('실행');
    expect(document.querySelector('.set-card [role="group"]')).not.toBeNull();
    탭열기('테스트 작성');
    expect(screen.getByText('피그마 토큰', { selector: 'label' })).toBeTruthy();
    expect(screen.getByLabelText('탐색 제외 경로')).toBeTruthy();
    탭열기('알림');
    expect(screen.getByText('Slack 웹훅', { selector: 'label' })).toBeTruthy();
  });

  it('화살표 키는 옆 탭을 선택한다', () => {
    그린다();

    fireEvent.keyDown(screen.getByRole('tab', { name: /^기본 정보/ }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /^실행/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(screen.getByRole('tab', { name: /^실행/ }), { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: /^기본 정보/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('입력이 있는 탭은 맨 아래에 같은 저장 줄을 둔다', () => {
    그린다();
    for (const 이름 of ['기본 정보', '실행', '테스트 작성', '알림']) {
      탭열기(이름);
      expect(document.querySelectorAll('.set-foot')).toHaveLength(1);
      expect(screen.getByRole('button', { name: '저장' })).toBeTruthy();
    }
  });

  it('탭을 오가도 적은 것이 남고, 한 번 저장하면 모든 탭의 변경이 같이 간다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    그린다();

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '고친 이름' } });
    탭열기('테스트 작성');
    fireEvent.change(screen.getByLabelText('탐색 제외 경로'), { target: { value: '/admin' } });
    탭열기('기본 정보');
    expect((screen.getByLabelText('이름') as HTMLInputElement).value).toBe('고친 이름');
    탭열기('테스트 작성');
    expect((screen.getByLabelText('탐색 제외 경로') as HTMLTextAreaElement).value).toBe('/admin');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');

    await waitFor(() => expect(고침).toHaveBeenCalledTimes(1));
    expect(고침.mock.calls[0]?.[1]).toMatchObject({ name: '고친 이름', crawlExclude: ['/admin'] });
  });

  it('저장 안 한 변경이 있는 탭만 이름 옆에 점과 「저장 안 한 변경 있음」을 단다', () => {
    그린다();
    const 점 = () => screen.queryAllByRole('img', { name: '저장 안 한 변경 있음' });
    expect(점()).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '고친 이름' } });
    expect(점()).toHaveLength(1);
    expect(screen.getByRole('tab', { name: /^기본 정보/ }).contains(점()[0]!)).toBe(true);

    탭열기('실행');
    fireEvent.change(screen.getByLabelText('대상 서버 1 주소'), { target: { value: 'https://qa2.example.com' } });
    expect(점()).toHaveLength(2);

    탭열기('기본 정보');
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '설정 애플리케이션' } });
    expect(점()).toHaveLength(1);
    expect(screen.getByRole('tab', { name: /^실행/ }).contains(점()[0]!)).toBe(true);
  });

  it('탭 이름 아래 상태 한 줄이 지금 입력 중인 값을 따른다', () => {
    그린다();
    const 상태 = (이름: string) => screen.getByRole('tab', { name: new RegExp(`^${이름}`) }).querySelector('.set-tab-state')?.textContent;
    expect(상태('기본 정보')).toBe('✓ 입력 완료');
    expect(상태('실행')).toBe('✓ 서버 1개 · 계정 0개');
    expect(상태('테스트 작성')).toBe('피그마 토큰 없음');
    expect(상태('알림')).toBe('Slack 없음');

    fireEvent.change(screen.getByLabelText('테스트 저장소'), { target: { value: '' } });
    expect(상태('기본 정보')).toBe('테스트 저장소 비어 있음');
    탭열기('알림');
    fireEvent.click(screen.getByRole('button', { name: 'Slack 웹훅 추가' }));
    fireEvent.change(screen.getByLabelText('Slack 웹훅'), { target: { value: 'https://hooks.slack.com/x' } });
    expect(상태('알림')).toBe('✓ Slack 설정됨');
  });

  it('실행 · 테스트 작성 탭 맨 위에 「필요한 것」을 보인다', () => {
    그린다();
    탭열기('실행');
    expect(document.querySelector('.set-need')?.textContent).toContain('실행하려면 필요한 것');
    expect(document.querySelector('.set-need')?.textContent).toContain('✓ 대상 서버 주소');
    expect(document.querySelector('.set-need')?.textContent).toContain('○ 테스트 계정');

    탭열기('테스트 작성');
    const 상자 = document.querySelector('.set-need')?.textContent ?? '';
    expect(상자).toContain('테스트를 작성하려면 필요한 것');
    expect(상자).toContain('✓ 테스트 저장소');
    expect(상자).toContain('✓ 실서비스 서버가 아닌 대상 서버');
    expect(상자).toContain('○ 피그마 토큰');
  });

  it('결함 등록 줄은 프로젝트 설정의 Issue Bunker 연결로 가는 링크를 둔다', () => {
    그린다();
    탭열기('알림');

    expect(screen.getByText(/Issue Bunker 이슈로 등록합니다/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '데모마켓 프로젝트 설정에서 보기' }).getAttribute('href')).toBe('#/settings/project-1-bts');
  });

  it('비활성화는 저장과 따로 애플리케이션 비활성화 구획에서 확인 창을 거쳐 한다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    const onDone = vi.fn();
    render(<ServicePanel row={서비스} onDone={onDone} />);

    fireEvent.click(screen.getByRole('button', { name: '비활성화' }));
    expect(고침).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: '애플리케이션을 비활성화할까요?' }).textContent).toContain('실행 기록과 케이스는 그대로 보관되고');
    물음누름('비활성화');

    await waitFor(() => expect(고침).toHaveBeenCalledWith(1, { isActive: false }));
    expect(onDone).toHaveBeenCalledWith('ZSS', false);
  });

  it('비활성화 창에서 취소하면 아무것도 보내지 않는다', () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={서비스} onDone={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '비활성화' }));
    물음누름('취소');

    expect(고침).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('다시 활성화도 확인 창을 거쳐 보낸다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={{ ...서비스, isActive: false }} onDone={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '다시 활성화' }));
    expect(screen.getByRole('dialog', { name: '애플리케이션을 다시 활성화할까요?' })).toBeTruthy();
    expect(고침).not.toHaveBeenCalled();
    물음누름('다시 활성화');

    await waitFor(() => expect(고침).toHaveBeenCalledWith(1, { isActive: true }));
  });

  it('저장도 확인 창을 거치고 취소하면 보내지 않는다', () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    그린다();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByRole('dialog', { name: '애플리케이션 설정을 저장할까요?' })).toBeTruthy();
    물음누름('취소');
    expect(고침).not.toHaveBeenCalled();
  });

  it('테스트 저장소 칸은 받은 값을 보이고 고친 값을 보낸다', async () => {
    const 고침 = vi.spyOn(api, 'updateService').mockResolvedValue({ ok: true });
    render(<ServicePanel row={서비스} onDone={() => {}} />);

    const 칸 = screen.getByLabelText('테스트 저장소') as HTMLInputElement;
    expect(칸.value).toBe('https://github.com/example/tests');
    fireEvent.change(칸, { target: { value: 'https://github.com/example/other' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    물음누름('저장');

    await waitFor(() => expect(고침).toHaveBeenCalledWith(1, expect.objectContaining({ testsRepo: 'https://github.com/example/other' })));
  });

  it('앱 파일 칸은 Android 앱 애플리케이션만 패키지 이름도 받는다고 알린다 — 게임은 패키지 이름이 400 이다', () => {
    const 자리표시 = () => screen.getByRole('textbox', { name: '대상 서버 1 앱 파일 경로' }).getAttribute('placeholder');
    render(<ServicePanel row={{ ...서비스, kind: 'APP' }} onDone={() => {}} />);
    탭열기('실행');
    expect(자리표시()).toBe('앱 파일 경로 또는 패키지 이름');
    cleanup();
    render(<ServicePanel row={{ ...서비스, kind: 'GAME' }} onDone={() => {}} />);
    탭열기('실행');
    expect(자리표시()).toBe('앱 파일 경로 (Android 앱 · 게임)');
  });

  it('대상 서버 구획 맨 위에 칸 이름을 한 번만 단다', () => {
    render(<ServicePanel row={{ ...서비스, envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }, { env: 'stg', baseUrl: 'https://stg.example.com' }] }} onDone={() => {}} />);
    탭열기('실행');

    const 머리 = document.querySelectorAll('.set-env-head');
    expect(머리).toHaveLength(1);
    expect(머리[0]?.textContent).toBe('이름주소');
  });

  it('저장했다고 받으면 저장 단추 줄 안에 「저장했습니다」를 보인다', () => {
    render(<ServicePanel row={서비스} 저장했다 onDone={() => {}} />);

    expect(document.querySelector('.set-foot')?.querySelector('[role="status"]')?.textContent).toBe('저장했습니다');
  });

  it('저장하기 전에는 「저장했습니다」가 없다', () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);

    expect(screen.queryByText('저장했습니다')).toBeNull();
  });

  it('고칠 때는 프로젝트를 고르지 않고 지금 프로젝트로 가는 링크만 보인다 — 옮기는 일은 프로젝트 화면이 한다', () => {
    render(<ServicePanel row={서비스} onDone={() => {}} />);

    expect(screen.queryByLabelText('프로젝트')).toBeNull();
    expect(screen.getByRole('link', { name: '데모마켓' }).getAttribute('href')).toBe('#/settings/project-1');
  });
});

describe('설정에서 색 고르개를 걷었다 (SPEC §8.8, 2026-09-22)', () => {
  // 화면 어디에도 안 쓰이는 색을 고르게 두면 「고르면 뭐가 달라지나」에 답할 수 없다
  it('색을 고르는 칸이 없다', () => {
    그린다();
    expect(screen.queryByLabelText('색 코드')).toBeNull();
    expect(document.querySelector('input[type="color"]')).toBeNull();
    expect(document.querySelector('.set-preview')).toBeNull();
  });

  it('명암비 경고 자리도 없다. 잴 면이 사라졌다', () => {
    그린다();
    expect(document.body.textContent).not.toContain('명암비');
  });
});
