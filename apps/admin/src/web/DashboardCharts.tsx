// 앱 대시보드의 그래프 — 일별 누적 막대 · 통과율 선(실패 히트맵은 DashboardHeat · 요구사항 커버리지 게이지는 DashboardCoverage). SVG 를 직접 그린다 (DESIGN.md 「대시보드」)
// 날짜 · 요일 · 숫자 글자는 SVG 가 아니라 HTML 이다 — 캔버스에서 계산 값이 든 SVG `<text>` 가 안 그려졌다

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { 정기실행켜는곳 } from './DashboardTables.js';
import { 날짜글자 } from './dashboardView.js';
import { 실행목록주소, 실행종류, 이동속성, type 이동재료 } from './DashboardPick.js';
import { use말, use언어, type 언어 } from './i18n.js';

type 자료 = 대시보드응답;
type 건수 = 자료['passRate']['current'];

const 하루 = 86_400_000;
/** 막대 칸 하나가 viewBox 에서 차지하는 폭. 한 칸 안에 막대 64 + 양옆 여백이다 */
const 칸폭 = 100;
/** 막대 영역의 높이 — viewBox 높이와 CSS 높이가 같아 세로는 1:1 이다 */
const 높이 = 200;
/** 마디 사이 간격(px) */
const 마디틈 = 2;
const 실행한날기준 = 3;

const 합 = (c: 건수): number => c.pass + c.fail + c.notRun;
const 빈건수: 건수 = { pass: 0, fail: 0, notRun: 0 };

interface 날 {
  day: string;
  날짜: string;
  요일: string;
  주말: boolean;
  건수: 건수;
  /** 그중 UI 테스트 실행 몫 — 막대 고리가 실행 기록 종류를 고른다 */
  ui: 건수;
}

/** 서버가 14칸을 주지만 비어 와도 칸을 지킨다 — 오늘에서 거슬러 센다. 날 글자는 서버가 이미 사용자 시간대로 자른 것이라 UTC 로만 셈한다 */
export function 창날들(값: 자료, 언어: 언어): 날[] {
  const [연, 월, 일] = 값.window.today.split('-').map(Number);
  const 끝 = Date.UTC(연!, 월! - 1, 일!);
  const 요일식 = new Intl.DateTimeFormat(언어 === 'en' ? 'en-US' : 'ko-KR', { weekday: 'short', timeZone: 'UTC' });
  return Array.from({ length: 값.window.days }, (_, i) => {
    const 시각 = new Date(끝 - (값.window.days - 1 - i) * 하루);
    const day = 시각.toISOString().slice(0, 10);
    const 요일번호 = 시각.getUTCDay();
    const 그날 = 값.daily.find((d) => d.day === day);
    return {
      day,
      날짜: 날짜글자(day),
      요일: 요일식.format(시각),
      주말: 요일번호 === 0 || 요일번호 === 6,
      건수: 그날 ?? 빈건수,
      ui: 그날?.ui ?? 빈건수,
    };
  });
}

/** 가장 큰 날이 눈금 넷 안에 들어오는 가장 작은 단위(1 · 2 · 5 × 10ⁿ) */
function 눈금단위(최대: number): number {
  for (let 크기 = 1; ; 크기 *= 10) {
    for (const 배 of [1, 2, 5]) if (최대 <= 배 * 크기 * 4) return 배 * 크기;
  }
}

export function 범례({ 항목들 }: { 항목들: [string, string][] }) {
  return (
    <ul className="dash-key">
      {항목들.map(([클래스, 글]) => (
        <li key={클래스}>
          <i className={`dash-sw ${클래스}`} aria-hidden="true" />
          {글}
        </li>
      ))}
    </ul>
  );
}

