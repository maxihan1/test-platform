// 맨 위 띠 · 자리 목록이 쓰는 규칙 (SPEC §8). 화면 조각은 Shell.tsx, 판단은 여기
// 한 번에 한 서비스만 본다 — 여러 서비스가 한 목록에 섞이면 엉뚱한 쪽에서 실행을 누르는 사고가 난다

import type { ServiceRow, User, 앱종류 } from './api.js';
import { 기본언어, t, type 언어 } from './i18n.js';
import type { 아이콘이름 } from './icons.js';
import { 종류, 종류키 } from './kind.js';
import { 기능보나, 할수있나 } from './role.js';
import { 대시보드보나 } from './route.js';

// 제품 이름은 고유 이름이라 어느 언어에서도 그대로 쓴다 (2026-10-20 사용자 — 10-19 에 「테스트 플랫폼」으로 바꾼 것을 되돌림)
const 제품이름 = 'QA Hub';

/** 고른 서비스를 브라우저에 남겨 두는 자리. 새로고침해도 보던 서비스가 유지된다 */
const 고른서비스키 = '고른서비스';

export interface 자리 {
  이름: string;
  해시: string;
  /** 글자 곁에 서는 메뉴 아이콘 (DESIGN.md 원칙 5). 하위 메뉴에는 없다 — 묶음의 아이콘이 이미 말한다 */
  아이콘: 아이콘이름;
  /** Grafana 는 이 플랫폼 밖이다. 화살표로 그렇게 표시한다 (SPEC §8) */
  바깥?: boolean;
  /** 늘 펼쳐 두는 하위 메뉴 (화면공통 §8 「자리 목록」 · PR #132) */
  하위?: 하위자리[];
}

/** 같은 글자(「UI 테스트」)가 두 묶음에 나온다 — 화면 읽기 프로그램이 어느 묶음 것인지 알게 라벨에 묶음 이름을 붙인다 */
export interface 하위자리 {
  이름: string;
  해시: string;
  라벨: string;
}

function 종류하위(묶음: string, 바탕: '#/cases' | '#/runs', 언어: 언어, UI없음 = false): 하위자리[] {
  // 묶음을 누르면 기능으로 간다(route.ts — 종류 없는 주소는 기능). 첫 하위가 그 화면이어야 누른 자리와 열린 화면이 맞는다
  // UI 테스트는 API 애플리케이션에 없다 — 화면이 없어 작성이 만들지 않는다 (도메인/API §3.1)
  const 종류들 = [['기능 테스트', 'fn']];
  if (!UI없음) 종류들.push(['UI 테스트', 'ui']);
  // E2E 는 돌린 기록에만 있다. 시나리오는 케이스가 아니라 케이스 목록에 없다 (도메인/실행 §8.7)
  if (바탕 === '#/runs') 종류들.push(['E2E', 'e2e']);
  return 종류들.map(([이름, 꼬리]) => ({
    이름: t(이름!, 언어),
    해시: `${바탕}/${꼬리!}`,
    라벨: `${묶음} · ${t(이름!, 언어)}`,
  }));
}

/** 탭이 여럿일 때는 탭 글자만 보인다. 어느 서비스를 보고 있는지가 거기 있어야 한다 (SPEC §8) */
export function 탭제목(service: ServiceRow | null): string {
  return service === null ? 제품이름 : `${service.name} · ${제품이름}`;
}

/**
 * Grafana 주소. admin 이 로그인·대시보드 권한을 보고 `/grafana/` 아래를 대신 연다 (도메인/인증 §7 「Grafana 통로」).
 * 2026-09-27 까지는 다른 포트라 빌드 때 구웠다 — 같은 서버 경로가 되며 구울 값이 사라졌다 (공통/6 §9.2)
 */
const 그래프주소 = '/grafana/';

/**
 * 자리 목록 (화면공통 §8 「자리 목록」).
 *
 * 기능이 `none` 이면 그 자리가 없고, 설정은 운영 계정에게만 뜬다. **흐리게 두지 않고 아예 없다** —
 * 누를 수 없는 메뉴가 있으면 사람이 그것이 올 때까지 기다린다 (§8.6).
 * 케이스·작성·실행은 **고른 서비스**의 칸을 보고, 그래프는 사람의 대시보드 칸을 본다.
 * 앱 대시보드는 배정 서비스 전체의 실행 칸이다 — 둘은 이름만 같고 칸이 다르다 (화면공통 §8).
 */
