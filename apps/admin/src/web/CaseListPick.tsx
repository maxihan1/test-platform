// 케이스 목록의 여러 건 고르기 — 표 위 「모두 고르기」 띠와 목록 아래 고르기 바 (도메인/카탈로그 §8.1 「여러 건 골라」 · DESIGN.md 「고르기 바」)

import { 고치기상한 } from '../authoring/edit.js';

import type { Platform } from './api.js';
import { 고른것고치기 } from './CaseBulkEdit.js';
import { use지금앱 } from './Head.js';
import { use말 } from './i18n.js';
import { 종류 } from './kind.js';
import { use휴대폰 } from './phone.js';
import { 테스트만인가, type 판정 } from './role.js';
import { PLATFORM_LABEL } from './ui.js';
import type { useRunPick } from './useRunPick.js';

/** 웹 애플리케이션 케이스가 선언하는 디바이스. 고르기 바가 디바이스마다 실행 단추를 세운다 (시안 ①) */
const 웹디바이스: Platform[] = ['desktop', 'mobile'];

/**
 * 머리 네모로 이 쪽을 다 고르면 표 위에 선다. 쪽을 넘기지 않고 조건에 맞는 전부로 넓힌다.
 * 넓히기 전부터 상한을 말한다 — 모두 고른 뒤에야 단추가 잠기면 사람은 까닭을 모른다
 */
export function 고르기띠({
  보일수,
  전체,
  모두,
  담기한계,
  실행보나,
  테스트만 = false,
  삭제보나,
  on모두,
  on풀기,
}: {
  보일수: number;
  전체: number;
  모두: boolean;
  /** 실행이 쪽을 돌며 담는 한계(useRunPick `쪽상한` × 쪽 크기) */
  담기한계: number;
  실행보나: boolean;
  /** 실행 칸이 trial 이다 — 담는 한계 안내가 테스트 실행 글자다 */
  테스트만?: boolean;
  삭제보나: boolean;
  on모두: () => void;
  on풀기: () => void;
}) {
  const t = use말();
  // 「상한 < 전체」로 쓴다 — `>` 뒤 한글 이름을 문구 검사(messages.test.ts)가 JSX 글로 읽는다
  const 실행넘침 = 실행보나 && 담기한계 < 전체;
  const 삭제넘침 = 삭제보나 && 고치기상한 < 전체;
  return (
    <div className="pick-band">
      <p>
        {/* 알리는 것은 문장만이다 — 띠 전체를 알림 칸으로 두면 바뀔 때마다 단추 글자까지 다시 읽힌다 */}
        <span role="status">{모두 ? t('조건에 맞는 {전체}건을 모두 선택했습니다', { 전체 }) : t('이 페이지 {수}건을 모두 선택했습니다', { 수: 보일수 })}</span>{' '}
        <button type="button" className="linklike" onClick={모두 ? on풀기 : on모두}>
          {모두 ? t('선택 해제') : t('조건에 맞는 {전체}건 모두 선택', { 전체 })}
        </button>
      </p>
      {!실행넘침 ? null : <p className="hint">{t(테스트만 ? '시험 실행은 앞 {한계}건까지만 담습니다' : '실행은 앞 {한계}건까지만 담습니다', { 한계: 담기한계 })}</p>}
      {!삭제넘침 ? null : <p className="hint">{t('모두 선택하면 삭제 요청은 보낼 수 없습니다(한 번에 {상한}건까지)', { 상한: 고치기상한 })}</p>}
    </div>
  );
}

/**
 * 하나라도 고르면 목록 아래 가운데에 뜬다. 고른 것으로 하는 일은 여기에만 있다 —
 * 머리의 실행 단추는 늘 「조건에 맞는 N건 실행」이라 같은 일을 하는 단추가 두 자리에 서지 않는다
 */
