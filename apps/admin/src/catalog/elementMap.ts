// 케이스 선언의 게임 요소 열쇠(`elements`)로 게임 지도의 요소를 거친 케이스(game_element_case)를 다시 채운다 (도메인/게임 §3.10 「게임에만 있는 지도 넷」 · 공통/4 game_element_case)

import type { CaseSpec } from '@platform/kit';
import { PC항목인가 } from '@platform/kit/types';
import type { Pool } from 'pg';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/**
 * 게임이 아닌 애플리케이션 케이스가 적은 요소 · 윈도우 값 — 지도에 넣지 않고 스캔 문제로 알린다(kit 은 종류를 몰라 막지 못한다).
 * 윈도우 값은 PC 게임만 돈다 (공통/3-공유계약 「윈도우 PC 게임」)
 */
export function 게임밖요소(specs: readonly CaseSpec[]): string[] {
  return [
    ...specs.filter((s) => (s.elements ?? []).length > 0).map((s) => `${s.filePath}의 ${s.tcId}은 게임 애플리케이션 케이스가 아닌데 elements 를 적어 게임 지도에 넣지 않았다`),
    ...specs
      .filter((s) => s.platforms.some(PC항목인가))
      .map((s) => `${s.filePath}의 ${s.tcId}은 게임 애플리케이션 케이스가 아닌데 ${s.platforms.filter(PC항목인가).join(' · ')} 를 적었다 — 윈도우 PC 에서는 게임만 돈다`),
  ];
}

/**
 * 게임 애플리케이션의 플랫폼과 맞지 않는 선언 — 모바일 게임이 윈도우 값을, PC 게임이 android 를 적은 것과
 * PC 게임이 지원 패드에 없는 패드 값(windows-ps5 → ps5)을 적은 것. 실행은 그 항목을 빼고 도니 사람이 알아야 고친다 (도메인/게임 §3.10 「윈도우 PC」)
 */
export function 게임플랫폼어긋남(specs: readonly CaseSpec[], 플랫폼: 'android' | 'windows', 지원패드: readonly string[]): string[] {
  const 문제: string[] = [];
  for (const s of specs) {
    const 앞 = `${s.filePath}의 ${s.tcId}은`;
    const 윈도우값 = s.platforms.filter(PC항목인가);
    if (플랫폼 === 'android' && 윈도우값.length > 0) {
      문제.push(`${앞} 모바일 게임 케이스인데 ${윈도우값.join(' · ')} 를 적었다 — 모바일 게임은 android 만 돈다`);
    } else if (플랫폼 === 'windows' && s.platforms.includes('android')) {
      문제.push(`${앞} PC 게임 케이스인데 android 를 적었다 — PC 게임은 윈도우 값만 돈다`);
    } else if (플랫폼 === 'windows') {
      const 밖 = 윈도우값.filter((p) => p !== 'windows' && !지원패드.includes(p.slice('windows-'.length)));
      if (밖.length > 0) {
        const 지원 = 지원패드.length === 0 ? '지원 패드를 하나도 체크하지 않았다' : `지원 패드는 ${지원패드.join(' · ')} 이다`;
        문제.push(`${앞} 지원 패드에 없는 ${밖.join(' · ')} 를 적었다 — ${지원}`);
      }
    }
  }
  return 문제;
}

/**
 * 그 애플리케이션 몫을 지우고 다시 채운다(사본이라 손으로 안 고친다). 열쇠가 지도에 있는지는 안 본다 — 외래 키를 안 거는 까닭과 같다(공통/4).
 * 케이스 파일을 다 읽지 못했으면 읽은 케이스 몫만 바꾼다 — 지도 ② 와 같은 까닭이다(무엇이 정말 사라졌는지 모른다)
 */
export async function 요소지도채우기(serviceId: number, specs: readonly CaseSpec[], 전부읽음: boolean): Promise<number> {
  const 줄들 = specs.flatMap((s) => (s.elements ?? []).map((key) => ({ key, tcId: s.tcId })));
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    // 기동 스캔과 「다시 스캔」이 겹치면 뒤엣것의 넣기가 앞엣것이 넣은 줄과 부딪힌다. 애플리케이션마다 차례로 세운다 (지도 ① · ② 와 같다)
    await client.query("SELECT pg_advisory_xact_lock(hashtext('game_element_case'), $1::int)", [serviceId]);
    await client.query('DELETE FROM game_element_case WHERE service_id = $1 AND ($2::boolean OR tc_id = ANY($3::text[]))', [
      serviceId,
      전부읽음,
      specs.map((s) => s.tcId),
    ]);
    await client.query(
      `INSERT INTO game_element_case (service_id, key, tc_id)
       SELECT $1, * FROM unnest($2::text[], $3::text[])`,
      [serviceId, 줄들.map((x) => x.key), 줄들.map((x) => x.tcId)],
    );
    await client.query('COMMIT');
    return 줄들.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
