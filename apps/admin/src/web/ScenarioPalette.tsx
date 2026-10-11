// E2E 시나리오 조립 화면 「단계 추가」 탭 속 — 다음 단계 추천 · 기능 테스트 스크립트 팔레트(기능 묶음 · 정상 먼저 · 요구 줄) · 다른 단계 넷 · 케이스 바꾸기 모드 (도메인/시나리오 §8.11)

import { useEffect, useState, type ReactNode } from 'react';
import type { ScenarioPart } from '@platform/kit';

import { api, type CaseRow, type Platform } from './api.js';
import { 요구줄 } from './CaseListContext.js';
import { use말, use언어 } from './i18n.js';
import { scenarioApi, type NextCase } from './scenarioApi.js';
import { 추천줄들, 팔레트차례 } from './scenarioView.js';
import { Failed, Loading, message, PLATFORM_LABEL } from './ui.js';

export type 다른단계 = Exclude<ScenarioPart, { kind: 'case' }>;

// 묶음 이름이 빈 글자일 때와 묶음 없음(null)을 가르려고 JSON 으로 잇는다
const 열쇠 = (칸: 'group' | 'rest', feature: string | null) => JSON.stringify([칸, feature]);

// ponytail: 20쪽(1000건) 상한. 넘는 서비스가 생기면 서버 찾기로 바꾼다
const 쪽상한 = 20;

interface 읽은것 {
  목록: CaseRow[];
  잘림: boolean;
  /** 서비스가 PRD 를 쓰나 — 서버 hasFeatures. 검색 조건 · 쪽을 안 따른다 */
  PRD씀: boolean;
}

async function 모으기(service: string, 끊겼나: () => boolean): Promise<읽은것> {
  const 목록: CaseRow[] = [];
  let PRD씀 = false;
  for (let page = 1; page <= 쪽상한; page += 1) {
    const 쪽 = await api.cases({ service, kind: 'FN', page });
    목록.push(...쪽.items);
    PRD씀 ||= 쪽.hasFeatures === true;
    if (끊겼나() || 쪽.items.length === 0 || 쪽.items.length < 쪽.pageSize) return { 목록, 잘림: false, PRD씀 };
  }
  return { 목록, 잘림: true, PRD씀 };
}

const 다른단계들: { 이름: string; 단계: () => 다른단계 }[] = [
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
  서비스: string;
  디바이스: Platform;
  /** 케이스 바꾸기로 들어온 단계 번호. null 이면 맨 끝에 더하는 보통 모드 */
  바꿀번호: number | null;
  /** 추천 기준인 맨 뒤 케이스 단계. 없거나 케이스 바꾸기 중이면 null — 추천 칸을 안 그린다 */
  뒤: { tcId: string; 번호: number } | null;
  on케이스: (tcId: string) => void;
  on다른단계: (part: 다른단계) => void;
  on바꾸기취소: () => void;
}

export function ScenarioPalette({ 서비스, 디바이스, 바꿀번호, 뒤, on케이스, on다른단계, on바꾸기취소 }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [읽음, set읽음] = useState<읽은것 | null>(null);
  const [오류, set오류] = useState<string | null>(null);
  // 어느 단계 기준 추천인지 같이 쥔다 — 단계를 더한 직후 한 번 그릴 때 앞 기준 추천이 새 머리 아래 보이지 않게
  const [추천, set추천] = useState<{ 기준: string; items: NextCase[] } | null>(null);
  const [추천오류, set추천오류] = useState<string | null>(null);
  const [찾기, set찾기] = useState('');
  const [펼친, set펼친] = useState<ReadonlySet<string>>(new Set());
  const 뒤집기 = (키: string) =>
    set펼친((전) => {
      const 다음 = new Set(전);
      if (!다음.delete(키)) 다음.add(키);
      return 다음;
    });

  useEffect(() => {
    let 끊김 = false;
    set읽음(null);
    set오류(null);
    // 묶음 이름으로 펼침을 기억한다 — 다른 서비스의 같은 이름 묶음이 펴진 채 열리지 않게 비운다
    set펼친(new Set());
    모으기(서비스, () => 끊김).then(
      (값) => {
        if (!끊김) set읽음(값);
      },
      (err: unknown) => {
        if (!끊김) set오류(message(err, 언어));
      },
    );
    return () => {
      // 서비스가 바뀌거나 탭을 떠난 뒤 늦게 온 쪽이 다른 목록을 덮지 않게 한다
      끊김 = true;
    };
  }, [서비스, 언어]);

  const 뒤번호 = 뒤?.tcId ?? null;
  useEffect(() => {
    let 끊김 = false;
    set추천(null);
    set추천오류(null);
    if (뒤번호 === null) return;
    scenarioApi.nextCases(서비스, 뒤번호).then(
      (값) => {
        if (!끊김) set추천({ 기준: 뒤번호, items: 값.items });
      },
      (err: unknown) => {
        if (!끊김) set추천오류(message(err, 언어));
      },
    );
    return () => {
      // 단계를 잇달아 더하면 앞 단계 기준 추천이 늦게 와서 덮을 수 있다
      끊김 = true;
    };
  }, [서비스, 뒤번호, 언어]);

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

  const 추천칸 =
    읽음 === null || 추천 === null || 추천.기준 !== 뒤번호 ? [] : 추천줄들(읽음.목록, 디바이스, PRD씀, 추천.items).filter((x) => 걸린(x.row));

  const 줄 = (c: CaseRow, 이어짐?: string) => (
    <li key={c.tcId} className="scn-pal-row">
      <span className="scn-pal-id">{c.tcId}</span>
      <span className="scn-pal-name">{c.name}</span>
      {typeof c.unconfirmed === 'string' ? <span className="case-tag">{t('미확정')}</span> : null}
      <button type="button" className="btn ghost" onClick={() => on케이스(c.tcId)}>
        {t('{번호} 더하기', { 번호: c.tcId })}
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
      {바꿀번호 === null ? (
        <div className="scn-link-kinds">
          {다른단계들.map((x) => (
            <button key={x.이름} type="button" className="btn ghost" onClick={() => on다른단계(x.단계())}>
              {t(x.이름)}
            </button>
          ))}
        </div>
      ) : (
        <div className="scn-pal-swap">
          <p className="scn-set-sub">{t('{번호}번 단계를 바꿀 케이스를 고릅니다', { 번호: 바꿀번호 })}</p>
          <button type="button" className="btn ghost" onClick={on바꾸기취소}>
            {t('취소')}
          </button>
        </div>
      )}

      {오류 !== null ? (
        <Failed error={오류} />
      ) : 읽음 === null || 차례 === null ? (
        <Loading />
      ) : 읽음.목록.length === 0 ? (
        <p className="scn-set-note">{t('이 서비스에는 단계로 쓸 기능 테스트 스크립트가 없습니다')}</p>
      ) : (
        <>
          {추천오류 !== null ? (
            <Failed error={추천오류} />
          ) : 뒤 === null || 추천칸.length === 0 ? null : (
            <section className="scn-pal-rec" aria-label={t('다음 단계 추천')}>
              <h3 className="scn-set-sub">
                {t('다음 단계 추천')}
                <span className="scn-pal-count">
                  {t('{번호}번 단계가 머무는 화면에서 이어지는 정상 케이스 {수}', { 번호: 뒤.번호, 수: 추천칸.length })}
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
                <p className="scn-set-note">{t('경계값 · 동등 분할 · 결정 테이블만 사용')}</p>
                {!펴졌나('rest', null) ? null : <ul className="scn-pal-list">{(묶음들[0]?.입력값 ?? []).map((c) => 줄(c))}</ul>}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
