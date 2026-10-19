// 빠른 검사 명령 — 빠진 요구 · 타입 · 케이스 형식 · 케이스와 요구 목록 맞춰 보기 · 확인 하나에 값 하나 · 비밀번호 노출 점검을 한 번에 돌리고 틀린 것만 찍는다 (SPEC 도메인/작성 §3.6 「빠른 검사 명령」)
// 자식이 검사 명령을 하나씩 부르고 긴 로그를 읽고, 맞춰 보기는 417건을 눈으로 하던 일이다. 비밀번호 점검은 문서의 프로그램을 매번 베껴 만들었다
// 실행: npm run authoring:check -- 마지막 <원장 사본> <접두사> <폴더> [더 볼 경로…] | 보조 <케이스 파일…> | 비밀번호 <경로…>

import { spawn } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

import { 환경비밀번호들 } from './authoring-accounts.js';
import { 명세글, 속성, 읽기 } from './authoring-held-apply.js';
import { 글모두 } from './authoring-reverse.js';
import { 바뀐것 } from './authoring-run3.js';
import { 묶었나 } from './authoring-one-value.js';
import { 백틱벗기기, 표읽기 } from './authoring-md-table.js';

export interface 케이스문장 {
  tcId: string;
  name: string | null;
  전제: string[];
  절차: string[];
  판정: string[];
  /** 실제 값을 배열 · 객체로 묶어 견주는 verify 의 문장 */
  묶은판정: string[];
}

const 글자 = (n: ts.Node | undefined): string | null => (n !== undefined && ts.isStringLiteralLike(n) ? n.text : null);

/** 케이스 파일에서 맞춰 볼 문장 — `defineCase` 의 tcId · name · precondition, `test.step` 제목, `verify` 첫 인자. 글자가 아닌 것(템플릿 · 상수)은 못 읽어 빠진다 */
export function 케이스문장읽기(글: string): 케이스문장 | null {
  const sf = 읽기(글);
  const 명세 = 명세글(sf);
  const tcId = 명세 === undefined ? null : 글자(속성(명세, 'tcId')?.initializer);
  if (명세 === undefined || tcId === null) return null;
  const 전제식 = 속성(명세, 'precondition')?.initializer;
  const 절차: string[] = [];
  const 판정: string[] = [];
  const 묶은판정: string[] = [];
  const 훑기 = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      const 부름 = n.expression;
      const 첫 = 글자(n.arguments[0]);
      if (첫 !== null && ts.isPropertyAccessExpression(부름) && 부름.name.text === 'step' && 부름.expression.getText(sf) === 'test') 절차.push(첫);
      if (첫 !== null && ts.isIdentifier(부름) && 부름.text === 'verify') {
        판정.push(첫);
        if (n.arguments[1] !== undefined && 묶었나(n.arguments[1])) 묶은판정.push(첫);
      }
    }
    ts.forEachChild(n, 훑기);
  };
  훑기(sf);
  return {
    tcId,
    name: 글자(속성(명세, 'name')?.initializer),
    전제: 전제식 !== undefined && ts.isArrayLiteralExpression(전제식) ? 전제식.elements.flatMap((e) => 글자(e) ?? []) : [],
    절차,
    판정,
    묶은판정,
  };
}

/** 확인 하나에 값 하나(`tpx-cases` `references/5-writing.md` 「확인 하나에 값 하나」) — `볼` 이 있으면 그 tcId 만 본다 */
export function 묶은확인들(케이스들: readonly 케이스문장[], 볼?: ReadonlySet<string>): string[] {
  const 볼것 = 케이스들.filter((c) => 볼 === undefined || 볼.has(c.tcId));
  return 볼것.flatMap((c) => c.묶은판정.map((문장) => `${c.tcId} 「${문장}」 — 값을 배열 · 객체로 묶어 견준다. 값마다 verify 를 따로 쓴다`));
}

const 칸 = (행: Record<string, string>, 이름: string) => (행[이름] ?? '').replace(/\\\|/g, '|').trim();

