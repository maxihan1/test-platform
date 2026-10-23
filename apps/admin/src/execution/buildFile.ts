// CI 가 올린 빌드 파일 — 둘 자리 · APK 인지 보기 · 디바이스 팜이 받을 서명 주소 · 그 줄의 최신 빌드 · 오래된 빌드 치우기 (도메인/실행 §3.11 「빌드마다 돌리기」)

import { createHmac, timingSafeEqual } from 'node:crypto';
import { open, rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { Pool } from 'pg';

import { artifactsDir } from '../artifactFile.js';

// 리니지 라이크 APK 는 1GB 를 넘는다 — 넉넉히 두 배. 숫자를 바꾸려면 도메인/실행 §3.11 을 먼저 고친다
export const 빌드상한 = 2 * 1024 * 1024 * 1024;
// 대상 서버 줄마다 남기는 빌드 수. 시작 안 했거나 도는 실행이 쥔 빌드는 이 수를 넘어도 남긴다
export const 보관개수 = 5;
const 한시간_초 = 60 * 60;

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

// ponytail: 러너와 같이 쓰는 artifacts 볼륨이라 root 로 도는 케이스가 APK 내용을 바꿔칠 수는 있다(바로가기는 내려받기가 볼륨파일로 막는다). 더미 zip 처럼(리뷰 M16) admin 만 붙이는 볼륨으로 옮기면 풀린다
export const 빌드파일자리 = (id: number): string => join(artifactsDir(), 'builds', `${id}.apk`);
export const 빌드폴더 = (): string => join(artifactsDir(), 'builds');

/**
 * zip 맨 위에 AndroidManifest.xml 이 있나 — APK 는 있고 AAB 는 base/manifest/ 아래라 없다.
 * 1GB 넘는 파일을 통째로 안 읽으려고 끝의 목차(central directory)만 읽는다. 2GB 상한이라 zip64 는 안 본다
 */
export async function APK인가(경로: string): Promise<boolean> {
  const 파일 = await open(경로, 'r');
  try {
    const 크기 = (await 파일.stat()).size;
    const 꼬리길이 = Math.min(크기, 22 + 0xffff);
    const 꼬리 = Buffer.alloc(꼬리길이);
    await 파일.read(꼬리, 0, 꼬리길이, 크기 - 꼬리길이);
    let 끝 = -1;
    for (let i = 꼬리길이 - 22; i >= 0; i -= 1) {
      if (꼬리.readUInt32LE(i) === 0x06054b50) {
        끝 = i;
        break;
      }
    }
    if (끝 < 0) return false;
    const 목차크기 = 꼬리.readUInt32LE(끝 + 12);
    const 목차자리 = 꼬리.readUInt32LE(끝 + 16);
    if (목차자리 + 목차크기 > 크기) return false;
    const 목차 = Buffer.alloc(목차크기);
    await 파일.read(목차, 0, 목차크기, 목차자리);
    for (let i = 0; i + 46 <= 목차.length; ) {
      if (목차.readUInt32LE(i) !== 0x02014b50) return false;
      const 이름길이 = 목차.readUInt16LE(i + 28);
      const 이름 = 목차.toString('utf8', i + 46, i + 46 + 이름길이);
      if (이름 === 'AndroidManifest.xml') return true;
      i += 46 + 이름길이 + 목차.readUInt16LE(i + 30) + 목차.readUInt16LE(i + 32);
    }
    return false;
  } finally {
    await 파일.close();
  }
}

// 세션 열쇠를 그대로 쓰지 않고 쓰임을 붙여 갈라낸다 — 서명 주소가 새어도 세션 쿠키 서명과 섞이지 않는다
function 서명열쇠(): Buffer | null {
  const 열쇠 = process.env.SESSION_SECRET ?? '';
  return 열쇠 === '' ? null : createHmac('sha256', 열쇠).update('app-build-download').digest();
}

const 서명 = (열쇠: Buffer, buildId: number, exp: number): string =>
  createHmac('sha256', 열쇠).update(`${String(buildId)}.${String(exp)}`).digest('base64url');

/**
 * 디바이스 팜이 APK 를 받는 기한 있는 주소. 폰을 잡고 깔기 직전에 만들고 저장하지 않는다.
 * 기한은 다음 정시 뒤 한 시간이라 남은 시간이 1~2시간이다 — 같은 시간대의 게임 항목이 같은 주소를 받아 Appium 이 받아 둔 APK 를 다시 쓴다.
 * 바깥 주소나 열쇠가 없으면 null 이다(부르는 쪽이 까닭을 붙여 해당 없음으로 닫는다)
 */
export function 서명주소(buildId: number, 지금 = Date.now()): string | null {
  const 바탕 = (process.env.PLATFORM_PUBLIC_URL ?? '').replace(/\/+$/, '');
  const 열쇠 = 서명열쇠();
  if (바탕 === '' || 열쇠 === null) return null;
  const exp = (Math.floor(지금 / 1000 / 한시간_초) + 2) * 한시간_초;
  return `${바탕}/api/builds/${String(buildId)}/apk?exp=${String(exp)}&sig=${서명(열쇠, buildId, exp)}`;
}

export function 서명맞나(buildId: number, exp: string | undefined, sig: string | undefined, 지금 = Date.now()): boolean {
  const 열쇠 = 서명열쇠();
  if (열쇠 === null || exp === undefined || sig === undefined || !/^\d{1,12}$/.test(exp)) return false;
  if (Number(exp) * 1000 <= 지금) return false;
  const 기대 = Buffer.from(서명(열쇠, buildId, Number(exp)));
  const 받은 = Buffer.from(sig);
  return 기대.length === 받은.length && timingSafeEqual(기대, 받은);
}

export interface 빌드행 {
  id: number;
  buildNo: string;
  hasFile: boolean;
  appUrl: string | null;
}

/** 그 대상 서버 줄의 가장 최근 빌드. 없으면 null — 앱 파일은 그 줄의 app_path 로 돈다 */
export async function 최신빌드(client: Pick<Pool, 'query'>, serviceId: number, env: string): Promise<빌드행 | null> {
  const r = await client.query<{ id: string; build_no: string; file_path: string | null; app_url: string | null }>(
    `SELECT id, build_no, file_path, app_url FROM app_build
      WHERE service_id = $1 AND env = $2 ORDER BY uploaded_at DESC, id DESC LIMIT 1`,
    [serviceId, env],
  );
  const 행 = r.rows[0];
  return 행 === undefined ? null : { id: Number(행.id), buildNo: 행.build_no, hasFile: 행.file_path !== null, appUrl: 행.app_url };
}

/**
 * 실행에 고정할 빌드 — 빌드 실행은 올린 그 빌드, 그 밖(사람 · 정기 · 다시)은 그 줄의 최신 빌드.
 * 정한 빌드가 그 줄 것이 아니면 던진다 — 부르는 쪽(빌드 올리기 · 스모크 뒤)이 같은 줄로만 부르므로 오면 코드가 틀린 것이다
 */
export async function 실행빌드(client: Pick<Pool, 'query'>, serviceId: number, env: string, 정한?: number): Promise<빌드행 | null> {
  if (정한 === undefined) return 최신빌드(client, serviceId, env);
  const r = await client.query<{ id: string; build_no: string; file_path: string | null; app_url: string | null }>(
    'SELECT id, build_no, file_path, app_url FROM app_build WHERE id = $1 AND service_id = $2 AND env = $3',
    [정한, serviceId, env],
  );
  const 행 = r.rows[0];
  if (행 === undefined) throw new Error(`빌드 ${String(정한)}은 이 애플리케이션 ${env} 줄의 빌드가 아니다`);
  return { id: Number(행.id), buildNo: 행.build_no, hasFile: 행.file_path !== null, appUrl: 행.app_url };
}

/** android 항목이 깔 앱 — 올린 APK 는 번호만 싣고 서명 주소는 폰을 잡은 뒤 만든다(runner.ts). 빌드가 없으면 그 줄의 app_path */
export function 앱칸(빌드: 빌드행 | null, appPath: string | null): { app?: string; buildId?: number } {
  if (빌드?.appUrl != null) return { app: 빌드.appUrl };
  if (빌드?.hasFile === true) return { buildId: 빌드.id };
  return appPath === null ? {} : { app: appPath };
}

/**
 * 케이스 테스트 실행 · 작성처럼 실행 기록을 안 남기는 쪽이 깔 앱 파일 — 그 줄 최신 빌드의 서명 주소 · 회사 저장소 주소, 없으면 app_path.
 * 서명 주소를 못 만들면(바깥 주소가 비었다) 던진다 — 옛 app_path 로 물러서면 정식 실행(미실행으로 닫힘)과 다른 빌드로 케이스를 쓰고 아무도 모른다
 */
export async function 깔앱파일(serviceId: number, env: string, appPath: string | null): Promise<string | null> {
  const 빌드 = await 최신빌드(await db(), serviceId, env);
  if (빌드?.appUrl != null) return 빌드.appUrl;
  if (빌드?.hasFile !== true) return appPath;
  const 주소 = 서명주소(빌드.id);
  if (주소 === null) throw new Error(`${env} 줄의 최신 빌드 ${빌드.buildNo} 를 받을 주소를 못 만들었다 — PLATFORM_PUBLIC_URL 을 채운다`);
  return 주소;
}

/** 줄마다 최근 보관개수만 남기고 파일과 행을 지운다. 도는 실행이 쥔 빌드는 남긴다 — 그 실행이 끝까지 그 빌드를 깐다 */
export async function 오래된빌드치우기(serviceId: number, env: string): Promise<void> {
  const pool = await db();
  const r = await pool.query<{ id: string; file_path: string | null }>(
    `DELETE FROM app_build b
      WHERE b.service_id = $1 AND b.env = $2
        AND b.id NOT IN (SELECT id FROM app_build WHERE service_id = $1 AND env = $2 ORDER BY uploaded_at DESC, id DESC LIMIT $3)
        AND NOT EXISTS (SELECT 1 FROM test_run t WHERE t.build_id = b.id AND t.status = 'RUNNING')
      RETURNING b.id, b.file_path`,
    [serviceId, env, 보관개수],
  );
  // 행이 먼저 지워졌다. 파일을 못 지우면 디스크에 남을 뿐 판정은 흔들리지 않는다 — 로그로만 알린다
  for (const 행 of r.rows) {
    if (행.file_path === null) continue;
    await rm(행.file_path, { force: true }).catch((err: unknown) => {
      console.error(`[builds] 빌드 ${행.id} 파일을 못 지웠다: ${err instanceof Error ? err.message : String(err)}`);
    });
  }
}
