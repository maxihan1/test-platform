// SPEC §4 케이스 파일 규칙을 기계로 검사한다. 정규식이 아니라 AST로 보는 이유는 데모 코드의
// https:// URL과 정규식 리터럴이 주석 검사에서 그대로 오탐이 되기 때문이다 (K8은 check.ts가 맡는다)

import ts from 'typescript';

import type { CaseSpec, JsonSchema } from '@platform/kit';
import { PC_PLATFORMS } from '@platform/kit/types';

import { k17, K17_WHY } from './cssLocator.js';
import { K18_WHY } from './loginHelper.js';
import { k7, K7_WHY, k15, K15_WHY, k16, K16_WHY } from './pageObject.js';
import { 프로시저읽기 } from './procedure.js';
import { K8_WHY } from './registration.js';
import { caseSteps, isTestCase, isTestCleanup, isTestStep, isVerify as 판정호출 } from './steps.js';
import { badTechniques } from './techniques.js';
import { badTag } from './tags.js';

export type RuleId = 'K1' | 'K2' | 'K3' | 'K4' | 'K5' | 'K6' | 'K7' | 'K8' | 'K9' | 'K10' | 'K12' | 'K13' | 'K14' | 'K15' | 'K16' | 'K17' | 'K18' | 'K19' | 'K20';

export interface Violation {
  file: string;
  line: number;
  rule: RuleId;
  what: string;
  why: string;
}

export interface SourceResult {
  violations: Violation[];
  // defineCase에 적힌 키가 몇 번째 줄인지. 명세를 import 해서 잡은 위반도 소스 줄을 가리켜야 한다.
  // 프로시저 파일이면 defineProcedure 의 키 줄이다 — 케이스마다의 키 줄은 caseLines 에 tcId 로 든다
  propLines: Map<string, number>;
  caseLines: Map<string, Map<string, number>>;
}

const WHY: Record<RuleId, string> = {
  K1: '스캐너가 명세를 못 찾는다',
  K2: '검색·이력·문서 번호가 깨진다',
  K3: '목록과 문서의 검증 항목 칸이 빈다',
  K4: '깜빡한 것과 정말 없는 것을 구분할 수 없고 입력 폼 라벨을 못 만든다',
  K5: '러너의 --project가 실패한다',
  K6: '절차·판정 칸이 비어 증적이 못 된다',
  K7: K7_WHY,
  K8: K8_WHY,
  K9: '비밀번호가 화면과 증적 문서에 평문으로 박힌다',
  K10: '사람이 값을 채워야만 도는 케이스는 정기 실행이 돌리지 못한다',
  K12: '시나리오가 절차를 제목으로 건너뛰므로 하나를 풀면 둘이 건너뛰어진다',
  K13: '보류 케이스가 값 없이 main 에 들어가면 아무것도 안 지키는 초록이 된다',
  K14: '「설계 기법」으로 못 거르는 케이스가 생기고 엑셀 열이 틀린다. UI 케이스에 붙으면 「기능 테스트에만」이 깨진다',
  K15: K15_WHY,
  K16: K16_WHY,
  K17: K17_WHY,
  K18: K18_WHY,
  // K21 · K22 와 K19 의 개수 · 겹침 · 미션은 defineProcedure 가 던져 K8 로 찍힌다 — 여기는 글자로 봐야 아는 것만 본다
  K19: '스캐너가 글자로 케이스 차례와 구간을 못 읽는다',
  K20: '조건에 따라 도는 케이스는 결과 줄이 생겼다 사라졌다 하고, 마지막 케이스 뒤 코드는 깨져도 어느 케이스 결과에도 안 남는다',
};

