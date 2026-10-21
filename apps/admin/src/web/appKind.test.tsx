// @vitest-environment jsdom
// 애플리케이션 종류 「Android 앱」 화면 검사 (도메인/러너 §5.2 「애플리케이션 종류 「Android 앱」」 종류 표 · APP-F1-16)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type ServiceRow, type User } from './api.js';
import { AuthoringNew } from './AuthoringNew.js';
import { 조건칩들 } from './CaseListParts.js';
import { Empty } from './CaseListNotes.js';
import { 떠나기막기 } from './leaveGuard.js';
import { RunLocation } from './RunLocation.js';
import { ServicePanel } from './SettingsService.js';
import { 서비스고르개, 종류아이콘 } from './ShellPickers.js';

afterEach(() => {
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
});

const 앱 = (prefix: string, name: string, kind?: ServiceRow['kind'], projectId = 1): ServiceRow => ({
  id: prefix.length + projectId,
  prefix,
  name,
  color: '#3A5FCD',
  projectId,
  projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
  ...(kind === undefined ? {} : { kind }),
});

const 사람 = (services: ServiceRow[]): User => ({ username: 'zak1', displayName: '김앱', role: 'member', dashboard: 'read', mustChangePassword: false, services });

const 빈형편 = { scannedAt: '2026-10-21T00:00:00.000Z', 스캔문제: false, 전체건수: 0, 건조건: false, 친글자: '' };

describe('설정 종류 칸', () => {
  it('칩은 웹 · Android 앱 · API 셋이고 Android 앱으로 만들면 kind APP 을 보내고 API 칸은 안 보낸다', async () => {
    const 만듦 = vi.spyOn(api, 'createService').mockResolvedValue({ id: 9 });
    render(<ServicePanel projects={[{ id: 1, name: '데모마켓' }]} onDone={() => {}} />);

    const 칩들 = within(screen.getByRole('group', { name: '종류' })).getAllByRole('button').map((b) => b.textContent);
    expect(칩들).toEqual(['웹', 'Android 앱', 'API']);
    expect(screen.getByText('생성할 때만 정할 수 있습니다. Android 앱은 디바이스 팜 폰에서 Appium 으로 케이스를 만들고 돌립니다. 웹 사이트와 어드민은 「웹」을 고릅니다')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Android 앱' }));
    expect(screen.queryByLabelText('문서 경로')).toBeNull();
    fireEvent.change(screen.getByLabelText('접두사'), { target: { value: 'MKA' } });
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '데모마켓 앱' } });
    fireEvent.change(screen.getByLabelText('테스트 폴더'), { target: { value: 'mka' } });
    fireEvent.click(screen.getByRole('button', { name: '애플리케이션 추가' }));

    await waitFor(() => expect(만듦).toHaveBeenCalledTimes(1));
    const 본문 = 만듦.mock.calls[0]?.[0];
    expect(본문?.kind).toBe('APP');
    expect(본문).not.toHaveProperty('apiDocPath');
  });
});