/**
 * 케이스와 요구 목록 맞춰 보기(관문 2) — 목록 기준 한 방향 글자 대조 (`tpx-cases` `references/6-gates.md` 「관문 2」).
 * 줄마다 전제 ∈ precondition · 조작 ∈ test.step 제목 · 결과 ∈ verify 문장, tcId 를 혼자 쓰는 줄은 name = 결과. 합친 케이스(R15)의 name 은 안 본다.
 * 결과 문장과 합친 이름은 서로 겹치면 안 된다. 케이스 파일이 없는 tcId 는 빠진 요구 검사 몫이라 건너뛴다. `볼` 이 있으면 그 tcId 만 본다(서브에이전트)
 */
export function 맞춰보기(표글: string, 케이스들: readonly 케이스문장[], 볼?: ReadonlySet<string>): string[] {
  const 케이스 = new Map(케이스들.map((c) => [c.tcId, c]));
  const 줄들 = 표읽기(표글, '요구사항').map((행) => ({ 번호: 칸(행, '요구'), 전제: 칸(행, '전제'), 조작: 칸(행, '조작'), 결과: 칸(행, '결과'), tcId: 백틱벗기기(칸(행, 'tcId')) }));
  const 몇줄 = new Map<string, number>();
  for (const 줄 of 줄들) 몇줄.set(줄.tcId, (몇줄.get(줄.tcId) ?? 0) + 1);
  const 틀림: string[] = [];
  for (const 줄 of 줄들) {
    const c = 케이스.get(줄.tcId);
    if (c === undefined || (볼 !== undefined && !볼.has(줄.tcId))) continue;
    const 머리 = `${줄.tcId} (목록 ${줄.번호}번째 줄)`;
    if (줄.전제 !== '' && !c.전제.includes(줄.전제)) 틀림.push(`${머리} 전제 「${줄.전제}」 — precondition 에 없다`);
    if (줄.조작 !== '' && !c.절차.includes(줄.조작)) 틀림.push(`${머리} 조작 「${줄.조작}」 — test.step 제목에 없다`);
    if (줄.결과 !== '' && !c.판정.includes(줄.결과)) 틀림.push(`${머리} 결과 「${줄.결과}」 — verify 문장에 없다`);
    if (몇줄.get(줄.tcId) === 1 && 줄.결과 !== '' && c.name !== 줄.결과) 틀림.push(`${머리} name 「${c.name ?? '(글자 아님)'}」 — 결과와 다르다`);
  }
  // 결과 문장 · 합친 이름이 겹치면 실행 목록과 증적에 같은 줄이 둘씩 뜬다 — 합친 케이스 안의 두 줄끼리도
  const 안겹침 = new Map<string, number>();
  for (const 줄 of 줄들) if (줄.결과 !== '' && 케이스.has(줄.tcId)) 안겹침.set(`${줄.tcId}\0${줄.결과}`, (안겹침.get(`${줄.tcId}\0${줄.결과}`) ?? 0) + 1);
  for (const [열쇠, 수] of 안겹침) {
    const [tcId, 문장] = 열쇠.split('\0') as [string, string];
    if (수 >= 2 && (볼 === undefined || 볼.has(tcId))) 틀림.push(`같은 케이스 안에서 결과 문장이 겹친다 「${문장}」 — ${tcId} ${수}줄`);
  }
  const 문장주인 = new Map<string, Set<string>>();
  const 더하기 = (문장: string, tcId: string) => 문장주인.set(문장, new Set([...(문장주인.get(문장) ?? []), tcId]));
  for (const 줄 of 줄들) if (줄.결과 !== '' && 케이스.has(줄.tcId)) 더하기(줄.결과, 줄.tcId);
  for (const [tcId, 수] of 몇줄) {
    const 이름 = 케이스.get(tcId)?.name;
    if (수 >= 2 && 이름) 더하기(이름, tcId);
  }
  const 보나 = (tcIds: Iterable<string>) => 볼 === undefined || [...tcIds].some((t) => 볼.has(t));
  for (const [문장, 주인] of 문장주인) {
    if (주인.size >= 2 && 보나(주인)) 틀림.push(`결과 문장이 겹친다 「${문장}」 — ${[...주인].sort().join(' · ')}`);
  }
  // 한 문장이 어디선 결과이고 어디선 준비 확인 판정이면 증적에서 「결과 FAIL」과 「전제 실행 중단」으로 갈린다 — 결과 쪽을 고친다
  const 결과들 = new Map<string, Set<string>>();
  for (const 줄 of 줄들) if (줄.결과 !== '') 결과들.set(줄.tcId, new Set([...(결과들.get(줄.tcId) ?? []), 줄.결과]));
  for (const [문장, 주인] of 문장주인) {
    const 준비쪽 = 케이스들.filter((c) => !주인.has(c.tcId) && c.판정.includes(문장) && !(결과들.get(c.tcId)?.has(문장) ?? false)).map((c) => c.tcId);
    if (준비쪽.length > 0 && 보나([...주인, ...준비쪽])) 틀림.push(`결과 문장이 다른 케이스의 준비 판정이다 「${문장}」 — 결과 ${[...주인].sort().join(' · ')} · 준비 ${준비쪽.sort().join(' · ')} — 결과 쪽을 고친다`);
  }
  return 틀림;
}

