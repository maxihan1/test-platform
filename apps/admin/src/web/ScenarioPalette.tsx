// E2E 시나리오 조립 화면 「단계 추가」 탭 속 — 다음 단계 추천 · 기능 테스트 스크립트 팔레트(기능 묶음 · 정상 먼저 · 요구 줄) · 다른 단계 넷 · 케이스 바꾸기 모드 (도메인/시나리오 §8.11)

import { useState, type ReactNode } from 'react';
import type { ScenarioPart } from '@platform/kit';

import type { CaseRow, Platform } from './api.js';
import { 요구줄 } from './CaseListContext.js';
import { use말 } from './i18n.js';
import { 추천줄들, 케이스접두사, 팔레트차례, type 앱줄 } from './scenarioView.js';
import { Failed, Loading, PLATFORM_LABEL } from './ui.js';
import { use단계추천, use케이스목록 } from './useScenarioCases.js';

export type 다른단계 = Exclude<ScenarioPart, { kind: 'case' }>;

// 묶음 이름이 빈 글자일 때와 묶음 없음(null)을 가르려고 JSON 으로 잇는다
const 열쇠 = (칸: 'group' | 'rest', feature: string | null) => JSON.stringify([칸, feature]);

export const 다른단계들: { 이름: string; 단계: () => 다른단계 }[] = [
  { 이름: 'API 호출', 단계: () => ({ kind: 'api', method: 'GET', path: '/', expectStatus: 200 }) },
  {
    이름: '모킹 켜기',
    단계: () => ({ kind: 'mock', urlPattern: '**/api/**', status: 200, contentType: 'application/json', body: '{}' }),
  },
  // 빈 무늬로 두어 「N번 설정」 패널이 앞에서 켠 무늬를 고르게 한다
  { 이름: '모킹 끄기', 단계: () => ({ kind: 'unmock', urlPattern: '' }) },
  { 이름: '대기§단계', 단계: () => ({ kind: 'wait', ms: 1000 }) },
];

interface Props {
  /** 시나리오 서비스 — 처음 열면 이 칩이 골라져 있다 */
  서비스: string;
  /** 같은 프로젝트의 애플리케이션 (도메인/시나리오 §8.11). 하나뿐이면 칩 줄을 안 그린다 */
  앱들?: readonly 앱줄[];
  디바이스: Platform;
  /** 케이스 바꾸기로 들어온 단계 번호. null 이면 맨 끝에 더하는 보통 모드 */
  바꿀번호: number | null;
  /** 추천 기준인 맨 뒤 케이스 단계. 없거나 케이스 바꾸기 중이면 null — 추천 칸을 안 그린다 */
  뒤: { tcId: string; 번호: number } | null;
  on케이스: (tcId: string) => void;
  on다른단계: (part: 다른단계) => void;
  on바꾸기취소: () => void;
}

