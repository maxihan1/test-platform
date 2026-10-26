// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiCoverage, ApiDocChange, ApiDocList } from './apiDocApi.js';
import { ApiError, type ServiceRow } from './api.js';
import { ApiDocs } from './ApiDocs.js';
import type { 판정 } from './role.js';

const { 목록, 덮음, 원문, 비교, 받기, 올리기, 반영 } = vi.hoisted(() => ({
  목록: vi.fn((_id: number): Promise<ApiDocList> => Promise.reject(new Error('목록을 정하지 않았다'))),
  덮음: vi.fn((_id: number): Promise<ApiCoverage> => Promise.reject(new Error('커버리지를 정하지 않았다'))),
  원문: vi.fn((_id: number, v: number) => Promise.resolve({ version: v, doc: {} as object })),
  비교: vi.fn((_id: number, _from: number, _to: number): Promise<{ changes: ApiDocChange[] }> => Promise.resolve({ changes: [] })),
  받기: vi.fn((_id: number) => Promise.resolve({ version: 3, created: false })),
  올리기: vi.fn((_id: number, _f: File) => Promise.resolve({ version: 4, created: true })),
  반영: vi.fn((_id: number, _v: number, _from: number, _env: string, _ops: unknown) => Promise.resolve({ requestId: 41 })),
}));

vi.mock('./apiDocApi.js', () => ({
  apiDocApi: { list: 목록, coverage: 덮음, doc: 원문, compare: 비교, fetch: 받기, upload: 올리기, rewrite: 반영 },
}));

const 앱 = {
  id: 7,
  prefix: 'NTF',
  name: '데모마켓 알림',
  envs: [
    { env: 'dev', baseUrl: 'https://dev.notify.example' },
    { env: 'stg', baseUrl: 'https://stg.notify.example' },
  ],
} as unknown as ServiceRow;

const 버전줄 = (version: number, 덧: Partial<ApiDocList['versions'][number]> = {}) => ({
  version,
  source: 'URL' as const,
  env: 'stg',
  fileName: null,
  createdAt: '2026-10-21T00:12:00.000Z',
  createdBy: 'qa01',
  ...덧,
});

const 커버리지: ApiCoverage = {
  version: 3,
  total: 5,
  covered: 3,
  operations: [
    { method: 'POST', path: '/v1/pushes', codes: [{ status: 202, seen: true, noShape: false, lastRunId: 9 }, { status: 400, seen: false, noShape: false, lastRunId: null }] },
    { method: 'POST', path: '/v1/oauth/revoke', codes: [{ status: 200, seen: true, noShape: true, lastRunId: 9 }, { status: 401, seen: true, noShape: false, lastRunId: 9 }, { status: 400, seen: false, noShape: false, lastRunId: null }] },
  ],
};

const 바뀜: ApiDocChange[] = [
  { method: 'POST', path: '/v1/pushes', change: 'CHANGED', breaking: true, notes: ['요청 필수 필드 channel 추가'] },
  { method: 'POST', path: '/v1/pushes/{id}/cancel', change: 'NEW', breaking: false, notes: [] },
  { method: 'GET', path: '/v1/devices/{id}', change: 'REMOVED', breaking: true, notes: ['API 삭제'] },
];

const 쓰는사람: 판정 = () => true;
const 보는사람: 판정 = () => false;

beforeEach(() => {
  vi.clearAllMocks();
  목록.mockResolvedValue({ docPath: '/openapi.json', docEnv: 'stg', versions: [버전줄(3, { createdBy: null }), 버전줄(2, { source: 'FILE', env: null, fileName: 'notify.json' })] });
  덮음.mockResolvedValue(커버리지);
  원문.mockResolvedValue({ version: 3, doc: { paths: { '/v1/pushes': { post: { summary: '푸시 보내기', tags: ['푸시'] } } } } });
  비교.mockResolvedValue({ changes: 바뀜 });
});

afterEach(() => {
  cleanup();
});

