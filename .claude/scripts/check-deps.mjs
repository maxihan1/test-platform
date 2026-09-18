#!/usr/bin/env node
// package.json 이 선언한 의존성이 실제로 불러와지는지 본다. 누락이 있으면 종료 코드 1.
//
// 왜 디렉터리 존재로 안 보는가 — 워크트리에는 자기 node_modules 가 없고 Node 가 상위로
// 올라가 저장소 루트 것을 쓴다. 디렉터리만 보면 워크트리에서 전부 「없음」이 되어
// 멀쩡한 환경을 빨간불로 만든다. Node 의 해석 경로를 그대로 따라가야 런타임과 답이 같다.
//
// 왜 `npm ls --depth=0` 을 안 쓰는가 — 같은 이유로 워크트리에서 거짓 양성이다.
// 루트에 설치된 것까지 UNMET DEPENDENCY 로 찍고 종료 코드 1 을 낸다 (2026-09-18 실측).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const PKG = new URL('../../package.json', import.meta.url);
// 해석 기준점을 package.json 옆에 둔다. 저장소 루트에서 시작해 위로 올라간다
const require = createRequire(PKG);

/** package.json 이 선언한 의존성 이름 전부 (dependencies + devDependencies) */
export function declaredDeps() {
  const pkg = JSON.parse(readFileSync(PKG, 'utf8'));
  return [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
}

/** 주어진 이름 중 불러올 수 없는 것만 돌려준다 */
export function missingDeps(names) {
  return names.filter((name) => {
    try {
      // package.json 을 찍는다. 패키지가 exports 로 진입점을 막아 둬도 이건 대개 열려 있다
      require.resolve(`${name}/package.json`);
      return false;
    } catch {
      try {
        require.resolve(name);
        return false;
      } catch {
        return true;
      }
    }
  });
}

// 직접 실행했을 때만 찍는다. import 로 쓰면 조용하다
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const names = declaredDeps();
  const missing = missingDeps(names);
  if (missing.length) {
    console.error(`[차단] 선언됐는데 설치 안 된 의존성 ${missing.length}개\n`);
    for (const m of missing) console.error(`  ${m}`);
    console.error('\n고치는 법:  npm install');
    process.exit(1);
  }
  console.log(`[check:deps] 선언 ${names.length}개 전부 설치됨`);
}
