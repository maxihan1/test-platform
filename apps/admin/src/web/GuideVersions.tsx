// 서비스 가이드 버전 기록 — 판마다 누가 · 언제 · 무엇이 바뀌었나, 누르면 그 판을 읽기 전용으로 본다 (도메인/작성 §3.6 「★ 서비스 가이드」 「버전 기록」)
// 되돌리기는 없다 (2026-10-17 사용자 — 보기만). 판에서 뺀 파일도 지우지 않아 옛 판에서 열린다

import { useState } from 'react';

import type { GuideVersionRow } from '@platform/kit';

import { guideApi } from './guideApi.js';
import { GuideSection, 구획들, 구획이름 } from './GuideSection.js';
import { use말, use언어 } from './i18n.js';
import { Failed, Loading, useAsync, when } from './ui.js';

function 바뀐것({ changed }: { changed: GuideVersionRow['changed'] }) {
  const t = use말();
  const 줄 = [
    ...changed.sections.map((s) => t('글 고침 — {구획}', { 구획: t(구획이름[s]) })),
    ...changed.added.map((f) => t('더함 — {이름}', { 이름: f.name })),
    ...changed.removed.map((f) => t('뺌 — {이름}', { 이름: f.name })),
  ];
  return <>{줄.length === 0 ? '—' : 줄.join(' · ')}</>;
}

export function GuideVersions({ service, 지금판 }: { service: string; 지금판: number }) {
  const t = use말();
  const 언어 = use언어();
  // 지금 판이 바뀌면(저장 · 더하기 · 빼기) 목록도 다시 읽는다
  const 목록 = useAsync(() => guideApi.versions(service), [service, 지금판]);
  const [본판, set본판] = useState<number | null>(null);
  const 판 = useAsync(() => (본판 === null ? Promise.resolve(null) : guideApi.version(service, 본판)), [service, 본판]);

  return (
    <section className="screen prd-versions" aria-labelledby="guide-versions-title">
      <div className="toolbar">
        <h2 id="guide-versions-title" className="prd-all-title">
          {t('버전 기록')}
        </h2>
        <span className="note">{t('옛 버전은 볼 수만 있습니다')}</span>
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
                <th>{t('버전')}</th>
                <th>{t('저장한 사람')}</th>
                <th>{t('저장 일시')}</th>
                <th>{t('바뀐 것')}</th>
                <th aria-label={t('보기')} />
              </tr>
            </thead>
            <tbody>
              {목록.data.map((v) => (
                <tr key={v.version}>
                  <td className="prd-id">{v.version}</td>
                  <td>{v.savedByName}</td>
                  <td>{when(v.savedAt, 언어)}</td>
                  <td>
                    <바뀐것 changed={v.changed} />
                  </td>
                  <td className="prd-vact">
                    {v.version === 지금판 ? (
                      <span className="prd-plain">{t('현재 버전')}</span>
                    ) : (
                      <button
                        className="btn ghost small"
                        aria-pressed={본판 === v.version}
                        onClick={() => set본판(본판 === v.version ? null : v.version)}
                      >
                        {t('버전 {버전} 보기', { 버전: v.version })}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {본판 === null ? null : 판.error !== null ? (
        <Failed error={판.error} />
      ) : 판.data === null ? (
        <Loading />
      ) : (
        <div className="guide-old" aria-label={t('버전 {버전} 읽기 전용', { 버전: 본판 })} role="group">
          {구획들.map((s) => (
            <GuideSection
              key={s}
              service={service}
              section={s}
              글={판.data![s]}
              files={판.data!.files.filter((f) => f.section === s)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
