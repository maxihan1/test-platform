// K8 — Playwright 가 파일마다 테스트 1개를 등록하는지 본다 (SPEC §4 K표). rules.ts 가 300줄을 넘어 떼어 냈다

import type { Violation } from './rules.js';

export const K8_WHY = '문법 오류나 import 실패로 케이스가 등록되지 않는다';

export function k8(file: string, what: string, line = 1): Violation {
  return { file, line, rule: 'K8', what, why: K8_WHY };
}

export interface ListSuite {
  file?: string;
  specs?: { title?: string }[];
  suites?: ListSuite[];
}

export interface ListReport {
  errors?: { message?: string; location?: { file?: string; line?: number } }[];
  suites?: ListSuite[];
}

// 같은 제목이 프로젝트(desktop·mobile) 수만큼 겹쳐 나온다. 제목 가짓수로 세야 파일당 1건이 잡힌다 (LEARNINGS WS-C)
function titlesIn(suite: ListSuite, into: Set<string>): void {
  for (const s of suite.specs ?? []) if (s.title !== undefined) into.add(s.title);
  for (const nested of suite.suites ?? []) titlesIn(nested, into);
}

export function checkRegistration(report: ListReport, files: string[]): Violation[] {
  const out: Violation[] = [];

  for (const err of report.errors ?? []) {
    out.push(
      k8(err.location?.file ?? '(수집)', `테스트를 수집하지 못했다: ${err.message ?? '사유 없음'}`, err.location?.line ?? 1),
    );
  }

  const titles = new Map<string, Set<string>>();
  for (const suite of report.suites ?? []) {
    if (suite.file === undefined) continue;
    const bucket = titles.get(suite.file) ?? new Set<string>();
    titlesIn(suite, bucket);
    titles.set(suite.file, bucket);
  }

  for (const file of files) {
    const found = titles.get(file);
    if (found === undefined || found.size === 0) {
      out.push(k8(file, 'playwright가 이 파일에서 테스트를 하나도 등록하지 않았다'));
    } else if (found.size !== 1) {
      // 프로시저 파일도 테스트는 하나다 — 케이스 여럿이 그 테스트 하나 안에서 돈다
      out.push(k8(file, `등록된 테스트가 ${found.size}개다. 파일 1개 = 테스트 1개여야 한다(케이스 1건 또는 프로시저 1개)`));
    }
  }

  return out;
}
