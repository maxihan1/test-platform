// @vitest-environment jsdom
// 실행 창이 케이스 한 건으로 열렸을 때 — 실행 걸기 · 제목 · 디바이스 · 실행 위치 · 고친 칸 검사 (도메인/실행 §8.10)
// 한 건짜리 실행 설정 화면이 지키던 동작을 창 기준으로 지킨다

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';

import type { CaseRow } from './api.js';
import { 그린다, 비밀스키마, 사람, 케이스 } from './runPick.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 실행버튼 = () => screen.getByRole('button', { name: '실행' }) as HTMLButtonElement;
const 서버고르기 = (env = 'qa') => fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: env } });
const 줄 = () => screen.getByRole('status');

describe('한 건 창 — 실행 걸기 (SPEC §8.2)', () => {
  it('대상 서버를 고르지 않고 실행을 누르면 안 걸리고 사유가 화면 글자로 뜬다', async () => {
    const { onRun } = await 그린다();

    expect(실행버튼().disabled).toBe(false);
    fireEvent.click(실행버튼());

    expect(onRun).not.toHaveBeenCalled();
    expect(screen.getByText('대상 서버를 고르세요. 증적에는 어느 서버에서 실행했는지가 꼭 남아야 합니다.')).toBeTruthy();
  });

  it('대상 서버를 고르면 그 서버로 걸린다', async () => {
    const { onRun } = await 그린다();

    서버고르기('stage');
    fireEvent.click(실행버튼());

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onRun.mock.calls[0]?.[0].env).toBe('stage');
  });

  it('여는 쪽이 준 초기서버가 이 서비스에 있으면 그 서버가 골라진 채로 열린다', async () => {
    const { onRun } = await 그린다(케이스, 사람, { 초기서버: 'stage' });

    expect((screen.getByLabelText('대상 서버') as HTMLSelectElement).value).toBe('stage');
    fireEvent.click(실행버튼());

    expect(onRun.mock.calls[0]?.[0].env).toBe('stage');
  });

  it('초기서버가 이 서비스에 없는 이름이면 고르지 않은 채로 연다', async () => {
    await 그린다(케이스, 사람, { 초기서버: 'prod' });

    expect((screen.getByLabelText('대상 서버') as HTMLSelectElement).value).toBe('');
  });

  it('만들어질 항목이 1000건을 넘으면 실행 버튼이 죽고 지금 건수를 함께 적는다', async () => {
    const { onRun } = await 그린다();
    서버고르기();

    fireEvent.change(screen.getByLabelText('반복'), { target: { value: '1001' } });

    expect(실행버튼().disabled).toBe(true);
    expect(줄().textContent).toBe('한 번에 1000건까지 만들 수 있습니다 (지금 1001건)');
    fireEvent.click(실행버튼());
    expect(onRun).not.toHaveBeenCalled();
  });

  it('딱 1000건은 막지 않는다', async () => {
    const { onRun } = await 그린다();
    서버고르기();

    fireEvent.change(screen.getByLabelText('반복'), { target: { value: '1000' } });

    expect(실행버튼().disabled).toBe(false);
    expect(줄().textContent).toBe('실행 항목이 1000건 생깁니다');
    fireEvent.click(실행버튼());
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('비밀값 칸은 가려서 입력받고 글자로 되돌려 보여주지 않는다', async () => {
    await 그린다({ ...케이스, paramSchema: 비밀스키마 });

    const 칸 = screen.getByLabelText('비밀번호') as HTMLInputElement;
    expect(칸.type).toBe('password');

    fireEvent.change(칸, { target: { value: 'hunter2' } });
    expect((screen.getByLabelText('비밀번호') as HTMLInputElement).type).toBe('password');
    expect(screen.queryByText('hunter2')).toBeNull();
  });

  it('사전조건과 실행자가 보이고 실행자는 고칠 칸이 아니다', async () => {
    await 그린다();

    expect(screen.getByText('로그인되어 있다')).toBeTruthy();
    expect(screen.getByText('실행자 김실행')).toBeTruthy();
    expect(screen.queryByLabelText('실행자')).toBeNull();
  });
});

describe('한 건 창 — 제목 · 디바이스 · 실행 위치', () => {
  const 둘다: CaseRow = { ...케이스, platforms: ['desktop', 'mobile'] };

  it('제목 칸은 「{tcId} 실행」으로 열리고 고친 값이 title 로 나간다', async () => {
    const { onRun } = await 그린다();
    서버고르기();
    expect((screen.getByLabelText('실행 제목') as HTMLInputElement).value).toBe('ZRS-001 실행');

    fireEvent.change(screen.getByLabelText('실행 제목'), { target: { value: '  결제 회귀  ' } });
    fireEvent.click(실행버튼());

    expect(onRun.mock.calls[0]?.[0].title).toBe('결제 회귀');
  });

  it('제목을 비우면 「{tcId} 실행」이 title 로 나간다', async () => {
    const { onRun } = await 그린다();
    서버고르기();

    fireEvent.change(screen.getByLabelText('실행 제목'), { target: { value: '   ' } });
    fireEvent.click(실행버튼());

    expect(onRun.mock.calls[0]?.[0].title).toBe('ZRS-001 실행');
  });

  it('디바이스를 하나 끄면 켜 둔 것만 platforms 로 나간다', async () => {
    const { onRun } = await 그린다(둘다);
    서버고르기();

    fireEvent.click(screen.getByRole('checkbox', { name: 'PC' }));
    fireEvent.click(실행버튼());

    expect(onRun.mock.calls[0]?.[0].items[0]?.platforms).toEqual(['mobile']);
  });

  it('디바이스를 다 끄면 걸리지 않고 사유를 보인다', async () => {
    const { onRun } = await 그린다(둘다);
    서버고르기();

    fireEvent.click(screen.getByRole('checkbox', { name: 'PC' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '모바일' }));
    fireEvent.click(실행버튼());

    expect(onRun).not.toHaveBeenCalled();
    expect(줄().textContent).toBe('실행할 디바이스를 하나 이상 고르세요.');
  });

  it('Android 앱을 고르면 실행 요청에 location: local 이 실린다', async () => {
    const { onRun } = await 그린다({ ...케이스, platforms: ['android'] });
    서버고르기();

    expect(screen.getByText('실행 위치')).toBeTruthy();
    fireEvent.click(실행버튼());

    expect(onRun.mock.calls[0]?.[0].location).toBe('local');
  });

  it('브라우저만 돌리면 location 을 싣지 않고 고르개도 없다', async () => {
    const { onRun } = await 그린다();
    서버고르기();

    fireEvent.click(실행버튼());

    expect(screen.queryByText('실행 위치')).toBeNull();
    expect(onRun.mock.calls[0]?.[0].location).toBeUndefined();
  });
});

describe('한 건 창 — 고친 칸 검사', () => {
  it('고친 칸이 명세와 틀리면 걸리지 않고 칸 아래와 줄에 사유가 뜬다', async () => {
    const { onRun } = await 그린다({ ...케이스, paramSchema: { type: 'object', properties: { count: { type: 'integer', description: '개수' } }, required: ['count'] } });
    서버고르기();

    fireEvent.change(screen.getByLabelText('개수'), { target: { value: 'abc' } });
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(실행버튼());

    expect(onRun).not.toHaveBeenCalled();
    expect(줄().textContent).toBe('입력값이 명세와 맞지 않습니다.');
    expect(document.querySelector('.prow-edit .err')).not.toBeNull();
  });
});
