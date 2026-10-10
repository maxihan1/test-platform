// @vitest-environment jsdom
// E2E 시나리오 조립 화면 ④ 검사 — 케이스 단계 설정 패널의 머리 · 로그인 이어받기 · 준비 (도메인/시나리오 §8.11)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ScenarioPartPanel } from './ScenarioPartPanel.js';
import { 케이스단계, 단계, 재료, 준비있는, 그리기, 마지막바꿈 } from './ScenarioPartPanel.fixture.js';

afterEach(cleanup);

describe('ScenarioPartPanel 머리 · 전제 · 미확정', () => {
  it('머리에 tcId 와 이름이 나오고 전제 목록은 있을 때만 나온다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001', { precondition: ['회원이 있다', '상품이 있다'] }));

    expect(screen.getByText('ZSB-001 ZSB-001 케이스')).toBeTruthy();
    expect(screen.getByText('전제')).toBeTruthy();
    expect(screen.getByText('회원이 있다')).toBeTruthy();
    expect(screen.getByText('상품이 있다')).toBeTruthy();
  });

  it('전제가 없으면 전제 제목을 그리지 않는다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001'));
    expect(screen.queryByText('전제')).toBeNull();
  });

  it('미확정 케이스에만 미확정 안내가 나온다', () => {
    const 안내 = '미확정 케이스입니다. 이 단계가 들어간 실행에는 「미확정」 꼬리표가 붙습니다';
    그리기(단계('ZSB-001'), 재료('ZSB-001', { unconfirmed: '화면에서 읽음' }));
    expect(screen.getByText(안내)).toBeTruthy();
    cleanup();
    그리기(단계('ZSB-001'), 재료('ZSB-001'));
    expect(screen.queryByText(안내)).toBeNull();
  });
});

describe('ScenarioPartPanel 로그인 이어받기', () => {
  it('스위치는 켜져 있고 설명을 aria-describedby 로 가리킨다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001'));
    const 스위치 = screen.getByRole('switch', { name: '로그인 이어받기' });

    expect(스위치.getAttribute('aria-checked')).toBe('true');
    const 설명 = document.getElementById(스위치.getAttribute('aria-describedby') ?? '');
    expect(설명?.textContent).toBe('앞 단계의 로그인 상태를 그대로 사용합니다. 끄면 새 창에서 단독으로 실행합니다');
    expect(screen.queryByText('로그인 이어받기를 끄면 준비 건너뛰기와 값 연결을 쓸 수 없습니다')).toBeNull();
  });

  it('끄면 carryOver false 에 건너뛰기와 값 연결이 비워져 올라간다', () => {
    const { on바꿈 } = 그리기(
      단계('ZSB-001', {
        skipSteps: ['로그인한다'],
        links: [{ kind: 'bind', param: 'id', value: { fromSeq: 1, method: 'GET', urlPattern: '**/a', jsonPath: 'id' } }],
      }),
      준비있는('ZSB-001'),
    );
    fireEvent.click(screen.getByRole('switch', { name: '로그인 이어받기' }));

    const 바뀜 = 마지막바꿈(on바꿈);
    expect(바뀜.carryOver).toBe(false);
    expect(바뀜.skipSteps).toEqual([]);
    expect(바뀜.links).toEqual([]);
  });

  it('꺼진 단계는 안내가 나오고 준비 체크박스가 잠긴다. 다시 켜면 carryOver true 가 올라간다', () => {
    const { on바꿈 } = 그리기(단계('ZSB-001', { carryOver: false }), 준비있는('ZSB-001'));
    const 스위치 = screen.getByRole('switch', { name: '로그인 이어받기' });

    expect(스위치.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('로그인 이어받기를 끄면 준비 건너뛰기와 값 연결을 쓸 수 없습니다')).toBeTruthy();
    for (const 체크 of screen.getAllByRole('checkbox')) expect((체크 as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(스위치);
    expect(마지막바꿈(on바꿈).carryOver).toBe(true);
  });
});

