// @vitest-environment jsdom
// 맨 위 띠의 서비스 색 표시 검사 (SPEC 공통/5-화면공통 §8).
//
// 2026-09-21 에 띠 바탕에서 색을 뺐다. 색은 자리 넷 줄의 8px 네모와 그 줄 아래 3px 경계선이다.
// **막으려던 사고는 그대로다** — 엉뚱한 서비스에서 실행을 누르는 것.
// 그래서 여기서는 「띠에 색이 없다」와 「표시에 색이 있다」를 둘 다 본다.
// 한쪽만 보면 색을 아무 데도 안 칠한 상태가 통과한다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, type ServiceRow, type User } from './api.js';
import { 언어함, type 언어 } from './i18n.js';
import { 사이드바접음을적는다, 자리목록, 탭제목 } from './layout.js';
import { Shell } from './Shell.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 결제: ServiceRow = {
  id: 1,
  prefix: 'ZSH',
  name: '결제 서비스',
  color: '#3A5FCD',
  envs: [],
  hasSlackWebhook: false,
};

const 정산: ServiceRow = { ...결제, id: 2, prefix: 'ZSI', name: '정산 서비스', color: '#7A2E5E' };

const 사람: User = {
  username: 'zsh1',
  displayName: '김수민',
  role: 'admin',
  services: [결제, 정산],
};

function 띄운다(service: ServiceRow, 언어: 언어 = 'ko', on언어: (고른: 언어) => void = () => {}) {
  vi.spyOn(api, 'runs').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 , summary: { runs: 0, allPass: 0, hasFail: 0, durationOf: 0, avgDurationMs: 0, maxDurationMs: 0 } });
  return render(
    <언어함 value={언어}>
      <Shell
        user={사람}
        service={service}
        onService={() => {}}
        언어={언어}
        on언어={on언어}
        onLogout={() => {}}
        current="#/cases"
      >
        <div>본문</div>
      </Shell>
    </언어함>,
  );
}

function 색표시() {
  return document.querySelector('[data-service-color]');
}

describe('서비스 색을 걷었다 (SPEC §8, 2026-09-22)', () => {
  // 세 번 옮겨도 「이 네모가 뭘 뜻하는지」가 안 풀려서 걷었다.
  // 「네모가 없다」만 보면 서비스 구분이 통째로 사라진 상태도 통과한다 — 이름이 남았는지 같이 본다
  it('사이드바 어디에도 서비스 색이 없다', () => {
    띄운다(결제);
    expect(색표시()).toBeNull();
    expect(document.querySelector('.side-dot')).toBeNull();
    const 띠 = document.querySelector('.side-top') as HTMLElement | null;
    expect(띠).not.toBeNull();
    expect(띠!.style.background).toBe('');
    expect(띠!.style.getPropertyValue('--svc')).toBe('');
  });

  it('서비스를 바꿔도 색이 생기지 않는다', () => {
    띄운다(정산);
    expect(색표시()).toBeNull();
    expect(document.querySelector('[style*="--svc"]')).toBeNull();
  });

  it('접두사 표시(`DEMO-`)도 없다. 무엇을 뜻하는지 화면만 봐서는 몰랐다', () => {
    띄운다(결제);
    expect(document.querySelector('.side-svc-id')).toBeNull();
    expect(document.body.textContent).not.toContain('ZSH-');
  });

  it('구분은 이름이 한다. 색을 걷어도 어느 서비스인지 읽힌다', () => {
    띄운다(결제);
    expect(screen.getByRole('combobox', { name: '서비스 고르기' })).toBeTruthy();
    expect(screen.getByText('결제 서비스')).toBeTruthy();
  });
});

describe('세로 껍데기 (SPEC §8)', () => {
  it('사이드바 하나가 서비스 고르개 · 자리 전부 · 로그인한 사람을 다 들고 있다', () => {
    띄운다(결제);
    const 사이드 = document.querySelector('.side') as HTMLElement | null;
    expect(사이드).not.toBeNull();
    const 안 = within(사이드!);
    expect(안.getByRole('combobox', { name: '서비스 고르기' })).toBeTruthy();
    expect(안.getAllByRole('link')).toHaveLength(자리목록(사람.role, 'ko').length);
    expect(안.getByText(사람.displayName)).toBeTruthy();
  });

  it('푸터가 제품과 지금 서비스를 적는다', () => {
    띄운다(결제);
    const 푸터 = document.querySelector('.foot');
    expect(푸터).not.toBeNull();
    expect(푸터!.textContent).toContain(탭제목(결제, 'ko'));
  });
});

