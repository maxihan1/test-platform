// 폰 상태 구간 — 화면 방향 · 네트워크 · 가짜 위치 · 어두운 화면 · 글자 크기를 구간 안에서만 바꾸고 끝나면(던져도) 앞 값으로 되돌린다 · 폰 시각 읽기 (도메인/러너 §5.2 「범용 앱 부품」 APP-F3-09)
// 같은 폰을 다음 실행이 쓰는데 팜은 이 상태들을 돌려받을 때 되돌리지 않는다. 그래서 바꾸기 전에 되돌릴 요청을 연결 번호 파일 옆에 적어 두고,
// 케이스 프로세스가 구간 도중에 죽으면 러너가 연결을 닫기 전에 그 파일대로 되돌린다(apps/runner/src/appSession.ts)

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { phoneStateFile, type AppDriver } from './app.js';
import type { 폰요청 } from './protocol.js';
import { 네이티브전용 } from './webview.js';

/** 구간 안에서만 바꿀 것 — 적은 것만 바꾼다. 폰 언어 · 시간대 · 시각은 팜 기준값이라 없다 */
export interface 폰상태 {
  방향?: '가로' | '세로';
  /** 와이파이 · 모바일 데이터를 끈다 — Appium 연결은 USB 라 살아 있다 */
  네트워크?: '끊김';
  위치?: { 위도: number; 경도: number };
  어두운화면?: boolean;
  /** 1 이 기본. 폰 셸이라 팜이 adb_shell 을 열어야 된다 */
  글자크기?: number;
}

interface 할것 {
  // 못 했을 때 오류 앞에 붙는 말 — 「네트워크를 못 끊었다 — <팜이 준 까닭>」
  못함: string;
  무엇: string;
  바꾸기: 폰요청[];
  되돌리기: 폰요청[];
}

const 오류글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));
const 실행 = (script: string, arg: Record<string, unknown> = {}): 폰요청 => ({ 경로: 'execute/sync', 본문: { script, args: [arg] } });
const 방향요청 = (orientation: string): 폰요청 => ({ 경로: 'orientation', 본문: { orientation } });
const 글자크기셸 = (args: string[]): 폰요청 => 실행('mobile: shell', { command: 'settings', args });

async function 보낸다(driver: AppDriver, r: 폰요청): Promise<unknown> {
  if (r.경로 === 'orientation') return driver.setOrientation(String(r.본문.orientation));
  return driver.execute(String(r.본문.script), ...(r.본문.args as unknown[]));
}

// 디바이스 팜이 막은 명령은 무엇을 못 했는지 붙여 던진다
async function 막히면<값>(못함: string, 일: () => Promise<값>): Promise<값> {
  try {
    return await 일();
  } catch (err) {
    throw new Error(`${못함} — ${오류글(err)}`);
  }
}
const 읽는다 = (driver: AppDriver, 못함: string, r: 폰요청): Promise<unknown> => 막히면(못함, () => 보낸다(driver, r));

