// E2E 마법사 본문 「단계」 — 왼쪽 지금 순서, 오른쪽 첫 단계 · 다음 단계 추천 · 케이스 찾기 · 다른 단계. 찾기 · 추천 거르기는 조립 화면 팔레트와 같다 (도메인/시나리오 §8.11 「마법사」)

import { useEffect, useState } from 'react';
import type { ScenarioPart } from '@platform/kit';

import type { CaseRow, Platform } from './api.js';
import { use말, use언어 } from './i18n.js';
import { ScenarioOtherPanel } from './ScenarioOtherPanel.js';
import { 다른단계들 } from './ScenarioPalette.js';
import { 단계디바이스, 단계디바이스안내, 뒤케이스, 빼기, 순서바꾸기, 종류글, 추천줄들, 카드요약, 케이스접두사, 팔레트차례, type 앱줄 } from './scenarioView.js';
import { Failed, Loading } from './ui.js';
import { use단계추천, use케이스목록 } from './useScenarioCases.js';

/** 단계 줄에 보일 케이스 이름과 머무는 화면. 목록에서 읽었거나 AI 후보가 준 것 */
export type 케이스줄들 = ReadonlyMap<string, { name: string; screens: string[] }>;

// 마법사는 끄기를 따로 안 낸다 — 켠 모킹은 시나리오 끝까지 간다(결정 6). 끄기는 조립 화면에서 한다
const 마법사다른단계 = 다른단계들.filter((x) => x.이름 !== '모킹 끄기');

const 화면들 = (c: CaseRow): string[] => (c.screens ?? []).flatMap((s) => (s.url === null ? [] : [s.url]));

interface Props {
  시작: string;
  앱들: readonly 앱줄[];
  디바이스: Platform;
  단계들: ScenarioPart[];
  on단계들: (parts: ScenarioPart[]) => void;
  케이스줄: 케이스줄들;
  on읽음: (rows: CaseRow[]) => void;
}

