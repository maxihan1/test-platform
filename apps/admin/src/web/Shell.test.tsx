// @vitest-environment jsdom
// 맨 위 띠의 서비스 색 표시 검사 (SPEC 공통/5-화면공통 §8).
//
// 2026-09-21 에 띠 바탕에서 색을 뺐다. 색은 자리 목록 줄의 8px 네모와 그 줄 아래 3px 경계선이다.
// **막으려던 사고는 그대로다** — 엉뚱한 서비스에서 실행을 누르는 것.
// 그래서 여기서는 「띠에 색이 없다」와 「표시에 색이 있다」를 둘 다 본다.
// 한쪽만 보면 색을 아무 데도 안 칠한 상태가 통과한다.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

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
  name: '결제 애플리케이션',
  color: '#3A5FCD', projectId: 1, projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
};

const 정산: ServiceRow = { ...결제, id: 2, prefix: 'ZSI', name: '정산 애플리케이션', color: '#7A2E5E' };

const 사람: User = {
  username: 'zsh1',
  displayName: '김수민',
  role: 'admin',
  dashboard: 'read',
  mustChangePassword: false,
  services: [결제, 정산],
};

function 띄운다(
  service: ServiceRow,
  언어: 언어 = 'ko',
  on언어: (고른: 언어) => void = () => {},
  current = '#/cases',
  onLogout: () => void = () => {},
) {
  vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
  return render(
    <언어함 value={언어}>
      <Shell
        user={사람}
        service={service}
        onService={() => {}}
        언어={언어}
        on언어={on언어}
        onLogout={onLogout}
        current={current}
      >
        <div>본문</div>
      </Shell>
    </언어함>,
  );
}

// 줄(애플리케이션)과 자리 목록, nav 가 둘이다 — 자리 목록은 클래스로 고른다
function 자리nav() {
  return screen.getAllByRole('navigation').find((nav) => nav.className === 'side-nav')!;
}

function 내메뉴() {
  return screen.getByRole('button', { name: `내 메뉴 · ${사람.displayName}` });
}

function 색표시() {
  return document.querySelector('[data-service-color]');
}

