// @vitest-environment jsdom
// UserSection 의 자리 검사 — 임시 비밀번호 상자가 계정 목록보다 앞에 그려지는지 본다.
//
// WS-E ③ 사고가 난 자리가 여기다. 상자를 만드는 판단은 맞았는데 계정 목록 **뒤에** 그려서,
// 계정이 열 명만 돼도 상자가 스크롤 밖으로 밀려났다. 누른 사람은 아무 일도 안 일어난 줄 알았고
// 그 사이 옛 비밀번호는 이미 죽어 있어 본인은 영문도 모르고 로그인이 막혔다 (docs/progress/WS-E.md).
//
// 한계. jsdom 에는 레이아웃도 CSS 계산도 없어 배치·간격·색·애니메이션은 여기서 못 본다.
// 그건 사람이 브라우저로 본다 (SPEC §9.1). 여기서 보는 축은 하나다 — **문서 나무에서의 자리.**
// 눈에 보이는 위치는 못 봐도 「목록보다 앞 형제인가」는 볼 수 있고, 그 순서가 뒤집혀야 그 사고가 난다.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { api, type UserRow } from './api.js';
import { UserSection } from './SettingsUser.js';

// jsdom 에 없는 함수라 끼워 넣지 않으면 TempPassword 가 TypeError 로 죽는다.
// 원래 없던 자리이므로 걷을 때는 지운다 — 남기면 다른 검사 파일로 샌다
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});
afterAll(() => {
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const 계정들: UserRow[] = [
  { username: 'kim', displayName: '김철수', role: 'admin', isActive: true, services: [] },
  { username: 'lee', displayName: '이영희', role: 'operator', isActive: true, services: [] },
];

function 그리기() {
  return render(
    <UserSection rows={계정들} services={[]} me="kim" onDone={() => {}} onSelf={() => {}} />,
  );
}

describe('UserSection', () => {
  it('임시 비밀번호 상자는 계정 목록보다 문서 나무에서 앞에 온다', async () => {
    // 네트워크는 타지 않는다. 이 검사가 보는 것은 응답이 온 뒤 상자가 앉는 자리다
    vi.spyOn(api, 'resetPassword').mockResolvedValue({ tempPassword: 'Tmp-a1b2c3' });
    const { container } = 그리기();
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(screen.getAllByText('편집')[1]!);
    // 되돌릴 수 없는 일이라 두 걸음으로 받는다. 같은 버튼이 글자만 바뀐다
    const 다시만들기 = screen.getByText('비밀번호 재발급');
    fireEvent.click(다시만들기);
    fireEvent.click(다시만들기);

    const 상자 = await screen.findByRole('alert');
    expect(상자.textContent).toContain('Tmp-a1b2c3');

    const 차례 = [...container.querySelectorAll('*')];
    const 첫줄 = container.querySelector('.set-row');
    expect(첫줄).not.toBeNull();
    expect(차례.indexOf(상자)).toBeLessThan(차례.indexOf(첫줄!));
  });

  it('계정 더하기도 + 아이콘 버튼이다 (2026-09-22, 서비스 더하기와 같은 규칙)', () => {
    그리기();

    const 버튼 = screen.getByLabelText('더하기');
    expect(버튼.textContent).toBe('+');
  });
});
