// @vitest-environment jsdom
// UserSection 의 자리 검사 — 임시 비밀번호 상자가 계정 목록보다 앞에 그려지는지 본다.
//
// WS-E ③ 사고가 난 자리가 여기다. 상자를 만드는 판단은 맞았는데 계정 목록 **뒤에** 그려서,
// 계정이 열 명만 돼도 상자가 스크롤 밖으로 밀려났다. 누른 사람은 아무 일도 안 일어난 줄 알았고
// 그 사이 옛 비밀번호는 이미 죽어 있어 본인은 영문도 모르고 로그인이 막혔다 (docs/archive/progress/WS-E.md).
//
// 한계. jsdom 에는 레이아웃도 CSS 계산도 없어 배치·간격·색·애니메이션은 여기서 못 본다.
// 그건 사람이 브라우저로 본다 (SPEC §9.1). 여기서 보는 축은 하나다 — **문서 나무에서의 자리.**
// 눈에 보이는 위치는 못 봐도 「목록보다 앞 형제인가」는 볼 수 있고, 그 순서가 뒤집혀야 그 사고가 난다.

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { api, type UserRow } from './api.js';
import { UserSection } from './SettingsUser.js';
import type { 프로젝트줄 } from './settingsView.js';

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
  { username: 'kim', displayName: '김철수', role: 'admin', dashboard: 'read', isActive: true, projects: [] },
  {
    username: 'lee',
    displayName: '이영희',
    role: 'member',
    dashboard: 'read',
    isActive: true,
    projects: [{ projectId: 1, permissions: { cases: 'read', runs: 'write', authoring: 'none' } }],
  },
  {
    username: 'park',
    displayName: '박운영',
    role: 'admin',
    dashboard: 'read',
    isActive: true,
    projects: [{ projectId: 1, permissions: { cases: 'write', runs: 'write', authoring: 'none' } }],
  },
];

const 프로젝트들: 프로젝트줄[] = [
  { id: 1, name: '데모마켓', 앱수: 2 },
  { id: 2, name: '사내 포털', 앱수: 1 },
];

function 그리기(rows: UserRow[] = 계정들, projects: 프로젝트줄[] = []) {
  return render(<UserSection rows={rows} projects={projects} me="kim" onDone={() => {}} onSelf={() => {}} />);
}

function 새계정열기() {
  그리기(계정들, 프로젝트들);
  fireEvent.click(screen.getByLabelText('추가'));
}

const 프로젝트칸 = (이름: RegExp) => screen.getByRole('checkbox', { name: 이름 });
const 칸묶음 = (이름: string) => screen.queryByRole('group', { name: 이름 });
function 눌림(묶음: string): string | undefined {
  const 묶 = 칸묶음(묶음);
  return 묶 === null ? undefined : within(묶).getAllByRole('button').find((b) => b.getAttribute('aria-pressed') === 'true')?.textContent ?? undefined;
}
function 고른다(묶음: string, 값: string) {
  fireEvent.click(within(칸묶음(묶음)!).getByRole('button', { name: 값 }));
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

  it('아이디 모양이 틀리면 보내기 전에 서버와 같은 말로 알리고 보내지 않는다', () => {
    const 만들기 = vi.spyOn(api, 'createUser');
    새계정열기();
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '최민수' } });
    fireEvent.click(screen.getByText('계정 추가'));

    expect(screen.getByText('아이디는 영문 소문자·숫자·.·_·- 로 2~32자입니다')).toBeTruthy();
    expect(만들기).not.toHaveBeenCalled();
  });

  it('자기 줄에는 비밀번호 재발급이 없고 비밀번호 변경으로 안내한다', () => {
    그리기();
    fireEvent.click(screen.getAllByText('편집')[0]!);

    expect(screen.queryByText('비밀번호 재발급')).toBeNull();
    expect(screen.getByText(/비밀번호 변경/)).toBeTruthy();
  });

  it('남의 줄에는 비밀번호 재발급이 있다', () => {
    그리기();
    fireEvent.click(screen.getAllByText('편집')[1]!);

    expect(screen.getByText('비밀번호 재발급')).toBeTruthy();
  });

  it('계정 더하기도 + 아이콘 버튼이다 (2026-09-22, 애플리케이션 더하기와 같은 규칙)', () => {
    그리기();

    const 버튼 = screen.getByLabelText('추가');
    expect(버튼.textContent).toBe('+');
  });
});

