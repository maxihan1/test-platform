// @vitest-environment jsdom
// 애플리케이션 종류 「Android 앱」 화면 검사 (도메인/러너 §5.2 「애플리케이션 종류 「Android 앱」」 종류 표 · APP-F1-16)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, renderHook, screen } from '@testing-library/react';

import type { ServiceRow, User } from './api.js';
import { AuthoringNew } from './AuthoringNew.js';
import { use검색조건 } from './CaseListFilter.js';
import { use필터조건들 } from './CaseListFilterBar.js';
import { Empty } from './CaseListNotes.js';
import { 떠나기막기 } from './leaveGuard.js';
import { RunLocation } from './RunLocation.js';
import { 애플리케이션줄 } from './ShellRail.js';
import { 서비스고르개 } from './ShellPickers.js';

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

  it('표에 없는 종류는 웹으로 읽어 목록에서 빠지지 않는다', () => {
    const 모름 = { ...앱('MKI', 'iOS 앱'), kind: 'IOS' } as unknown as ServiceRow;
    const 목록 = [앱('MKW', '데모마켓 웹'), 앱('MKA', '데모마켓 앱', 'APP'), 모름];
    render(<서비스고르개 user={사람(목록)} service={모름} onService={() => {}} />);
    expect([...document.querySelectorAll('optgroup')][0]?.querySelectorAll('option')).toHaveLength(2);
  });
});

describe('애플리케이션 줄의 종류 아이콘', () => {
  const 아이콘들 = (목록: ServiceRow[]) => {
    render(<애플리케이션줄 user={사람(목록)} service={목록[0]!} onService={() => {}} 새로만들기={false} />);
    return screen.getAllByRole('button').map((단추) => 단추.querySelector('svg')?.innerHTML);
  };

  it('웹 · Android 앱 · API 모두 아이콘이 서고 서로 다르다. 웹도 있다', () => {
    const [웹, 폰, API] = 아이콘들([앱('MKW', '데모마켓 웹'), 앱('MKA', '데모마켓 앱', 'APP'), 앱('MKN', '알림', 'API')]);
    expect(웹).toBeTruthy();
    expect(폰).toBeTruthy();
    expect(API).toBeTruthy();
    expect(new Set([웹, 폰, API]).size).toBe(3);
  });

  it('표에 없는 종류는 웹 아이콘으로 읽는다', () => {
    const 모름 = { ...앱('MKI', 'iOS 앱'), kind: 'IOS' } as unknown as ServiceRow;
    const [웹, 읽은것] = 아이콘들([앱('MKW', '데모마켓 웹'), 모름]);
    expect(읽은것).toBe(웹);
  });
});

describe('케이스 목록', () => {
  const 줄이름들 = (앱종류?: ServiceRow['kind']) =>
    renderHook(() => use필터조건들(use검색조건('ZAK', 'FN', undefined, 앱종류), { kind: 'FN', 앱있음: true, 앱종류, 서버목록: [] })).result.current.map((x) => x.이름);

  it('Android 앱의 필터 판에는 디바이스 줄이 없고 웹에는 있다', () => {
    expect(줄이름들('APP')).not.toContain('디바이스');
    expect(줄이름들('SCREEN')).toContain('디바이스');
  });

  it('Android 앱이 0건이면 작성으로 보내는 안내를 보인다', () => {
    render(<Empty 형편={빈형편} onClear={() => {}} 앱종류="APP" 작성보나 />);

    expect(screen.getByText('아직 Android 앱 케이스가 없습니다')).toBeTruthy();
    expect(screen.getByText('테스트 작성에서 앱 기획서를 넣으면 AI 가 Device VISION 폰으로 앱 화면을 읽고 케이스를 만듭니다')).toBeTruthy();
    expect(screen.getByRole('link', { name: '테스트 작성으로' }).getAttribute('href')).toBe('#/authoring');
  });

  it('훑은 적이 없거나 스캔에 문제가 있으면 Android 앱이라도 늘 쓰던 안내다', () => {
    render(<Empty 형편={{ ...빈형편, scannedAt: null }} onClear={() => {}} onScan={() => {}} 앱종류="APP" 작성보나 />);
    expect(screen.getByText('아직 케이스를 불러오지 않았습니다')).toBeTruthy();
    expect(screen.getByRole('button', { name: '케이스 불러오기' })).toBeTruthy();
    cleanup();
    render(<Empty 형편={{ ...빈형편, 스캔문제: true }} onClear={() => {}} 앱종류="APP" 작성보나 />);
    expect(screen.queryByText('아직 Android 앱 케이스가 없습니다')).toBeNull();
  });

  it('Android 앱은 웹에서 고른 디바이스 · 주소의 dev 를 거르기로 싣지 않는다', () => {
    window.location.hash = '#/cases/fn?dev=desktop';
    const 앱목록 = renderHook(() => use검색조건('MKA', 'FN', undefined, 'APP'));
    expect(앱목록.result.current.조건).not.toHaveProperty('platform');
    expect(앱목록.result.current.건조건).toBe(false);
    앱목록.unmount();
    window.location.hash = '#/cases/fn?dev=desktop';
    const 웹목록 = renderHook(() => use검색조건('MKW', 'FN', undefined, 'SCREEN'));
    expect(웹목록.result.current.조건).toMatchObject({ platform: 'desktop' });
    웹목록.unmount();
    window.location.hash = '';
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

    expect(screen.getByText('실행 위치 · Device VISION')).toBeTruthy();
    expect(screen.getByText('케이스마다 빈 폰을 하나씩 잡고 끝나면 놓습니다. 화면 영상과 logcat 은 통과하지 못한 항목에 남습니다')).toBeTruthy();
  });

  it('게임 애플리케이션은 실행 하나에 폰을 한 번 잡는다고 덧붙인다', () => {
    render(<RunLocation android={false} 앱종류="GAME" />);

    expect(screen.getByText('실행 하나 동안 빈 폰을 한 번 잡고 다 돌면 놓습니다. 화면 영상과 logcat 은 통과하지 못한 항목에 남습니다')).toBeTruthy();
    expect(screen.queryByText(/케이스마다 빈 폰을/)).toBeNull();
  });

  it('웹 애플리케이션은 지금처럼 앱 케이스가 있을 때 한 줄만이다', () => {
    render(<RunLocation android 앱종류="SCREEN" />);

    expect(screen.getByText('실행 위치 · Device VISION')).toBeTruthy();
    expect(screen.queryByText(/빈 폰을 하나씩/)).toBeNull();
  });
});

describe('작성 새 요청', () => {
  it('Android 앱은 「실제 화면과 대조」 없이 「앱 화면 읽기」 안내가 서고 피그마 칸은 그대로다', () => {
    render(<AuthoringNew service="MKA" envs={[{ env: 'qa', baseUrl: 'https://qa.example.com' }]} 앱종류="APP" on넣었다={() => {}} />);

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
