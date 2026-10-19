// @vitest-environment jsdom
// E2E 실행 결과 상자 검사 (SPEC §8.7, 2026-09-22 ② · UI · 기능은 2026-10-19 ⑫ 에 결과 칸으로 옮겼다) — 「화면으로 열기」가 없고, 상자가 넓게(880px) 뜨는가

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { RunResultModal } from './RunResultModal.js';
import type { 판정 } from './role.js';
import { scenarioApi } from './scenarioApi.js';

// 옛 등급 셋의 판정을 그대로 옮긴 것 — 운영은 전부, 실행까지는 머지·설정 빼고, 보기만은 받기뿐
const 실행까지: 판정 = (무엇) => 무엇 !== '작성머지' && 무엇 !== '설정';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const RUN_ID = 4821;

function 그리기() {
  vi.spyOn(scenarioApi, 'result').mockReturnValue(new Promise(() => {}));
  return render(<RunResultModal runId={RUN_ID} 할수={실행까지} onClose={() => {}} />);
}

describe('실행 결과 상자 (2026-09-22 ②)', () => {
  it('넓게(880px) 뜬다 — 표가 들어가는 ②의 상자다 (DESIGN.md)', async () => {
    그리기();
    await screen.findByRole('dialog');

    expect(document.querySelector('.modal.wide')).not.toBeNull();
  });

  it('「화면으로 열기」가 없다 — 상자 하나로 끝난다', async () => {
    그리기();
    await screen.findByRole('dialog');

    expect(screen.queryByText('화면으로 열기')).toBeNull();
  });

  it('닫기 버튼은 그대로 있다', async () => {
    그리기();
    await screen.findByRole('dialog');

    expect(screen.getByText('닫기')).toBeTruthy();
  });
});
