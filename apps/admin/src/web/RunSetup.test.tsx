// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type CaseRow, type ServiceRow, type User } from './api.js';
import { RunSetup } from './RunSetup.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 케이스: CaseRow = {
  tcId: 'ZRS-001',
  name: '실행 설정 케이스',
  platforms: ['desktop'],
  precondition: [],
  filePath: 'tests/ZRS-001.spec.ts',
  paramSchema: {},
  expectedSchema: {},
  isActive: true,
  scannedAt: '2026-09-21T00:00:00.000Z',
};

const 서비스: ServiceRow = {
  id: 1,
  prefix: 'ZRS',
  name: '실행 서비스',
  color: '#3A5FCD',
  envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  hasSlackWebhook: false,
};

const 사람: User = {
  username: 'zrs1',
  displayName: '김실행',
  role: 'operator',
  services: [서비스],
};

async function 그린다(row: CaseRow = 케이스) {
  vi.spyOn(api, 'caseOf').mockResolvedValue(row);
  vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
  const 만들기 = vi.spyOn(api, 'createRun').mockResolvedValue({ runId: 5 });
  render(<RunSetup tcId={row.tcId} service={서비스} user={사람} />);
  await screen.findByDisplayValue(`${row.tcId} 실행`);
  return 만들기;
}

function 실행버튼() {
  return screen.getByText('실행') as HTMLButtonElement;
}

describe('실행 설정 화면 (SPEC §8.2)', () => {
  it('대상 서버를 고르지 않고 실행을 누르면 실행이 걸리지 않고 사유가 화면 글자로 뜬다', async () => {
    const 만들기 = await 그린다();

    expect(실행버튼().disabled).toBe(false);
    fireEvent.click(실행버튼());

    expect(만들기).not.toHaveBeenCalled();
    expect(screen.getByText('대상 서버를 고르세요. 어느 서버에 쐈는지가 증적의 전제입니다.')).toBeTruthy();
  });

  it('대상 서버를 고르면 그 서버로 실행이 걸린다', async () => {
    const 만들기 = await 그린다();

    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    fireEvent.click(실행버튼());

    expect(만들기).toHaveBeenCalledTimes(1);
    expect(만들기.mock.calls[0]?.[0].env).toBe('qa');
  });

  it('만들어질 실행 항목이 1000건을 넘으면 실행 버튼이 죽고 지금 건수를 함께 적는다', async () => {
    const 만들기 = await 그린다();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });

    fireEvent.change(screen.getByLabelText('반복 횟수'), { target: { value: '1001' } });

    expect(실행버튼().disabled).toBe(true);
    expect(screen.getByText('한 번에 1000건까지 만들 수 있습니다 (지금 1001건)')).toBeTruthy();
    fireEvent.click(실행버튼());
    expect(만들기).not.toHaveBeenCalled();
  });

  it('딱 1000건은 막지 않는다', async () => {
    const 만들기 = await 그린다();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });

    fireEvent.change(screen.getByLabelText('반복 횟수'), { target: { value: '1000' } });

    expect(실행버튼().disabled).toBe(false);
    expect(screen.getByText('실행 항목이 1000건 생깁니다')).toBeTruthy();
    fireEvent.click(실행버튼());
    expect(만들기).toHaveBeenCalledTimes(1);
  });

  it('비밀값 칸은 가려서 입력받고 글자로 되돌려 보여주지 않는다', async () => {
    await 그린다({
      ...케이스,
      paramSchema: {
        type: 'object',
        properties: { password: { type: 'string', description: '비밀번호' } },
        required: ['password'],
      },
    });

    const 칸 = screen.getByLabelText('비밀번호') as HTMLInputElement;
    expect(칸.type).toBe('password');

    fireEvent.change(칸, { target: { value: 'hunter2' } });
    expect((screen.getByLabelText('비밀번호') as HTMLInputElement).type).toBe('password');
    expect(screen.queryByText('hunter2')).toBeNull();
  });
});
