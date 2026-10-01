// 반영 때 겹침 찾기 — 이 요청이 새로 더한 케이스를 지금 main 과 견준다 (SPEC 도메인/작성 §3.6 「★ 반영 때 겹침 검사」)
// ⒜ 같은 tc_id(main 파일 · 표의 「제거함」 포함) ⒝ 같은 요구 번호 ⒞ 같은 이름 — ⒝ · ⒞ 는 이 요청이 작성을 시작한 뒤 main 에 들어온 케이스만 본다.
// 예전부터 있던 케이스는 자식이 작성할 때 이미 보고 만들었다(한 요구에 케이스 여럿은 원래 된다). 서버가 받는 모양은 apps/admin/src/authoring/conflicts.ts

import ts from 'typescript';

import type { 겹침, 겹침종류, 상대 } from '../apps/admin/src/authoring/conflicts.js';
import { 겹침상한 } from '../apps/admin/src/authoring/conflicts.js';
import { 명세글, 속성, 읽기, 케이스tcId } from './authoring-held-apply.js';
import { 번호찾기 } from './authoring-ledger.js';
import { 표읽기 } from './authoring-ledger-check.js';

export interface 케이스글 {
  /** 저장소 뿌리 기준 경로 */
  file: string;
  글: string;
}

export interface 견줄것 {
  /** 이 요청이 새로 더한 케이스 파일(자식이 끝낸 커밋 기준). 바꾼 케이스는 넣지 않는다 */
  더한: 케이스글[];
  /** 지금 main 의 그 서비스 테스트 폴더 케이스 전부 */
  main케이스: 케이스글[];
  /** 그 가운데 이 요청이 작성을 시작한 뒤 main 에 들어온 파일 경로 */
  새로들어온: Set<string>;
  /** 요구사항 표 — 요청 쪽(자식이 끝낸 커밋) · main 쪽. 없으면 빈 글자 */
  요청표: string;
  main표: string;
  /** 표 경로 — 표에만 남은 tc_id(「제거함」)의 상대 자리로 쓴다 */
  표경로: string;
  /** 보류에서 「제거」한 tc_id — 어차피 반영에서 빠진다 */
  뺀것: Set<string>;
}

const TCID꼴 = /^[A-Z][A-Z0-9]{0,11}-\d{3}$/;
// 문단 모드 번호는 요청마다 P-001 부터 다시 매긴다 — 서로 다른 기획서가 같은 번호를 갖는다 (작성 §3.6 「★ 원장」 문단 모드)
const 문단번호 = /^P\d*-\d+$/;

/** 케이스 이름(defineCase 의 name) — 코드를 실행하지 않고 구문 트리에서 읽는다. 자식이 쓴 코드다 */
export function 케이스이름(글: string): string | null {
  const 명세 = 명세글(읽기(글));
  const 값 = 명세 === undefined ? undefined : 속성(명세, 'name')?.initializer;
  return 값 !== undefined && ts.isStringLiteralLike(값) ? 값.text : null;
}

/** 이름을 견줄 꼴 — 앞뒤 공백 · 겹친 빈칸 · 영문 대소문자를 무시한다 */
export function 이름틀(이름: string): string {
  return 이름.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** 표 칸의 tc_id 전부 — 「제거함(<tcId>)」 칸까지 센다. 지운 번호를 다시 쓰면 옛 실행 이력이 새 케이스에 붙는다 */
export function 표tcId들(표: string): Set<string> {
  const 결과 = new Set<string>();
  for (const 줄 of 표.split(/\r?\n/)) {
    if (!줄.trimStart().startsWith('|')) continue;
    for (const 칸 of 줄.split('|').map((c) => c.trim())) {
      const id = /^제거함\((.+)\)$/.exec(칸)?.[1] ?? 칸;
      if (TCID꼴.test(id)) 결과.add(id);
    }
  }
  return 결과;
}

/** 요구사항 표에서 tc_id 마다 그 줄 출처 칸의 요구 번호(문단 번호 뺌) */
function 요구번호들(표: string): Map<string, Set<string>> {
  const 결과 = new Map<string, Set<string>>();
  for (const 행 of 표읽기(표, '요구사항')) {
    const tcId = (행['tcId'] ?? '').trim();
    if (!TCID꼴.test(tcId)) continue;
    const 번호들 = 번호찾기(행['출처'] ?? '').번호들.filter((b) => !문단번호.test(b));
    const 모음 = 결과.get(tcId) ?? new Set<string>();
    번호들.forEach((b) => 모음.add(b));
    결과.set(tcId, 모음);
  }
  return 결과;
}

interface 읽은케이스 {
  tcId: string;
  name: string;
  file: string;
}

function 읽기들(케이스들: 케이스글[]): 읽은케이스[] {
  return 케이스들.flatMap((c) => {
    const tcId = 케이스tcId(c.글);
    // 이름은 서버 상한(300자)에 맞춘다 — 넘으면 끝내기 목록이 통째로 400 이다
    return tcId === null ? [] : [{ tcId, name: (케이스이름(c.글) ?? '').slice(0, 300), file: c.file }];
  });
}

/** 겹침 목록. 한 케이스에 종류가 여럿이면 한 줄에 모은다. 상한을 넘는 뒤쪽은 버린다(끝내기 본문이 커지지 않게) */
export function 겹침찾기(입력: 견줄것): 겹침[] {
  const main = 읽기들(입력.main케이스);
  const 새것 = main.filter((c) => 입력.새로들어온.has(c.file));
  const main표id = 표tcId들(입력.main표);
  const 요청번호 = 요구번호들(입력.요청표);
  const main번호 = 요구번호들(입력.main표);

  const 결과: 겹침[] = [];
  for (const 이것 of 읽기들(입력.더한)) {
    if (입력.뺀것.has(이것.tcId)) continue;
    const 종류: 겹침종류[] = [];
    const 상대들 = new Map<string, 상대>();
    const 더하기 = (c: 상대) => 상대들.set(`${c.tcId} ${c.file}`, c);

    const 같은id = main.filter((c) => c.tcId === 이것.tcId);
    if (같은id.length > 0 || main표id.has(이것.tcId)) {
      종류.push('TCID');
      if (같은id.length > 0) 같은id.forEach(더하기);
      else 더하기({ tcId: 이것.tcId, name: '', file: 입력.표경로 });
    }

    const 내번호 = 요청번호.get(이것.tcId) ?? new Set<string>();
    const 겹친번호 = new Set<string>();
    for (const c of 새것) {
      const 같은 = [...(main번호.get(c.tcId) ?? [])].filter((b) => 내번호.has(b));
      if (같은.length === 0) continue;
      같은.forEach((b) => 겹친번호.add(b));
      더하기(c);
    }
    if (겹친번호.size > 0) 종류.push('REQUIREMENT');

    const 같은이름 = 이것.name === '' ? [] : 새것.filter((c) => 이름틀(c.name) === 이름틀(이것.name));
    if (같은이름.length > 0) {
      종류.push('NAME');
      같은이름.forEach(더하기);
    }

    if (종류.length === 0) continue;
    결과.push({
      tcId: 이것.tcId,
      name: 이것.name,
      file: 이것.file,
      kinds: 종류,
      with: [...상대들.values()].slice(0, 20),
      ...(겹친번호.size > 0 ? { requirements: [...겹친번호].slice(0, 20) } : {}),
    });
  }
  return 결과.slice(0, 겹침상한);
}
