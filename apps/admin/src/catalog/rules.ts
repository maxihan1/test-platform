// SPEC §4 케이스 파일 규칙을 기계로 검사한다. 정규식이 아니라 AST로 보는 이유는 데모 코드의
// https:// URL과 정규식 리터럴이 주석 검사에서 그대로 오탐이 되기 때문이다 (K8은 check.ts가 맡는다)

import ts from 'typescript';

import type { CaseSpec, JsonSchema } from '@platform/kit';

export type RuleId = 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6' | 'K7' | 'K8' | 'K9' | 'K10';

export interface Violation {
  file: string;
  line: number;
  rule: RuleId;
  what: string;
  why: string;
}

export interface SourceResult {
  violations: Violation[];
  // defineCase에 적힌 키가 몇 번째 줄인지. 명세를 import 해서 잡은 위반도 소스 줄을 가리켜야 한다
  propLines: Map<string, number>;
}

const WHY: Record<RuleId, string> = {
  K1: '스캐너가 명세를 못 찾는다',
  K2: '검색·이력·문서 번호가 깨진다',
  K3: '목록과 문서의 검증 항목 칸이 빈다',
  K4: '깜빡한 것과 정말 없는 것을 구분할 수 없고 입력 폼 라벨을 못 만든다',
  K5: '러너의 --project가 실패한다',
  K6: '절차·판정 칸이 비어 증적이 못 된다',
  K7: '같은 설명이 두 군데 생겨 한쪽이 거짓말을 시작한다',
  K8: '문법 오류나 import 실패로 케이스가 등록되지 않는다',
  K9: '비밀번호가 화면과 증적 문서에 평문으로 박힌다',
  K10: '사람이 값을 채워야만 도는 케이스는 정기 실행이 돌리지 못한다',
};

function v(file: string, line: number, rule: RuleId, what: string, why = WHY[rule]): Violation {
  return { file, line, rule, what, why };
}

export function formatViolation(x: Violation): string {
  return `${x.file}:${x.line} — [${x.rule}] ${x.what} — ${x.why}`;
}

const TITLE_KINDS = new Set([ts.SyntaxKind.StringLiteral, ts.SyntaxKind.NoSubstitutionTemplateLiteral]);

function keyOf(p: ts.ObjectLiteralElementLike): string | undefined {
  if (!ts.isPropertyAssignment(p)) return undefined;
  if (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) return p.name.text;
  return undefined;
}

function isDefineCase(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defineCase';
}

function isExportedSpec(node: ts.Node): node is ts.VariableStatement {
  return (
    ts.isVariableStatement(node) &&
    (node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false)
  );
}

export function checkSource(file: string, text: string): SourceResult {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const lineAt = (pos: number): number => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const lineOf = (node: ts.Node): number => lineAt(node.getStart(sf));

  const violations: Violation[] = [];
  const propLines = new Map<string, number>();

  // 주석은 토큰 앞의 트리비아로만 붙는다. 문자열·정규식 안의 슬래시는 토큰이 아니므로 여기 걸리지 않는다
  const counted = new Set<number>();
  const comments = (node: ts.Node): void => {
    for (const r of ts.getLeadingCommentRanges(text, node.pos) ?? []) {
      if (counted.has(r.pos)) continue;
      counted.add(r.pos);
      violations.push(v(file, lineAt(r.pos), 'K7', '주석이 있다'));
    }
    node.getChildren(sf).forEach(comments);
  };
  comments(sf);

  let declared = 0;
  let literal: ts.ObjectLiteralExpression | undefined;
  let verifies = 0;

  const walk = (node: ts.Node): void => {
    if (isExportedSpec(node)) {
      for (const d of node.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || d.name.text !== 'spec') continue;
        if (d.initializer === undefined || !isDefineCase(d.initializer)) continue;
        declared += 1;
        const arg = d.initializer.arguments[0];
        if (literal === undefined && arg !== undefined && ts.isObjectLiteralExpression(arg)) literal = arg;
      }
    }

    if (ts.isIdentifier(node) && node.text === 'expect') {
      violations.push(
        v(file, lineOf(node), 'K7', 'expect를 직접 쓴다', '검증 문장이 결과에 남지 않아 증적 문서가 빈다'),
      );
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isStep =
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === 'step' &&
        ts.isIdentifier(callee.expression) &&
        callee.expression.text === 'test';
      const isVerify = ts.isIdentifier(callee) && callee.text === 'verify';

      if (isStep || isVerify) {
        if (isVerify) verifies += 1;
        const label = isStep ? '절차 제목' : '검증 문장';
        const first = node.arguments[0];
        if (first === undefined || !TITLE_KINDS.has(first.kind)) {
          violations.push(v(file, lineOf(node), 'K6', `${label}이 문자열 리터럴이 아니다`));
        } else if ((first as ts.StringLiteral).text.trim() === '') {
          violations.push(v(file, lineOf(node), 'K6', `${label}이 비어 있다`));
        }
      }
    }

    node.forEachChild(walk);
  };
  walk(sf);

  if (declared !== 1) {
    violations.push(v(file, 1, 'K1', `export const spec = defineCase(...) 선언이 ${declared}개다`));
  }
  if (verifies === 0) {
    violations.push(v(file, 1, 'K6', 'verify가 하나도 없다'));
  }

  if (literal !== undefined) {
    for (const p of literal.properties) {
      const key = keyOf(p);
      if (key !== undefined) propLines.set(key, lineOf(p));
    }
    for (const key of ['precondition', 'params', 'expected']) {
      if (propLines.has(key)) continue;
      violations.push(
        v(file, lineOf(literal), 'K4', `${key} 키가 아예 없다. 없으면 없다고 적어야 한다`),
      );
    }
  }

  violations.sort((a, b) => a.line - b.line);
  return { violations, propLines };
}

