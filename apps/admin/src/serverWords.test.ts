// 서버가 사람에게 내보내는 글(API 오류 · 실행 결과 사유 · 리포트 · 이슈 · 알림)이 docs/WORDS.md §1 「쓰지 않는 말」을 쓰지 않는지 본다
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { 낱말표, 정본 } from './wordTable.fixture.js';

const 뿌리 = dirname(fileURLToPath(import.meta.url));

interface 글줄 {
  줄: number;
  글: string;
}

// 개발자만 보는 로그다. `표.로그(…)`(성능 「실행 로그」)는 화면에 나가서 여기 안 든다 — 맨 이름 `로그(…)` 만 정기 실행의 로그 콜백이다
const 로그호출 = /^(?:console|콘솔)\.|(?:^|\.)log\.\w+$|^로그(?:\.\w+)?$|stderr\.write$/u;
// 글을 찾거나 견주는 데 쓰는 인자 — 사람에게 나가지 않는다
const 견주는함수 = new Set(['includes', 'startsWith', 'endsWith', 'indexOf', 'has', 'get', 'delete', 'split', 'test', 'match', 'localeCompare']);
const 찾아바꾸는함수 = new Set(['replace', 'replaceAll']);
const 같은지 = new Set([
  ts.SyntaxKind.EqualsEqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ts.SyntaxKind.EqualsEqualsToken,
  ts.SyntaxKind.ExclamationEqualsToken,
]);
const SQL = /\b(?:SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE)\b/u;

function 글자열인가(n: ts.Node): n is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression {
  return ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n);
}

/**
 * 끼워 넣는 값(`${…}`)은 `{}` 로 줄인다 — 그 안의 글은 따로 걸린다.
 * 서버가 만들어 내는 CSS · k6 스크립트 안의 주석은 사람에게 안 나가서 뺀다
 */
function 보이는글(n: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral | ts.TemplateExpression): string {
  const 글 = ts.isTemplateExpression(n) ? n.head.text + n.templateSpans.map((s) => `{}${s.literal.text}`).join('') : n.text;
  return 글.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
}

function 안나가는자리(n: ts.Node): boolean {
  const 부모 = n.parent;
  if (ts.isPropertyAssignment(부모) && 부모.name === n) return true;
  if (ts.isElementAccessExpression(부모) && 부모.argumentExpression === n) return true;
  if (ts.isComputedPropertyName(부모) || ts.isCaseClause(부모)) return true;
  if (ts.isBinaryExpression(부모) && 같은지.has(부모.operatorToken.kind)) return true;
  if (ts.isCallExpression(부모) && ts.isPropertyAccessExpression(부모.expression)) {
    const 이름 = 부모.expression.name.text;
    if (견주는함수.has(이름)) return true;
    if (찾아바꾸는함수.has(이름) && 부모.arguments[0] === n) return true;
  }
  return false;
}

/**
 * 서버 코드 한 파일에서 사람에게 나갈 수 있는 한글 글을 뽑는다.
 * 빼는 것 — 로그 호출 · 타입 · 열쇠 · 비교 · SQL · 띄어쓰기 없는 낱말 하나(값이나 이름이다).
 * 잡는 쪽으로 틀리게 짰다: 새 폴더 · 새 도우미 함수가 생겨도 목록을 고칠 일이 없다
 */
function 서버글(경로: string, 원문: string): 글줄[] {
  const sf = ts.createSourceFile(경로, 원문, ts.ScriptTarget.Latest, true);
  const 결과: 글줄[] = [];
  const 걷기 = (n: ts.Node): void => {
    if (ts.isTypeNode(n) || ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n) || ts.isImportDeclaration(n)) return;
    if (ts.isCallExpression(n) && 로그호출.test(n.expression.getText(sf))) return;
    if (글자열인가(n) && !안나가는자리(n)) {
      const 글 = 보이는글(n);
      if (/[가-힣]/u.test(글) && /\s/u.test(글.trim()) && !SQL.test(글)) {
        결과.push({ 줄: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, 글 });
      }
    }
    ts.forEachChild(n, 걷기);
  };
  걷기(sf);
  return 결과;
}

