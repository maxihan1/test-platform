import { describe, expect, it } from 'vitest';

import { 결과, 상태, 카드 } from './compatRun.fixture.js';
import { 네모자리, 미점검들, 발생글, 순서설명, 지금상태, 진행, 찍은때, 최근의심, 카드묶기 } from './compatRunView.js';

const t = (키: string, 값: Record<string, string | number> = {}) => 키.replace(/\{([^}]+)\}/gu, (_, k: string) => String(값[k] ?? `{${k}}`));

describe('실행 순서 줄', () => {
  it('도는 상태는 지금 케이스 차례 · 점검 중은 장 수 · 끝은 의심 수 · 건너뜀은 까닭이다', () => {
    expect(순서설명(상태(1, { state: 'RUNNING', cases: { done: 5, total: 9 }, now: { tcId: 'A', name: 'a', startedAt: null } }), 0, t)).toBe('케이스 6 / 9');
    // 케이스 사이(도는 케이스가 없다)에는 끝난 수다
    expect(순서설명(상태(1, { state: 'RUNNING', cases: { done: 5, total: 9 } }), 0, t)).toBe('케이스 5 / 9');
    expect(순서설명(상태(1, { state: 'CHECKING', checks: { done: 40, total: 61 } }), 0, t)).toBe('AI 점검 40 / 61장');
    expect(순서설명(상태(1, { fold: 'OPEN' }), 1, t)).toBe('펼침 · AI 점검 완료 · 결함 의심 1');
    expect(순서설명(상태(1, { state: 'SKIPPED', skipReason: '디바이스를 잡지 못했습니다' }), 0, t)).toBe('디바이스를 잡지 못했습니다');
    expect(순서설명(상태(1, { state: 'WAIT' }), 0, t)).toBe('');
  });

  it('지금 카드는 도는 상태가 먼저고 없으면 점검 중인 상태다', () => {
    expect(지금상태([상태(1, { state: 'CHECKING' }), 상태(2, { state: 'RUNNING' })])?.seq).toBe(2);
    expect(지금상태([상태(1), 상태(2, { state: 'CHECKING' })])?.seq).toBe(2);
    expect(지금상태([상태(1), 상태(2, { state: 'WAIT' })])).toBeNull();
  });
});

describe('진행 셈', () => {
  it('끝난 상태는 완료 · 건너뜀 · 중단이고 남은 시간은 다 돈 상태의 평균으로 어림한다 — 건너뜀은 시간이 안 들어 평균에서 뺀다', () => {
    const r = 결과({
      run: { ...결과().run, startedAt: '2026-11-07T00:00:00Z' },
      devices: [상태(1), 상태(2, { state: 'SKIPPED' }), 상태(3, { state: 'RUNNING' }), 상태(4, { state: 'WAIT' })],
    });
    const 셈 = 진행(r, Date.parse('2026-11-07T00:20:00Z'));
    expect(셈).toMatchObject({ 끝난: 2, 전체: 4, 실행중: 1, 대기: 1, 점검중: 0, 남은분: 40 });
  });

  it('끝난 상태가 없으면 남은 시간을 말하지 않는다', () => {
    expect(진행(결과({ devices: [상태(1, { state: 'RUNNING' })] }), Date.now()).남은분).toBeNull();
  });

  it('결함 아님으로 거른 카드는 의심 수 · 최근 그림에서 빠진다', () => {
    const cards = [카드('/a', 1, 1), 카드('/a', 2, 3, { verdict: 'NOT_DEFECT' }), 카드('/b', 1, 2)];
    expect(진행(결과({ cards }), Date.now()).의심).toBe(2);
    expect(최근의심(cards).map((c) => c.screenId)).toEqual([2, 1]);
  });
});