export function 날짜줄({ 클래스, 날들 }: { 클래스: string; 날들: 날[] }) {
  return (
    // 날짜 숫자만 이어 읽히면 맥락이 없다. 같은 말은 그림 요약 이름이 한다
    <div className={클래스} aria-hidden="true">
      {클래스 === 'dash-heat-days' ? <div /> : null}
      {날들.map((날) => (
        <span key={날.day} className={날.주말 ? 'we' : undefined}>
          <b className="num">{날.날짜}</b>
          {클래스 === 'dash-days' ? <i>{날.요일}</i> : null}
        </span>
      ))}
    </div>
  );
}

export function 일별막대({ 값, 설정갈수있나 = false, 이동 }: { 값: 자료; 설정갈수있나?: boolean; 이동?: 이동재료 }) {
  const t = use말();
  const 언어 = use언어();
  const 날들 = 창날들(값, 언어);
  const 최대 = Math.max(1, ...날들.map((날) => 합(날.건수)));
  const 단위 = 눈금단위(최대);
  const 꼭대기 = Math.ceil(최대 / 단위) * 단위;
  const 눈금들 = Array.from({ length: 꼭대기 / 단위 + 1 }, (_, i) => i * 단위);
  const 배율 = 높이 / 꼭대기;
  const 실행한날 = 날들.filter((날) => 합(날.건수) > 0).length;
  const 총 = 날들.reduce((누적, 날) => ({ pass: 누적.pass + 날.건수.pass, notRun: 누적.notRun + 날.건수.notRun, fail: 누적.fail + 날.건수.fail }), {
    pass: 0,
    notRun: 0,
    fail: 0,
  });
  // 같은 수면 앞선 날이다
  const 실패많은날 = 날들.reduce((큰, 날) => (날.건수.fail > 큰.건수.fail ? 날 : 큰), 날들[0]!);
  const 그림이름 =
    총.fail === 0
      ? t('최근 {일}일 통과 {통과} · 미실행 {미실행} · 실패 {실패}', { 일: 값.window.days, 통과: 총.pass, 미실행: 총.notRun, 실패: 총.fail })
      : t('최근 {일}일 통과 {통과} · 미실행 {미실행} · 실패 {실패}, 실패가 가장 많은 날 {날짜}', {
          일: 값.window.days,
          통과: 총.pass,
          미실행: 총.notRun,
          실패: 총.fail,
          날짜: 실패많은날.날짜,
        });

  return (
    <>
      <범례
        항목들={[
          ['p', t('통과')],
          ['n', t('미실행')],
          ['f', t('실패')],
          ['w', t('주말')],
        ]}
      />
      <div className="dash-daily-plot">
        <svg
          viewBox={`0 0 ${칸폭 * 날들.length} ${높이}`}
          preserveAspectRatio="none"
          // 막대가 링크라 img 로 두면 안의 링크가 보조 기술에 안 보인다
          role="group"
          aria-label={그림이름}
        >
          {날들.map((날, 칸) =>
            날.주말 ? (
              <rect key={날.day} className="dash-weekend" x={칸 * 칸폭 + 4} y={0} width={칸폭 - 8} height={높이} />
            ) : null,
          )}
          {눈금들.map((눈금) => (
            <line key={눈금} className="dash-grid" x1={0} x2={칸폭 * 날들.length} y1={높이 - 눈금 * 배율} y2={높이 - 눈금 * 배율} />
          ))}
          {날들.map((날, 칸) => {
            let 바닥 = 높이;
            const 마디들 = (
              [
                ['p', 날.건수.pass],
                ['n', 날.건수.notRun],
                ['f', 날.건수.fail],
              ] as const
            )
              .filter(([, 수]) => 수 > 0)
              .map(([종류, 수]) => {
                const 길이 = 수 * 배율;
                const y = 바닥 - 길이;
                바닥 = y - 마디틈;
                return <rect key={종류} className={종류} x={칸 * 칸폭 + 18} y={y} width={64} height={길이} />;
              });
            const 이름 =
              합(날.건수) === 0
                ? t('{날짜} ({요일}) 실행 없음', { 날짜: 날.날짜, 요일: 날.요일 })
                : t('{날짜} ({요일}) 통과 {통과} · 미실행 {미실행} · 실패 {실패}', {
                    날짜: 날.날짜,
                    요일: 날.요일,
                    통과: 날.건수.pass,
                    미실행: 날.건수.notRun,
                    실패: 날.건수.fail,
                  });
            const 막대 = (
              <>
                <title>{이름}</title>
                {마디들}
              </>
            );
            return (
              <g key={날.day} className="dash-day">
                {/* 실행한 날만 누른다. 날짜로 거르는 조건은 실행 기록에 없어 창 길이(7 · 14 · 30일)로, 실패가 있으면 실패한 실행으로 보낸다 */}
                {합(날.건수) === 0 ? (
                  막대
                ) : (
                  <a
                    href={실행목록주소(값.window.days, 날.건수.fail > 0 ? { state: 'failed' } : {}, 실행종류(날.건수, 날.ui, 날.건수.fail > 0))}
                    aria-label={이름}
                    {...이동속성(이동)}
                  >
                    {막대}
                  </a>
                )}
              </g>
            );
          })}
        </svg>
        {눈금들.map((눈금) => (
          <span key={눈금} className="dash-axis dash-yaxis" aria-hidden="true" style={{ top: 20 + 높이 - 눈금 * 배율 }}>
            {눈금}
          </span>
        ))}
        {날들.map((날, 칸) =>
          날.건수.fail > 0 ? (
            <span
              key={날.day}
              className="num dash-fail-top"
              aria-hidden="true"
              style={{ left: `${((칸 + 0.5) / 날들.length) * 100}%`, top: 20 + 높이 - 합(날.건수) * 배율 - 마디틈 * 2 }}
            >
              {날.건수.fail}
            </span>
          ) : null,
        )}
        {실행한날 < 실행한날기준 ? (
          <span className="dash-note">
            {t('하루 한 번 정기 실행을 켜 두면 결과가 날마다 쌓여 추이가 보입니다')}
            {설정갈수있나 ? <정기실행켜는곳 /> : null}
          </span>
        ) : null}
      </div>
      <날짜줄 클래스="dash-days" 날들={날들} />
    </>
  );
}

