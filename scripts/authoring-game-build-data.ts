// 게임 빌드 zip 을 받아 게임 데이터 묶음 값 · 칸 이름을 꺼낸다 — 전략 계산과 get 점 경로 읽기에 쓰고 지도에는 적지 않는다 (게임 정보 먼저 쌓기 · 도메인/게임 §3.10)
// 고객 zip 은 믿을 수 없는 파일이다. 풀 때 자리 밖으로 새는 항목을 거절하고, 파이썬은 자리 uid · 빈 환경으로 부른다

import { chmodSync, createWriteStream, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import JSZip from 'jszip';

import { 앱링크파일 } from './authoring-app-screen.js';
import { 자식빈환경 } from './authoring-child.js';
import type { 계정 } from './authoring-copy.js';
import { 게임자리 } from './authoring-game.js';
import { 돌린다 } from './authoring-spawn.js';
import { 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

/** 작성 이미지가 만드는 파이썬(UnityPy · TypeTreeGeneratorAPI 가 든 venv). 없으면 꺼내기를 건너뛴다 */
export const 파이썬길 = '/opt/unitypy/bin/python3';
const 스크립트 = join(import.meta.dirname, 'authoring-game-build-data.py');

// 받은 zip 과 풀어 놓은 크기 상한 — 넘으면 건너뛴다. 풀 때 그림 · 소리 원본(resS · resource)과 StreamingAssets 는 안 푼다(값이 아니다)
const 받기상한 = 2 * 1024 ** 3;
const 풀기상한 = 3 * 1024 ** 3;
const 항목상한 = 100_000;
const 받기제한_ms = 20 * 60_000;
const 파이썬제한_ms = 10 * 60_000;

/** 서명 링크의 앞(PLATFORM_PUBLIC_URL)을 작성 컨테이너가 닿는 admin 주소로 바꾼다 — 서명은 경로 · 번호 · 기한만 보니 그대로 통한다. 빌드 링크가 아니면 null */
export function 받을주소(링크: string, 관리주소: string): string | null {
  const 자리 = 링크.indexOf('/api/builds/');
  return 자리 < 0 ? null : `${관리주소.replace(/\/+$/, '')}${링크.slice(자리)}`;
}

/** 링크의 빌드 번호 — 캐시 열쇠다. 빌드가 바뀌면 번호가 바뀐다 */
export function 빌드열쇠(링크: string): string | null {
  return /\/api\/builds\/(\d+)\//.exec(링크)?.[1] ?? null;
}

const 위험한이름인가 = (이름: string): boolean =>
  이름.includes('\\') || 이름.includes('\0') || 이름.startsWith('/') || /^[A-Za-z]:/.test(이름) || 이름.split('/').includes('..');

export type 풀계획 = { 막힘: string } | { 건너뜀: string } | { 뿌리: string; 항목: string[] };

/**
 * zip 항목 이름들에서 풀 것을 고른다. 자리 밖으로 새는 항목(`..` · 절대 경로)이 하나라도 있으면 통째로 거절한다 — 정상 빌드에는 없다.
 * `Managed/*.dll` 이 있는 데이터 폴더(윈도우 `<X>_Data` · 맥 `Contents/Resources/Data` · 안드로이드 `assets/bin/Data`)가 뿌리다. dll 이 없으면 IL2CPP 빌드라 건너뛴다
 */
export function 풀계획만들기(이름들: readonly string[]): 풀계획 {
  const 위험 = 이름들.find(위험한이름인가);
  if (위험 !== undefined) return { 막힘: `zip 에 자리 밖으로 새는 항목이 있다: ${위험.slice(0, 80)}` };
  const 뿌리표 = new Map<string, number>();
  for (const 이름 of 이름들) {
    const m = /^(?:(.*)\/)?Managed\/[^/]+\.dll$/i.exec(이름);
    if (m !== null) 뿌리표.set(m[1] ?? '', (뿌리표.get(m[1] ?? '') ?? 0) + 1);
  }
  const 뿌리 = [...뿌리표.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (뿌리 === undefined) return { 건너뜀: 'Managed 폴더가 없다(IL2CPP 빌드)' };
  const 앞 = 뿌리 === '' ? '' : `${뿌리}/`;
  const 항목 = 이름들.filter((이름) => 이름.startsWith(앞) && !이름.endsWith('/') && !/\.(resS|resource)$/i.test(이름) && !이름.slice(앞.length).startsWith('StreamingAssets/'));
  return 항목.length > 항목상한 ? { 막힘: `풀 항목이 너무 많다(${항목.length})` } : { 뿌리: 뿌리, 항목 };
}

/** 같은 빌드에서 이미 꺼냈나 — 열쇠 파일이 같으면 다시 안 받는다. 꺼낼 게 없던 빌드(IL2CPP)도 열쇠만 남겨 다시 안 받는다 */
export function 캐시맞나(자료: string, 열쇠: string): boolean {
  return 안전히읽기(자료, 게임자리.빌드열쇠, 100)?.trim() === 열쇠;
}

async function 받기(주소: string, 받는것: typeof fetch): Promise<Buffer | string> {
  const 답 = await 받는것(주소, { signal: AbortSignal.timeout(받기제한_ms) });
  if (!답.ok) return `서버 ${답.status}`;
  const 크기 = Number(답.headers.get('content-length') ?? 0);
  if (크기 > 받기상한) return `zip 이 너무 크다(${크기} 바이트)`;
  const 몸 = Buffer.from(await 답.arrayBuffer());
  return 몸.length > 받기상한 ? `zip 이 너무 크다(${몸.length} 바이트)` : 몸;
}

/** 고른 항목을 대상 폴더에 푼다. 링크는 만들지 않고 일반 파일만 쓴다 — 풀린 크기가 상한을 넘으면 거절한다(압축 폭탄) */
export async function 풀기(zip: JSZip, 뿌리: string, 항목: readonly string[], 대상: string, 상한 = 풀기상한): Promise<void> {
  const 대상절대 = resolve(대상);
  let 쌓임 = 0;
  // 파이프라인이 끝나면 변환 스트림도 닫히니 파일마다 새로 만든다. 세는 값은 파일 사이에 이어 간다
  const 세기만들기 = (): Transform =>
    new Transform({
      transform(조각: Buffer, _인코딩, 다음) {
        쌓임 += 조각.length;
        다음(쌓임 > 상한 ? new Error('풀린 크기가 상한을 넘었다') : null, 조각);
      },
    });
  const 앞 = 뿌리 === '' ? '' : `${뿌리}/`;
  for (const 이름 of 항목) {
    const 파일 = zip.file(이름);
    if (파일 === null) continue;
    const 자리 = resolve(대상절대, 이름.slice(앞.length));
    if (!자리.startsWith(대상절대 + sep)) throw new Error(`자리 밖으로 새는 항목: ${이름.slice(0, 80)}`);
    mkdirSync(dirname(자리), { recursive: true, mode: 0o755 });
    await pipeline(파일.nodeStream('nodebuffer'), 세기만들기(), createWriteStream(자리, { mode: 0o644, flags: 'wx' }));
  }
}

export interface 꺼내기입력 {
  자료: string;
  /** 자식 TMPDIR — 풀어 놓는 곳이고 파이썬이 끝나면 지운다 */
  임시: string;
  집: string;
  /** 작성 컨테이너가 닿는 admin 주소(PLATFORM_ADMIN_URL) */
  관리주소: string;
  자식: 계정 | null;
  알린다: (글: string) => void;
  /** 시험용 — 파이썬 길 · 받기 */
  파이썬?: string;
  받는것?: typeof fetch;
}

const 지울것 = (자료: string): void => {
  for (const 이름 of [게임자리.빌드데이터, 게임자리.종류표, 게임자리.빌드열쇠]) rmSync(join(자료, 이름), { force: true });
};

/**
 * 자료 폴더의 앱 링크로 빌드 zip 을 받아 `game-build-data.json` · `game-types.txt` 를 만든다. 못 해도 작성은 간다 — 까닭 한 줄을 알리고 돌아온다.
 * 같은 빌드면 다시 안 받는다(열쇠 `game-build-data.key`). 앞 빌드의 낡은 값은 새로 꺼내기 전에 지운다
 */
export async function 게임빌드데이터꺼내기(입력: 꺼내기입력): Promise<void> {
  const { 자료, 알린다 } = 입력;
  const 건너뜀 = (까닭: string): void => 알린다(`게임 빌드 데이터를 안 꺼낸다(작성은 간다): ${까닭}`);
  const 링크 = 안전히읽기(자료, basename(앱링크파일(자료)), 8_192)?.trim() ?? '';
  const 주소 = 링크 === '' ? null : 받을주소(링크, 입력.관리주소);
  const 열쇠 = 링크 === '' ? null : 빌드열쇠(링크);
  if (주소 === null || 열쇠 === null) return 건너뜀('앱 링크가 빌드 링크가 아니다');
  if (캐시맞나(자료, 열쇠)) return 알린다(`게임 빌드 데이터는 빌드 ${열쇠} 것을 그대로 쓴다`);
  지울것(자료);
  const 파이썬 = 입력.파이썬 ?? 파이썬길;
  if (!existsSync(파이썬)) return 건너뜀(`${파이썬} 이 없다(작성 이미지에 UnityPy 가 없다)`);
  let 풀곳: string | null = null;
  try {
    const 받은것 = await 받기(주소, 입력.받는것 ?? fetch);
    if (typeof 받은것 === 'string') return 건너뜀(`zip 을 못 받았다 — ${받은것}`);
    const zip = await JSZip.loadAsync(받은것);
    const 계획 = 풀계획만들기(Object.values(zip.files).filter((f) => !f.dir).map((f) => f.name));
    if ('막힘' in 계획) return 건너뜀(계획.막힘);
    if ('건너뜀' in 계획) {
      새로쓰기(join(자료, 게임자리.빌드열쇠), 열쇠);
      return 건너뜀(계획.건너뜀);
    }
    풀곳 = mkdtempSync(join(입력.임시, 'game-build-'));
    chmodSync(풀곳, 0o755); // 자식 uid 의 파이썬이 읽는다 — 부모 임시 폴더가 그 uid 만 여는 0700 이다
    await 풀기(zip, 계획.뿌리, 계획.항목, 풀곳);
    const 환경 = 입력.자식 === null ? undefined : 자식빈환경({ HOME: 입력.집, TMPDIR: 입력.임시 });
    // -I — 풀어 놓은 폴더나 현재 폴더에 심은 모듈을 파이썬이 불러오지 않게 한다
    const 결과 = await 돌린다(파이썬, ['-I', 스크립트, 풀곳, 자료], {
      cwd: 입력.임시, 제한: 파이썬제한_ms, ...(환경 === undefined ? {} : { env: 환경 }), ...(입력.자식 === null ? {} : { uid: 입력.자식.uid, gid: 입력.자식.gid }),
    });
    if (결과.코드 !== 0) return 건너뜀(`파이썬이 실패했다 — ${(결과.시간초과 ? '시간 초과' : 결과.오류.trim().split('\n').pop()) ?? ''}`);
    새로쓰기(join(자료, 게임자리.빌드열쇠), 열쇠);
    알린다(`게임 빌드 데이터를 꺼냈다(빌드 ${열쇠}): ${결과.낸것.trim().split('\n').pop() ?? ''}`);
  } catch (e) {
    건너뜀(e instanceof Error ? e.message : String(e));
  } finally {
    if (풀곳 !== null) rmSync(풀곳, { recursive: true, force: true });
  }
}
