// 실행 결과 화면의 실패 케이스 카드 재료를 만드는 순수 함수 (DB · 네트워크 없음 — 질의는 호출하는 쪽이 한다)

import type { ItemStatus, Platform } from '@platform/kit';
import type { 변화 } from './insights.js';

export const 카드쪽크기 = 20;

export type 카드변화 = Extract<변화, '새로깨짐' | '계속깨짐'> | null;

export interface 실패행 {
  historyId: number;
  tcId: string;
  tcName: string;
  platform: Platform;
  attempt: number;
  status: ItemStatus;
}

export interface 실패디바이스 {
  platform: Platform;
  change: 카드변화;
  attempts: number;
  failedAttempts: number;
  firstFailedHistoryId: number;
}

export interface 실패케이스 {
  tcId: string;
  tcName: string;
  devices: 실패디바이스[];
}

// 같은 디바이스 순서가 화면 어디서나 같아야 해서 여기 한 곳에 둔다
const 디바이스순서: Platform[] = ['desktop', 'mobile', 'android'];
const 변화무게 = (c: 카드변화) => (c === '새로깨짐' ? 0 : c === '계속깨짐' ? 1 : 2);

// 견줄 앞이 없거나 새로 깨진 실패에 「N회 연속」을 붙이면 사실과 어긋나서 계속깨짐만 숫자로 준다
export function 연속실패수(change: 카드변화, recent: ItemStatus[]): number | null {
  if (change !== '계속깨짐') return null;
  const 처음비실패 = recent.findIndex((s) => s !== 'FAIL');
  return 처음비실패 === -1 ? recent.length : 처음비실패;
}

export function 케이스로묶는다(
  행들: 실패행[],
  변화표: Map<string, 카드변화>,
  platform?: Platform,
): 실패케이스[] {
  const 쌍들 = new Map<string, { tcId: string; tcName: string; platform: Platform; 행들: 실패행[] }>();
  for (const 행 of 행들) {
    if (platform && 행.platform !== platform) continue;
    const 키 = `${행.tcId}|${행.platform}`;
    const 쌍 = 쌍들.get(키) ?? { tcId: 행.tcId, tcName: 행.tcName, platform: 행.platform, 행들: [] };
    쌍.행들.push(행);
    쌍들.set(키, 쌍);
  }

  const 케이스들 = new Map<string, 실패케이스>();
  for (const 쌍 of 쌍들.values()) {
    const 실패 = 쌍.행들.filter((r) => r.status === 'FAIL').sort((a, b) => a.attempt - b.attempt);
    const 처음실패 = 실패[0];
    if (!처음실패) continue;
    const 케이스 = 케이스들.get(쌍.tcId) ?? { tcId: 쌍.tcId, tcName: 쌍.tcName, devices: [] };
    케이스.devices.push({
      platform: 쌍.platform,
      change: 변화표.get(`${쌍.tcId}|${쌍.platform}`) ?? null,
      attempts: 쌍.행들.length,
      failedAttempts: 실패.length,
      firstFailedHistoryId: 처음실패.historyId,
    });
    케이스들.set(쌍.tcId, 케이스);
  }

  const 무게 = (c: 실패케이스) => Math.min(...c.devices.map((d) => 변화무게(d.change)));
  for (const c of 케이스들.values()) {
    c.devices.sort((a, b) => 디바이스순서.indexOf(a.platform) - 디바이스순서.indexOf(b.platform));
  }
  return [...케이스들.values()].sort((a, b) => 무게(a) - 무게(b) || a.tcId.localeCompare(b.tcId));
}

export function 쪽을자른다<T>(케이스들: T[], page: number) {
  const 시작 = (page - 1) * 카드쪽크기;
  return {
    items: 케이스들.slice(시작, 시작 + 카드쪽크기),
    total: 케이스들.length,
    page,
    pageSize: 카드쪽크기,
  };
}
