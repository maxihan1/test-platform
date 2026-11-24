// @vitest-environment jsdom
// 빌드 실행의 실행자 · 빌드 번호 글과 「다른 빌드가 깔려 있었다」 한 줄을 본다 (도메인/실행 §3.11 「실행에 빌드 번호를 남긴다」)
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, type RunListRow } from './api.js';
import { RunResult } from './RunResult.js';
import { 끝난응답, RUN_ID, 실행, 실행까지 } from './RunResult.fixture.js';
import { 다른빌드들 } from './RunBuild.js';
import { 실행표줄 } from './RunListTable.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

function 결과(칸: Partial<Awaited<ReturnType<typeof api.run>>>) {
  vi.spyOn(api, 'run').mockResolvedValue({ ...끝난응답, ...칸 });
  return render(<RunResult runId={RUN_ID} 판정하기={() => 실행까지} />);
}

describe('실행 기록 표 — 빌드 실행', () => {
  it('빌드 실행은 시작 방식 칸에 「빌드 실행」, 빌드 칸에 빌드 번호를 적는다', () => {
    const 줄: RunListRow = { ...실행, origin: 'BUILD', buildNo: '124', triggeredByName: '김QA' };
    const { container } = render(<실행표줄 run={줄} 목록조건="" />);
    const 칸 = [...container.querySelector('a.rt-line')!.children].map((el) => el.textContent);
    expect([칸[3], 칸[4]]).toEqual(['빌드 실행', '124']);
  });

  it('사람이 건 실행도 고정된 빌드 번호를 적고 빌드 칸 말고는 빌드를 말하지 않는다', () => {
    const { container } = render(<실행표줄 run={{ ...실행, origin: 'MANUAL', buildNo: '124' }} 목록조건="" />);
    const 칸 = [...container.querySelector('a.rt-line')!.children].map((el) => el.textContent);
    expect([칸[3], 칸[4]]).toEqual(['직접 실행', '124']);
  });
});

describe('실행 결과 머리 — 다른 빌드', () => {
  it('폰이 읽은 빌드 코드가 실행 빌드 번호와 다르면 두 번호를 넣어 알린다', async () => {
    결과({ origin: 'BUILD', buildNo: '124', installedApps: [{ appVersion: '1.4.2', appBuild: '123' }] });
    expect(await screen.findByText('다른 빌드가 설치되어 있었습니다 — 실행한 빌드 124 · 디바이스에 설치된 빌드 123')).toBeTruthy();
  });

  it('빌드 코드가 같거나 못 읽었으면 알리지 않는다 — 앱 판(versionName)은 견주지 않는다', async () => {
    결과({ buildNo: '124', installedApps: [{ appVersion: '1.4.2', appBuild: '124' }, { appVersion: '9.9', appBuild: null }] });
    expect(await screen.findByText(/빌드 124/)).toBeTruthy();
    expect(screen.queryByText(/다른 빌드가/)).toBeNull();
  });

  it('빌드 번호는 수로 견주고, 숫자만이 아닌 빌드 번호는 견주지 않는다 — versionCode 는 정수다', () => {
    const 폰 = [{ appVersion: '1.4.2', appBuild: '124' }];
    expect([다른빌드들('0124', 폰), 다른빌드들('v123', 폰), 다른빌드들('1.4.0+123', 폰), 다른빌드들('123', 폰)]).toEqual([[], [], [], ['124']]);
  });

  it('빌드 번호가 없는 실행은 견주지 않는다', async () => {
    결과({ buildNo: null, installedApps: [{ appVersion: '1.4.2', appBuild: '123' }] });
    await screen.findByRole('button', { name: '리포트 생성' });
    expect(screen.queryByText(/다른 빌드가/)).toBeNull();
  });
});