describe('사이드바 접기', () => {
  it('접는 버튼이 있고 지금 접혔는지를 말한다', () => {
    띄운다(결제);
    const 버튼 = screen.getByRole('button', { name: /사이드바/ });
    expect(버튼.getAttribute('aria-expanded')).toBe('true');
  });

  it('누르면 접히고 껍데기가 그 사실을 들고 있다', () => {
    띄운다(결제);
    fireEvent.click(screen.getByRole('button', { name: /사이드바/ }));
    expect(document.querySelector('.wrap.folded')).not.toBeNull();
    expect(screen.getByRole('button', { name: /사이드바/ }).getAttribute('aria-expanded')).toBe('false');
  });

  it('접어 두면 다음에 열 때도 접힌 채로 뜬다', () => {
    사이드바접음을적는다(true);
    띄운다(결제);
    expect(document.querySelector('.wrap.folded')).not.toBeNull();
    사이드바접음을적는다(false);
  });

  it('접혀도 자리 넷에 키보드로 닿는다', () => {
    사이드바접음을적는다(true);
    띄운다(결제);
    // 안 보이게 하려고 display:none 을 쓰면 탭 대상에서 빠진다.
    // 흐리게 두지 않는다는 규칙(SPEC §8)은 등급 이야기고, 접기는 사람이 되돌릴 수 있는 상태다
    expect(screen.getByRole('link', { name: '테스트 케이스' })).toBeTruthy();
    사이드바접음을적는다(false);
  });
});

describe('껍데기 이름 정리 (2026-09-21 ②)', () => {
  it('자리 넷이 nav 랜드마크 안에 있다', () => {
    띄운다(결제);

    // 이름을 기계로 바꾸다가 `<nav>` 가 `<side-nav>` 라는 없는 요소가 된 적이 있다.
    // 링크는 그대로 보여서 검사가 전부 초록이었는데, 화면을 안 보는 사람은 자리 넷을 통째로 못 찾는다
    const 자리 = screen.getByRole('navigation');
    expect(자리.className).toBe('side-nav');
    expect(자리.tagName).toBe('NAV');
  });

  it('옛 이름을 화면에 남기지 않는다', () => {
    띄운다(결제);

    for (const 옛이름 of ['band', 'svc-dot', 'notice']) {
      expect(
        document.querySelector(`[class*="${옛이름}"]`),
        `옛 이름 ${옛이름} 이 화면에 남아 있다`,
      ).toBeNull();
    }
  });
});

describe('껍데기는 제목을 지어내지 않는다 (2026-09-22)', () => {
  it('껍데기 안에 화면 머리가 없다 — 그리는 것은 화면이다', () => {
    const { container } = 띄운다(결제);

    // PR① 이 여기 `header` 통로를 뚫었는데 부르는 곳이 하나도 없었다.
    // 그래서 화면들이 제목을 본문 안에서 그렸고 「헤드와 메인 분리」가 절반만 살았다
    expect(container.querySelector('.main > .head')).toBeNull();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });
});

// 고르개 하나가 화면 글자 전부를 바꾼다 (SPEC §8 「다국어」).
// 「고르개가 있다」만 보면 눌러도 아무 일이 없는 상태가 통과한다 — 바뀌는 것까지 본다
describe('언어 고르개 (SPEC §8 다국어)', () => {
  it('사이드바에 언어 고르개가 있다', () => {
    띄운다(결제);
    expect(screen.getByLabelText('언어')).toBeTruthy();
  });

  it('English 를 고르면 그 사실이 위로 올라간다', () => {
    const 고른것: 언어[] = [];
    띄운다(결제, 'ko', (고른) => 고른것.push(고른));

    fireEvent.change(screen.getByLabelText('언어'), { target: { value: 'en' } });
    expect(고른것).toEqual(['en']);
  });

  it('영어면 자리 넷이 영어로 뜬다', () => {
    띄운다(결제, 'en');
    expect(screen.getByRole('navigation').textContent).not.toContain('실행 기록');
  });

  it('접어도 고르개가 화면에서 사라지지 않는다. 지우면 키보드 이동에서 빠진다', () => {
    사이드바접음을적는다(true);
    띄운다(결제);
    expect(screen.getByLabelText('언어')).toBeTruthy();
    사이드바접음을적는다(false);
  });
});
