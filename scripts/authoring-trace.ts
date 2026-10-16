// 작성 중 빨개진 케이스의 trace.zip 을 몇 줄로 줄이고 까닭을 가른다 (SPEC 도메인/작성 §3.6 「관문이 빨개지면」)
// 자식이 긴 오류 글 대신 실패한 조작 · 그 단계의 API · 콘솔만 읽는다. 요약 · 가림은 서버 통로와 같은 코드다(execution/traceSummary.ts)
// 실행: npm run trace:summary -- <trace.zip 또는 폴더>…

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { 요약줄들 } from '../apps/admin/src/execution/traceSummary.js';

/** 경로들에서 zip 을 모은다. 폴더면 그 아래를 다 훑는다 */
export function zip찾기(경로들: readonly string[]): string[] {
  return 경로들.flatMap((p) => {
    const s = statSync(p, { throwIfNoEntry: false });
    if (s === undefined) return [];
    if (s.isFile()) return [p];
    return readdirSync(p, { recursive: true, encoding: 'utf8' })
      .filter((이름) => 이름.endsWith('.zip'))
      .map((이름) => join(p, 이름))
      .sort();
  });
}

/**
 * 가릴 계정 비밀번호 — PLATFORM_ACCOUNTS 에서. 값이 있는데 못 읽으면 던진다:
 * 빈 목록으로 넘어가면 비밀번호가 가려지지 않은 채 자식의 대화에 남는다
 */
export function 계정비밀번호(env: NodeJS.ProcessEnv = process.env): string[] {
  const 원문 = env.PLATFORM_ACCOUNTS;
  if (원문 === undefined || 원문.trim() === '') return [];
  let 줄들: unknown;
  try {
    줄들 = JSON.parse(원문);
  } catch {
    // JSON.parse 문장은 받은 글의 앞부분을 싣는다 — 비밀번호가 새지 않게 이름만 알린다
    throw new Error('PLATFORM_ACCOUNTS가 JSON이 아니다 — 비밀번호를 못 가려 요약하지 않는다');
  }
  if (!Array.isArray(줄들)) throw new Error('PLATFORM_ACCOUNTS가 배열이 아니다 — 비밀번호를 못 가려 요약하지 않는다');
  return 줄들.flatMap((x: unknown) => {
    const v = (x as { loginPassword?: unknown } | null)?.loginPassword;
    return typeof v === 'string' && v !== '' ? [v] : [];
  });
}

/** 종료 코드 — 0 다 요약함 · 1 못 읽은 zip 이 있다 · 2 zip 이 없다 */
async function 실행(인자: string[]): Promise<number> {
  const 비밀 = 계정비밀번호();
  const zip들 = zip찾기(인자);
  if (zip들.length === 0) {
    console.log(`trace 없음 — ${인자.join(' ') || '(경로 없음)'} 에 zip 이 없다. 빨간 케이스를 --trace on 으로 다시 돌렸는지 본다`);
    return 2;
  }
  let 못읽음 = 0;
  for (const 파일 of zip들) {
    console.log(`# ${파일}`);
    try {
      for (const l of await 요약줄들(readFileSync(파일), 비밀)) console.log(l);
    } catch (e) {
      못읽음 += 1;
      console.log(`못 읽음 — ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return 못읽음 === 0 ? 0 : 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await 실행(process.argv.slice(2)).catch((e: unknown) => {
    console.log(e instanceof Error ? e.message : String(e));
    return 1;
  });
}
