// 게임 기능 테스트 항목이 도는 동안 1초마다 FPS 를 읽는다 — 케이스가 연 Appium 연결의 mobile: shell 로 (SPEC 러너 §5.2 「게임 항목 FPS」 · WEB-F7-25)

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { FpsSample } from '@platform/kit';
import { APPIUM_SESSION_FILE, runDir } from '@platform/kit';

import { appium주소 } from './appSession.js';
import type { Adb } from './perfAdb.js';
import { fps를읽는다, type 프레임상태 } from './perfRead.js';

const 간격ms = 1_000;
// 한 번 묻기가 간격보다 오래 걸리면 그 초는 건너뛴다 — 팜이 느려도 묻기가 쌓이지 않는다
const 묻기제한ms = 5_000;

export interface FPS측정 {
  /** 자식이 끝난 뒤 부른다. 도는 읽기를 기다려 모은 줄을 돌려준다 */
  멈춘다(): Promise<FpsSample[]>;
}

/**
 * 연결은 kit 이 연다 — 번호 파일(APPIUM_SESSION_FILE)이 생기면 그 연결로 묻고, 닫혀 파일이 없어지면 그 초는 건너뛴다.
 * 러너는 팜 폰에 adb 로 닿지 못해 Appium 이 폰 셸에 넘겨 주는 명령으로 읽는다. 팜은 그 명령을 연다(러너 §5.2 「디바이스 팜 접속 방식」)
 * @param 지금단계 읽은 때 돌던 절차 번호. 첫 절차 전(앱을 켜는 동안)이면 undefined 라 줄을 안 남긴다
 */
export function FPS를잰다(
  runId: number,
  historyId: number,
  토큰: string | undefined,
  지금단계: () => number | undefined,
  묻기: typeof fetch = fetch,
): FPS측정 {
  const 줄들: FpsSample[] = [];
  const 상태: 프레임상태 & { 연결?: string } = { serial: '', pkg: '', intervalSec: 간격ms / 1000, 경고: new Set() };
  const 시작 = Date.now();
  let 읽는중: Promise<void> | undefined;
  let 알림 = false;

  const 부른다 = async (연결: string, script: string, args: unknown[]): Promise<string> => {
    const raw = process.env.PLATFORM_APPIUM_URL;
    if (raw === undefined || raw === '') throw new Error('PLATFORM_APPIUM_URL 이 없다');
    const { base, headers } = appium주소(raw, 토큰 ?? process.env.PLATFORM_APPIUM_TOKEN);
    const res = await 묻기(`${base}/session/${encodeURIComponent(연결)}/execute/sync`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ script, args }),
      signal: AbortSignal.timeout(묻기제한ms),
    });
    if (!res.ok) throw new Error(`Appium ${script} HTTP ${String(res.status)}`);
    return String(((await res.json()) as { value?: unknown }).value ?? '');
  };

  const 한번 = async (): Promise<void> => {
    let 연결: string;
    try {
      연결 = (await readFile(join(runDir(String(runId), String(historyId)), APPIUM_SESSION_FILE), 'utf8')).trim();
    } catch {
      // 아직 안 열었거나 이미 닫았다
      return;
    }
    const seq = 지금단계();
    if (연결 === '' || seq === undefined) return;
    try {
      // 연결이 바뀌면(케이스가 다시 열었다) 앞 셈의 기준을 버린다
      if (상태.연결 !== 연결) Object.assign(상태, { 연결, 이전gfx: undefined, 이전표시: undefined, 층: undefined });
      // 앱 층을 못 찾는 동안은 앞에 뜬 앱을 다시 묻는다 — 켜지는 동안 런처가 앞에 있을 수 있다
      if (상태.층 === undefined) 상태.pkg = await 부른다(연결, 'mobile: getCurrentPackage', []);
      // perfRead 는 adb 인자(-s 번호 shell 명령 …)로 부른다 — 앞 셋을 떼고 Appium 에 넘긴다
      const adb: Adb = (args) => 부른다(연결, 'mobile: shell', [{ command: args[3], args: args.slice(4) }]);
      const { fps } = await fps를읽는다(adb, 상태, Math.round((Date.now() - 시작) / 1000));
      줄들.push({ seq, fps });
    } catch (err) {
      줄들.push({ seq, fps: null });
      if (!알림) {
        알림 = true;
        console.warn(`[runner] 게임 항목 FPS 를 못 읽었다: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  };

  const 타이머 = setInterval(() => {
    if (읽는중 !== undefined) return;
    읽는중 = 한번().finally(() => {
      읽는중 = undefined;
    });
  }, 간격ms);

  return {
    async 멈춘다() {
      clearInterval(타이머);
      await 읽는중;
      return 줄들;
    },
  };
}
