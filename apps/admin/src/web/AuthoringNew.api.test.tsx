// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, type EnvRow } from './api.js';
import { AuthoringNew } from './AuthoringNew.js';

const 부름: { 무엇: string; 값: unknown }[] = [];
let 목록답: () => Promise<unknown> = () => Promise.resolve({});

vi.mock('./api.js', async () => {
  const 진짜 = await vi.importActual<typeof import('./api.js')>('./api.js');
  return {
    ...진짜,
    api: {
      createAuthoringRequest: (service: string, body: unknown) => {
        부름.push({ 무엇: '만들기', 값: { service, body } });
        return Promise.resolve({ id: 7 });
      },
      uploadAuthoringAsset: () => Promise.resolve({ id: 1 }),
      discardAuthoring: () => Promise.resolve({}),
      submitAuthoringRequest: (_service: string, id: number) => {
        부름.push({ 무엇: '세우기', 값: { id } });
        return Promise.resolve({ ok: true });
      },
    },
  };
});

vi.mock('./guideApi.js', () => ({
  guideApi: {
    now: () => Promise.resolve({ version: 1, intro: '소개', policy: '', rules: '', files: [], savedAt: null, savedByName: null }),
  },
}));
vi.mock('./apiDocApi.js', () => ({ apiDocApi: { list: () => 목록답() } }));

const 판 = (version: number) => ({ version, source: 'URL', env: 'stg', fileName: null, createdAt: '2026-10-20T00:00:00Z', createdBy: 'kim' });
// /auth/me 의 대상 서버에는 「실서비스 서버」 표시가 없다 — 그래서 기본값은 설정의 기준 서버다
const 서버들: EnvRow[] = [
  { env: 'dev', baseUrl: 'https://dev.example.com' },
  { env: 'stg', baseUrl: 'https://stg.example.com' },
];

beforeEach(() => {
  부름.length = 0;
  목록답 = () => Promise.resolve({ docPath: '/openapi.json', docEnv: 'stg', versions: [판(3), 판(2)] });
});

afterEach(() => {
  cleanup();
});

const 다음버튼 = () => screen.getByRole('button', { name: '다음' }) as HTMLButtonElement;

/** 그리고 API 문서 목록을 읽은 뒤 가이드 단계를 넘긴다 — 읽는 동안은 다음 단계가 정해지지 않아 막힌다 */
async function 그린다(바꿀것: { envs?: EnvRow[]; on넣었다?: () => void } = {}) {
  render(<AuthoringNew service="ALM" serviceId={5} envs={바꿀것.envs ?? 서버들} on넣었다={바꿀것.on넣었다 ?? (() => {})} />);
  await waitFor(() => expect(다음버튼().disabled).toBe(false));
  fireEvent.click(다음버튼());
}

describe('새 작성 요청 — API 애플리케이션', () => {
  it('판 고르개(가장 새 판이 현재 버전)와 대상 서버를 보이고 피그마 · 대조는 숨긴다', async () => {
    await 그린다();
    expect(within(screen.getByRole('list', { name: '단계' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['1 가이드', '2 자료', '3 확인']);
    const 고르개 = await screen.findByRole('combobox', { name: 'API 문서' });
    expect(Array.from(고르개.querySelectorAll('option')).map((o) => o.textContent)).toEqual(['버전 3 (현재 버전)', '버전 2']);
    expect((고르개 as HTMLSelectElement).value).toBe('3');
    const 서버 = screen.getByRole('combobox', { name: '대상 서버' });
    expect(Array.from(서버.querySelectorAll('option')).map((o) => o.textContent)).toEqual(['dev', 'stg']);
    expect((서버 as HTMLSelectElement).value).toBe('stg');
    expect(screen.queryByLabelText('피그마 주소')).toBeNull();
    expect(screen.getByLabelText('PRD')).toBeTruthy();
  });

  it('고른 판과 대상 서버를 apiDoc · env 로 보내고 compare · startUrl 은 싣지 않는다', async () => {
    let 넣었다 = 0;
    await 그린다({ on넣었다: () => (넣었다 += 1) });
    fireEvent.change(await screen.findByRole('combobox', { name: 'API 문서' }), { target: { value: '2' } });
    fireEvent.click(다음버튼());
    fireEvent.click(screen.getByRole('button', { name: '테스트 작성 시작' }));

    await waitFor(() => expect(넣었다).toBe(1));
    expect(부름[0]?.값).toEqual({ service: 'ALM', body: { kind: 'AUTHOR', figma: [], apiDoc: 2, env: 'stg' } });
    expect(부름.map((b) => b.무엇)).toEqual(['만들기', '세우기']);
  });

  it('판이 하나도 없으면 안내와 링크를 보이고 시작 단추를 막는다', async () => {
    목록답 = () => Promise.resolve({ docPath: null, docEnv: null, versions: [] });
    await 그린다();
    expect(await screen.findByText('API 문서가 없습니다. API 문서 화면에서 먼저 가져오세요')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'API 문서 화면으로 이동' }).getAttribute('href')).toBe('#/api/docs');
    expect(다음버튼().disabled).toBe(true);
  });

  it('화면 애플리케이션(NOT_API_SERVICE)이면 지금 폼 그대로다', async () => {
    목록답 = () => Promise.reject(new ApiError(400, 'NOT_API_SERVICE', 'x'));
    await 그린다();
    expect(screen.getByRole('button', { name: 'PRD + 화면 대조' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'PRD 기준' }));
    fireEvent.click(다음버튼());
    expect(screen.getByLabelText('피그마 주소')).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'API 문서' })).toBeNull();
  });

  it('그 밖의 오류는 알리되 화면 폼은 쓸 수 있다', async () => {
    목록답 = () => Promise.reject(new Error('망이 끊겼습니다'));
    await 그린다();
    fireEvent.click(screen.getByRole('button', { name: 'PRD 기준' }));
    fireEvent.click(다음버튼());
    expect(await screen.findByText('망이 끊겼습니다')).toBeTruthy();
    expect(screen.getByLabelText('피그마 주소')).toBeTruthy();
  });
});
