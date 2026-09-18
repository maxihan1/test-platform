// 파일 경로가 어느 표면에 속하고 그 표면이 몇 등급인지 정하는 정본 표.
// 글로브를 여기 한 벌만 둔다 — detect-tier.mjs 와 검사기는 import 만 한다.

// 앞에 적힌 것이 이긴다. TESTS 가 맨 앞인 이유는 규칙 ④ 때문이다
// (테스트만 바뀌면 등급을 올리지 않는다). DOC 이 맨 뒤인 이유는
// docs/spec/** 가 docs/** 보다 먼저 걸려야 하기 때문이다.
export const SURFACES = [
  { name: 'TESTS', tier: 1, globs: ['tests/**', '**/*.test.ts', '**/*.spec.ts'] },

  { name: 'MIGRATION', tier: 3, globs: ['db/migrations/**', 'db/init/**'] },
  { name: 'KIT', tier: 3, globs: ['packages/kit/**'] },
  { name: 'SPEC', tier: 3, globs: ['docs/SPEC.md', 'docs/spec/**'] },
  { name: 'COMPOSE', tier: 3, globs: ['docker-compose.yml', 'apps/*/Dockerfile', 'playwright.config.ts'] },

  { name: 'AUTH', tier: 2, globs: ['apps/admin/src/auth/**', 'apps/admin/src/settings/**'] },
  { name: 'RUNNER', tier: 2, globs: ['apps/runner/**'] },
  { name: 'ADMIN', tier: 2, globs: ['apps/admin/src/catalog/**', 'apps/admin/src/execution/**', 'apps/admin/src/reporting/**', 'apps/admin/src/db/**', 'apps/admin/src/app.ts'] },
  { name: 'GUARD', tier: 2, globs: ['.claude/scripts/**', 'scripts/**', 'package.json', 'tsconfig.json', 'vitest.config.ts'] },

  { name: 'WEB', tier: 1, globs: ['apps/admin/src/web/**'] },
  { name: 'HARNESS', tier: 1, globs: ['.claude/skills/**', '.claude/settings.json', 'CLAUDE.md'] },

  { name: 'DOC', tier: 0, globs: ['docs/**', '*.md', '**/*.html'] },
];

// `**` 는 경로 구분자를 넘고, `*` 는 안 넘는다. `?` 는 한 글자.
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**/` 는 0개 이상의 경로 조각 — a/**/b 가 a/b 에도 걸려야 한다
        if (glob[i + 2] === '/') { re += '(?:.*/)?'; i += 2; }
        else { re += '.*'; i += 1; }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

const COMPILED = SURFACES.map((s) => ({ ...s, res: s.globs.map(globToRegExp) }));

/** 경로 하나가 걸리는 첫 표면. 어디에도 안 걸리면 null */
export function surfaceOf(path) {
  const p = path.replace(/^\.\//, '');
  return COMPILED.find((s) => s.res.some((re) => re.test(p))) ?? null;
}

/**
 * 바뀐 경로 목록 → 등급 판정.
 * 규칙 ① 섞이면 최고 등급 ② 신호가 없으면 1등급 ③ 미분류는 1등급으로 두되 드러낸다
 * ④ TESTS 만 바뀌면 올리지 않는다 (표 순서가 보장한다)
 */
export function detectTier(paths) {
  const surfaces = new Set();
  const unmapped = [];
  for (const p of paths) {
    const s = surfaceOf(p);
    if (s) surfaces.add(s.name);
    else unmapped.push(p);
  }
  const hit = SURFACES.filter((s) => surfaces.has(s.name));
  const tier = hit.length ? Math.max(...hit.map((s) => s.tier)) : 1;
  return { tier, surfaces: [...surfaces], unmapped, paths };
}
