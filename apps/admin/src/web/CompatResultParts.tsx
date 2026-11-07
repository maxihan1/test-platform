// 호환성 결과 화면 조각 — 머리 숫자 띠 · 「화면 × 디바이스」 표 · 미점검 화면 · 미커버 화면 (도메인/호환성 §8.17 ④). 카드는 CompatCards.tsx

import type { CompatRunDevice, CompatRunResult } from './compatApi.js';
import { 발생글, 미점검들, 접힘글자, 칸글자 } from './compatRunView.js';
import { use말 } from './i18n.js';

/** 표 칸 · 카드가 서로 찾는 자리 */
export const 카드자리 = (key: string, seq: number) => `cr-card-${encodeURIComponent(key)}-${String(seq)}`;
export const 묶음자리 = (key: string) => `cr-group-${encodeURIComponent(key)}`;

export function 요약띠({ counts }: { counts: CompatRunResult['counts'] }) {
  const t = use말();
  const 칸 = (수: number, 글: string, 강조?: string) => (
    <div className={강조 === undefined ? 'cr-sum' : `cr-sum ${강조}`}>
      <b className="mono">{수}</b>
      <span>{글}</span>
    </div>
  );
  return (
    <section className="compat-panel cr-sums" aria-label={t('요약')}>
      {칸(counts.screens, t('점검 화면'))}
      {칸(counts.devices, t('디바이스 · 점검 상태 {수}', { 수: counts.states }))}
      {칸(counts.confirmed, t('결함 확정'), counts.confirmed > 0 ? 'bad' : undefined)}
      {칸(counts.pending, t('미판정'))}
      {칸(counts.notDefect, t('결함 아님'))}
      {칸(counts.unchecked, t('미점검 화면'))}
    </section>
  );
}

/** 열 머리 — 기종명, 아래에 폴더블 상태나 Android 버전 */
function 열머리({ d }: { d: CompatRunDevice }) {
  const t = use말();
  const 아래 = 접힘글자(d, t) ?? (d.os === null ? '' : `A${d.os}`);
  return (
    <th scope="col" title={d.model}>
      <div>{d.name}</div>
      <div className="mono compat-faint">{아래}</div>
    </th>
  );
}

/** 의심 · 미점검이 있는 화면만. 칸을 누르면 그 카드(미점검이면 미점검 구획)로 내려간다 */
export function 화면표({ data, 칸누름 }: { data: CompatRunResult; 칸누름: (key: string, seq: number, 미점검: boolean) => void }) {
  const t = use말();
  return (
    <section className="compat-panel" aria-labelledby="cr-mx">
      <div className="cr-head">
        <h2 id="cr-mx">{t('화면 × 디바이스')}</h2>
        <span className="compat-faint">
          {t('결함 의심 · 미점검이 있는 화면만 · 이상 없는 화면 {수}개 숨김', { 수: data.hiddenOk })}
        </span>
      </div>
      {data.rows.length === 0 ? (
        <p className="compat-faint">{t('결함 의심이나 미점검이 있는 화면이 없습니다')}</p>
      ) : (
        // 휴대폰에서는 첫 열(화면)을 고정하고 가로로 민다 (§8.17 「휴대폰」)
        <div className="cr-mx-wrap">
          <table className="cr-mx">
            <thead>
              <tr>
                <th scope="col" className="l">
                  {t('화면')}
                </th>
                {data.devices.map((d) => (
                  <열머리 key={d.seq} d={d} />
                ))}
                <th scope="col" className="l">
                  {t('발생')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row" className="l">
                    {r.name}
                  </th>
                  {data.devices.map((d) => {
                    const c = r.cells.find((x) => x.seq === d.seq);
                    // 그 상태가 지나지 않았거나 아직 돌거나 점검 중인 칸은 비운다
                    if (c === undefined) return <td key={d.seq} />;
                    const 글 = t(칸글자[c.value]);
                    return (
                      <td key={d.seq}>
                        {c.value === 'OK' ? (
                          <span className="cr-c ok">{글}</span>
                        ) : (
                          <button type="button" className={`cr-c ${c.value.toLowerCase()}`} title={c.reason} onClick={() => 칸누름(r.key, d.seq, c.value === 'UNCHECKED')}>
                            {글}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="l mono">{발생글(r, data.devices.length, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function 미점검구획({ data, 세트주소 }: { data: CompatRunResult; 세트주소: string }) {
  const t = use말();
  const 줄들 = 미점검들(data.rows, data.devices, t);
  return (
    <section className="compat-panel" id="cr-unchecked" aria-labelledby="cr-un">
      <div className="cr-head">
        <h2 id="cr-un">
          {t('미점검 화면')} <span className="mono">{줄들.length}</span>
        </h2>
        <span className="compat-faint">{t('점검하지 못한 화면은 UI 결함 여부를 알 수 없습니다')}</span>
      </div>
      {줄들.map((줄) => (
        <div key={줄.key} className="cr-line">
          <b>{줄.name}</b>
          <span>
            {줄.까닭들.map((x) => (
              <span key={x.까닭} className="cr-why">
                {t('{수}대 미점검', { 수: x.디바이스.length })} — {x.까닭} <span className="compat-faint">({x.디바이스.join(' · ')})</span>
              </span>
            ))}
          </span>
        </div>
      ))}
      <div className="cr-line">
        <b>{t('참고 · 미커버 화면 {수}', { 수: data.uncovered.length })}</b>
        <span>
          {data.uncovered.length === 0
            ? t('모든 화면을 지나는 케이스가 있었습니다')
            : `${data.uncovered.map((u) => u.name).join(' · ')} — ${t('이 화면을 지나는 TC 가 없어 실행 대상에서 빠졌습니다')}`}
        </span>
        <a href={세트주소}>{t('세트 보기')}</a>
      </div>
    </section>
  );
}