describe('프로젝트와 권한 고르개 (도메인/인증 §8.8 · 시안 B)', () => {
  it('새 계정은 배정 없이 시작하고 그래프(Grafana)는 읽기다', () => {
    새계정열기();
    expect((프로젝트칸(/데모마켓/) as HTMLInputElement).checked).toBe(false);
    expect((프로젝트칸(/사내 포털/) as HTMLInputElement).checked).toBe(false);
    expect(칸묶음('데모마켓 케이스')).toBeNull();
    expect(눌림('그래프(Grafana)')).toBe('읽기');
  });

  it('프로젝트 줄마다 그 안의 애플리케이션 수를 적는다 — 고르면 그 안이 모두 열린다는 뜻을 읽게', () => {
    새계정열기();

    expect(프로젝트칸(/데모마켓/).closest('label')?.textContent).toContain('애플리케이션 2개');
    expect(프로젝트칸(/사내 포털/).closest('label')?.textContent).toContain('애플리케이션 1개');
  });

  it('프로젝트가 하나도 없으면 먼저 만들라고 알린다', () => {
    그리기(계정들, []);
    fireEvent.click(screen.getByLabelText('추가'));

    expect(screen.getByText('먼저 프로젝트를 만듭니다')).toBeTruthy();
  });

  it('프로젝트를 켜면 세 칸이 읽기로 열리고 끄면 사라진다', () => {
    새계정열기();
    fireEvent.click(프로젝트칸(/데모마켓/));
    expect(눌림('데모마켓 케이스')).toBe('읽기');
    expect(눌림('데모마켓 실행')).toBe('읽기');
    expect(눌림('데모마켓 작성')).toBe('읽기');

    fireEvent.click(프로젝트칸(/데모마켓/));
    expect(칸묶음('데모마켓 케이스')).toBeNull();
  });

  it('관리자를 켜면 권한 칸과 그래프(Grafana)를 숨기고 프로젝트 켜기만 남긴다', () => {
    새계정열기();
    fireEvent.click(프로젝트칸(/데모마켓/));
    fireEvent.click(screen.getByRole('checkbox', { name: /^관리자/ }));

    expect(칸묶음('데모마켓 케이스')).toBeNull();
    expect(칸묶음('그래프(Grafana)')).toBeNull();
    expect(프로젝트칸(/데모마켓/)).toBeTruthy();
    expect(screen.getByText('관리자는 배정된 프로젝트에서 모든 기능을 씁니다. 켜 둘 프로젝트만 고르세요.')).toBeTruthy();
  });

  it('실행 쓰기에 케이스 안 씀이면 알리되 저장은 막지 않는다', () => {
    새계정열기();
    fireEvent.click(프로젝트칸(/데모마켓/));
    고른다('데모마켓 실행', '쓰기');
    고른다('데모마켓 케이스', '안 씀');

    expect(screen.getByRole('status').textContent).toContain('이대로면 실행 설정에서 고를 케이스가 보이지 않습니다.');
    expect((screen.getByText('계정 추가') as HTMLButtonElement).disabled).toBe(false);
  });

  it('세 칸이 다 안 씀이면 알리고 저장을 막는다', () => {
    새계정열기();
    fireEvent.click(프로젝트칸(/데모마켓/));
    for (const 기능 of ['케이스', '실행', '작성']) 고른다(`데모마켓 ${기능}`, '안 씀');

    expect(screen.getByRole('status').textContent).toContain(
      '세 칸이 모두 「안 씀」이면 저장되지 않습니다. 배정을 풀려면 프로젝트를 끄세요.',
    );
    expect((screen.getByText('계정 추가') as HTMLButtonElement).disabled).toBe(true);
  });

  it('그래프(Grafana)에는 쓰기가 없다', () => {
    새계정열기();
    const 버튼들 = within(칸묶음('그래프(Grafana)')!).getAllByRole('button').map((b) => b.textContent);
    expect(버튼들).toEqual(['안 씀', '읽기']);
  });

  it('프로젝트를 켜면 권한 묶음 단추가 서고 처음 세 칸(읽기)과 맞는 「읽기 전용」이 눌려 있다', () => {
    새계정열기();
    expect(칸묶음('데모마켓 권한 묶음')).toBeNull();
    fireEvent.click(프로젝트칸(/데모마켓/));

    expect(within(칸묶음('데모마켓 권한 묶음')!).getAllByRole('button').map((b) => b.textContent)).toEqual(['읽기 전용', '작성자', '실행자']);
    expect(눌림('데모마켓 권한 묶음')).toBe('읽기 전용');
  });

  it.each([
    ['작성자', { 케이스: '읽기', 실행: '읽기', 작성: '쓰기' }],
    ['실행자', { 케이스: '읽기', 실행: '쓰기', 작성: '읽기' }],
    ['읽기 전용', { 케이스: '읽기', 실행: '읽기', 작성: '읽기' }],
  ])('「%s」 묶음을 누르면 세 칸이 한 번에 바뀌고 그 묶음이 눌린다', (묶음, 칸들) => {
    새계정열기();
    fireEvent.click(프로젝트칸(/데모마켓/));
    고른다('데모마켓 작성', '안 씀');
    고른다('데모마켓 권한 묶음', 묶음);

    expect(눌림('데모마켓 케이스')).toBe(칸들.케이스);
    expect(눌림('데모마켓 실행')).toBe(칸들.실행);
    expect(눌림('데모마켓 작성')).toBe(칸들.작성);
    expect(눌림('데모마켓 권한 묶음')).toBe(묶음);
  });

  it('칸을 하나 고쳐 어느 묶음과도 안 맞으면 묶음 단추가 모두 풀린다 — 칸을 하나씩 고르는 길은 그대로다', () => {
    새계정열기();
    fireEvent.click(프로젝트칸(/데모마켓/));
    고른다('데모마켓 권한 묶음', '작성자');
    고른다('데모마켓 케이스', '쓰기');

    expect(눌림('데모마켓 권한 묶음')).toBeUndefined();
    expect(눌림('데모마켓 케이스')).toBe('쓰기');
  });

  it('묶음은 그 프로젝트 칸만 바꾼다', () => {
    새계정열기();
    fireEvent.click(프로젝트칸(/데모마켓/));
    fireEvent.click(프로젝트칸(/사내 포털/));
    고른다('데모마켓 권한 묶음', '실행자');

    expect(눌림('데모마켓 실행')).toBe('쓰기');
    expect(눌림('사내 포털 실행')).toBe('읽기');
  });

  it('관리자를 켜면 권한 묶음도 숨긴다', () => {
    새계정열기();
    fireEvent.click(프로젝트칸(/데모마켓/));
    fireEvent.click(screen.getByRole('checkbox', { name: /^관리자/ }));

    expect(칸묶음('데모마켓 권한 묶음')).toBeNull();
  });

  it('저장하면 프로젝트마다 칸 묶음과 대시보드를 보낸다', () => {
    const 만들기 = vi.spyOn(api, 'createUser').mockResolvedValue({ username: 'choi', tempPassword: 'x' });
    새계정열기();
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'choi' } });
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '최민수' } });
    fireEvent.click(프로젝트칸(/데모마켓/));
    고른다('데모마켓 실행', '쓰기');
    고른다('그래프(Grafana)', '안 씀');
    fireEvent.click(screen.getByText('계정 추가'));

    expect(만들기).toHaveBeenCalledWith({
      username: 'choi',
      displayName: '최민수',
      role: 'member',
      dashboard: 'none',
      projects: [{ projectId: 1, permissions: { cases: 'read', runs: 'write', authoring: 'read' } }],
    });
  });

  it('고칠 때도 배정 전체와 대시보드를 보낸다', () => {
    const 고치기 = vi.spyOn(api, 'updateUser').mockResolvedValue({ ok: true });
    그리기(계정들, 프로젝트들);
    fireEvent.click(screen.getAllByText('편집')[1]!);
    고른다('데모마켓 작성', '쓰기');
    fireEvent.click(screen.getByText('저장'));

    expect(고치기).toHaveBeenCalledWith('lee', {
      displayName: '이영희',
      role: 'member',
      dashboard: 'read',
      projects: [{ projectId: 1, permissions: { cases: 'read', runs: 'write', authoring: 'write' } }],
    });
  });

  it('관리자를 끄면 저장된 칸이 보이고, 관리자일 때 켠 프로젝트는 읽기로 보인다', () => {
    그리기(계정들, 프로젝트들);
    fireEvent.click(screen.getAllByText('편집')[2]!);
    expect(칸묶음('데모마켓 케이스')).toBeNull();
    fireEvent.click(프로젝트칸(/사내 포털/));
    fireEvent.click(screen.getByRole('checkbox', { name: /^관리자/ }));

    expect(눌림('데모마켓 케이스')).toBe('쓰기');
    expect(눌림('데모마켓 작성')).toBe('안 씀');
    expect(눌림('사내 포털 실행')).toBe('읽기');
  });

  it('마지막 관리자에게는 관리자 끄기를 내밀지 않는다', () => {
    그리기([계정들[0]!, 계정들[1]!], 프로젝트들);
    fireEvent.click(screen.getAllByText('편집')[0]!);

    expect(screen.queryByRole('checkbox', { name: /^관리자/ })).toBeNull();
    expect(screen.getByText(/마지막 관리자라 끌 수 없습니다/)).toBeTruthy();
  });
});
