// 표준 기획서 버전 기록 — 버전마다 누가 언제 무엇으로 만들었는지, 무엇이 바뀌었는지와 복원 (도메인/작성 §3.6 「★ 표준 기획서」 「판 이력」)
// 복원도 새 버전이고 옛 버전은 지우지 않는다 — 그래서 확인 상자 대신 그 자리에서 한 번 더 묻는다
// 바뀐 것은 저장하지 않고 앞 버전과 견줘 그때 계산한다 — 서버 칸이 없다(점검 8.8)

import type { PrdItem } from '@platform/kit';
import { useRef, useState } from 'react';

import { use말, use언어 } from './i18n.js';
import type { 판짓기 } from './Prd.js';
import { prdApi, type PrdVersionRow } from './prdApi.js';
import { use반영종류글 } from './PrdTodo.js';
import { 판차이, type 차이줄 } from './prdView.js';
import { Failed, Loading, useAsync, when } from './ui.js';

/** 이 화면을 연 동안 읽은 버전. 옛 버전은 고치지 않으니 다시 읽지 않는다 */
type 읽은판 = Map<number, Promise<PrdItem[]>>;

/** 한 줄이 최근 몇 개까지 열자마자 계산하나 — 그 밖은 누를 때 읽는다(버전마다 요구 전체를 읽어야 해서) */
const 바로계산 = 10;

function 차이줄글({ 줄 }: { 줄: 차이줄 }) {
  const t = use말();
  const 종류글 = use반영종류글();
  const 상태 = 줄.뒤?.status === 'CONFIRMED' ? t('확정으로 바뀜') : t('확인 필요로 바뀜');
  return (
    <li>
      <span className="prd-kind">{줄.kind === 'state' ? t('상태만 바뀜') : 종류글[줄.kind]}</span>
      <span className="prd-id">{줄.reqId}</span>
      {줄.kind === 'state' ? (
        <span>{상태}</span>
      ) : 줄.kind === 'changed' && 줄.앞 !== null && 줄.뒤 !== null ? (
        <span className="prd-diff-text">
          {줄.앞.text === 줄.뒤.text ? (
            <>
              {줄.앞.feature === 줄.뒤.feature
                ? t('근거가 바뀜')
                : t('기능 묶음 {앞} → {뒤}', {
                    앞: 줄.앞.feature,
                    뒤: 줄.뒤.feature,
                  })}
            </>
          ) : (
            <>
              <del>{줄.앞.text}</del> → {줄.뒤.text}
            </>
          )}
        </span>
      ) : (
        <span className="prd-diff-text">{(줄.뒤 ?? 줄.앞)?.text}</span>
      )}
    </li>
  );
}

