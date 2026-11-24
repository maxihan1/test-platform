// 보류 반영 3회 실행의 판정 — 프로시저 파일은 채운 케이스의 판정만 본다 (도메인/작성 §3.6 「★ 보류 케이스」 반영 · 채운 케이스가 통과해야 병합한다)
// 같은 프로시저의 다른 케이스가 빨간 것은 막지 않는다. 종료 코드는 그 케이스까지 섞어 내므로 JSON 보고의 케이스 판정 첨부를 읽는다

import { 프로시저글읽기 } from '../apps/admin/src/catalog/procedure.js';
import { type 보류입력, 실패맵, 케이스tcId들 } from './authoring-held-apply.js';
import { 케이스판읽기 } from './authoring-proc-run.js';

/** 3회 실행에 넣은 파일. tcIds 가 null 이면 옛 꼴 — 그 파일의 아무 실패나 막는다 */
export interface 실행대상 {
  파일: string;
  tcIds: readonly string[] | null;
}

interface 시험글 {
  results?: { attachments?: { name?: unknown; body?: unknown }[] }[];
}
interface 묶음글 {
  file?: string;
  specs?: { file?: string; tests?: 시험글[] }[];
  suites?: 묶음글[];
}

// 보고의 file 은 testDir 기준이고 대상은 저장소 기준이라 뒤가 같으면 같은 파일이다
const 같은파일 = (대상: string, 보고: string): boolean => 대상 === 보고 || 대상.endsWith(`/${보고}`) || 보고.endsWith(`/${대상}`);

/** 시험(회차)마다 파일 하나씩 — repeat-each 회차가 시험 항목으로 갈리든 spec 으로 갈리든 같이 본다 */
function 회차들(보고: 묶음글, 위파일?: string): { 파일: string; 시험: 시험글 }[] {
  const 파일 = 보고.file ?? 위파일;
  return [
    ...(보고.specs ?? []).flatMap((s) => {
      const 이름 = s.file ?? 파일;
      return 이름 === undefined ? [] : (s.tests ?? []).map((시험) => ({ 파일: 이름, 시험 }));
    }),
    ...(보고.suites ?? []).flatMap((안) => 회차들(안, 파일)),
  ];
}

/**
 * 실패 문장들(없으면 통과). 문장 꼴은 프로시저 `<파일> <tcId> — <문장>`, 옛 꼴 `<파일> — <문장>`.
 * JSON 을 못 읽으면 null — 부른 쪽이 종료 코드로 판정한다
 */
export function 세번판정(낸것: string, 대상들: readonly 실행대상[]): string[] | null {
  const 첫실패 = 실패맵(낸것);
  if (첫실패 === null) return null;
  const 보고 = JSON.parse(낸것.slice(낸것.indexOf('{'))) as 묶음글;
  const 모든회차 = 회차들(보고);
  const 문장들: string[] = [];
  for (const 대상 of 대상들) {
    if (대상.tcIds === null) {
      for (const [파일, 문장] of 첫실패) if (같은파일(대상.파일, 파일)) 문장들.push(`${파일} — ${문장}`);
      continue;
    }
    const 돈것 = 모든회차.filter((r) => 같은파일(대상.파일, r.파일));
    for (const tcId of 대상.tcIds) {
      const 머리 = `${대상.파일} ${tcId}`;
      if (돈것.length === 0) {
        문장들.push(`${머리} — 돈 회차가 없다`);
        continue;
      }
      const 틀림 = 돈것
        .map(({ 시험 }) => {
          const 판 = 케이스판읽기(시험.results)?.find((p) => p.tcId === tcId);
          if (판 === undefined) return '판정을 못 읽었다';
          if (판.상태 === '막힘') return `앞 케이스(${판.막은 ?? '?'})에 막혔다`;
          return 판.상태 === '빨강' ? (판.오류 ?? '검증이 실패했다') : null;
        })
        .find((문장) => 문장 !== null);
      if (틀림 !== undefined) 문장들.push(`${머리} — ${틀림}`);
    }
  }
  return 문장들;
}

/** 채운(적은) 파일마다 3회 실행 대상 — 프로시저 파일은 이번에 값을 채운 케이스만, 옛 꼴은 tcIds 가 null */
export function 실행대상들(채운글: ReadonlyMap<string, string>, held: Record<string, 보류입력>): 실행대상[] {
  const 채운번호 = Object.entries(held).flatMap(([tcId, 입력]) => (입력.removed === true ? [] : [tcId]));
  return [...채운글].flatMap(([파일, 글]) =>
    !파일.endsWith('.spec.ts') ? [] : [{ 파일, tcIds: 프로시저글읽기(글) === null ? null : 채운번호.filter((t) => 케이스tcId들(글).includes(t)) }],
  );
}