export function 단계칸({ 시작, 앱들, 디바이스, 단계들, on단계들, 케이스줄, on읽음 }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [고른앱, set고른앱] = useState(시작);
  const [찾기, set찾기] = useState('');
  const { 읽음, 오류 } = use케이스목록(고른앱);
  useEffect(() => {
    if (읽음 !== null) on읽음(읽음.목록);
  }, [읽음, on읽음]);

  // 추천의 재료(화면 연결)는 애플리케이션 하나 안의 것이라 맨 뒤 케이스와 같은 애플리케이션일 때만 묻는다. 케이스 단계가 없으면 첫 단계 후보다(결정 15)
  const 뒤 = 뒤케이스(단계들);
  const 뒤번호 = 뒤 !== null && 케이스접두사(뒤.tcId) === 고른앱 ? 뒤.tcId : null;
  const 추천 = use단계추천(고른앱, 뒤 === null ? '' : 뒤번호);

  const PRD씀 = 읽음?.PRD씀 ?? false;
  // 섞은 앱 · 게임 케이스는 폰에서, android 시나리오의 웹 케이스는 PC 로 돈다 (도메인/시나리오 §3.7 결정 16)
  const 도는디바이스 = 단계디바이스(앱들, 고른앱, 디바이스);
  const 디바이스안내 = 단계디바이스안내(도는디바이스, 디바이스);
  const 소문자 = 찾기.trim().toLowerCase();
  const 걸린 = (c: CaseRow) =>
    소문자 === '' || [c.tcId, c.name, ...(c.reqs ?? []).flatMap((r) => [r.reqId, r.text ?? ''])].join(' ').toLowerCase().includes(소문자);
  const 추천칸 = 읽음 === null || 추천.items === null ? null : 추천줄들(읽음.목록, 도는디바이스, PRD씀, 추천.items).filter((x) => 걸린(x.row));
  const 찾은 =
    읽음 === null || 소문자 === '' ? [] : 팔레트차례(읽음.목록, 도는디바이스, PRD씀).묶음들.flatMap((g) => [...g.흐름, ...g.입력값]).filter(걸린);

  const 넣기 = (part: ScenarioPart) => on단계들([...단계들, part]);
  const 줄 = (c: CaseRow) => (
    <li key={c.tcId} className="scw-rrow">
      <span className="scw-t">
        <b>{c.name}</b>
        <span className="scw-to">{[c.tcId, ...화면들(c)].join(' · ')}</span>
      </span>
      {typeof c.unconfirmed === 'string' ? <span className="case-tag">{t('미확정')}</span> : null}
      <button
        type="button"
        className="btn ghost"
        aria-label={t('{번호} 넣기', { 번호: c.tcId })}
        onClick={() => 넣기({ kind: 'case', tcId: c.tcId, params: {}, expected: {}, skipSteps: [] })}
      >
        {t('+ 넣기')}
      </button>
    </li>
  );
  const 이어짐 = [...new Set((추천칸 ?? []).map((x) => x.screen))].join(' · ');
  const 뒤이름 = 뒤 === null ? '' : (케이스줄.get(뒤.tcId)?.name ?? 뒤.tcId);

  return (
    <div className="scw-steps">
      <section className="scw-sec" aria-label={t('지금 순서')}>
        <h3 className="scw-sec-h">
          {t('지금 순서')} <small>{t('{수}단계', { 수: 단계들.length })}</small>
        </h3>
        {단계들.length === 0 ? (
          <p className="scw-empty">{t('아직 단계가 없습니다. 아래 「첫 단계 추천」에서 넣습니다')}</p>
        ) : (
          <ol className="scw-seq">
            {단계들.map((p, i) => {
              const 번호 = i + 1;
              const 줄정보 = p.kind === 'case' ? 케이스줄.get(p.tcId) : undefined;
              return (
                <li key={`${번호}-${p.kind}-${p.kind === 'case' ? p.tcId : ''}`} className="scw-srow">
                  <span className="wz-dot">{번호}</span>
                  <span className="scw-t">
                    <b>{p.kind === 'case' ? (줄정보?.name ?? p.tcId) : t(종류글[p.kind])}</b>
                    <span className="scw-to">
                      {p.kind === 'case' ? [p.tcId, ...(줄정보?.screens ?? [])].join(' · ') : 카드요약(p, undefined, 언어)}
                    </span>
                  </span>
                  <span className="scw-acts">
                    <button type="button" className="scw-icon" aria-label={t('{번호}번 위로', { 번호 })} disabled={i === 0} onClick={() => on단계들(순서바꾸기(단계들, 번호, 번호 - 1))}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="scw-icon"
                      aria-label={t('{번호}번 아래로', { 번호 })}
                      disabled={번호 === 단계들.length}
                      onClick={() => on단계들(순서바꾸기(단계들, 번호, 번호 + 1))}
                    >
                      ↓
                    </button>
                    <button type="button" className="scw-icon" aria-label={t('{번호}번 삭제', { 번호 })} onClick={() => on단계들(빼기(단계들, 번호))}>
                      ✕
                    </button>
                  </span>
                  {p.kind === 'case' ? null : (
                    <div className="scw-set">
                      <ScenarioOtherPanel
                        번호={번호}
                        단계={p}
                        단계들={단계들}
                        앱들={앱들}
                        시작={시작}
                        쓰나
                        on바꿈={(새단계) => on단계들(단계들.map((x, j) => (j === i ? 새단계 : x)))}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="scw-pick">
        {앱들.length < 2 ? null : (
          <div className="scn-pal-apps" role="group" aria-label={t('애플리케이션')}>
            {앱들.map((a) => (
              <button
                key={a.prefix}
                type="button"
                className={a.prefix === 고른앱 ? 'scn-app-pick on' : 'scn-app-pick'}
                aria-pressed={a.prefix === 고른앱}
                onClick={() => set고른앱(a.prefix)}
              >
                {a.prefix} {a.name}
              </button>
            ))}
          </div>
        )}
        {디바이스안내 === null ? null : <p className="hint">{t(디바이스안내)}</p>}
        {뒤 !== null && 뒤번호 === null ? null : (
          <section className="scw-rec" aria-label={t(뒤 === null ? '첫 단계 추천' : '다음 단계 추천')}>
            <h3 className="scw-sec-h">
              {t(뒤 === null ? '첫 단계 추천' : '다음 단계 추천')}{' '}
              <small>
                {뒤 === null
                  ? t('첫 화면에서 갈 수 있는 정상 케이스 {수}', { 수: 추천칸?.length ?? 0 })
                  : t('{번호}번 「{이름}」 다음', { 번호: 뒤.번호, 이름: 뒤이름 })}
                {뒤 === null || 이어짐 === '' ? null : (
                  <>
                    {' · '}
                    {t('이어지는 화면')} <code>{이어짐}</code>
                  </>
                )}
              </small>
            </h3>
            {추천.오류 !== null ? (
              <Failed error={추천.오류} />
            ) : 오류 !== null ? null : 추천칸 === null ? (
              <Loading />
            ) : 추천칸.length === 0 ? (
              <p className="hint">{t('이어지는 화면 기록이 없습니다. 「케이스 찾기」로 고릅니다')}</p>
            ) : (
              <ul className="scw-list">{추천칸.map((x) => 줄(x.row))}</ul>
            )}
          </section>
        )}

        <section className="scw-sec">
          <label className="scw-sec-h" htmlFor="scw-find">
            {t('케이스 찾기')}
          </label>
          <input id="scw-find" type="text" autoComplete="off" value={찾기} placeholder={t('번호나 이름으로 찾기 · 예: 쿠폰, 197')} onChange={(e) => set찾기(e.target.value)} />
          {오류 !== null ? (
            <Failed error={오류} />
          ) : 소문자 === '' ? null : 읽음 === null ? (
            <Loading />
          ) : 찾은.length === 0 ? (
            <p className="hint">{t('「{친글자}」에 맞는 케이스가 없습니다', { 친글자: 찾기.trim() })}</p>
          ) : (
            <ul className="scw-list">{찾은.map(줄)}</ul>
          )}
        </section>

        <section className="scw-sec" aria-label={t('다른 단계')}>
          <h3 className="scw-sec-h">{t('다른 단계')}</h3>
          <div className="scw-opts">
            {마법사다른단계.map((x) => (
              <button key={x.이름} type="button" className="scw-opt" onClick={() => 넣기(x.단계())}>
                {t('+ {이름}', { 이름: t(x.이름) })}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
