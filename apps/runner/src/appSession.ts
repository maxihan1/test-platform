// 끝난 android 항목이 열어 둔 Appium 연결을 러너가 대신 닫는다 (SPEC 러너 §5.2 「앱 실행」)

import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { APPIUM_SESSION_FILE, PHONE_STATE_FILE, runDir, type 폰요청 } from '@platform/kit';

// admin 이 러너를 기다리는 유예가 30초다. 그 안에 답해야 부분 결과가 남는다
const 닫기_제한_ms = 10_000;
// 되돌리기는 닫기 앞에 돈다 — 둘을 더해도 그 30초 안에 들게 따로 묶는다
const 되돌리기_제한_ms = 10_000;

// fetch 는 주소 안 계정을 거절한다. 계정은 머리로 옮겨 보내고 주소에서는 뺀다 (앱 화면 읽기도 같이 쓴다).
// 인증 켠 디바이스 팜은 계정 대신 토큰(PLATFORM_APPIUM_TOKEN)을 Bearer 로 받는다 — 둘 다 있으면 토큰이 앞선다 (appium-cli 연결주소와 같은 규칙)
export function appium주소(raw: string, token: string | undefined): { base: string; headers: Record<string, string> } {
  const url = new URL(raw);
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (url.username !== '') {
    const 계정 = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
    headers.Authorization = `Basic ${Buffer.from(계정).toString('base64')}`;
  }
  url.username = '';
  url.password = '';
  return { base: url.toString().replace(/\/+$/, ''), headers };
}

const 오류글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

// 케이스가 폰상태에서 구간 도중에 죽었으면(중단 · 한도 초과) 바꾼 폰 상태가 남는다 — 같은 폰을 다음 실행이 쓰니 닫기 전에 kit 이 적어 둔 대로 되돌린다.
// 하나가 실패해도 나머지를 보낸다. 던지지 않는다 — 이미 난 판정을 덮지 않게 (러너 §5.2 「범용 앱 부품」 「되돌리기 둘째 길」)
async function 폰상태를되돌린다(파일: string, 주소: string, headers: Record<string, string>): Promise<void> {
  let 목록: 폰요청[];
  try {
    목록 = JSON.parse(await readFile(파일, 'utf8')) as 폰요청[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') console.error(`[runner] 폰 상태를 되돌릴 요청을 읽지 못했다: ${오류글(err)}`);
    return;
  }
  const 끝 = AbortSignal.timeout(되돌리기_제한_ms);
  for (const r of 목록) {
    // kit 이 쓰는 두 경로만 — 파일이 바뀌어 있어도 연결 밖 주소로 보내지 않게
    if (r.경로 !== 'orientation' && r.경로 !== 'execute/sync') {
      console.error(`[runner] 폰 상태 되돌리기에 모르는 경로가 있다: ${String(r.경로)}`);
      continue;
    }
    try {
      const res = await fetch(`${주소}/${r.경로}`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(r.본문), signal: 끝 });
      if (!res.ok) console.error(`[runner] 폰 상태를 되돌리지 못했다(${r.경로}): HTTP ${res.status}`);
    } catch (err) {
      console.error(`[runner] 폰 상태를 되돌리지 못했다(${r.경로}): ${오류글(err)}`);
    }
  }
}

// 자식이 죽었든 정상 종료했든 kit 이 못 닫았으면 번호 파일이 남아 있다. 팜의 디바이스를 붙들고 있는 연결이라 반드시 닫는다
// 시나리오는 폴더 열쇠가 글자다(trial · scenario · trialId)
// 토큰은 그 연결을 연 것이어야 팜이 닫아 준다. 없으면 러너 환경값이다 (러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)
export async function 앱연결을닫는다(runId: number | string, historyId: number | string, 토큰?: string): Promise<void> {
  // 경로를 여기서 따로 계산하면 kit 이 적은 곳과 어긋나도 아무것도 못 닫고 조용히 넘어간다. kit 의 것을 그대로 쓴다
  const 폴더 = runDir(String(runId), String(historyId));
  const file = join(폴더, APPIUM_SESSION_FILE);
  const 상태파일 = join(폴더, PHONE_STATE_FILE);
  try {
    await 닫는다(file, 상태파일, 토큰);
  } finally {
    // kit 이 연결을 닫았으면(번호 파일 없음) 되돌릴 길이 없다 — 남은 요청이 다음 항목에 섞이지 않게 늘 지운다
    await rm(상태파일, { force: true }).catch((err: unknown) => console.error(`[runner] 폰 상태 파일을 지우지 못했다: ${오류글(err)}`));
  }
}

async function 닫는다(file: string, 상태파일: string, 토큰: string | undefined): Promise<void> {
  let sessionId: string;
  try {
    sessionId = (await readFile(file, 'utf8')).trim();
  } catch (err) {
    // 파일이 없는 것은 번호를 안 남긴 정상 항목이다. 그 밖(권한·폴더 등)은 연결이 안 닫힌 채 남을 수 있어 알린다
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`[runner] Appium 연결 번호를 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    }
    return;
  }
  const raw = process.env.PLATFORM_APPIUM_URL;
  if (sessionId === '' || raw === undefined || raw === '') return;

  try {
    const { base, headers } = appium주소(raw, 토큰 ?? process.env.PLATFORM_APPIUM_TOKEN);
    await 폰상태를되돌린다(상태파일, `${base}/session/${encodeURIComponent(sessionId)}`, headers);
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
    // 번호가 남아 있으면 다음 실행이 이미 닫힌 연결을 또 닫으려 한다. 지우기 실패도 던지면 이미 난 판정이 덮인다
    await rm(file, { force: true }).catch((err: unknown) => {
      console.error(`[runner] Appium 연결 번호 파일을 지우지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    });
  }
}
