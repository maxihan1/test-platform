// @vitest-environment jsdom
// 실행 결과 화면의 리포트 메뉴 검사 — 형식 셋이 그려지고 **누른 그 형식**이 서버로 가는지 본다 (SPEC §8.4).
//
// 여기가 사고 자리다. 버튼이 하나이던 시절 호출부가 형식을 `'PDF'` 로 박아 두었고,
// 버튼만 셋으로 늘리면 엑셀을 눌러도 PDF 가 나온다 — 화면은 멀쩡해 보이고 결과만 틀린다.
// 그래서 「엑셀을 누르면 `'XLSX'` 가 간다」가 이 파일의 중심 단언이다.
//
// 한계. jsdom 에는 레이아웃이 없어 버튼이 판정 숫자를 미는지, 좁은 화면에서 접히는지는 못 본다.
// 그건 사람이 브라우저로 본다 (SPEC §9.1). 여기서 보는 축은 **문서에 무슨 글자가 있는가**와
// **어떤 인자로 서버를 불렀는가** 둘이다.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { api, type EvidenceRow } from './api.js';
import { RunResult } from './RunResult.js';
import { RUN_ID, 그리기, 실행, 실행까지, 증적 } from './RunResult.fixture.js';

// globals 가 꺼져 있어 testing-library 가 스스로 cleanup 을 걸지 못한다. 직접 건다.
// 언마운트가 곧 `setInterval` 정리다 — 안 걸면 2초 폴링이 검사를 붙잡는다
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  sessionStorage.clear();
});

describe('실행 결과 화면의 리포트 메뉴 (SPEC §8.4)', () => {
  it('끝난 실행에는 「리포트 생성」 단추 하나가 서고 누르면 형식마다 한 줄인 메뉴가 열린다', async () => {
    그리기('FINISHED');

    const 단추 = await screen.findByRole('button', { name: '리포트 생성' });
    expect(screen.queryByRole('button', { name: 'PDF' })).toBeNull();
    fireEvent.click(단추);
    expect(단추.getAttribute('aria-expanded')).toBe('true');
    expect(['PDF', '엑셀', 'HTML'].map((글) => screen.getByRole('button', { name: 글 }).textContent)).toEqual(['PDF', '엑셀', 'HTML']);
  });

  it('요약 띠가 머리 바로 아래에 오고 머리에는 판정 숫자가 없다', async () => {
    const { container } = 그리기('FINISHED');

    await screen.findByRole('button', { name: '리포트 생성' });

    // 머리의 집계 숫자는 요약 띠로 옮겼다 — 같은 숫자를 두 번 두지 않는다 (도메인/실행 §8.3)
    const 머리 = container.querySelector('.head');
    const 띠 = container.querySelector('.rs');
    expect(띠).not.toBeNull();
    expect(머리?.nextElementSibling?.firstElementChild).toBe(띠);
    expect(container.querySelector('.tally')?.textContent).not.toContain('통과');
  });

  it('리포트 단추와 메뉴 줄은 색을 쓰지 않고 이유를 말풍선에 숨기지 않는다', async () => {
    그리기('FINISHED');

    const 단추 = await screen.findByRole('button', { name: '리포트 생성' });
    fireEvent.click(단추);
    for (const 버튼 of [단추, ...['PDF', '엑셀', 'HTML'].map((글) => screen.getByRole('button', { name: 글 }))]) {
      // 꽉 찬 잉크색을 셋이나 늘어놓으면 판정 숫자가 밀린다. 색은 판정만 갖는다
      expect(버튼.className).toContain('ghost');
      // `title` 은 터치에 안 뜨고 disabled 버튼은 키보드 탭에서도 빠진다 (docs/DESIGN.md)
      expect(버튼.getAttribute('title')).toBeNull();
    }
  });

  it('모든 형식이 만드는 중이면 머리 단추가 눌리지 않는다 (리포팅 §8.4)', async () => {
    그리기('FINISHED', [증적('PDF', 'PENDING'), 증적('XLSX', 'PENDING'), 증적('HTML', 'PENDING')]);

    expect((await screen.findByRole('button', { name: '리포트 생성 중' })).hasAttribute('disabled')).toBe(true);
  });

  it('리포트 메뉴는 Esc 로 닫힌다 — 떠 있는 목록이 본문을 덮은 채 남지 않는다', async () => {
    그리기('FINISHED');

    const 단추 = await screen.findByRole('button', { name: '리포트 생성' });
    fireEvent.click(단추);
    fireEvent.keyDown(screen.getByRole('button', { name: 'PDF' }), { key: 'Escape' });

    expect(screen.queryByRole('button', { name: 'PDF' })).toBeNull();
    expect(단추.getAttribute('aria-expanded')).toBe('false');
  });

  it('메뉴에서 엑셀을 누르면 서버로 가는 형식도 엑셀이다', async () => {
    // 끝나지 않는 약속이라 눌린 뒤의 잠금 상태가 그대로 멈춰 선다.
    // 응답이 와서 다시 묻기까지 가면 그 사이 상태를 볼 수 없다
    const 만들기 = vi.spyOn(api, 'makeEvidence').mockReturnValue(new Promise<EvidenceRow>(() => {}));
    그리기('FINISHED');

    fireEvent.click(await screen.findByRole('button', { name: '리포트 생성' }));
    fireEvent.click(screen.getByRole('button', { name: '엑셀' }));

    expect(만들기).toHaveBeenCalledWith(RUN_ID, 'XLSX');
    // 고르면 메뉴는 닫히고 단추가 만드는 중임을 알린다. 다시 열면 그 형식만 잠겨 있다 — 셋이 같이 잠기면 PDF 를 못 만든다
    const 단추 = screen.getByRole('button', { name: '리포트 생성 중' });
    fireEvent.click(단추);
    expect(screen.getByRole('button', { name: '엑셀 생성 중' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'PDF' }).hasAttribute('disabled')).toBe(false);
  });

  it('도는 중에는 리포트 단추가 없고 안내가 화면 글자로 보인다', async () => {
    그리기('RUNNING');

    // 말풍선(`title`)이 아니라 글자다. 휴대폰에는 올릴 마우스가 없다 (docs/DESIGN.md 접근성)
    expect(await screen.findByText('실행이 끝나면 리포트를 만들 수 있습니다')).toBeDefined();
    expect(screen.queryByRole('button', { name: /리포트 생성/ })).toBeNull();
  });

  it('엑셀만 실패하면 사유 줄이 어느 형식인지 말한다', async () => {
    그리기('FINISHED', [증적('XLSX', 'FAILED', '시트가 너무 큽니다')]);

    const 줄 = await screen.findByText(/만들지 못했습니다/);
    expect(줄.textContent).toContain('엑셀');
    expect(줄.textContent).toContain('시트가 너무 큽니다');
  });
});

