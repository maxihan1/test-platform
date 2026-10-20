// 대시보드 「신규 실패」 표 — 케이스 이름을 누르면 그 실행의 실패 카드가 오른쪽 서랍으로 들어온다 (도메인/리포팅 §8.12)

import { useState } from 'react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';

import { api } from './api.js';
import { 짧은시각 } from './dashboardView.js';
import { Drawer } from './Drawer.js';
import { 카드찾기 } from './failureFind.js';
import { 서비스를열며, 실행목록주소, 이동속성, type 이동재료 } from './DashboardPick.js';
import { 실패유형이름 } from './DashboardTypes.js';
import { use말, use언어 } from './i18n.js';
import { 실행기록주소 } from './route.js';
import { 실패카드 } from './RunFailCards.js';
import { Failed, Loading, PLATFORM_LABEL, useAsync } from './ui.js';

type 자료 = 대시보드응답;
type 실패줄 = 자료['newFailures'][number];

// 앞 실행은 14일 창 밖에 있을 수 있어 흐름 길이로는 못 가른다 — 서버가 실제로 견줬는지를 준다
function 견줄앞실행있나(서비스들: 자료['byService']): boolean {
  return 서비스들.some((서비스) => 서비스.compared);
}

export function 신규실패표({ 값, 이동 }: { 값: 자료; 이동: 이동재료 }) {
  const t = use말();
  const 언어 = use언어();
  // 줄은 상한(10)에서 잘리지만 서비스별 건수는 전부를 센다 — 머리는 큰 쪽이다
  const 전부 = Math.max(
    값.byService.reduce((합, 서비스) => 합 + 서비스.newFailureCount, 0),
    값.newFailures.length,
  );
  const 더 = 전부 - 값.newFailures.length;
  const [연줄, set연줄] = useState<실패줄 | null>(null);

  return (
    <section className="dash-flat dash-fail">
      <div className="dash-ttl">
        <h2>
          {t('신규 실패')} <b className={전부 > 0 ? 'num bad' : 'num'}>{전부}</b>
        </h2>
        <span className="dash-axis">{t('최근 {일}일, 같은 서버의 직전 실행과 견줌', { 일: 값.window.days })}</span>
      </div>

      {값.newFailures.length === 0 ? (
        견줄앞실행있나(값.byService) ? (
          <p className="dash-calm good">
            <span aria-hidden="true">✓</span>
            <span>{t('새 실패가 없습니다')}</span>
          </p>
        ) : (
          <p className="dash-calm">
            <span aria-hidden="true">–</span>
            <span>{t('견줄 앞 실행이 없습니다')}</span>
          </p>
        )
      ) : (
        <div className="dash-scroll">
          <table className="dash-table">
            <thead>
              <tr>
                <th scope="col">TC</th>
                <th scope="col">{t('테스트와 실패 유형')}</th>
                <th scope="col">{t('디바이스')}</th>
                <th scope="col" className="r">
                  {t('실행')}
                </th>
              </tr>
            </thead>
            <tbody>
              {값.newFailures.map((실패) => (
                <tr key={`${실패.runId}-${실패.tcId}-${실패.platform}`}>
                  <td>
                    <span className="mono dash-tc">{실패.tcId}</span>
                    <span className="dash-sub" title={`${실패.serviceName} · ${실패.env}`}>
                      {실패.serviceName} · {실패.env}
                    </span>
                  </td>
                  <td className="dash-test">
                    {/* 누르면 대시보드를 떠나지 않고 서랍에 실패 카드를 연다(⑬-2). 새 탭으로 열면 주소대로 실행 기록에 간다 */}
                    <a
                      className="ink"
                      href={실행기록주소(실패.tcId, 실패.runId, true)}
                      title={실패.tcName}
                      onAuxClick={서비스를열며(이동.서비스열기, 실패.serviceId).onAuxClick}
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
                          이동.서비스열기(실패.serviceId);
                          return;
                        }
                        e.preventDefault();
                        // Safari 는 눌러도 고리에 포커스를 안 준다 — 서랍이 닫힐 때 돌아올 자리를 먼저 잡아 둔다
                        e.currentTarget.focus();
                        set연줄(실패);
                      }}
                    >
                      {실패.tcName}
                    </a>
                    {/* 사유 칸은 유형이다 — 확인 문장 글자는 실행 결과의 카드가 보인다 (실행 §8.3 「실패 유형으로 묶는다」) */}
                    <span className="dash-reason" title={실패.reason ?? undefined}>
                      {t(실패유형이름[실패.type])}
                    </span>
                  </td>
                  <td>{t(PLATFORM_LABEL[실패.platform])}</td>
                  <td className="r">
                    <span className="mono dash-tc">RUN {실패.runId}</span>
                    <span className="dash-sub">{짧은시각(실패.finishedAt, 언어)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {더 > 0 ? (
        <p className="dash-axis dash-more">
          {t('{수}건 더 있습니다', { 수: 더 })} ·{' '}
          <a className="dash-link" href={실행목록주소(값.window.days, { state: 'failed' })} {...이동속성(이동)}>
            {t('실행 기록에서 보기')}
          </a>
        </p>
      ) : null}
      {연줄 === null ? null : <실패서랍 key={`${연줄.runId}-${연줄.tcId}`} 실패={연줄} 이동={이동} onClose={() => set연줄(null)} />}
    </section>
  );
}

const 권한없음 = () => false;

/** 그 실행의 그 케이스 카드 하나. 판정 버튼은 실행 기록에서 누른다 — 대시보드는 서비스마다의 권한을 모른다 */
function 실패서랍({ 실패, 이동, onClose }: { 실패: 실패줄; 이동: 이동재료; onClose: () => void }) {
  const t = use말();
  const 응답 = useAsync(() => Promise.all([api.run(실패.runId), 카드찾기(실패.runId, 실패.tcId)]), [실패.runId, 실패.tcId]);

  return (
    <Drawer className="fail-drawer" id="fail-drawer" aria-labelledby="fail-drawer-title" onClose={onClose}>
      <div className="fail-drawer-head">
        <h2 id="fail-drawer-title">
          {t('신규 실패')} · <span className="mono">RUN {실패.runId}</span>
        </h2>
        <button type="button" className="btn ghost icon" aria-label={t('닫기')} onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="fail-drawer-body">
        {응답.error !== null ? (
          <Failed error={응답.error} />
        ) : 응답.data === null ? (
          <Loading />
        ) : 응답.data[1] === null ? (
          <p className="empty">{t('이 실행에서 실패 카드를 찾지 못했습니다')}</p>
        ) : (
          <실패카드
            c={응답.data[1].카드}
            runId={실패.runId}
            env={응답.data[0].env}
            items={응답.data[0].items}
            platform="ALL"
            권한={권한없음}
            on남김={() => void 응답.reload()}
            열기
            다시돌림={undefined}
          />
        )}
      </div>
      <p className="fail-drawer-foot">
        <a className="dash-link" href={실행기록주소(실패.tcId, 실패.runId, true)} {...서비스를열며(이동.서비스열기, 실패.serviceId)}>
          {t('실행 기록에서 보기')}
        </a>
      </p>
    </Drawer>
  );
}
