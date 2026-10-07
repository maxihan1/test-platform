// 끝난 android 항목이 열어 둔 Appium 연결을 러너가 대신 닫는다 (SPEC 러너 §5.2 「앱 실행」)

import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { APPIUM_SESSION_FILE, runDir } from '@platform/kit';

// admin 이 러너를 기다리는 유예가 30초다. 그 안에 답해야 부분 결과가 남는다
const 닫기_제한_ms = 10_000;

// 자식이 죽었든 정상 종료했든 kit 이 못 닫았으면 번호 파일이 남아 있다. 팜의 디바이스를 붙들고 있는 연결이라 반드시 닫는다
export async function 앱연결을닫는다(runId: number, historyId: number): Promise<void> {
  // 경로를 여기서 따로 계산하면 kit 이 적은 곳과 어긋나도 아무것도 못 닫고 조용히 넘어간다. kit 의 것을 그대로 쓴다
  const file = join(runDir(String(runId), String(historyId)), APPIUM_SESSION_FILE);
  let sessionId: string;
  try {
    sessionId = (await readFile(file, 'utf8')).trim();
  } catch {
    return;
  }
  const raw = process.env.PLATFORM_APPIUM_URL;
  if (sessionId === '' || raw === undefined || raw === '') return;

  try {
    const url = new URL(raw);
    // fetch 는 주소 안 계정을 거절한다. 머리로 옮겨 보낸다
    const headers: Record<string, string> = {};
    if (url.username !== '') {
      const 계정 = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
      headers.Authorization = `Basic ${Buffer.from(계정).toString('base64')}`;
    }
    url.username = '';
    url.password = '';
    const base = url.toString().replace(/\/+$/, '');
    const res = await fetch(`${base}/session/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers,
      signal: AbortSignal.timeout(닫기_제한_ms),
    });
    if (!res.ok) console.error(`[runner] Appium 연결을 닫지 못했다: HTTP ${res.status}`);
  } catch (err) {
    // 던지면 이미 난 판정(PASS·FAIL·ABORTED)이 닫기 실패에 덮인다. 알리기만 하고 넘어간다
    console.error(`[runner] Appium 연결을 닫지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    // 번호가 남아 있으면 다음 실행이 이미 닫힌 연결을 또 닫으려 한다
    await rm(file, { force: true });
  }
}
