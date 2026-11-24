// 케이스 목록 문서의 「## 테스트 프로시저」 절 — 읽기 · 프로시저 번호 채우기 · 절 검사 (도메인/작성 §3.6 「★ 테스트 프로시저 작성」 「프로시저 절 · 프로시저 번호」)
// 절은 자식 혼자 쓰고 번호는 이 파일이 매긴다. 표의 축 · 케이스 번호를 매기는 일은 그대로 authoring-slots.ts 가 한다

import { 게임시나리오인가 } from '../apps/admin/src/catalog/rules.js';
import { 명세글, 속성, 읽기 } from './authoring-held-apply.js';
import { 요구줄들 } from './authoring-ledger-check.js';
import { 백틱벗기기, 칸채우기, 표읽기 } from './authoring-md-table.js';
import { 케이스조각들, 프로시저값읽기 } from './authoring-proc-pieces.js';
import { 줄상태 } from './authoring-slots.js';

export const 절제목 = '테스트 프로시저';

export interface 절줄 {
  /** 절 안 몸 줄 차례(0부터) */
  차례: number;
  /** 백틱을 벗긴 프로시저 칸 — 번호를 아직 안 매겼으면 빈 글 */
  프로시저: string;
  흐름: string;
  /** 케이스 칸에 적힌 차례대로의 케이스 번호 */
  케이스: string[];
}

// 케이스 번호 꼴(rules.ts TCID)을 글 안에서 찾는다 — 앞이 글자 · 숫자 · 붙임표면 프로시저 번호(MTA-TP-001)의 꼬리라 뺀다
const 케이스번호들 = (칸: string): string[] => 칸.match(/(?<![A-Za-z0-9-])[A-Z][A-Z0-9]{0,11}-(?:(?:UI|FN|GS)-)?\d{3}(?![0-9])/g) ?? [];

export function 절줄들(표글: string): 절줄[] {
  return 표읽기(표글, 절제목).map((행, 차례) => ({ 차례, 프로시저: 백틱벗기기(행['프로시저'] ?? ''), 흐름: (행['흐름'] ?? '').trim(), 케이스: 케이스번호들(행['케이스'] ?? '') }));
}

const 번호꼴 = (접두사: string) => new RegExp(`^${접두사}-TP-(\\d{3})$`);

/**
 * 프로시저 칸이 빈 줄에만 절 차례대로 `<접두사>-TP-<3자리>` 를 채운다. 이미 적힌 줄은 건드리지 않는다.
 * 새 번호는 `쓰인`(기준(main)의 프로시저 파일 · 기준 절)과 지금 절에 쓰인 가장 큰 번호 다음부터다 — 실행 기록에 남은 번호가 다른 흐름을 가리키지 않게 쓰인 번호를 다시 주지 않는다.
 * 세 자리를 넘는 줄은 비워 두고 어긋남으로 낸다
 */
export function 프로시저번호채우기(표글: string, 접두사: string, 쓰인: Iterable<string>): { 글: string; 매김: string[]; 어긋남: string[] } {
  const 꼴 = 번호꼴(접두사);
  const 줄들 = 절줄들(표글);
  const 큰 = Math.max(0, ...[...쓰인, ...줄들.map((줄) => 줄.프로시저)].map((n) => Number(꼴.exec(n)?.[1] ?? 0)));
  const 기대 = new Map<number, string>();
  const 어긋남: string[] = [];
  let 다음 = 큰 + 1;
  for (const 줄 of 줄들.filter((x) => x.프로시저 === '')) {
    if (다음 > 999) {
      어긋남.push(`프로시저 절 ${String(줄.차례 + 1)}번째 줄 — 프로시저 번호가 세 자리(999)를 넘는다`);
      continue;
    }
    기대.set(줄.차례, `${접두사}-TP-${String(다음).padStart(3, '0')}`);
    다음 += 1;
  }
  return { 글: 칸채우기(표글, 절제목, '프로시저', 기대), 매김: [...기대.values()], 어긋남 };
}

/** 절에 쓰인 프로시저 번호 — 기준 판의 절에서 읽어 번호 명령에 넘긴다 */
export const 절번호들 = (표글: string): string[] => 절줄들(표글).map((줄) => 줄.프로시저).filter((n) => n !== '');

export interface 바뀐케이스파일 {
  /** 저장소 기준 경로 */
  경로: string;
  글: string;
  /** 기준(main)에 있던 파일인가. 모르면 null — 그때는 「새로 쓴 케이스가 옛 꼴」을 가르지 않는다 */
  기준에있었나: boolean | null;
}

/**
 * 절 검사 — 이번 작성이 쓰거나 바꾼 케이스 파일을 절과 맞댄다. 「바꾼 케이스」는 파일로 센다 — 프로시저 파일이 바뀌었으면 그 파일의 케이스가 모두 바뀐 것이다.
 * 스위치가 꺼졌으면 프로시저 파일을 쓴 것만 짚는다(스캐너가 그 케이스를 활성으로 올리지 않는다).
 * 흐름이 자연스러운지 · 값 다름 케이스가 맨 뒤인지는 글자로 못 가른다 — 지침과 돌려 보기의 Blocked 가 맡는다
 */
