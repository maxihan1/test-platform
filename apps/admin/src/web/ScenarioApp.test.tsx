// @vitest-environment jsdom
// 앱 · 게임 E2E 화면 — 디바이스 칩 「Android 앱」 · 섞은 케이스 거르기 · 실행 위치 안내 · 결과의 폰 줄과 팜 기록 (도메인/시나리오 §3.7 결정 16 · §8.11)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type CaseRow, type Platform } from './api.js';
import { 사람, 서비스 } from './ScenarioBuild.fixture.js';
import { scenarioApi } from './scenarioApi.js';
import { ScenarioList } from './ScenarioList.js';
import { ScenarioPalette } from './ScenarioPalette.js';
import { 결과, 연다 } from './ScenarioResult.fixture.js';
import { ScenarioWizard } from './ScenarioWizard.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
  localStorage.clear();
});

const 실행위치 = '시나리오 하나 동안 빈 폰을 한 번 잡고 다 돌면 놓습니다. 화면 영상과 logcat 은 통과하지 못한 실행에 남습니다';

const 행 = (tcId: string, platforms: Platform[]): CaseRow => ({
  tcId,
  name: `${tcId} 이름`,
  platforms,
  precondition: [],
  filePath: `${tcId}.spec.ts`,
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  isActive: true,
  scannedAt: '2026-10-29T00:00:00.000Z',
  techniques: [],
});