/** 통과율 칸 아래 우묵한 자리의 일별 선. 점이 둘이면 선이 아니라 선분이라 추이로 안 읽힌다 — 실행한 날이 셋 이상일 때만 */
export function 통과율선({ 값 }: { 값: 자료 }) {
  const t = use말();
  const 언어 = use언어();
  const 날들 = 창날들(값, 언어);
  const 점들 = 날들.flatMap((날, 칸) =>
    합(날.건수) === 0 ? [] : [{ 날, 칸, 율: (날.건수.pass / 합(날.건수)) * 100 }],
  );
  if (점들.length < 실행한날기준) return null;

  const 낮음 = Math.min(...점들.map((점) => 점.율));
  const 높음 = Math.max(...점들.map((점) => 점.율));
  const 폭 = Math.max(높음 - 낮음, 5);
  const 가운데 = (높음 + 낮음) / 2;
  // 위가 높은 통과율이다. 변화가 없으면 가운데에 놓는다
  const 위 = (율: number): number => 20 - ((율 - 가운데) / 폭) * 28;
  const 옆 = (칸: number): number => ((칸 + 0.5) / 날들.length) * 100;

  return (
    <div className="dash-trend">
      <div className="dash-trend-plot">
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <polyline points={점들.map((점) => `${옆(점.칸)},${위(점.율)}`).join(' ')} />
        </svg>
        {점들.map((점) => (
          <i
            key={점.날.day}
            className="dash-trend-dot"
            style={{ left: `${옆(점.칸)}%`, top: `${(위(점.율) / 40) * 100}%` }}
            title={t('{날짜} 통과율 {값}%', { 날짜: 점.날.날짜, 값: Math.round(점.율) })}
          />
        ))}
      </div>
      <p className="dash-axis">
        <span>{t('일별 통과율')}</span>
        <span className="num">{`${Math.round(낮음)}% – ${Math.round(높음)}%`}</span>
      </p>
    </div>
  );
}
