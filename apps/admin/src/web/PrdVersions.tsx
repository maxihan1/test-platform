// 표준 기획서 판 이력 — 판마다 누가 언제 무엇으로 만들었는지와 되돌리기 (도메인/작성 §3.6 「★ 표준 기획서」 「판 이력」)
// 되돌리기도 새 판이고 옛 판은 지우지 않는다 — 그래서 확인 상자 대신 그 자리에서 한 번 더 묻는다

import { useState } from 'react';

import { use말, use언어 } from './i18n.js';
import type { 판짓기 } from './Prd.js';
import { prdApi, type PrdVersionRow } from './prdApi.js';
import { Failed, Loading, useAsync, when } from './ui.js';

export function PrdVersions({ service, 지금판, 쓰나, 짓기 }: { service: string; 지금판: number; 쓰나: boolean; 짓기: 판짓기 }) {
  const t = use말();
  const 언어 = use언어();
  // 지금 판이 바뀌면(저장 · 확정 · 되돌리기) 목록도 다시 읽는다
  const 목록 = useAsync(() => prdApi.versions(service), [service, 지금판]);
  const [묻는판, set묻는판] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const 출처글: Record<PrdVersionRow['source'], string> = { AGENT: t('옮기기'), PERSON: t('사람§판'), REVERT: t('되돌리기§판') };

  async function 되돌리기(toVersion: number) {
    setBusy(true);
    if (await 짓기((base) => prdApi.revert(service, base, toVersion))) set묻는판(null);
    setBusy(false);
  }

  return (
    <section className="screen prd-versions" aria-labelledby="prd-versions-title">
      <div className="toolbar">
        <h2 id="prd-versions-title" className="prd-all-title">
          {t('판 이력')}
        </h2>
        <span className="note">{t('되돌리기도 새 판으로 쌓입니다. 옛 판은 지우지 않습니다')}</span>
      </div>
      {목록.error !== null ? (
        <Failed error={목록.error} />
      ) : 목록.data === null ? (
        <Loading />
      ) : (
        <div className="prd-vscroll">
          <table className="prd-vtable">
            <thead>
              <tr>
                <th>{t('판')}</th>
                <th>{t('누가')}</th>
                <th>{t('언제')}</th>
                <th aria-label={t('되돌리기§판')} />
              </tr>
            </thead>
            <tbody>
              {목록.data.map((v) => (
                <tr key={v.version}>
                  <td className="prd-id">{v.version}</td>
                  <td>
                    {v.savedByName} · {출처글[v.source]}
                  </td>
                  <td>{when(v.savedAt, 언어)}</td>
                  <td className="prd-vact">
                    {v.version === 지금판 ? (
                      <span className="prd-plain">{t('지금 판')}</span>
                    ) : !쓰나 ? null : 묻는판 === v.version ? (
                      <>
                        <button className="btn small" disabled={busy} onClick={() => void 되돌리기(v.version)}>
                          {t('판 {판}으로 되돌리기 확인', { 판: v.version })}
                        </button>
                        <button className="btn ghost small" onClick={() => set묻는판(null)}>
                          {t('취소')}
                        </button>
                      </>
                    ) : (
                      <button className="btn ghost small" onClick={() => set묻는판(v.version)}>
                        {t('이 판으로 되돌리기')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