export function ScenarioPalette({ 서비스, 앱들 = [], 디바이스, 바꿀번호, 뒤, on케이스, on다른단계, on바꾸기취소 }: Props) {
  const t = use말();
  // 한 번에 한 애플리케이션의 케이스만 목록에 뜬다. 시나리오 서비스가 바뀌면 그 서비스로 돌아간다
  const [고른앱, set고른앱] = useState(서비스);
  const [앞서비스, set앞서비스] = useState(서비스);
  const [찾기, set찾기] = useState('');
  const [펼친, set펼친] = useState<ReadonlySet<string>>(new Set());
  // 묶음 이름으로 펼침을 기억한다 — 다른 서비스의 같은 이름 묶음이 펴진 채 열리지 않게 앱을 바꿀 때 비운다
  const 앱바꿈 = (앱: string) => {
    set고른앱(앱);
    set펼친(new Set());
  };
  if (앞서비스 !== 서비스) {
    set앞서비스(서비스);
    앱바꿈(서비스);
  }
  const { 읽음, 오류 } = use케이스목록(고른앱);
  const 뒤집기 = (키: string) =>
    set펼친((전) => {
      const 다음 = new Set(전);
      if (!다음.delete(키)) 다음.add(키);
      return 다음;
    });

  // 추천의 재료(화면 연결)는 애플리케이션 하나 안의 것이다 — 맨 뒤 케이스와 같은 애플리케이션 칩일 때만 뜬다.
  // 케이스 단계가 없으면 첫 단계 후보다(결정 15). 케이스 바꾸기 중에는 맨 뒤 기준 추천이 안 맞아 묻지 않는다
  const 첫단계 = 뒤 === null && 바꿀번호 === null;
  const 뒤번호 = 뒤 !== null && 케이스접두사(뒤.tcId) === 고른앱 ? 뒤.tcId : null;
  const 추천 = use단계추천(고른앱, 첫단계 ? '' : 뒤번호);

  const PRD씀 = 읽음?.PRD씀 ?? false;
  const 차례 = 읽음 === null ? null : 팔레트차례(읽음.목록, 디바이스, PRD씀);
  const 소문자 = 찾기.trim().toLowerCase();
  const 찾는중 = 소문자 !== '';
  const 걸린 = (c: CaseRow) =>
    !찾는중 || [c.tcId, c.name, ...(c.reqs ?? []).flatMap((r) => [r.reqId, r.text ?? ''])].join(' ').toLowerCase().includes(소문자);
  const 묶음들 = (차례?.묶음들 ?? [])
    .map((g) => ({ ...g, 흐름: g.흐름.filter(걸린), 입력값: g.입력값.filter(걸린) }))
    .filter((g) => !찾는중 || g.흐름.length + g.입력값.length > 0);
  // 찾는 동안은 접힌 것도 편다 — 안 펴면 걸린 케이스가 접힌 묶음 안에 숨는다. PRD 를 안 쓰는 서비스는 지금 모양 그대로 둔다
  const 다폄 = 찾는중 && PRD씀;
  const 펴졌나 = (칸: 'group' | 'rest', feature: string | null) => 다폄 || 펼친.has(열쇠(칸, feature));

  const 추천칸 = 읽음 === null || 추천.items === null ? [] : 추천줄들(읽음.목록, 디바이스, PRD씀, 추천.items).filter((x) => 걸린(x.row));

  const 줄 = (c: CaseRow, 이어짐?: string) => (
    <li key={c.tcId} className="scn-pal-row">
      <span className="scn-pal-id">{c.tcId}</span>
      <span className="scn-pal-name">{c.name}</span>
      {typeof c.unconfirmed === 'string' ? <span className="case-tag">{t('미확정')}</span> : null}
      <button type="button" className="btn ghost" onClick={() => on케이스(c.tcId)}>
        {t('{번호} 추가', { 번호: c.tcId })}
      </button>
      {/* 번호에 고리를 달지 않는다 — 누르면 저장 안 한 조립을 두고 「PRD 관리」로 떠난다 */}
      {PRD씀 ? <요구줄 row={c} 요구보나={false} 요구쓰나 /> : null}
      {이어짐 === undefined ? null : (
        <span className="scn-pal-goes">
          {t('이어지는 화면')} <code>{이어짐}</code>
        </span>
      )}
    </li>
  );

  const 접는단추 = (칸: 'group' | 'rest', feature: string | null, 글: ReactNode) => (
    <button
      type="button"
      className="scn-pal-fold"
      aria-expanded={펴졌나(칸, feature)}
      // disabled 를 쓰지 않는다 — 탭 차례에서 빠져 찾는 동안 묶음 머리와 건수를 키보드로 못 읽는다
      aria-disabled={다폄 || undefined}
      onClick={() => {
        if (!다폄) 뒤집기(열쇠(칸, feature));
      }}
    >
      {글}
    </button>
  );

  return (
    <div className="scn-palette">
      {바꿀번호 === null ? null : (
        <div className="scn-pal-swap">
          <p className="scn-set-sub">{t('{번호}번 단계를 바꿀 케이스를 고릅니다', { 번호: 바꿀번호 })}</p>
          <button type="button" className="btn ghost" onClick={on바꾸기취소}>
            {t('취소')}
          </button>
        </div>
      )}

      {앱들.length < 2 ? null : (
        <div className="scn-pal-apps" role="group" aria-label={t('애플리케이션')}>
          {앱들.map((a) => (
            <button
              key={a.prefix}
              type="button"
              className={a.prefix === 고른앱 ? 'scn-app-pick on' : 'scn-app-pick'}
              aria-pressed={a.prefix === 고른앱}
              onClick={() => 앱바꿈(a.prefix)}
            >
              {a.prefix} {a.name}
            </button>
          ))}
        </div>
      )}

      {오류 !== null ? (
        <Failed error={오류} />
      ) : 읽음 === null || 차례 === null ? (
        <Loading />
      ) : 읽음.목록.length === 0 ? (
        <p className="scn-set-note">{t('이 애플리케이션에는 단계로 쓸 기능 테스트 스크립트가 없습니다')}</p>
      ) : (
        <>
          {추천.오류 !== null ? (
            <Failed error={추천.오류} />
          ) : 추천칸.length === 0 ? null : (
            <section className="scn-pal-rec" aria-label={t(첫단계 ? '첫 단계 추천' : '다음 단계 추천')}>
              <h3 className="scn-set-sub">
                {t(첫단계 ? '첫 단계 추천' : '다음 단계 추천')}
                <span className="scn-pal-count">
                  {뒤 === null
                    ? t('첫 화면에서 갈 수 있는 정상 케이스 {수}', { 수: 추천칸.length })
                    : t('{번호}번 단계가 머무는 화면에서 이어지는 정상 케이스 {수}', { 번호: 뒤.번호, 수: 추천칸.length })}
                </span>
              </h3>
              <ul className="scn-pal-list">{추천칸.map((x) => 줄(x.row, x.screen))}</ul>
            </section>
          )}
          <label className="scn-pal-find">
            <span className="scn-set-sub">{t('케이스 찾기')}</span>
            <input type="text" value={찾기} onChange={(e) => set찾기(e.target.value)} />
          </label>
          {!읽음.잘림 ? null : (
            <p className="scn-set-note">{t('케이스가 많아 앞 {수}건만 보입니다. 찾기로 좁힙니다', { 수: 읽음.목록.length })}</p>
          )}
          {차례.뺀수 === 0 ? null : (
            <p className="scn-set-note">
              {t('{디바이스}에서 돌지 않는 케이스 {수}건은 뺐습니다', { 디바이스: t(PLATFORM_LABEL[디바이스]), 수: 차례.뺀수 })}
            </p>
          )}
          {PRD씀 ? (
            묶음들.length === 0 ? (
              <p className="scn-set-note">{t('「{친글자}」에 맞는 케이스가 없습니다', { 친글자: 찾기.trim() })}</p>
            ) : (
              묶음들.map((g) => (
                <section key={열쇠('group', g.feature)} className="scn-pal-group scn-pal-feature">
                  <h3 className="scn-set-sub">
                    {접는단추(
                      'group',
                      g.feature,
                      <>
                        {g.feature ?? t('기능 묶음 없음')}
                        <span className="scn-pal-count">
                          {t('정상 {정상} · 경계 · 예외 {나머지}', { 정상: g.흐름.length, 나머지: g.입력값.length })}
                        </span>
                      </>,
                    )}
                  </h3>
                  {!펴졌나('group', g.feature) ? null : (
                    <>
                      <ul className="scn-pal-list">{g.흐름.map((c) => 줄(c))}</ul>
                      {g.입력값.length === 0 ? null : (
                        <div className="scn-pal-sub">
                          {접는단추('rest', g.feature, t('경계 · 예외 케이스 {수}', { 수: g.입력값.length }))}
                          {!펴졌나('rest', g.feature) ? null : <ul className="scn-pal-list">{g.입력값.map((c) => 줄(c))}</ul>}
                        </div>
                      )}
                    </>
                  )}
                </section>
              ))
            )
          ) : (
            <>
              <section className="scn-pal-group">
                <h3 className="scn-set-sub">{t('업무 흐름 케이스')}</h3>
                <p className="scn-set-note">{t('상태 전이 사용 또는 기법 표시 없음')}</p>
                <ul className="scn-pal-list">{(묶음들[0]?.흐름 ?? []).map((c) => 줄(c))}</ul>
              </section>
              <section className="scn-pal-group">
                <h3 className="scn-set-sub">
                  {접는단추('rest', null, t('입력값 검증 케이스 {수}', { 수: 묶음들[0]?.입력값.length ?? 0 }))}
                </h3>
                <p className="scn-set-note">{t('경계값 · 동등 분할 · 결정 테이블 · 오류 추정만 사용')}</p>
                {!펴졌나('rest', null) ? null : <ul className="scn-pal-list">{(묶음들[0]?.입력값 ?? []).map((c) => 줄(c))}</ul>}
              </section>
            </>
          )}
        </>
      )}

      {/* 케이스를 고르는 일이 대부분이라 드물게 쓰는 단계는 목록 아래에 둔다 (점검 10.7) */}
      {바꿀번호 !== null ? null : (
        <section className="scn-pal-group" aria-label={t('다른 단계')}>
          <h3 className="scn-set-sub">{t('다른 단계')}</h3>
          <div className="scn-link-kinds">
            {다른단계들.map((x) => (
              <button key={x.이름} type="button" className="btn ghost" onClick={() => on다른단계(x.단계())}>
                {t(x.이름)}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