describe('카드 묶기', () => {
  const rows = [
    { key: '/a', name: '가', cells: [] },
    { key: '/b', name: '나', cells: [] },
  ];
  const cards = [카드('/a', 1, 1, { verdict: 'CONFIRMED' }), 카드('/b', 1, 2), 카드('/b', 2, 3, { verdict: 'NOT_DEFECT' })];

  it('미판정 먼저는 미판정이 있는 묶음을 앞에, 묶음 안에서도 미판정 카드를 앞에 둔다', () => {
    const 묶음 = 카드묶기(rows, cards, '미판정 먼저');
    expect(묶음.map((m) => m.key)).toEqual(['/b', '/a']);
    expect(묶음[0]).toMatchObject({ 발생: 2, 확정: 0, 미판정: 1 });
    expect(묶음[0]?.cards.map((c) => c.screenId)).toEqual([2, 3]);
  });

  it('결함 확정은 확정 카드만 · 전체는 표 차례 그대로다', () => {
    expect(카드묶기(rows, cards, '결함 확정').map((m) => [m.key, m.cards.length])).toEqual([['/a', 1]]);
    expect(카드묶기(rows, cards, '전체').map((m) => m.key)).toEqual(['/a', '/b']);
  });
});

describe('미점검 · 발생', () => {
  it('미점검 칸을 까닭마다 묶어 디바이스 이름을 모은다', () => {
    const r = 결과({
      devices: [상태(1), 상태(2, { fold: 'FOLDED' }), 상태(3)],
      rows: [
        {
          key: '/ship',
          name: '배송지 수정',
          cells: [
            { seq: 1, value: 'UNCHECKED', reason: 'DMA-UI-040 이 5단계에서 실패' },
            { seq: 2, value: 'UNCHECKED', reason: 'DMA-UI-040 이 5단계에서 실패' },
            { seq: 3, value: 'UNCHECKED' },
          ],
        },
        { key: '/ok', name: '로그인', cells: [{ seq: 1, value: 'PENDING' }] },
      ],
    });
    expect(미점검들(r.rows, r.devices, t)).toEqual([
      {
        key: '/ship',
        name: '배송지 수정',
        까닭들: [
          { 까닭: 'DMA-UI-040 이 5단계에서 실패', 디바이스: ['SM-A101N', 'SM-A102N 접힘'] },
          { 까닭: '찍힌 화면이 없습니다', 디바이스: ['SM-A103N'] },
        ],
      },
    ]);
    expect(발생글(r.rows[0]!, 3, t)).toBe('미점검 3');
    expect(발생글(r.rows[1]!, 3, t)).toBe('1 / 3');
  });
});

describe('의심 네모 · 카드 글', () => {
  it('원본 픽셀 [x, y, 가로, 세로] 를 그림 크기의 퍼센트로 바꾸고 꼴이 틀리면 null 이다', () => {
    expect(네모자리([0, 76, 1080, 94], 1080, 2400)).toEqual({ left: '0%', top: '3.1666666666666665%', width: '100%', height: '3.9166666666666665%' });
    expect(네모자리([1, 2, 3], 100, 100)).toBeNull();
    expect(네모자리([1, 2, 3, 4], 0, 100)).toBeNull();
  });

  it('카드 아래 줄은 케이스 번호와 단계다', () => {
    expect(찍은때({ tcId: 'DMA-UI-031', step: 4, before: 'element/click' }, t)).toBe('DMA-UI-031 4단계 · 터치 직전 캡처');
    expect(찍은때({ tcId: 'DMA-UI-031', step: null, before: 'element/click' }, t)).toBe('DMA-UI-031');
  });

  it('뒤로 가기 · 세션 닫기 직전에 찍은 화면은 그 때를 적는다 — 그 단계에서 누른 화면이 아니다', () => {
    expect(찍은때({ tcId: 'DMA-UI-133', step: 4, before: 'back' }, t)).toBe('DMA-UI-133 4단계 · 뒤로 가기 직전 캡처');
    expect(찍은때({ tcId: 'DMA-UI-133', step: 5, before: 'session/delete' }, t)).toBe('DMA-UI-133 5단계 · 테스트 종료 직전 캡처');
    expect(찍은때({ tcId: 'DMA-UI-133', step: 3, before: 'element/value' }, t)).toBe('DMA-UI-133 3단계 · 터치 직전 캡처');
    expect(찍은때({ tcId: 'DMA-UI-133', step: 3, before: '' }, t)).toBe('DMA-UI-133 3단계');
  });
});
