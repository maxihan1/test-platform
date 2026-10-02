// 반영이 실패했을 때 까닭과 「같은 자료로 다시 작성」 — 실패한 반영은 최신 실행에서 빠져 까닭이 실행 기록에만 남았다 (도메인/작성 §3.6 「★ 반영 때 겹침 검사」)

import { useState } from 'react';

import { api, type AuthoringRun } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message } from './ui.js';

interface Props {
  service: string;
  /** 가장 최근 실행 — 반영이 실패한 것만 그린다 */
  실행: AuthoringRun | undefined;
  /** 다시 작성의 원본(맨 처음 작성 요청). 모르거나 권한이 없으면 버튼을 안 그린다 */
  원본: number | null;
  권한: boolean;
  reload: () => void;
}

export function AuthoringMergeFailed({ service, 실행, 원본, 권한, reload }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  if (실행?.kind !== 'MERGE' || 실행.status !== 'FAILED') return null;

  function 다시작성() {
    if (원본 === null || 보내는중) return;
    set보내는중(true);
    set오류(null);
    void api
      .createAuthoringRequest(service, { kind: 'RERUN', sourceId: 원본 })
      .then(reload)
      .catch((err: unknown) => set오류(message(err, 언어)))
      .finally(() => set보내는중(false));
  }

  return (
    <section className="authoring-panel authoring-merge-failed" aria-label={t('반영하지 못했습니다')}>
      <h3>{t('반영하지 못했습니다')}</h3>
      <p>{실행.error ?? t('반영 실패 까닭이 기록되지 않았습니다')}</p>
      {권한 && 원본 !== null ? (
        <>
          <p className="hint">{t('같은 자료로 다시 작성하면 새 main 위에서 처음부터 다시 만듭니다. 지금까지의 실행은 실행 기록에 남습니다.')}</p>
          <div className="btns">
            <button className="btn ghost" type="button" disabled={보내는중} onClick={다시작성}>
              {보내는중 ? t('시작하는 중…') : t('같은 자료로 다시 작성')}
            </button>
          </div>
        </>
      ) : null}
      {오류 === null ? null : <p className="error-text">{오류}</p>}
    </section>
  );
}