const TCID = /^[A-Z]{2,6}-\d{3}$/;
const PLATFORMS = new Set(['desktop', 'mobile']);

function missingDescribe(file: string, line: number, schema: JsonSchema, key: string): Violation[] {
  const properties = schema.properties;
  if (typeof properties !== 'object' || properties === null) return [];
  return Object.entries(properties as Record<string, unknown>)
    .filter(([, field]) => {
      if (typeof field !== 'object' || field === null) return true;
      return typeof (field as { description?: unknown }).description !== 'string';
    })
    .map(([name]) => v(file, line, 'K4', `${key}.${name}에 describe가 없다`));
}

// 이름만 보고 판단한다. answer·code처럼 이름으로는 알 수 없는 칸은 그냥 지나친다.
// 값의 생김새를 추측하는 규칙을 넣으면 오탐이 늘고 아무도 검사기를 안 믿는다 (SPEC §4.1)
const SECRET_NAMES = ['password', 'passwd', 'pw', 'token', 'secret', 'apikey', 'credential'];

function missingSecretTag(file: string, line: number, schema: JsonSchema): Violation[] {
  const properties = schema.properties;
  if (typeof properties !== 'object' || properties === null) return [];
  return Object.entries(properties as Record<string, unknown>)
    .filter(([name, field]) => {
      const lower = name.toLowerCase();
      if (!SECRET_NAMES.some((word) => lower.includes(word))) return false;
      if (typeof field !== 'object' || field === null) return true;
      return (field as { secret?: unknown }).secret !== true;
    })
    .map(([name]) => v(file, line, 'K9', `params.${name}이 비밀값 이름인데 .meta({ secret: true })가 없다`));
}

// 변환된 스키마의 required가 곧 「값을 반드시 받아야 하는 칸」이다.
// .default()나 .optional()이 붙으면 zod가 여기서 빼 준다
function requiredFields(file: string, line: number, schema: JsonSchema, key: string): Violation[] {
  const required = schema.required;
  if (!Array.isArray(required) || required.length === 0) return [];
  const names = required.join('·');
  return [v(file, line, 'K10', `${key}의 ${names}에 .default()나 .optional()이 없다`)];
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
      v(
        err.location?.file ?? '(수집)',
        err.location?.line ?? 1,
        'K8',
        `테스트를 수집하지 못했다: ${err.message ?? '사유 없음'}`,
      ),
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
      out.push(v(file, 1, 'K8', 'playwright가 이 파일에서 테스트를 하나도 등록하지 않았다'));
    } else if (found.size !== 1) {
      out.push(v(file, 1, 'K8', `등록된 테스트가 ${found.size}개다. 파일 1개 = 케이스 1건이어야 한다`));
    }
  }

  return out;
}

export function checkSpec(file: string, spec: CaseSpec, propLines: Map<string, number>): Violation[] {
  const at = (key: string): number => propLines.get(key) ?? 1;
  const out: Violation[] = [];

  if (!TCID.test(spec.tcId)) {
    out.push(v(file, at('tcId'), 'K2', `tcId가 ${spec.tcId}이다. <대문자 2~6자>-<3자리>여야 한다`));
  }
  if (spec.name.trim() === '') {
    out.push(v(file, at('name'), 'K3', 'name이 비어 있다'));
  }
  for (const platform of spec.platforms) {
    if (PLATFORMS.has(platform)) continue;
    out.push(v(file, at('platforms'), 'K5', `platforms에 ${platform}가 있다. desktop·mobile만 된다`));
  }
  out.push(...missingDescribe(file, at('params'), spec.paramSchema, 'params'));
  out.push(...missingDescribe(file, at('expected'), spec.expectedSchema, 'expected'));
  // 비밀값은 입력에만 있다. 기대결과에 비밀번호를 적을 일이 없다 (SPEC §4.1)
  out.push(...missingSecretTag(file, at('params'), spec.paramSchema));
  out.push(...requiredFields(file, at('params'), spec.paramSchema, 'params'));
  out.push(...requiredFields(file, at('expected'), spec.expectedSchema, 'expected'));

  return out;
}
