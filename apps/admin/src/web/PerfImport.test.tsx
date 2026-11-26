// @vitest-environment jsdom
// 성능 마법사 1단계 가져오기 — Swagger · 스크립트 파일은 확인 창을 거쳐 AI 일을 맡긴다 (2026-11-26 사용자 · DESIGN.md 「모달」 ①)

import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { ServiceRow } from './api.js';
import { apiDocApi } from './apiDocApi.js';
import { perfApi } from './perfApi.js';
import { PerfImport } from './PerfImport.js';
import { 물음누름 } from './startConfirm.fixture.js';

const 앱 = { id: 7, prefix: 'ZPI', name: 'ZPI 웹', color: '#000', projectId: 3, projectName: '데모마켓', envs: [], hasSlackWebhook: false, permissions: { cases: 'read', runs: 'write', authoring: 'read' } } as ServiceRow;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('선택한 API 가져오기는 확인 창을 거친다 — 취소하면 맡기지 않는다', async () => {
  vi.spyOn(apiDocApi, 'list').mockResolvedValue({ docPath: null, docEnv: null, versions: [{ version: 3, source: 'FILE', env: null, fileName: 'a.json', createdAt: '', createdBy: null }] });
  vi.spyOn(apiDocApi, 'doc').mockResolvedValue({ version: 3, doc: { paths: { '/api/products': { get: { summary: '상품 목록' } } } } });
  const 초안 = vi.spyOn(perfApi, 'draft').mockReturnValue(new Promise(() => undefined));
  render(<PerfImport service={앱} 받음={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Swagger 가져오기' }));
  fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: '선택한 API 가져오기' }));
  expect(screen.getByRole('dialog', { name: '선택한 API 1건으로 트랜잭션 목록을 만들까요?' })).toBeTruthy();
  물음누름('취소');
  expect(초안).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '선택한 API 가져오기' }));
  물음누름('가져오기');
  await waitFor(() => expect(초안).toHaveBeenCalledWith({ serviceId: 7, from: 'SWAGGER', apiDocVersion: 3, operations: [{ method: 'GET', path: '/api/products' }] }));
});

it('스크립트 파일은 선택한 뒤 확인 창을 거쳐 업로드한다 — 취소하면 보내지 않는다', async () => {
  const 보냄 = vi.spyOn(perfApi, 'draftFile').mockReturnValue(new Promise(() => undefined));
  render(<PerfImport service={앱} 받음={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'JMeter · nGrinder 가져오기' }));
  const 파일 = new File(['<jmeterTestPlan/>'], 'order.jmx');
  fireEvent.change(screen.getByLabelText('.jmx 또는 nGrinder 스크립트 파일'), { target: { files: [파일] } });
  expect(screen.getByRole('dialog', { name: '「order.jmx」 파일로 트랜잭션 목록을 만들까요?' })).toBeTruthy();
  물음누름('취소');
  expect(보냄).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('.jmx 또는 nGrinder 스크립트 파일'), { target: { files: [파일] } });
  물음누름('가져오기');
  await waitFor(() => expect(보냄).toHaveBeenCalledWith(7, 파일));
});