describe('ScenarioPartPanel 로그인 이어받기를 껐다 켜기', () => {
  it('끄면 초안 값은 비고 칸은 기억한 값으로 잠긴 채 보이며 다시 켜면 둘이 돌아온다', () => {
    const 올림: 케이스단계[] = [];
    const 묶음 = { kind: 'bind', param: 'id', value: { fromSeq: 1, method: 'GET', urlPattern: '**/a', jsonPath: 'id' } } as const;
    function 상태있는() {
      const [지금, set지금] = useState(
        단계('ZSB-001', { skipSteps: ['로그인한다'], links: [묶음] }),
      );
      올림.push(지금);
      return (
        <ScenarioPartPanel
          번호={1}
          단계={지금}
          단계들={[지금]}
          재료={new Map([['ZSB-001', 준비있는('ZSB-001')]])}
          쓰나
          on바꿈={set지금}
          on케이스바꾸기={vi.fn()}
          값연결={(보일, 잠금) => <p>{`연결 ${보일.links?.length ?? 0} 잠금 ${String(잠금)}`}</p>}
        />
      );
    }
    render(<상태있는 />);
    const 스위치 = screen.getByRole('switch', { name: '로그인 이어받기' });

    fireEvent.click(스위치);

    expect(올림.at(-1)).toMatchObject({ carryOver: false, skipSteps: [], links: [] });
    expect((screen.getByRole('checkbox', { name: '로그인한다' }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('checkbox', { name: '로그인한다' }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('연결 1 잠금 true')).toBeTruthy();

    fireEvent.click(스위치);

    expect(올림.at(-1)).toMatchObject({ carryOver: true, skipSteps: ['로그인한다'], links: [묶음] });
    expect(screen.getByText('연결 1 잠금 false')).toBeTruthy();
  });
});

describe('ScenarioPartPanel 준비', () => {
  it('묶음 이름이 있고 건너뛸 수 있는 절차만 체크박스로 나온다', () => {
    그리기(단계('ZSB-001'), 준비있는('ZSB-001'));
    const 묶음 = screen.getByRole('group', { name: '준비 — 체크한 것만 실행' });
    const 체크들 = within(묶음).getAllByRole('checkbox') as HTMLInputElement[];

    expect(체크들.map((c) => c.getAttribute('aria-label') ?? c.parentElement?.textContent)).toEqual([
      '로그인한다',
      '장바구니를 비운다',
    ]);
    expect(체크들.every((c) => c.checked)).toBe(true);
    expect(within(묶음).queryByText('결제한다')).toBeNull();
  });

  it('체크를 풀면 그 제목이 skipSteps 에 들고 다시 체크하면 빠진다', () => {
    const { on바꿈 } = 그리기(단계('ZSB-001'), 준비있는('ZSB-001'));
    fireEvent.click(screen.getByRole('checkbox', { name: /장바구니를 비운다/ }));
    expect(마지막바꿈(on바꿈).skipSteps).toEqual(['장바구니를 비운다']);
  });

  it('건너뛴 제목은 체크가 풀려 보이고 다시 체크하면 skipSteps 에서 빠진다', () => {
    const { on바꿈 } = 그리기(단계('ZSB-001', { skipSteps: ['로그인한다'] }), 준비있는('ZSB-001'));
    const 로그인 = screen.getByRole('checkbox', { name: /로그인한다/ }) as HTMLInputElement;

    expect(로그인.checked).toBe(false);
    fireEvent.click(로그인);
    expect(마지막바꿈(on바꿈).skipSteps).toEqual([]);
  });

  it('앞 단계에 같은 제목의 절차가 있으면 N번에서 이미 실행 칩이 붙는다', () => {
    const 앞 = 단계('ZSB-001');
    const 지금 = 단계('ZSB-002');
    그리기(지금, 준비있는('ZSB-002'), {
      번호: 2,
      단계들: [앞, 지금],
      재료맵: new Map([
        ['ZSB-001', 준비있는('ZSB-001')],
        ['ZSB-002', 준비있는('ZSB-002')],
      ]),
    });

    expect(screen.getAllByText('1번에서 이미 실행')).toHaveLength(2);
    expect(screen.getAllByText('1번에서 이미 실행')[0]?.className).toContain('tech-tag');
  });

  it('첫 단계에는 이미 실행 칩이 없다', () => {
    그리기(단계('ZSB-001'), 준비있는('ZSB-001'));
    expect(screen.queryByText(/이미 실행/)).toBeNull();
  });

  it('r16 이 false 면 묶음 대신 건너뛸 수 없다는 문장이 나온다', () => {
    그리기(단계('ZSB-001'), 재료('ZSB-001'));

    expect(screen.getByText('이 케이스는 준비가 분리되어 있지 않아 건너뛸 수 없습니다')).toBeTruthy();
    expect(screen.queryByRole('group', { name: '준비 — 체크한 것만 실행' })).toBeNull();
  });
});