describe('API 문서 — 시안 C 할 일 먼저', () => {
  it('API 애플리케이션이 아니면 안내 한 줄이고, 설정 고리는 운영 계정에게만 보인다', async () => {
    목록.mockRejectedValue(new ApiError(400, 'NOT_API_SERVICE', 'NOT_API_SERVICE'));
    const { rerender } = render(<ApiDocs service={앱} 할수={쓰는사람} 설정보나={false} />);
    expect(await screen.findByText('API 애플리케이션을 고르면 API 문서가 보입니다')).toBeTruthy();
    expect(screen.queryByRole('link', { name: '설정에서 종류 보기' })).toBeNull();
    rerender(<ApiDocs service={앱} 할수={쓰는사람} 설정보나 />);
    expect(screen.getByRole('link', { name: '설정에서 종류 보기' })).toBeTruthy();
  });

  it('버전이 없으면 그렇다고 말하고 받기 · 첨부만 남는다', async () => {
    목록.mockResolvedValue({ docPath: '/openapi.json', docEnv: 'stg', versions: [] });
    render(<ApiDocs service={앱} 할수={쓰는사람} 설정보나 />);
    expect(await screen.findByText(/문서 새로 받기로 기준 서버에서 받거나/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '문서 새로 받기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '파일 첨부' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '버전 기록' })).toBeNull();
  });

  it('머리에 현재 버전 · API 수 · 받은 곳을 적고, 전체 API 를 태그로 묶어 ● ○ 와 응답 형식 없음을 보인다', async () => {
    render(<ApiDocs service={앱} 할수={쓰는사람} 설정보나 />);
    expect(await screen.findByText('버전 3 · API 2개 · stg 서버')).toBeTruthy();
    const 표 = await screen.findByRole('region', { name: '전체 API' });
    expect(within(표).getByText('푸시')).toBeTruthy();
    expect(within(표).getByText('태그 없음')).toBeTruthy();
    expect(within(표).getByLabelText('202 확인함')).toBeTruthy();
    expect(within(표).getAllByLabelText('400 아직 안 받음')).toHaveLength(2);
    expect(within(표).getByText('응답 형식 없음')).toBeTruthy();
    expect(within(표).getByText('확인한 응답 3/5')).toBeTruthy();
  });

  it('바뀐 API 를 반영 안 됨 카드에 보이고, 누르면 지운 API 를 빼고 고른 대상 서버로 반영을 요청한다', async () => {
    render(<ApiDocs service={앱} 할수={쓰는사람} 설정보나 />);
    const 카드 = await screen.findByRole('region', { name: '반영 안 됨 2건' });
    expect(within(카드).getAllByText('기존 테스트가 실패할 수 있음')).toHaveLength(2);
    expect(within(카드).getByText('지운 API 를 쓰던 케이스는 지우지 않고 PR 에 삭제 제안으로 적습니다')).toBeTruthy();
    // 「실서비스 서버」 표시는 /auth/me 에 없다 — 기본값은 설정의 기준 서버다
    expect((within(카드).getByRole('combobox') as HTMLSelectElement).value).toBe('stg');
    fireEvent.click(within(카드).getByRole('button', { name: '바뀐 API 2건 테스트에 반영' }));
    expect(await within(카드).findByText(/작성 요청 41번을 만들었습니다/)).toBeTruthy();
    expect(반영).toHaveBeenCalledWith(7, 3, 2, 'stg', [
      { method: 'POST', path: '/v1/pushes' },
      { method: 'POST', path: '/v1/pushes/{id}/cancel' },
    ]);
    expect((within(카드).getByRole('button', { name: '바뀐 API 2건 테스트에 반영' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('반영 안 된 작성에 막히면 그 요청으로 가는 링크를 띄우고 버튼을 잠근다', async () => {
    반영.mockRejectedValueOnce(new ApiError(409, 'AUTHORING_OPEN', '6101,6105'));
    render(<ApiDocs service={앱} 할수={쓰는사람} 설정보나 />);
    const 카드 = await screen.findByRole('region', { name: '반영 안 됨 2건' });
    fireEvent.click(within(카드).getByRole('button', { name: '바뀐 API 2건 테스트에 반영' }));
    expect(await within(카드).findByText(/반영하지 않은 테스트 작성 요청이 있습니다/)).toBeTruthy();
    expect(within(카드).getByRole('link', { name: '#6105 요청 보기' }).getAttribute('href')).toBe('#/authoring/6105');
    expect((within(카드).getByRole('button', { name: '바뀐 API 2건 테스트에 반영' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('작성 read 만 있으면 받기 · 첨부 · 반영 버튼이 없다', async () => {
    render(<ApiDocs service={앱} 할수={보는사람} 설정보나={false} />);
    await screen.findByRole('region', { name: '반영 안 됨 2건' });
    expect(screen.queryByRole('button', { name: '문서 새로 받기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '파일 첨부' })).toBeNull();
    expect(screen.queryByRole('button', { name: /테스트에 반영/ })).toBeNull();
  });

  it('지금 받은 문서가 현재 버전과 같으면 새 버전을 만들지 않았다고 알린다', async () => {
    render(<ApiDocs service={앱} 할수={쓰는사람} 설정보나 />);
    fireEvent.click(await screen.findByRole('button', { name: '문서 새로 받기' }));
    expect(await screen.findByText('현재 버전과 같아 새 버전을 만들지 않았습니다 (버전 3)')).toBeTruthy();
    expect(받기).toHaveBeenCalledWith(7);
  });

  it('작성 상세에서 버전을 짚고 오면 버전 기록을 펴고 그 버전 원문을 보인다', async () => {
    render(<ApiDocs service={앱} 할수={쓰는사람} 버전={2} 설정보나 />);
    const 기록 = await screen.findByRole('region', { name: '버전 기록' });
    expect(within(기록).getByText('파일 notify.json')).toBeTruthy();
    expect(within(기록).getByText('정기 실행')).toBeTruthy();
    await waitFor(() => expect(원문).toHaveBeenCalledWith(7, 2));
    expect(within(기록).getByRole('group', { name: '버전 2 원문' })).toBeTruthy();
  });
});