// 앞 값을 읽어 바꿀 요청과 되돌릴 요청을 짓는다 — 이미 그 값이면 둘 다 비운다(되돌리다 남의 값을 덮지 않게)
async function 짓는다(driver: AppDriver, 바꿀: 폰상태): Promise<할것[]> {
  const 목록: 할것[] = [];
  // 네트워크를 맨 앞에 둔다 — 되돌리기도 이 차례라 러너가 제한 시간에 걸려도 망부터 살린다
  if (바꿀.네트워크 !== undefined) {
    const 앞 = await 읽는다(driver, '네트워크 상태를 못 읽었다', 실행('mobile: getConnectivity', { services: ['wifi', 'data'] }));
    const 망 = 앞 as { wifi?: unknown; data?: unknown } | null;
    // 모르는 답이면 끊을 것이 없다고 보지 않는다 — 망이 살아 있는 채 「끊긴 뒤」 판정이 초록이 된다
    if (typeof 망?.wifi !== 'boolean' || typeof 망.data !== 'boolean') throw new Error(`네트워크 상태를 못 읽었다 — 와이파이 · 모바일 데이터 켬 여부가 없는 답이다: ${JSON.stringify(앞)}`);
    // 켜져 있던 것만 끈다 — 모바일 데이터가 없는 폰(SIM 없음)에 데이터 끄기를 보내지 않는다
    const 켜진 = (['wifi', 'data'] as const).filter((k) => 망[k] === true);
    const 꼴 = (켬: boolean): 폰요청[] => (켜진.length === 0 ? [] : [실행('mobile: setConnectivity', Object.fromEntries(켜진.map((k) => [k, 켬])))]);
    목록.push({ 못함: '네트워크를 못 끊었다', 무엇: '네트워크', 바꾸기: 꼴(false), 되돌리기: 꼴(true) });
  }
  if (바꿀.방향 !== undefined) {
    const 앞 = String(await 막히면('화면 방향을 못 읽었다', () => driver.getOrientation())).toUpperCase();
    const 뒤 = 바꿀.방향 === '가로' ? 'LANDSCAPE' : 'PORTRAIT';
    목록.push({ 못함: '화면을 못 돌렸다', 무엇: '화면 방향', 바꾸기: 앞 === 뒤 ? [] : [방향요청(뒤)], 되돌리기: 앞 === 뒤 ? [] : [방향요청(앞)] });
  }
  if (바꿀.위치 !== undefined) {
    const { 위도, 경도 } = 바꿀.위치;
    // Appium Settings 가 가짜 위치를 내는 동안만 바뀐다 — 거두면 폰의 진짜 위치로 돌아가 앞 값을 읽을 것이 없다
    목록.push({ 못함: '위치를 못 바꿨다', 무엇: '위치', 바꾸기: [실행('mobile: setGeolocation', { latitude: 위도, longitude: 경도 })], 되돌리기: [실행('mobile: resetGeolocation')] });
  }
  if (바꿀.어두운화면 !== undefined) {
    const 앞 = String(await 읽는다(driver, '어두운 화면 설정을 못 읽었다', 실행('mobile: getUiMode', { mode: 'night' })));
    const 뒤 = 바꿀.어두운화면 ? 'yes' : 'no';
    const 꼴 = (value: string): 폰요청[] => (앞 === 뒤 ? [] : [실행('mobile: setUiMode', { mode: 'night', value })]);
    목록.push({ 못함: '어두운 화면을 못 바꿨다', 무엇: '어두운 화면', 바꾸기: 꼴(뒤), 되돌리기: 꼴(앞) });
  }
  if (바꿀.글자크기 !== undefined) {
    const 셸 = '(폰 셸 — 팜이 adb_shell 을 열어야 한다)';
    const 앞 = String(await 읽는다(driver, `글자 크기를 못 읽었다${셸}`, 글자크기셸(['get', 'system', 'font_scale']))).trim();
    // 한 번도 안 바꾼 폰은 null — 되돌리기는 값을 지워 기본(1)으로
    const 기본 = 앞 === 'null' || 앞 === '';
    const 같음 = Number(기본 ? '1' : 앞) === 바꿀.글자크기;
    목록.push({
      못함: `글자 크기를 못 바꿨다${셸}`,
      무엇: '글자 크기',
      바꾸기: 같음 ? [] : [글자크기셸(['put', 'system', 'font_scale', String(바꿀.글자크기)])],
      되돌리기: 같음 ? [] : [글자크기셸(기본 ? ['delete', 'system', 'font_scale'] : ['put', 'system', 'font_scale', 앞])],
    });
  }
  return 목록;
}

function 살핀다(바꿀: 폰상태): void {
  if (Object.values(바꿀).every((v) => v === undefined)) throw new Error('폰상태에서 — 방향 · 네트워크 · 위치 · 어두운화면 · 글자크기 가운데 하나는 적어야 한다');
  // 타입을 우회한 값이 엉뚱하게 폰에 가지 않게 보내기 전에 막는다
  if (바꿀.방향 !== undefined && 바꿀.방향 !== '가로' && 바꿀.방향 !== '세로') throw new Error(`폰상태에서 — 방향은 '가로' · '세로' 다: ${String(바꿀.방향)}`);
  if (바꿀.네트워크 !== undefined && 바꿀.네트워크 !== '끊김') throw new Error(`폰상태에서 — 네트워크는 '끊김' 이다: ${String(바꿀.네트워크)}`);
  const 곳 = 바꿀.위치;
  if (곳 !== undefined && !(Math.abs(곳.위도) <= 90 && Math.abs(곳.경도) <= 180)) throw new Error(`폰상태에서 — 위치는 위도 -90~90 · 경도 -180~180 이다: ${곳.위도}, ${곳.경도}`);
  const 배율 = 바꿀.글자크기;
  if (배율 !== undefined && !(배율 > 0 && 배율 <= 3)) throw new Error(`폰상태에서 — 글자크기는 0 보다 크고 3 까지다(1 이 기본): ${배율}`);
}

