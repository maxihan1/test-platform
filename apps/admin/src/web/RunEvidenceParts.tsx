// 실패 카드 시간축 증거의 작은 부품 — 네트워크 눈금 줄 · 「기기 정보」 탭 본문 (WEB-F7-19 · DESIGN.md 「시간축 증거」)

import type { DeviceInfo, StepResult } from '@platform/kit';

import type { ItemTrace } from './api.js';
import { use말 } from './i18n.js';
import { 실패요청 } from './ItemTrace.js';

/**
 * 단계 칸 아래에 그 단계에서 보낸 요청마다 눈금 하나. 단계 안 자리는 그 단계의 첫 조작 · 요청부터 잰 시각이다
 * ponytail: 단계가 시작한 시각을 따로 남기지 않아 첫 기록을 시작으로 본다 — 단계가 기다림으로 시작하면 눈금이 앞당겨진다. 단계 시작 시각을 남기면 그것으로 바꾼다
 */
export function 네트워크눈금({ steps, trace, 폭 }: { steps: StepResult[]; trace: ItemTrace | null; 폭: (s: StepResult) => number }) {
  const t = use말();
  if (trace === null || trace.status !== 'DONE' || !trace.network.some((n) => n.seq !== null)) return null;
  return (
    <>
      <div className="ev-ticks" aria-hidden="true">
        {steps.map((s) => {
          const 요청들 = trace.network.filter((n) => n.seq === s.seq);
          const 시작 = Math.min(...[...요청들, ...trace.actions.filter((a) => a.seq === s.seq)].map((x) => x.atMs));
          return (
            <span key={s.seq} style={{ flex: 폭(s) }}>
              {요청들.map((n, i) => (
                <i
                  key={i}
                  className={실패요청(n) ? 'bad' : undefined}
                  style={{ left: `${String(s.durationMs === 0 ? 0 : Math.min(100, ((n.atMs - 시작) / s.durationMs) * 100))}%` }}
                />
              ))}
            </span>
          );
        })}
      </div>
      <div className="ev-tl-leg">
        <span>{t('네트워크 요청')}</span>
        <span className="bad">{t('실패한 요청')}</span>
      </div>
    </>
  );
}

/** 못 읽은 칸은 「모름」 — 지어내지 않는다. 판은 실행 전체라 단계를 바꿔도 같다 */
export function 기기정보({ device, 이름 }: { device: DeviceInfo | null; 이름: string | null }) {
  const t = use말();
  const 모름 = t('모름');
  const 앱 = [device?.appVersion ?? null, device?.appBuild == null ? null : t('빌드 {번호}', { 번호: device.appBuild })].filter((x) => x !== null);
  return (
    <>
      {이름 === null ? null : <b>{이름}</b>}
      <dl className="ev-dev">
        <dt>{t('기기')}</dt>
        <dd className="mono">{device?.model ?? 모름}</dd>
        <dt>Android</dt>
        <dd className="mono">{device?.osVersion ?? 모름}</dd>
        <dt>{t('앱 버전')}</dt>
        <dd className="mono">{앱.length === 0 ? 모름 : 앱.join(' · ')}</dd>
      </dl>
    </>
  );
}
