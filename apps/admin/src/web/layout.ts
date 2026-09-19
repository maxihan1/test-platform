// 맨 위 띠 · 자리 넷 · 알림 줄이 쓰는 규칙 (SPEC §8). 화면 조각은 Shell.tsx, 판단은 여기
// 한 번에 한 서비스만 본다 — 여러 서비스가 한 목록에 섞이면 엉뚱한 쪽에서 실행을 누르는 사고가 난다

import type { RunSummary, ServiceRow, User } from './api.js';
import { 할수있나, type 등급 } from './role.js';
import { 도는중 } from './runState.js';

const 제품이름 = '테스트 플랫폼';

/** 고른 서비스를 브라우저에 남겨 두는 자리. 새로고침해도 보던 서비스가 유지된다 */
const 고른서비스키 = '고른서비스';

export interface 자리 {
  이름: string;
  해시: string;
  /** Grafana 는 이 플랫폼 밖이다. 화살표로 그렇게 표시한다 (SPEC §8) */
  바깥?: boolean;
}

/** 탭이 여럿일 때는 탭 글자만 보인다. 어느 서비스를 보고 있는지가 거기 있어야 한다 (SPEC §8) */
export function 탭제목(service: ServiceRow | null): string {
  return service === null ? 제품이름 : `${service.name} · ${제품이름}`;
}

declare global {
  interface ImportMeta {
    /** Vite 는 `VITE_` 로 시작하는 값만 번들에 넣는다. 안 주면 그 자리가 undefined 가 된다 */
    readonly env?: { readonly VITE_GRAFANA_PORT?: string };
  }
}

/**
 * Grafana 주소.
 *
 * Grafana 는 admin 과 **다른 포트**로 뜬다 — `GRAFANA_PORT`, 비우면 3001 (docs/SETUP.md).
 * SPEC 은 「그래프는 Grafana 라 바깥으로 나간다」(§8)까지만 적고 화면이 그 주소를
 * 어떻게 아는지는 정하지 않았다 — 2026-09-20 에 **빌드 시 설정값**으로 정했다 (SPEC §9.2).
 * compose 의 `GRAFANA_PORT` 가 admin 이미지의 build arg 로 들어와 이 자리에 구워진다.
 *
 * **값이 번들에 박히므로 `GRAFANA_PORT` 를 바꾸면 admin 이미지를 다시 빌드해야 한다.**
 * 안 하면 아무 오류 없이 이 링크만 틀린 포트를 가리킨다.
 */
function 그래프주소(): string {
  const 포트 = import.meta.env?.VITE_GRAFANA_PORT ?? '3001';
  return `${location.protocol}//${location.hostname}:${포트}`;
}

/**
 * 자리 넷 (SPEC §8).
 *
 * 설정은 운영 등급에게만 뜬다. **흐리게 두지 않고 아예 없다** —
 * 누를 수 없는 메뉴가 있으면 사람이 그것이 올 때까지 기다린다 (§8.6).
 */
