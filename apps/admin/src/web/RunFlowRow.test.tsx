// @vitest-environment jsdom
// 실행 차례 표의 줄 펼침 검사 — Fail 줄은 그 케이스 카드만 받고 그 밖의 줄은 항목 상세를 한 번 받는다 (도메인/실행 §8.3)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';

import { api, type 다시실행 } from './api.js';
import { 장치, 상세, 쪽, 케이스 } from './RunFailCard.fixture.js';
import { RUN_ID, 줄안, 항목, 흐름그리기 } from './RunFlow.fixture.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 누른다 = (tcId: string) => fireEvent.click(within(줄안(tcId)).getAllByRole('button')[0]!);
const 카드응답 = (tcId: string, historyId: number, platform: 'android' | 'desktop' | 'mobile' = 'android') =>
  쪽([케이스(tcId, `이름-${tcId}`, [장치(platform, historyId)])]);

describe('Fail 줄을 펼친다', () => {
  it('줄 전체가 단추이고 누르면 그 케이스의 카드만 받아 증거와 판정 줄을 그린다', async () => {
    const 부름 = vi.spyOn(api, 'failures').mockResolvedValue(카드응답('B', 2));
    흐름그리기([항목(1, 'A', 'android', 'FAIL'), 항목(2, 'B', 'android', 'FAIL')]);
    const 줄 = 줄안('B');
    const 단추 = 줄.querySelector('button.rf-line')!;
    expect(단추.getAttribute('aria-expanded')).toBe('false');
    expect(부름).not.toHaveBeenCalled();

    fireEvent.click(단추);

    await within(줄).findByText('가입 버튼을 누른다');
    expect(부름).toHaveBeenCalledTimes(1);
    expect(부름).toHaveBeenCalledWith(RUN_ID, 1, undefined, false, 'B');
    expect(단추.getAttribute('aria-expanded')).toBe('true');
    expect(within(줄).getByRole('link', { name: '테스트 작성 › 결정 필요에서 판정합니다' })).toBeTruthy();
    expect(within(줄).getByRole('link', { name: '상세' }).getAttribute('href')).toBe(`#/runs/${String(RUN_ID)}/items/2`);
  });

  it('접었다 다시 펴도 카드를 다시 받지 않는다', async () => {
    const 부름 = vi.spyOn(api, 'failures').mockResolvedValue(카드응답('A', 1));
    흐름그리기([항목(1, 'A', 'android', 'FAIL')]);

    누른다('A');
    await within(줄안('A')).findByText('가입 버튼을 누른다');
    누른다('A');
    expect(줄안('A').querySelector('.rf-line')?.getAttribute('aria-expanded')).toBe('false');
    누른다('A');

    expect(부름).toHaveBeenCalledTimes(1);
  });

  it('고른 디바이스를 카드 통로에 같이 보낸다', async () => {
    const 부름 = vi.spyOn(api, 'failures').mockResolvedValue(카드응답('A', 1, 'mobile'));
    흐름그리기([항목(1, 'A', 'desktop', 'FAIL'), 항목(2, 'A', 'mobile', 'FAIL')], { device: 'mobile', columns: ['mobile'] });

    누른다('A');

    await waitFor(() => expect(부름).toHaveBeenCalledWith(RUN_ID, 1, 'mobile', false, 'A'));
  });

  it('펼침이 보기에 쌓이고 다시 누르면 빠진다 — 주소에 남는 값이다', async () => {
    vi.spyOn(api, 'failures').mockResolvedValue(카드응답('A', 1));
    const { 마지막보기 } = 흐름그리기([항목(1, 'A', 'android', 'FAIL')]);

    누른다('A');
    expect(마지막보기().열린).toEqual(['A']);
    await within(줄안('A')).findByText('가입 버튼을 누른다');
    누른다('A');

    expect(마지막보기().열린).toEqual([]);
  });

  it('카드를 못 받으면 오류 한 줄을 적는다', async () => {
    vi.spyOn(api, 'failures').mockRejectedValue(new Error('카드를 못 읽었습니다'));
    흐름그리기([항목(1, 'A', 'android', 'FAIL')]);

    누른다('A');

    expect(await within(줄안('A')).findByText('카드를 못 읽었습니다')).toBeTruthy();
  });

  it('카드가 없는 케이스(한 건 실행이 덮어 지금은 실패가 아니다)는 항목 상세로 물러선다', async () => {
    vi.spyOn(api, 'failures').mockResolvedValue(쪽([]));
    const 읽기 = vi.spyOn(api, 'item').mockResolvedValue(상세(1, 'android'));
    흐름그리기([항목(1, 'A', 'android', 'FAIL')]);

    누른다('A');

    await within(줄안('A')).findByText('가입 버튼을 누른다');
    expect(읽기).toHaveBeenCalledWith(RUN_ID, 1);
  });

  it('도는 실행의 Fail 줄은 카드 통로(409)를 부르지 않고 항목 상세를 보인다', async () => {
    const 카드 = vi.spyOn(api, 'failures');
    const 읽기 = vi.spyOn(api, 'item').mockResolvedValue(상세(1, 'android'));
    흐름그리기([항목(1, 'A', 'android', 'FAIL')], { 끝났나: false });

    누른다('A');

    await within(줄안('A')).findByText('가입 버튼을 누른다');
    expect(카드).not.toHaveBeenCalled();
    expect(읽기).toHaveBeenCalledWith(RUN_ID, 1);
  });
});

