// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ① 검사 — 불러오기 · 머리 · 저장 · 권한 · 서비스 고정 · 떠나기 확인 (도메인/시나리오 §8.11)

import type { ScenarioPart } from '@platform/kit';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ApiError, type ServiceRow, type User } from './api.js';
import { useHash, 떠나기막기 } from './leaveGuard.js';
import { scenarioApi, type CasePartMaterial, type ScenarioDetail } from './scenarioApi.js';
import { ScenarioBuild } from './ScenarioBuild.js';
import { when } from './ui.js';

// 새 시나리오는 단계를 넣는 길이 다음 할 일에서 생긴다. 그때까지 저장 흐름은 처음 한 번 단계를 심어 본다
const 심기 = vi.hoisted(() => ({ 단계들: null as ScenarioPart[] | null, 재료: [] as string[] }));
vi.mock('./useScenarioDraft.js', async (원래) => {
  const 본 = await 원래<typeof import('./useScenarioDraft.js')>();
  const { useEffect } = await import('react');
  return {
    ...본,
    useScenarioDraft: (...인자: Parameters<typeof 본.useScenarioDraft>) => {
      const 초안 = 본.useScenarioDraft(...인자);
      useEffect(() => {
        if (심기.단계들 !== null) 초안.단계들바꾸기(심기.단계들);
        심기.재료.forEach((n) => 초안.재료더하기(n));
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return 초안;
    },
  };
});

const 칸 = (runs: 'read' | 'write') => ({ cases: 'read' as const, runs, authoring: 'read' as const });
const 서비스 = (prefix: string, runs: 'read' | 'write' = 'write'): ServiceRow => ({
  id: 1,
  prefix,
  name: `${prefix} 서비스`,
  color: '#000',
  envs: [],
  hasSlackWebhook: false,
  permissions: 칸(runs),
});
const 사람 = (runs: 'read' | 'write' = 'write'): User => ({
  username: 'zsb',
  displayName: '조립자',
  role: 'member',
  dashboard: 'none',
  mustChangePassword: false,
  services: [서비스('ZSB', runs), 서비스('ZSC', runs)],
});

const 케이스단계 = (tcId: string): ScenarioPart => ({ kind: 'case', tcId, params: {}, expected: {}, skipSteps: [] });

function 상세(덮: Partial<ScenarioDetail> = {}): ScenarioDetail {
  return {
    id: 12,
    service: 'ZSB',
    name: 'ZSB 가입 흐름',
    platform: 'desktop',
    version: 3,
    parts: [케이스단계('ZSB-001'), 케이스단계('ZSB-002'), 케이스단계('ZSB-001')],
    isActive: true,
    versions: [
      { version: 3, savedBy: 'zsb', savedByName: '홍길동', savedAt: '2026-10-06T00:10:00.000Z' },
      { version: 2, savedBy: 'zsb', savedByName: '김철수', savedAt: '2026-10-05T00:10:00.000Z' },
    ],
    checks: [],
    ...덮,
  };
}

const 재료 = (tcId: string): CasePartMaterial => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  steps: [],
  r16: false,
  unconfirmed: null,
});

afterEach(() => {
  심기.단계들 = null;
  심기.재료 = [];
  떠나기막기(null);
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = '';
});

async function 기존그리기(
  덮: Partial<ScenarioDetail> = {},
  user: User = 사람(),
  띠: ServiceRow | null = 서비스('ZSB'),
) {
  const detail = vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세(덮));
  const caseParts = vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
  const 것 = render(<ScenarioBuild id={12} 띠서비스={띠} user={user} />);
  await screen.findByLabelText('시나리오 이름');
  return { ...것, detail, caseParts };
}

function 새로그리기(user: User = 사람(), 띠: ServiceRow | null = 서비스('ZSB')) {
  return render(<ScenarioBuild id={null} 띠서비스={띠} user={user} />);
}

const 이름칸 = () => screen.getByLabelText('시나리오 이름') as HTMLInputElement;
const 바꾸기 = (글: string) => fireEvent.change(이름칸(), { target: { value: 글 } });

