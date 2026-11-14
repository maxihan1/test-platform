// @vitest-environment jsdom
// QA 리포트 목록 화면 검사 (도메인/리포팅 §8.21 「애플리케이션 탭」 · 「프로젝트 탭」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ApiError, type ServiceRow } from './api.js';
import { qaReportApi, type 리포트줄 } from './qaReportApi.js';
import { QaReports } from './QaReports.js';

const 앱: ServiceRow = {
  id: 7,
  prefix: 'DMW',
  name: '데모마켓 웹',
  color: '#667788',
  projectId: 10,
  projectName: '데모마켓',
  envs: [
    { env: 'qa', baseUrl: 'https://qa.dm.test' },
    { env: 'stage', baseUrl: 'https://stage.dm.test' },
  ] as ServiceRow['envs'],
  hasSlackWebhook: false,
  kind: 'SCREEN',
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 줄 = (덮: Partial<리포트줄>): 리포트줄 => ({
  id: 1,
  service: 'DMW',
  env: 'qa',
  buildNo: '124',
  runId: null,
  perfRunId: null,
  version: 1,
  kinds: ['FN', 'UI'],
  running: 0,
  finishedAt: '2026-11-14T01:40:00Z',
  approvedBy: null,
  approvedAt: null,
  updatedAt: '2026-11-14T01:45:00Z',
  ...덮,
});

beforeEach(() => {
  window.location.hash = '#/qa-reports';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('QA 리포트 › 애플리케이션 탭', () => {
  it('줄마다 빌드 번호 · 대상 서버 · 버전 · 승인 상태 · 종류 · 진행 중을 글자로 보인다', async () => {
    vi.spyOn(qaReportApi, 'list').mockResolvedValue({
      items: [
        줄({ id: 1, buildNo: '124', version: 2, kinds: ['FN', 'UI', 'PERF'], running: 1 }),
        줄({ id: 2, buildNo: null, runId: 812, approvedBy: '박지훈', approvedAt: '2026-11-12T09:05:00Z' }),
        줄({ id: 3, buildNo: null, perfRunId: 12, kinds: ['PERF'], env: 'stage' }),
      ],
      total: 3,
    });
    render(<QaReports service={앱} tab="app" />);

    const 줄들 = await screen.findAllByRole('listitem');
    expect(줄들).toHaveLength(3);
    const [첫, 둘, 셋] = 줄들.map((li) => within(li));
    expect(첫!.getByText('빌드 124')).toBeTruthy();
    expect(첫!.getByText('승인 전')).toBeTruthy();
    expect(첫!.getByText(/qa · 버전 2 · 마지막 실행/)).toBeTruthy();
    expect(첫!.getAllByText(/^(기능|UI|성능)$/).map((el) => el.textContent)).toEqual(['기능', 'UI', '성능']);
    expect(첫!.getByText('진행 중')).toBeTruthy();
    expect(둘!.getByText('RUN 812')).toBeTruthy();
    expect(둘!.getByText('승인됨 · 박지훈')).toBeTruthy();
    expect(둘!.queryByText('진행 중')).toBeNull();
    // 성능 실행 하나는 성능 실행 화면의 번호 꼴이다
    expect(셋!.getByText('PRF-0012')).toBeTruthy();
    expect(screen.getByText('리포트 3건')).toBeTruthy();
    // 줄을 누르면 앱 안 리포트 보기로 간다
    expect(첫!.getByRole('link').getAttribute('href')).toBe('#/qa-reports/1');
  });

  it('승인 상태 · 대상 서버로 거르면 서버에 그 조건을 넘기고 주소에 남긴다', async () => {
    const 부름 = vi.spyOn(qaReportApi, 'list').mockResolvedValue({ items: [줄({})], total: 1 });
    render(<QaReports service={앱} tab="app" />);
    await screen.findByText('빌드 124');
    expect(부름).toHaveBeenLastCalledWith('DMW', { page: 1 });

    fireEvent.click(within(screen.getByRole('group', { name: '승인 상태' })).getByRole('button', { name: '승인 전' }));
    await waitFor(() => expect(부름).toHaveBeenLastCalledWith('DMW', { approved: false, page: 1 }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'stage' } });
    await waitFor(() => expect(부름).toHaveBeenLastCalledWith('DMW', { env: 'stage', approved: false, page: 1 }));
    await waitFor(() => expect(window.location.hash).toBe('#/qa-reports?env=stage&approved=false'));
  });

  it('주소의 거르개로 연다. 이 애플리케이션에 없는 대상 서버는 버리고 전체로 본다', async () => {
    window.location.hash = '#/qa-reports?env=gone&approved=true';
    const 부름 = vi.spyOn(qaReportApi, 'list').mockResolvedValue({ items: [], total: 0 });
    render(<QaReports service={앱} tab="app" />);
    await screen.findByText('조건에 맞는 리포트가 없습니다');
    expect(부름).toHaveBeenLastCalledWith('DMW', { approved: true, page: 1 });
  });

  it('리포트가 없으면 언제 생기는지 말한다', async () => {
    vi.spyOn(qaReportApi, 'list').mockResolvedValue({ items: [], total: 0 });
    render(<QaReports service={{ ...앱, envs: [] }} tab="app" />);
    expect(await screen.findByText('아직 QA 리포트가 없습니다')).toBeTruthy();
    expect(screen.getByText('실행이 완료되면 빌드마다 리포트를 만듭니다')).toBeTruthy();
    // 대상 서버가 하나 이하면 고를 것이 없어 고르개가 없다
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});

describe('QA 리포트 › 끝 검사에서 나온 가장자리', () => {
  it('아직 다 돌기 전인 줄은 끝난 시각 대신 진행 중만 보이고, 모르는 종류 값이 와도 화면이 서 있다', async () => {
    vi.spyOn(qaReportApi, 'list').mockResolvedValue({ items: [줄({ finishedAt: null, running: 2, kinds: ['FN', 'API' as 'FN'] })], total: 1 });
    render(<QaReports service={앱} tab="app" />);
    const 한줄 = within(await screen.findByRole('listitem'));
    expect(한줄.getByText('qa · 버전 1')).toBeTruthy();
    expect(한줄.queryByText(/마지막 실행/)).toBeNull();
    expect(한줄.getByText('진행 중')).toBeTruthy();
    expect(한줄.getByText('API')).toBeTruthy();
  });

  it('두 번째 쪽이 비어도 이전으로 돌아갈 단추가 있다', async () => {
    const 부름 = vi
      .spyOn(qaReportApi, 'list')
      .mockResolvedValueOnce({ items: Array.from({ length: 50 }, (_, i) => 줄({ id: i + 1, buildNo: String(i + 1) })), total: 50 })
      .mockResolvedValueOnce({ items: [], total: 50 });
    render(<QaReports service={앱} tab="app" />);
    fireEvent.click(await screen.findByRole('button', { name: '다음' }));
    await waitFor(() => expect(부름).toHaveBeenLastCalledWith('DMW', { page: 2 }));
    expect(await screen.findByRole('button', { name: '이전' })).toBeTruthy();
    expect(screen.queryByText('아직 QA 리포트가 없습니다')).toBeNull();
  });

  it('대상 서버가 하나뿐이면 고르개가 없으니 주소의 대상 서버로 거르지 않는다', async () => {
    window.location.hash = '#/qa-reports?env=qa';
    const 부름 = vi.spyOn(qaReportApi, 'list').mockResolvedValue({ items: [], total: 0 });
    render(<QaReports service={{ ...앱, envs: [앱.envs[0]!] }} tab="app" />);
    await screen.findByText('아직 QA 리포트가 없습니다');
    expect(부름).toHaveBeenLastCalledWith('DMW', { page: 1 });
  });
});

describe('QA 리포트 › 탭', () => {
  it('탭 둘은 주소다. 프로젝트 탭은 애플리케이션 목록을 부르지 않는다', () => {
    const 부름 = vi.spyOn(qaReportApi, 'list');
    vi.spyOn(qaReportApi, 'projectList').mockReturnValue(new Promise(() => undefined));
    render(<QaReports service={앱} tab="project" />);
    const 탭줄 = within(screen.getByRole('navigation', { name: '리포트 종류' }));
    expect(탭줄.getByRole('link', { name: '애플리케이션' }).getAttribute('href')).toBe('#/qa-reports');
    expect(탭줄.getByRole('link', { name: '프로젝트' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('데모마켓 프로젝트의 모든 애플리케이션을 기간 단위로 묶어 보여 줍니다')).toBeTruthy();
    expect(부름).not.toHaveBeenCalled();
  });
});

describe('QA 리포트 › 프로젝트 탭', () => {
  it('그 프로젝트의 리포트를 최근 차례로 보이고, 줄은 앱 안 리포트 보기로 간다', async () => {
    const 부름 = vi.spyOn(qaReportApi, 'projectList').mockResolvedValue({
      items: [
        { id: 5, from: '2026-11-10', to: '2026-11-14', origin: 'SCHEDULED', createdBy: '스케줄러', createdAt: '2026-11-14T09:00:00Z' },
        { id: 4, from: '2026-11-01', to: '2026-11-14', origin: 'MANUAL', createdBy: '김하늘', createdAt: '2026-11-14T04:20:00Z' },
      ],
      total: 2,
    });
    render(<QaReports service={앱} tab="project" />);
    const 줄들 = await screen.findAllByRole('listitem');
    expect(부름).toHaveBeenCalledWith(10, 1);
    expect(within(줄들[0]!).getByText('11/10 ~ 11/14')).toBeTruthy();
    expect(within(줄들[0]!).getByText('자동')).toBeTruthy();
    expect(within(줄들[1]!).getByText('직접 만듦 · 김하늘')).toBeTruthy();
    expect(within(줄들[0]!).getByRole('link').getAttribute('href')).toBe('#/qa-reports/project/5');
    // 쓰기 권한이 없으면 만들기 단추가 없다
    expect(screen.queryByRole('button', { name: '리포트 만들기' })).toBeNull();
  });

  it('리포트 만들기 — 이번 주 · 이번 달 · 직접 선택한 기간을 이 브라우저 시간대로 보내고 새 리포트로 간다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-15T03:00:00Z'));
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ timeZone: 'Asia/Seoul' } as Intl.ResolvedDateTimeFormatOptions);
    vi.spyOn(qaReportApi, 'projectList').mockResolvedValue({ items: [], total: 0 });
    const 만들기 = vi.spyOn(qaReportApi, 'projectCreate').mockResolvedValue({ id: 9 });
    render(<QaReports service={앱} tab="project" 쓰나 />);
    fireEvent.click(await screen.findByRole('button', { name: '리포트 만들기' }));
    expect(screen.getByText('2026-11-09 ~ 2026-11-15 · 기간은 92일까지 선택할 수 있습니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '이번 달' }));
    expect(screen.getByText('2026-11-01 ~ 2026-11-15 · 기간은 92일까지 선택할 수 있습니다')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '직접 선택' }));
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));
    await waitFor(() => expect(window.location.hash).toBe('#/qa-reports/project/9'));
    expect(만들기).toHaveBeenCalledWith(10, '2026-10-01', '2026-11-15', 'Asia/Seoul');
    vi.useRealTimers();
  });

  it('서버가 기간을 거절하면 까닭을 보이고 창을 둔다', async () => {
    vi.spyOn(qaReportApi, 'projectList').mockResolvedValue({ items: [], total: 0 });
    vi.spyOn(qaReportApi, 'projectCreate').mockRejectedValue(new ApiError(400, 'INVALID_REQUEST', '기간은 92일까지입니다'));
    render(<QaReports service={앱} tab="project" 쓰나 />);
    fireEvent.click(await screen.findByRole('button', { name: '리포트 만들기' }));
    fireEvent.click(screen.getByRole('button', { name: '만들기' }));
    expect((await screen.findByRole('alert')).textContent).toContain('기간은 92일까지입니다');
    expect(screen.getByRole('button', { name: '만들기' })).toBeTruthy();
  });
});
