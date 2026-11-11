// 케이스 실행 분배가 실행 전 준비를 어떻게 타는지 본다 — 실패면 안 돌리고 닫고, 멈춤이면 덮지 않는다 (도메인/실행 §3.2 「실행 전 준비」)

import { describe, expect, it, vi } from 'vitest';

import { dispatch } from './dispatcher.js';
import { 준비실패로닫는다, 준비하고돌린다 } from './prep.js';
import { callRunner } from './runner.js';
import { finishRun, type PendingItem } from './store.js';

vi.mock('./runner.js', async (원본) => ({ ...(await 원본<typeof import('./runner.js')>()), callRunner: vi.fn() }));
vi.mock('./store.js', () => ({ finishItem: vi.fn(async () => undefined), finishRun: vi.fn(async () => undefined) }));
vi.mock('./notify.js', () => ({ notifyRun: vi.fn(async () => undefined) }));
vi.mock('./traceIngest.js', () => ({ trace적재를맡긴다: vi.fn(async () => undefined) }));
vi.mock('../apidoc/runCompare.js', () => ({ 실행문서견주기: vi.fn(async () => undefined) }));
vi.mock('./buildRun.js', () => ({ 스모크뒤: vi.fn(async () => undefined) }));
vi.mock('../bts/deployFlow.js', () => ({ 배포실행뒤: vi.fn(async () => undefined) }));
vi.mock('../bts/testFixRerun.js', () => ({ 테스트수정실행뒤: vi.fn(async () => undefined) }));
vi.mock('../bts/failReport.js', () => ({ 실패등록: vi.fn(async () => undefined) }));
vi.mock('./prep.js', () => ({ 준비를끊는다: vi.fn(), 준비실패로닫는다: vi.fn(async () => true), 준비하고돌린다: vi.fn() }));

const 항목 = (historyId: number): PendingItem => ({
  historyId,
  tcId: `XDP-${String(historyId)}`,
  platform: 'desktop',
  filePath: 'x.spec.ts',
  params: {},
  expected: {},
  baseUrl: 'https://qa.example.com',
  timeoutMs: 1000,
} as unknown as PendingItem);

describe('실행 전 준비', () => {
  it('준비가 실패하면 항목을 안 돌리고 그 까닭으로 준비 실패로 닫은 뒤 실행 끝 뒷일은 탄다', async () => {
    vi.mocked(준비하고돌린다).mockResolvedValueOnce({ 결과: '실패', note: 'HTTP 500 · seed failed' });

    await dispatch(9301, [항목(1), 항목(2)]);

    expect(callRunner).not.toHaveBeenCalled();
    expect(준비실패로닫는다).toHaveBeenCalledWith(9301, 'HTTP 500 · seed failed');
    expect(finishRun).toHaveBeenCalledWith(9301);
  });

  it('준비 중에 멈췄으면 준비 실패로 닫지 않는다 — 멈추기가 이미 닫았다', async () => {
    vi.mocked(준비실패로닫는다).mockClear();
    vi.mocked(준비하고돌린다).mockResolvedValueOnce({ 결과: '멈춤' });

    await dispatch(9302, [항목(1)]);

    expect(callRunner).not.toHaveBeenCalled();
    expect(준비실패로닫는다).not.toHaveBeenCalled();
  });
});
