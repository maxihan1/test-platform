// @platform/kit 을 빌드해 공개 저장소 maxihan1/platform-kit 에 태그로 내는 스크립트 (공통/6-인프라 「테스트 코드 저장소」 · REPO-F1-02)
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const 저장소 = 'maxihan1/platform-kit';

interface 패키지 {
  exports: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/** Commander 워크스페이스의 kit 은 .ts 를 그대로 가리킨다. 테스트 저장소가 받는 판은 빌드한 dist 를 가리켜야 한다 */
export function 배포용패키지(kit: 패키지, 루트: 패키지, 버전: string): Record<string, unknown> {
  if (!/^\d+\.\d+\.\d+$/.test(버전)) throw new Error(`버전은 0.1.0 꼴이어야 합니다: ${버전}`);
  const 판 = (이름: string) => {
    const v = 루트.dependencies?.[이름] ?? 루트.devDependencies?.[이름];
    if (v === undefined) throw new Error(`루트 package.json 에 ${이름} 판이 없습니다`);
    return v;
  };
  const dist = (src: string, 끝: string) => src.replace(/^\.\/src\//, './dist/').replace(/\.ts$/, 끝);
  return {
    name: '@platform/kit',
    version: 버전,
    description: 'Test Commander 테스트 킷 — defineCase · test · verify',
    type: 'module',
    exports: Object.fromEntries(
      Object.entries(kit.exports).map(([길, src]) => [길, { types: dist(src, '.d.ts'), default: dist(src, '.js') }]),
    ),
    files: ['dist', 'src'],
    dependencies: { zod: 판('zod') },
    // highlight 가 playwright-core 안쪽을 직접 읽어서 판을 Commander 와 똑같이 묶고, 끌어올려 깔지 않는 설치(pnpm)에서도 찾게 따로 적는다
    peerDependencies: {
      '@playwright/test': 판('@playwright/test'),
      'playwright-core': 판('@playwright/test'),
      webdriverio: 판('webdriverio'),
      'control-cli': 판('control-cli'),
    },
    // 앱 · 게임 케이스가 없는 저장소는 둘을 받지 않아도 돈다 — kit 이 쓸 때만 동적으로 import 한다
    peerDependenciesMeta: { webdriverio: { optional: true }, 'control-cli': { optional: true } },
  };
}

const 설명서 = (버전: string) => `# @platform/kit

Test Commander 의 테스트 킷(\`defineCase\` · \`test\` · \`verify\`)을 빌드한 JS 와 타입이에요. 원본 TS(\`src\`)와 소스맵도 같이 담아요.
테스트 저장소가 Commander 없이 혼자 돌 때 받아요.

\`\`\`json
"@platform/kit": "github:${저장소}#v${버전}"
\`\`\`

이 저장소는 손으로 고치지 않아요. 원본은 Commander 저장소의 \`packages/kit\` 이고 \`npx tsx scripts/kit-release.ts <버전>\` 이 빌드해서 태그로 내요.
`;

function 돌린다(명령: string, 인자: string[], cwd?: string): string {
  return execFileSync(명령, 인자, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
}

/**
 * 원본 TS 를 패키지 안 src 에 옮겨 두고 소스맵과 같이 빌드한다. Playwright 는 한 파일의 케이스가 모두 확장자가 다른 한 파일을
 * 가리키면 그 파일을 케이스 파일로 바꿔 적는다 — 등록 줄이 kit 의 .js 면 파일 하나만 골라 돌릴 때 「No tests found」가 난다.
 * 소스맵이 등록 줄을 패키지 안 src/runtime/test.ts 로 돌려 확장자가 같아진다
 */
function 빌드한다(뿌리: string): string {
  const 빌드 = join(뿌리, 'build/kit');
  rmSync(빌드, { recursive: true, force: true });
  cpSync(join(뿌리, 'packages/kit/src'), join(빌드, 'src'), { recursive: true, filter: (p) => !p.endsWith('.test.ts') });
  돌린다('npx', ['tsc', '-p', 'packages/kit/tsconfig.build.json'], 뿌리);
  const 지도 = JSON.parse(readFileSync(join(빌드, 'dist/runtime/test.js.map'), 'utf8')) as { sources: string[] };
  if (resolve(빌드, 'dist/runtime', 지도.sources[0] ?? '') !== join(빌드, 'src/runtime/test.ts')) {
    throw new Error(`test.js 소스맵이 패키지 안 src/runtime/test.ts 를 가리키지 않습니다: ${지도.sources[0]} — 받은 kit 으로 파일 하나만 골라 돌릴 수 없게 됩니다`);
  }
  return 빌드;
}

function 낸다(버전: string): void {
  const 뿌리 = 돌린다('git', ['rev-parse', '--show-toplevel']);
  // 묶을 판 번호(zod · Playwright …)는 루트 package.json 에서 읽는다
  if (돌린다('git', ['status', '--porcelain', '--', 'packages/kit', 'package.json'], 뿌리) !== '') {
    throw new Error('packages/kit · package.json 에 커밋 안 한 변경이 있습니다 — 낸 판과 커밋이 어긋납니다');
  }
  돌린다('git', ['fetch', '-q', 'origin', 'main'], 뿌리);
  try {
    돌린다('git', ['merge-base', '--is-ancestor', 'HEAD', 'origin/main'], 뿌리);
  } catch {
    throw new Error('지금 커밋이 origin/main 에 없습니다 — kit 을 고친 PR 이 병합된 뒤 main 에서 냅니다');
  }
  const 커밋 = 돌린다('git', ['rev-parse', '--short', 'HEAD'], 뿌리);
  const 읽기 = (p: string) => JSON.parse(readFileSync(join(뿌리, p), 'utf8')) as 패키지;
  const 판 = 배포용패키지(읽기('packages/kit/package.json'), 읽기('package.json'), 버전);

  const 빌드 = 빌드한다(뿌리);
  writeFileSync(join(빌드, 'package.json'), `${JSON.stringify(판, null, 2)}\n`);
  writeFileSync(join(빌드, 'README.md'), 설명서(버전));

  const 사본 = mkdtempSync(join(tmpdir(), 'platform-kit-'));
  try {
    돌린다('gh', ['repo', 'clone', 저장소, 사본, '--', '-q']);
    if (돌린다('git', ['tag', '-l', `v${버전}`], 사본) !== '') throw new Error(`v${버전} 태그가 이미 있습니다`);
    for (const 이름 of readdirSync(사본)) if (이름 !== '.git') rmSync(join(사본, 이름), { recursive: true, force: true });
    cpSync(빌드, 사본, { recursive: true });
    돌린다('git', ['add', '-A'], 사본);
    돌린다('git', ['commit', '-q', '-m', `v${버전} — test-platform ${커밋}`], 사본);
    돌린다('git', ['tag', `v${버전}`], 사본);
    // 첫 판은 빈 저장소라 지역 브랜치 이름이 이 맥 설정을 따른다 — 원격은 늘 main 으로 맞춘다
    돌린다('git', ['push', '-q', 'origin', 'HEAD:main', `v${버전}`], 사본);
  } finally {
    rmSync(사본, { recursive: true, force: true });
  }
  console.log(`냈습니다 — "@platform/kit": "github:${저장소}#v${버전}" (test-platform ${커밋})`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const 버전 = process.argv[2];
  if (버전 === undefined) {
    console.error('쓰는 법: npx tsx scripts/kit-release.ts <버전 — 예: 0.1.0>');
    process.exit(1);
  }
  낸다(버전);
}
