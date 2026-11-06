// 실행 창 준비 화면 머리 한 줄 — 디바이스 체크칸 · 모바일 웹 고르개 · 대상 서버와 주소 (도메인/실행 §8.16 ① · 시안 A). RunPickModal 이 300줄을 넘어 떼어 냈다 (2026-11-05 WEB-F9-06)

import { useId } from 'react';

import type { ServiceRow, 모바일위치 } from './api.js';
import { use말 } from './i18n.js';
import { 고른서버를적는다 } from './layout.js';
import { 기기호출 } from './perfDeviceApi.js';
import { type use디바이스고르기, 디바이스칸 } from './RunPickTabs.js';
import { useAsync } from './ui.js';

export function 머리줄({
  디바이스,
  service,
  env,
  on서버,
  mobileOn,
  on모바일,
}: {
  디바이스: ReturnType<typeof use디바이스고르기>;
  service: ServiceRow | null;
  env: string;
  on서버: (env: string) => void;
  mobileOn: 모바일위치;
  on모바일: (값: 모바일위치) => void;
}) {
  const t = use말();
  const 주소 = service?.envs.find((it) => it.env === env)?.baseUrl ?? null;
  return (
    <div className="mhead">
      <디바이스칸 고르기={디바이스} />
      {/* 모바일 웹 고르개는 늘 같은 줄에 선다 — 앞 판은 모바일을 켜야 칸이 생겨 창이 밀리고 옆을 누르려던 손이 이 칸을 눌렀다 (점검표 B8) */}
      {!디바이스.있는것.includes('mobile') ? null : (
        <모바일고르개 service={service} 값={mobileOn} on바꿈={on모바일} 꺼짐={!디바이스.켰나('mobile')} />
      )}
      <span className="mhead-env">
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
      </span>
      {service !== null && service.envs.length === 0 ? (
        <span className="err">{t('이 애플리케이션에 등록된 대상 서버가 없습니다. 설정에서 추가해야 실행할 수 있습니다')}</span>
      ) : null}
    </div>
  );
}

/**
 * 가상 기기 · 실제 기기. 실제 기기 곁에 빈 폰 수를 적는다 — 기기 목록 통로(성능 §7)에서 디바이스 팜의 쉬는 폰을 센다.
 * 못 읽거나 목록이 비면 수 없이 적는다 — 고르는 일은 막지 않는다 (도메인/실행 §8.16 ① · 점검표 D6)
 */
function 모바일고르개({ service, 값, on바꿈, 꺼짐 }: { service: ServiceRow | null; 값: 모바일위치; on바꿈: (값: 모바일위치) => void; 꺼짐: boolean }) {
  const t = use말();
  const 이름 = useId();
  const 기기 = useAsync(
    () => (service === null ? Promise.resolve(null) : 기기호출.devices(service.id).then(({ devices }) => devices)),
    [service?.id],
  );
  const 빈폰 = (기기.data ?? []).filter((d) => d.where === 'FARM' && d.status === 'IDLE').length;
  const 폰있나 = (기기.data ?? []).some((d) => d.where === 'FARM');
  const 칸 = (위치: 모바일위치, 글: string, 작은글: string | null) => (
    <label className={값 === 위치 ? 'on' : undefined}>
      <input type="radio" name={이름} aria-label={t(글)} checked={값 === 위치} disabled={꺼짐} onChange={() => on바꿈(위치)} />
      {t(글)}
      {작은글 === null ? null : <small>{작은글}</small>}
    </label>
  );
  return (
    <span className={꺼짐 ? 'mob-pick off' : 'mob-pick'}>
      <span className="mob-pick-k" id={이름}>
        {t('모바일 웹')}
      </span>
      <span className="segc" role="radiogroup" aria-labelledby={이름}>
        {칸('server', '가상 기기', 'iPhone 14')}
        {칸('vision', '실제 기기', 폰있나 ? t('빈 폰 {수}대', { 수: 빈폰 }) : null)}
      </span>
    </span>
  );
}