/** 비밀번호가 적힌 자리(파일:줄) — 원문과 JSON 이스케이프 꼴을 줄마다, .json 은 푼 값에서도 본다. 값은 돌려주지 않는다 */
export function 비밀자리들(파일들: readonly { 경로: string; 글: string }[], 비밀들: readonly string[]): string[] {
  const 꼴들 = 비밀들.filter((b) => b !== '').flatMap((b) => [b, JSON.stringify(b).slice(1, -1)]);
  if (꼴들.length === 0) return [];
  return 파일들.flatMap((f) => {
    const 자리 = f.글.split('\n').flatMap((줄, i) => (꼴들.some((꼴) => 줄.includes(꼴)) ? [`${f.경로}:${i + 1}`] : []));
    if (f.경로.endsWith('.json')) {
      try {
        // 푼 값은 에이전트 올리기 검사와 같은 코드로 모은다 — 둘이 갈리면 자식은 깨끗한데 올리기에서 걸린다
        if (글모두(JSON.parse(f.글)).some((v) => 비밀들.some((b) => b !== '' && v.includes(b)))) 자리.push(`${f.경로} (푼 값)`);
      } catch {
        // 못 푸는 JSON 은 줄 검사만 — 에이전트 올리기 검사가 모양을 따로 본다
      }
    }
    return 자리;
  });
}

/** 경로들 아래 일반 파일 — 링크 · FIFO 는 따라가지 않는다. 없는 경로는 따로 돌려준다(경로를 틀려 「깨끗」이 나오는 거짓 초록을 막는다) */
function 파일모으기(경로들: readonly string[]): { 파일들: { 경로: string; 글: string }[]; 없음: string[] } {
  const 파일들: { 경로: string; 글: string }[] = [];
  const 없음: string[] = [];
  const 훑기 = (p: string) => {
    const 것 = lstatSync(p, { throwIfNoEntry: false });
    if (것 === undefined) return void 없음.push(p);
    if (것.isDirectory()) return readdirSync(p).forEach((이름) => 훑기(join(p, 이름)));
    if (것.isFile()) 파일들.push({ 경로: p, 글: readFileSync(p, 'utf8') });
  };
  경로들.forEach(훑기);
  return { 파일들, 없음 };
}

const 줄상한 = 20;
const 줄이기 = (줄들: string[]) => (줄들.length <= 줄상한 ? 줄들 : [...줄들.slice(0, 줄상한), `…외 ${줄들.length - 줄상한}줄`]);

/** 트리에서 돌리고 출력을 로그로 남긴다. 셋을 나란히 띄우려고 비동기다 */
function 돌린다(트리: string, 명령: string, 인자: string[], 로그: string): Promise<{ ok: boolean; 줄들: string[] }> {
  return new Promise((풀림) => {
    const 자식 = spawn(명령, 인자, { cwd: 트리, timeout: 5 * 60_000 });
    let 글 = '';
    자식.stdout.on('data', (b: Buffer) => (글 += b.toString('utf8')));
    자식.stderr.on('data', (b: Buffer) => (글 += b.toString('utf8')));
    const 끝 = (ok: boolean, 덧: string) => {
      writeFileSync(로그, 글 + 덧);
      풀림({ ok, 줄들: (글 + 덧).split('\n').filter((l) => l.trim() !== '') });
    };
    자식.on('error', (e) => 끝(false, `\n${e.message}`));
    자식.on('close', (코드, 신호) => 끝(코드 === 0, 코드 === 0 ? '' : `\n끝난 까닭: ${신호 ?? `종료 코드 ${String(코드)}`}`));
  });
}