/**
 * 통째로 안 보는 곳 — 글이 사람에게 안 나가거나, 글자가 값이라 바꾸면 저장된 것과 어긋난다.
 * 화면(`web/`)은 `words.test.ts` 가 문구 표로 본다
 */
const 안보는곳: Record<string, string> = {
  'web/': '화면 문구는 words.test.ts 가 본다',
  'mcp/': 'AI 가 읽는 도구 설명과 답이다 (WORDS.md 「AI 에이전트 글」)',
  'projectNote/': '노트 문서 이름이 저장 열쇠다 — 바꾸면 있던 노트가 「늘 있는 문서가 빠졌다」로 거절된다. 오류 글은 노트 에이전트만 읽는다',
  'prd/gameMap.ts': '작성 에이전트에게 주는 게임 지도 글이다',
  'prd/gameKinds.ts': '게임 요소 종류 이름(`상태 바뀜`)이다 — 게임 지도 글에 실려 작성 에이전트가 읽고 케이스 설계 문서도 그 이름으로 적는다',
  'prd/gameRoute.ts': '작성 에이전트에게 주는 조작 맵 글이다',
  'prd/appRoute.ts': '작성 에이전트에게 주는 앱 조작 맵 글이다',
  'prd/appLearned.ts': '작성 에이전트에게 주는 앱 배운 것 글이다',
  'catalog/check.ts': '케이스 파일 검사(`npm run check:tests`) 글 — 케이스를 쓰는 작성 에이전트와 개발자가 읽는다',
  'catalog/rules.ts': '케이스 파일 검사 규칙의 까닭 글',
  'catalog/cssLocator.ts': '케이스 파일 검사 글',
  'catalog/pageObject.ts': '케이스 파일 검사 글',
  'catalog/procedure.ts': '케이스 파일 검사 글',
  'catalog/loginHelper.ts': '케이스 파일 검사 글',
  'execution/traceSummary.ts': '작성 에이전트에게 주는 실패 trace 요약 글이다 — 스킬 문서(tpx-cases references/6-gates.md)가 그 글을 옮겨 적는다',
  'execution/traceReason.ts': '글 전체를 `run_trace.reason` 에 저장하고 화면(web/ItemTrace.tsx)이 그 글로 견줘 옮긴다 — 바꾸면 옛 행이 원문으로 나온다',
  'scenario/traceFixture/': '시험 재료 케이스 파일',
};

/** 글 하나만 두는 것 — 글 전체로 적고 까닭을 단다 */
const 두는글: Record<string, string> = {
  ' ← 여기서 실패': '이슈 본문 재현 단계에서 실패한 곳을 가리킨다 — 판정 이름표가 아니다 (WORDS.md 「제품 용어와 실패한 때 · 곳」)',
  '**앞서 실패한 케이스** — {}': '도메인/BTS 「테스트 프로시저 — 이슈 등록과 이슈 처리」의 「앞서 실패한 케이스 줄」이 정한 이슈 본문 글자',
  '{} 이 {}실패': '호환성 미점검 까닭 문장 `<tcId> 이 N단계에서 실패` — 판정 이름표가 아니다 (도메인/호환성 §3.13)',
  '선행 케이스 {} 실패': 'Blocked 의 사유 문장 (WORDS.md 「판정과 테스트 프로시저 화면에서 쓰는 말」 — words.test.ts 와 같은 예외)',
  '테스트 케이스': '엑셀 시트 이름이다 — 엑셀로 뽑은 표만 「테스트 케이스」라 부른다 (공통/5-화면공통 §8 · 도메인/카탈로그 §8.1)',
  '결정 진행을 되돌렸다': '트랜잭션을 되돌리려고 안에서 던지는 신호다 — 바깥이 결과로 바꿔 사람에게 안 나간다 (authoring/decisionRun.ts)',
  '머지 요청 — 원본 #{}': 'DB `authoring_request.spec_text` 에 넣는 자리표시 값이다 — 화면에 안 나간다 (공통/4-데이터모델)',
};

