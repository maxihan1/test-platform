// npm run check:tests 진입점. 스캐너를 DB 없이 돌려 SPEC §4 케이스 파일 규칙 K1~K10을 검사한다.
// CI(.github/workflows/ci.yml)와 pre-push 훅이 이 이름으로 부르므로 위반이 있으면 exit 1 해야 한다

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { promisify } from 'node:util';

import {
  checkRegistration,
  checkSource,
  checkSpec,
  formatViolation,
  type ListReport,
  type Violation,
} from './rules.js';
import { caseFiles, scan, testsRoot } from './scanner.js';

const run = promisify(execFile);

function k8(file: string, what: string): Violation {
  return { file, line: 1, rule: 'K8', what, why: '문법 오류나 import 실패로 케이스가 등록되지 않는다' };
}

async function registration(files: string[]): Promise<Violation[]> {
  // 스캔이 PLATFORM_SCAN=1을 켜 두면 자식 playwright도 그대로 물려받아 테스트를 하나도 등록하지 않는다.
  // 그러면 멀쩡한 파일이 전부 K8 위반으로 찍힌다. 자식에게는 지우고 넘긴다
  const env = { ...process.env };
  delete env.PLATFORM_SCAN;

  let stdout: string;
  try {
    ({ stdout } = await run('npx', ['playwright', 'test', '--list', '--reporter=json'], {
      env,
      maxBuffer: 32 * 1024 * 1024,
    }));
  } catch (err) {
    // 수집이 깨져도 playwright는 JSON을 stdout에 뱉고 종료 코드만 1이 된다. 그 JSON에 사유가 들어 있다
    const partial = (err as { stdout?: unknown }).stdout;
    if (typeof partial !== 'string' || partial.trim() === '') {
      return [k8('(playwright)', `--list를 돌리지 못했다: ${err instanceof Error ? err.message : String(err)}`)];
    }
    stdout = partial;
  }

  try {
    return checkRegistration(JSON.parse(stdout) as ListReport, files);
  } catch (err) {
    return [k8('(playwright)', `--list 출력을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`)];
  }
}

async function main(): Promise<void> {
  const root = testsRoot();
  const files = await caseFiles(root);
  const rel = (file: string): string => relative(root, file);

  const violations: Violation[] = [];
  const propLines = new Map<string, Map<string, number>>();

  for (const file of files) {
    const result = checkSource(rel(file), await readFile(file, 'utf8'));
    violations.push(...result.violations);
    propLines.set(rel(file), result.propLines);
  }

  const { specs, failures, duplicates } = await scan(root);

  for (const failure of failures) {
    violations.push(k8(failure.file, `명세를 읽지 못했다: ${failure.message}`));
  }
  for (const duplicate of duplicates) {
    const [first, second] = duplicate.files;
    violations.push({
      file: second,
      line: propLines.get(second)?.get('tcId') ?? 1,
      rule: 'K2',
      what: `tcId ${duplicate.tcId}이 ${first}와 겹친다`,
      why: '검색·이력·문서 번호가 깨진다',
    });
  }
  for (const spec of specs) {
    violations.push(...checkSpec(spec.filePath, spec, propLines.get(spec.filePath) ?? new Map()));
  }

  violations.push(...(await registration(files.map(rel))));

  if (violations.length === 0) {
    console.log(`[check:tests] 케이스 ${files.length}건 · SPEC §4 규칙 K1~K10 통과`);
    return;
  }

  violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  for (const violation of violations) console.error(formatViolation(violation));
  console.error(`\n[check:tests] 위반 ${violations.length}건 — SPEC §4 케이스 파일 규칙을 보라.`);
  process.exitCode = 1;
}

await main();
