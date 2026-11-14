// @vitest-environment jsdom
// 사이드바 QA 단계 구분선 · 결함 관리 바깥 자리 검사 (SPEC 공통/5-화면공통 §8 「자리 목록」 「단계 구분선」)

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { api, type ServiceRow, type User } from './api.js';
import { 언어함 } from './i18n.js';
import { 사이드바접음을적는다 } from './layout.js';
import { Shell } from './Shell.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 웹: ServiceRow = {
  id: 1,
  prefix: 'ZST',
  name: '데모마켓 웹',
  color: '#3A5FCD',
  projectId: 1,
  projectName: '데모마켓',
  envs: [],
  hasSlackWebhook: false,
  permissions: { cases: 'write', runs: 'write', authoring: 'write' },
  btsUrl: 'https://bunker.example.com',
};

function 띄운다(service: ServiceRow) {
  vi.spyOn(api, 'notifications').mockResolvedValue({ running: [], recent: [] });
  const user: User = { username: 'zst1', displayName: '김수민', role: 'member', dashboard: 'read', mustChangePassword: false, services: [service] };
  return render(
    <언어함 value="ko">
      <Shell user={user} service={service} onService={() => {}} 언어="ko" on언어={() => {}} onLogout={() => {}} current="#/cases/fn">
        <div>본문</div>
      </Shell>
    </언어함>,
  );
}

const 메뉴줄 = (container: HTMLElement) =>
  [...container.querySelectorAll('.side-nav > .side-stage, .side-nav > a, .side-nav > .side-group > a:first-child')].map((it) =>
    it.classList.contains('side-stage') ? `── ${it.textContent ?? ''}` : (it.textContent ?? '').trim(),
  );

describe('사이드바 QA 단계 구분선', () => {
  it('품질 현황 · 테스트 설계 · 테스트 수행 · 결과 분석 제목이 그 단계의 첫 메뉴 위에 한 번씩 선다', () => {
    const { container } = 띄운다(웹);
    expect(메뉴줄(container)).toEqual([
      '── 품질 현황',
      '대시보드',
      '── 테스트 설계',
      'PRD 관리',
      '테스트 작성',
      '── 테스트 수행',
      '기능 · UI 테스트',
      'E2E 테스트',
      '호환성 테스트',
      '성능 테스트',
      '정기 실행',
      '── 결과 분석',
      '실행 기록',
      'QA 리포트',
      '안정화 지표',
      '결함 관리 ↗',
      '그래프(Grafana) ↗',
    ]);
  });

  it('구분선 제목은 누를 수 없다 — 링크가 아니다', () => {
    띄운다(웹);
    expect(screen.queryByRole('link', { name: '테스트 수행' })).toBeNull();
    expect(screen.getByText('테스트 수행').tagName).toBe('DIV');
  });

  it('결함 관리는 그 프로젝트의 Issue Bunker 를 새 탭으로 연다', () => {
    띄운다(웹);
    const 링크 = screen.getByRole('link', { name: '결함 관리 ↗' });
    expect(링크.getAttribute('href')).toBe('https://bunker.example.com');
    expect(링크.getAttribute('target')).toBe('_blank');
    expect(링크.getAttribute('rel')).toBe('noreferrer');
  });

  it('Bunker 를 안 이은 프로젝트에는 결함 관리가 없다', () => {
    띄운다({ ...웹, btsUrl: null });
    expect(screen.queryByRole('link', { name: '결함 관리 ↗' })).toBeNull();
  });

  it('사이드바를 접어도 구분선은 남는다 — 글자만 숨기는 것은 CSS 몫이다', () => {
    사이드바접음을적는다(true);
    const { container } = 띄운다(웹);
    expect(container.querySelectorAll('.side-nav > .side-stage')).toHaveLength(4);
    사이드바접음을적는다(false);
  });
});