export function 자리목록(role: 등급 | null): 자리[] {
  const 기본: 자리[] = [
    { 이름: '케이스', 해시: '#/cases' },
    { 이름: '실행 기록', 해시: '#/runs' },
    { 이름: '그래프', 해시: 그래프주소(), 바깥: true },
  ];
  return 할수있나(role, '설정') ? [...기본, { 이름: '설정', 해시: '#/settings' }] : 기본;
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

export interface 빈띠 {
  무엇: string;
  다음: string;
}

/**
 * 배정받은 서비스가 하나도 없는 사람이 보는 것.
 *
 * 「하나도 없다」만 말하고 왜인지 안 말하면 사람이 할 수 있는 일이 없다 (§8.1 빈 목록과 같은 성질).
 * 운영 등급은 스스로 풀 수 있다 — 새 서비스를 만든 운영자는 자기 자신을 배정해야 한다 (§3.5).
 *
 * **설정 화면만은 덮지 않는다** (2026-09-19 실측). 안내가 「설정에서 배정하세요」라고 보내 놓고
 * 설정을 눌러도 같은 안내가 떴다 — 서비스가 0개인 첫 운영자는 **영영 빠져나올 수 없었다.**
 * 설정은 서비스에 배정돼야 쓰는 화면이 아니라 **그 배정을 만드는 화면**이라 성질이 다르다.
 */
export function 빈띠사유(user: User, 지금자리?: string): 빈띠 | null {
  if (user.services.length > 0) return null;

  const 설정을열수있나 = 할수있나(user.role, '설정');
  // 설정을 못 여는 등급에게는 설정 자리도 길이 아니다. 비워 두면 왜 빈지 알 수 없다
  if (지금자리 === '#/settings' && 설정을열수있나) return null;

  return {
    무엇: '아직 배정받은 서비스가 없습니다',
    다음: 설정을열수있나
      ? '설정에서 자기 자신을 서비스에 배정하세요'
      : '운영 등급에게 서비스 배정을 요청하세요',
  };
}

export interface 알림 {
  runId: number;
  글: string;
  /** 끝난 소식이면 닫기(×)를 그린다. 도는 중이면 스스로 사라지므로 닫을 것이 없다 */
  끝났나: boolean;
}

/**
 * 끝난 지 이만큼 안 된 것만 「끝났습니다」로 알린다.
 *
 * 없으면 어제 끝난 실행이 오늘도 뜬다 — **그것은 소식이 아니라 기록이다.**
 * 한 번 돌리면 최악 50분이라 자리를 떴다 돌아오는 시간을 넉넉히 덮는다.
 */
const 끝난소식유효 = 2 * 60 * 60 * 1000;

/**
 * 자리 아래 한 줄 (SPEC §8).
 *
 * 한 번 돌리면 최악 50분이라 자리를 떴다 돌아오는 진입이 흔하다.
 * 이 줄 하나로 「무엇을 돌릴까」와 「아까 그거 끝났나」 두 상황을 다 받는다.
 * 도는 실행이 없으면 줄 자체가 없다 — 빈 줄을 자리만 잡아 두지 않는다.
 */
export function 알림줄(runs: RunSummary[], 본것들: ReadonlySet<number> = new Set()): 알림 | null {
  // 도는 것이 먼저다. 끝난 소식보다 지금 도는 것이 급하다
  const 도는것 = runs.filter((run) => 도는중(run.status));
  if (도는것.length > 0) {
    // 여럿이면 가장 최근 것. 실행 번호는 커질수록 최근이다
    const 것 = 도는것.reduce((a, b) => (b.runId > a.runId ? b : a));
    const 끝난수 = 것.counts.total - 것.counts.running;
    return {
      runId: 것.runId,
      글: `RUN ${것.runId} 이 도는 중입니다  ${끝난수}/${것.counts.total}`,
      끝났나: false,
    };
  }

  // 그 실행 화면에 있던 사람은 완료 모달로 이미 알았다 (§8.9).
  // 같은 자리(본것들)를 봐서 두 번 알리지 않는다
  const 지금 = Date.now();
  const 갓끝난것 = runs.filter(
    (run) =>
      !본것들.has(run.runId) &&
      run.finishedAt !== null &&
      지금 - new Date(run.finishedAt).getTime() < 끝난소식유효,
  );
  if (갓끝난것.length === 0) return null;

  const 것 = 갓끝난것.reduce((a, b) => (b.runId > a.runId ? b : a));
  const 머리 = 것.status === 'ABORTED' ? '멈췄습니다' : '끝났습니다';
  const 집계 = [`${것.counts.pass} 통과`];
  if (것.counts.fail > 0) 집계.push(`${것.counts.fail} 실패`);
  if (것.counts.na > 0) 집계.push(`${것.counts.na} 미실행`);

  return { runId: 것.runId, 글: `RUN ${것.runId} 이 ${머리} · ${집계.join(' · ')}`, 끝났나: true };
}