describe('애플리케이션 색을 걷었다 (SPEC §8, 2026-09-22)', () => {
  // 세 번 옮겨도 「이 네모가 뭘 뜻하는지」가 안 풀려서 걷었다.
  // 「네모가 없다」만 보면 서비스 구분이 통째로 사라진 상태도 통과한다 — 이름이 남았는지 같이 본다
  it('사이드바 어디에도 애플리케이션 색이 없다', () => {
    띄운다(결제);
    expect(색표시()).toBeNull();
    expect(document.querySelector('.side-dot')).toBeNull();
    const 띠 = document.querySelector('.side-proj') as HTMLElement | null;
    expect(띠).not.toBeNull();
    expect(띠!.style.background).toBe('');
    expect(띠!.style.getPropertyValue('--svc')).toBe('');
  });

  it('애플리케이션을 바꿔도 색이 생기지 않는다', () => {
    띄운다(정산);
    expect(색표시()).toBeNull();
    expect(document.querySelector('[style*="--svc"]')).toBeNull();
  });

  it('`DEMO-` 꼴의 접두사 표시는 없다. 줄 단추는 접두사 글자 하나만 보인다 (2026-10-13)', () => {
    띄운다(결제);
    expect(document.querySelector('.side-svc-id')).toBeNull();
    expect(document.body.textContent).not.toContain('ZSH-');
    expect(document.querySelector('.hd-svc-code')).toBeNull();
    expect(Array.from(document.querySelectorAll('.rail-code')).map((it) => it.textContent)).toEqual(['ZSH', 'ZSI']);
  });

  it('구분은 이름이 한다. 색을 걷어도 줄 단추 이름과 사이드바 머리로 어느 애플리케이션인지 읽힌다', () => {
    띄운다(결제);
    expect(screen.getByRole('button', { name: '결제 애플리케이션 · 웹' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('button', { name: '정산 애플리케이션 · 웹' }).getAttribute('aria-current')).toBeNull();
    expect(document.querySelector('.side-app b')?.textContent).toBe('결제 애플리케이션');
  });
});

describe('세로 껍데기 (SPEC §8)', () => {
  it('위쪽 바가 없고 왼쪽 줄이 알림 · 설정 · 내 메뉴를, 사이드바가 찾기 · 자리 목록 · 프로젝트를 들고 있다 (2026-10-30)', () => {
    띄운다(결제);
    expect(document.querySelector('header.hd')).toBeNull();
    const 줄 = within(document.querySelector('.rail') as HTMLElement);
    expect(줄.getByRole('button', { name: /알림/ })).toBeTruthy();
    expect(줄.getByRole('link', { name: '설정' }).getAttribute('href')).toBe('#/settings');
    expect(줄.getByRole('button', { name: `내 메뉴 · ${사람.displayName}` })).toBeTruthy();

    const 안 = within(document.querySelector('.side-col') as HTMLElement);
    expect(안.getByRole('button', { name: '찾기' })).toBeTruthy();
    expect(안.getByText('데모마켓 · 애플리케이션 2개')).toBeTruthy();
    // 설정은 자리 목록에서 빠져 톱니로 갔다. 하위는 지금 자리가 든 묶음(테스트 스크립트)만 펼친다
    const 메뉴 = 자리목록(사람, 결제.prefix, 'ko').filter((자리) => 자리.해시 !== '#/settings');
    const 펼친하위 = 메뉴.find((자리) => 자리.해시 === '#/cases')?.하위?.length ?? 0;
    expect(within(자리nav()).getAllByRole('link')).toHaveLength(메뉴.length + 펼친하위);
    expect(within(자리nav()).queryByRole('link', { name: '설정' })).toBeNull();
    // 언어는 내 메뉴 안이다 — 사이드바에 늘 펼쳐 두지 않는다
    expect(안.queryByText(사람.displayName)).toBeNull();
    expect(안.queryByLabelText('언어')).toBeNull();
  });

  it('왼쪽 줄 맨 위 로고는 집으로 가는 링크다', () => {
    띄운다(결제);
    const 로고 = screen.getByRole('link', { name: 'QA Hub 홈' });
    expect(로고.closest('.rail')).not.toBeNull();
    expect(로고.getAttribute('href')).toMatch(/^#\//);
  });

  it('설정 화면이면 톱니가 지금 자리 표시를 받는다', () => {
    띄운다(결제, 'ko', () => {}, '#/settings');
    expect(screen.getByRole('link', { name: '설정' }).getAttribute('aria-current')).toBe('page');
  });

  it('운영 계정이 아니면 톱니가 없다 — 흐리게 두지 않고 아예 없다', () => {
    vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
    render(
      <언어함 value="ko">
        <Shell user={{ ...사람, role: 'member' }} service={결제} onService={() => {}} 언어="ko" on언어={() => {}} onLogout={() => {}} current="#/cases">
          <div>본문</div>
        </Shell>
      </언어함>,
    );
    expect(screen.queryByRole('link', { name: '설정' })).toBeNull();
  });

  it('바닥 프로젝트 고르개가 프로젝트 이름과 애플리케이션 수를 적는다', () => {
    띄운다(결제);
    expect(document.querySelector('.side-proj')?.textContent).toBe('데모마켓 · 애플리케이션 2개');
  });

  it('푸터가 제품과 지금 애플리케이션을 적는다', () => {
    띄운다(결제);
    const 푸터 = document.querySelector('.foot');
    expect(푸터).not.toBeNull();
    expect(푸터!.textContent).toContain(탭제목(결제));
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

  it('접혀도 자리 목록에 키보드로 닿는다', () => {
    사이드바접음을적는다(true);
    띄운다(결제);
    // 안 보이게 하려고 display:none 을 쓰면 탭 대상에서 빠진다.
    // 흐리게 두지 않는다는 규칙(SPEC §8)은 등급 이야기고, 접기는 사람이 되돌릴 수 있는 상태다
    expect(screen.getByRole('link', { name: '테스트 스크립트' })).toBeTruthy();
    사이드바접음을적는다(false);
  });
});

describe('사이드바 하위 메뉴 (화면공통 §8 · PR #132)', () => {
  it('하위가 지금 자리면 그 하위에 aria-current, 묶음은 펼친 표시만 한다', () => {
    띄운다(결제, 'ko', () => {}, '#/runs/ui');
    const 하위 = screen.getByRole('link', { name: '실행 기록 · UI 테스트' });
    expect(하위.getAttribute('aria-current')).toBe('page');
    expect(하위.getAttribute('href')).toBe('#/runs/ui');
    const 묶음 = screen.getByRole('link', { name: '실행 기록' });
    expect(묶음.getAttribute('aria-current')).toBeNull();
    expect(묶음.hasAttribute('data-open')).toBe(true);
  });

  it('지금 자리가 든 묶음만 펼친다 — 다른 묶음은 접히고 묶음 링크는 그대로 첫 하위로 간다 (2026-10-30)', () => {
    띄운다(결제, 'ko', () => {}, '#/runs/ui');
    expect(screen.queryByRole('link', { name: '테스트 스크립트 · UI 테스트' })).toBeNull();
    expect(screen.queryByRole('link', { name: '테스트 스크립트 · 기능 테스트' })).toBeNull();
    const 접힌묶음 = screen.getByRole('link', { name: '테스트 스크립트' });
    expect(접힌묶음.hasAttribute('data-open')).toBe(false);
    expect(접힌묶음.getAttribute('href')).toBe('#/cases');
    expect(접힌묶음.querySelector('.side-chev')).not.toBeNull();
  });

  it('종류를 모르는 상세(실행 결과)에서는 묶음이 펼친 표시만 받는다 — 묶음 링크는 기능 목록이라 「지금 자리」가 아니다', () => {
    띄운다(결제, 'ko', () => {}, '#/runs');
    const 묶음 = screen.getByRole('link', { name: '실행 기록' });
    expect(묶음.getAttribute('aria-current')).toBeNull();
    expect(묶음.hasAttribute('data-open')).toBe(true);
    expect(screen.getByRole('group', { name: '실행 기록' })).toBeTruthy();
  });

  it('API 애플리케이션도 실행 기록 묶음(기능 테스트 · E2E)을 쓰고 API 묶음은 없다', () => {
    const API = { ...결제, kind: 'API' as const };
    vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
    render(
      <언어함 value="ko">
        <Shell user={{ ...사람, services: [API] }} service={API} onService={() => {}} 언어="ko" on언어={() => {}} onLogout={() => {}} current="#/runs">
          <div>본문</div>
        </Shell>
      </언어함>,
    );
    expect(screen.getByRole('link', { name: '실행 기록' }).hasAttribute('data-open')).toBe(true);
    expect(screen.getByRole('link', { name: '실행 기록 · 기능 테스트' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '실행 기록 · E2E' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: '실행 기록 · UI 테스트' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'API' })).toBeNull();
  });

  it('접혀도 하위 메뉴에 키보드로 닿는다 — 지우지 않고 글자만 숨긴다', () => {
    사이드바접음을적는다(true);
    띄운다(결제, 'ko', () => {}, '#/cases/ui');
    expect(screen.getByRole('link', { name: '테스트 스크립트 · UI 테스트' })).toBeTruthy();
    사이드바접음을적는다(false);
  });
});

describe('껍데기 이름 정리 (2026-09-21 ②)', () => {
  it('자리 목록이 nav 랜드마크 안에 있다', () => {
    띄운다(결제);

    // 이름을 기계로 바꾸다가 `<nav>` 가 `<side-nav>` 라는 없는 요소가 된 적이 있다.
    // 링크는 그대로 보여서 검사가 전부 초록이었는데, 화면을 안 보는 사람은 자리 목록을 통째로 못 찾는다
    const 자리 = 자리nav();
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
  it('내 메뉴 안에 언어 고르개와 고른 프로젝트 이름이 있다', () => {
    띄운다(결제);
    fireEvent.click(내메뉴());
    const 판 = within(document.querySelector('.rail-me-menu') as HTMLElement);
    expect(판.getByLabelText('언어')).toBeTruthy();
    expect(판.getByText('데모마켓')).toBeTruthy();
  });

  it('English 를 고르면 그 사실이 위로 올라간다', () => {
    const 고른것: 언어[] = [];
    띄운다(결제, 'ko', (고른) => 고른것.push(고른));

    fireEvent.click(내메뉴());
    fireEvent.change(screen.getByLabelText('언어'), { target: { value: 'en' } });
    expect(고른것).toEqual(['en']);
  });

  it('영어면 자리 목록이 영어로 뜬다', () => {
    띄운다(결제, 'en');
    expect(자리nav().textContent).not.toContain('실행 기록');
  });

  it('동그라미를 누르면 비밀번호 변경이 나온다 — 변경 강제가 아니어도 본인이 바꾼다', () => {
    띄운다(결제);
    expect(screen.queryByRole('link', { name: '비밀번호 변경' })).toBeNull();
    fireEvent.click(내메뉴());
    expect(screen.getByRole('link', { name: '비밀번호 변경' }).getAttribute('href')).toBe('#/password');
    // 팜 토큰은 SSO 설치에만 있다 — 통로가 404 다 (ShellFarmToken.test.tsx 가 켜진 쪽을 본다)
    expect(screen.queryByRole('button', { name: '통합계정 토큰' })).toBeNull();
  });

  it('동그라미를 누르면 로그아웃이 나오고 누르면 위로 올라간다', () => {
    const 로그아웃 = vi.fn();
    띄운다(결제, 'ko', () => {}, '#/cases', 로그아웃);
    fireEvent.click(내메뉴());
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(로그아웃).toHaveBeenCalledTimes(1);
  });

  it('메뉴는 Esc 와 바깥 누르기로 닫힌다 — 안 닫히면 본문 버튼을 가린 채 남는다', () => {
    띄운다(결제);
    const 이름 = 내메뉴();
    fireEvent.click(이름);
    expect(이름.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('link', { name: '비밀번호 변경' })).toBeNull();
    expect(이름.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(이름);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('link', { name: '비밀번호 변경' })).toBeNull();
  });

  it('접어도 왼쪽 줄의 내 메뉴에 키보드로 닿는다 — 왼쪽 줄은 접지 않는다', () => {
    사이드바접음을적는다(true);
    띄운다(결제);
    fireEvent.click(내메뉴());
    expect(screen.getByRole('link', { name: '비밀번호 변경' })).toBeTruthy();
    사이드바접음을적는다(false);
  });

  it('접어도 고르개가 화면에서 사라지지 않는다. 지우면 키보드 이동에서 빠진다', () => {
    사이드바접음을적는다(true);
    띄운다(결제);
    expect(document.querySelector('.side-proj')?.textContent).toBe('데모마켓 · 애플리케이션 2개');
    expect(screen.getByRole('button', { name: '찾기' })).toBeTruthy();
    사이드바접음을적는다(false);
  });
});

describe('대시보드 자리 (화면공통 §8 · 도메인/리포팅 §8.12)', () => {
  it('대시보드가 자리 목록 맨 위에 있고 지금 자리면 표시한다', () => {
    띄운다(결제, 'ko', () => {}, '#/dashboard');
    const 링크 = within(자리nav()).getAllByRole('link')[0]!;
    expect(링크.textContent).toBe('대시보드');
    expect(링크.getAttribute('href')).toBe('#/dashboard');
    expect(링크.getAttribute('aria-current')).toBe('page');
  });

  it('대시보드에서도 애플리케이션 줄이 남는다. 알림 줄은 없고 「알림」 버튼만 있다 (2026-10-13 시안 A)', () => {
    const { container } = 띄운다(결제, 'ko', () => {}, '#/dashboard');
    expect(screen.getByRole('navigation', { name: '애플리케이션' })).toBeTruthy();
    expect(container.querySelector('.nt-lines')).toBeNull();
    expect(screen.getByRole('button', { name: /알림/ })).toBeTruthy();
  });

  it('탭 제목과 바닥 글에는 애플리케이션 이름이 안 걸린다 — 선택 칸은 있어도 대시보드는 애플리케이션 하나가 아니다', () => {
    const { container } = 띄운다(결제, 'ko', () => {}, '#/dashboard');
    expect(document.title).toBe('QA Hub');
    expect(container.querySelector('.foot')!.textContent).toBe('QA Hub');
  });

  it('다른 자리에서는 탭 제목과 바닥 글에 애플리케이션 이름이 있다', () => {
    const { container } = 띄운다(결제, 'ko', () => {}, '#/cases');
    expect(document.title).toBe('결제 애플리케이션 · QA Hub');
    expect(container.querySelector('.foot')!.textContent).toBe('결제 애플리케이션 · QA Hub');
  });

  it('다른 자리에서도 애플리케이션 줄이 그대로 있다', () => {
    띄운다(결제, 'ko', () => {}, '#/cases');
    expect(screen.getByRole('navigation', { name: '애플리케이션' })).toBeTruthy();
    expect(api.notifications).toHaveBeenCalled();
  });

  it('영어 이름은 Dashboard 다', () => {
    띄운다(결제, 'en', () => {}, '#/dashboard');
    expect(within(자리nav()).getAllByRole('link')[0]!.textContent).toBe('Dashboard');
  });
});


describe('톱니 곁 가입 신청 수 (점검 14.5)', () => {
  const 대기 = (이름: string, 승인: boolean) => ({
    username: 이름,
    displayName: 이름,
    role: 'member' as const,
    dashboard: 'none' as const,
    isActive: true,
    isApproved: 승인,
    services: [],
  });

  function 껍데기(user: User, current = '#/cases') {
    return (
      <언어함 value="ko">
        <Shell user={user} service={결제} onService={() => {}} 언어="ko" on언어={() => {}} onLogout={() => {}} current={current}>
          <div>본문</div>
        </Shell>
      </언어함>
    );
  }

  beforeEach(() => {
    vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
  });

  it('운영 계정이고 기다리는 신청이 둘이면 톱니 곁에 2 가 뜬다', async () => {
    const 읽기 = vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [대기('a', true), 대기('b', false), 대기('c', false)] });
    render(껍데기(사람));

    const 톱니 = await screen.findByRole('link', { name: '설정 · 가입 신청 2건' });
    expect(톱니.querySelector('.rail-badge')?.textContent).toBe('2');
    expect(톱니.getAttribute('href')).toBe('#/settings');
    expect(읽기).toHaveBeenCalledTimes(1);
  });

  it('기다리는 신청이 없으면 수를 안 그린다', async () => {
    const 읽기 = vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [대기('a', true)] });
    render(껍데기(사람));

    await waitFor(() => expect(읽기).toHaveBeenCalled());
    expect(document.querySelector('.rail-badge')).toBeNull();
  });

  it('운영 계정이 아니면 읽지도 않는다', () => {
    const 읽기 = vi.spyOn(api, 'settingsUsers').mockResolvedValue({ items: [대기('b', false)] });
    render(껍데기({ ...사람, role: 'member' }));

    expect(읽기).not.toHaveBeenCalled();
    expect(document.querySelector('.rail-badge')).toBeNull();
  });

  it('읽지 못하면 조용히 안 보인다', async () => {
    const 읽기 = vi.spyOn(api, 'settingsUsers').mockRejectedValue(new Error('끊김'));
    render(껍데기(사람));

    await waitFor(() => expect(읽기).toHaveBeenCalled());
    expect(document.querySelector('.rail-badge')).toBeNull();
  });

  it('자리가 바뀌면 다시 읽는다 — 설정에서 수락하고 나오면 줄어든다', async () => {
    const 읽기 = vi
      .spyOn(api, 'settingsUsers')
      .mockResolvedValueOnce({ items: [대기('b', false)] })
      .mockResolvedValueOnce({ items: [] });
    const { rerender } = render(껍데기(사람, '#/settings'));
    expect((await screen.findByRole('link', { name: '설정 · 가입 신청 1건' })).querySelector('.rail-badge')?.textContent).toBe('1');

    rerender(껍데기(사람, '#/cases'));

    await waitFor(() => expect(document.querySelector('.rail-badge')).toBeNull());
    expect(읽기).toHaveBeenCalledTimes(2);
  });
});
