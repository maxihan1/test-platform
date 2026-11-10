// 대시보드 「회귀 실패」 목록 — 같은 케이스는 한 줄, 누르면 그 실행의 실패 카드가 오른쪽 서랍으로 들어온다 (도메인/리포팅 §8.12)

import { useState } from 'react';

import type { 대시보드응답 } from '../reporting/dashboardResults.js';

import { api } from './api.js';
import { Drawer } from './Drawer.js';
import { 카드찾기 } from './failureFind.js';
import { 서비스를열며, 실행목록주소, 이동속성, 창실패종류, type 이동재료 } from './DashboardPick.js';
import { 떠오름 } from './DashboardTop.js';
import { 실패유형이름 } from './DashboardTypes.js';
import { use말 } from './i18n.js';
import { 실행기록주소 } from './route.js';
import { 실패카드 } from './RunFailCard.js';
import { Failed, Loading, PLATFORM_LABEL, useAsync } from './ui.js';

type 자료 = 대시보드응답;
type 실패줄 = 자료['newFailures'][number];

// 앞 실행은 창 밖에 있을 수 있어 흐름 길이로는 못 가른다 — 서버가 실제로 견줬는지를 준다
function 견줄앞실행있나(서비스들: 자료['byService']): boolean {
  return 서비스들.some((서비스) => 서비스.compared);
}

/** 같은 케이스 아이디는 한 줄 — 디바이스(PC · 모바일)를 합쳐 칩 하나로. 줄은 서버가 준 차례(가장 최근 먼저)의 첫 줄이 대표다 */
export function 케이스로묶기(줄들: 실패줄[]): { 대표: 실패줄; 디바이스들: 실패줄['platform'][] }[] {
  const 묶음 = new Map<string, { 대표: 실패줄; 디바이스들: 실패줄['platform'][] }>();
  for (const 줄 of 줄들) {
    const 키 = `${줄.serviceId}:${줄.tcId}`;
    const 앞 = 묶음.get(키);
    if (앞 === undefined) 묶음.set(키, { 대표: 줄, 디바이스들: [줄.platform] });
    else if (!앞.디바이스들.includes(줄.platform)) 앞.디바이스들.push(줄.platform);
  }
  return [...묶음.values()].map((x) => ({ ...x, 디바이스들: (['desktop', 'mobile'] as const).filter((p) => x.디바이스들.includes(p)) }));
}

export function 신규실패표({ 값, 이동 }: { 값: 자료; 이동: 이동재료 }) {
  const t = use말();
  const 묶음 = 케이스로묶기(값.newFailures);
  // 줄은 상한에서 잘리지만 서비스별 건수는 전부를 센다 — 잘린 만큼은 아래 한 줄로 잇는다
  const 전부 = Math.max(
    값.byService.reduce((합, 서비스) => 합 + 서비스.newFailureCount, 0),
    값.newFailures.length,
  );
  const 더 = 전부 - 값.newFailures.length;
  const [연줄, set연줄] = useState<실패줄 | null>(null);

  return (
    <section className="dash-panel dash-rise" style={떠오름(16)}>
      <div className="dash-h2">
        <h2>{t('회귀 실패')}</h2>
        <b className="num" style={{ fontSize: 20, color: 묶음.length > 0 ? 'var(--fail-text)' : undefined }}>
          {더 > 0 ? `${String(묶음.length)}+` : 묶음.length}
        </b>
        <span className="dash-lab dash-r">{t('이전 실행에서는 통과했던 케이스 · 최근 {일}일', { 일: 값.window.days })}</span>
      </div>

      {묶음.length === 0 ? (
        견줄앞실행있나(값.byService) ? (
          <p className="dash-calm good">{t('회귀 실패가 없습니다')}</p>
        ) : (
          <p className="dash-calm">{t('견줄 앞 실행이 없습니다')}</p>
        )
      ) : (
        <div className="dash-list">
          {묶음.map(({ 대표: 실패, 디바이스들 }) => (
            // 누르면 대시보드를 떠나지 않고 서랍에 실패 카드를 연다(⑬-2). 새 탭으로 열면 주소대로 실행 기록에 간다
            <a
              key={`${실패.serviceId}-${실패.tcId}`}
              className="dash-li"
              href={실행기록주소(실패.tcId, 실패.runId, true)}
              title={`${실패.serviceName} · ${실패.env} · RUN ${String(실패.runId)}`}
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
              <span className="mono dash-lab">{실패.tcId}</span>
              <span className="dash-cut">{실패.tcName}</span>
              <span className="chips">
                <span className="dash-chip t hide">{디바이스들.map((p) => t(PLATFORM_LABEL[p])).join(' · ')}</span>
                {/* 칩은 유형이다 — 확인 문장 글자는 실행 결과의 카드가 보인다 (실행 §8.3 「실패 유형으로 묶는다」) */}
                <span className="dash-chip f" title={실패.reason ?? undefined}>
                  {t(실패유형이름[실패.type])}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
      {더 > 0 ? (
        <p className="dash-lab">
          {t('{수}건 더 있습니다', { 수: 더 })} ·{' '}
          <a className="dash-link" href={실행목록주소(값.window.days, { state: 'failed' }, 창실패종류(값, false))} {...이동속성(이동)}>
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
          {t('회귀 실패')} · <span className="mono">RUN {실패.runId}</span>
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
            맞추기
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
