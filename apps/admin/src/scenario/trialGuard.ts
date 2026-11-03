// 실행 칸이 trial 인 사람의 시험 실행 조립을 거른다 — 단계를 그 애플리케이션의 저장된 시나리오 최신 버전과 견준다 (SPEC 도메인/인증 §3.5 「테스트 모드」)
// 모킹 본문은 서버 러너 브라우저에서 아무 코드나 돌려 내부망을 실시간 칸에 띄울 수 있고, API 단계 · 이어 주기는 앞 케이스의 로그인 쿠키를 들고 나간다.
// 저장된 시나리오의 단계는 실행 write 인 사람이 만든 것이라 그대로 둔다

import { isDeepStrictEqual } from 'node:util';

import type { ScenarioPart } from '@platform/kit';
import type { Pool } from 'pg';

const 이름 = { api: 'API 호출', mock: '모킹' } as const;

// 앞 단계 응답을 받아 쓰는 단계 — 같은 단계라도 앞에 무엇이 오느냐에 따라 다른 주소 · 값으로 나간다
const 앞을쓰나 = (p: ScenarioPart): boolean =>
  (p.kind === 'api' && (p.values?.length ?? 0) > 0) || (p.kind === 'case' && (p.links?.length ?? 0) > 0);

// 케이스는 입력값만 바꿀 수 있다 — 체험하는 사람이 값을 바꿔 돌려 보는 것은 테스트 모드가 원래 하는 일이다
const 뼈대 = (p: ScenarioPart): unknown => (p.kind === 'case' ? { ...p, params: null, expected: null } : p);

/** 걸리면 사유, 통과면 null. 저장된 시나리오는 치우지 않은 것의 최신 버전만 본다 — 옛 버전에서 뺀 단계는 왜 뺐는지 모른다 */
export async function 저장안된단계(pool: Pool, service: string, parts: readonly ScenarioPart[]): Promise<string | null> {
  if (!parts.some((p) => p.kind === 'api' || p.kind === 'mock' || 앞을쓰나(p))) return null;
  const r = await pool.query<{ parts: ScenarioPart[] }>(
    `SELECT DISTINCT ON (v.scenario_id) v.parts FROM scenario_version v
       JOIN scenario s ON s.id = v.scenario_id JOIN service sv ON sv.id = s.service_id
      WHERE sv.prefix = $1 AND s.is_active
      ORDER BY v.scenario_id, v.version DESC`,
    [service],
  );
  const 저장들 = r.rows.map((row) => row.parts);

  if (parts.some(앞을쓰나)) {
    const 같은뼈대 = 저장들.some((s) => s.length === parts.length && s.every((p, i) => isDeepStrictEqual(뼈대(p), 뼈대(parts[i]!))));
    return 같은뼈대 ? null : '앞 단계 값을 받아 쓰는 단계(API 호출 값 넣기 · 케이스 이어 주기)가 있으면 저장된 시나리오를 순서 그대로 시험 실행할 수 있습니다';
  }
  const 걸린 = parts.flatMap((p, i) =>
    (p.kind === 'api' || p.kind === 'mock') && !저장들.some((s) => s.some((x) => isDeepStrictEqual(x, p))) ? [`${i + 1}번 단계(${이름[p.kind]})`] : [],
  );
  return 걸린.length === 0 ? null : `${걸린.join(' · ')}는 저장된 시나리오에 있는 것만 시험 실행할 수 있습니다`;
}
