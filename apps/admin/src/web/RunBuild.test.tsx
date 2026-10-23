// @vitest-environment jsdom
// 빌드 실행의 실행자 · 빌드 번호 글과 「다른 빌드가 깔려 있었다」 한 줄을 본다 (도메인/실행 §3.11 「실행에 빌드 번호를 남긴다」)
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, type RunListRow } from './api.js';
import { RunResult } from './RunResult.js';
import { 끝난응답, RUN_ID, 실행, 실행까지 } from './RunResult.fixture.js';
import { 실행줄 } from './RunListRow.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

function 결과(칸: Partial<Awaited<ReturnType<typeof api.run>>>) {
  vi.spyOn(api, 'run').mockResolvedValue({ ...끝난응답, ...칸 });
  return render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
}

describe('실행 기록 줄 — 빌드 실행', () => {
  it('빌드 실행은 시작 방식 대신 빌드 번호를 적고 실행자 앞에 「빌드」를 붙인다', () => {
    const 줄: RunListRow = { ...실행, origin: 'BUILD', buildNo: '124', triggeredByName: '김QA' };
    render(<실행줄 run={줄} 고름={false} on고르기={() => undefined} />);
    const 글 = screen.getByRole('button').textContent ?? '';
    expect(글).toContain('빌드 124');
    expect(글).toContain('빌드 · 김QA');
    expect(글).not.toContain('빌드 실행');
  });

  it('사람이 건 실행도 고정된 빌드 번호를 적는다', () => {
    render(<실행줄 run={{ ...실행, origin: 'MANUAL', buildNo: '124' }} 고름={false} on고르기={() => undefined} />);
    const 글 = screen.getByRole('button').textContent ?? '';
    expect([글.includes('직접 실행'), 글.includes('빌드 124'), 글.includes('빌드 · ')]).toEqual([true, true, false]);
  });
});

describe('실행 결과 머리 — 다른 빌드', () => {
  it('폰이 읽은 빌드 코드가 실행 빌드 번호와 다르면 두 번호를 넣어 알린다', async () => {
    결과({ origin: 'BUILD', buildNo: '124', installedApps: [{ appVersion: '1.4.2', appBuild: '123' }] });
    expect(await screen.findByText('다른 빌드가 깔려 있었습니다 — 실행한 빌드 124 · 폰에 깔린 빌드 123')).toBeTruthy();
  });

  it('빌드 코드가 같거나 못 읽었으면 알리지 않는다 — 앱 판(versionName)은 견주지 않는다', async () => {
    결과({ buildNo: '124', installedApps: [{ appVersion: '1.4.2', appBuild: '124' }, { appVersion: '9.9', appBuild: null }] });
    expect(await screen.findByText(/빌드 124/)).toBeTruthy();
    expect(screen.queryByText(/다른 빌드가/)).toBeNull();
  });

  it('빌드 번호가 없는 실행은 견주지 않는다', async () => {
    결과({ buildNo: null, installedApps: [{ appVersion: '1.4.2', appBuild: '123' }] });
    await screen.findByRole('button', { name: '리포트 생성' });
    expect(screen.queryByText(/다른 빌드가/)).toBeNull();
  });
});
