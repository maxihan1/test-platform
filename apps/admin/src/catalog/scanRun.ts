// 스캔 실행과 마지막 결과 — 서비스마다 훑고 결과를 서비스별로 들고 있다가 부른 사람이 볼 수 있는 것만 합친다 (SPEC §7 Catalog · §3.1)
// routes.ts 가 300줄을 넘어 뗐다. 병합 뒤 스캔(작성 쪽)도 이 파일을 부른다

import type { FastifyBaseLogger } from 'fastify';

import { join } from 'node:path';

import { 칸되는서비스 } from '../auth/permissions.js';
import type { 사용자 } from '../auth/store.js';
import { 지도채우기 } from './reqMap.js';
import { scan, testsRoot, type Duplicate } from './scanner.js';
import { 화면지도채우기 } from './screenMap.js';
import { activeServices, save } from './store.js';

export interface LastScan {
  scannedAt: string;
  added: number;
  updated: number;
  deactivated: number;
  duplicates: Duplicate[];
  error?: string;
}

// 스캔은 서비스마다 돈다. 결과를 서비스별로 들고 있어야 응답을 부른 사람이 볼 수 있는 서비스 것만 합칠 수 있다 (SPEC §7)
interface 서비스결과 {
  added: number;
  updated: number;
  deactivated: number;
  duplicates: Duplicate[];
  problems: string[];
}

interface 스캔기록 {
  scannedAt: string;
  서비스별: Map<string, 서비스결과>;
  // 서비스를 훑기도 전에 깨진 사유. 어느 서비스 것도 아니라 누구에게나 보인다
  깨짐?: string;
}

let last: 스캔기록 | null = null;
// 기동 시 스캔이 아직 안 끝났는데 화면이 결과를 물어볼 수 있다. 그때는 이 약속을 기다린다
let startup: Promise<스캔기록> | null = null;

