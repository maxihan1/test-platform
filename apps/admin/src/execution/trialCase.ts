// 케이스 「테스트 실행」이 시작할 때 읽는 케이스 행과 대상 서버 줄 — trialRoutes.ts 가 300줄을 넘어 떼어 냈다

import { 대상줄들읽기, type 대상줄 } from '../authoring/reverse.js';
import { prefixOf } from './store.js';

/** step_titles 는 스캔이 저장한 단계 제목 — 못 셌으면 null (카탈로그 §3.1 「단계 제목」). proc_id 는 그 케이스가 든 프로시저 — 옛 꼴 케이스는 null */
export async function 케이스행(tcId: string): Promise<{ platforms: string[]; file_path: string; step_titles: string[] | null; proc_id: string | null } | null> {
  const { pool } = await import('../db/index.js');
  const r = await pool.query<{ platforms: string[]; file_path: string; step_titles: string[] | null; proc_id: string | null }>(
    'SELECT platforms, file_path, step_titles, proc_id FROM test_case WHERE tc_id = $1',
    [tcId],
  );
  return r.rows[0] ?? null;
}

/** 그 케이스 애플리케이션의 그 이름 대상 서버 줄. 애플리케이션이나 줄이 없으면 null */
export async function 대상줄찾기(
  tcId: string,
  env: string,
): Promise<{ 줄: 대상줄; 종류: string; 게임플랫폼: 'android' | 'windows' | null; serviceId: number } | null> {
  const { pool } = await import('../db/index.js');
  const r = await pool.query<{ id: string; kind: string; game_platform: 'android' | 'windows' | null }>('SELECT id, kind, game_platform FROM service WHERE prefix = $1', [prefixOf(tcId)]);
  const 서비스 = r.rows[0];
  if (서비스 === undefined) return null;
  const 줄 = (await 대상줄들읽기(Number(서비스.id))).find((c) => c.env === env);
  return 줄 === undefined ? null : { 줄, 종류: 서비스.kind, 게임플랫폼: 서비스.game_platform, serviceId: Number(서비스.id) };
}
