// 「API 문서」의 버전 기록 표 — PRD 관리 · 애플리케이션 가이드의 「버전 기록」과 같은 칸에 받은 곳 하나를 더했다 (도메인/API §8.13)

import { useState } from 'react';

import { apiDocApi, type ApiDocVersionRow } from './apiDocApi.js';
import { 바뀐종류, 받은곳 } from './apidocView.js';
import { use말, use언어 } from './i18n.js';
import { use반영종류글 } from './prdWords.js';
import { Failed, Loading, useAsync, when } from './ui.js';

// 앞 몇 줄은 열자마자 바뀐 것을 센다 — PRD 버전 기록(바로계산)과 같은 까닭. 그 아래는 누를 때 읽는다
const 바로계산 = 3;

function 바뀐것({ id, 판, 앞판, 바로 }: { id: number; 판: number; 앞판: number | null; 바로: boolean }) {
  const t = use말();
  const 종류글 = use반영종류글();
  const [읽음, set읽음] = useState(바로);
  const [폄, set폄] = useState(false);
  const 차이 = useAsync(
    () => (!읽음 || 앞판 === null ? Promise.resolve(null) : apiDocApi.compare(id, 앞판, 판).then((x) => x.changes)),
    [id, 판, 앞판, 읽음],
  );

  if (앞판 === null) return <span className="prd-plain">{t('처음 버전')}</span>;
  if (!읽음) {
    return (
      <button className="btn ghost small" onClick={() => { set읽음(true); set폄(true); }}>
        {t('바뀐 것 보기')}
      </button>
    );
  }
  if (차이.error !== null) return <span className="prd-note bad">{차이.error}</span>;
  if (차이.data === null) return <span className="prd-plain">…</span>;
  const 줄들 = 차이.data;
  if (줄들.length === 0) return <span className="prd-plain">{t('바뀐 API 없음')}</span>;
  const 요약 = (['CHANGED', 'NEW', 'REMOVED'] as const)
    .map((k) => [종류글[바뀐종류[k]], 줄들.filter((x) => x.change === k).length] as const)
    .filter(([, 수]) => 수 > 0)
    .map(([이름, 수]) => t('{종류} {건수}건', { 종류: 이름, 건수: 수 }))
    .join(' · ');
  return (
    <>
      <button className="btn ghost small" aria-expanded={폄} onClick={() => set폄(!폄)}>
        {요약}
      </button>
      {!폄 ? null : (
        <ul className="prd-diff" aria-label={t('버전 {버전}에서 바뀐 API', { 버전: 판 })}>
          {줄들.map((c) => (
            <li key={`${c.method} ${c.path}`}>
              <span className="prd-kind">{종류글[바뀐종류[c.change]]}</span> <span className="prd-api-m">{c.method}</span>{' '}
              <span className="prd-id">{c.path}</span>
              {c.notes.length === 0 ? null : <span className="prd-text"> {c.notes.join(' · ')}</span>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function 원문({ id, 판, on닫기 }: { id: number; 판: number; on닫기: () => void }) {
  const t = use말();
  const 읽은 = useAsync(() => apiDocApi.doc(id, 판), [id, 판]);
  return (
    <div className="api-raw" role="group" aria-label={t('버전 {버전} 원문', { 버전: 판 })}>
      <div className="toolbar">
        <strong>{t('버전 {버전} 원문', { 버전: 판 })}</strong>
        <button className="btn ghost small" onClick={on닫기}>
          {t('닫기')}
        </button>
      </div>
      {읽은.error !== null ? <Failed error={읽은.error} /> : 읽은.data === null ? <Loading /> : <pre>{JSON.stringify(읽은.data.doc, null, 2)}</pre>}
    </div>
  );
}

/** 연버전 — 작성 상세의 「API 문서 버전 N」에서 왔다. 그 버전 원문을 펴 둔다 */
export function ApiDocVersions({ id, versions, 연버전 }: { id: number; versions: ApiDocVersionRow[]; 연버전?: number }) {
  const t = use말();
  const 언어 = use언어();
  const [본판, set본판] = useState<number | null>(연버전 !== undefined && versions.some((v) => v.version === 연버전) ? 연버전 : null);
  return (
    <section className="screen prd-versions" aria-labelledby="api-versions-title">
      <div className="toolbar">
        <h2 id="api-versions-title" className="prd-all-title">
          {t('버전 기록')}
        </h2>
        <span className="note">{t('옛 버전은 볼 수만 있습니다')}</span>
      </div>
      <div className="prd-vscroll">
        <table className="prd-vtable">
          <thead>
            <tr>
              <th>{t('버전')}</th>
              <th>{t('받은 곳')}</th>
              <th>{t('저장한 사람')}</th>
              <th>{t('저장 일시')}</th>
              <th>{t('바뀐 것')}</th>
              <th aria-label={t('보기')} />
            </tr>
          </thead>
          <tbody>
            {versions.map((v, i) => (
              <tr key={v.version}>
                <td className="prd-id">{v.version}</td>
                <td>{받은곳(v, t)}</td>
                {/* 정기 실행이 실행 시작 때 올린 버전은 누른 사람이 없다 */}
                <td>{v.createdBy ?? t('정기 실행')}</td>
                <td>{when(v.createdAt, 언어)}</td>
                <td className="prd-vchange">
                  {/* 목록은 새 버전부터다. 앞 버전은 바로 다음 줄이다 */}
                  <바뀐것 id={id} 판={v.version} 앞판={versions[i + 1]?.version ?? null} 바로={i < 바로계산} />
                </td>
                <td className="prd-vact">
                  {i === 0 ? <span className="prd-plain">{t('현재 버전')}</span> : null}{' '}
                  <button className="btn ghost small" aria-expanded={본판 === v.version} onClick={() => set본판(본판 === v.version ? null : v.version)}>
                    {t('버전 {버전} 보기', { 버전: v.version })}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {본판 === null ? null : <원문 id={id} 판={본판} on닫기={() => set본판(null)} />}
    </section>
  );
}
