// 대시보드 애플리케이션 카드 — 통과율 · 판정 막대 · 요구사항 · 기능 · UI · 최근 실행 흐름 · 종류별 한 줄, 넷씩 「더보기」 (도메인/리포팅 §8.12 「프로젝트 요약」)

import { useState } from 'react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { 굴림숫자, 떠오름, 자람, 합, 수글, 퍼센트 } from './DashboardTop.js';
import { 서비스를열며 } from './DashboardPick.js';
import { use말, use언어 } from './i18n.js';
import { 아이콘 } from './icons.js';
import { 종류, 종류이름 } from './kind.js';

type 자료 = 대시보드응답;
type 앱 = 자료['project']['apps'][number];

/** 처음 보이는 카드 수이자 「더보기」 한 번에 늘어나는 수 */
export const 카드묶음 = 4;

const 몫 = (수: number, 전체: number): string => `${전체 === 0 ? 0 : (수 * 100) / 전체}%`;

/** 종류별 한 줄 — 웹 가장 느린 페이지 LCP · Android 앱 E2E 시나리오 수 · 게임 평균 FPS · API 95% 응답시간. 값이 없으면 「—」 */
function 한줄(a: 앱, t: ReturnType<typeof use말>): [string, string] {
  if (a.kind === 'APP') return [t('E2E 시나리오'), t('{수}개', { 수: a.scenarios })];
  if (a.kind === 'GAME') return [t('평균 FPS'), a.extra.fps === null ? '—' : String(a.extra.fps)];
  if (a.kind === 'API') return [t('95% 응답시간'), a.extra.p95Ms === null ? '—' : `${수글(a.extra.p95Ms)}ms`];
  const 느린 = a.extra.pageLcp;
  return [느린 === null ? t('페이지 성능 · LCP') : t('페이지 성능 · {주소} LCP', { 주소: 느린.url }), 느린 === null ? '—' : `${수글(느린.ms)}ms`];
}

function 카드({ a, 차례, 흐름, 서비스열기 }: { a: 앱; 차례: number; 흐름: ('F' | 'P' | 'N')[]; 서비스열기: (id: number) => void }) {
  const t = use말();
  const 언어 = use언어();
  const 전체 = 합(a.last);
  const 율 = 퍼센트(a.last.pass, 전체);
  const [이름, 값] = 한줄(a, t);
  return (
    <a className="dash-panel dash-app dash-rise" href="#/cases" style={떠오름(8 + (차례 % 카드묶음))} {...서비스를열며(서비스열기, a.serviceId)}>
      <div className="dash-ah">
        <span className="ico" aria-hidden="true">
          <아이콘 이름={종류(a.kind).아이콘} />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <b className="dash-cut">{a.name}</b>
          <span className="dash-lab">{종류이름(a.kind, 언어)}</span>
        </span>
        <span className="pre mono dash-lab">{a.prefix}</span>
      </div>
      {율 === null ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="num" style={{ fontSize: 32, lineHeight: 1, color: 'var(--ink-faint)' }}>—</span>
          <span className="dash-lab">{t('아직 실행한 테스트가 없습니다')}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="num" style={{ fontSize: 32, lineHeight: 1 }}>
            <굴림숫자 글={율} 늦춤={0.5 + (차례 % 카드묶음) * 0.12} />%
          </span>
          <span className="dash-lab">
            {t('통과 {통과} · 실패 {실패}', { 통과: 수글(a.last.pass), 실패: 수글(a.last.fail) })}
            {a.last.notRun > 0 ? <> · {t('미실행 {수}', { 수: 수글(a.last.notRun) })}</> : null}
          </span>
        </div>
      )}
      <div className="dash-stack dash-grow" style={{ ...자람(차례 % 카드묶음), height: 8 }} aria-hidden="true">
        <i className="p" style={{ width: 몫(a.last.pass, 전체) }} />
        <i className="f" style={{ width: 몫(a.last.fail, 전체) }} />
        <i className="n" style={{ width: 몫(a.last.notRun, 전체) }} />
      </div>
      <div className="dash-kv">
        <div>
          <div className="dash-lab">{t('요구사항')}</div>
          <div className="v num">{a.prd === null ? '—' : 수글(a.prd.requirements)}</div>
        </div>
        <div>
          <div className="dash-lab">{t('기능')}</div>
          <div className="v num">{수글(a.cases.fn)}</div>
        </div>
        <div>
          <div className="dash-lab">UI</div>
          <div className="v num">{수글(a.cases.ui)}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="dash-lab">{t('최근 실행 {수}회', { 수: 흐름.length })}</span>
        <div className="dash-dots" aria-hidden="true">
          {흐름.map((칸, i) => (
            <i key={i} className={칸} />
          ))}
        </div>
      </div>
      <div className="dash-extra">
        <span className="dash-lab dash-cut">{이름}</span>
        <span style={{ fontWeight: 600 }}>{값}</span>
      </div>
    </a>
  );
}

export function 앱카드들({ 값, 서비스열기 }: { 값: 자료; 서비스열기: (id: number) => void }) {
  const t = use말();
  const [보임, set보임] = useState(카드묶음);
  const 앱들 = 값.project.apps;
  const 흐름 = new Map(값.byService.map((s) => [s.serviceId, s.flow]));
  const 남음 = 앱들.length - 보임;
  return (
    <>
      <div className="dash-sec dash-rise" style={떠오름(7)}>
        <h2>{t('애플리케이션 {수}개', { 수: 앱들.length })}</h2>
        <span className="dash-lab">{t('케이스마다 마지막 결과 · 흐름은 최근 실행 (초록 통과 · 빨강 실패가 있음 · 회색 그 밖)')}</span>
      </div>
      <div className="dash-apps">
        {앱들.slice(0, 보임).map((a, i) => (
          <카드 key={a.serviceId} a={a} 차례={i} 흐름={흐름.get(a.serviceId) ?? []} 서비스열기={서비스열기} />
        ))}
      </div>
      {남음 > 0 ? (
        <div className="dash-more">
          <button type="button" className="btn" onClick={() => set보임(보임 + 카드묶음)}>
            {t('더보기 ({수})', { 수: 남음 })}
          </button>
        </div>
      ) : null}
    </>
  );
}
