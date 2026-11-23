// 케이스 테스트 실행의 윈도우 PC 길 — 그 줄 최신 빌드(PC 게임은 늘 zip)를 깔고 1건을 돌린 뒤 놓는다. 기다리지 않는다 (도메인/게임 §3.10 「케이스 테스트 실행도 같은 길이다」)

import type { ExecuteRequest, ExecuteResponse } from '@platform/kit';

import { 최신빌드 } from './buildFile.js';
import { 팜주소 } from './farm.js';
import { 사람팜토큰 } from './farmToken.js';
import { PC로 } from './pcFarm.js';
import { PC화면을단다 } from './pcScreen.js';
import { na } from './runner.js';

async function 최신PC빌드파일(serviceId: number, env: string): Promise<string | null> {
  const { pool } = await import('../db/index.js');
  const 빌드 = await 최신빌드(pool, serviceId, env);
  if (빌드 === null) return null;
  return (await pool.query<{ file_path: string | null }>('SELECT file_path FROM app_build WHERE id = $1', [빌드.id])).rows[0]?.file_path ?? null;
}

export async function PC에서돌린다(
  요청: ExecuteRequest,
  사람: string,
  줄: { serviceId: number; env: string },
  폰화면: (url: string | undefined, 이름?: string) => void,
  보내기: (body: ExecuteRequest) => Promise<ExecuteResponse>,
  멈췄나: () => boolean,
): Promise<ExecuteResponse> {
  const 팜 = 팜주소();
  // 받은 뒤 서버를 다시 띄우며 값을 지웠을 때뿐이다 — 통로가 FARM_OFF 로 먼저 거절한다
  if (팜 === undefined) return na(요청, '이 서버에는 Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않습니다');
  const zip = await 최신PC빌드파일(줄.serviceId, 줄.env);
  // 폰처럼 대상 서버 줄의 app_path 로 물러서지 않는다 — PC 에 깔 것은 올린 zip 뿐이다
  if (zip === null) return na(요청, 'Windows 빌드가 없습니다');
  let 토큰: string | undefined;
  try {
    토큰 = await 사람팜토큰(사람);
  } catch (err) {
    return na(요청, '누른 사람의 팜 토큰을 고르지 못했습니다', err instanceof Error ? err.message : String(err));
  }
  // PC 는 kit 이 장면 사진을 안 찍는다 — 칸이 VISION 화면 영상을 받아 간다. 열쇠는 그 시험의 trialId(장면 열쇠)다 (도메인/게임 §3.10 「증적 · 결과」)
  const 영상열쇠 = `trial:${요청.live ?? ''}`;
  try {
    return await PC로(
      팜,
      zip,
      { 기다림ms: 0, 멈췄나, 토큰: async () => 토큰 },
      async (pc) => {
        폰화면(pc.화면, pc.serial);
        PC화면을단다(영상열쇠, { serial: pc.serial, 토큰 });
        return 보내기({ ...요청, udid: pc.serial, app: pc.게임, ...(토큰 !== undefined && { farmToken: 토큰 }) });
      },
      (까닭) => na(요청, 까닭),
    );
  } finally {
    // PC 를 놓고 돌아왔다 — 결과를 적기 전 틈에 닫힌 링크 · 화면을 내지 않는다
    폰화면(undefined);
    PC화면을단다(영상열쇠, undefined);
  }
}