// main.tsx 를 못 그리므로 useHash 를 쓰는 작은 감싸개 안에 그린다. 도착 주소가 되면 다른 글자를 그린다
function 감싸개({ id, 띠 = 서비스('ZSB'), 도착 }: { id: number | null; 띠?: ServiceRow; 도착: string }) {
  const hash = useHash();
  if (hash.startsWith(도착)) return <p>도착 화면</p>;
  return <ScenarioBuild id={id} 띠서비스={띠} user={사람()} />;
}

async function 해시가(해시: string) {
  await act(async () => {
    await new Promise((끝) => setTimeout(끝, 0));
  });
  const 도착 = new Promise<void>((끝) => window.addEventListener('hashchange', () => 끝(), { once: true }));
  await act(async () => {
    window.location.hash = 해시;
    await 도착;
  });
}

describe('ScenarioBuild 새 시나리오', () => {
  it('이름은 비고 디바이스는 PC 이고 처음 탭은 add 이며 변경 이력 버튼이 없다', async () => {
    const { container } = 새로그리기();

    expect(이름칸().value).toBe('');
    expect(이름칸().placeholder).toBe('시나리오 이름');
    expect((screen.getByLabelText('디바이스') as HTMLSelectElement).value).toBe('desktop');
    expect(container.querySelector('.scn-build')?.getAttribute('data-tab')).toBe('add');
    expect(screen.queryByRole('button', { name: '변경 이력' })).toBeNull();
    expect(screen.queryByText('저장 안 된 변경 있음')).toBeNull();
    expect(screen.getByRole('link', { name: '← 목록' }).getAttribute('href')).toBe('#/scenarios');
  });

  it('쓰기 권한이 없으면 목록으로 보낸다', async () => {
    window.location.hash = '#/scenarios/new';
    새로그리기(사람('read'));
    await waitFor(() => expect(window.location.hash).toBe('#/scenarios'));
  });
});

describe('ScenarioBuild 기존 시나리오 불러오기', () => {
  it('case 단계의 겹치지 않는 tcId 마다 따로 한 번씩 재료를 부른다', async () => {
    const { caseParts } = await 기존그리기();
    await waitFor(() => expect(caseParts).toHaveBeenCalledTimes(2));
    expect(caseParts.mock.calls.map((c) => c[0]).sort()).toEqual(['ZSB-001', 'ZSB-002']);
  });

  it('StrictMode 로 불러오기가 두 번 돌아도 1번 설정 패널이 재료를 받아 케이스 이름을 그린다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    render(
      <StrictMode>
        <ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />
      </StrictMode>,
    );
    expect(await screen.findByRole('heading', { name: 'ZSB-001 ZSB-001 케이스' })).toBeTruthy();
  });

  it('재료 하나가 404 여도 화면이 뜬다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => {
      if (tcId === 'ZSB-002') throw new ApiError(404, 'CASE_NOT_FOUND', 'gone');
      return 재료(tcId);
    });
    render(<ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />);

    expect((await screen.findByLabelText('시나리오 이름') as HTMLInputElement).value).toBe('ZSB 가입 흐름');
  });

  it('재료 하나가 404 가 아닌 오류(500)면 이름 칸 대신 오류 문장이 뜬다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => {
      if (tcId === 'ZSB-002') throw new ApiError(500, 'INTERNAL', '서버가 아픕니다');
      return 재료(tcId);
    });
    render(<ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />);

    expect(await screen.findByText('서버가 아픕니다')).toBeTruthy();
    expect(screen.queryByLabelText('시나리오 이름')).toBeNull();
  });

  it('재료더하기가 404 면 오류 줄 없이 재료 없음으로 둔다', async () => {
    심기.재료 = ['ZSB-404'];
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    const caseParts = vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => {
      if (tcId === 'ZSB-404') throw new ApiError(404, 'CASE_NOT_FOUND', 'gone');
      return 재료(tcId);
    });
    render(<ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />);
    await screen.findByLabelText('시나리오 이름');
    await waitFor(() => expect(caseParts).toHaveBeenCalledWith('ZSB-404'));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('재료더하기가 500 이면 오류 문장을 상태 줄에 싣는다', async () => {
    심기.재료 = ['ZSB-500'];
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => {
      if (tcId === 'ZSB-500') throw new ApiError(500, 'INTERNAL', '재료를 못 읽었습니다');
      return 재료(tcId);
    });
    render(<ScenarioBuild id={12} 띠서비스={서비스('ZSB')} user={사람()} />);

    expect((await screen.findByRole('status')).textContent).toBe('재료를 못 읽었습니다');
  });

  it('SC 번호 · 버전 줄 · 처음 탭 settings · 변경 이력 버튼이 나온다', async () => {
    const { container } = await 기존그리기();

    expect(screen.getByText('SC-12')).toBeTruthy();
    expect(screen.getByText(`v3 · 홍길동 저장 · ${when('2026-10-06T00:10:00.000Z', 'ko')}`)).toBeTruthy();
    expect(container.querySelector('.scn-build')?.getAttribute('data-tab')).toBe('settings');
    fireEvent.click(screen.getByRole('button', { name: '변경 이력' }));
    expect(container.querySelector('.scn-build')?.getAttribute('data-tab')).toBe('history');
  });

  it('단계가 있게 불러온 시나리오는 1번 설정 탭이 열리고 새 시나리오는 단계 추가 탭이 열린다', async () => {
    const { unmount } = await 기존그리기();
    expect((await screen.findByRole('tab', { name: '1번 설정' })).getAttribute('aria-selected')).toBe('true');
    unmount();

    새로그리기();
    expect(screen.queryByRole('tab', { name: /번 설정/ })).toBeNull();
    expect(screen.getByRole('tab', { name: '단계 추가' }).getAttribute('aria-selected')).toBe('true');
  });

  it('이름을 고치면 저장 안 된 변경 있음 칩이 뜬다', async () => {
    await 기존그리기();
    expect(screen.queryByText('저장 안 된 변경 있음')).toBeNull();
    바꾸기('새 이름');
    expect(screen.getByText('저장 안 된 변경 있음').className).toContain('case-tag');
  });
});

