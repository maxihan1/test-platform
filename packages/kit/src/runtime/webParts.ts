// 웹 케이스가 서비스마다 다시 짜던 기본 동작 — 지금은 로그인 상태 이어 쓰기 하나다 (도메인/러너 §5.2 「웹 공용 부품」)
// 뜨는 창 · 화면 밖 요소는 Playwright 가 이미 준다(addLocatorHandler · scrollIntoViewIfNeeded) — 감싸지 않고 작성 규칙이 가리킨다

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Page } from '@playwright/test';

/** 저장한 로그인 상태를 믿는 시간 — 넘으면 다시 로그인한다. 세션이 그 전에 끊겨도 `들어왔나` 가 걸러 준다 */
const 믿는시간 = 30 * 60_000;

type 저장상태 = Awaited<ReturnType<ReturnType<Page['context']>['storageState']>>;

export interface 로그인이어쓰기설정 {
  /** 화면으로 로그인한다 — 저장한 상태가 없거나 끊겼을 때만 불린다 */
  로그인: () => Promise<void>;
  /** 로그인한 뒤의 화면을 열고 들어와 있는지 돌려준다 — 저장한 상태를 넣은 뒤 불린다. 던지지 않는다 */
  들어왔나: () => Promise<boolean>;
}

/** 대상 서버 · 계정마다 파일 하나. 임시 폴더는 작성 자식마다 따로라(TMPDIR) 다른 작성과 안 섞인다 */
function 상태파일(열쇠: string, env: Record<string, string | undefined>): string {
  const 지문 = createHash('sha256').update(`${env.PLATFORM_BASE_URL ?? ''}\0${열쇠}`).digest('hex').slice(0, 32);
  return join(tmpdir(), 'platform-login', `${지문}.json`);
}

async function 읽기(파일: string, 지금: number): Promise<저장상태 | null> {
  try {
    if (지금 - (await stat(파일)).mtimeMs > 믿는시간) return null;
    return JSON.parse(await readFile(파일, 'utf8')) as 저장상태;
  } catch {
    // 없거나 깨진 파일은 처음 로그인하는 것과 같다
    return null;
  }
}

/**
 * 계정마다 처음 한 번만 화면으로 로그인하고, 그 뒤 케이스는 저장해 둔 로그인 상태(쿠키 · localStorage)로 시작한다.
 * 케이스마다 화면으로 로그인하면 느리고 대상 서버의 로그인 한도에 걸린다(MTW 334건 가운데 230건 · 마지막 3회 — Mastodon 계정당 1시간 25회에 걸려 작성이 5시간 멈췄다).
 * 저장한 상태가 끊겼으면(`들어왔나` 가 거짓) 지우고 다시 로그인한다 — 느려질 뿐 틀리지 않는다.
 * `열쇠` 는 계정을 가르는 값이다(아이디). 로그인 화면 자체를 시험하는 케이스 · 계정 상태를 바꾸는 케이스(비밀번호 변경 · 탈퇴)는 쓰지 않는다
 */
export async function 로그인이어쓰기(page: Page, 열쇠: string, 설정: 로그인이어쓰기설정, env: Record<string, string | undefined> = process.env): Promise<void> {
  const 파일 = 상태파일(열쇠, env);
  const 앞 = await 읽기(파일, Date.now());
  if (앞 !== null) {
    await page.context().addCookies(앞.cookies);
    // localStorage 는 그 출처의 화면이 떠 있어야 넣을 수 있다. init script 로 넣으면 다시 로그인한 뒤에도 옛 값을 덮어쓴다
    for (const 출처 of 앞.origins.filter((o) => o.localStorage.length > 0)) {
      await page.goto(출처.origin);
      await page.evaluate((값들) => {
        for (const { name, value } of 값들) localStorage.setItem(name, value);
      }, 출처.localStorage);
    }
    if (await 설정.들어왔나()) return;
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear()).catch(() => undefined);
  }
  await 설정.로그인();
  // PC · 휴대폰이 나란히 돌며 같은 파일을 쓴다 — 반쯤 쓴 파일을 읽지 않게 옆에 쓰고 이름을 바꾼다. 세션이 든 파일이라 나만 읽는다
  try {
    await mkdir(join(파일, '..'), { recursive: true, mode: 0o700 });
    const 임시 = `${파일}.${process.pid}.tmp`;
    await writeFile(임시, JSON.stringify(await page.context().storageState()), { mode: 0o600 });
    await rename(임시, 파일);
  } catch (err) {
    // 못 남겨도 이 케이스는 로그인돼 있다 — 다음 케이스가 다시 로그인할 뿐이다
    console.error(`[kit] 로그인 상태를 남기지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}
