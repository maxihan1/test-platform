// @vitest-environment jsdom
// 테스트 실행 › 호환성 › 세트 · 디바이스 선택 상자 검사 (도메인/호환성 §8.17 ② · ②-1)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type CasePage } from './api.js';
import { compatApi, type CompatDevice, type CompatPreview, type CompatSetDetail } from './compatApi.js';
import { CompatSet } from './CompatSet.js';

const 폰 = (serial: string, marketName: string, model: string, 더: Partial<CompatDevice> = {}): CompatDevice => ({
  serial,
  marketName,
  model,
  manufacturer: 'Samsung',
  os: '14',
  resolution: '1080x2400',
  state: 'IDLE',
  ...더,
});

const 팜: CompatDevice[] = [
  폰('s1', 'Galaxy S24 Ultra', 'SM-S928N', { os: '15' }),
  폰('s2', 'Galaxy S21+', 'SM-G996N'),
  폰('s3', 'Galaxy S21+', 'SM-G996N'),
  폰('s4', 'Galaxy Z Fold5', 'SM-F946N', { formFactor: 'foldable', state: 'OCCUPIED' }),
  폰('s5', 'Galaxy A12', 'SM-A125N', { os: '12', state: 'MAINTENANCE' }),
];

const 셈: CompatPreview = {
  auto: [
    { tcId: 'MKA-UI-012', name: '상품 목록 → 상품 상세 이동', adds: 7 },
    { tcId: 'MKA-UI-031', name: '장바구니 담기', adds: 6 },
  ],
  coverage: { covered: 13, total: 16, fallback: false },
  uncovered: [{ key: 'app:Review/write', name: '리뷰 작성' }],
};

const 상세: CompatSetDetail = {
  ...셈,
  id: 3,
  name: '출시 전 점검',
  onePerModel: true,
  devices: [{ serial: 's1', model: 'SM-S928N', name: 'Galaxy S24 Ultra' }, { serial: 's4', model: 'SM-F946N', name: 'Galaxy Z Fold5' }],
  addedCases: ['MKA-FN-046'],
  lastRun: null,
  estimate: { runs: 6, testMinutes: 12, checkMinutes: 2 },
};

afterEach(() => {
  cleanup();
  window.location.hash = '';
  vi.restoreAllMocks();
});

function 차림() {
  vi.spyOn(compatApi, 'devices').mockResolvedValue({ devices: 팜 });
  vi.spyOn(compatApi, 'set').mockResolvedValue(상세);
  vi.spyOn(compatApi, 'sets').mockResolvedValue({ sets: [상세] });
  const 미리셈 = vi.spyOn(compatApi, 'preview').mockResolvedValue(셈);
  const 케이스 = (items: { tcId: string; name: string }[]) => ({ items, total: items.length, page: 1, pageSize: 50 }) as unknown as CasePage;
  vi.spyOn(api, 'cases').mockImplementation((q) =>
    Promise.resolve(q.q === 'MKA-FN-046' ? 케이스([{ tcId: 'MKA-FN-046', name: '바로 구매 · 쿠폰 적용' }]) : 케이스([{ tcId: 'MKA-UI-031', name: '장바구니 담기' }, { tcId: 'MKA-FN-050', name: '주문 취소' }])),
  );
  return { 미리셈 };
}

