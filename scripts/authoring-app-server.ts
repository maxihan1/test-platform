// 앱 작성이 폰을 잡은 직후 폰이 대상 서버에 닿는지 본다 — `npm run authoring:run -- 앱서버` (SPEC 도메인/작성 §3.6 「앱 화면」 「서버에 닿는지」)
// 폰 돌려 보기(authoring-run3-game)에서 떼어 냈다 — 그 파일이 300줄을 넘었다

import { 앱줄주소, 잡은폰 } from './authoring-run3-game.js';

/**
 * 폰 안에서 두드려 볼 자리 — 맥에 뜬 대상 서버(localhost · host.docker.internal)는 디바이스 팜이 폰의 127.0.0.1 같은 포트로 잇는다
 * (팜 설정 `DF_REVERSE_PORTS` 의 `adb reverse` — Devicefarm INT-F13-12 · PR #63). 그 밖의 주소는 폰이 제 망으로 그대로 간다. 주소가 아니면 null
 */
export function 폰에서볼자리(주소: string): { 호스트: string; 포트: number } | null {
  let u: URL;
  try {
    u = new URL(주소);
  } catch {
    return null;
  }
  const 포트 = u.port !== '' ? Number(u.port) : u.protocol === 'https:' ? 443 : u.protocol === 'http:' ? 80 : null;
  if (포트 === null) return null;
  const 맥 = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0', 'host.docker.internal'].includes(u.hostname);
  return { 호스트: 맥 ? '127.0.0.1' : u.hostname, 포트 };
}

export type 두드린결과 = { 닿음: boolean } | { 모름: string };

/** `nc -z … ; echo rc=$?` 의 답. -z 가 없는 옛 toybox · nc 가 없는 폰 · 끝 코드가 없는 답은 닿는지 모른다 — 못 닿음으로 치면 멀쩡한 작성을 멈춘다 */
export function nc답읽기(답: { stdout?: string; stderr?: string }): 두드린결과 {
  const 끝코드 = /rc=(\d+)/.exec(답.stdout ?? '')?.[1];
  const 오류 = (답.stderr ?? '').trim().split('\n')[0] ?? '';
  if (끝코드 === undefined || /unknown option|usage|not found|inaccessible/i.test(오류)) return { 모름: 오류 || '폰이 끝 코드를 안 돌려줬다' };
  return { 닿음: 끝코드 === '0' };
}

/** 잡은 폰에 앱 없이 붙어 `nc -z` 로 포트를 두드린다. 팜이 연 adb 명령 길(`uiautomator2:adb_shell` — 러너 §5.2 「디바이스 팜 접속 방식」)을 쓴다 */
async function 폰에서두드리기(appium: string, 폰: string, 자리: { 호스트: string; 포트: number }, token: string | undefined): Promise<두드린결과> {
  const url = new URL(appium);
  const { remote } = await import('webdriverio');
  let 연결: Awaited<ReturnType<typeof remote>>;
  try {
    // kit openApp 과 같은 조각으로 붙는다 — 앱을 안 깔아 빠르고, 놓을 때 팜 정리가 돈다
    연결 = await remote({
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
      path: url.pathname,
      logLevel: 'error',
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : url.username && { user: decodeURIComponent(url.username), key: decodeURIComponent(url.password) }),
      capabilities: { platformName: 'Android', 'appium:automationName': 'UiAutomator2', 'appium:udid': 폰 },
    });
  } catch (e) {
    return { 모름: `폰에 못 붙었다 — ${e instanceof Error ? e.message.split('\n')[0] : String(e)}` };
  }
  try {
    // 끝 코드를 글로 받는다 — 옛 adb(shell v2 없음)는 끝 코드를 안 넘겨 던지기만으로는 거절도 닿음으로 읽힌다. `;` 뒤는 폰 셸이 읽는다
    return nc답읽기((await 연결.execute('mobile: shell', { command: 'nc', args: ['-z', '-w', '3', 자리.호스트, String(자리.포트), ';', 'echo', 'rc=$?'], includeStderr: true })) as { stdout?: string; stderr?: string });
  } catch (e) {
    // 명령이 안 돌았다 — 팜이 adb 명령 길을 닫았거나 세션이 끊겼다
    return { 모름: e instanceof Error ? e.message.split('\n')[0]! : String(e) };
  } finally {
    await 연결.deleteSession().catch(() => undefined);
  }
}

/**
 * `npm run authoring:run -- 앱서버` — 앱 작성이 폰을 잡은 직후 폰이 대상 서버에 닿는지. 0 닿음 · 1 못 닿음(케이스를 쓰기 전에 멈춘다) · 2 확인 못 함(지금처럼 간다).
 * 14677 이 폰에서 서버에 못 닿은 결과를 「공백 비밀번호가 안 막힘」으로 읽었다 (작성 §3.6 「앱 화면」 「서버에 닿는지」 · 2026-10-26 PRD-F16-02)
 */
export async function 앱서버확인(트리: string, env: NodeJS.ProcessEnv, 두드리기: typeof 폰에서두드리기 = 폰에서두드리기): Promise<number> {
  const 머리 = '[앱 서버]';
  const 모름 = (까닭: string) => {
    console.error(`${머리} 닿는지 확인 못 함 — ${까닭}. 멈추지 않고 간다 — 결과 요약 「못 읽은 자료」 줄에 \`앱 서버 — 확인 못 함(${까닭})\` 을 적는다`);
    return 2;
  };
  if (!env.PLATFORM_APPIUM_URL) return 모름('디바이스 팜이 안 붙었다');
  const 주소 = 앱줄주소(env, true);
  if (주소 === null) return 모름('앱 줄을 모른다(계정이 없다)');
  const 자리 = 폰에서볼자리(주소);
  if (자리 === null) return 모름(`주소 꼴이 아니다: ${주소}`);
  const 폰 = 잡은폰(트리, '앱');
  if (폰 === null) return 모름('잡은 폰이 없다 — `npx appium-cli hold --minutes 30` 뒤에 부른다');
  const 결과 = await 두드리기(env.PLATFORM_APPIUM_URL, 폰, 자리, env.PLATFORM_APPIUM_TOKEN);
  if ('모름' in 결과) return 모름(결과.모름);
  const 어디 = `${주소}(폰에서 ${자리.호스트}:${자리.포트})`;
  if (결과.닿음) {
    console.log(`${머리} 폰 ${폰} 이 ${어디} 에 닿는다`);
    return 0;
  }
  console.log(
    `${머리} 폰 ${폰} 이 ${어디} 에 못 닿는다 — 케이스를 쓰지 않는다. \`close\` 하고(Android 앱 작성은 release 하지 않는다 — 웹 · 게임 작성에 딸린 앱 케이스만 \`release\` 까지, app.md 「폰은 언제 놓나」), 결과 요약 「못 읽은 자료」 줄에 \`앱 서버 — 폰에서 ${어디} 에 못 닿음\` 을 적고 끝낸다` +
      ' (맥의 서버면 디바이스 팜을 그 포트의 DF_REVERSE_PORTS 로 띄웠는지 사람이 본다)',
  );
  return 1;
}
