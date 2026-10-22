// tests 폴더를 훑어 케이스 명세를 뽑는다. 진실의 원천은 코드이고 DB의 test_case는 캐시다 (SPEC §3.1)

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { CaseSpec } from '@platform/kit';

import { 번호열쇠 } from './rules.js';

export interface Duplicate {
  tcId: string;
  files: [string, string];
}

export interface ScanFailure {
  file: string;
  message: string;
}

export interface ScanResult {
  specs: CaseSpec[];
  // 파일 하나가 깨져도 스캔 전체를 버리지 않는다. 그러면 멀쩡한 케이스의 위반까지 함께 묻힌다
  failures: ScanFailure[];
  duplicates: Duplicate[];
}

// kit의 defineCase가 filePath를 만들 때 쓰는 기준과 같아야 한다. 어긋나면 같은 케이스의 상대 경로가 둘로 갈린다
export function testsRoot(): string {
  return process.env.PLATFORM_TESTS_DIR ?? resolve(process.cwd(), 'tests');
}

export async function caseFiles(root: string = testsRoot()): Promise<string[]> {
  const entries = await readdir(root, { recursive: true });
  return entries
    .filter((p) => p.endsWith('.spec.ts'))
    .map((p) => join(root, p))
    .sort();
}

function isCaseSpec(value: unknown): value is CaseSpec {
  return typeof value === 'object' && value !== null && typeof (value as { tcId?: unknown }).tcId === 'string';
}

// 같은 프로세스에서 두 번째 스캔부터는 ESM 캐시가 옛 내용을 물고 있다. 그러면 '다시 스캔하기'가 거짓말을 한다
let generation = 0;

async function importSpec(file: string, gen: number): Promise<unknown> {
  const url = pathToFileURL(file).href;
  const mod = (await import(gen === 0 ? url : `${url}?scan=${gen}`)) as Record<string, unknown>;
  return mod.spec;
}

// 한 쌍만 돌려주면 고치고 다시 돌렸을 때 다음 쌍이 또 나온다. 겹친 것을 한 번에 다 보여준다
export function duplicatesOf(specs: readonly Pick<CaseSpec, 'tcId' | 'filePath'>[]): Duplicate[] {
  const seen = new Map<string, string>();
  const found: Duplicate[] = [];
  for (const spec of specs) {
    const 열쇠 = 번호열쇠(spec.tcId);
    const first = seen.get(열쇠);
    if (first === undefined) seen.set(열쇠, spec.filePath);
    else found.push({ tcId: spec.tcId, files: [first, spec.filePath] });
  }
  return found;
}

// 나머지 케이스는 import 하지 않고 tcId 글자만 읽는다 — 1,112건을 다 import 하면 형식 검사 한 번이 중간값 106초였다 (PRD-F14-04).
// ponytail: tcId 를 글자로 적은 파일만 견준다. 변수 · 상수 tcId 는 여기서 빠지고 저장소 전체 검사(자식이 합친 뒤)가 잡는다
const TCID_LITERAL = /\btcId:\s*(['"`])([^'"`]+)\1/;

// 맡은 케이스만 볼 때의 K2 — 맡은 것끼리, 맡은 것과 나머지의 겹침만 돌려준다. 나머지끼리 겹친 것은 이번 일이 아니다
export async function duplicatesWith(specs: readonly CaseSpec[], root: string = testsRoot()): Promise<Duplicate[]> {
  if (specs.length === 0) return [];
  const mine = new Set(specs.map((s) => s.filePath));
  const others = await Promise.all(
    (await caseFiles(root))
      .map((file) => ({ file, filePath: relative(root, file) }))
      .filter(({ filePath }) => !mine.has(filePath))
      .map(async ({ file, filePath }) => ({ tcId: TCID_LITERAL.exec(await readFile(file, 'utf8'))?.[2], filePath })),
  );
  const read = others.flatMap(({ tcId, filePath }) => (tcId === undefined ? [] : [{ tcId, filePath }]));
  return duplicatesOf([...read, ...specs]).filter((d) => mine.has(d.files[1]));
}

// only 를 주면 그 파일만 import 한다. 그때 겹침은 duplicates 말고 duplicatesWith 로 본다
export async function scan(root: string = testsRoot(), only?: readonly string[]): Promise<ScanResult> {
  // kit의 test() 래퍼가 이 값을 보고 Playwright에 등록하지 않는다. 명세만 읽고 빠져나오기 위한 것이다 (SPEC §3.1)
  process.env.PLATFORM_SCAN = '1';
  const gen = generation++;

  const specs: CaseSpec[] = [];
  const failures: ScanFailure[] = [];

  for (const file of only ?? (await caseFiles(root))) {
    const at = relative(root, file);
    try {
      const loaded = await importSpec(file, gen);
      if (isCaseSpec(loaded)) specs.push(loaded);
      else failures.push({ file: at, message: 'export const spec이 없다' });
    } catch (err) {
      failures.push({ file: at, message: err instanceof Error ? err.message : String(err) });
    }
  }

  specs.sort((a, b) => a.tcId.localeCompare(b.tcId));
  return { specs, failures, duplicates: duplicatesOf(specs) };
}
