// 설정 고치기의 정기 실행 칸 검사 — 시간대 이름표와 대상 서버 (도메인/인증 §7 「정기 실행」 계약 변경 블록)
// routes.ts 가 300줄을 넘어 그대로 옮겨 왔다

import { 시간대확인, 틀린시간대 } from '../reporting/dashboardResults.js';

import { db, 정기실행재료 } from './store.js';

/**
 * 정기 실행에서 스키마가 못 보는 두 칸 — 시간대 이름표와 대상 서버. 같이 보낸 envs 가 있으면 그것으로 본다.
 * envs 만 보내 켜 둔 정기 실행의 대상 서버를 빼도 막는다 — 안 막으면 다음 날부터 매일 실행을 못 만들고 로그에만 남는다
 */
export async function 정기실행틀린칸(
  id: number,
  본문: { schedule?: { tz: string; env: string } | null; envs?: { env: string }[] },
): Promise<string | null> {
  const 보낸것 = 본문.schedule;
  if (보낸것 === null || (보낸것 === undefined && 본문.envs === undefined)) return null;
  if (보낸것 !== undefined) {
    try {
      await 시간대확인(await db(), 보낸것.tz);
    } catch (err) {
      if (err instanceof 틀린시간대) return `schedule.tz: ${보낸것.tz}`;
      throw err;
    }
  }
  const 재료 = await 정기실행재료(id);
  const 대상서버 = 보낸것?.env ?? 재료?.대상서버 ?? null;
  if (재료 === null || 대상서버 === null) return null;
  const 키들 = 본문.envs?.map((e) => e.env) ?? 재료.키들;
  return 키들.includes(대상서버) ? null : `schedule.env: ${대상서버}`;
}
