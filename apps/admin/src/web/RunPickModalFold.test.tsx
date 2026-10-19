// @vitest-environment jsdom
// 여러 건 실행 창의 값 접기 검사 (도메인/실행 §8.10). 2026-10-19 부터 휴대폰만이 아니라 PC 도 접힌 채 시작한다
// 접고 펴는 것은 styles.css 의 규칙 하나다(jsdom 은 CSS 를 안 읽는다) — 여기서는 어느 칸이 「편 것」인지와 그 규칙이 창 폭에 안 묶였는지를 본다

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

describe('실행 창 — 값 접기', () => {
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

describe('접는 규칙은 창 폭에 묶이지 않는다 (PC 도 접힌 채 시작)', () => {
  const 읽기 = (이름: string) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), 이름), 'utf8');
  const 숨김규칙 = '.prow:has(.prow-fold) + .prow-edit:not(.open)';

  it('styles.css 가 미디어 질의 밖에서 접힌 값 칸을 숨긴다', () => {
    const css = 읽기('styles.css');
    const 자리 = css.indexOf(숨김규칙);
    expect(자리, '접힌 값 칸을 숨기는 규칙이 없다').toBeGreaterThan(-1);
    expect(css.slice(자리, css.indexOf('}', 자리))).toMatch(/display:\s*none/);
    const 앞 = css.slice(0, 자리);
    expect((앞.match(/\{/g) ?? []).length - (앞.match(/\}/g) ?? []).length, '규칙이 @media 안에 있다').toBe(0);
  });

  it('phone.css 가 「값」 단추를 PC 에서 숨기지 않는다', () => {
    const css = 읽기('phone.css');
    const 미디어앞 = css.slice(0, css.indexOf('@media (max-width: 620px)'));
    expect(미디어앞).not.toContain('.prow-fold');
    expect(css).not.toContain(숨김규칙);
  });

  it('처음부터 PC 에서도 값이 있는 케이스에 「값」 단추가 있고 접혀 있다', () => {
    그리기([케이스('ZPF-001', 아이디스키마), 케이스('ZPF-002', 개수스키마)]);
    expect(screen.getAllByRole('button', { name: '값' })).toHaveLength(2);
    expect(편칸()).toBe(0);
  });
});