/** 걸러 낸 줄이 없는데 실패면(시간 초과 · 메모리 부족 · 명령 없음) 끝 몇 줄을 보인다 — 「어긋남 0줄」만 남으면 왜 빨간지 모른다 */
const 줄또는끝 = (r: { ok: boolean; 줄들: string[] }, 거른: string[]) => (r.ok ? [] : 거른.length > 0 ? 거른 : r.줄들.slice(-5));

type 결과 = { 이름: string; ok: boolean; 줄들: string[]; 머리?: string; 건너뜀?: boolean };

/** 맡은 파일만 타입 검사하는 임시 tsconfig — 저장소 전체는 한 번에 1.2GB 라 서브에이전트 넷이 겹치면 Docker 상자(4.8GB)를 다 쓴다. 100건이면 약 320MB(2026-10-19 실측).
 * 맡은 파일이 가져다 쓰는 것만 따라간다 — 남의 케이스는 안 본다. Page Object 는 주인이 하나고 더하기만 해서(`fanout.md` §3) 남의 케이스가 깨질 일이 없고, 저장소 전체는 자식이 합친 뒤 한 번 본다 */
function 맡은tsconfig(트리: string, 자리: string, 파일들: readonly string[]): string {
  mkdirSync(자리, { recursive: true });
  const 길 = join(자리, `tsconfig-${process.pid}.json`);
  writeFileSync(길, JSON.stringify({ extends: join(트리, 'tsconfig.json'), include: 파일들.map((f) => resolve(트리, f)) }));
  return 길;
}