export function 자리목록(user: User, prefix: string | null, 언어: 언어): 자리[] {
  const 목록: 자리[] = [];
  const 고른종류 = user.services.find((서비스) => 서비스.prefix === prefix)?.kind;
  // 메뉴는 고른 애플리케이션 종류 하나로만 정한다 — 케이스 유무로 자리가 생기거나 사라지지 않는다 (화면공통 §8 「자리 목록」 · 2026-10-29 사용자 메뉴 C안)
  const 줄 = 종류(고른종류);
  const API = 종류키(고른종류) === 'API';
  // 맨 위다. 고른 서비스가 아니라 배정 서비스 전체의 실행 칸을 본다 (route.ts 의 `대시보드보나`)
  if (대시보드보나(user)) 목록.push({ 이름: t('대시보드', 언어), 해시: '#/dashboard', 아이콘: 'dashboard' });
  if (기능보나(user, prefix, 'authoring')) {
    // 작성은 표준 기획서를 읽어 테스트를 만든다 — 흐름 차례대로 그 위에 둔다 (화면공통 §8)
    // 작성이 읽는 기준 문서는 다 여기 모인다 — API 문서도 API 애플리케이션이면 PRD 옆 하위다. 네 종류의 맨 위 메뉴가 같아진다 (2026-10-29 사용자)
    const 이름 = t('PRD 관리', 언어);
    const 하위 = (글: string, 해시: string): 하위자리 => ({ 이름: t(글, 언어), 해시, 라벨: `${이름} · ${t(글, 언어)}` });
    목록.push({
      이름,
      해시: '#/prd',
      아이콘: 'prd',
      하위: [하위('요구사항', '#/prd'), ...(API ? [하위('API 문서', '#/api/docs')] : []), 하위(줄.가이드, '#/prd/guide')],
    });
    목록.push({ 이름: t('테스트 작성', 언어), 해시: '#/authoring', 아이콘: 'authoring' });
  }
  if (기능보나(user, prefix, 'cases')) {
    const 이름 = t('테스트 스크립트', 언어);
    // API 애플리케이션은 기능 테스트뿐이라 하위 없이 바로 그 목록이다. 주소는 지금 자리(`지금자리` 의 `#/cases/fn`)와 같아야 밑줄이 간다
    목록.push(API ? { 이름, 해시: '#/cases/fn', 아이콘: 'cases' } : { 이름, 해시: '#/cases', 아이콘: 'cases', 하위: 종류하위(이름, '#/cases', 언어) });
  }
  if (기능보나(user, prefix, 'runs')) {
    // 만드는 일(작성 → 케이스 → 시나리오) 끝, 보는 일 앞이다 (화면공통 §8). 시나리오는 실행 칸을 쓴다 (도메인/시나리오 §7)
    목록.push({ 이름: t('E2E 시나리오', 언어), 해시: '#/scenarios', 아이콘: 'scenarios' });
    const 이름 = t('실행 기록', 언어);
    목록.push({ 이름, 해시: '#/runs', 아이콘: 'runs', 하위: 종류하위(이름, '#/runs', 언어, API) });
    // 실행 기록 다음 · 그래프 앞 (화면공통 §8 「자리 목록」). 페이지 성능 · 기기 성능은 고른 애플리케이션 종류에 맞을 때만 선다 (kind.ts)
    const 성능 = t('성능 테스트', 언어);
    const 성능하위 = (글: string, 해시: string): 하위자리 => ({ 이름: t(글, 언어), 해시, 라벨: `${성능} · ${t(글, 언어)}` });
    목록.push({
      이름: 성능,
      해시: '#/perf/scenarios',
      아이콘: 'perf',
      하위: [
        // 「시나리오」는 「E2E 시나리오」와 헷갈렸다 — 만드는 것이 부하 시나리오라 「부하 테스트」 (2026-10-29 사용자)
        성능하위('부하 테스트', '#/perf/scenarios'),
        ...(줄.페이지성능 ? [성능하위('페이지 성능', '#/perf/pages')] : []),
        ...(줄.기기성능 === null ? [] : [성능하위(줄.기기성능, '#/perf/devices')]),
        성능하위('실행 기록', '#/perf/runs'),
      ],
    });
  }
  if (user.dashboard === 'read') 목록.push({ 이름: t('그래프(Grafana)', 언어), 해시: 그래프주소, 아이콘: 'graph', 바깥: true });
  if (할수있나(user, prefix, '설정')) 목록.push({ 이름: t('설정', 언어), 해시: '#/settings', 아이콘: 'settings' });
  return 목록;
}

