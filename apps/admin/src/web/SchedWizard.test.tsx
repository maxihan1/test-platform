// @vitest-environment jsdom
// 정기 실행 세트 마법사 검사 — 다섯 단계 · 막는 까닭 · 케이스 검색 · 겹침 안내 · 저장 · 기준 정하기 · 수정 (도메인/정기실행 §8.20 「마법사」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CasePage, type ServiceRow } from './api.js';
import { Sched } from './Sched.js';
import { schedApi, type 세트 } from './schedApi.js';

const 앱 = (prefix: string, 덮: Partial<ServiceRow> = {}): ServiceRow => ({
  id: prefix === 'MKT' ? 7 : 8,
  prefix,
  name: `${prefix} 앱`,
  color: '#667788',
  projectId: 10,
  projectName: '데모마켓',
  envs: [{ env: 'qa', baseUrl: `https://qa.${prefix.toLowerCase()}.test` }, { env: 'stg', baseUrl: `https://stg.${prefix.toLowerCase()}.test` }],
  hasSlackWebhook: false,
  kind: 'SCREEN',
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
  ...덮,
});
const 앱들 = [앱('MKT'), 앱('ADM')];

const 세트하나 = (덮: Partial<세트> = {}): 세트 => ({
  id: 1,
  name: '결제 회귀',
  at: '02:00',
  tz: 'Asia/Seoul',
  days: [0, 1, 2, 3, 4, 5, 6],
  onceOn: null,
  isOn: true,
  isBase: false,
  items: [{ kind: 'FN', service: 'MKT', tcIds: null, label: '기능 전체' }],
  envs: [{ service: 'MKT', env: 'stg' }],
  skipped: [],
  missing: { cases: 0, tests: 0 },
  avgMinutes: 35,
  last: null,
  baseable: true,
  ...덮,
});

const 차리기 = (세트들: 세트[]) => {
  vi.spyOn(schedApi, 'sets').mockResolvedValue({ items: 세트들 });
  vi.spyOn(schedApi, 'calendar').mockResolvedValue({ occurrences: [] });
  vi.spyOn(schedApi, 'candidates').mockResolvedValue({
    services: [
      { prefix: 'ADM', name: 'ADM 앱', kind: 'SCREEN', fn: 12, ui: 3 },
      { prefix: 'MKT', name: 'MKT 앱', kind: 'SCREEN', fn: 382, ui: 40 },
    ],
    scenarios: [{ id: 3, name: '주문 → 어드민 확인', service: 'MKT', path: ['MKT', 'ADM'], runnable: true }],
    compatSets: [{ id: 5, name: '주요 화면 호환성', service: 'MKT' }],
  });
  vi.spyOn(api, 'cases').mockResolvedValue({
    items: [
      { tcId: 'MKT-FN-001', name: '로그인' },
      { tcId: 'MKT-FN-002', name: '장바구니' },
    ],
    total: 2,
    page: 1,
    pageSize: 50,
  } as unknown as CasePage);
};

const 창 = () => screen.getByRole('dialog');
const 다음 = () => fireEvent.click(within(창()).getByRole('button', { name: '다음' }));

