// 실행 창 머리 줄 — 디바이스 체크칸 · 대상 서버 고르기 · 고른 서버 주소 (도메인/실행 §8.2 · §8.10). RunPickModal 이 300줄을 넘어 떼어 냈다 (2026-11-05 WEB-F9-06)

import type { ServiceRow } from './api.js';
import { use말 } from './i18n.js';
import { 고른서버를적는다 } from './layout.js';
import { type use디바이스고르기, 디바이스칸 } from './RunPickTabs.js';

export function 머리줄({ 디바이스, service, env, on서버 }: { 디바이스: ReturnType<typeof use디바이스고르기>; service: ServiceRow | null; env: string; on서버: (env: string) => void }) {
  const t = use말();
  const 주소 = service?.envs.find((it) => it.env === env)?.baseUrl ?? null;
  return (
    <div className="mhead">
      <디바이스칸 고르기={디바이스} />
      <label htmlFor="pick-env">{t('대상 서버')}</label>
      <select id="pick-env" value={env} onChange={(e) => { on서버(e.target.value); if (service !== null) 고른서버를적는다(service.prefix, e.target.value); }}>
        {/* 기본값이 없다. 반드시 고른다 (SPEC §8.2) */}
        <option value="">{t('선택하세요')}</option>
        {(service?.envs ?? []).map((it) => (
          <option key={it.env} value={it.env}>
            {it.env}
          </option>
        ))}
      </select>
      {/* 고른 뒤 「어디로 쏘는지」를 확인할 자리가 있어야 한다 (SPEC §8.2) */}
      {주소 === null ? null : <span className="addr">{주소}</span>}
      {service !== null && service.envs.length === 0 ? (
        <span className="err">{t('이 애플리케이션에 등록된 대상 서버가 없습니다. 설정에서 추가해야 실행할 수 있습니다')}</span>
      ) : null}
    </div>
  );
}