describe('ScenarioBuild 저장 전 확인', () => {
  it('이름이 공백뿐이면 서버를 안 부르고 사유를 보인다', async () => {
    await 기존그리기();
    const update = vi.spyOn(scenarioApi, 'update');
    바꾸기('   ');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toBe('시나리오 이름을 적어야 저장할 수 있습니다');
    expect(update).not.toHaveBeenCalled();
  });

  it('단계가 0개면 서버를 안 부른다', async () => {
    await 기존그리기({ parts: [] });
    const update = vi.spyOn(scenarioApi, 'update');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toBe('단계를 하나 이상 넣어야 저장할 수 있습니다');
    expect(update).not.toHaveBeenCalled();
  });

  it('값 연결이 가리키는 단계가 비면 서버를 안 부른다', async () => {
    const 이어붙임: ScenarioPart = {
      kind: 'case',
      tcId: 'ZSB-002',
      params: {},
      expected: {},
      skipSteps: [],
      links: [{ kind: 'reuse', method: 'GET', urlPattern: '**/api/x', fromSeq: 0 }],
    };
    await 기존그리기({ parts: [케이스단계('ZSB-001'), 이어붙임] });
    const update = vi.spyOn(scenarioApi, 'update');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toBe('가져올 단계를 다시 골라야 저장할 수 있습니다');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('ScenarioBuild 저장', () => {
  it('새 것은 처음 받은 띠 접두사로 만들고 새 주소로 옮긴다. 상자는 안 뜬다', async () => {
    심기.단계들 = [케이스단계('ZSB-001')];
    const create = vi.spyOn(scenarioApi, 'create').mockResolvedValue({ id: 55, version: 1 });
    await 해시가('#/scenarios/new');
    const { rerender } = render(<감싸개 id={null} 도착="#/scenarios/55" />);
    // 띠를 바꿔도 접두사는 처음 것이다
    rerender(<감싸개 id={null} 띠={서비스('ZSC')} 도착="#/scenarios/55" />);
    바꾸기('  새 흐름  ');
    expect(screen.getByText('저장 안 된 변경 있음')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(await screen.findByText('도착 화면')).toBeTruthy();
    expect(window.location.hash).toBe('#/scenarios/55');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(create).toHaveBeenCalledWith({
      service: 'ZSB',
      name: '새 흐름',
      platform: 'desktop',
      parts: [케이스단계('ZSB-001')],
    });
  });

  it('기존 것은 baseVersion 을 실어 고치고 성공 문장을 보인다', async () => {
    await 기존그리기();
    const update = vi.spyOn(scenarioApi, 'update').mockResolvedValue({ version: 4 });
    바꾸기(' 고친 이름 ');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toBe('저장했습니다 · v4');
    expect(update).toHaveBeenCalledWith(12, {
      name: '고친 이름',
      platform: 'desktop',
      parts: 상세().parts,
      baseVersion: 3,
    });
    expect(screen.queryByText('저장 안 된 변경 있음')).toBeNull();
  });

  it('STALE_VERSION 은 다른 사람이 먼저 저장했다는 문장이 뜬다', async () => {
    await 기존그리기();
    vi.spyOn(scenarioApi, 'update').mockRejectedValue(new ApiError(409, 'STALE_VERSION', 'stale'));
    바꾸기('고침');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toContain('다른 사람이 먼저 저장했습니다');
  });

  it('400 INVALID_REQUEST 는 서버가 짚은 사유를 보인다', async () => {
    await 기존그리기();
    vi.spyOn(scenarioApi, 'update').mockRejectedValue(new ApiError(400, 'INVALID_REQUEST', '3번 단계: 주소 형식'));
    바꾸기('고침');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect((await screen.findByRole('status')).textContent).toContain('3번 단계: 주소 형식');
  });
});

describe('ScenarioBuild 권한 · 치운 것 · 서비스', () => {
  it('쓰기 권한이 없으면 저장 · 변경 이력이 없고 안내가 뜨고 이름은 읽기 전용이다', async () => {
    await 기존그리기({}, 사람('read'));

    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(screen.queryByRole('button', { name: '변경 이력' })).toBeNull();
    expect(screen.getByText('실행 권한이 있어야 고치고 돌릴 수 있습니다')).toBeTruthy();
    expect(이름칸().readOnly).toBe(true);
    expect((screen.getByLabelText('디바이스') as HTMLSelectElement).disabled).toBe(true);
  });

  it('치운 시나리오는 쓰기 버튼이 없고 안내가 뜨며 고쳐도 떠나기를 안 막는다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세({ isActive: false }));
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    await 해시가('#/scenarios/12');
    render(<감싸개 id={12} 도착="#/runs" />);
    await screen.findByLabelText('시나리오 이름');

    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(screen.getByText('목록에서 치운 시나리오라 보기만 할 수 있습니다')).toBeTruthy();
    fireEvent.change(이름칸(), { target: { value: '고침' } });
    expect(screen.queryByText('저장 안 된 변경 있음')).toBeNull();
    await 해시가('#/runs');
    expect(await screen.findByText('도착 화면')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('띠 서비스가 시나리오의 서비스와 다르면 안내 줄이 뜬다', async () => {
    await 기존그리기({}, 사람(), 서비스('ZSC'));
    expect(screen.getByText('이 시나리오는 ZSB 서비스 서비스 것입니다')).toBeTruthy();
  });
});

describe('ScenarioBuild 떠나기 확인', () => {
  it('바뀐 채 떠나려 하면 상자가 뜨고 머무르기가 먼저 포커스를 받는다', async () => {
    vi.spyOn(scenarioApi, 'detail').mockResolvedValue(상세());
    vi.spyOn(scenarioApi, 'caseParts').mockImplementation(async (tcId) => 재료(tcId));
    await 해시가('#/scenarios/12');
    render(<감싸개 id={12} 도착="#/runs" />);
    await screen.findByLabelText('시나리오 이름');
    바꾸기('고침');

    await 해시가('#/runs');
    const 상자 = await screen.findByRole('dialog', { name: '저장 안 된 변경 있음' });
    expect(상자.textContent).toContain('이 화면을 떠나면 저장하지 않은 내용이 사라집니다');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '머무르기' }));
    expect(window.location.hash).toBe('#/scenarios/12');

    fireEvent.click(screen.getByRole('button', { name: '머무르기' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await 해시가('#/runs');
    await screen.findByRole('dialog');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '저장하지 않고 떠나기' }));
    });
    expect(await screen.findByText('도착 화면')).toBeTruthy();
    expect(window.location.hash).toBe('#/runs');
  });
});