/**
 * 사이드바에서 어느 자리에 밑줄이 갈까.
 *
 * **상세 화면은 목록에서 들어온 자리다.** 실행 결과·항목 상세가 `#/runs` 를 가리키는 것과
 * 같은 이유로 작성 상세도 `#/authoring` 을 가리킨다 — 안 그러면 상세를 여는 순간
 * 밑줄이 케이스로 튄다.
 *
 * `main.tsx` 안에 두면 그 파일이 `createRoot` 를 모듈 자리에서 불러 **검사할 수가 없다.**
 * 판단은 여기, 그림은 거기 (이 파일 머리 주석과 같은 규칙).
 */
export function 지금자리(name: string, 집: string, 종류?: 'UI' | 'FN' | 'E2E'): string {
  // 목록은 종류까지 자리다. 실행 결과 · 항목 상세는 주소에 종류가 없어 묶음을 가리킨다 (PR #132)
  const 꼬리 = 종류 === undefined ? '' : `/${종류.toLowerCase()}`;
  if (name === 'dashboard') return '#/dashboard';
  if (name === 'runs') return `#/runs${꼬리}`;
  if (name === 'cases') return `#/cases${꼬리}`;
  if (name === 'run' || name === 'item') return '#/runs';
  if (name === 'authoring' || name === 'authoringItem') return '#/authoring';
  if (name === 'prd') return '#/prd';
  if (name === 'prdGuide') return '#/prd/guide';
  if (name === 'apiDocs') return '#/api/docs';
  if (name === 'scenarios' || name === 'scenarioNew' || name === 'scenarioNewBuild' || name === 'scenario') return '#/scenarios';
  if (name === 'perfScenarios' || name === 'perfScenarioNew' || name === 'perfScenario') return '#/perf/scenarios';
  if (name === 'perfPages') return '#/perf/pages';
  if (name === 'perfDevices') return '#/perf/devices';
  if (name === 'perfRuns' || name === 'perfRun') return '#/perf/runs';
  if (name === 'settings') return '#/settings';
  // 비밀번호 변경은 자리 목록에 없다. 집을 돌려주면 케이스에 밑줄이 가서 딴 화면처럼 보인다
  if (name === 'password') return '#/password';
  // 케이스가 none 인 사람의 집은 케이스가 아니다 — 집은 route.ts 의 `집()` 이 권한으로 고른다
  if (name === 'setup') return '#/cases';
  return 집;
}

/**
 * 어느 서비스를 열까.
 *
 * 저장된 것이 배정 목록에 없으면 첫 번째로 돌아간다 — 배정이 빠진 뒤에도 그것을 열면
 * 서버가 403 을 내고 화면은 이유 없이 비어 보인다.
 */
export function 고른서비스(저장값: string | null, 배정: ServiceRow[]): ServiceRow | null {
  const 찾은것 = 배정.find((service) => service.prefix === 저장값);
  return 찾은것 ?? 배정[0] ?? null;
}

export interface 프로젝트 {
  id: number;
  name: string;
}

/**
 * 배정받은 애플리케이션에서 프로젝트를 뽑는다 — 프로젝트 목록 통로는 운영 전용이라 member 는 쓸 수 없고,
 * 배정받지 않은 프로젝트는 이 길로 저절로 안 보인다 (도메인/인증 §7). 처음 나온 순서를 지킨다
 */
