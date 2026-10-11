// @vitest-environment jsdom
// 휴대폰 실행 창의 값 접기 검사 (도메인/실행 §8.10 「칸은 접지 않는다」의 휴대폰 예외 · 화면공통 §8 「휴대폰 화면」)
// 접고 펴는 것은 phone.css 가 창 620px 미만에서만 한다 — 여기서는 어느 칸이 「편 것」인지만 본다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import type { CaseRow, JsonSchema, ServiceRow } from './api.js';
import { RunPickModal } from './RunPickModal.js';

afterEach(() => {
  cleanup();
});

const 아이디스키마: JsonSchema = {
  type: 'object',
  properties: { userId: { type: 'string', description: '아이디', default: 'zpf-기본' } },
  required: ['userId'],
};

const 개수스키마: JsonSchema = { type: 'object', properties: { count: { type: 'integer', description: '개수' } }, required: ['count'] };

function 케이스(tcId: string, paramSchema: JsonSchema): CaseRow {
  return {
    tcId,
    name: `${tcId} 케이스`,
    platforms: ['desktop'],
    precondition: [],
    filePath: `tests/${tcId}.spec.ts`,
    paramSchema,
    expectedSchema: {},
    isActive: true,
    scannedAt: '2026-10-12T00:00:00.000Z',
  };
}

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZPF',
  name: '결제',
  color: '#123456',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

function 그리기(케이스들: CaseRow[]) {
  render(<RunPickModal 케이스들={케이스들} service={서비스} onRun={vi.fn()} onClose={vi.fn()} />);
}

const 편칸 = () => document.querySelectorAll('.prow-edit.open').length;

describe('휴대폰 실행 창 — 값 접기', () => {
  it('여러 건이면 값이 있는 케이스에만 「값」 버튼이 있고 처음엔 접혀 있다', () => {
    그리기([케이스('ZPF-001', {}), 케이스('ZPF-002', 아이디스키마)]);
    const 버튼들 = screen.getAllByRole('button', { name: '값' });
    expect(버튼들).toHaveLength(1);
    expect(버튼들[0]!.getAttribute('aria-expanded')).toBe('false');
    expect(편칸()).toBe(0);
  });

  it('「값」을 누르면 펴고 다시 누르면 접는다', () => {
    그리기([케이스('ZPF-001', 아이디스키마), 케이스('ZPF-002', 아이디스키마)]);
    const [첫] = screen.getAllByRole('button', { name: '값' });
    fireEvent.click(첫!);
    expect(첫!.getAttribute('aria-expanded')).toBe('true');
    expect(편칸()).toBe(1);
    fireEvent.click(첫!);
    expect(편칸()).toBe(0);
  });

  it('실행을 눌렀는데 틀린 칸이 있으면 그 케이스를 편다 — 고쳐서 사유가 사라져도 닫지 않는다', () => {
    그리기([케이스('ZPF-001', 아이디스키마), 케이스('ZPF-002', 개수스키마)]);
    const 칸 = screen.getByLabelText('개수');
    fireEvent.change(칸, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: '실행' }));
    const [첫, 둘째] = screen.getAllByRole('button', { name: '값' });
    expect(첫!.getAttribute('aria-expanded')).toBe('false');
    expect(둘째!.getAttribute('aria-expanded')).toBe('true');
    fireEvent.change(칸, { target: { value: '3' } });
    expect(둘째!.getAttribute('aria-expanded')).toBe('true');
  });

  it('한 건이면 접지 않는다 — 「값」 버튼이 없다', () => {
    그리기([케이스('ZPF-003', 아이디스키마)]);
    expect(screen.queryByRole('button', { name: '값' })).toBeNull();
  });
});