export function 절검사(표글: string, 바뀐: readonly 바뀐케이스파일[], 프로시저모드: boolean): string[] {
  const 틀림: string[] = [];
  const 프로시저파일 = 바뀐.flatMap((f) => {
    const 값 = 프로시저값읽기(f.글);
    return 값 === null ? [] : [{ ...f, 값 }];
  });
  // 기준(main)에 이미 있던 프로시저 파일은 스위치를 끈 뒤에도 그 꼴 그대로 고친다 — 옛 꼴로 옮기는 길이 없다
  if (!프로시저모드) {
    return 프로시저파일.filter((f) => f.기준에있었나 !== true).map((f) => `${f.경로} — 「프로시저 작성」이 꺼진 애플리케이션인데 프로시저 파일을 썼다. 케이스 하나를 파일 하나로 쓴다`);
  }

  // ① 새로 쓴 케이스가 옛 꼴 파일이면 어긋남 — 기준에 옛 꼴로 있던 케이스를 옛 꼴 그대로 고친 것과 게임 미션은 뺀다
  for (const f of 바뀐) {
    if (프로시저파일.some((p) => p.경로 === f.경로) || f.기준에있었나 !== false) continue;
    for (const c of 케이스조각들(f.글)) if (!게임시나리오인가(c.tcId)) 틀림.push(`${c.tcId} — 새로 쓴 케이스를 옛 꼴 파일(${f.경로})로 썼다. 프로시저 파일에 넣고 절에 적는다`);
  }

  const 줄들 = 절줄들(표글);
  const 요구 = 요구줄들(표글);
  const 상태들 = (tcId: string) => 요구.filter((줄) => 줄.tcId === tcId).map((줄) => 줄상태(줄.출처));
  const 볼줄 = new Set<절줄>();
  for (const f of 프로시저파일) {
    // ① 케이스마다 절의 한 줄에만
    for (const tcId of f.값.케이스) {
      const 든 = 줄들.filter((줄) => 줄.케이스.includes(tcId));
      if (든.length !== 1) 틀림.push(`${tcId} — 프로시저 절의 ${든.length === 0 ? '어느 줄에도 없다' : `${String(든.length)}줄에 든다`}. 케이스 하나는 절의 한 줄에만 적는다`);
      for (const 줄 of 든) 볼줄.add(줄);
    }
    // ③ 그 파일의 줄은 번호와 차례가 파일과 같아야 한다
    const 줄 = 줄들.find((x) => f.값.케이스.length > 0 && x.케이스.includes(f.값.케이스[0]!));
    if (줄 === undefined) continue;
    if (줄.프로시저 === '') 틀림.push(`${f.경로} — 프로시저 절 ${String(줄.차례 + 1)}번째 줄에 프로시저 번호가 없다. npm run ledger:number 로 매긴다 — 칸 재료가 없다며 멈추면 절과 tests 폴더에 쓰인 가장 큰 번호 다음을 적는다`);
    else if (f.값.procId !== null && 줄.프로시저 !== f.값.procId) 틀림.push(`${f.경로} — procId 가 ${f.값.procId} 인데 절의 줄은 ${줄.프로시저} 다`);
    if (줄.케이스.join() !== f.값.케이스.join()) 틀림.push(`${줄.프로시저 || f.경로} — 절의 차례(${줄.케이스.join(' → ')})가 파일의 cases 차례(${f.값.케이스.join(' → ')})와 다르다`);
  }

  // 보류는 표의 출처 표시나 케이스 선언의 held 로 안다
  const 보류선언 = new Set(프로시저파일.flatMap((f) => f.값.조각.filter((c) => { const 명 = 명세글(읽기(c.글)); return 명 !== undefined && 속성(명, 'held') !== undefined; }).map((c) => c.tcId)));
  const 뒤쪽 = (tcId: string) => 보류선언.has(tcId) || 상태들(tcId).some((s) => s === '미확정' || s === '오류추정' || s === '보류');
  for (const 줄 of 볼줄) {
    const 이름 = 줄.프로시저 || `프로시저 절 ${String(줄.차례 + 1)}번째 줄`;
    // ② K19 의 범위
    if (줄.케이스.length < 1 || 줄.케이스.length > 10) 틀림.push(`${이름} — 케이스가 ${String(줄.케이스.length)}개다. 한 프로시저는 1개 이상 10개 이하다`);
    // ④ 버튼 반응은 같은 화면끼리만
    // 보류 표시가 같이 적힌 버튼 반응 줄도 버튼 반응이다 — 줄상태는 보류를 먼저 돌려준다
    const 화면들 = new Set(줄.케이스.map((tcId) => 요구.flatMap((x) => (x.tcId === tcId ? (버튼화면(x.출처) ?? []) : []))[0] ?? null));
    if (화면들.size > 1) 틀림.push(`${이름} — 버튼 반응 케이스는 화면마다 따로 프로시저다. 한 줄에 섞였다 — ${[...화면들].map((h) => (h === null ? '버튼 반응이 아닌 케이스' : `「${h}」 화면`)).join(' · ')}`);
    // ⑤ 정식 케이스가 미확정 · 오류 추정 · 보류 케이스 뒤에 오지 않는다
    const 처음뒤 = 줄.케이스.find(뒤쪽);
    const 뒤정식 = 처음뒤 === undefined ? [] : 줄.케이스.slice(줄.케이스.indexOf(처음뒤) + 1).filter((t) => !뒤쪽(t));
    if (뒤정식.length > 0) 틀림.push(`${이름} — 정식 케이스 ${뒤정식.join(' · ')} 가 미확정 · 오류 추정 · 보류 케이스 ${처음뒤!} 뒤에 온다. 정식 케이스를 앞으로 옮긴다`);
  }
  return 틀림;
}

// 버튼 반응 줄이면 표시 뒤 화면 이름, 아니면 null — authoring-slots.ts 의 「표시뒤」와 같은 꼴이다
const 버튼화면 = (출처: string): string | null => {
  const 맞음 = /버튼 반응\s*[—–]\s*([^·]*)/.exec(출처);
  return 맞음 === null ? null : (맞음[1] ?? '').trim().replace(/\s+/g, ' ');
};
