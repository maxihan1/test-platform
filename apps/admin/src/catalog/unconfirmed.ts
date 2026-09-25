// 미확정 꼬리표(unconfirmed)의 모양 검사 K11 과 「이미 있던 케이스에 새로 단 꼬리표」 판별

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import ts from 'typescript';

export interface BadTag {
  node: ts.Node;
  what: string;
}

// 따옴표 키('unconfirmed')·계산된 리터럴 키(['unconfirmed'])도 실행하면 같은 꼬리표다. 이름만 보면 변수 사유가 빠져나간다
function isTagKey(name: ts.PropertyName | undefined): boolean {
  if (name === undefined) return false;
  const key = ts.isComputedPropertyName(name) ? name.expression : name;
  return (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) && key.text === 'unconfirmed';
}

// K6 의 TITLE_KINDS 와 같은 기준이다 — 문자열 리터럴이나 치환 없는 템플릿만 글자로 읽힌다
export function badTag(literal: ts.ObjectLiteralExpression): BadTag | undefined {
  for (const p of literal.properties) {
    // 펼친 객체 안에 꼬리표가 숨어 있을 수 있는데 검사기는 그 글자를 못 읽는다
    if (ts.isSpreadAssignment(p)) return { node: p, what: '펼침(...)이 있어 unconfirmed 사유를 글자로 읽을 수 없다' };
    if (p.name !== undefined && ts.isComputedPropertyName(p.name) && !ts.isStringLiteralLike(p.name.expression)) {
      return { node: p, what: '계산된 키가 있어 unconfirmed 사유를 글자로 읽을 수 없다' };
    }
    if (!isTagKey(p.name)) continue;
    if (!ts.isPropertyAssignment(p) || !ts.isStringLiteralLike(p.initializer)) {
      return { node: p, what: 'unconfirmed가 문자열 리터럴이 아니다' };
    }
    // defineCase 는 공백뿐인 사유를 확정으로 싣는다. 모양만 보고 통과시키면 미확정이 정식에 섞인다
    if (p.initializer.text.trim() === '') return { node: p, what: 'unconfirmed가 비어 있다' };
  }
  return undefined;
}

export function hasTag(text: string): boolean {
  const sf = ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let found = false;
  const walk = (node: ts.Node): void => {
    if (found) return;
    if (ts.isObjectLiteralExpression(node) && ts.isCallExpression(node.parent)) {
      const callee = node.parent.expression;
      if (ts.isIdentifier(callee) && callee.text === 'defineCase') {
        found = node.properties.some((p) => isTagKey(p.name));
        return;
      }
    }
    node.forEachChild(walk);
  };
  walk(sf);
  return found;
}

// 새 케이스는 역방향 작성이 원래 꼬리표를 달고 나온다. 경고할 것은 확정이던 케이스가 미확정으로 옮겨 가는 경우뿐이다
export function newlyUnconfirmed(before: string | null, after: string): boolean {
  if (before === null) return false;
  return hasTag(after) && !hasTag(before);
}

const run = promisify(execFile);

// pre-push 훅 안에서 돌면 git 이 GIT_DIR·GIT_INDEX_FILE 같은 것을 물려준다. 그대로 쓰면 cwd 가 아니라
// 그 저장소를 건드린다 — 2026-09-25 에 임시 저장소 검사가 실제 브랜치에 커밋을 만들고 origin/main 을 옮겼다
export function gitEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
}

// 경로가 아니라 tcId 로 찾는다. 파일을 옮기거나 이름을 바꾸며 꼬리표를 달아도 옛 본문을 놓치지 않는다
// dir 는 저장소 루트 기준 케이스 폴더다. 저장소 전체를 훑으면 다른 폴더의 같은 tcId 를 먼저 집는다
export async function oldSourceByTcId(repoRoot: string, tcId: string, dir = '.'): Promise<string | null> {
  // K2 를 어긴 tcId 도 여기까지 온다. 정규식 글자로 읽히면 조회가 깨지거나 엉뚱한 파일과 맞는다
  const id = tcId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let stdout: string;
  try {
    ({ stdout } = await run(
      'git',
      ['grep', '-l', '-E', '-e', `tcId: *['"\`]${id}['"\`]`, 'origin/main', '--', `${dir}/*.spec.ts`],
      { cwd: repoRoot, env: gitEnv() },
    ));
  } catch (err) {
    // git grep 은 못 찾으면 종료 코드 1 이다. 그건 새 케이스라는 뜻이고 조회 실패가 아니다
    if ((err as { code?: unknown }).code === 1) return null;
    throw new Error(`origin/main 에서 ${tcId} 를 찾지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
  const hit = stdout.split('\n')[0];
  if (hit === undefined || hit === '') return null;
  return (await run('git', ['show', hit], { cwd: repoRoot, env: gitEnv(), maxBuffer: 8 * 1024 * 1024 })).stdout;
}

