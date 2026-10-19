// 애플리케이션을 섞은 시나리오의 순수 규칙 — 접두사 읽기 · 섞임 판정 · 결과의 단계 애플리케이션 (SPEC 도메인/시나리오 §3.7 결정 13)
// DB 와 파일을 모른다. 조립 검사(validate.ts)가 쓰므로 DB 를 끌어오는 가져오기를 두지 않는다

import type { ScenarioPart } from '@platform/kit';

/** 러너로 보내는 단계와 부품 행 스냅샷에는 시작 애플리케이션이 아닌 단계의 주소가 붙는다 */
export type 박제부품 = ScenarioPart & { baseUrl?: string };

// '-' 가 없는 번호는 번호 전체를 접두사로 본다 — 빈 접두사가 별개의 애플리케이션처럼 끼지 않게
export const 케이스접두사 = (tcId: string): string => (tcId.includes('-') ? tcId.slice(0, tcId.indexOf('-')) : tcId);

/** 시나리오가 쓰는 애플리케이션 접두사. 시작 애플리케이션이 맨 앞이고 중복은 없다 */
export function 쓰는접두사(parts: readonly ScenarioPart[], 시작: string): string[] {
  const 목록 = new Set([시작]);
  for (const p of parts) {
    if (p.kind === 'case') 목록.add(케이스접두사(p.tcId));
    else if (p.kind === 'api' && p.service !== undefined) 목록.add(p.service);
  }
  return [...목록];
}

/** 시작 애플리케이션 밖의 단계가 있나 — 있으면 모킹 무늬를 `/` 로 시작하게 못 쓴다 (결정 13) */
export function 섞였나(parts: readonly ScenarioPart[], 시작: string): boolean {
  return 쓰는접두사(parts, 시작).length > 1;
}

/** 결과 조회가 부품마다 싣는 애플리케이션과 돈 주소. case · api 가 아닌 단계는 null 이다 */
export function 단계앱(part: 박제부품, 시작: string, 시작주소: string): { service: string | null; baseUrl: string | null } {
  if (part.kind === 'case') return { service: 케이스접두사(part.tcId), baseUrl: part.baseUrl ?? 시작주소 };
  if (part.kind === 'api') return { service: part.service ?? 시작, baseUrl: part.baseUrl ?? 시작주소 };
  return { service: null, baseUrl: null };
}