// check.ts 통과 줄이 이 목록에서 범위를 만든다. 손으로 적은 숫자는 규칙이 늘 때 조용히 틀린다
export const RULES = Object.keys(WHY) as RuleId[];

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

  const propLines = new Map<string, number>();
  const caseLines = new Map<string, Map<string, number>>();
  // 프로시저 파일이면 케이스 선언이 여럿이고 절차 제목은 프로시저 전체에서 서로 달라야 한다
  const proc = 프로시저읽기(sf);
  const 어디서 = proc === null ? '이 케이스' : '이 프로시저';

  const violations: Violation[] = [...k7(file, sf), ...k15(file, sf), ...k16(file, sf), ...k17(file, sf)];
  if (proc !== null) violations.push(...proc.어긋남.map((x) => v(file, x.line, x.rule, x.what)));

  let declared = 0;
  let literal: ts.ObjectLiteralExpression | undefined;
  let verifies = 0;
  const cleanupTitles = new Set<string>();

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

    if (ts.isCallExpression(node)) {
      const isStep = isTestStep(node);
      const isVerify = 판정호출(node);
      const isCleanup = isTestCleanup(node);

      if (isStep || isVerify || isCleanup) {
        if (isVerify) verifies += 1;
        const label = isStep ? '절차 제목' : isCleanup ? '정리 제목' : '검증 문장';
        const first = node.arguments[0];
        if (first === undefined || !TITLE_KINDS.has(first.kind)) {
          violations.push(v(file, lineOf(node), 'K6', `${label}이 문자열 리터럴이 아니다`));
        } else if ((first as ts.StringLiteral).text.trim() === '') {
          violations.push(v(file, lineOf(node), 'K6', `${label}이 비어 있다`));
        } else if (isCleanup) {
          const 제목 = (first as ts.StringLiteral).text;
          if (cleanupTitles.has(제목)) violations.push(v(file, lineOf(node), 'K12', `정리 제목 「${제목}」이 ${어디서} 안에서 겹친다`));
          cleanupTitles.add(제목);
        }
      }
      if (proc === null && isTestCase(node)) violations.push(v(file, lineOf(node), 'K20', 'test.case 는 프로시저 파일(test(procedure, …))에서만 쓴다'));
    }

    node.forEachChild(walk);
  };
  walk(sf);

  // 프로시저 파일의 K1 · 케이스 구간마다의 K6 은 프로시저읽기가 짚는다
  if (proc === null && declared !== 1) {
    violations.push(v(file, 1, 'K1', `export const spec = defineCase(...) 선언이 ${declared}개다`));
  }
  if (proc === null && verifies === 0) {
    violations.push(v(file, 1, 'K6', 'verify가 하나도 없다'));
  }

  const 키줄 = (인자: ts.ObjectLiteralExpression): Map<string, number> =>
    new Map(인자.properties.flatMap((p) => (keyOf(p) === undefined ? [] : [[keyOf(p)!, lineOf(p)] as const])));
  for (const [key, line] of proc?.인자 === undefined ? [] : 키줄(proc.인자)) propLines.set(key, line);
  for (const 선언 of proc === null ? (literal === undefined ? [] : [literal]) : proc.케이스인자) {
    const 줄들 = 키줄(선언);
    if (proc === null) for (const [key, line] of 줄들) propLines.set(key, line);
    else {
      const 번호 = 선언.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && keyOf(p) === 'tcId')?.initializer;
      if (번호 !== undefined && ts.isStringLiteralLike(번호)) caseLines.set(번호.text, 줄들);
    }
    for (const key of ['precondition', 'params', 'expected']) {
      if (줄들.has(key)) continue;
      violations.push(
        v(file, lineOf(선언), 'K4', `${key} 키가 아예 없다. 없으면 없다고 적어야 한다`),
      );
    }
    const held = badTag(선언, 'held');
    if (held !== undefined) violations.push(v(file, lineOf(held.node), 'K13', held.what));
    for (const bad of badTechniques(선언)) violations.push(v(file, lineOf(bad.node), 'K14', bad.what));
  }

  // 러너가 건너뛸 절차를 제목 글자 그대로 맞춘다 (packages/kit/src/runtime/step.ts).
  // 프로시저는 절차 번호가 케이스 구간을 넘어 이어지고 스캐너가 구간별 단계를 제목으로 가른다
  const seen = new Set<string>();
  for (const step of caseSteps(text).steps) {
    if (seen.has(step.title)) violations.push(v(file, step.line, 'K12', `절차 제목 「${step.title}」이 ${어디서} 안에서 겹친다`));
    seen.add(step.title);
  }

  violations.sort((a, b) => a.line - b.line);
  return { violations, propLines, caseLines };
}

// 접두사는 자유 형식이다. 플랫폼은 뜻을 모르고 모양과 중복만 본다 (SPEC §2, 2026-09-17).
// 소문자를 막는 이유 — Pay-001과 PAY-001이 서로 다른 케이스가 되면 중복 검출이 조용히 샌다
export const TCID = /^[A-Z][A-Z0-9]{0,11}-(?:(?:UI|FN|GS)-)?\d{3}$/;
// 종류 글자가 없는 옛 꼴은 기능 테스트로 본다 (SPEC 도메인/작성 §3.6 「★ 테스트 두 갈래」)
export const tcId종류 = (tcId: string): 'UI' | 'FN' => (/-UI-\d{3}$/.test(tcId) ? 'UI' : 'FN');
export { 게임시나리오인가 } from '@platform/kit/protocol';
// FN 과 옛 꼴은 한 번호열이다(MKT-044 = MKT-FN-044) — 글자로 견주면 같은 번호가 두 번 쓰여 실행 이력이 섞인다. UI · GS 는 따로 센다
export const 번호열쇠 = (tcId: string): string => tcId.replace(/-FN-(\d{3})$/, '-$1');
// 프로시저 번호는 케이스 번호 꼴이 아니다 — 다시 작성하면 달라질 수 있어 DB · 설정은 케이스 번호로 가리킨다 (공통/2 §4 「테스트 프로시저」)
export const PROCID = /^[A-Z][A-Z0-9]{0,11}-TP-\d{3}$/;