describe('마법사 디바이스 칩', () => {
  const 앱사람 = () => ({ ...사람(), services: [{ ...서비스('ZAA'), kind: 'APP' as const }, 서비스('ZAW')] });

  it('Android 앱 애플리케이션이면 칩은 「Android 앱」 하나이고 폰 안내가 붙는다', () => {
    window.location.hash = '#/scenarios/new';
    render(<ScenarioWizard 띠서비스={{ ...서비스('ZAA'), kind: 'APP' }} user={앱사람()} />);

    const 칩들 = screen.getByRole('group', { name: '디바이스' }).querySelectorAll('button');
    expect([...칩들].map((b) => b.textContent)).toEqual(['Android 앱']);
    expect(칩들[0]!.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/Android 앱 애플리케이션은 폰 한 대에서 돌립니다/u)).toBeTruthy();
  });

  it('웹 애플리케이션으로 바꾸면 PC · 모바일 칩으로 돌아가고 PC 가 골라진다', () => {
    window.location.hash = '#/scenarios/new';
    render(<ScenarioWizard 띠서비스={{ ...서비스('ZAA'), kind: 'APP' }} user={앱사람()} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ZAW' } });
    const 칩들 = [...screen.getByRole('group', { name: '디바이스' }).querySelectorAll('button')];
    expect(칩들.map((b) => b.textContent)).toEqual(['PC', '모바일']);
    expect(칩들[0]!.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('팔레트 — 섞은 케이스를 도는 디바이스로 거른다', () => {
  const 앱들 = [
    { prefix: 'ZAW', name: '운영툴', kind: 'SCREEN' as const, envs: [] },
    { prefix: 'ZAA', name: '데모 앱', kind: 'APP' as const, envs: [] },
  ];
  function 그리기(서비스: string, 디바이스: Platform) {
    vi.spyOn(api, 'cases').mockImplementation(async ({ service }) => {
      const items = service === 'ZAA' ? [행('ZAA-FN-001', ['android'])] : [행('ZAW-FN-001', ['desktop']), 행('ZAW-FN-002', ['mobile'])];
      return { items, total: items.length, page: 1, pageSize: 50, hasFeatures: false };
    });
    vi.spyOn(scenarioApi, 'nextCases').mockResolvedValue({ items: [] });
    render(<ScenarioPalette 서비스={서비스} 앱들={앱들} 디바이스={디바이스} 바꿀번호={null} 뒤={null} on케이스={vi.fn()} on다른단계={vi.fn()} on바꾸기취소={vi.fn()} />);
  }

  it('모바일 시나리오에 앱 칩을 고르면 android 케이스가 보이고 안내가 붙는다', async () => {
    그리기('ZAW', 'mobile');
    await screen.findByRole('button', { name: 'ZAW-FN-002 추가' });
    expect(screen.queryByText(/앱 단계는 폰에서 돕니다/u)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'ZAA 데모 앱' }));
    expect(await screen.findByRole('button', { name: 'ZAA-FN-001 추가' })).toBeTruthy();
    expect(screen.getByText('앱 단계는 폰에서 돕니다. Android 앱 케이스만 보입니다')).toBeTruthy();
  });

  it('Android 앱 시나리오에 섞은 웹 케이스는 PC 케이스만 보인다', async () => {
    그리기('ZAA', 'android');
    await screen.findByRole('button', { name: 'ZAA-FN-001 추가' });

    fireEvent.click(screen.getByRole('button', { name: 'ZAW 운영툴' }));
    expect(await screen.findByRole('button', { name: 'ZAW-FN-001 추가' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ZAW-FN-002 추가' })).toBeNull();
    expect(screen.getByText('웹 단계는 PC 화면으로 돕니다. PC 에서 도는 케이스만 보입니다')).toBeTruthy();
  });
});

describe('목록의 실행 위치', () => {
  const 그리기 = (앱종류?: 'APP' | 'GAME') => {
    vi.spyOn(scenarioApi, 'list').mockResolvedValue({
      items: [{ id: 1, name: '주문 흐름', platform: 'android', version: 1, partCount: 3, isActive: true, needsCheck: false, runnable: true, lastRun: null }],
    });
    render(<ScenarioList service="ZAA" {...(앱종류 === undefined ? {} : { 앱종류 })} envs={[{ env: 'qa', baseUrl: 'https://qa.example.com' }]} 할수={() => true} />);
  };

  it('앱 · 게임 애플리케이션은 실행 위치 · 디바이스 팜을 늘 알린다', async () => {
    그리기('GAME');
    expect(await screen.findByText(실행위치)).toBeTruthy();
    expect(screen.getByText('실행 위치 · 디바이스 팜', { exact: false })).toBeTruthy();
    expect(screen.queryByText(/시험 실행은 내 컴퓨터 러너가/u)).toBeNull();
  });

  it('웹 애플리케이션에는 안 뜬다', async () => {
    그리기();
    await screen.findByText('주문 흐름');
    expect(screen.queryByText(실행위치)).toBeNull();
  });
});

describe('결과 화면 — 폰 줄과 디바이스 팜 기록', () => {
  it('폰 연결이 열린 실행은 정보 칸에 폰 한 줄, 맨 아래에 영상 · 로그 · 게임 실패 파일을 둔다', async () => {
    연다(
      결과({
        platform: 'android',
        device: { model: 'SM-S921N', osVersion: '14', appVersion: '1.4.2' },
        farm: [
          { name: 'screen-1.mp4', bytes: 3 * 1024 * 1024 },
          { name: 'logcat.txt', bytes: 2 * 1024 * 1024 },
          { name: 'game-tree.txt', bytes: 1024 },
        ],
      }),
    );
    const 폰 = await screen.findByText('SM-S921N · Android 14');
    expect(폰.previousElementSibling?.textContent).toBe('폰');

    const 칸 = screen.getByRole('region', { name: '디바이스 팜 기록' });
    expect(칸.querySelector('video')?.getAttribute('src')).toBe('/api/runs/77/scenario/farm/screen-1.mp4');
    const 받기 = [...칸.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')]);
    expect(받기).toEqual([
      ['logcat.txt 받기 (2.0MB)', '/api/runs/77/scenario/farm/logcat.txt'],
      ['game-tree.txt 받기 (0.0MB)', '/api/runs/77/scenario/farm/game-tree.txt'],
    ]);
  });

  it('웹 시나리오에는 폰 줄도 팜 기록 칸도 없다', async () => {
    연다(결과());
    await screen.findByText('단계별 결과');
    expect(screen.queryByText('폰')).toBeNull();
    expect(screen.queryByRole('region', { name: '디바이스 팜 기록' })).toBeNull();
  });
});
