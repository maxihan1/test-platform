// 웹 케이스가 서비스마다 다시 짜던 기본 동작 — 지금은 로그인 상태 이어 쓰기 하나다 (도메인/러너 §5.2 「웹 공용 부품」)
// 뜨는 창 · 화면 밖 요소는 Playwright 가 이미 준다(addLocatorHandler · scrollIntoViewIfNeeded) — 감싸지 않고 작성 규칙이 가리킨다

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { Page } from '@playwright/test';

/** 저장한 로그인 상태를 믿는 시간 — 넘으면 다시 로그인한다. 세션이 그 전에 끊겨도 `들어왔나` 가 걸러 준다 */
const 믿는시간 = 30 * 60_000;

type 쿠키 = Awaited<ReturnType<ReturnType<Page['context']>['cookies']>>[number];
type 저장값 = { name: string; value: string };
/** 남기는 것 — 대상 서버의 쿠키와 도우미가 고른 localStorage 키뿐이다. 통째로 남기면 「안내 봤음」 같은 값까지 다음 케이스로 넘어간다 */
interface 남긴상태 {
  cookies: 쿠키[];
  저장: 저장값[];
}

export interface 로그인이어쓰기설정 {
  /** 화면으로 로그인한다 — 남긴 상태가 없거나 끊겼을 때만 불린다. 어떤 화면 · 어떤 계정에서 불려도 되게 쓴다(E2E 는 창을 이어 쓴다) */
  로그인: () => Promise<void>;
  /** 로그인한 뒤의 화면을 열고 들어와 있는지 돌려준다 — 남긴 상태를 넣은 뒤 불린다 */
  들어왔나: () => Promise<boolean>;
  /** 로그인 값을 localStorage 에 두는 앱만 — 이어 쓸 키 이름. 안 적으면 쿠키만 이어 쓴다 */
  저장키?: readonly string[];
}

const 알림 = (말: string, err: unknown) => console.error(`[kit] ${말}: ${err instanceof Error ? err.message : String(err)}`);

/** 대상 서버 · 아이디 · 암호마다 파일 하나 — 암호가 다르면(틀린 암호를 넣는 케이스 · 설정에서 바꾼 직후) 남의 세션을 안 쓴다. 암호는 지문으로만 들어간다 */
function 상태파일(출처: string, 아이디: string, 암호: string): string {
  const 지문 = createHash('sha256').update([출처, 아이디, 암호].join('\0')).digest('hex').slice(0, 32);
  return join(tmpdir(), 'platform-login', `${지문}.json`);
}

async function 읽기(파일: string, 지금: number): Promise<남긴상태 | null> {
  try {
    if (지금 - (await stat(파일)).mtimeMs > 믿는시간) return null;
    return JSON.parse(await readFile(파일, 'utf8')) as 남긴상태;
  } catch {
    // 없거나 깨진 파일은 처음 로그인하는 것과 같다
    return null;
  }
}

/** 쿠키가 그 서버 것인가 — `.example.com` 은 `qa.example.com` 에도 간다 */
const 서버쿠키인가 = (c: 쿠키, 호스트: string): boolean => {
  const 도메인 = c.domain.replace(/^\./, '');
  return 호스트 === 도메인 || 호스트.endsWith(`.${도메인}`);
};

/**
 * 계정마다 처음 한 번만 화면으로 로그인하고, 그 뒤 케이스는 남겨 둔 로그인 상태로 시작한다.
 * 케이스마다 화면으로 로그인하면 느리고 대상 서버의 로그인 한도에 걸린다(MTW 334건 가운데 230건 · 마지막 3회 — Mastodon 계정당 1시간 25회에 걸려 작성이 5시간 멈췄다).
 * 남긴 상태가 끊겼거나 넣다 실패하면 넣은 것만 걷고 그 파일을 지운 뒤 화면으로 로그인한다.
 * 같은 계정의 케이스가 서버 세션 하나를 나눠 쓴다 — 세션을 끊는 케이스(로그아웃 · 비밀번호 변경 · 탈퇴)와 로그인 화면 자체를 시험하는 케이스는 쓰지 않는다
 */
export async function 로그인이어쓰기(page: Page, 아이디: string, 암호: string, 설정: 로그인이어쓰기설정, env: Record<string, string | undefined> = process.env): Promise<void> {
  let 출처: URL;
  try {
    출처 = new URL(env.PLATFORM_BASE_URL ?? '');
  } catch {
    // 대상 서버를 모르면 어느 서버의 세션인지 가를 수 없다 — 이어 쓰지 않는다
    return 설정.로그인();
  }
  const 파일 = 상태파일(출처.origin, 아이디, 암호);
  const 키들 = 설정.저장키 ?? [];
  const 앞 = await 읽기(파일, Date.now());
  if (앞 !== null) {
    try {
      await page.context().addCookies(앞.cookies);
      // localStorage 는 그 출처의 화면이 떠 있어야 넣을 수 있다. init script 로 넣으면 다시 로그인한 뒤에도 옛 값을 덮어쓴다
      if (앞.저장.length > 0) {
        await page.goto(출처.origin);
        await page.evaluate((값들) => {
          for (const { name, value } of 값들) localStorage.setItem(name, value);
        }, 앞.저장);
      }
      if (await 설정.들어왔나()) return;
    } catch (err) {
      알림('남긴 로그인 상태를 넣지 못해 화면으로 로그인한다', err);
    }
    // 넣은 것만 걷는다 — 도우미가 넣어 둔 다른 쿠키(안내 창 막기)나 E2E 앞 단계의 쿠키는 그대로 둔다
    for (const c of 앞.cookies) await page.context().clearCookies({ name: c.name, domain: c.domain }).catch(() => undefined);
    if (앞.저장.length > 0) {
      await page
        .evaluate((이름들) => {
          for (const 이름 of 이름들) localStorage.removeItem(이름);
        }, 앞.저장.map((v) => v.name))
        .catch(() => undefined);
    }
    // 같은 계정의 다음 케이스가 같은 자리에서 또 넘어지지 않게
    await rm(파일, { force: true }).catch(() => undefined);
  }
  await 설정.로그인();
  // PC · 휴대폰이 나란히 돌며 같은 파일을 쓴다 — 반쯤 쓴 파일을 읽지 않게 옆에 쓰고 이름을 바꾼다. 세션이 든 파일이라 나만 읽는다
  try {
    const 상태 = await page.context().storageState();
    const 남길: 남긴상태 = {
      cookies: 상태.cookies.filter((c) => 서버쿠키인가(c, 출처.hostname)),
      저장: (상태.origins.find((o) => o.origin === 출처.origin)?.localStorage ?? []).filter((v) => 키들.includes(v.name)),
    };
    await mkdir(dirname(파일), { recursive: true, mode: 0o700 });
    const 임시 = `${파일}.${process.pid}.tmp`;
    await writeFile(임시, JSON.stringify(남길), { mode: 0o600 });
    await rename(임시, 파일);
  } catch (err) {
    // 못 남겨도 이 케이스는 로그인돼 있다 — 다음 케이스가 다시 로그인할 뿐이다
    알림('로그인 상태를 남기지 못했다', err);
  }
}