describe('실행 결과 머리의 종류 (PR #132)', () => {
  it('머리 부제 맨 앞에 종류를 적는다 — 사이드바가 이 화면의 종류를 모른다', async () => {
    vi.spyOn(api, 'run').mockResolvedValue({ ...실행, kind: 'UI', status: 'FINISHED', items: [], evidence: [] });
    const { container } = render(<RunResult runId={실행.runId} 판정하기={() => 실행까지} />);
    await waitFor(() => expect(container.querySelector('.head')?.textContent).toMatch(/UI 테스트 · /));
  });
});

describe('RunResult 화면 머리 (2026-09-22)', () => {
  // 큰 제목은 실행 제목이고 번호는 부제 맨 앞에 작게 둔다 (점검 2.22)
  it('실행 제목이 h1 이고 RUN 번호는 부제에 있으며 본문 면 바깥에 선다', async () => {
    const { container } = 그리기('FINISHED');
    await screen.findByText(/RUN/);

    const 머리 = container.querySelector('.head');
    expect(머리?.querySelector('h1')?.textContent).toBe('결제 회귀');
    expect(머리?.querySelector('.head-meta')?.textContent).toMatch(/^RUN \d+ · /);
    expect(container.querySelector('.screen .head')).toBeNull();
  });

  it('머리 부제에 대상 서버가 그대로 있다', async () => {
    const { container } = 그리기('FINISHED');
    await screen.findByText(/RUN/);

    // 그날 실제로 친 주소가 증적의 전제다 (SPEC §8.3)
    expect(container.querySelector('.head')?.textContent).toContain('대상 서버');
  });
});
