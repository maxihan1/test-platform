// 앱 대시보드의 요구사항 커버리지 — 반원 게이지와 서비스 줄 (DESIGN.md 「대시보드」). 회색 단계만 쓴다

import type { 대시보드응답 } from '../reporting/dashboardResults.js';
import { use올라가기 } from './dashboardView.js';
import { use말, use언어, type 언어 } from './i18n.js';

type 자료 = 대시보드응답;

const 반원 = 'M24 124 A96 96 0 0 1 216 124';

/** 올림으로 100 이 되면 아직 덮지 못한 요구가 있는데 다 덮은 것처럼 읽힌다 */
const 내림퍼센트 = (덮음: number, 전체: number): number => Math.floor((덮음 * 100) / 전체);

function 짧은날짜(iso: string, 언어: 언어): string {
  return new Intl.DateTimeFormat(언어 === 'en' ? 'en-US' : 'ko-KR', {
    month: 언어 === 'en' ? 'short' : 'long',
    day: 'numeric',
  }).format(new Date(iso));
}

export function 요구커버리지({
  값,
  서비스열기,
  작성서비스,
}: {
  값: 자료;
  서비스열기: (serviceId: number) => void;
  작성서비스: { id: number; name: string }[];
}) {
  const t = use말();
  const 언어 = use언어();
  const 센것 = 값.coverage.filter((줄) => 줄.total > 0);
  const 덮음 = 센것.reduce((수, 줄) => 수 + 줄.cased, 0);
  const 전체 = 센것.reduce((수, 줄) => 수 + 줄.total, 0);
  const 퍼센트 = 전체 === 0 ? null : 내림퍼센트(덮음, 전체);
  const 보임 = use올라가기(퍼센트 ?? 0);
  // 줄은 작성 칸이 none 이 아닌 배정 서비스로 만든다. 실행 칸 기준의 services 에는 작성을 못 보는 서비스가 섞여 거기에 「작성 기록이 없습니다」가 떴다
  const 서비스들 = 작성서비스.map((서비스) => ({ id: 서비스.id, 이름: 서비스.name }));

  return (
    <>
      <div className="dash-gauge-wrap">
        <svg className="dash-gauge" viewBox="0 0 240 152" aria-hidden="true" focusable="false">
          {[8, 6, 4, 2, 0].map((아래) => (
            <g key={아래} className={아래 === 0 ? 'top' : 'side'} transform={`translate(0 ${아래})`}>
              <path className="dash-gauge-t" d={반원} pathLength={100} />
              {퍼센트 === null ? null : (
                <path className="dash-gauge-v" d={반원} pathLength={100} strokeDasharray={`${퍼센트} 100`} />
              )}
            </g>
          ))}
        </svg>
        <span className="dash-axis dash-tick l" aria-hidden="true">0</span>
        <span className="dash-axis dash-tick m" aria-hidden="true">50</span>
        <span className="dash-axis dash-tick r" aria-hidden="true">100</span>
        <span className="dash-gauge-num num">
          {퍼센트 === null ? (
            '—'
          ) : (
            <>
              {보임}
              <span className="dash-pct">%</span>
            </>
          )}
        </span>
      </div>
      {퍼센트 === null ? null : (
        <p className="dash-gauge-cap">{t('케이스로 덮은 요구 {덮음} / {전체}', { 덮음, 전체 })}</p>
      )}
      {서비스들.map((서비스) => {
        const 줄 = 값.coverage.find((것) => 것.serviceId === 서비스.id);
        if (줄 === undefined) {
          return (
            <div key={서비스.id} className="dash-cov-row none">
              <span className="dash-cov-name">{서비스.이름}</span>
              <span className="dash-axis">{t('작성 기록이 없습니다')}</span>
            </div>
          );
        }
        const 몫 = 줄.total === 0 ? null : 내림퍼센트(줄.cased, 줄.total);
        return (
          <div key={서비스.id} className="dash-cov-row">
            <span className="dash-cov-name">
              <span>{서비스.이름}</span>
              {/* 작성 상세는 고른 서비스로 요청을 연다. 대시보드엔 고르개가 없어 누를 때 그 서비스로 바꾼다 */}
              {/* 가운데 버튼 · 새 탭은 click 이 아니라 auxclick 이다. 새 탭은 저장된 고른 서비스를 읽으므로 그 전에 바꿔 둔다 */}
              <a
                href={`#/authoring/${String(줄.requestId)}`}
                onClick={() => 서비스열기(줄.serviceId)}
                onAuxClick={(e) => {
                  // 가운데 버튼(새 탭)만 — 오른쪽 단추는 주소 복사 메뉴라 서비스를 바꾸면 사람이 모르게 바뀐다
                  if (e.button === 1) 서비스열기(줄.serviceId);
                }}
              >
                {t('{날짜} · 요청 #{번호}', { 날짜: 짧은날짜(줄.finishedAt, 언어), 번호: 줄.requestId })}
              </a>
            </span>
            <span className="dash-cov-bar">{몫 === null ? null : <i style={{ width: `${몫}%` }} />}</span>
            <span className="num dash-cov-pct">{몫 === null ? '—' : `${몫}%`}</span>
          </div>
        );
      })}
    </>
  );
}
