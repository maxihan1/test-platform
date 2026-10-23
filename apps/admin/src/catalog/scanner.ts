// tests 폴더를 훑어 케이스 명세를 뽑는다. 진실의 원천은 코드이고 DB의 test_case는 캐시다 (SPEC §3.1)

import { execFile } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import type { CaseSpec } from '@platform/kit';

import { 번호열쇠 } from './rules.js';

const run = promisify(execFile);

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

async function importSpec(file: string): Promise<unknown> {
  const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
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

// only 를 주면 그 파일만 import 한다. 그때 겹침은 duplicates 말고 duplicatesWith 로 본다.
// 한 프로세스에서 한 번만 부른다 — ESM 캐시가 옛 내용을 물고 있어 두 번째부터는 고친 파일을 못 본다. 다시 훑는 admin 은 scanApart 로 간다
export async function scan(root: string = testsRoot(), only?: readonly string[]): Promise<ScanResult> {
  // kit의 test() 래퍼가 이 값을 보고 Playwright에 등록하지 않는다. 명세만 읽고 빠져나오기 위한 것이다 (SPEC §3.1)
  process.env.PLATFORM_SCAN = '1';

  const specs: CaseSpec[] = [];
  const failures: ScanFailure[] = [];

  for (const file of only ?? (await caseFiles(root))) {
    const at = relative(root, file);
    try {
      const loaded = await importSpec(file);
      if (isCaseSpec(loaded)) specs.push(loaded);
      else failures.push({ file: at, message: 'export const spec이 없다' });
    } catch (err) {
      failures.push({ file: at, message: err instanceof Error ? err.message : String(err) });
    }
  }

  specs.sort((a, b) => a.tcId.localeCompare(b.tcId));
  return { specs, failures, duplicates: duplicatesOf(specs) };
}

// 하위 프로세스가 결과 앞에 붙이는 표시 — 케이스 파일이 stdout 에 무엇을 찍어도 섞이지 않게
const 결과표시 = '@@CATALOG-SCAN@@';

/**
 * admin 이 root 일 때 하위 프로세스를 띄울 uid · gid. 같은 uid 면 `/proc/<admin>/environ` 으로 비밀값을 그대로 읽는다.
 * 남도 읽을 수 있는 폴더면 쓸 수 있는 것이 가장 적은 nobody 다. umask 가 좁아 남이 못 읽으면 폴더 주인으로 — 주인도 root 면 nobody
 */
export function 스캔자리({ uid, gid, mode }: { uid: number; gid: number; mode: number }): { uid: number; gid: number } {
  return (mode & 0o005) === 0o005 || uid === 0 ? { uid: 65534, gid: 65534 } : { uid, gid };
}

/**
 * 병합된 케이스는 AI 가 쓴 코드라 import 하면 그 파일과 Page Object 의 최상위 문장이 돈다(H2).
 * DB 슈퍼유저 · 세션 키를 쥔 admin 안에서 읽지 않고 빈 환경의 하위 프로세스에서 읽는다 — 작성의 authoring-held.ts 와 같은 방식.
 * 스캔마다 프로세스가 끝나므로 모듈 캐시도 쌓이지 않는다(M1)
 */
export async function scanApart(root: string): Promise<ScanResult> {
  // 폴더가 없으면 여기서 ENOENT 를 던진다 — 부르는 쪽이 새 서비스와 읽기 실패를 그 코드로 가른다
  if ((await caseFiles(root)).length === 0) return { specs: [], failures: [], duplicates: [] };
  let stdout: string;
  try {
    ({ stdout } = await run(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), root], {
      // kit 의 defineCase 가 filePath 를 이 뿌리 기준으로 만든다. HOME 은 바꾼 uid 가 계정 목록에 없어도 os.homedir() 가 안 던지게.
      // 그 밖의 환경변수는 넘기지 않는다
      env: { PLATFORM_TESTS_DIR: testsRoot(), HOME: tmpdir(), TMPDIR: tmpdir() },
      ...(process.getuid?.() === 0 ? 스캔자리(await stat(root)) : {}),
      // 최상위에서 멈춘 케이스 하나가 기동 스캔과 그 뒤 「다시 스캔」을 전부 붙잡지 않게
      timeout: 600_000,
      killSignal: 'SIGKILL',
      maxBuffer: 256 * 1024 * 1024,
    }));
  } catch (err) {
    const e = err as { killed?: boolean; signal?: unknown; code?: unknown; stderr?: unknown };
    const 끝 = typeof e.stderr === 'string' ? e.stderr.trim().slice(-500) : '';
    const 까닭 =
      e.killed === true ? '10분 안에 못 끝내 끊었다' : typeof e.signal === 'string' ? `${e.signal} 로 꺼졌다` : `종료 ${String(e.code)}`;
    throw new Error(`케이스를 따로 읽는 프로세스가 실패했다 (${까닭})${끝 === '' ? '' : `: ${끝}`}`, { cause: err });
  }
  const 자리 = stdout.lastIndexOf(결과표시);
  if (자리 < 0) throw new Error('케이스를 따로 읽는 프로세스가 결과를 내지 않았다');
  try {
    return JSON.parse(stdout.slice(자리 + 결과표시.length)) as ScanResult;
  } catch (err) {
    // 케이스 코드가 표시 뒤에 글을 더 찍으면 여기로 온다
    throw new Error('케이스를 따로 읽는 프로세스의 결과 모양이 틀렸다', { cause: err });
  }
}

// scanApart 가 띄운 하위 프로세스가 여기로 들어온다 — `node --import tsx scanner.ts <폴더>`
if (process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const 결과 = await scan(process.argv[2]);
  // 케이스 파일이 남긴 타이머가 프로세스를 붙잡지 않게 다 쓴 뒤 바로 끝낸다
  process.stdout.write(결과표시 + JSON.stringify(결과), () => process.exit(0));
}