// 하나만 — 그 서비스만 훑고 나머지 서비스 결과는 지난 스캔 것을 그대로 둔다(병합 뒤 스캔)
async function runScan(log: FastifyBaseLogger, 하나만?: number): Promise<스캔기록> {
  const scannedAt = new Date().toISOString();
  const 서비스별 = new Map<string, 서비스결과>(하나만 === undefined ? [] : (last?.서비스별 ?? []));

  try {
    // 서비스마다 자기 폴더만 훑는다. 다른 서비스의 폴더는 보지 않는다 (SPEC §9.2).
    // 서비스가 하나도 없으면 훑을 폴더가 없다 — 첫 서비스는 설정에서 만든다 (§8.8)
    const services = (await activeServices()).filter((s) => 하나만 === undefined || s.id === 하나만);
    const root = testsRoot();

    for (const service of services) {
      const 결과: 서비스결과 = { added: 0, updated: 0, deactivated: 0, duplicates: [], problems: [] };
      서비스별.set(service.prefix, 결과);
      const 어디 = (file: string): string => join(service.testsDir, file);

      // 지도 ① 은 케이스 파일이 아니라 요구사항 표에서 온다 — 케이스 폴더가 깨지거나 번호가 겹쳐도 따로 갱신한다.
      // 표를 못 읽으면 옛 지도를 남기고 문제로만 알린다 (카탈로그 §3.1 「지도」)
      try {
        await 지도채우기(service.id, service.prefix);
      } catch (err) {
        결과.problems.push(
          `${service.prefix} 서비스의 요구사항 표로 지도를 채우지 못했다: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // 폴더가 아직 안 채워졌거나 이름이 틀리면 여기서 던진다. 그 서비스만 접고 나머지는 계속 훑는다 —
      // 한 서비스 때문에 다른 서비스의 케이스까지 사라지면 목록이 통째로 거짓말을 한다 (SPEC §3.1)
      let found;
      try {
        found = await scan(join(root, service.testsDir));
      } catch (err) {
        결과.problems.push(
          `${service.prefix} 서비스의 테스트 폴더 ${service.testsDir}을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }

      결과.duplicates.push(...found.duplicates.map((d) => ({ tcId: d.tcId, files: d.files })));
      결과.problems.push(
        ...found.duplicates.map((d) => `tcId ${d.tcId}이 ${d.files[0]}와 ${d.files[1]}에 겹쳐 있다`),
        ...found.failures.map((f) => `${어디(f.file)}을 읽지 못했다: ${f.message}`),
      );

      // 폴더에 남의 접두사가 섞여 있으면 걸러 낸다. 그 케이스의 주인은 다른 서비스다 (SPEC §9.2)
      const 제것인가 = (tcId: string): boolean => tcId.startsWith(`${service.prefix}-`);
      const 내것 = found.specs.filter((s) => 제것인가(s.tcId));
      for (const 남 of found.specs.filter((s) => !제것인가(s.tcId))) {
        결과.problems.push(`${남.filePath}의 ${남.tcId}은 ${service.prefix} 서비스의 접두사가 아니라 걸러 냈다`);
      }

      // 중복은 그 서비스의 스캔 실패다. 어느 쪽이 진짜인지 모르는 채로 캐시를 덮어쓰면
      // 목록이 거짓말을 한다 (SPEC §3.1). 다른 서비스까지 버리지는 않는다
      if (found.duplicates.length > 0) continue;

      // 읽지 못한 파일이 있으면 무엇이 정말 사라졌는지 가릴 수 없다. 비활성 처리는 건너뛰고 읽은 것만 갱신한다
      const saved = await save(내것, found.failures.length === 0, service.prefix);
      결과.added = saved.added;
      결과.updated = saved.updated;
      결과.deactivated = saved.deactivated;

      // 지도 ② 는 케이스 파일에서 오므로 저장한 뒤에 채운다 — 표가 케이스를 외래 키로 건다
      try {
        await 화면지도채우기(service.id, service.prefix, root, 내것, found.failures.length === 0);
      } catch (err) {
        결과.problems.push(
          `${service.prefix} 서비스의 화면 파일로 지도를 채우지 못했다: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const problems = [...서비스별.values()].flatMap((r) => r.problems);
    if ([...서비스별.values()].some((r) => r.duplicates.length > 0)) log.error(`[catalog] 스캔 실패 — ${problems.join(' / ')}`);
    else if (problems.length > 0) log.warn(`[catalog] 스캔 일부 실패 — ${problems.join(' / ')}`);
    last = { scannedAt, 서비스별 };
    return last;
  } catch (err) {
    // 기동 시 스캔이 깨져도 admin은 떠야 한다. 사유만 마지막 결과에 남긴다 (SPEC §3.1)
    const message = err instanceof Error ? err.message : String(err);
    last = { scannedAt, 서비스별, 깨짐: message };
    log.error(`[catalog] 스캔이 깨졌다: ${message}`);
    return last;
  }
}

/**
 * 작성 결과 병합(MERGE DONE)이 끝난 서비스 하나를 다시 훑는다 — 「다시 스캔」을 안 눌러도 지도 ① · 목록이 병합한 테스트를 본다
 * (작성 §3.6 · PRD-F9-03). 던지지 않는다 — 실패는 스캔 결과의 문제 줄로 남는다
 */
export function 병합뒤훑기(serviceId: number, log: FastifyBaseLogger): Promise<unknown> {
  return runScan(log, serviceId);
}

/**
 * 부른 사람이 케이스 `read` 인 서비스 것만 합친다 (SPEC 도메인/인증 §7). admin 은 살아 있는 서비스 전부다 —
 * 배정 없이 스캔하는 admin 이 결과를 못 보면 설치 직후 첫 스캔이 빈칸이 된다.
 * 사람이 없으면(문 없이 띄운 자리) 아무 서비스도 안 보인다. 모르면 막는다
 */
function 보이는결과(기록: 스캔기록, user: 사용자 | null): LastScan {
  const 보이는곳 =
    user?.role === 'admin' ? null : new Set(칸되는서비스(user?.services ?? [], 'cases', 'read'));
  const 고른것 = [...기록.서비스별].filter(([prefix]) => 보이는곳 === null || 보이는곳.has(prefix)).map(([, r]) => r);
  const duplicates = 고른것.flatMap((r) => r.duplicates);
  const problems = [...(기록.깨짐 === undefined ? [] : [기록.깨짐]), ...고른것.flatMap((r) => r.problems)];
  const error = problems.length > 0 ? problems.join('\n') : undefined;
  const scannedAt = 기록.scannedAt;

  // 겹친 번호가 하나라도 보이면 옛 모양 그대로 건수 0 과 오류로 알린다 (SPEC §3.1)
  if (duplicates.length > 0) return { scannedAt, added: 0, updated: 0, deactivated: 0, duplicates, error };
  const 합 = (칸: 'added' | 'updated' | 'deactivated'): number => 고른것.reduce((n, r) => n + r[칸], 0);
  return { scannedAt, added: 합('added'), updated: 합('updated'), deactivated: 합('deactivated'), duplicates: [], error };
}

/** 기동 스캔 — 배포는 컨테이너 재기동이다. 뜨는 김에 한 번 훑어 두면 배포 직후 목록이 최신이 된다 (SPEC §3.1) */
export function 기동훑기(log: FastifyBaseLogger): void {
  startup = runScan(log);
}

/** 「다시 스캔」 — 전부 훑고 부른 사람이 볼 수 있는 것만 낸다 */
export async function 훑고보기(log: FastifyBaseLogger, user: 사용자 | null): Promise<LastScan> {
  return 보이는결과(await runScan(log), user);
}

/** 마지막 스캔 결과. 기동 스캔이 아직이면 그것을 기다린다 */
export async function 마지막보기(user: 사용자 | null): Promise<LastScan | null> {
  const 기록 = last ?? (startup === null ? null : await startup);
  return 기록 === null ? null : 보이는결과(기록, user);
}
