// @vitest-environment jsdom
// 실행 창의 시험 실행 결과 — 알약 점수 · 실패 카드 · 바닥 단추 (도메인/실행 §8.16 ④ · 시안 A ④)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { api, type TrialResult } from './api.js';
import { 그린다, 서비스, 케이스, 시작누름 } from './runPick.fixture.js';
import { RunPickModal } from './RunPickModal.js';
import { 장면통로 } from './TrialLive.js';
import { 둘째, 둘을연다, 시험시작, 실패, 차례대로, 통과 } from './trialRun.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('완료 창', () => {
  it('통과 · 실패 수와 실패한 단계 · 까닭을 보이고, 「실패 1건 다시 시험」은 실패한 것만 다시 돈다', async () => {
    차례대로({ 't-ZRS-001': [{ status: 'DONE', result: 통과 }], 't-ZRS-002': [{ status: 'DONE', result: 실패 }] });
    둘을연다();
    시험시작();

    expect(await screen.findByRole('dialog', { name: '시험 실행 결과' }, { timeout: 4000 })).toBeTruthy();
    expect(document.querySelector('.trial-sum .pill.pass b')?.textContent).toBe('1');
    expect(document.querySelector('.trial-sum .pill.fail b')?.textContent).toBe('1');
    expect(document.querySelector('.trial-sum .pill.zero')?.textContent).toBe('미실행 0');
    expect(screen.getByText('2단계 · 수량을 3으로 바꾼다')).toBeTruthy();
    expect(screen.getByText('수량 칸을 찾지 못했습니다')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '실패 1건 다시 시험' }));
    await waitFor(() => expect(api.startTrial).toHaveBeenCalledTimes(3));
    expect(vi.mocked(api.startTrial).mock.calls[2]?.[0]).toBe('ZRS-002');
  });

  it('실패 줄은 케이스 줄 아래에 단계 · 유형 · 한국어 한 줄로 서고 러너 원문은 접힌 「원문 보기」 안에만 있다', async () => {
    const 원문 = "Error: Can't call click on element with selector \"id=buy_now_button\" because element wasn't found";
    const 깨짐: TrialResult = { ...실패, steps: [실패.steps[0]!, { ...실패.steps[1]!, error: { message: 원문 } }] };
    차례대로({
      't-ZRS-001': [{ status: 'DONE', result: 통과, failure: null }],
      't-ZRS-002': [{ status: 'DONE', result: 깨짐, failure: { type: 'notFound', reason: '구매하기 단추를 찾지 못했습니다' } }],
    });
    둘을연다();
    시험시작();

    await screen.findByRole('dialog', { name: '시험 실행 결과' }, { timeout: 4000 });
    const 줄 = document.querySelector('.trial-res li.bad') as HTMLElement;
    const 실패줄 = 줄.querySelector('.why') as HTMLElement;
    expect(within(실패줄).getByText('2단계 · 수량을 3으로 바꾼다')).toBeTruthy();
    expect(within(실패줄).getByText('요소를 찾지 못함')).toBeTruthy();
    expect(within(실패줄).getByText('구매하기 단추를 찾지 못했습니다')).toBeTruthy();
    const 접힘 = within(실패줄).getByText('원문 보기').closest('details') as HTMLDetailsElement;
    expect(접힘.open).toBe(false);
    expect(접힘.textContent).toContain('buy_now_button');
    expect(줄.querySelector('.nm')?.textContent).toBe('둘째 케이스');
  });

  it('실패한 확인의 기대 · 실제 값을 한 줄로 보이고 값이 없으면 줄을 안 그린다', async () => {
    const 깨짐: TrialResult = {
      ...실패,
      steps: [실패.steps[0]!, { ...실패.steps[1]!, assertions: [{ statement: '체크한 줄이 지워진다', status: 'FAIL', actual: 1, expected: 0 }] }],
    };
    차례대로({ 't-ZRS-001': [{ status: 'DONE', result: 통과 }], 't-ZRS-002': [{ status: 'DONE', result: 깨짐 }] });
    둘을연다();
    시험시작();

    await screen.findByRole('dialog', { name: '시험 실행 결과' }, { timeout: 4000 });
    expect(document.querySelector('.trial-res li.bad .why .got')?.textContent).toBe('기대 0 · 실제 1');
  });

  it('러너에 못 닿은 미실행은 서버 안내 문장을 실패 줄에 한 번만 두고 「원문 보기」를 안 단다', async () => {
    const 못닿음: TrialResult = { status: 'NA', durationMs: 10, steps: [], error: { message: '러너에 닿지 못했습니다' } };
    차례대로({
      't-ZRS-001': [{ status: 'DONE', result: 통과, failure: null }],
      't-ZRS-002': [{ status: 'DONE', result: 못닿음, failure: { type: 'environment', reason: '러너에 닿지 못했습니다' } }],
    });
    둘을연다();
    시험시작();

    await screen.findByRole('dialog', { name: '시험 실행 결과' }, { timeout: 4000 });
    const 실패줄 = [...document.querySelectorAll('.trial-res .why')];
    expect(실패줄).toHaveLength(1);
    expect(within(실패줄[0] as HTMLElement).getAllByText('러너에 닿지 못했습니다')).toHaveLength(1);
    expect(within(실패줄[0] as HTMLElement).queryByText('원문 보기')).toBeNull();
  });

  it('「재실행」은 정식 실행 시작 확인 창을 거쳐 같은 케이스를 걸고 값 창으로 돌아간다 — 거절 사유가 그 바닥에 뜬다', async () => {
    차례대로({ 't-ZRS-001': [{ status: 'DONE', result: 통과 }], 't-ZRS-002': [{ status: 'DONE', result: 통과 }] });
    const onRun = 둘을연다();
    시험시작();

    await screen.findByRole('dialog', { name: '시험 실행 결과' }, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: '재실행' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: '정식 실행을 시작할까요?' })).getByRole('button', { name: '실행 시작' }));
    expect(onRun.mock.calls[0]?.[0]).toMatchObject({ env: 'qa', items: [{ tcId: 'ZRS-001' }, { tcId: 'ZRS-002' }] });
    expect(screen.getByLabelText('대상 서버')).toBeTruthy();
  });

  it('「닫기」는 창을 닫고 「← 준비로 돌아가기」는 값 창으로 돌아간다', async () => {
    차례대로({ 't-ZRS-001': [{ status: 'DONE', result: 통과 }], 't-ZRS-002': [{ status: 'DONE', result: 통과 }] });
    localStorage.clear();
    vi.spyOn(api, 'paramSets').mockResolvedValue({ items: [] });
    vi.spyOn(장면통로, '받기').mockResolvedValue({ 종류: 'empty' });
    const 닫기 = vi.fn();
    render(<RunPickModal 케이스들={[케이스, 둘째]} service={서비스} onRun={vi.fn()} onClose={닫기} />);
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    시험시작();

    await screen.findByRole('dialog', { name: '시험 실행 결과' }, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: '← 준비로 돌아가기' }));
    expect(screen.getByLabelText('대상 서버')).toBeTruthy();
    expect(닫기).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '시험 실행' }));
    시작누름('시험 실행 시작');
    await screen.findByRole('dialog', { name: '시험 실행 결과' }, { timeout: 4000 });
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(닫기).toHaveBeenCalledTimes(1);
  });

  it('실패 카드 안에 단계 목록이 들고 실패 뒤 안 돈 단계는 「실행 안 함」이다. 둘째 실패 카드부터 단계를 접고 원문 보기는 카드에 하나다', async () => {
    const 제목들 = ['로그인한다', '수량을 3으로 바꾼다', '담는다'];
    차례대로({
      't-ZRS-001': [{ status: 'RUNNING', stepTitles: 제목들 }, { status: 'DONE', result: 실패, failure: { type: 'notFound', reason: '수량 칸이 없습니다' } }],
      't-ZRS-002': [{ status: 'DONE', result: 실패, failure: { type: 'notFound', reason: '수량 칸이 없습니다' } }],
    });
    둘을연다();
    시험시작();

    await screen.findByRole('dialog', { name: '시험 실행 결과' }, { timeout: 6000 });
    const [첫카드, 둘째카드] = [...document.querySelectorAll('.trial-res > li.bad')] as HTMLElement[];
    const 첫단계 = within(첫카드!.querySelector('.trial-res-steps') as HTMLElement);
    expect(첫단계.getByText('담는다').closest('li')?.textContent).toContain('실행 안 함');
    expect(within(첫카드!).getAllByText('원문 보기')).toHaveLength(1);

    expect(둘째카드!.querySelector('.trial-res-steps')).toBeNull();
    fireEvent.click(within(둘째카드!).getByRole('button', { name: '단계 펼치기 ▾' }));
    expect(둘째카드!.querySelector('.trial-res-steps')).not.toBeNull();
  }, 10000);

  it('줄 시간은 누른 때부터 끝난 결과를 받을 때까지 사람이 기다린 시간을 초 단위로 적는다 — 늦춘 1초를 뺀 러너 값이 아니다', async () => {
    let 지금 = 100_000;
    vi.spyOn(Date, 'now').mockImplementation(() => 지금);
    vi.spyOn(api, 'startTrial').mockResolvedValue({ trialId: 't1' });
    vi.spyOn(api, 'getTrial').mockImplementation(() => {
      지금 += 7_600;
      return Promise.resolve({ status: 'DONE', result: 통과 });
    });
    await 그린다();
    fireEvent.change(screen.getByLabelText('대상 서버'), { target: { value: 'qa' } });
    시험시작();

    await screen.findByRole('dialog', { name: '시험 실행 결과' }, { timeout: 4000 });
    expect(document.querySelector('.trial-res .dur')?.textContent).toBe('8초');
    expect(document.querySelector('.trial-sum .r')?.textContent).toContain('총 8초');
  });
});
