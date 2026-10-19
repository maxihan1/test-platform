// @vitest-environment jsdom
// E2E 시나리오 값 연결 「요청 고르기」 검사 — 가져올 단계가 부른 API 만 뜨고, 고르면 메서드 · URL 패턴이 채워지고, 지도를 못 받으면 손 칸만 남는다 (도메인/시나리오 §8.11)

import type { ScenarioLink } from '@platform/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { 지도API } from '../prd/apiMap.js';
import { prdApi } from './prdApi.js';
import { ScenarioLinks } from './ScenarioLinks.js';
import { api as 중간단계, 단계, 재료, 참조, 마지막 } from './ScenarioLinks.fixture.js';
import { useServiceApis } from './useServiceApis.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 줄 = (method: string, path: string, tcIds: string[], host = 'shop.test'): 지도API => ({
  method,
  host,
  path,
  firstSeen: '2026-10-19T00:00:00.000Z',
  lastSeen: '2026-10-19T00:00:00.000Z',
  cases: tcIds.map((tcId) => ({ tcId, steps: [1] })),
  screens: [],
});

const 지도: 지도API[] = [
  줄('POST', '/api/cart/items', ['ZSB-001']),
  줄('GET', '/api/orders/:n', ['ZSB-001', 'ZSB-009']),
  줄('DELETE', '/api/cart', ['ZSB-002']),
  줄('POST', '/api/cart/items', ['ZSB-001'], 'api.shop.test'),
];

function 그리기(links: ScenarioLink[], 지도값: 지도API[] | null, 쓰나 = true) {
  const 현재 = 단계('ZSB-003', links);
  const on바꿈 = vi.fn();
  render(
    <ScenarioLinks
      번호={3}
      단계={현재}
      단계들={[단계('ZSB-001'), 중간단계, 현재]}
      재료={new Map([['ZSB-003', 재료('ZSB-003', ['orderId'])]])}
      쓰나={쓰나}
      지도={지도값}
      on바꿈={on바꿈}
    />,
  );
  return on바꿈;
}

describe('ScenarioLinks 요청 고르기', () => {
  it('가져올 단계가 부른 API 만 뜬다', () => {
    그리기([{ kind: 'bind', param: 'orderId', value: { ...참조, urlPattern: '', jsonPath: '' } }], 지도);
    const 고르개 = screen.getByLabelText('요청 고르기') as HTMLSelectElement;
    expect(Array.from(고르개.options).map((o) => o.textContent)).toEqual([
      '직접 적은 요청',
      'POST /api/cart/items',
      'GET /api/orders/:n',
    ]);
  });

  it('하나를 고르면 메서드와 URL 패턴이 채워지고 :n 은 * 로 바뀐다', () => {
    const on바꿈 = 그리기([{ kind: 'bind', param: 'orderId', value: { ...참조, urlPattern: '', jsonPath: '' } }], 지도);
    fireEvent.change(screen.getByLabelText('요청 고르기'), { target: { value: '1' } });
    expect(마지막(on바꿈)).toEqual([
      { kind: 'bind', param: 'orderId', value: { fromSeq: 1, method: 'GET', urlPattern: '**/api/orders/*{,?*}', jsonPath: '' } },
    ]);
  });

  it('고른 뒤에도 URL 패턴 칸은 손으로 고칠 수 있다', () => {
    그리기([{ kind: 'bind', param: 'orderId', value: { ...참조, method: 'GET', urlPattern: '**/api/orders/*{,?*}' } }], 지도);
    expect((screen.getByLabelText('요청 고르기') as HTMLSelectElement).value).toBe('1');
    expect((screen.getByLabelText('URL 패턴') as HTMLInputElement).disabled).toBe(false);
  });

  it('이전 응답 재사용에서도 그 단계가 부른 API 를 고른다', () => {
    const on바꿈 = 그리기([{ kind: 'reuse', method: 'GET', urlPattern: '', fromSeq: 1 }], 지도);
    fireEvent.change(screen.getByLabelText('요청 고르기'), { target: { value: '0' } });
    expect(마지막(on바꿈)).toEqual([{ kind: 'reuse', method: 'POST', urlPattern: '**/api/cart/items{,?*}', fromSeq: 1 }]);
  });

  it('요청 차단에는 가져올 단계가 없어 고르개를 그리지 않는다', () => {
    그리기([{ kind: 'block', method: 'GET', urlPattern: '' }], 지도);
    expect(screen.queryByLabelText('요청 고르기')).toBeNull();
  });

  it('그 단계가 부른 API 기록이 없으면 고르개 대신 직접 적으라는 글이 나온다', () => {
    그리기([{ kind: 'bind', param: 'orderId', value: { ...참조, urlPattern: '' } }], [줄('DELETE', '/api/cart', ['ZSB-002'])]);
    expect(screen.queryByLabelText('요청 고르기')).toBeNull();
    expect(screen.getByText('애플리케이션 지도에 이 단계가 부른 API 기록이 없습니다. 직접 적습니다')).toBeTruthy();
  });

  it('지도가 없으면(null) 고르개도 글도 없이 손 칸만 둔다', () => {
    그리기([{ kind: 'bind', param: 'orderId', value: { ...참조, urlPattern: '' } }], null);
    expect(screen.queryByLabelText('요청 고르기')).toBeNull();
    expect(screen.queryByText(/애플리케이션 지도에/)).toBeNull();
    expect(screen.getByLabelText('URL 패턴')).toBeTruthy();
  });

  it('읽기만 하는 사람은 고르개도 잠긴다', () => {
    그리기([{ kind: 'bind', param: 'orderId', value: { ...참조, urlPattern: '' } }], 지도, false);
    expect((screen.getByLabelText('요청 고르기') as HTMLSelectElement).disabled).toBe(true);
  });

  it('JSON 경로 칸에 예시가 흐리게 보인다', () => {
    그리기([{ kind: 'bind', param: 'orderId', value: 참조 }], null);
    expect((screen.getByLabelText('JSON 경로') as HTMLInputElement).placeholder).toBe('예: data.cartId');
  });
});

function 지도보기({ 서비스 }: { 서비스: string }) {
  const 받음 = useServiceApis(서비스, true);
  return <p data-testid="결과">{받음 === null ? '없음' : String(받음.length)}</p>;
}

describe('useServiceApis', () => {
  it('애플리케이션 지도를 한 번만 받는다', async () => {
    const 호출 = vi.spyOn(prdApi, 'apis').mockResolvedValue({ apis: 지도 });
    const { rerender } = render(<지도보기 서비스="ZSB" />);
    await waitFor(() => expect(screen.getByTestId('결과').textContent).toBe('4'));
    rerender(<지도보기 서비스="ZSB" />);
    expect(호출).toHaveBeenCalledTimes(1);
  });

  it('읽기 권한이 없어 403 이 오면 오류 없이 없음으로 둔다', async () => {
    const 호출 = vi.spyOn(prdApi, 'apis').mockRejectedValue(new Error('forbidden'));
    render(<지도보기 서비스="ZSB" />);
    await waitFor(() => expect(호출).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('결과').textContent).toBe('없음');
  });
});
