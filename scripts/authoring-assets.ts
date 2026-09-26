// 작성 에이전트가 집은 요청의 자료(파일·피그마)를 어떻게 다룰지 정하는 순수 함수들 (도메인/작성 §7 「자료」)

import { extname, join } from 'node:path';

/** 집기·상세 응답의 자료 한 건 중 맥이 쓰는 칸만 */
export interface 자료 {
  id: number;
  position: number;
  kind: 'FILE' | 'FIGMA';
  name: string;
  figmaUrl: string | null;
  /** 사람 입력인지 에이전트 산출물인지 (§3.6 「★ 역방향」). 없으면 입력이다 — 옛 서버 응답 */
  role?: 'INPUT' | 'MARKED' | 'REVERSE_SPEC';
}

/**
 * 사람이 넣은 입력만 남긴다. 재실행은 원본 요청의 자료를 다시 읽는데, 원본이 역방향이었으면 거기에
 * 표시 사본·역기획서가 같이 붙어 있다 — 섞으면 에이전트 산출물을 기획서로 읽는다.
 * (서버가 역방향 원본의 재실행을 409 로 막지만 에이전트는 서버를 믿지 않는다)
 */
export function 입력만(자료들: 자료[]): 자료[] {
  return 자료들.filter((자) => (자.role ?? 'INPUT') === 'INPUT');
}

/** 자료 하나를 자식에게 넘기기까지 할 일. 파일은 받아서(필요하면 바꿔서) 경로로, 피그마는 주소로 */
export type 읽을자료 =
  | {
      kind: 'FILE';
      id: number;
      /** 사람이 준 이름. 프롬프트에만 싣는다 — 디스크에는 안 쓴다 */
      name: string;
      받을자리: string;
      /** 글자로 바꾸는 명령. 바꿀 필요가 없으면 `null` */
      변환: { 명령: string; 인자: string[] } | null;
      읽을자리: string;
    }
  | { kind: 'FIGMA'; 주소: string };

/**
 * 자료마다 할 일을 자리 순서대로 정한다.
 *
 * **디스크 이름은 자료 번호다.** 사람이 준 이름으로 쓰면 `../` 같은 이름이 폴더 밖에 쓴다 —
 * 서버가 이미 막지만 맥은 서버를 믿지 않는다. 확장자만 이름에서 가져온다.
 *
 * doc·docx 는 claude 의 Read 가 못 연다. 맥은 기본 도구 `textutil`, 서버(리눅스)는 이미지에 넣은 `pandoc` 으로
 * 글자만 뽑는다 (2026-09-23 게이트 1). pandoc 은 옛 `.doc` 을 못 읽는다 — `못읽는자료` 가 미리 말한다.
 */
export function 자료계획(자료들: 자료[], 폴더: string, 플랫폼: string = process.platform): 읽을자료[] {
  return [...자료들]
    .sort((a, b) => a.position - b.position)
    .map((자): 읽을자료 => {
      if (자.kind === 'FIGMA') return { kind: 'FIGMA', 주소: 자.figmaUrl ?? 자.name };
      const 확장자 = extname(자.name).toLowerCase();
      const 받을자리 = join(폴더, `${String(자.id)}${확장자}`);
      if (확장자 === '.doc' || 확장자 === '.docx') {
        const 읽을자리 = join(폴더, `${String(자.id)}.txt`);
        return {
          kind: 'FILE',
          id: 자.id,
          name: 자.name,
          받을자리,
          변환:
            플랫폼 === 'darwin'
              ? { 명령: 'textutil', 인자: ['-convert', 'txt', '-output', 읽을자리, 받을자리] }
              : { 명령: 'pandoc', 인자: ['-t', 'plain', '-o', 읽을자리, 받을자리] },
          읽을자리,
        };
      }
      return { kind: 'FILE', id: 자.id, name: 자.name, 받을자리, 변환: null, 읽을자리: 받을자리 };
    });
}

/** 이 기계가 글자로 못 바꾸는 자료가 있으면 사유. 서버의 pandoc 은 옛 `.doc` 을 못 읽는다 */
export function 못읽는자료(계획: 읽을자료[], 플랫폼: string = process.platform): string | null {
  if (플랫폼 === 'darwin') return null;
  const 옛것 = 계획.filter((c) => c.kind === 'FILE' && extname(c.받을자리) === '.doc');
  if (옛것.length === 0) return null;
  const 이름들 = 옛것.map((c) => (c.kind === 'FILE' ? `「${c.name}」` : '')).join(' · ');
  return `${이름들} 은 옛 워드(.doc)라 서버가 못 읽는다. .docx 나 PDF 로 저장해 다시 올려라.`;
}