export function 고르기바({
  뽑기,
  전체,
  service,
  할수,
  on풀기,
}: {
  뽑기: ReturnType<typeof useRunPick>;
  전체: number;
  service: string;
  할수: 판정;
  /** 고르기를 비우고 포커스를 옮긴다. 바가 사라지면 누른 단추도 사라진다 */
  on풀기: () => void;
}) {
  const t = use말();
  const 수 = 뽑기.모두 ? 전체 : 뽑기.고른.size;
  // 휴대폰 바는 아래 탭 자리를 덮고 단추가 같은 폭으로 나란하다 — 긴 글은 단추를 밀어내 「모두 N건」으로 줄인다 (DESIGN.md 「고르기 바」)
  const 휴대폰 = use휴대폰();
  // PC · 모바일로 나눠 돌리는 것은 웹 애플리케이션뿐이다. 앱 · 게임 · API 는 디바이스가 하나라 단추도 하나다
  const 나눠도나 = 종류(use지금앱()?.kind).디바이스칩;
  const 시험만 = 테스트만인가(할수);
  // 고른 것으로 할 일이 하나도 없는 사람에게는 마지막 줄을 가리는 빈 바를 띄우지 않는다
  if (수 === 0 || (!할수('테스트실행') && !할수('작성요청'))) return null;
  return (
    <div className="pick-bar" role="toolbar" aria-label={t('선택한 케이스')}>
      <span>{뽑기.모두 ? (휴대폰 ? t('모두 {수}건', { 수 }) : t('조건에 맞는 {수}건 모두 선택', { 수 })) : t('{수}건 선택', { 수 })}</span>
      {/* 실행 칸이 trial 이면 같은 창이 테스트 실행만 연다 (도메인/인증 §3.5 「테스트 모드」) */}
      {!할수('테스트실행') || !나눠도나 ? null : 웹디바이스.map((디바이스) => {
        // 「조건에 맞는 전부」는 손에 줄이 없어 셀 수 없다 — 건수 없이 단다. 고른 것 중 그 디바이스가 없으면 단추를 안 세운다
        const 몇 = [...뽑기.고른.values()].filter((row) => row.platforms.includes(디바이스)).length;
        if (!뽑기.모두 && 몇 === 0) return null;
        const 이름 = t(PLATFORM_LABEL[디바이스]);
        return (
          <button key={디바이스} type="button" className="btn ghost" onClick={() => void 뽑기.고른모으기(디바이스)} disabled={뽑기.모으는중}>
            {뽑기.모두
              ? t(시험만 ? '{디바이스} 시험 실행' : '{디바이스} 실행', { 디바이스: 이름 })
              : t(시험만 ? '{디바이스} {수}건 시험 실행' : '{디바이스} {수}건 실행', { 디바이스: 이름, 수: 몇 })}
          </button>
        );
      })}
      {!할수('테스트실행') ? null : (
        <button type="button" className="btn" onClick={() => void 뽑기.고른모으기()} disabled={뽑기.모으는중}>
          {나눠도나 ? t(시험만 ? '모두 시험 실행' : '모두 실행') : t(시험만 ? '시험 실행' : '실행')}
        </button>
      )}
      <button type="button" className="btn ghost" onClick={on풀기}>
        {t('선택 해제')}
      </button>
      {/* 삭제 요청은 작성 쓰기일 때만 (도메인/작성 §3.6 「★ 케이스 고치기」).
          되돌리기 어려운 일이라 실행 단추와 떼어 맨 끝 구분선 뒤에 둔다 — 「모두 실행」을 누르려던 손이 닿지 않게 (2026-11-06 시험 D10) */}
      {!할수('작성요청') ? null : (
        <>
          <span className="pick-bar-sep" aria-hidden="true" />
          {뽑기.모두 ? (
            // ponytail: 띠는 한 쪽(50)을 넘을 때만 서고 삭제 상한도 50 이라 모두로는 늘 넘친다. 쪽 크기를 키우면 여기서 모아 보내게 고친다
            <button type="button" className="btn ghost" disabled>
              {t('삭제 요청')}
            </button>
          ) : (
            <고른것고치기 service={service} 고른={뽑기.고른} 다되면={on풀기} />
          )}
        </>
      )}
    </div>
  );
}