/**
 * 말끝 줄(「~합니다」)만 건너뛰는 곳. Issue Bunker 댓글과 그 까닭(`bts_test_fix` — 「자동 수정 기록」 화면에도 같은 글자로 뜬다)은
 * 도메인/BTS 「테스트 수정 바퀴」가 「~했어요」 글자로 정했고 WORDS.md 「풀어 쓴 문장」도 「통과하지 못했어요」를 든다.
 * Scout 는 말을 거는 글이라 해요체다(도메인/챗봇 §8.18). 두 폴더의 API 오류 `detail` 은 지금도 「~합니다」 · 「~다」다
 */
const 해요체인곳 = ['bts/', 'chat/'];

// 「러너」는 서버 글에서 그대로 둔다(WORDS.md §1 「작성 실행 도구」 줄) — 화면이 「테스트 실행기」로 바꿔 보인다(web/runState.ts)
const 안보는무늬 = new Set(['러너']);

function 파일들(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return 파일들(p);
    return /(?<!\.test|\.d|[Ff]ixture)\.ts$/u.test(e.name) ? [p] : [];
  });
}

const 줄들 = 낱말표(readFileSync(정본, 'utf8')).filter((z) => !안보는무늬.has(z.무늬.source));
const 글들 = 파일들(뿌리)
  .map((p) => ({ p, 경로: relative(뿌리, p) }))
  .filter(({ 경로 }) => !Object.keys(안보는곳).some((머리) => 경로.startsWith(머리)))
  .flatMap(({ p, 경로 }) => 서버글(경로, readFileSync(p, 'utf8')).map((g) => ({ ...g, 경로 })));
const 볼글 = 글들.filter((g) => !(g.글 in 두는글));

describe('서버글 — 사람에게 나갈 글만 뽑는다', () => {
  const 뽑기 = (코드: string) => 서버글('x.ts', 코드).map((g) => g.글);

  it('문자열과 템플릿의 글을 줄 번호와 같이 돌려준다', () => {
    expect(서버글('x.ts', "const a = 1;\nthrow new Error(`${a}번 케이스를 찾지 못했다`);")).toEqual([{ 줄: 2, 글: '{}번 케이스를 찾지 못했다' }]);
  });

  it('로그 · 타입 · 열쇠 · 비교 · SQL · 낱말 하나는 뺀다', () => {
    expect(
      뽑기(`
        console.warn('디바이스를 못 잡았다');
        req.log.error('실행이 멈췄다');
        로그('세트를 이어 돌렸다');
        type 상태 = '도는 중' | '멈춘 것';
        const 표 = { '도는 중': 1 };
        if (x === '도는 중' || 글.startsWith('러너에 닿지')) y = 표['도는 중'];
        await q('SELECT 1 AS "도는 중"');
        const 값 = '새로깨짐';
      `),
    ).toEqual([]);
  });

  it('성능 실행 로그처럼 화면에 나가는 호출은 남긴다', () => {
    expect(뽑기("await 표.로그(runId, '실행을 시작했습니다');")).toEqual(['실행을 시작했습니다']);
  });
});

describe('서버 글 낱말 (docs/WORDS.md §1)', () => {
  it('정본 표와 서버 글을 읽는다', () => {
    expect(줄들.length).toBeGreaterThanOrEqual(10);
    expect(글들.length).toBeGreaterThan(500);
  });

  it.each(줄들.map((z) => [z.무늬.source, z] as const))('%s 를 서버 글에 쓰지 않는다', (_무늬, z) => {
    const 건너뜀 = (경로: string) => z.쓰는말 === '~합니다' && 해요체인곳.some((머리) => 경로.startsWith(머리));
    const 어긴것 = 볼글.filter((g) => z.무늬.test(g.글) && !건너뜀(g.경로)).map((g) => `${g.경로}:${String(g.줄)} ${g.글}`);
    // 목록이 길면 vitest 가 `[ …(39) ]` 로 줄여 찍는다 — 어디를 고칠지 보이게 글로 싣는다
    expect(어긴것, `「${z.쓰는말}」으로 바꾼다 — docs/WORDS.md §1\n${어긴것.join('\n')}`).toEqual([]);
  });

  it('두는 글 목록에 코드에서 사라진 글이 없다', () => {
    const 있는글 = new Set(글들.map((g) => g.글));
    expect(Object.keys(두는글).filter((글) => !있는글.has(글))).toEqual([]);
  });
});
