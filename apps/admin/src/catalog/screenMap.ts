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
  /** 화면 파일 클래스 이름(`게시판목록화면`) — 목록이 주소 · 영문 파일 이름 대신 보인다 (PRD-F9-18) */
  name: string | null;
  /** 화면 파일 안 이동이 여는 다른 주소 틀(`/board/:n/edit`) — 미검증 화면 셈이 화면 주소와 같이 본다 (WEB-F6-03) */
  openUrls: string[];
}

// helpers/ 는 넣지 않는다 — 로그인 · 계정 · 데이터 도구는 거의 모든 케이스가 써서, 넣으면 「모든 케이스가 그 화면에 닿는다」가 된다 (작성 §3.6 「지도」).
// 경로는 E2E 판별(steps.ts)처럼 앞뒤로 못 박는다 — `../` 로 남의 폴더 파일을 끌어와도 지도에 안 든다
const 화면파일 = /^\.\/((?:pages\/[a-z][a-z0-9-]{0,40}\.page)|(?:components\/[a-z][a-z0-9-]{0,40}\.component))(?:\.js)?$/;

function 타입만인가(clause: ts.ImportClause | undefined): boolean {
  if (clause === undefined) return false;
  if (clause.isTypeOnly) return true;
  const 묶음 = clause.namedBindings;
  // `import { type 화면 }` 처럼 이름마다 type 을 단 것도 값은 하나도 안 가져온다
  return clause.name === undefined && 묶음 !== undefined && ts.isNamedImports(묶음) && 묶음.elements.length > 0 && 묶음.elements.every((e) => e.isTypeOnly);
}

/** 케이스 파일이 가져오는 화면 파일(케이스 파일 자리 기준 `pages/<이름>.page.ts`). 타입만 가져오면 화면을 건드리지 않는다 */
export function 가져온화면파일(케이스글: string): string[] {
  const sf = ts.createSourceFile('case.spec.ts', 케이스글, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const 모음 = new Set<string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier) || 타입만인가(stmt.importClause)) continue;
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

/**
 * 화면 파일 안 이동(`page.goto`)이 여는 주소 틀 — 글자 그대로이거나 `${…}` 자리를 `:n` 으로 바꾼 템플릿, `/` 로 시작하는 것만. 조건식은 두 갈래 다.
 * `수정열기` 의 `/board/${번호}/edit` 처럼 화면 파일 하나가 여는 두 번째 화면이다. 앞이 계산식(`${화면.주소}?…`)이면 짐작하지 않고 뺀다 (도메인/작성 §3.6 「세는 방식」)
 */
export function 여는주소들(화면글: string): string[] {
  const sf = ts.createSourceFile('screen.page.ts', 화면글, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const 모음 = new Set<string>();
  const 값 = (n: ts.Expression): void => {
    if (ts.isParenthesizedExpression(n)) return 값(n.expression);
    if (ts.isConditionalExpression(n)) {
      값(n.whenTrue);
      값(n.whenFalse);
      return;
    }
    const 글 =
      ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ? n.text
        : ts.isTemplateExpression(n) ? n.head.text + n.templateSpans.map((s) => `:n${s.literal.text}`).join('')
          : null;
    if (글?.startsWith('/') === true) 모음.add(글);
  };
  const 훑기 = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'goto' && n.arguments[0] !== undefined) 값(n.arguments[0]);
    ts.forEachChild(n, 훑기);
  };
  훑기(sf);
  return [...모음];
}

/** 화면 파일이 내보내는 첫 클래스 이름 — 작성 규칙이 한글 이름(`게시판목록화면` · `머리글`)으로 짓는다. 없으면 모른다 */
export function 화면이름(화면글: string): string | null {
  const sf = ts.createSourceFile('screen.page.ts', 화면글, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  for (const stmt of sf.statements) {
    if (ts.isClassDeclaration(stmt) && stmt.name !== undefined && (ts.getCombinedModifierFlags(stmt) & ts.ModifierFlags.Export) !== 0) return stmt.name.text;
  }
  return null;
}

/** 읽어 낸 케이스마다 가져온 화면 파일과 그 주소 · 이름을 잇는다. `file` 은 저장소 뿌리 기준(`tests/<폴더>/pages/<이름>.page.ts`)이다 */
export async function 화면지도줄들(root: string, specs: CaseSpec[]): Promise<화면줄[]> {
  const 파일들 = new Map<string, Omit<화면줄, 'tcId' | 'file'>>();
  const 줄들: 화면줄[] = [];
  for (const spec of specs) {
    const 자리 = posix.dirname(spec.filePath.split(sep).join('/'));
    for (const 상대 of 가져온화면파일(await readFile(join(root, spec.filePath), 'utf8'))) {
      const 경로 = posix.join(자리, 상대);
      if (!파일들.has(경로)) {
        const 글 = await readFile(join(root, 경로), 'utf8');
        // 화면 조각은 여러 화면에 나오므로 주소가 없다 — 값을 적어 둬도 넣지 않는다 (공통/4-데이터모델 case_screen)
        const 화면 = 상대.startsWith('pages/');
        const screenUrl = 화면 ? 화면주소(글) : null;
        파일들.set(경로, { screenUrl, name: 화면이름(글), openUrls: 화면 ? 여는주소들(글).filter((u) => u !== screenUrl) : [] });
      }
      줄들.push({ tcId: spec.tcId, file: `tests/${경로}`, ...파일들.get(경로)! });
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
 * 케이스 파일을 다 읽지 못했으면(`전부읽음` 이 거짓) 읽은 케이스 몫만 바꾼다 — 비활성 처리를 건너뛰는 것과 같은 까닭이다(무엇이 정말 사라졌는지 모른다).
 * 파일을 못 읽으면 던진다 — 부르는 쪽이 옛 지도를 둔 채 스캔 문제로 남긴다
 */
export async function 화면지도채우기(
  serviceId: number,
  prefix: string,
  root: string,
  specs: CaseSpec[],
  전부읽음: boolean,
): Promise<number> {
  const 줄들 = await 화면지도줄들(root, specs);

  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    // 기동 스캔과 「다시 스캔」이 겹치면 뒤엣것의 넣기가 앞엣것이 넣은 줄과 부딪힌다. 서비스마다 차례로 세운다 (지도 ① 과 같다)
    await client.query("SELECT pg_advisory_xact_lock(hashtext('case_screen'), $1::int)", [serviceId]);
    await client.query('DELETE FROM case_screen WHERE tc_id LIKE $1 AND ($2::boolean OR tc_id = ANY($3::text[]))', [
      `${prefix}-%`,
      전부읽음,
      specs.map((s) => s.tcId),
    ]);
    // 여는 주소는 줄마다 길이가 달라 unnest 로 못 펴서 JSON 으로 넘긴다
    await client.query(
      `INSERT INTO case_screen (tc_id, file, screen_url, name, open_urls)
       SELECT x."tcId", x.file, x."screenUrl", x.name, ARRAY(SELECT json_array_elements_text(x."openUrls"))
         FROM json_to_recordset($1) AS x("tcId" text, file text, "screenUrl" text, name text, "openUrls" json)`,
      [JSON.stringify(줄들)],
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