describe('헤더 애플리케이션 고르개', () => {
  it('종류가 둘 이상이면 웹 · Android 앱 · API 차례의 묶음으로 열고 고른 프로젝트 것만 담는다', () => {
    const 목록 = [앱('MKW', '데모마켓 웹'), 앱('MKN', '알림', 'API'), 앱('MKA', '데모마켓 앱', 'APP'), 앱('MKO', '데모마켓 운영툴', 'SCREEN'), 앱('ZZO', '다른 프로젝트 앱', 'APP', 2)];
    render(<서비스고르개 user={사람(목록)} service={목록[0] ?? null} onService={() => {}} />);

    const 묶음들 = [...document.querySelectorAll('optgroup')].map((g) => [g.label, [...g.querySelectorAll('option')].map((o) => o.textContent)]);
    expect(묶음들).toEqual([
      ['웹', ['데모마켓 웹', '데모마켓 운영툴']],
      ['Android 앱', ['데모마켓 앱']],
      ['API', ['알림']],
    ]);
  });

  it('종류가 하나뿐이면 묶음 제목 없이 목록만이다', () => {
    const 목록 = [앱('MKW', '데모마켓 웹'), 앱('MKO', '데모마켓 운영툴', 'SCREEN')];
    render(<서비스고르개 user={사람(목록)} service={목록[0] ?? null} onService={() => {}} />);

    expect(document.querySelectorAll('optgroup')).toHaveLength(0);
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['데모마켓 웹', '데모마켓 운영툴']);
  });

  it('고른 칸의 종류 아이콘은 Android 앱 · API 에만 서고 웹에는 없다', () => {
    const { rerender, container } = render(<종류아이콘 service={앱('MKA', '데모마켓 앱', 'APP')} />);
    expect(screen.getByRole('img', { name: 'Android 앱' })).toBeTruthy();
    rerender(<종류아이콘 service={앱('MKN', '알림', 'API')} />);
    expect(screen.getByRole('img', { name: 'API' })).toBeTruthy();
    rerender(<종류아이콘 service={앱('MKW', '데모마켓 웹')} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('케이스 목록', () => {
  const 칩 = (앱종류?: ServiceRow['kind']) =>
    render(<조건칩들 디바이스="ALL" 앱있음 앱종류={앱종류} 활성만 결과="ALL" 건수={null} on디바이스={() => {}} on활성만={() => {}} on결과={() => {}} />);

  it('Android 앱에는 디바이스 칩 줄이 없고 웹에는 있다', () => {
    칩('APP');
    expect(screen.queryByText('디바이스')).toBeNull();
    cleanup();
    칩('SCREEN');
    expect(screen.getByText('디바이스')).toBeTruthy();
  });

  it('Android 앱이 0건이면 작성으로 보내는 안내를 보인다', () => {
    render(<Empty 형편={빈형편} onClear={() => {}} 앱종류="APP" 작성보나 />);

    expect(screen.getByText('아직 Android 앱 케이스가 없습니다')).toBeTruthy();
    expect(screen.getByText('테스트 작성에서 앱 기획서를 넣으면 AI 가 디바이스 팜 폰으로 앱 화면을 읽고 케이스를 만듭니다')).toBeTruthy();
    expect(screen.getByRole('link', { name: '테스트 작성으로' }).getAttribute('href')).toBe('#/authoring');
  });

  it('작성을 못 보는 사람에게는 고리가 없고 거른 조건이 있으면 늘 쓰던 안내다', () => {
    render(<Empty 형편={빈형편} onClear={() => {}} 앱종류="APP" />);
    expect(screen.queryByRole('link', { name: '테스트 작성으로' })).toBeNull();
    cleanup();
    render(<Empty 형편={{ ...빈형편, 건조건: true }} onClear={() => {}} 앱종류="APP" />);
    expect(screen.queryByText('아직 Android 앱 케이스가 없습니다')).toBeNull();
    expect(screen.getByText('조건에 맞는 케이스가 없습니다')).toBeTruthy();
  });
});

describe('실행 창 실행 위치', () => {
  it('Android 앱 애플리케이션은 고른 케이스에 앱이 없어도 늘 보이고 팜이 하는 일을 덧붙인다', () => {
    render(<RunLocation android={false} 앱종류="APP" />);

    expect(screen.getByText('실행 위치 · 디바이스 팜')).toBeTruthy();
    expect(screen.getByText('케이스마다 빈 폰을 하나씩 잡고 끝나면 놓습니다. 화면 영상과 logcat 은 통과하지 못한 항목에 남습니다')).toBeTruthy();
  });

  it('웹 애플리케이션은 지금처럼 앱 케이스가 있을 때 한 줄만이다', () => {
    render(<RunLocation android 앱종류="SCREEN" />);

    expect(screen.getByText('실행 위치 · 디바이스 팜')).toBeTruthy();
    expect(screen.queryByText(/빈 폰을 하나씩/)).toBeNull();
  });
});

describe('작성 새 요청', () => {
  it('Android 앱은 「실제 화면과 대조」 없이 「앱 화면 읽기」 안내가 서고 피그마 칸은 그대로다', () => {
    render(<AuthoringNew service="MKA" envs={[{ env: 'qa', baseUrl: 'https://qa.example.com' }]} 앱종류="APP" 대조처음 on넣었다={() => {}} />);

    expect(screen.queryByLabelText('실제 화면과 대조')).toBeNull();
    expect(screen.getByText('앱 화면 읽기')).toBeTruthy();
    expect(screen.getByText('피그마 주소')).toBeTruthy();
  });

  it('웹은 지금처럼 대조 칸이 있고 앱 안내는 없다', () => {
    render(<AuthoringNew service="MKW" envs={[{ env: 'qa', baseUrl: 'https://qa.example.com' }]} 앱종류="SCREEN" on넣었다={() => {}} />);

    expect(screen.getByLabelText('실제 화면과 대조')).toBeTruthy();
    expect(screen.queryByText('앱 화면 읽기')).toBeNull();
  });
});