describe('Pass · Not tested 줄을 펼친다', () => {
  it('누르면 항목 상세를 한 번 받고 접었다 다시 펴도 다시 받지 않는다', async () => {
    const 읽기 = vi.spyOn(api, 'item').mockResolvedValue(상세(1, 'android', { status: 'PASS', precondition: ['로그인된 상태'] }));
    흐름그리기([항목(1, 'A', 'android', 'PASS')]);
    expect(읽기).not.toHaveBeenCalled();

    누른다('A');
    expect(await within(줄안('A')).findByText('로그인된 상태')).toBeTruthy();
    누른다('A');
    누른다('A');

    expect(읽기).toHaveBeenCalledTimes(1);
    expect(읽기).toHaveBeenCalledWith(RUN_ID, 1);
  });

  it('디바이스마다 첫 회차 상세를 받고 디바이스 이름 머리와 「상세」 고리를 단다', async () => {
    const 읽기 = vi.spyOn(api, 'item').mockImplementation((_run, id) => Promise.resolve(상세(id, id === 11 ? 'desktop' : 'mobile', { precondition: [`사전조건 ${String(id)}`] })));
    흐름그리기([항목(12, 'A', 'desktop', 'PASS', { attempt: 2 }), 항목(11, 'A', 'desktop', 'PASS'), 항목(13, 'A', 'mobile', 'PASS')]);

    누른다('A');

    expect(await screen.findByText('사전조건 11')).toBeTruthy();
    expect(await screen.findByText('사전조건 13')).toBeTruthy();
    expect(읽기).toHaveBeenCalledTimes(2);
    const 머리들 = [...줄안('A').querySelectorAll('.rf-devh')];
    expect(머리들.map((머리) => 머리.querySelector('b')?.textContent)).toEqual(['PC', '모바일']);
    expect(머리들.map((머리) => 머리.querySelector('a')?.getAttribute('href'))).toEqual([`#/runs/${String(RUN_ID)}/items/11`, `#/runs/${String(RUN_ID)}/items/13`]);
  });

  it('한 디바이스를 못 불러오면 그 자리에 오류를 적고 다른 디바이스는 그린다', async () => {
    vi.spyOn(api, 'item').mockImplementation((_run, id) => (id === 1 ? Promise.reject(new Error('상세를 못 읽었습니다')) : Promise.resolve(상세(2, 'mobile'))));
    흐름그리기([항목(1, 'A', 'desktop', 'PASS'), 항목(2, 'A', 'mobile', 'PASS')]);

    누른다('A');

    expect(await within(줄안('A')).findByText('상세를 못 읽었습니다')).toBeTruthy();
    expect(await within(줄안('A')).findByText('가입 버튼을 누른다')).toBeTruthy();
  });

  it('깨진 회차가 있는 디바이스는 「상세」가 통과한 첫 회차가 아니라 깨진 회차로 간다 (점검 3.4)', () => {
    흐름그리기([항목(1, 'A', 'android', 'PASS'), 항목(2, 'A', 'android', 'FAIL', { attempt: 2 })], { 끝났나: false });

    누른다('A');

    expect(within(줄안('A')).getByRole('link', { name: '상세' }).getAttribute('href')).toBe(`#/runs/${String(RUN_ID)}/items/2`);
  });
});

