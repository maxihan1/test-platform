// 게임 빌드 zip 을 받아 게임 데이터 묶음 값 · 칸 이름을 꺼낸다 — 전략 계산과 get 점 경로 읽기에 쓰고 지도에는 적지 않는다 (게임 정보 먼저 쌓기 · 도메인/게임 §3.10)
// 고객 zip 은 믿을 수 없는 파일이다. 받기는 스트림으로 디스크에 쓰며 상한을 세고, 풀기 · 읽기는 전부 자리 uid · 빈 환경의 파이썬(authoring-game-build-data.py)이 한다 — 이 쪽은 zip 을 열지 않는다

import { chmodSync, chownSync, copyFileSync, createWriteStream, existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import type { ReadableStream as 웹스트림 } from 'node:stream/web';
import { pipeline } from 'node:stream/promises';

import { 앱링크파일 } from './authoring-app-screen.js';
import { 자식빈환경 } from './authoring-child.js';
import type { 계정 } from './authoring-copy.js';
import { 게임자리 } from './authoring-game.js';
import { 돌린다 } from './authoring-spawn.js';
import { 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

/** 작성 이미지가 만드는 파이썬(UnityPy · TypeTreeGeneratorAPI 가 든 venv). 없으면 꺼내기를 건너뛴다 */
export const 파이썬길 = '/opt/unitypy/bin/python3';
const 스크립트 = join(import.meta.dirname, 'authoring-game-build-data.py');

// 받은 zip 크기 상한 — 넘으면 건너뛴다. 풀린 크기 · 항목 수 상한은 파이썬이 센다
const 받기상한 = 2 * 1024 ** 3;
const 받기제한_ms = 20 * 60_000;
const 파이썬제한_ms = 10 * 60_000;
/** 파이썬 끝 코드 — 2 zip 거절(열쇠를 안 남긴다) · 3 건너뜀(IL2CPP · 열쇠는 남긴다) */
const 거절 = 2;
const 건너뜀코드 = 3;

/** 서명 링크의 앞(PLATFORM_PUBLIC_URL)을 작성 컨테이너가 닿는 admin 주소로 바꾼다 — 서명은 경로 · 번호 · 기한만 보니 그대로 통한다. 빌드 링크가 아니면 null */
export function 받을주소(링크: string, 관리주소: string): string | null {
  const 자리 = 링크.indexOf('/api/builds/');
  return 자리 < 0 ? null : `${관리주소.replace(/\/+$/, '')}${링크.slice(자리)}`;
}

/** 링크의 빌드 번호 — 캐시 열쇠다. 빌드가 바뀌면 번호가 바뀐다 */
export function 빌드열쇠(링크: string): string | null {
  return /\/api\/builds\/(\d+)\//.exec(링크)?.[1] ?? null;
}

/** 같은 빌드에서 이미 꺼냈나 — 열쇠 파일이 같으면 다시 안 받는다. 꺼낼 게 없던 빌드(IL2CPP)도 열쇠만 남겨 다시 안 받는다 */
export function 캐시맞나(자료: string, 열쇠: string): boolean {
  return 안전히읽기(자료, 게임자리.빌드열쇠, 100)?.trim() === 열쇠;
}

/** 빌드 데이터 캐시 자리 — 작업 바탕의 `game-build-data/<서비스 접두사>`. 작성마다 새로 생기는 자료 폴더와 달리 같은 서비스의 다음 작성도 쓴다(조작 도우미 이어 쓰기 `game-helpers/<접두사>` 와 같은 곳). 접두사가 경로로 못 쓰는 글자면 undefined */
export const 캐시자리만들기 = (바탕: string, 접두사: string): string | undefined => (/^[A-Za-z0-9_-]{1,40}$/.test(접두사) ? join(바탕, 'game-build-data', 접두사) : undefined);

const 꺼낸것들 = [게임자리.빌드데이터, 게임자리.종류표] as const;

/** 캐시 → 자료 폴더 — 열쇠가 맞는 것만. 꺼낼 게 없던 빌드는 파일이 없고 열쇠만 있다 */
function 캐시에서가져오기(캐시자리: string, 자료: string, 열쇠: string): boolean {
  const 빌드 = join(캐시자리, 열쇠);
  if (!캐시맞나(빌드, 열쇠)) return false;
  for (const 이름 of 꺼낸것들) {
    if (!existsSync(join(빌드, 이름))) continue;
    copyFileSync(join(빌드, 이름), join(자료, 이름));
    chmodSync(join(자료, 이름), 0o644);
  }
  새로쓰기(join(자료, 게임자리.빌드열쇠), 열쇠);
  return true;
}

/** 자료 폴더 → 캐시 — 이 서비스의 앞 빌드 것은 지운다. 새 폴더에 다 쓴 뒤 이름을 바꿔 두어 반쪽 캐시를 못 읽게 한다 */
function 캐시에남기기(캐시자리: string, 자료: string, 열쇠: string): void {
  mkdirSync(캐시자리, { recursive: true, mode: 0o755 });
  const 새 = mkdtempSync(join(캐시자리, '.새-'));
  try {
    for (const 이름 of 꺼낸것들) if (existsSync(join(자료, 이름))) copyFileSync(join(자료, 이름), join(새, 이름));
    새로쓰기(join(새, 게임자리.빌드열쇠), 열쇠);
    for (const 옛 of readdirSync(캐시자리)) if (/^\d+$/.test(옛)) rmSync(join(캐시자리, 옛), { recursive: true, force: true });
    renameSync(새, join(캐시자리, 열쇠));
  } catch (e) {
    rmSync(새, { recursive: true, force: true });
    throw e;
  }
}

/** zip 을 파일로 받는다 — 응답 몸을 스트림으로 쓰며 누적 바이트가 상한을 넘으면 끊는다(Content-Length 가 없거나 거짓이어도). 못 받았으면 까닭 글 */
async function 받기(주소: string, 받는것: typeof fetch, 파일: string, 상한 = 받기상한): Promise<string | null> {
  const 답 = await 받는것(주소, { signal: AbortSignal.timeout(받기제한_ms) });
  if (!답.ok) return `서버 ${답.status}`;
  const 크기 = Number(답.headers.get('content-length') ?? 0);
  if (크기 > 상한) return `zip 이 너무 크다(${크기} 바이트)`;
  if (답.body === null) return '응답에 몸이 없다';
  let 쌓임 = 0;
  const 세기 = new Transform({
    transform(조각: Buffer, _인코딩, 다음) {
      쌓임 += 조각.length;
      다음(쌓임 > 상한 ? new Error(`zip 이 너무 크다(${상한} 바이트를 넘었다)`) : null, 조각);
    },
  });
  await pipeline(Readable.fromWeb(답.body as unknown as 웹스트림), 세기, createWriteStream(파일, { mode: 0o644, flags: 'wx' }));
  return null;
}

export interface 꺼내기입력 {
  자료: string;
  /** 자식 TMPDIR — 받은 zip 과 풀어 놓는 곳이고 파이썬이 끝나면 지운다 */
  임시: string;
  집: string;
  /** 작성 컨테이너가 닿는 admin 주소(PLATFORM_ADMIN_URL) */
  관리주소: string;
  자식: 계정 | null;
  알린다: (글: string) => void;
  /** 같은 서비스의 다음 작성이 다시 안 받게 꺼낸 것을 두는 자리(캐시자리만들기) — 없으면 자료 폴더에만 둔다 */
  캐시자리?: string;
  /** 시험용 — 파이썬 길 · 받기 · 받기 상한 */
  파이썬?: string;
  받는것?: typeof fetch;
  받기상한?: number;
}

const 지울것 = (자료: string): void => {
  for (const 이름 of [게임자리.빌드데이터, 게임자리.종류표, 게임자리.빌드열쇠]) rmSync(join(자료, 이름), { force: true });
};

/**
 * 자료 폴더의 앱 링크로 빌드 zip 을 받아 `game-build-data.json` · `game-types.txt` 를 만든다. 못 해도 작성은 간다 — 까닭 한 줄을 알리고 돌아온다.
 * 같은 빌드면 다시 안 받는다 — 자료 폴더의 열쇠(`game-build-data.key`)나 작업 바탕의 캐시에 같은 빌드 번호가 있으면 거기서 가져온다. 앞 빌드의 낡은 값은 새로 꺼내기 전에 지운다
 */
export async function 게임빌드데이터꺼내기(입력: 꺼내기입력): Promise<void> {
  const { 자료, 알린다, 캐시자리 } = 입력;
  const 건너뜀 = (까닭: string): void => 알린다(`게임 빌드 데이터를 안 꺼낸다(작성은 간다): ${까닭}`);
  const 링크 = 안전히읽기(자료, basename(앱링크파일(자료)), 8_192)?.trim() ?? '';
  const 주소 = 링크 === '' ? null : 받을주소(링크, 입력.관리주소);
  const 열쇠 = 링크 === '' ? null : 빌드열쇠(링크);
  if (주소 === null || 열쇠 === null) return 건너뜀('앱 링크가 빌드 링크가 아니다');
  if (캐시맞나(자료, 열쇠)) return 알린다(`게임 빌드 데이터는 빌드 ${열쇠} 것을 그대로 쓴다`);
  지울것(자료);
  if (캐시자리 !== undefined) {
    try {
      if (캐시에서가져오기(캐시자리, 자료, 열쇠)) return 알린다(`게임 빌드 데이터는 빌드 ${열쇠} 것을 작업 바탕의 캐시에서 가져왔다`);
    } catch (e) {
      지울것(자료);
      알린다(`게임 빌드 데이터 캐시를 못 읽었다(새로 받는다): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const 파이썬 = 입력.파이썬 ?? 파이썬길;
  if (!existsSync(파이썬)) return 건너뜀(`${파이썬} 이 없다(작성 이미지에 UnityPy 가 없다)`);
  let 풀곳: string | null = null;
  try {
    풀곳 = mkdtempSync(join(입력.임시, 'game-build-'));
    chmodSync(풀곳, 0o755); // 자식 uid 의 파이썬이 읽고 쓴다 — 부모 임시 폴더가 그 uid 만 여는 0700 이다
    if (입력.자식 !== null) chownSync(풀곳, 입력.자식.uid, 입력.자식.gid);
    const 압축파일 = join(풀곳, 'build.zip');
    const 못받음 = await 받기(주소, 입력.받는것 ?? fetch, 압축파일, 입력.받기상한);
    if (못받음 !== null) return 건너뜀(`zip 을 못 받았다 — ${못받음}`);
    const 환경 = 입력.자식 === null ? undefined : 자식빈환경({ HOME: 입력.집, TMPDIR: 입력.임시 });
    // -I — 풀어 놓은 폴더나 현재 폴더에 심은 모듈을 파이썬이 불러오지 않게 한다. 풀기도 파이썬이 디스크에서 한다
    const 결과 = await 돌린다(파이썬, ['-I', 스크립트, 압축파일, join(풀곳, 'data'), 자료], {
      cwd: 입력.임시, 제한: 파이썬제한_ms, ...(환경 === undefined ? {} : { env: 환경 }), ...(입력.자식 === null ? {} : { uid: 입력.자식.uid, gid: 입력.자식.gid }),
    });
    const 끝줄 = 결과.낸것.trim().split('\n').pop() ?? '';
    if (결과.코드 === 거절) return 건너뜀(끝줄);
    if (결과.코드 !== 0 && 결과.코드 !== 건너뜀코드) return 건너뜀(`파이썬이 실패했다 — ${(결과.시간초과 ? '시간 초과' : 결과.오류.trim().split('\n').pop()) ?? ''}`);
    새로쓰기(join(자료, 게임자리.빌드열쇠), 열쇠);
    if (캐시자리 !== undefined) {
      try {
        캐시에남기기(캐시자리, 자료, 열쇠);
      } catch (e) {
        알린다(`게임 빌드 데이터 캐시를 못 남겼다(다음 작성은 다시 받는다): ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (결과.코드 === 건너뜀코드) return 건너뜀(끝줄);
    알린다(`게임 빌드 데이터를 꺼냈다(빌드 ${열쇠}): ${끝줄}`);
  } catch (e) {
    건너뜀(e instanceof Error ? e.message : String(e));
  } finally {
    if (풀곳 !== null) rmSync(풀곳, { recursive: true, force: true });
  }
}
