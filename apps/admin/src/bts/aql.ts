// BTS AQL 글 값 따옴표 — 상태 이름 · 찾을 낱말을 AQL 에 끼울 때 한 곳에서 감싼다(bts/deployFlow.ts · mcp/tools.ts)

/** 큰따옴표로 감싸고 안의 역빗금 · 큰따옴표를 이스케이프한다 — 상태 이름에 따옴표가 들어도 다른 조건이 되지 않게 */
export const aql글 = (글: string): string => `"${글.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