describe('다시 실행한 줄', () => {
  const 한건번호 = 6001;
  const 덮음: 다시실행 = { runId: 한건번호, finishedAt: '2026-10-30T01:00:00.000Z', triggeredBy: '김실행', original: { historyId: 3, status: 'FAIL', finishedAt: '2026-10-29T01:00:00.000Z' } };

  it('한 건 실행이 덮은 줄은 꼬리표를 달고 상세는 한 건 실행 번호로 연다', async () => {
    const 읽기 = vi.spyOn(api, 'item').mockResolvedValue({ ...상세(9, 'android'), runId: 한건번호 });
    흐름그리기([항목(9, 'A', 'android', 'PASS', { rerun: 덮음 })]);

    expect(줄안('A').querySelector('.fc-tag')?.textContent).toMatch(/^다시 실행해서 Pass · .* · 김실행$/);
    누른다('A');

    await waitFor(() => expect(읽기).toHaveBeenCalledWith(한건번호, 9));
    expect(within(줄안('A')).getByRole('link', { name: '상세' }).getAttribute('href')).toBe(`#/runs/${String(한건번호)}/items/9`);
  });

  it('다시 돌린 결과가 있으면 줄 아래에 「RUN n에서 Pass」 고리가 붙고 없으면 줄이 없다', () => {
    흐름그리기([항목(1, 'A', 'android', 'FAIL'), 항목(2, 'B', 'android', 'FAIL')], { 다시돌림: new Map([['A', { runId: 130, status: 'PASS' as const }]]) });

    expect(within(줄안('A')).getByRole('link', { name: 'RUN 130에서 Pass' }).getAttribute('href')).toBe('#/runs/fn?run=130&tc=A');
    expect(줄안('A').querySelector('.rf-tags')).not.toBeNull();
    expect(줄안('B').querySelector('.rf-tags')).toBeNull();
  });
});

describe('주소로 온 줄 (`&tc=`)', () => {
  afterEach(() => {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  });

  it('펼쳐 선 줄은 서자마자 상세를 받고 화면을 그 줄로 한 번 옮긴다', async () => {
    const 옮김 = vi.fn();
    Element.prototype.scrollIntoView = 옮김;
    const 읽기 = vi.spyOn(api, 'item').mockResolvedValue(상세(1, 'android'));
    흐름그리기([항목(1, 'A', 'android', 'PASS'), 항목(2, 'B', 'android', 'PASS')], { 열카드: 'B', 처음: { 열린: ['B'] } });

    await waitFor(() => expect(읽기).toHaveBeenCalledWith(RUN_ID, 2));
    expect(옮김).toHaveBeenCalledTimes(1);
    expect(줄안('B').querySelector('.rf-line')?.getAttribute('aria-expanded')).toBe('true');
    expect(줄안('A').querySelector('.rf-line')?.getAttribute('aria-expanded')).toBe('false');
  });

  it('그 줄이 다른 쪽에 있으면 그 쪽으로 가서 보여 준다 — 처음 한 번만', () => {
    const 예순 = Array.from({ length: 60 }, (_, i) => 항목(i + 1, `K${String(i + 1).padStart(2, '0')}`, 'android', 'PASS'));
    const { 마지막보기 } = 흐름그리기(예순, { 열카드: 'K55', 처음: { 열린: ['K55'] } });

    expect(마지막보기().쪽).toBe(2);
    expect(줄안('K55')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    expect(마지막보기().쪽).toBe(1);
  });
});
