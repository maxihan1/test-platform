// 「PRD 관리」 할 일 칸의 「보류」 카드 — 계정이 없어 테스트를 못 쓴 요구를 보이고, 계정을 넣은 뒤 그 요구만 이어 작성하게 한다 (도메인/작성 §3.6 「★ 역할별 계정」 「보류 카드」)

import { useState } from 'react';

import { api } from './api.js';
import { 보류오류문장 } from './AuthoringHeld.js';
import { use말, use언어 } from './i18n.js';
import type { PrdHeld } from './prdApi.js';

export function PrdHeldCard({ service, held, 쓰나 }: { service: string; held: PrdHeld; 쓰나: boolean }) {
  const t = use말();
  const 언어 = use언어();
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const 건수 = Object.keys(held.reqs).length;
  const 다등록 = held.roles.length > 0 && held.roles.every((r) => r.registered);
  // 아직 계정이 없는 역할만 적는다 — 넣은 역할까지 적으면 무엇을 더 등록해야 하는지 흐려진다
  const 역할글 = held.roles.filter((r) => 다등록 || !r.registered).map((r) => r.role).join(' · ');
  const 뿌리 = held.continueFrom;

  function 이어작성(): void {
    if (보내는중 || 뿌리 === null) return;
    set보내는중(true);
    set오류(null);
    // 새 요청이라 새 번호로 간다 — 작성 상세의 「남은 요구로 이어 작성」과 같은 통로다
    void api
      .createAuthoringRequest(service, { kind: 'AUTHOR', continueFrom: 뿌리 })
      .then(({ id }) => {
        window.location.hash = `#/authoring/${String(id)}`;
      })
      .catch((err: unknown) => set오류(보류오류문장(err, 언어)))
      .finally(() => set보내는중(false));
  }

  return (
    <section className="prd-card" aria-labelledby="prd-held-title">
      <header>
        <h2 id="prd-held-title">
          {다등록
            ? t('보류 {건수}건 — {역할} 계정을 등록했습니다', { 건수, 역할: 역할글 })
            : t('보류 {건수}건 — {역할} 계정이 등록되지 않았습니다', { 건수, 역할: 역할글 })}
        </h2>
        <small>{다등록 ? t('이어 작성하면 이 요구만 다시 작성합니다') : t('등록하면 이 요구만 다시 작성합니다')}</small>
      </header>
      <footer>
        <a className="btn ghost small" href={`#/settings/${encodeURIComponent(service)}`}>
          {t('설정에서 계정 등록')}
        </a>
        {쓰나 ? (
          <>
            <button className="btn small" disabled={보내는중 || 뿌리 === null} onClick={이어작성}>
              {t('남은 요구로 이어 작성')}
            </button>
            {뿌리 === null ? (
              <span className="note">{다등록 ? t('이어 작성할 작성 요청이 없습니다') : t('계정을 등록한 뒤에 이어 작성할 수 있습니다')}</span>
            ) : null}
          </>
        ) : null}
        {오류 === null ? null : (
          <span className="note" role="alert">
            {오류}
          </span>
        )}
      </footer>
    </section>
  );
}
