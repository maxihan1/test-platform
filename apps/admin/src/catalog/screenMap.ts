// 케이스 파일이 가져오는 화면 파일과 그 파일의 화면 주소 값으로 지도 ②(케이스 ↔ 화면 파일 ↔ 화면 주소)를 다시 채운다 (카탈로그 §3.1 「지도」)

import { readFile } from 'node:fs/promises';
import { join, posix, sep } from 'node:path';

import type { CaseSpec } from '@platform/kit';
import type { Pool } from 'pg';
import ts from 'typescript';

export interface 화면줄 {
  tcId: string;
  file: string;
  screenUrl: string | null;
}

// helpers/ 는 넣지 않는다 — 로그인 · 계정 · 데이터 도구는 거의 모든 케이스가 써서, 넣으면 「모든 케이스가 그 화면에 닿는다」가 된다 (작성 §3.6 「지도」).
// 경로는 E2E 판별(steps.ts)처럼 앞뒤로 못 박는다 — `../` 로 남의 폴더 파일을 끌어와도 지도에 안 든다
const 화면파일 = /^\.\/((?:pages\/[a-z][a-z0-9-]{0,40}\.page)|(?:components\/[a-z][a-z0-9-]{0,40}\.component))(?:\.js)?$/;

/** 케이스 파일이 가져오는 화면 파일(케이스 파일 자리 기준 `pages/<이름>.page.ts`). 타입만 가져오면 화면을 건드리지 않는다 */
export function 가져온화면파일(케이스글: string): string[] {
  const sf = ts.createSourceFile('case.spec.ts', 케이스글, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const 모음 = new Set<string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier) || stmt.importClause?.isTypeOnly) continue;
    const m = 화면파일.exec(stmt.moduleSpecifier.text);
    if (m) 모음.add(`${m[1]}.ts`);
  }
  return [...모음];
}

/** 화면 파일 클래스의 `static readonly 주소 = '/cart'` 값. 글자 그대로가 아니면(계산식) 모른다 — 짐작한 주소로 잇느니 비워 둔다 */
export function 화면주소(화면글: string): string | null {
  const sf = ts.createSourceFile('screen.page.ts', 화면글, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  for (const stmt of sf.statements) {
    if (!ts.isClassDeclaration(stmt)) continue;
    for (const m of stmt.members) {
      if (
        ts.isPropertyDeclaration(m) &&
        ts.isIdentifier(m.name) &&
        m.name.text === '주소' &&
        (ts.getCombinedModifierFlags(m) & ts.ModifierFlags.Static) !== 0 &&
        m.initializer !== undefined &&
        (ts.isStringLiteral(m.initializer) || ts.isNoSubstitutionTemplateLiteral(m.initializer))
      ) {
        return m.initializer.text;
      }
    }
  }
  return null;
}

/** 읽어 낸 케이스마다 가져온 화면 파일과 그 주소를 잇는다. `file` 은 저장소 뿌리 기준(`tests/<폴더>/pages/<이름>.page.ts`)이다 */
export async function 화면지도줄들(root: string, specs: CaseSpec[]): Promise<화면줄[]> {
  const 주소들 = new Map<string, string | null>();
  const 줄들: 화면줄[] = [];
  for (const spec of specs) {
    const 자리 = posix.dirname(spec.filePath.split(sep).join('/'));
    for (const 상대 of 가져온화면파일(await readFile(join(root, spec.filePath), 'utf8'))) {
      const 경로 = posix.join(자리, 상대);
      if (!주소들.has(경로)) 주소들.set(경로, 화면주소(await readFile(join(root, 경로), 'utf8')));
      줄들.push({ tcId: spec.tcId, file: `tests/${경로}`, screenUrl: 주소들.get(경로) ?? null });
    }
  }
  return 줄들;
}

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/**
 * 그 서비스 케이스 몫을 지우고 다시 채운다(사본이라 손으로 안 고친다). 넣는 tcId 는 방금 저장한 케이스라 늘 카탈로그에 있다.
 * 파일을 못 읽으면 던진다 — 부르는 쪽이 옛 지도를 둔 채 스캔 문제로 남긴다
 */
export async function 화면지도채우기(serviceId: number, prefix: string, root: string, specs: CaseSpec[]): Promise<number> {
  const 줄들 = await 화면지도줄들(root, specs);

  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    // 기동 스캔과 「다시 스캔」이 겹치면 뒤엣것의 넣기가 앞엣것이 넣은 줄과 부딪힌다. 서비스마다 차례로 세운다 (지도 ① 과 같다)
    await client.query("SELECT pg_advisory_xact_lock(hashtext('case_screen'), $1::int)", [serviceId]);
    await client.query('DELETE FROM case_screen WHERE tc_id LIKE $1', [`${prefix}-%`]);
    await client.query(
      `INSERT INTO case_screen (tc_id, file, screen_url)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[])`,
      [줄들.map((x) => x.tcId), 줄들.map((x) => x.file), 줄들.map((x) => x.screenUrl)],
    );
    await client.query('COMMIT');
    return 줄들.length;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
