// 대시보드 「E2E 시나리오 최근 결과」 · 「결정 필요」 목록 (도메인/리포팅 §8.12 「프로젝트 요약」)

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { 짧은시각 } from './dashboardView.js';
import { 서비스를열며 } from './DashboardPick.js';
import { 떠오름 } from './DashboardTop.js';
import { use말, use언어 } from './i18n.js';
import { 결정필요주소 } from './route.js';
import { PLATFORM_LABEL } from './ui.js';

type 자료 = 대시보드응답;

const 판정칩: Record<string, [string, string]> = { PASS: ['p', '통과'], FAIL: ['f', '실패'], NA: ['n', '미실행'] };

export function E2E칸({ 값 }: { 값: 자료 }) {
  const t = use말();
  const 언어 = use언어();
  const { recent } = 값.project.e2e;
  return (
    <section className="dash-panel dash-rise" style={떠오름(9)}>
      <div className="dash-h2">
        <h2>{t('E2E 시나리오 최근 결과')}</h2>
        <span className="dash-lab">{t('시나리오마다 가장 최근 결과 하나 · 최근 {수}개', { 수: recent.length })}</span>
      </div>
      {recent.length === 0 ? (
        <p className="dash-calm">{t('아직 실행한 E2E 시나리오가 없습니다')}</p>
      ) : (
        <div>
          {recent.map((s, i) => {
            const [칩, 글] = 판정칩[s.verdict] ?? ['n', '미실행'];
            return (
              <a key={s.scenarioId} className="dash-scn" href={`#/runs/${s.runId}`}>
                <span className="mono dash-lab">SC-{s.scenarioId}</span>
                <span className="dash-cut" style={{ fontWeight: 600 }} title={s.name}>
                  {s.name}
                </span>
                <span className="dash-lab hide hide2 dash-cut">
                  {s.platform === 'mobile' ? `${s.serviceName} · ${t(PLATFORM_LABEL.mobile)}` : s.serviceName}
                </span>
                {/* 실패한 단계 자리는 데이터로 확인될 때만 그린다 — 지금은 줄 전체를 판정 모양으로 */}
                <div className={s.verdict === 'FAIL' ? 'dash-chain F hide2' : 'dash-chain hide2'} aria-label={t('단계 {수}개', { 수: s.steps })} role="img">
                  {Array.from({ length: Math.max(1, s.steps) }, (_, k) => (
                    <i key={k} />
                  ))}
                  {s.verdict === 'PASS' ? <span className="mv" style={{ animationDelay: `${String(i * 0.6)}s` }} /> : null}
                </div>
                <span className="mono dash-lab hide hide2" style={{ textAlign: 'right' }}>
                  {짧은시각(s.finishedAt, 언어)}
                </span>
                <span className={`dash-chip ${칩}`} style={{ justifySelf: 'end' }}>
                  {t(글)}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** 글이 없는 결정 갈래의 한 줄 — 결정 목록 화면의 카드가 그 일을 자세히 보인다 (도메인/작성 §3.6 「★ 결정 목록」) */
const 갈래글: Record<string, string> = {
  APPLY: '작성 결과 반영 확인',
  FIX: '작성 결과 수정 필요',
  PRD_CHANGED: '기획서에서 변경된 요구사항의 테스트를 다시 만들까요?',
  API_CHANGED: '변경된 API 의 테스트를 다시 만들까요?',
  SCREENS: '테스트가 확인하지 않은 화면이 있습니다',
  APIS: '테스트가 호출하지 않은 API',
  PRD_DRAFT: 'PRD 초안 확인',
};

export function 결정칸({ 값, 서비스열기 }: { 값: 자료; 서비스열기: (id: number) => void }) {
  const t = use말();
  const 수 = 값.decisions.reduce((n, d) => n + d.count, 0);
  const 앱 = new Map(값.project.apps.map((a) => [a.serviceId, a]));
  const 줄들 = 값.project.decisionItems;
  return (
    <section className="dash-panel dash-rise" style={떠오름(17)}>
      <div className="dash-h2">
        <h2>{t('결정 필요')}</h2>
        <b className="num" style={{ fontSize: 20, color: 'var(--link)' }}>
          {수}
        </b>
        <span className="dash-lab dash-r">{t('기획서와 실제 화면이 다른 곳')}</span>
      </div>
      {줄들.length === 0 ? (
        <p className="dash-calm good">{t('결정할 것이 없습니다')}</p>
      ) : (
        <div className="dash-list">
          {줄들.map((x, i) => {
            const 그앱 = 앱.get(x.serviceId);
            return (
              <a
                key={i}
                className="dash-li dec"
                href={그앱 === undefined ? '#/authoring?todo=1' : 결정필요주소(그앱.prefix)}
                {...서비스를열며(서비스열기, x.serviceId)}
              >
                <span className="dash-lab dash-cut">{그앱?.name ?? ''}</span>
                <span className="dash-cut">{x.text ?? t(갈래글[x.kind] ?? '결정 필요')}</span>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
