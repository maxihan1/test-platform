// @vitest-environment jsdom
// 맨 위 띠의 서비스 색 표시 검사 (SPEC 공통/5-화면공통 §8).
//
// 2026-09-21 에 띠 바탕에서 색을 뺐다. 색은 자리 넷 줄의 8px 네모와 그 줄 아래 3px 경계선이다.
// **막으려던 사고는 그대로다** — 엉뚱한 서비스에서 실행을 누르는 것.
// 그래서 여기서는 「띠에 색이 없다」와 「표시에 색이 있다」를 둘 다 본다.
// 한쪽만 보면 색을 아무 데도 안 칠한 상태가 통과한다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { api, type ServiceRow, type User } from './api.js';
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

function 띄운다(service: ServiceRow) {
  vi.spyOn(api, 'runs').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
  return render(
    <Shell user={사람} service={service} onService={() => {}} onLogout={() => {}} current="#/cases">
      <div>본문</div>
    </Shell>,
  );
}

function 색표시() {
  return document.querySelector('[data-service-color]');
}

describe('맨 위 띠의 서비스 색 (SPEC §8)', () => {
  it('띠 바탕에는 서비스 색을 칠하지 않는다', () => {
    띄운다(결제);
    const 띠 = document.querySelector('.band') as HTMLElement | null;
    expect(띠).not.toBeNull();
    // 껍데기 색은 styles.css 의 --chrome 이 정한다. 화면이 바탕색을 지어내지 않는다
    expect(띠!.style.background).toBe('');
  });

  it('서비스 색은 색 표시가 들고 있다', () => {
    띄운다(결제);
    expect(색표시()).not.toBeNull();
    expect((색표시() as HTMLElement).style.getPropertyValue('--svc')).toBe('#3A5FCD');
  });

  it('서비스를 바꾸면 표시 색이 따라 바뀐다', () => {
    띄운다(정산);
    expect((색표시() as HTMLElement).style.getPropertyValue('--svc')).toBe('#7A2E5E');
  });

  it('서비스 이름은 그대로 읽힌다. 색은 이름을 대신하지 않는다', () => {
    띄운다(결제);
    expect(screen.getByRole('combobox', { name: '서비스 고르기' })).toBeTruthy();
    expect(screen.getByText('결제 서비스')).toBeTruthy();
  });
});
