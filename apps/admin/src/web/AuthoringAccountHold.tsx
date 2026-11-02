// 작성 상세 「다음 단계」의 계정 없음 칸 — 어느 역할 계정이 없어 어느 요구를 못 썼는지와 넣을 곳 (도메인/작성 §3.6 「★ 역할별 계정」 · 점검 12.4)

import { 일 } from './authoringTodoParts.js';
import { use말 } from './i18n.js';
import { prdApi, type PrdHeld } from './prdApi.js';
import { PRD항목주소 } from './route.js';
import { useAsync } from './ui.js';

/**
 * 셈은 이 실행 것(건수)이고 역할 · 요구 번호는 「PRD 관리」 보류 카드가 읽는 서비스 지금 값이다 —
 * 작성 응답에는 역할이 없다(계약 밖). 둘이 어긋나면(그새 계정을 넣었다) 지금 값을 믿는다
 */
export function 계정없음일({ service, 표, 수, 운영자 }: { service: string; 표: string; 수: number; 운영자: boolean }) {
  const t = use말();
  const 지금 = useAsync<PrdHeld>(() => prdApi.now(service).then((p) => p.held), [service]);
  const held = 지금.data;
  const 없는역할 = held === null ? [] : held.roles.filter((r) => !r.registered).map((r) => r.role);
  const 번호들 = held === null ? [] : Object.entries(held.reqs).filter(([, 역할들]) => 역할들.some((r) => 없는역할.includes(r))).map(([번호]) => 번호);

  // 그새 계정을 다 넣었으면 이어 작성은 「PRD 관리」 보류 카드가 맡는다
  if (held !== null && 없는역할.length === 0) {
    return (
      <일 표={표} 제목={t('계정이 없어 못 쓴 요구 {수}개', { 수 })} 설명={t('필요한 계정을 모두 넣었습니다. PRD 관리에서 이 요구만 이어 작성하세요')}>
        <a className="btn ghost" href="#/prd">
          {t('PRD 관리로 가기')}
        </a>
      </일>
    );
  }
  const 역할 = 없는역할.join(' · ');
  const 설명 =
    held === null
      ? t('역할 계정이 없어 테스트를 못 쓴 요구입니다. 계정을 넣으면 이 요구만 이어 작성합니다')
      : t('{역할} 계정이 없어 테스트를 못 썼습니다. 계정을 넣으면 이 요구만 이어 작성합니다', { 역할 });
  return (
    <일 표={표} 제목={t('계정이 없어 못 쓴 요구 {수}개', { 수 })} 설명={설명}>
      {지금.error === null ? null : <p className="hint">{지금.error}</p>}
      {번호들.length === 0 ? null : (
        <p className="made-reqs">
          {/* 수는 이 실행 셈이고 번호는 서비스 지금 값이라 어긋날 수 있다 — 무엇의 번호인지 적는다 (코드 검토) */}
          <span className="hint">{t('이 애플리케이션에서 이 계정을 기다리는 요구')}</span>{' '}
          {번호들.map((r) => (
            <a key={r} className="mono made-req" href={PRD항목주소(r)}>
              {r}
            </a>
          ))}
        </p>
      )}
      {/* 설정 메뉴가 없는 사람에게 「설정에서」는 따라갈 수 없는 길이다 (점검 11.3) */}
      {운영자 ? (
        <a className="btn ghost" href={`#/settings/${encodeURIComponent(service)}`}>
          {역할 === '' ? t('설정에서 계정 등록') : t('설정에서 {역할} 계정 등록', { 역할 })}
        </a>
      ) : (
        <p className="hint">{역할 === '' ? t('관리자에게 계정 등록을 요청하세요') : t('관리자에게 {역할} 계정 등록을 요청하세요', { 역할 })}</p>
      )}
    </일>
  );
}
