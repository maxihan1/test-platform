// tests 폴더를 훑어 케이스 명세를 뽑는다. 진실의 원천은 코드이고 DB의 test_case는 캐시다 (SPEC §3.1)

import { readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { CaseSpec } from '@platform/kit';

export interface Duplicate {
  tcId: string;
  files: [string, string];
}

export class ScanError extends Error {
  duplicate?: Duplicate;

  constructor(message: string, duplicate?: Duplicate) {
    super(message);
    this.name = 'ScanError';
    this.duplicate = duplicate;
  }
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

export function duplicateOf(specs: CaseSpec[]): Duplicate | null {
  const seen = new Map<string, string>();
  for (const spec of specs) {
    const first = seen.get(spec.tcId);
    if (first !== undefined) return { tcId: spec.tcId, files: [first, spec.filePath] };
    seen.set(spec.tcId, spec.filePath);
  }
  return null;
}

export async function scan(root: string = testsRoot()): Promise<CaseSpec[]> {
  // kit의 test() 래퍼가 이 값을 보고 Playwright에 등록하지 않는다. 명세만 읽고 빠져나오기 위한 것이다 (SPEC §3.1)
  process.env.PLATFORM_SCAN = '1';
  const gen = generation++;

  const specs: CaseSpec[] = [];
  for (const file of await caseFiles(root)) {
    let loaded: unknown;
    try {
      loaded = await importSpec(file, gen);
    } catch (err) {
      throw new ScanError(
        `${relative(root, file)}을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!isCaseSpec(loaded)) {
      throw new ScanError(`${relative(root, file)}에 export const spec이 없다`);
    }
    specs.push(loaded);
  }

  const dup = duplicateOf(specs);
  if (dup) {
    throw new ScanError(
      `tcId ${dup.tcId}이 두 파일에 있다: ${dup.files[0]} · ${dup.files[1]}`,
      dup,
    );
  }

  return specs.sort((a, b) => a.tcId.localeCompare(b.tcId));
}