function 바뀐것({ service, 판, 앞판, 읽은, 바로 }: { service: string; 판: number; 앞판: number | null; 읽은: 읽은판; 바로: boolean }) {
  const t = use말();
  const 종류글 = use반영종류글();
  const [읽음, set읽음] = useState(바로);
  const [폄, set폄] = useState(false);
  const 읽기 = (v: number) => {
    const 있던 = 읽은.get(v);
    if (있던 !== undefined) return 있던;
    const 새 = prdApi.version(service, v).then((x) => x.items);
    // 실패한 읽기는 남기지 않는다 — 다시 누르면 다시 읽는다
    새.catch(() => 읽은.delete(v));
    읽은.set(v, 새);
    return 새;
  };
  const 차이 = useAsync(() => (!읽음 || 앞판 === null ? Promise.resolve(null) : Promise.all([읽기(앞판), 읽기(판)]).then(([앞, 뒤]) => 판차이(앞, 뒤))), [service, 판, 앞판, 읽음]);

  if (앞판 === null) return <span className="prd-plain">{t('처음 버전')}</span>;
  if (!읽음) {
    return (
      <button
        className="btn ghost small"
        onClick={() => {
          set읽음(true);
          set폄(true);
        }}
      >
        {t('바뀐 것 보기')}
      </button>
    );
  }
  if (차이.error !== null) return <span className="prd-note bad">{차이.error}</span>;
  if (차이.data === null) return <span className="prd-plain">…</span>;

  const 줄들 = 차이.data;
  const 셈 = (kind: 차이줄['kind']) => 줄들.filter((x) => x.kind === kind).length;
  const 요약 = [...(['changed', 'added', 'removed'] as const).map((k) => [종류글[k], 셈(k)] as const), [t('상태만 바뀜'), 셈('state')] as const]
    .filter(([, 수]) => 수 > 0)
    .map(([이름, 수]) => t('{종류} {건수}건', { 종류: 이름, 건수: 수 }))
    .join(' · ');
  if (줄들.length === 0) return <span className="prd-plain">{t('바뀐 요구 없음')}</span>;
  return (
    <>
      <button className="btn ghost small" aria-expanded={폄} onClick={() => set폄(!폄)}>
        {요약}
      </button>
      {!폄 ? null : (
        <ul className="prd-diff" aria-label={t('버전 {버전}에서 바뀐 요구', { 버전: 판 })}>
          {줄들.map((줄) => (
            <차이줄글 key={줄.reqId} 줄={줄} />
          ))}
        </ul>
      )}
    </>
  );
}

export function PrdVersions({ service, 지금판, 쓰나, 짓기 }: { service: string; 지금판: number; 쓰나: boolean; 짓기: 판짓기 }) {
  const t = use말();
  const 언어 = use언어();
  // 지금 판이 바뀌면(저장 · 확정 · 되돌리기) 목록도 다시 읽는다
  const 목록 = useAsync(() => prdApi.versions(service), [service, 지금판]);
  const 읽은 = useRef<읽은판>(new Map());
  const [묻는판, set묻는판] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const 출처글: Record<PrdVersionRow['source'], string> = {
    AGENT: t('AI 작성'),
    PERSON: t('직접 수정'),
    REVERT: t('복원'),
  };

  async function 되돌리기(toVersion: number) {
    setBusy(true);
    if (await 짓기((base) => prdApi.revert(service, base, toVersion))) set묻는판(null);
    setBusy(false);
  }

  return (
    <section className="screen prd-versions" aria-labelledby="prd-versions-title">
      <div className="toolbar">
        <h2 id="prd-versions-title" className="prd-all-title">
          {t('버전 기록')}
        </h2>
        <span className="note">{t('복원해도 새 버전으로 저장됩니다. 이전 버전은 남아 있습니다')}</span>
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
                <th aria-label={t('복원')} />
              </tr>
            </thead>
            <tbody>
              {목록.data.map((v, i) => (
                <tr key={v.version}>
                  <td className="prd-id">{v.version}</td>
                  <td>
                    {v.savedByName} · {출처글[v.source]}
                  </td>
                  <td>{when(v.savedAt, 언어)}</td>
                  <td className="prd-vchange">
                    {/* 목록은 새 버전부터다. 앞 버전은 바로 다음 줄이다 */}
                    <바뀐것 service={service} 판={v.version} 앞판={목록.data![i + 1]?.version ?? null} 읽은={읽은.current} 바로={i < 바로계산} />
                  </td>
                  <td className="prd-vact">
                    {v.version === 지금판 ? (
                      <span className="prd-plain">{t('현재 버전')}</span>
                    ) : !쓰나 ? null : 묻는판 === v.version ? (
                      <>
                        <button className="btn small" disabled={busy} onClick={() => void 되돌리기(v.version)}>
                          {t('버전 {버전} 복원 확인', { 버전: v.version })}
                        </button>
                        <button className="btn ghost small" onClick={() => set묻는판(null)}>
                          {t('취소')}
                        </button>
                      </>
                    ) : (
                      <button className="btn ghost small" onClick={() => set묻는판(v.version)}>
                        {t('이 버전으로 복원')}
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
