// 작성 상세의 겹친 케이스 — 케이스마다 남긴다 · 뺀다 고르기 (도메인/작성 §3.6 「★ 반영 때 겹침 검사」 · DESIGN.md 「작성 상태」 시안 A 표)

import { useState } from 'react';

import { api, type AuthoringConflict, type AuthoringConflictAction, type AuthoringConflictKind } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message, when } from './ui.js';

const 종류글: Record<AuthoringConflictKind, string> = {
  TCID: '번호 겹침',
  REQUIREMENT: '요구 번호 겹침',
  NAME: '이름 겹침',
};

interface Props {
  service: string;
  /** 반영하려는 작성 실행 번호 — 서버가 결정을 이 행에 붙인다 */
  요청번호: number;
  conflicts: AuthoringConflict[];
  /** 작성 쓰기 권한. **화면이 버튼을 안 그리는 것은 편의다** — 서버 gate 가 다시 막는다 */
  편집: boolean;
  reload: () => void;
}

export function AuthoringConflicts({ service, 요청번호, conflicts, 편집, reload }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);

  if (conflicts.length === 0) return null;
  const 남은 = conflicts.filter((c) => c.input === null).length;

  // 막는 것은 서버다 — 한 줄이라도 실패하면 거기서 멈추고 까닭을 보인다. 이미 간 것은 그대로 남는다
  function 보낸다(일들: (() => Promise<unknown>)[]) {
    if (보내는중) return;
    set보내는중(true);
    set오류(null);
    void 일들
      .reduce<Promise<unknown>>((앞, 일) => 앞.then(일), Promise.resolve())
      .catch((err: unknown) => set오류(message(err, 언어)))
      .finally(() => {
        set보내는중(false);
        reload();
      });
  }

  const 고른다 = (c: AuthoringConflict, a: AuthoringConflictAction) => () => api.putAuthoringConflict(service, 요청번호, c.tcId, a);

  return (
    <section id="conflicts" className="authoring-panel authoring-conflicts" aria-labelledby="conflicts-title">
      <div className="conflicts-head">
        <h3 id="conflicts-title">
          {t('겹친 케이스')} <span className="hint">{t('{수}건 · 아직 고르지 않은 것 {남은}건', { 수: conflicts.length, 남은 })}</span>
        </h3>
        {편집 && 남은 > 0 ? (
          <button
            className="btn ghost"
            type="button"
            disabled={보내는중}
            onClick={() => 보낸다(conflicts.filter((c) => c.input === null).map((c) => 고른다(c, 'KEEP')))}
          >
            {t('모두 남긴다')}
          </button>
        ) : null}
      </div>
      <p className="hint">
        {t('먼저 반영된 케이스와 번호 · 요구 번호 · 이름이 겹칩니다. 케이스마다 남길지 뺄지 고른 뒤에 반영할 수 있습니다.')}
      </p>
      {오류 === null ? null : <p className="error-text">{오류}</p>}
      <div className="authoring-diffs-wrap">
        <table className="dhist" aria-label={t('겹친 케이스')}>
          <thead>
            <tr>
              <th>{t('케이스')}</th>
              <th>{t('무엇이 겹쳤나')}</th>
              <th>{t('겹친 main 케이스')}</th>
              <th>{t('고른 것')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {conflicts.map((c) => (
              <tr key={c.tcId}>
                <td>
                  <span className="mono">{c.tcId}</span>
                  <br />
                  {c.name}
                </td>
                <td>
                  {c.kinds.map((k) => (
                    <span key={k} className="held-chip">
                      {t(종류글[k])}
                    </span>
                  ))}
                  {c.requirements === undefined || c.requirements.length === 0 ? null : (
                    <>
                      <br />
                      <span className="hint">{c.requirements.join(' · ')}</span>
                    </>
                  )}
                </td>
                <td>
                  {c.with.map((w) => (
                    <div key={`${w.tcId}-${w.file}`}>
                      <span className="mono">{w.tcId}</span> {w.name}
                    </div>
                  ))}
                </td>
                <td>
                  {c.input === null ? (
                    t('아직 안 고름')
                  ) : (
                    <>
                      {c.input.action === 'KEEP' ? t('남긴다') : t('뺀다')}
                      <br />
                      <span className="hint">
                        {c.input.by} · {when(c.input.at, 언어)}
                      </span>
                      {c.input.action === 'KEEP' && c.kinds.includes('TCID') ? (
                        <>
                          <br />
                          <span className="hint">{t('번호가 겹쳐 반영할 때 새 번호를 받습니다')}</span>
                        </>
                      ) : null}
                    </>
                  )}
                </td>
                <td className="held-btns">
                  {!편집 ? null : (
                    <>
                      <button className={c.input?.action === 'KEEP' ? 'btn' : 'btn ghost'} type="button" disabled={보내는중} onClick={() => 보낸다([고른다(c, 'KEEP')])}>
                        {t('남긴다')}
                      </button>
                      <button className={c.input?.action === 'DROP' ? 'btn' : 'btn ghost'} type="button" disabled={보내는중} onClick={() => 보낸다([고른다(c, 'DROP')])}>
                        {t('뺀다')}
                      </button>
                      {c.input === null ? null : (
                        <button
                          className="btn ghost"
                          type="button"
                          disabled={보내는중}
                          onClick={() => 보낸다([() => api.deleteAuthoringConflict(service, 요청번호, c.tcId)])}
                        >
                          {t('되돌리기')}
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
