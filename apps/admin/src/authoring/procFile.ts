// 케이스 파일 경로가 프로시저 파일인지 이름으로 가른다 — 서버 · 화면 · 에이전트가 같이 쓴다 (도메인/작성 §3.6 「★ 테스트 프로시저 작성」 「반영 때 겹침」)
// 화면 번들에 들어가서 의존이 없어야 한다. 이름 꼴은 K2(`catalog/rules.ts` `checkProcedure` — 파일 이름 = `<procId>.spec.ts`)가 지킨다

const 프로시저파일꼴 = /(?:^|\/)([A-Z][A-Z0-9]{0,11}-TP-\d{3})\.spec\.ts$/;

/** 프로시저 파일이면 그 이름의 procId, 아니면 null */
export function 파일프로시저번호(file: string): string | null {
  return 프로시저파일꼴.exec(file)?.[1] ?? null;
}

export const 프로시저파일인가 = (file: string): boolean => 파일프로시저번호(file) !== null;