describe('새 호환성 세트', () => {
  it('디바이스를 고르고 이름을 적어 저장하면 고른 차례대로 보내고 그 세트 주소로 간다', async () => {
    차림();
    const 만들기 = vi.spyOn(compatApi, 'create').mockResolvedValue({ id: 9 });
    render(<CompatSet envs={[]} id="new" serviceId={7} service="MKA" kind="APP" 쓰나 />);
    await screen.findByText('새 호환성 세트');
    const 저장 = screen.getByRole('button', { name: '저장' }) as HTMLButtonElement;
    expect(저장.disabled).toBe(true);
    expect(screen.getByText('저장하면 예상 소요 시간을 계산합니다')).toBeTruthy();

    fireEvent.click(await screen.findByRole('button', { name: '디바이스 선택' }));
    const 상자 = within(screen.getByRole('dialog', { name: '디바이스 선택' }));
    expect(상자.getByText('Device VISION 등록 디바이스 5대')).toBeTruthy();
    const 같은 = 상자.getAllByRole('checkbox', { name: 'Galaxy S21+ SM-G996N' });
    expect((같은[0] as HTMLInputElement).disabled).toBe(false);
    expect((같은[1] as HTMLInputElement).disabled).toBe(true);
    expect(상자.getByText('같은 모델')).toBeTruthy();
    expect((상자.getByRole('checkbox', { name: 'Galaxy A12 SM-A125N' }) as HTMLInputElement).disabled).toBe(true);
    expect(상자.getByText('점검 중')).toBeTruthy();

    fireEvent.click(상자.getByRole('checkbox', { name: 'Galaxy Z Fold5 SM-F946N' }));
    fireEvent.click(상자.getByRole('checkbox', { name: 'Galaxy S24 Ultra SM-S928N' }));
    expect(상자.getByText('2대 선택 · 점검 상태 2개')).toBeTruthy();
    fireEvent.click(상자.getByRole('button', { name: '선택 완료' }));

    expect(screen.getByText('디바이스 2대')).toBeTruthy();
    expect(screen.getByText('폴더블 1대는 꽂힌 상태 그대로 한 번 점검합니다')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: '세트 이름' }), { target: { value: ' 출시 전 점검 ' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(window.location.hash).toBe('#/compat/9?service=MKA'));
    expect(만들기).toHaveBeenCalledWith({ serviceId: 7, name: '출시 전 점검', onePerModel: true, devices: [{ serial: 's4' }, { serial: 's1' }], addedCases: [] });
  });

  it('같은 모델은 1대만을 끄면 같은 모델 두 대를 고를 수 있다', async () => {
    차림();
    render(<CompatSet envs={[]} id="new" serviceId={7} service="MKA" kind="APP" 쓰나 />);
    fireEvent.click(await screen.findByRole('button', { name: '디바이스 선택' }));
    const 상자 = within(screen.getByRole('dialog', { name: '디바이스 선택' }));
    fireEvent.click(상자.getByRole('checkbox', { name: '같은 모델은 1대만' }));
    for (const 칸 of 상자.getAllByRole('checkbox', { name: 'Galaxy S21+ SM-G996N' })) fireEvent.click(칸);
    fireEvent.click(상자.getByRole('button', { name: '선택 완료' }));
    expect(screen.getByText('디바이스 2대')).toBeTruthy();
  });
});

