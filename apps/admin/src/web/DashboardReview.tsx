// 대시보드 맨 위 「검토할 것」 세 칸 — 회귀 실패 · 결정 필요 · 환경 오류를 숫자 하나씩, 누르면 그 목록 (도메인/리포팅 §8.12 「검토할 것」 · DESIGN.md 「대시보드」) · 그 아래 「AI 품질」 한 줄 (도메인/BTS §8.15)

import type { ReactNode } from 'react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { use올라가기 } from './dashboardView.js';
import { 서비스를열며, 실행목록주소, 이동속성, 창실패종류, type 이동재료 } from './DashboardPick.js';
import { use말 } from './i18n.js';

/** 결정이 가장 많은 애플리케이션. 같으면 번호가 작은 것 — 여럿을 한 번에 여는 결정 목록이 없어서다 */
export function 결정갈곳(decisions: 대시보드응답['decisions']): number | null {
  const 앞 = [...decisions].filter((d) => d.count > 0).sort((a, b) => b.count - a.count || a.serviceId - b.serviceId)[0];
  return 앞?.serviceId ?? null;
}

function 칸({ 이름, 수, 설명, 색, 감싸기 }: { 이름: string; 수: number | null; 설명: string; 색: string; 감싸기: (안: ReactNode, 클래스: string) => ReactNode }) {
  const t = use말();
  const 보임 = use올라가기(수 ?? 0);
  const 안 = (
    <>
      <span className="dash-rv-name">{이름}</span>
      <span className="dash-rv-num num">
        {수 === null ? '—' : 보임}
        {수 === null ? null : <small>{t('건')}</small>}
      </span>
      <span className="dash-rv-note">{설명}</span>
    </>
  );
  return 감싸기(안, `dash-rv ${수 === null || 수 === 0 ? 'zero' : 색}`);
}

export function 검토할것({ 값, 이동, 서비스열기 }: { 값: 대시보드응답; 이동: 이동재료; 서비스열기: (serviceId: number) => void }) {
  const t = use말();
  const 회귀 = 값.byService.reduce((합, s) => 합 + s.newFailureCount, 0);
  const 결정 = 값.decisions.length === 0 ? null : 값.decisions.reduce((합, d) => 합 + d.count, 0);
  const 환경줄 = 값.failureTypes.types.find((x) => x.type === 'environment');
  const 환경 = (환경줄?.fail ?? 0) + (환경줄?.notRun ?? 0);
  const 갈곳 = 결정갈곳(값.decisions);
  // 수가 없으면 누를 것도 없다 — 칸 전체가 버튼 · 링크인 것은 수가 있을 때만이다
  const 글자 = (안: ReactNode, 클래스: string) => <div className={클래스}>{안}</div>;

  return (
    <section className="dash-slab dash-review" aria-label={t('검토할 것')}>
      <칸
        이름={t('회귀 실패')}
        수={회귀}
        설명={t('직전 실행에서는 통과')}
        색="bad"
        감싸기={(안, 클래스) =>
          회귀 === 0 ? (
            글자(안, 클래스)
          ) : (
            <button
              type="button"
              className={클래스}
              onClick={() => document.querySelector('.dash-fail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              {안}
            </button>
          )
        }
      />
      <칸
        이름={t('결정 필요')}
        수={결정}
        설명={t('테스트 작성에서 고를 것')}
        색="need"
        감싸기={(안, 클래스) =>
          갈곳 === null ? (
            글자(안, 클래스)
          ) : (
            <a className={클래스} href="#/authoring?todo=1" {...서비스를열며(서비스열기, 갈곳)}>
              {안}
            </a>
          )
        }
      />
      <칸
        이름={t('환경 오류')}
        수={환경}
        설명={t('서버 · 테스트 실행기에 닿지 못함')}
        색="ink"
        감싸기={(안, 클래스) =>
          환경 === 0 ? (
            글자(안, 클래스)
          ) : (
            // 유형으로 거르는 조건은 실행 기록에 없다 — 실패 유형 이름 고리와 같은 곳으로 보낸다
            <a className={클래스} href={실행목록주소(값.window.days, { state: 'failed' }, 창실패종류(값, true))} {...이동속성(이동)}>
              {안}
            </a>
          )
        }
      />
    </section>
  );
}

/** 「검토할 것」 아래 한 줄 — BTS 를 이은 프로젝트가 범위에 있을 때만. 누르는 곳 없이 숫자만 (도메인/BTS §8.15 「대시보드 두 숫자」) */
export function AI품질줄({ 값 }: { 값: 대시보드응답['aiQuality'] }) {
  const t = use말();
  if (값 === null) return null;
  // 내림 — 반올림하면 199/200 이 「100%」로 보여 옆 셈과 어긋난다
  const 율 = (위: number, 아래: number) => String(Math.floor((위 / 아래) * 100));
  const 초안 = 값.draft.written === 0
    ? t('초안 AI 아직 없음')
    : t('초안 AI {율}% ({고름}/{씀}줄)', { 율: 율(값.draft.picked, 값.draft.written), 고름: 값.draft.picked, 씀: 값.draft.written });
  const 수정 = 값.fix.opened === 0
    ? t('수정 AI 아직 없음')
    : t('수정 AI {율}% ({병합}/{끝남} PR)', { 율: 율(값.fix.merged, 값.fix.opened), 병합: 값.fix.merged, 끝남: 값.fix.opened });
  return (
    <p className="dash-ai">
      <span className="dash-ai-name">{t('AI 품질')}</span>
      <span className="num">{초안}</span>
      <span aria-hidden="true">·</span>
      <span className="num">{수정}</span>
    </p>
  );
}
