// 작성 상세의 「기획서와 화면의 차이」 표 — 역방향 작성이 남긴 result.diffs (도메인/작성 §3.6 「★ 역방향」 · 점검 12.11)

import { type 차이, 차이종류라벨 } from './authoringView.js';
import { use말, use언어 } from './i18n.js';
import { 케이스주소 } from './route.js';

/** 고리번호 — 반영 전 · 뺀 케이스는 null(카탈로그에 없다), 반영이 번호를 바꿨으면 새 번호 (리뷰 M6) */
export function AuthoringDiffs({ 차이들, 고리번호 }: { 차이들: 차이[]; 고리번호: (tcId: string) => string | null }) {
  const t = use말();
  const 언어 = use언어();
  return (
    <section id="diffs" className="authoring-panel" aria-labelledby="diffs-title">
      <h3 id="diffs-title">
        {t('기획서와 화면의 차이')} · {t('{수}건', { 수: 차이들.length })}
      </h3>
      {/* 좁은 화면에서 칸이 쪼개지지 않게 표만 옆으로 구른다 (DESIGN.md 「반응형」).
          에이전트 안 번호 · 표시 성공 칸은 사람이 할 일과 상관없어 뺐다 (점검 12.11) */}
      <div className="authoring-diffs-wrap">
        <table className="dhist authoring-diffs" aria-label={t('기획서와 화면의 차이')}>
          <thead>
            <tr>
              <th>{t('종류')}</th>
              <th>{t('자리')}</th>
              <th>{t('기획서')}</th>
              <th>{t('화면')}</th>
              <th>{t('케이스')}</th>
            </tr>
          </thead>
          <tbody>
            {차이들.map((d, i) => {
              const 고리 = d.tcId == null ? null : 고리번호(d.tcId);
              return (
                <tr key={`${d.no}-${String(i)}`}>
                  <td>{차이종류라벨(d.kind, 언어)}</td>
                  <td>{d.where ?? '—'}</td>
                  <td>{d.doc ?? '—'}</td>
                  <td>{d.screen ?? '—'}</td>
                  <td>
                    {d.tcId == null ? (
                      '—'
                    ) : 고리 === null ? (
                      <span className="mono">{d.tcId}</span>
                    ) : (
                      <a className="mono" href={케이스주소(고리)}>
                        {고리}
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="btns">
        <a className="btn ghost" href="#/authoring?todo=1">
          {t('결정 필요에서 확인하기')}
        </a>
      </div>
    </section>
  );
}
