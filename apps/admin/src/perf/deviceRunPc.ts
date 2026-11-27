// 기기 성능 실행의 PC 게임 몫 — PC 줄 잠금 · 실행 빌드 설치 · 직접 플레이면 게임 켜기 (도메인/성능 §3.9 「기기 성능: PC 게임과 측정 정의」). deviceRun.ts 가 300줄을 넘어 떼어 냈다

import { 팜주소 } from '../execution/farm.js';
import { 깐다, 켠다 } from '../execution/pcFarm.js';
import { 최신PC빌드파일 } from '../execution/pcTrial.js';
import { PC를바로잡는다 } from '../execution/phone.js';
import type { 기록기 } from './deviceRecorder.js';
import * as 표 from './store.js';
import type { DeviceRunConfig } from './types.js';

/** 게임이면 앱 실행 시간을 SDK 응답까지로 재고, PC 게임이면 PC 길을 탄다 */
export async function 종류읽기(serviceId: number): Promise<{ 게임: boolean; PC: boolean }> {
  const 줄 = (await (await 표.풀()).query<{ kind: string; game_platform: string | null }>('SELECT kind, game_platform FROM service WHERE id = $1', [serviceId])).rows[0];
  const 게임 = 줄?.kind === 'GAME';
  return { 게임, PC: 게임 && 줄?.game_platform === 'windows' };
}

/**
 * 정식 실행 · 테스트 실행과 같은 PC 줄에 선다. 측정을 만들 때 비어 있었어도 그 사이에 다른 실행이 들어왔을 수 있어 기다리지 않고 오류다.
 * 잡았으면 곧바로 잡았다고 알린다 — 빌드를 못 찾아 던져도 닫을 때 놓게
 */
export async function PC잡기(run: { serviceId: number; env: string }, 잡았다: () => void): Promise<{ zip: string; 게임: string | null }> {
  if (!PC를바로잡는다()) throw new Error('다른 실행이 Windows PC 를 쓰는 중입니다');
  잡았다();
  const zip = await 최신PC빌드파일(run.serviceId, run.env);
  if (zip === null) throw new Error('Windows 빌드가 없습니다');
  return { zip, 게임: null };
}

/** 잡은 PC 에 실행 빌드를 깔고, 직접 플레이면 게임을 켜 둔다. 케이스로 잴 때는 케이스가 켠다 (§3.9 「PC 게임」 · 2026-11-27 PERF-F2 시작 질문) */
export async function PC준비(runId: number, drive: DeviceRunConfig['drive'], pc: { zip: string; 게임: string | null }, d: { serial: string; model: string; rec: 기록기 }): Promise<void> {
  const 팜 = 팜주소();
  if (팜 === undefined) throw new Error('Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않습니다');
  // 잡은 주인과 같은 토큰이어야 VISION 이 깔기 · 켜기를 받는다
  const 토큰 = await d.rec.팜토큰();
  const 깔음 = await 깐다(팜, d.serial, pc.zip, 토큰);
  if ('까닭' in 깔음) throw new Error(깔음.까닭);
  pc.게임 = 깔음.게임;
  await 표.로그(runId, `Windows 빌드를 설치했습니다 — ${d.model}`);
  if (drive === 'MANUAL') await 켠다(팜, d.serial, 깔음.게임, 토큰);
}