/** K2 의 프로시저 줄 — 번호 꼴 · 파일 이름 · 겹침. 겹친파일은 같은 번호를 쓴 다른 프로시저 파일이다 */
export function checkProcedure(file: string, procId: string, propLines: Map<string, number>, 겹친파일: readonly string[]): Violation[] {
  const line = propLines.get('procId') ?? 1;
  const 이름 = file.split(/[\\/]/).at(-1) ?? file;
  const out: Violation[] = [];
  if (!PROCID.test(procId)) out.push(v(file, line, 'K2', `procId가 ${procId}이다. <접두사>-TP-<3자리> 여야 하고 접두사는 대문자로 시작해 대문자·숫자로 이어지는 1~12자다`));
  if (이름 !== `${procId}.spec.ts`) out.push(v(file, line, 'K2', `파일 이름이 ${이름}이다. 프로시저 파일 이름은 <procId>.spec.ts 다 — ${procId}.spec.ts`));
  for (const 남 of 겹친파일) out.push(v(file, line, 'K2', `procId ${procId}이 ${남}와 겹친다`));
  return out;
}

// 윈도우 값 다섯은 PC 게임이 적는다 — 보통 케이스는 windows, 버튼 그림 케이스는 패드 값 (공통/2-명세선언 K5).
// 섞어 적은 선언은 defineCase 가 던져 K8 로 찍힌다
const PLATFORMS = new Set<string>(['desktop', 'mobile', 'android', ...PC_PLATFORMS]);

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

export function checkSpec(
  file: string,
  spec: CaseSpec,
  propLines: Map<string, number>,
  { noHeld = false }: { noHeld?: boolean } = {},
): Violation[] {
  const at = (key: string): number => propLines.get(key) ?? 1;
  const out: Violation[] = [];

  if (!TCID.test(spec.tcId)) {
    out.push(v(file, at('tcId'), 'K2', `tcId가 ${spec.tcId}이다. <접두사>-<3자리> · <접두사>-UI-<3자리> · <접두사>-FN-<3자리> · <접두사>-GS-<3자리> 중 하나여야 하고 접두사는 대문자로 시작해 대문자·숫자로 이어지는 1~12자다`));
  }
  if (spec.name.trim() === '') {
    out.push(v(file, at('name'), 'K3', 'name이 비어 있다'));
  }
  // UI 는 실행한 tcId 로 가린다 — 글자로만 보면 변수 · `as const` tcId 가 빠져나간다. 빈 배열은 실행 결과에 안 남아 키 줄로 본다
  if (tcId종류(spec.tcId) === 'UI' && (spec.techniques !== undefined || propLines.has('techniques'))) {
    out.push(v(file, at('techniques'), 'K14', 'UI 케이스에는 techniques 를 달지 않는다'));
  }
  for (const platform of spec.platforms) {
    if (PLATFORMS.has(platform)) continue;
    out.push(v(file, at('platforms'), 'K5', `platforms에 ${platform}가 있다. desktop·mobile·android·윈도우 값 다섯(${PC_PLATFORMS.join(' · ')})만 된다`));
  }
  out.push(...missingDescribe(file, at('params'), spec.paramSchema, 'params'));
  out.push(...missingDescribe(file, at('expected'), spec.expectedSchema, 'expected'));
  // 비밀값은 입력에만 있다. 기대결과에 비밀번호를 적을 일이 없다 (SPEC §4.1)
  out.push(...missingSecretTag(file, at('params'), spec.paramSchema));
  // 보류 케이스의 기본값 없는 칸은 사람이 채울 자리다. 대신 --no-held 가 main 에 못 들이게 막는다
  if (spec.held === undefined) {
    out.push(...requiredFields(file, at('params'), spec.paramSchema, 'params'));
    out.push(...requiredFields(file, at('expected'), spec.expectedSchema, 'expected'));
  } else if (noHeld) {
    out.push(v(file, at('held'), 'K13', `held가 남아 있다(${spec.held}). 값을 채우거나 케이스를 제거해야 한다`));
  }

  return out;
}