describe('저장한 호환성 세트', () => {
  it('자동 선택 · 직접 추가 · 미커버 화면 · 예상 소요 시간을 보인다', async () => {
    차림();
    render(<CompatSet envs={[]} id={3} serviceId={7} service="MKA" kind="APP" 쓰나 />);
    await screen.findByText('추가 커버 화면 7');
    expect(screen.getByText('케이스 3')).toBeTruthy();
    expect(await screen.findByText('바로 구매 · 쿠폰 적용')).toBeTruthy();
    expect(screen.getByText('리뷰 작성')).toBeTruthy();
    expect(screen.getByText('전체 화면 16개 중 13개 커버')).toBeTruthy();
    expect(screen.getByText('케이스 3 × 점검 상태 2 = 6회 실행')).toBeTruthy();
    expect(screen.getByText('테스트 약 12분 · AI 점검 완료까지 약 2분 추가')).toBeTruthy();
  });

  it('직접 추가를 빼거나 더하면 다시 세고, 저장 전에는 예상 시간을 비운다', async () => {
    const { 미리셈 } = 차림();
    const 고치기 = vi.spyOn(compatApi, 'update').mockResolvedValue({ id: 3 });
    render(<CompatSet envs={[]} id={3} serviceId={7} service="MKA" kind="APP" 쓰나 />);
    fireEvent.click(await screen.findByRole('button', { name: 'MKA-FN-046 제외' }));
    await waitFor(() => expect(미리셈).toHaveBeenLastCalledWith(7, []));
    expect(screen.getByText('저장하면 예상 소요 시간을 계산합니다')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '케이스 추가' }));
    const 창 = within(screen.getByRole('dialog', { name: '케이스 추가' }));
    expect(await 창.findByText('주문 취소')).toBeTruthy();
    expect(창.queryByText('장바구니 담기')).toBeNull();
    fireEvent.click(창.getByRole('checkbox'));
    fireEvent.click(창.getByRole('button', { name: '1건 추가' }));
    await waitFor(() => expect(미리셈).toHaveBeenLastCalledWith(7, ['MKA-FN-050']));

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(고치기).toHaveBeenCalled());
    expect(고치기.mock.calls[0]![1]).toMatchObject({ addedCases: ['MKA-FN-050'], devices: [{ serial: 's1' }, { serial: 's4' }] });
  });

  it('지워진 직접 추가는 건너뜀으로 보이고 미리 셈에 안 보낸다', async () => {
    const { 미리셈 } = 차림();
    vi.spyOn(compatApi, 'set').mockResolvedValue({ ...상세, addedCases: ['MKA-FN-046', 'MKA-FN-099'] });
    render(<CompatSet envs={[]} id={3} serviceId={7} service="MKA" kind="APP" 쓰나 />);
    expect(await screen.findByText('케이스가 없어 실행 때 건너뜀')).toBeTruthy();
    expect(screen.getByText('케이스 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'MKA-FN-046 제외' }));
    await waitFor(() => expect(미리셈).toHaveBeenLastCalledWith(7, []));
  });

  it('등록에서 빠진 디바이스도 선택 상자에서 뺄 수 있다', async () => {
    차림();
    vi.spyOn(compatApi, 'set').mockResolvedValue({ ...상세, devices: [...상세.devices, { serial: 'gone', model: 'SM-G991N', name: 'Galaxy S21' }] });
    render(<CompatSet envs={[]} id={3} serviceId={7} service="MKA" kind="APP" 쓰나 />);
    expect(await screen.findByText('등록에서 빠짐 1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '디바이스 선택' }));
    const 상자 = within(screen.getByRole('dialog', { name: '디바이스 선택' }));
    fireEvent.click(상자.getByRole('checkbox', { name: 'Galaxy S21 SM-G991N' }));
    fireEvent.click(상자.getByRole('button', { name: '선택 완료' }));
    expect(screen.getByText('디바이스 2대')).toBeTruthy();
    expect(screen.queryByText('등록에서 빠짐 1')).toBeNull();
  });

  it('다른 애플리케이션의 세트는 고치지 않는다', async () => {
    차림();
    vi.spyOn(compatApi, 'sets').mockResolvedValue({ sets: [] });
    render(<CompatSet envs={[]} id={3} serviceId={8} service="MKW" kind="SCREEN" 쓰나 />);
    expect(await screen.findByText('이 세트는 지금 선택한 애플리케이션의 세트가 아닙니다')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
  });

  it('실행 read 는 보기만 한다', async () => {
    차림();
    render(<CompatSet envs={[]} id={3} serviceId={7} service="MKA" kind="APP" 쓰나={false} />);
    await screen.findByText('추가 커버 화면 7');
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(screen.queryByRole('button', { name: '디바이스 선택' })).toBeNull();
    expect(screen.queryByRole('button', { name: '케이스 추가' })).toBeNull();
    expect((screen.getByRole('textbox', { name: '세트 이름' }) as HTMLInputElement).disabled).toBe(true);
  });

  it('웹에 폰에서 도는 케이스가 없으면 그 까닭을 보인다', async () => {
    차림();
    vi.spyOn(compatApi, 'preview').mockResolvedValue({ auto: [], coverage: { covered: 0, total: 0, fallback: true }, uncovered: [] });
    render(<CompatSet envs={[]} id="new" serviceId={7} service="MKW" kind="SCREEN" 쓰나 />);
    expect(await screen.findByText('실제 디바이스에서 실행되는 모바일 웹 케이스가 없습니다')).toBeTruthy();
    expect(screen.getByText('전체 화면 목록이 없어 케이스가 아는 화면으로 집계합니다')).toBeTruthy();
  });
});
