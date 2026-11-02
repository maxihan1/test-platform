// 반영이 실패했을 때 까닭과 그 까닭에 맞는 다음 길 — 실패한 반영은 최신 실행에서 빠져 까닭이 실행 기록에만 남았다 (도메인/작성 §3.6 「★ 반영 때 겹침 검사」 · 점검 12.5)

import { useState } from 'react';

import { api, type AuthoringRun } from './api.js';
import { 실패글 } from './authoringFailText.js';
import { use말, use언어 } from './i18n.js';
import { message, 기다림글자 } from './ui.js';

/**
 * 에이전트 반영 실패 글(scripts/authoring-merge.ts 끝내기 error)의 첫머리로 가른다. 모르는 글은 「부딪힘」 —
 * 새 main 위에서 처음부터 다시 만드는 길은 어느 까닭에도 틀리지 않는다. 값은 화면 글자가 아니라 갈래 이름이다
 */
export type 반영실패까닭 = 'CONFLICT' | 'CHECK' | 'BLIP' | 'CLASH';

export function 반영실패까닭of(error: string | null): 반영실패까닭 {
  const 첫줄 = (error ?? '').split('\n')[0] ?? '';
  if (/^겹치는 케이스/u.test(첫줄)) return 'CONFLICT';
  if (/^CI 가 빨갛다/u.test(첫줄)) return 'CHECK';
  // 17분 넘게 안 끝난 CI 는 빨간 것이 아니라 느린 것이다 — 다시 반영하면 된다(코드 검토)
  if (/^(CI 가 17분|CI 실행 목록을 못 읽어|CI 를 다시 못 돌렸다|PR 을 못 읽었다|초안을 못 풀었다|작성 에이전트가 꺼져)/u.test(첫줄)) return 'BLIP';
  return 'CLASH';
}

/** 「CI 가 빨갛다 (failure): https://…」 의 주소. 없으면 null */
const 검사주소 = (error: string | null): string | null => /https:\/\/\S+/u.exec(error ?? '')?.[0] ?? null;

/** 링크(#…)는 해시 라우터 주소를 덮는다 — 주소는 두고 그 자리로 내려가기만 한다 */
function 가기(id: string) {
  const 칸 = document.getElementById(id);
  칸?.scrollIntoView();
  칸?.focus();
}

interface Props {
  service: string;
  /** 가장 최근 실행 — 반영이 실패한 것만 그린다 */
  실행: AuthoringRun | undefined;
  /** 다시 작성의 원본(맨 처음 작성 요청). 모르거나 권한이 없으면 버튼을 안 그린다 */
  원본: number | null;
  권한: boolean;
  /** 반영(작성머지) 권한 — 없으면 「다시 반영」이 갈 단추가 없다 */
  반영권한: boolean;
  운영자: boolean;
  /** 이 작성 실행에 붙은 겹침 수 — 0 이면 고를 표가 없어 다시 작성 쪽으로 보낸다 */
  겹침수: number;
  reload: () => void;
}

export function AuthoringMergeFailed({ service, 실행, 원본, 권한, 반영권한, 운영자, 겹침수, reload }: Props) {
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

  const 읽은까닭 = 반영실패까닭of(실행.error);
  // 겹침 목록이 안 실렸으면(옛 · 거절된 끝내기) 내려갈 표가 없다
  const 까닭 = 읽은까닭 === 'CONFLICT' && 겹침수 === 0 ? 'CLASH' : 읽은까닭;
  const 글 = 실행.error === null ? null : 실패글(실행.error, 언어, 운영자);
  const 주소 = 까닭 === 'CHECK' ? 검사주소(실행.error) : null;
  const 다시작성단추 =
    권한 && 원본 !== null ? (
      <button className={까닭 === 'CLASH' ? 'btn' : 'btn ghost'} type="button" disabled={보내는중} onClick={다시작성}>
        <기다림글자 중={보내는중} 평소={t('같은 자료로 다시 작성')} 기다림={t('시작하는 중…')} />
      </button>
    ) : null;

  return (
    <section className="authoring-panel authoring-merge-failed" aria-label={t('반영하지 못했습니다')}>
      <h3>{t('반영하지 못했습니다')}</h3>
      <p>{글?.글 ?? t('반영 실패 까닭이 기록되지 않았습니다')}</p>
      {글?.원문 == null ? null : (
        <details className="status-raw">
          <summary>{t('원문 보기')}</summary>
          <pre className="mono">{글.원문}</pre>
        </details>
      )}
      {까닭 === 'CONFLICT' ? (
        <>
          <p className="hint">{t('아래 표에서 케이스마다 고른 뒤 다시 반영하세요.')}</p>
          {/* 고르는 단추는 작성 쓰기 권한에만 있다 — 없는 사람에게는 내려갈 곳이 없다 */}
          {권한 ? (
            <div className="btns">
              <button className="btn" type="button" onClick={() => 가기('conflicts')}>
                {t('중복 케이스 고르기')}
              </button>
            </div>
          ) : null}
        </>
      ) : 까닭 === 'BLIP' ? (
        <>
          <p className="hint">{t('잠깐 끊긴 것이라 그대로 다시 반영하면 됩니다.')}</p>
          {반영권한 ? (
            <div className="btns">
              <button className="btn" type="button" onClick={() => 가기('merge-button')}>
                {t('다시 반영')}
              </button>
            </div>
          ) : (
            <p className="hint">{t('반영은 관리자만 할 수 있습니다.')}</p>
          )}
        </>
      ) : (
        <>
          <p className="hint">
            {까닭 === 'CHECK'
              ? t('만든 테스트가 자동 검사를 통과하지 못했습니다. 검사 결과를 보고 같은 자료로 다시 작성하세요.')
              : t('같은 자료로 다시 작성하면 지금까지 반영된 케이스를 기준으로 처음부터 다시 만듭니다. 지금까지의 실행은 실행 기록에 남습니다.')}
          </p>
          <div className="btns">
            {주소 === null ? null : (
              <a className="btn ghost" href={주소} target="_blank" rel="noreferrer">
                {t('검사 결과 보기')}
              </a>
            )}
            {다시작성단추}
          </div>
        </>
      )}
      {오류 === null ? null : <p className="error-text">{오류}</p>}
    </section>
  );
}