export function 배정프로젝트들(배정: ServiceRow[]): 프로젝트[] {
  const 본 = new Map<number, 프로젝트>();
  for (const 서비스 of 배정) {
    if (!본.has(서비스.projectId)) 본.set(서비스.projectId, { id: 서비스.projectId, name: 서비스.projectName });
  }
  return [...본.values()];
}

/**
 * 로그인한 직후 프로젝트를 먼저 물을까 (공통/1-제품과-구조 §2 「로그인하면 프로젝트부터 고른다」).
 * 프로젝트가 하나뿐이면 고를 것이 없고, 끊겼다 돌아온 로그인(돌아갈 자리가 있다)은 보던 곳으로 간다
 */
export function 프로젝트물을까(돌아갈자리: string | null, 배정: ServiceRow[]): boolean {
  return 돌아갈자리 === null && 배정프로젝트들(배정).length > 1;
}

export function 프로젝트서비스들(projectId: number, 배정: ServiceRow[]): ServiceRow[] {
  return 배정.filter((service) => service.projectId === projectId);
}

/** 대시보드는 서비스를 번호로 준다. 배정 밖 번호면 고르지 않는다 — 고르개가 남의 서비스를 열면 서버가 403 을 낸다 */
export function 배정서비스접두사(serviceId: number, 배정: ServiceRow[]): string | null {
  return 배정.find((service) => service.id === serviceId)?.prefix ?? null;
}

/**
 * 대시보드가 사람의 권한에서 알아야 하는 둘.
 * 케이스 자리가 있나 — 없는데 단추를 두면 `갈자리` 가 곧바로 되돌려 단추가 아무 일도 안 한다.
 * 작성 서비스 — 커버리지 줄은 작성 칸이 `none` 이 아닌 서비스만 센다. 실행 칸 기준의 서비스 목록에는 작성을 못 보는 서비스가 섞인다
 */
export function 대시보드재료(
  user: User,
  prefix: string | null,
): { 케이스갈수있나: boolean; 설정갈수있나: boolean; 작성서비스: { id: number; name: string; kind?: 앱종류 }[]; 프로젝트: number | null } {
  // 대시보드는 헤더에서 고른 프로젝트 안만 모은다 (도메인/리포팅 §8.12). 고른 애플리케이션이 없으면 프로젝트를 안 가린다
  const 프로젝트 = user.services.find((서비스) => 서비스.prefix === prefix)?.projectId ?? null;
  return {
    케이스갈수있나: 기능보나(user, prefix, 'cases'),
    설정갈수있나: 할수있나(user, prefix, '설정'),
    작성서비스: user.services
      .filter((서비스) => 서비스.permissions.authoring !== 'none' && (프로젝트 === null || 서비스.projectId === 프로젝트))
      .map(({ id, name, kind }) => ({ id, name, kind })),
    프로젝트,
  };
}

export function 고른서비스를읽는다(): string | null {
  try {
    return localStorage.getItem(고른서비스키);
  } catch {
    // 브라우저가 저장을 막아도 화면은 떠야 한다. 첫 서비스로 열릴 뿐이다
    return null;
  }
}

export function 고른서비스를적는다(prefix: string): void {
  try {
    localStorage.setItem(고른서비스키, prefix);
  } catch {
    // 위와 같다
  }
}

/**
 * 서비스마다 마지막으로 고른 대상 서버 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」).
 * 시스템이 정한 기본값이 아니라 이 사람이 이 브라우저에서 직접 고른 값이다 — 기본값을 두지 않는 규칙(도메인/실행 §8.2)은 그대로다
 */
const 고른서버키 = (prefix: string) => '대상서버:' + prefix;

/**
 * 그 서비스에 아직 있는 서버일 때만 돌려준다. 처음이거나 설정에서 지웠으면 빈 글자 — 고르지 않은 채로 연다.
 * 서버가 하나뿐이면 그것이다 — 고를 것이 하나라 기본값이 아니고 틀린 값이 남을 수 없다. 앞 판은 처음 실행마다 「고르세요」로 떴다 (GAME-F2-17).
 * 그 하나가 실서비스 서버여도 고른다 — 화면은 실서비스 표시를 못 받는다(/auth/me). 실행 단추는 사람이 누른다
 */
