// @vitest-environment jsdom
// QA 리포트 목록 화면 검사 (도메인/리포팅 §8.21 「애플리케이션 탭」 · 「프로젝트 탭」)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import type { ServiceRow } from './api.js';
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

describe('QA 리포트 › 탭', () => {
  it('탭 둘은 주소다. 프로젝트 탭은 애플리케이션 목록을 부르지 않는다', () => {
    const 부름 = vi.spyOn(qaReportApi, 'list');
    render(<QaReports service={앱} tab="project" />);
    const 탭줄 = within(screen.getByRole('navigation', { name: '리포트 종류' }));
    expect(탭줄.getByRole('link', { name: '애플리케이션' }).getAttribute('href')).toBe('#/qa-reports');
    expect(탭줄.getByRole('link', { name: '프로젝트' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('데모마켓 프로젝트의 모든 애플리케이션을 기간 단위로 묶어 보여 줍니다')).toBeTruthy();
    expect(부름).not.toHaveBeenCalled();
  });
});
