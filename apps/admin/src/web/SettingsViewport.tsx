// 설정의 「화면 크기」 구획 — 대상 서버마다 크롤러가 정한 판정과 화면별 PC · 모바일 차이 (도메인/인증 §8.8 · PRD-F10-08 시안 B)
// 읽기만 한다. 고치는 칸인 「대상 서버」 와 섞으면 판정도 저장되는 값처럼 보여 구획을 따로 둔다

import { useState } from 'react';

import { api, type EnvRow, type ViewportKind, type ViewportScreens } from './api.js';
import { 짧은시각 } from './dashboardView.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

/** 저장된 줄만 받는다 — 편집 중인 줄은 아직 서버에 없어 판정도 없다 */
export function ViewportSection({ serviceId, envs }: { serviceId: number; envs: EnvRow[] }) {
  const t = use말();
  const 언어 = use언어();
  const [연것, set연것] = useState<string | null>(null);
  const [결과, set결과] = useState<ViewportScreens | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function 연다(env: string) {
    if (연것 === env) {
      set연것(null);
      return;
    }
    set연것(env);
    set결과(null);
    setErr(null);
    try {
      set결과(await api.settingsViewport(serviceId, env));
    } catch (e) {
      setErr(message(e, 언어));
    }
  }

  const 이름: Record<ViewportKind, string> = { responsive: t('반응형'), adaptive: t('적응형'), 'desktop-only': t('PC 전용') };
  return (
    <div className="vp">
      <table className="dash-table">
        <thead>
          <tr>
            <th>{t('대상 서버')}</th>
            <th>{t('판정')}</th>
            <th>{t('판정 시각')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {envs.map((e) => {
            const 판정 = e.viewportKind ?? null;
            const 시각 = e.viewportJudgedAt ?? null;
            return (
            <tr key={e.env}>
              <td>{e.env}</td>
              <td>
                {판정 === null ? (
                  <span className="vp-kind none">{t('아직 판정 안 함')}</span>
                ) : (
                  <span className={`vp-kind ${판정}`}>{이름[판정]}</span>
                )}
              </td>
              <td className="dash-when">{시각 === null ? '—' : 짧은시각(시각, 언어)}</td>
              <td>
                {판정 === null ? null : (
                  <button className="btn ghost" aria-pressed={연것 === e.env} onClick={() => void 연다(e.env)}>
                    {t('화면별 차이')}
                  </button>
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      {연것 === null ? null : err !== null ? (
        <div className="err">{err}</div>
      ) : 결과 === null ? (
        <div className="hint">{t('불러오는 중')}</div>
      ) : (
        <화면차이표 env={연것} 결과={결과} />
      )}
      <div className="hint">{t('테스트 작성 때 화면을 탐색하면 정해집니다. 대상 서버 주소를 바꾸면 다음 탐색까지 비워 둡니다')}</div>
    </div>
  );
}

function 화면차이표({ env, 결과 }: { env: string; 결과: ViewportScreens }) {
  const t = use말();
  if (결과.items.length === 0) return <div className="hint">{t('PC 와 모바일이 다른 화면이 없습니다')}</div>;
  return (
    <div className="vp-screens">
      <table className="dash-table">
        <thead>
          <tr>
            <th>{t('{서버} 화면', { 서버: env })}</th>
            <th>{t('달라진 점')}</th>
            <th>{t('한쪽에만 있는 버튼 · 링크')}</th>
          </tr>
        </thead>
        <tbody>
          {결과.items.map(({ state, url, name, viewport: v }) => (
            <tr key={`${state} ${url}`}>
              <td>
                {name === '' ? url : name}
                <span className="dash-tc">{name === '' ? state : `${url} · ${state}`}</span>
              </td>
              <td>
                <div className="vp-chips">
                  {v.모바일주소 === undefined ? null : <span className="vp-chip">{t('모바일은 다른 주소 {주소}', { 주소: v.모바일주소 })}</span>}
                  {v.넘침 ? <span className="vp-chip warn">{t('옆으로 밀어야 보임')}</span> : null}
                  {v.선언 ? null : <span className="vp-chip warn">{t('모바일에서 PC 화면이 작게 보임')}</span>}
                  {v.구조같음 ? null : <span className="vp-chip">{t('배치가 다름')}</span>}
                </div>
              </td>
              <td className="vp-names">
                {v.PC만.length === 0 ? null : <div>{t('PC 에만')} {v.PC만.join(' · ')}</div>}
                {v.모바일만.length === 0 ? null : <div>{t('모바일에만')} {v.모바일만.join(' · ')}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {결과.same === 0 ? null : <div className="hint">{t('나머지 {건수}장은 PC 와 모바일이 같습니다', { 건수: 결과.same })}</div>}
    </div>
  );
}
