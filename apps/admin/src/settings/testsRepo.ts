// 서비스 설정의 테스트 저장소 주소를 한 꼴로 맞추고, 받아 둔 자리(<소유자>/<이름>)를 낸다 (공통/6-인프라 「테스트 코드 저장소」 「바뀔 모습」)
// 설정 저장 · 스캔 · 작성 에이전트 · 받아 오기가 같은 함수를 써야 자리가 둘로 갈리지 않는다

import { join } from 'node:path';

/**
 * Commander 저장소 자기 자리. 받아 오지 않고 체크아웃의 tests/ · docs/cases 를 붙인다(docker-compose.yml · infra/server/tests-pull.sh 와 같은 값).
 * ponytail: 고정값 — 다른 이름으로 포크해 설치하면 이 값과 compose 두 줄을 같이 바꾼다
 */
export const 자기저장소 = 'maxihan1/test-platform';

// 소유자는 GitHub 규칙(영문 · 숫자 · 하이픈), 이름은 영문 · 숫자 · . _ - 다. 「.」 · 「..」 만인 이름은 자리 밖을 가리켜 뺀다
const 꼴 = /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/;

/**
 * `https://github.com/<소유자>/<이름>` 로 맞춘다. 빈 글자는 빈 글자(아직 안 적음)다. 다른 꼴이면 null —
 * 설정 API 는 400, 나머지는 「자리가 없다」로 다룬다. 대소문자는 바꾸지 않는다 — 끝내기의 PR 주소 대조가 글자 그대로 견준다
 */
export function 저장소주소맞추기(주소: string): string | null {
  const 값 = 주소.trim();
  if (값 === '') return '';
  const m = 꼴.exec(값);
  if (m === null || m[2] === '.' || m[2] === '..') return null;
  return `https://github.com/${m[1]}/${m[2]}`;
}

/** 받아 둔 자리 `<소유자>/<이름>`. 비었거나 꼴이 틀리면 null */
export function 저장소자리(주소: string): string | null {
  const 맞춘것 = 저장소주소맞추기(주소);
  return 맞춘것 === null || 맞춘것 === '' ? null : 맞춘것.slice('https://github.com/'.length);
}

/** 서비스의 테스트 폴더 — 뿌리(PLATFORM_TESTS_DIR) 기준 `<소유자>/<이름>/tests/<테스트 폴더>`. 자리가 없으면 null */
export function 서비스폴더(주소: string, testsDir: string): string | null {
  const 자리 = 저장소자리(주소);
  return 자리 === null ? null : join(자리, 'tests', testsDir);
}