beforeEach(() => {
  // 2026-11-13(금) 10:30 서울
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-13T01:30:00Z'));
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('정기 실행 세트 마법사', () => {
  it('신규 세트 — 빈 칸은 「다음」을 막고, 담고 고른 것으로 만든 뒤 달력을 다음 실행 날짜로 옮긴다', async () => {
    차리기([세트하나({ isBase: true })]);
    const 만들기 = vi.spyOn(schedApi, 'create').mockResolvedValue({ id: 9 });
    render(<Sched service={앱들[0]!} 앱들={앱들} 쓰나 />);
    fireEvent.click((await screen.findAllByRole('button', { name: '+ 신규 세트' }))[0]!);

    expect(within(창()).getByText('세트 이름을 입력해 주세요')).toBeTruthy();
    fireEvent.change(within(창()).getByRole('textbox'), { target: { value: '결제 회귀' } });
    expect(within(창()).getByText('같은 이름의 세트가 이미 있습니다')).toBeTruthy();
    fireEvent.change(within(창()).getByRole('textbox'), { target: { value: '출시 전 점검' } });
    다음();

    expect(within(창()).getByText('테스트를 하나 이상 선택해 주세요')).toBeTruthy();
    fireEvent.click(await within(창()).findByRole('checkbox', { name: /전체 12건/u }));
    fireEvent.change(within(창()).getByRole('combobox'), { target: { value: 'MKT' } });
    expect(await within(창()).findByText('전체 382건')).toBeTruthy();
    fireEvent.click(within(창()).getByRole('tab', { name: 'E2E 테스트' }));
    fireEvent.click(within(창()).getByRole('checkbox', { name: /주문 → 어드민 확인/u }));
    expect(within(창()).getByText('선택한 테스트 2개')).toBeTruthy();
    다음();

    expect(within(창()).getByText('다른 애플리케이션 단계는 시작 애플리케이션과 같은 이름의 대상 서버에서 실행합니다')).toBeTruthy();
    fireEvent.change(within(창()).getByRole('combobox', { name: 'MKT 대상 서버' }), { target: { value: 'stg' } });
    다음();

    fireEvent.click(within(창()).getByRole('button', { name: '요일 선택' }));
    expect(within(창()).getByText('요일을 하나 이상 선택해 주세요')).toBeTruthy();
    fireEvent.click(within(창()).getByRole('button', { name: '매일' }));
    fireEvent.change(within(창()).getByLabelText(/시각/u), { target: { value: '02:20' } });
    expect(within(창()).getByText('「결제 회귀」(02:00 · 평균 소요 35분)와 시간이 겹칠 수 있습니다. 겹치면 먼저 시작한 세트가 완료된 뒤 실행합니다')).toBeTruthy();
    다음();

    expect(within(창()).getByText('11/14 · 11/15 · 11/16')).toBeTruthy();
    expect(within(창()).queryByRole('checkbox', { name: /안정화 지표에 사용/u })).toBeNull();
    fireEvent.click(within(창()).getByRole('button', { name: '저장' }));
    await waitFor(() =>
      expect(만들기).toHaveBeenCalledWith({
        projectId: 10,
        tz: 'Asia/Seoul',
        name: '출시 전 점검',
        at: '02:20',
        days: [0, 1, 2, 3, 4, 5, 6],
        items: [{ kind: 'FN', service: 'ADM', tcIds: null }, { kind: 'E2E', scenarioId: 3 }],
        envs: [{ service: 'ADM', env: 'qa' }, { service: 'MKT', env: 'stg' }],
      }),
    );
    expect(await screen.findByText('「출시 전 점검」 세트를 저장했습니다 · 다음 실행 11/14 02:20')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(schedApi.calendar).toHaveBeenLastCalledWith(10, '2026-10-26', '2026-12-06'));
  });

  it('케이스를 검색해 직접 선택하면 번호로 담고, 기준 꼴이면 「안정화 지표에 사용」으로 기준을 정한다', async () => {
    차리기([]);
    const 만들기 = vi.spyOn(schedApi, 'create').mockResolvedValue({ id: 9 });
    const 기준 = vi.spyOn(schedApi, 'setBase').mockResolvedValue({});
    render(<Sched service={앱들[0]!} 앱들={앱들} 쓰나 />);
    fireEvent.click((await screen.findAllByRole('button', { name: '+ 신규 세트' }))[0]!);
    fireEvent.change(within(창()).getByRole('textbox'), { target: { value: '웹 회귀' } });
    다음();
    fireEvent.change(await within(창()).findByPlaceholderText('번호 · 이름으로 검색'), { target: { value: '로그' } });
    await waitFor(() => expect(api.cases).toHaveBeenLastCalledWith({ service: 'ADM', kind: 'FN', q: '로그', page: 1 }));
    fireEvent.change(within(창()).getByRole('combobox'), { target: { value: 'MKT' } });
    fireEvent.click(await within(창()).findByRole('checkbox', { name: /MKT-FN-001/u }));
    fireEvent.click(within(창()).getByRole('checkbox', { name: /MKT-FN-002/u }));
    expect(within(창()).getByText(/MKT-FN-001 외 1건/u)).toBeTruthy();
    다음();
    다음();
    다음();
    fireEvent.click(within(창()).getByRole('checkbox', { name: /안정화 지표에 사용/u }));
    fireEvent.click(within(창()).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(기준).toHaveBeenCalledWith(9, true));
    expect(만들기.mock.calls[0]![0].items).toEqual([{ kind: 'FN', service: 'MKT', tcIds: ['MKT-FN-001', 'MKT-FN-002'] }]);
  });

  it('케이스 read 가 없으면 「전체」만 보이고 검색 칸이 없다', async () => {
    차리기([]);
    render(<Sched service={앱들[0]!} 앱들={[앱('MKT', { permissions: { cases: 'none', runs: 'write', authoring: 'none' } })]} 쓰나 />);
    fireEvent.click((await screen.findAllByRole('button', { name: '+ 신규 세트' }))[0]!);
    fireEvent.change(within(창()).getByRole('textbox'), { target: { value: '웹 회귀' } });
    다음();
    fireEvent.change(await within(창()).findByRole('combobox'), { target: { value: 'MKT' } });
    expect(await within(창()).findByText('전체 382건')).toBeTruthy();
    expect(within(창()).queryByPlaceholderText('번호 · 이름으로 검색')).toBeNull();
  });

  it('카드 「수정」은 그 세트 값으로 열고, 기준을 풀면 먼저 풀고 고친다', async () => {
    차리기([세트하나({ isBase: true })]);
    const 순서: string[] = [];
    vi.spyOn(schedApi, 'setBase').mockImplementation(async (_, isBase) => {
      순서.push(`기준 ${String(isBase)}`);
      return {};
    });
    const 고치기 = vi.spyOn(schedApi, 'update').mockImplementation(async () => {
      순서.push('고치기');
      return {};
    });
    render(<Sched service={앱들[0]!} 앱들={앱들} 쓰나 />);
    fireEvent.click(await screen.findByRole('button', { name: '수정' }));
    expect(screen.getByRole('dialog', { name: '세트 수정' })).toBeTruthy();
    expect((within(창()).getByRole('textbox') as HTMLInputElement).value).toBe('결제 회귀');
    다음();
    await within(창()).findByText('선택한 테스트 1개');
    expect((within(창()).getByRole('combobox') as HTMLSelectElement).value).toBe('MKT');
    expect((within(창()).getByRole('checkbox', { name: /전체 382건/u }) as HTMLInputElement).checked).toBe(true);
    다음();
    expect((within(창()).getByRole('combobox', { name: 'MKT 대상 서버' }) as HTMLSelectElement).value).toBe('stg');
    다음();
    다음();
    const 기준칸 = within(창()).getByRole('checkbox', { name: /안정화 지표에 사용/u }) as HTMLInputElement;
    expect(기준칸.checked).toBe(true);
    fireEvent.click(기준칸);
    fireEvent.click(within(창()).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(순서).toEqual(['기준 false', '고치기']));
    expect(고치기).toHaveBeenCalledWith(1, { name: '결제 회귀', at: '02:00', days: [0, 1, 2, 3, 4, 5, 6], items: [{ kind: 'FN', service: 'MKT', tcIds: null }], envs: [{ service: 'MKT', env: 'stg' }] });
  });

  it('서버가 거절한 이름은 화면 말로 알리고 창을 닫지 않는다', async () => {
    차리기([]);
    const { ApiError } = await import('./api.js');
    vi.spyOn(schedApi, 'create').mockRejectedValue(new ApiError(400, 'INVALID_REQUEST', 'NAME_TAKEN'));
    render(<Sched service={앱들[0]!} 앱들={앱들} 쓰나 />);
    fireEvent.click((await screen.findAllByRole('button', { name: '+ 신규 세트' }))[0]!);
    fireEvent.change(within(창()).getByRole('textbox'), { target: { value: '웹 회귀' } });
    다음();
    fireEvent.click(await within(창()).findByRole('checkbox', { name: /전체 12건/u }));
    다음();
    다음();
    다음();
    fireEvent.click(within(창()).getByRole('button', { name: '저장' }));
    expect(await within(창()).findByText('같은 이름의 세트가 이미 있습니다')).toBeTruthy();
  });

  it('기준 체크를 켠 뒤 기준 꼴이 아닌 줄을 담으면 체크가 숨고 저장을 막지 않으며 기준도 정하지 않는다', async () => {
    차리기([]);
    const 만들기 = vi.spyOn(schedApi, 'create').mockResolvedValue({ id: 9 });
    const 기준 = vi.spyOn(schedApi, 'setBase').mockResolvedValue({});
    render(<Sched service={앱들[0]!} 앱들={앱들} 쓰나 />);
    fireEvent.click((await screen.findAllByRole('button', { name: '+ 신규 세트' }))[0]!);
    fireEvent.change(within(창()).getByRole('textbox'), { target: { value: '웹 회귀' } });
    다음();
    fireEvent.click(await within(창()).findByRole('checkbox', { name: /전체 12건/u }));
    다음();
    다음();
    다음();
    fireEvent.click(within(창()).getByRole('checkbox', { name: /안정화 지표에 사용/u }));
    fireEvent.click(within(창()).getByRole('button', { name: /2\. 테스트 선택/u }));
    fireEvent.click(within(창()).getByRole('tab', { name: 'E2E 테스트' }));
    fireEvent.click(within(창()).getByRole('checkbox', { name: /주문 → 어드민 확인/u }));
    다음();
    다음();
    다음();
    expect(within(창()).queryByRole('checkbox', { name: /안정화 지표에 사용/u })).toBeNull();
    fireEvent.click(within(창()).getByRole('button', { name: '저장' }));
    await waitFor(() => expect(만들기).toHaveBeenCalled());
    expect(기준).not.toHaveBeenCalled();
  });

  it('달력의 앞으로의 칸 창에서 「세트 수정」으로 마법사를 연다', async () => {
    차리기([세트하나()]);
    render(<Sched service={앱들[0]!} 앱들={앱들} 쓰나 />);
    fireEvent.click((await screen.findAllByRole('button', { name: /결제 회귀\s*02:00 예정/u }))[0]!);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '세트 수정' }));
    expect(await screen.findByRole('dialog', { name: '세트 수정' })).toBeTruthy();
  });

  it('읽기만 하는 사람에게는 「+ 신규 세트」 · 「수정」이 없다', async () => {
    차리기([세트하나()]);
    render(<Sched service={앱들[0]!} 앱들={앱들} 쓰나={false} />);
    await screen.findByRole('button', { name: /결제 회귀/u, pressed: false });
    expect(screen.queryByRole('button', { name: '+ 신규 세트' })).toBeNull();
    expect(screen.queryByRole('button', { name: '수정' })).toBeNull();
  });
});
