// 실패 카드 시간축 증거의 작은 부품 — 네트워크 눈금 줄 · FPS 선 · 「기기 정보」 · 「오브젝트」 탭 본문 (WEB-F7-19 · WEB-F7-24 · WEB-F7-25 · DESIGN.md 「시간축 증거」)

import type { DeviceInfo, ElementCheck, FpsSample, StepResult } from '@platform/kit';
import { GAME_TREE_FILE } from '@platform/kit/protocol';

import type { ItemTrace } from './api.js';
import { use말, use언어 } from './i18n.js';
import { show } from './ItemSteps.js';
import { 실패요청 } from './ItemTrace.js';
import { Failed, Loading, useAsync } from './ui.js';

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

const FPS높이 = 26;
/** 대시보드 「30 아래로 떨어짐」 선(reporting/dashboardShape.ts 낮은FPS)과 같다 — 그 파일은 DB 질의까지 끌고 와 화면이 못 읽는다. 같은지는 테스트가 본다 */
export const 점선FPS = 30;

/**
 * 단계 칸 아래 FPS 선. 러너가 1초마다 읽은 숫자를 그때 돌던 단계 칸 안에 고르게 놓는다 — 눈금 줄처럼 칸 폭을 같이 받아 경계가 맞는다.
 * 점선은 대시보드 「30 아래로 떨어짐」과 같은 선이다. 못 읽은 초에서 선이 끊긴다
 */
export function FPS선({ steps, fps, 폭 }: { steps: StepResult[]; fps: FpsSample[]; 폭: (s: StepResult) => number }) {
  const t = use말();
  const 값들 = fps.flatMap((f) => (f.fps === null ? [] : [f.fps]));
  if (값들.length === 0) return null;
  // 120Hz 폰은 60 을 넘는다 — 위끝은 60 과 가장 큰 값 중 큰 쪽이다
  const 위 = Math.max(60, ...값들);
  const y = (v: number): string => (FPS높이 - 1 - (v / 위) * (FPS높이 - 2)).toFixed(1);
  const 평균 = Math.round(값들.reduce((a, b) => a + b, 0) / 값들.length);
  return (
    <>
      <div className="ev-fps" role="img" aria-label={t('FPS 흐름 · 평균 {평균} · 가장 낮을 때 {최저}', { 평균, 최저: Math.round(Math.min(...값들)) })}>
        {steps.map((s) => {
          const 줄 = fps.filter((f) => f.seq === s.seq);
          const d = 줄
            .map((f, i) => (f.fps === null ? null : `${i === 0 || 줄[i - 1]!.fps === null ? 'M' : 'L'}${(((i + 0.5) / 줄.length) * 100).toFixed(1)} ${y(f.fps)}`))
            .filter((x) => x !== null)
            .join(' ');
          return (
            <span key={s.seq} style={{ flex: 폭(s) }}>
              <svg viewBox={`0 0 100 ${String(FPS높이)}`} preserveAspectRatio="none" aria-hidden="true">
                <line x1="0" x2="100" y1={y(점선FPS)} y2={y(점선FPS)} vectorEffect="non-scaling-stroke" />
                {d === '' ? null : <path d={d} vectorEffect="non-scaling-stroke" />}
              </svg>
            </span>
          );
        })}
      </div>
      <div className="ev-tl-leg">
        <span className="fps">{t('FPS (점선 {선})', { 선: 점선FPS })}</span>
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

// 큰 장면은 목록이 수 MB 라 한 칸에 다 그리면 탭이 멈춘다 — 앞만 보이고 전체는 파일로 받는다
const TREE_CHAR_LIMIT = 20_000;

/**
 * 게임 요소 대조와 실패 순간 오브젝트 목록. 지도에는 열쇠마다 마지막 값만 남아 이 항목이 무엇을 읽었는지는 여기서만 본다.
 * @param 목록주소 kit 이 팜 증적 폴더에 남긴 오브젝트 목록 파일 — 통과 못 한 게임 항목에만 있다
 */
export function 게임오브젝트({ 대조, 목록주소, 이름 }: { 대조: ElementCheck[]; 목록주소: string | null; 이름: string | null }) {
  const t = use말();
  const 언어 = use언어();
  const 목록 = useAsync(async () => {
    if (목록주소 === null) return null;
    const res = await fetch(목록주소);
    if (!res.ok) throw new Error(t('오브젝트 목록을 읽지 못했습니다'));
    return res.text();
  }, [목록주소]);
  return (
    <>
      {이름 === null ? null : <b>{이름}</b>}
      {대조.length === 0 ? null : (
        <>
          <p className="ev-obj-h">{t('게임 요소 대조')}</p>
          <table className="trace-table">
            <thead>
              <tr>
                <th>{t('요소')}</th>
                <th>{t('서버 값')}</th>
                <th>{t('기획서와')}</th>
              </tr>
            </thead>
            <tbody>
              {대조.map((c, i) => (
                <tr key={i} className={c.same ? undefined : 'bad'}>
                  <td className="trace-m">{c.key}</td>
                  <td className="trace-m">{show(c.serverValue, 언어)}</td>
                  <td>{t(c.same ? '같음' : '다름')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {목록주소 === null ? null : (
        <>
          <p className="ev-obj-h">{t('실패 순간 오브젝트')}</p>
          {목록.error !== null ? <Failed error={목록.error} /> : 목록.data === null ? <Loading /> : <pre className="ev-json">{목록.data.slice(0, TREE_CHAR_LIMIT)}</pre>}
          {(목록.data?.length ?? 0) > TREE_CHAR_LIMIT ? <p className="hint">{t('앞 {글자}자만 보입니다', { 글자: TREE_CHAR_LIMIT.toLocaleString() })}</p> : null}
          <a className="farm-ev-file" href={목록주소} download={GAME_TREE_FILE}>
            {t('파일로 받기')}
          </a>
        </>
      )}
    </>
  );
}