/** 자료를 읽을 행 번호. 재실행 행은 자기 자료가 없고 원본의 자료를 다시 읽는다 (도메인/작성 §7) */
export function 자료출처(것: { id: number; kind: string; sourceId?: number | null }): number {
  return 것.kind === 'RERUN' && typeof 것.sourceId === 'number' ? 것.sourceId : 것.id;
}

/**
 * claude 를 불러도 되나. 막으면 사유를, 아니면 `null`.
 *
 * **빈 입력에 구독 한도를 쓰지 않는다.** 병합 뒤 옛 에이전트나 서버 실수로 자료 없는 행이 오면
 * 빈 기획서로 claude 가 돈다. 피그마 토큰이 없으면 자식이 피그마를 못 읽고 한도만 태운 뒤 멈춘다.
 * 옛 행(자료 0, 본문 있음)은 본문으로 돈다.
 */
export function 돌릴수있나(
  입력: { specText?: string | null; figmaToken?: string; 화면만?: boolean },
  자료들: 자료[],
): string | null {
  // 화면만(대조 + 시작 주소)은 기획서 없이 그 화면을 훑는다 — 자료 0 이 정상이다 (§7 submit)
  if (자료들.length === 0 && !입력.specText && 입력.화면만 !== true) {
    return '자료도 기획서 본문도 없다. 돌릴 것이 없어 claude 를 부르지 않았다.';
  }
  if (자료들.some((자) => 자.kind === 'FIGMA') && !입력.figmaToken) {
    return '피그마 자료가 있는데 피그마 토큰이 없다. 설정 화면에 피그마 토큰을 넣어라.';
  }
  return null;
}

/** 설정 파일에서 권한 부분만 */
export interface 권한설정 {
  permissions?: { allow?: string[]; defaultMode?: string };
}

/**
 * 자식이 셸을 통째로 쓸 수 있나.
 *
 * `--permission-mode acceptEdits` 는 쓰기만 풀고 셸은 안 푼다 (docs/SETUP.md §8 「전제 둘」).
 * 셸이 막혀 있으면 피그마도 못 읽고 관문도 못 돈다 — **한도를 다 쓰고 나서야** 드러난다.
 * `defaultMode` 는 안 본다 — 자식을 `--permission-mode` 로 띄우므로 덮인다.
 * `Bash(npx:*)` 같은 부분 허용도 안 받는다 — 자식은 npm·npx·playwright 를 쓴다(git·gh 는 맥이 한다).
 * **CLI 가 자식 자리에서 실제로 읽는 것만 센다** — `~/.claude/settings.json`(사용자)과 작업방에 checkout 되는
 * 추적 파일 `.claude/settings.json`(프로젝트). local 둘은 안 센다 — 사용자 local 은 CLI 가 안 읽고,
 * 프로젝트 local 은 추적되지 않아 맥이 새로 연 작업방에 없다.
 */
export function 셸허용됐나(설정들: { 어디: string; 값: 권한설정 }[]): boolean {
  return 설정들.some(
    ({ 어디, 값 }) =>
      (어디 === '사용자' || 어디 === '프로젝트') &&
      (값.permissions?.allow ?? []).some((규칙) => 규칙 === 'Bash' || 규칙 === 'Bash(*)'),
  );
}

/** 프롬프트에 싣는 자료 목록. 토큰은 절대 안 싣는다 — 자식 환경에만 있다 */
export function 자료목록글(계획: 읽을자료[]): string[] {
  const 파일들 = 계획.flatMap((c) => (c.kind === 'FILE' ? [`- ${c.읽을자리}  (원래 이름: ${c.name})`] : []));
  const 피그마들 = 계획.flatMap((c) => (c.kind === 'FIGMA' ? [`- ${c.주소}`] : []));
  return [
    '--- 자료 목록 ---',
    '자료 여럿을 요구사항 표 하나로 합쳐라. 읽는 법은 tpx-cases 스킬의 「입력은 자료 목록이다」를 따라라.',
    ...(파일들.length > 0 ? ['', '파일 (Read 로 연다):', ...파일들] : []),
    ...(피그마들.length > 0
      ? ['', '피그마 (토큰은 환경변수 FIGMA_TOKEN 에 이미 있다):', ...피그마들]
      : []),
  ];
}