export function 마지막서버(prefix: string, envs: readonly { env: string }[]): string {
  if (envs.length === 1) return envs[0]!.env;
  try {
    const 값 = localStorage.getItem(고른서버키(prefix));
    return envs.some((it) => it.env === 값) ? 값! : '';
  } catch {
    // 브라우저가 저장을 막아도 화면은 떠야 한다. 고르지 않은 채로 열릴 뿐이다
    return '';
  }
}

export function 고른서버를적는다(prefix: string, env: string): void {
  if (env === '') return;
  try {
    localStorage.setItem(고른서버키(prefix), env);
  } catch {
    // 위와 같다
  }
}

/** 사이드바를 접어 뒀는지. 새로고침해도 접힌 채로 열린다 */
const 접은사이드바키 = '사이드바접음';

export function 사이드바접었나(): boolean {
  try {
    return localStorage.getItem(접은사이드바키) === '1';
  } catch {
    // 브라우저가 저장을 막아도 화면은 떠야 한다. 펴진 채로 열릴 뿐이다
    return false;
  }
}

export function 사이드바접음을적는다(접음: boolean): void {
  try {
    localStorage.setItem(접은사이드바키, 접음 ? '1' : '0');
  } catch {
    // 위와 같다
  }
}

/** 고른 화면 언어. 새로고침해도 그 언어로 열린다 (SPEC §8 「다국어」) */
const 언어키 = '화면언어';

export function 고른언어를읽는다(): 언어 {
  try {
    return localStorage.getItem(언어키) === 'en' ? 'en' : 기본언어;
  } catch {
    // 브라우저가 저장을 막아도 화면은 떠야 한다. 기본 언어로 열릴 뿐이다
    return 기본언어;
  }
}

export function 고른언어를적는다(고른: 언어): void {
  try {
    localStorage.setItem(언어키, 고른);
  } catch {
    // 위와 같다
  }
}

export interface 빈띠 {
  무엇: string;
  다음: string;
}

/**
 * 배정받은 서비스가 하나도 없는 사람이 보는 것.
 *
 * 「하나도 없다」만 말하고 왜인지 안 말하면 사람이 할 수 있는 일이 없다 (§8.1 빈 목록과 같은 성질).
 * 운영 계정은 스스로 풀 수 있다 — 새 서비스를 만든 운영자는 자기 자신을 배정해야 한다 (§3.5).
 *
 * **설정 화면만은 덮지 않는다** (2026-09-19 실측). 안내가 「설정에서 배정하세요」라고 보내 놓고
 * 설정을 눌러도 같은 안내가 떴다 — 서비스가 0개인 첫 운영자는 **영영 빠져나올 수 없었다.**
 * 설정은 서비스에 배정돼야 쓰는 화면이 아니라 **그 배정을 만드는 화면**이라 성질이 다르다.
 */
export function 빈띠사유(user: User, prefix: string | null, 언어: 언어, 지금자리?: string): 빈띠 | null {
  // 자기 비밀번호는 배정·권한과 상관없이 바꾼다. 덮으면 사이드바의 「비밀번호 변경」이 막다른 길이 된다
  if (지금자리 === '#/password') return null;
  // 넷 다 none 이면 서비스 0건보다 이것이 먼저다 — 배정을 받아도 칸이 없으면 볼 것이 없다 (화면공통 §8)
  if (자리목록(user, prefix, 언어).length === 0) {
    return { 무엇: t('권한을 받지 않았습니다. 관리자에게 요청하세요', 언어), 다음: '' };
  }
  if (user.services.length > 0) return null;

  const 설정을열수있나 = 할수있나(user, prefix, '설정');
  // 설정을 못 여는 등급에게는 설정 자리도 길이 아니다. 비워 두면 왜 빈지 알 수 없다
  if (지금자리 === '#/settings' && 설정을열수있나) return null;

  return {
    무엇: t('아직 배정받은 애플리케이션이 없습니다', 언어),
    다음: 설정을열수있나
      ? t('설정에서 자기 자신을 프로젝트에 배정하세요', 언어)
      : t('운영 계정에게 프로젝트 배정을 요청하세요', 언어),
  };
}
