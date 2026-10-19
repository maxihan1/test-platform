// 값 연결의 「요청 고르기」 — 가져올 단계가 부른 API 를 서비스 지도에서 골라 메서드 · URL 패턴을 채운다 (도메인/시나리오 §8.11)

import type { ScenarioMethod } from '@platform/kit';

import type { 지도API } from '../prd/apiMap.js';
import { use말 } from './i18n.js';
import { 칸 } from './ScenarioOtherParts.js';

// 메서드 칸(ScenarioLinkParts)과 같은 목록 — 지도에서 고를 수 있는 것과 칸이 받는 것이 갈리지 않게 한 곳에 둔다
export const 메서드들: ScenarioMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const 고를메서드 = new Set<string>(메서드들);

/**
 * 지도의 주소 틀(`:n` · `:id`)을 러너가 맞추는 glob 으로. 러너가 `*` 는 한 칸(`[^/]*`)으로 맞추고 `**` 로 시작하면 호스트를 가린다
 * (apps/runner/scenario/links.ts `globToRegexPattern`). 호스트가 달라도 맞게 `**` 를 앞에 붙인다
 */
export function 무늬로(path: string): string {
  // 지도의 주소는 물음표 뒤를 뗐다. 러너 무늬는 끝까지 맞춰야 해서 `?page=1` 이 붙은 요청도 맞게 물음표 꼬리를 열어 둔다
  return `**${path.replace(/:(?:n|id)(?=\/|$)/g, '*')}{,?*}`;
}

export interface 고를요청 {
  method: ScenarioMethod;
  urlPattern: string;
  /** 목록에 보이는 지도의 주소 틀 */
  path: string;
}

/** 그 단계가 부른 API 만, 주소 · 메서드 차례로. 호스트만 다른 같은 틀은 하나로 본다 */
export function 부른요청들(apis: 지도API[], tcId: string): 고를요청[] {
  const 모음 = new Map<string, 고를요청>();
  for (const a of apis) {
    if (!a.cases.some((c) => c.tcId === tcId)) continue;
    const method = a.method.toUpperCase();
    if (!고를메서드.has(method)) continue;
    모음.set(`${method} ${a.path}`, { method: method as ScenarioMethod, urlPattern: 무늬로(a.path), path: a.path });
  }
  return [...모음.values()].sort((가, 나) => 가.path.localeCompare(나.path) || 가.method.localeCompare(나.method));
}

export function 요청고르개({ 아이디, tcId, 지도, 방법, 무늬, 잠금, on고름 }: {
  아이디: string;
  tcId: string | undefined;
  /** null 이면 고르개를 그리지 않는다 — 못 받았거나 읽을 수 없다 */
  지도: 지도API[] | null | undefined;
  방법: ScenarioMethod;
  무늬: string;
  잠금: boolean;
  on고름: (고른: Pick<고를요청, 'method' | 'urlPattern'>) => void;
}) {
  const t = use말();
  if (지도 === null || 지도 === undefined || tcId === undefined) return null;
  const 목록 = 부른요청들(지도, tcId);
  if (목록.length === 0) {
    return <p className="hint">{t('애플리케이션 지도에 이 단계가 부른 API 기록이 없습니다. 직접 적습니다')}</p>;
  }
  const 고른 = 목록.findIndex((r) => r.method === 방법 && r.urlPattern === 무늬);
  return (
    <칸 아이디={아이디} 라벨="요청 고르기" 문장={null}>
      {(속성) => (
        <select
          {...속성}
          value={고른 < 0 ? '' : String(고른)}
          disabled={잠금}
          onChange={(e) => {
            const 요청 = 목록[Number(e.target.value)];
            if (e.target.value !== '' && 요청 !== undefined) on고름({ method: 요청.method, urlPattern: 요청.urlPattern });
          }}
        >
          <option value="">{t('직접 적은 요청')}</option>
          {목록.map((r, i) => (
            <option key={`${r.method} ${r.urlPattern}`} value={i}>
              {r.method} {r.path}
            </option>
          ))}
        </select>
      )}
    </칸>
  );
}