export async function 실행(인자: string[], 트리 = process.cwd(), env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const [모드, ...나머지] = 인자;
  const 자리 = env.AUTHORING_GATE3_DIR || tmpdir();
  const 로그 = (이름: string) => join(자리, `check-${이름}.log`);
  const 결과들: 결과[] = [];
  const 비밀검사 = (경로들: string[]): 결과 => {
    let 비밀들: string[];
    try {
      비밀들 = 환경비밀번호들(env);
    } catch (e) {
      return { 이름: '비밀번호 노출 점검', ok: false, 줄들: [`계정 목록을 못 읽었다 — ${e instanceof Error ? e.message : String(e)}`] };
    }
    const { 파일들, 없음 } = 파일모으기(경로들.map((p) => resolve(트리, p)));
    const 찾은 = 비밀자리들(파일들, 비밀들).map((l) => relative(트리, l));
    return { 이름: '비밀번호 노출 점검', ok: 없음.length === 0 && 찾은.length === 0, 줄들: [...없음.map((p) => `없는 경로 ${relative(트리, p)} — 경로를 바로잡는다`), ...찾은], 머리: 비밀들.length === 0 ? '계정 없음' : undefined };
  };

  if (모드 === '비밀번호' && 나머지.length > 0) 결과들.push(비밀검사(나머지));
  else if (모드 === '보조' && 나머지.length > 0) {
    const 맡은 = 나머지.map((f) => relative(트리, resolve(트리, f)));
    // 틀린 경로는 tsc 가 말없이 건너뛴다 — 먼저 막는다
    const 없음 = 맡은.filter((f) => !existsSync(resolve(트리, f)));
    if (없음.length > 0) {
      console.error(`없는 파일: ${없음.join(' · ')}`);
      return 2;
    }
    const 케이스파일 = 맡은.filter((f) => f.endsWith('.spec.ts'));
    const [tsc, 형식] = await Promise.all([
      돌린다(트리, 'npx', ['tsc', '--noEmit', '-p', 맡은tsconfig(트리, 자리, 맡은)], 로그('tsc')),
      // 화면 파일만 맡은 서브에이전트(적응형 모바일)는 케이스 형식 검사를 안 돈다 — 그때 남이 쓰는 중인 케이스 파일을 읽는다
      케이스파일.length > 0 ? 돌린다(트리, 'npm', ['run', '-s', 'check:tests'], 로그('tests')) : Promise.resolve(null),
    ]);
    결과들.push({ 이름: '타입 검사(맡은 파일)', ok: tsc.ok, 줄들: 줄또는끝(tsc, tsc.줄들.filter((l) => /error TS/.test(l))) });
    if (형식 !== null) {
      // 저장소 전체를 보는 검사라 다른 서브에이전트가 쓰는 중인 파일에서도 빨개진다 — 맡은 파일 줄만 센다. 위반 셈 줄이 없으면(돌다 죽음) 끝 줄을 보인다
      const 내것 = 형식.줄들.filter((l) => 맡은.some((f) => l.startsWith(`${f}:`) || l.startsWith(`${f.replace(/^tests\//, '')}:`)));
      const 돌았다 = 형식.ok || 형식.줄들.some((l) => /\[check:tests\] 위반 \d+건/.test(l));
      결과들.push({ 이름: '케이스 형식 검사(맡은 파일)', ok: 돌았다 && 내것.length === 0, 줄들: 돌았다 ? 내것 : 형식.줄들.slice(-5) });
    }
    if (케이스파일.length > 0) {
      const 문장들 = 케이스파일.flatMap((f) => 케이스문장읽기(readFileSync(resolve(트리, f), 'utf8')) ?? []);
      // 목록은 tcId 접두사로, 폴더는 맡은 파일 경로(tests/<폴더>/…)로 — 새 서비스 폴더 이름은 접두사와 다를 수 있다
      const 접두사 = 문장들[0]?.tcId.split('-')[0];
      const 폴더 = 케이스파일[0]?.split('/')[1] ?? '';
      const 표 = 접두사 === undefined ? null : join('docs', 'cases', `${접두사}.md`);
      const 어긋남 =
        표 === null ? ['케이스 파일에서 tcId 를 못 읽었다 — defineCase 의 tcId 를 글자로 적는다'] : !existsSync(join(트리, 표)) ? [`목록 ${표} 이 없다`] : 맞춰보기(readFileSync(join(트리, 표), 'utf8'), 케이스문장들(트리, 폴더, 문장들), new Set(문장들.map((c) => c.tcId)));
      결과들.push({ 이름: '케이스와 요구 목록 맞춰 보기', ok: 어긋남.length === 0, 줄들: 어긋남 });
      const 묶음 = 묶은확인들(문장들);
      결과들.push({ 이름: '확인 하나에 값 하나', ok: 묶음.length === 0, 줄들: 묶음 });
    }
  } else if (모드 === '마지막' && 나머지.length >= 3) {
    const [원장, 접두사, 폴더, ...더] = 나머지 as [string, string, string, ...string[]];
    const 표 = join('docs', 'cases', `${접두사}.md`);
    // 서로 기대지 않아 나란히 돈다 — 자식 혼자 도는 자리라 타입 검사 1.2GB · 형식 검사 0.4GB 가 겹쳐도 된다
    // 원장이 없는 작성은 관문 0 을 건너뛴다 — 통과가 아니라 「건너뜀」으로 적는다(6-gates.md 관문 0)
    const 원장없음 = { ok: true, 줄들: ['원장 없음 — 대조를 건너뛴다'] };
    const [원장검사, tsc, 형식] = await Promise.all([
      원장 === '없음' ? Promise.resolve(원장없음) : 돌린다(트리, 'npm', ['run', '-s', 'check:ledger', '--', 원장, 표, '--tests', `tests/${폴더}`, '--agent'], 로그('ledger')),
      돌린다(트리, 'npx', ['tsc', '--noEmit'], 로그('tsc')),
      돌린다(트리, 'npm', ['run', '-s', 'check:tests'], 로그('tests')),
    ]);
    const 원장머리 = 원장검사.줄들.find((l) => l.startsWith('원장:') || l.startsWith('원장 없음'));
    결과들.push({ 이름: '빠진 요구 검사', ok: 원장검사.ok, 줄들: 줄또는끝(원장검사, 원장검사.줄들.filter((l) => l !== 원장머리)), 머리: 원장머리, 건너뜀: 원장머리?.startsWith('원장 없음') });
    결과들.push({ 이름: '타입 검사', ok: tsc.ok, 줄들: 줄또는끝(tsc, tsc.줄들.filter((l) => /error TS/.test(l))) });
    결과들.push({ 이름: '케이스 형식 검사', ok: 형식.ok, 줄들: 줄또는끝(형식, 형식.줄들.filter((l) => / — \[K\d+\] /.test(l))) });
    // 에이전트가 기준 SHA 를 주면 이번 작성이 바꾼 케이스만 본다 — 앞 작성의 케이스가 이 규칙에 걸려도 이번 요청 밖이라 고치지 않는다(첫 작성은 다 새것이라 전체다)
    const 문장들 = 케이스문장들(트리, 폴더);
    const 바뀐 = env.AUTHORING_BASE_SHA ? 바뀐것(트리, env.AUTHORING_BASE_SHA) : null;
    const 볼 = 바뀐 === null || '까닭' in 바뀐 ? undefined : new Set(바뀐.filter((f) => f.startsWith(`tests/${폴더}/`) && f.endsWith('.spec.ts')).flatMap((f) => (existsSync(join(트리, f)) ? (케이스문장읽기(readFileSync(join(트리, f), 'utf8'))?.tcId ?? []) : [])));
    const 어긋남 = existsSync(join(트리, 표)) ? 맞춰보기(readFileSync(join(트리, 표), 'utf8'), 문장들, 볼) : [`목록 ${표} 이 없다`];
    결과들.push({ 이름: '케이스와 요구 목록 맞춰 보기', ok: 어긋남.length === 0, 줄들: 어긋남, 머리: 볼 === undefined ? undefined : `이번에 바뀐 케이스 ${볼.size}건만 봤다` });
    const 묶음 = 묶은확인들(문장들, 볼);
    결과들.push({ 이름: '확인 하나에 값 하나', ok: 묶음.length === 0, 줄들: 묶음 });
    const 가이드 = join('docs', 'cases', `${접두사}.guide.md`);
    결과들.push(비밀검사([`tests/${폴더}`, 표, ...(existsSync(join(트리, 가이드)) ? [가이드] : []), ...더]));
  } else {
    console.error('쓰는 법: npm run authoring:check -- 마지막 <원장 사본 | 없음> <접두사> <폴더> [더 볼 경로…] | 보조 <케이스 · 화면 파일…> | 비밀번호 <경로…>');
    return 2;
  }

  console.log(`[빠른 검사] ${결과들.map((r) => `${r.이름} ${r.건너뜀 ? '건너뜀' : r.ok ? '통과' : `어긋남 ${r.줄들.length}줄`}`).join(' · ')}`);
  for (const r of 결과들) if (r.머리) console.log(`${r.이름}: ${r.머리}`);
  for (const r of 결과들.filter((x) => !x.ok)) console.log([`${r.이름}:`, ...줄이기(r.줄들).map((l) => `  ${l}`)].join('\n'));
  console.log(`긴 로그는 ${자리}/check-*.log`);
  return 결과들.every((r) => r.ok) ? 0 : 1;
}

/** 폴더의 케이스 문장 전부 — 결과 문장 겹침은 맡은 파일 밖과도 견준다 */
function 케이스문장들(트리: string, 폴더: string, 더할?: readonly 케이스문장[]): 케이스문장[] {
  const 자리 = join(트리, 'tests', 폴더);
  const 읽은 = existsSync(자리)
    ? readdirSync(자리)
        .filter((n) => n.endsWith('.spec.ts'))
        .flatMap((n) => 케이스문장읽기(readFileSync(join(자리, n), 'utf8')) ?? [])
    : [];
  const 표 = new Map(읽은.map((c) => [c.tcId, c]));
  for (const c of 더할 ?? []) 표.set(c.tcId, c);
  return [...표.values()];
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await 실행(process.argv.slice(2)).catch((e: unknown) => {
    console.error(`[빠른 검사] 실패 — ${e instanceof Error ? e.message : String(e)}`);
    return 2;
  });
}
