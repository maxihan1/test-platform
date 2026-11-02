// @vitest-environment jsdom
// 앱 · 게임 E2E 화면 — 디바이스 칩 「Android 앱」 · 섞은 케이스 거르기 · 실행 위치 안내 · 결과의 폰 줄과 팜 기록 (도메인/시나리오 §3.7 결정 16 · §8.11)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type CaseRow, type Platform } from './api.js';
import { ScenarioBuild } from './ScenarioBuild.js';
import { 사람, 상세, 서비스, 재료, 케이스단계 } from './ScenarioBuild.fixture.js';
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

const 앱서비스 = () => ({ ...서비스('ZAA'), kind: 'APP' as const });
const 앱사람 = () => ({ ...사람(), services: [앱서비스(), 서비스('ZAW')] });

describe('마법사 디바이스 칩', () => {
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
    render(<ScenarioList service="ZAA" {...(앱종류 === undefined ? {} : { kind: 앱종류 })} envs={[{ env: 'qa', baseUrl: 'https://qa.example.com' }]} 할수={() => true} />);
  };

  it('앱 · 게임 애플리케이션은 실행 위치 · Device VISION 을 늘 알린다', async () => {
    그리기('GAME');
    expect(await screen.findByText(실행위치)).toBeTruthy();
    expect(screen.getByText('실행 위치 · Device VISION', { exact: false })).toBeTruthy();
    expect(screen.queryByText(/시험 실행은 내 컴퓨터 테스트 실행기가/u)).toBeNull();
  });

  it('웹 애플리케이션에는 안 뜬다', async () => {
    그리기();
    await screen.findByText('주문 흐름');
    expect(screen.queryByText(실행위치)).toBeNull();
  });
});

describe('결과 화면 — 폰 줄과 Device VISION 기록', () => {
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

    const 칸 = screen.getByRole('region', { name: 'Device VISION 기록' });
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
    expect(screen.queryByRole('region', { name: 'Device VISION 기록' })).toBeNull();
  });
});

describe('조립 화면 — 디바이스 고르개와 실행 위치', () => {
  const 고르개 = () => screen.getByRole('combobox', { name: '디바이스' }) as HTMLSelectElement;

  it('새 Android 앱 시나리오는 「Android 앱」 하나로 잠긴 채 열린다', async () => {
    vi.spyOn(api, 'cases').mockResolvedValue({ items: [행('ZAA-001', ['android']), 행('ZAA-002', ['desktop'])], total: 2, page: 1, pageSize: 50, hasFeatures: false });
    vi.spyOn(scenarioApi, 'nextCases').mockResolvedValue({ items: [] });
    render(<ScenarioBuild id={null} 띠서비스={앱서비스()} user={앱사람()} />);
    await screen.findByRole('button', { name: 'ZAA-001 추가' });

    expect([...고르개().options].map((o) => o.textContent)).toEqual(['Android 앱']);
    expect(고르개().disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'ZAA-002 추가' })).toBeNull();
    expect(screen.queryByText(실행위치)).toBeNull();
  });

  it('앱 단계가 있으면 머리 아래 실행 위치와 시험 실행 줄이 선다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세({ service: 'ZAA', platform: 'android', parts: [케이스단계('ZAA-001')] }));
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => ({ ...재료(tcId), platforms: ['android'] }));
    render(<ScenarioBuild id={12} 띠서비스={앱서비스()} user={앱사람()} />);

    expect(await screen.findByText(실행위치)).toBeTruthy();
    expect(screen.getByText('시험 실행은 내 컴퓨터 테스트 실행기가 켜져 있으면 거기 꽂은 폰에서, 꺼져 있으면 Device VISION 에서 돕니다')).toBeTruthy();
  });

  it('PC 로 저장된 옛 Android 앱 시나리오는 그 값도 보이고 바꾸라고 알린다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세({ service: 'ZAA', platform: 'desktop', parts: [] }));
    render(<ScenarioBuild id={12} 띠서비스={앱서비스()} user={앱사람()} />);

    expect(await screen.findByText('이 애플리케이션은 디바이스 「Android 앱」로만 돌립니다. 디바이스를 바꿔 저장합니다')).toBeTruthy();
    expect([...고르개().options].map((o) => o.textContent)).toEqual(['PC', 'Android 앱']);
    fireEvent.change(고르개(), { target: { value: 'android' } });
    expect(screen.queryByText(/로만 돌립니다/u)).toBeNull();
  });
});

describe('마법사 시험 실행 — 실행 위치', () => {
  it('앱 단계를 넣고 시험 실행 단계로 가면 실행 위치 세 줄이 뜬다', async () => {
    window.location.hash = '#/scenarios/new';
    vi.spyOn(api, 'cases').mockResolvedValue({ items: [행('ZAA-001', ['android'])], total: 1, page: 1, pageSize: 50, hasFeatures: false });
    vi.spyOn(scenarioApi, 'nextCases').mockResolvedValue({ items: [] });
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => ({ ...재료(tcId), platforms: ['android'] }));
    vi.spyOn(scenarioApi, 'linkSuggestions').mockResolvedValue({ items: [] });
    render(<ScenarioWizard 띠서비스={앱서비스()} user={앱사람()} />);

    fireEvent.click(screen.getByRole('button', { name: /직접 고르기/ }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'ZAA' } });
    fireEvent.click(await screen.findByRole('button', { name: 'ZAA-001 넣기' }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(await screen.findByRole('button', { name: '다음' }));

    expect(await screen.findByText(실행위치)).toBeTruthy();
    expect(screen.getByText(/시험 실행은 내 컴퓨터 테스트 실행기가/u)).toBeTruthy();
  });
});