// 하나가 실패해도 나머지는 되돌린다 — 못 한 것만 모아 돌려준다(다 되면 null)
async function 되돌린다(driver: AppDriver, 목록: 할것[]): Promise<string | null> {
  const 못한 = [] as string[];
  for (const x of 목록) {
    for (const r of x.되돌리기) {
      try {
        await 보낸다(driver, r);
      } catch (err) {
        못한.push(`${x.무엇}: ${오류글(err)}`);
      }
    }
  }
  // 되돌리기를 마쳤으면 성공 · 실패 없이 지운다 — 케이스가 끝나면 kit 이 연결을 닫아 러너가 다시 보낼 연결이 없고,
  // 남겨 두면 같은 폴더를 쓰는 다음 구간(E2E 의 다음 단계)이 덮어 그 실패가 묻힌다. 실패는 던져서 알린다
  await rm(phoneStateFile(), { force: true }).catch((err: unknown) => console.error(`[kit] 폰 상태 파일을 지우지 못했다: ${오류글(err)}`));
  return 못한.length > 0 ? 못한.join(' · ') : null;
}

const 구간중 = new WeakSet<AppDriver>();

/**
 * 구간 안에서만 폰 상태를 바꾸고 끝나면(던져도) 앞 값으로 되돌린다. 앞 값을 다 읽은 뒤에 바꾼다 — 하나라도 못 읽으면 아무것도 안 바꾸고 던진다.
 * 디바이스 팜이 막은 명령은 「네트워크를 못 끊었다 — <까닭>」 꼴로 던진다(조용히 넘기면 안 바뀐 상태에서 판정이 초록이 된다).
 * 되돌리기에 실패하면 던진다 — 할일이 이미 던졌으면 그 오류에 까닭을 덧붙인다(공통/2-명세선언 「범용 앱」)
 */
export async function 폰상태에서<값>(driver: AppDriver, 바꿀: 폰상태, 할일: () => Promise<값>): Promise<값> {
  네이티브전용(driver, '폰상태에서');
  if (구간중.has(driver)) throw new Error('폰상태에서 구간 안에서 폰상태에서 를 또 부를 수 없다 — 바꿀 것을 한 구간에 모아 적는다');
  살핀다(바꿀);
  구간중.add(driver);
  try {
    const 목록 = await 짓는다(driver, 바꿀);
    try {
      const 파일 = phoneStateFile();
      await mkdir(dirname(파일), { recursive: true });
      await writeFile(파일, JSON.stringify(목록.flatMap((x) => x.되돌리기)));
    } catch (err) {
      // 못 적어도 구간 안의 되돌리기는 돈다 — 케이스가 도중에 죽을 때의 둘째 길만 없다
      console.error(`[kit] 폰 상태를 되돌릴 요청을 적지 못했다: ${오류글(err)}`);
    }
    let 값: 값;
    try {
      for (const x of 목록) for (const r of x.바꾸기) await 막히면(x.못함, () => 보낸다(driver, r));
      값 = await 할일();
    } catch (err) {
      const 못한 = await 되돌린다(driver, 목록);
      if (못한 !== null) {
        const 덧 = ` (폰 상태도 못 되돌렸다 — ${못한})`;
        if (!(err instanceof Error)) throw new Error(`${String(err)}${덧}`);
        // 보고가 stack 을 찍는 길도 있어 둘 다 고친다 — stack 은 만들 때 글이 굳는다
        err.message += 덧;
        if (err.stack !== undefined) err.stack = `${err.stack}\n${덧.trim()}`;
      }
      throw err;
    }
    const 못한 = await 되돌린다(driver, 목록);
    if (못한 !== null) throw new Error(`폰 상태를 구간 전으로 못 되돌렸다 — ${못한}`);
    return 값;
  } finally {
    구간중.delete(driver);
  }
}

/** 폰 시각 — 꼴은 moment 꼴(기본 YYYY-MM-DDTHH:mm:ssZ)이고 폰 시간대 기준이다. 「오늘」이 러너가 아니라 폰의 날짜여야 하는 케이스가 쓴다 */
export async function 폰시각(driver: AppDriver, 꼴?: string): Promise<string> {
  try {
    return String(await driver.execute('mobile: getDeviceTime', 꼴 === undefined ? {} : { format: 꼴 })).trim();
  } catch (err) {
    throw new Error(`폰 시각을 못 읽었다 — ${오류글(err)}`);
  }
}
