// 「PRD 관리」 화면 — 표준 기획서를 보고 고치고 확정한다 (도메인/작성 §3.6 「★ 표준 기획서」 「사람이 고칠 때」 · 2026-10-10 시안 C 「할 일 먼저」)
// 저장 · 확정 · 되돌리기는 모두 바로 새 판이다. 테스트에 넣는 반영 버튼은 받는 쪽(PRD-F4-03)이 같이 붙인다 (2026-10-10 사용자)

import { useState } from 'react';

import { ApiError } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { prdApi } from './prdApi.js';
import { PrdList } from './PrdList.js';
import { PrdTodo } from './PrdTodo.js';
import { PrdVersions } from './PrdVersions.js';
import type { 판정 } from './role.js';
import { Failed, Loading, message, useAsync } from './ui.js';

/** 새 판을 짓는 일 하나. 지금 판 번호를 넘겨 보낸다 — 그 사이 다른 저장이 있었으면 서버가 PRD_STALE 로 막는다 */
export type 판짓기 = (일: (baseVersion: number) => Promise<{ version: number }>) => Promise<boolean>;

export function Prd({ service, 할수 }: { service: string; 할수: 판정 }) {
  const t = use말();
  const 언어 = use언어();
  const 판 = useAsync(() => prdApi.now(service), [service]);
  const [알림, set알림] = useState<{ ok: boolean; 글: string } | null>(null);
  const [이력, set이력] = useState(false);
  const [더하기, set더하기] = useState(false);

  if (판.error !== null) return <Failed error={판.error} />;
  if (판.data === null) return <Loading />;
  const now = 판.data;
  // 보기는 작성 read, 고치기 · 확정 · 되돌리기는 작성 write (도메인/작성 §3.6 「사람이 고칠 때」). 서버가 다시 막는다
  const 쓰나 = 할수('작성요청');

  const 짓기: 판짓기 = async (일) => {
    try {
      const { version } = await 일(now.version);
      set알림({ ok: true, 글: t('판 {판}으로 저장했습니다', { 판: version }) });
      await 판.reload();
      return true;
    } catch (err) {
      set알림({ ok: false, 글: message(err, 언어) });
      // 다른 사람이 먼저 저장했다 — 지금 판을 다시 읽어야 다시 보낼 수 있다. 고치던 칸은 그 요구가 남아 있으면 그대로 남는다
      if (err instanceof ApiError && err.code === 'PRD_STALE') await 판.reload();
      return false;
    }
  };

  return (
    <>
      <Head
        제목={t('PRD 관리')}
        부제={now.version === 0 ? t('아직 PRD 가 없습니다') : t('판 {판} · 요구 {건수}건', { 판: now.version, 건수: now.items.length })}
        행동={
          <>
            {now.version === 0 ? null : (
              <button className="btn ghost" aria-expanded={이력} onClick={() => set이력(!이력)}>
                {t('판 이력')}
              </button>
            )}
            {쓰나 ? (
              <button className="btn" onClick={() => set더하기(true)} disabled={더하기}>
                {t('요구 더하기')}
              </button>
            ) : null}
          </>
        }
      />
      {알림 === null ? null : (
        <p role="status" className={알림.ok ? 'prd-note' : 'prd-note bad'}>
          {알림.글}
        </p>
      )}
      {이력 ? <PrdVersions service={service} 지금판={now.version} 쓰나={쓰나} 짓기={짓기} /> : null}
      {now.version === 0 && !더하기 ? (
        <div className="screen">
          <div className="empty">
            {t('아직 PRD 가 없습니다')}
            {쓰나 ? <small>{t('요구 더하기로 첫 요구를 적습니다')}</small> : null}
          </div>
        </div>
      ) : (
        <>
          {now.version === 0 ? null : <PrdTodo service={service} now={now} 쓰나={쓰나} 짓기={짓기} />}
          <PrdList service={service} now={now} 쓰나={쓰나} 짓기={짓기} 더하기={더하기} on더하기닫기={() => set더하기(false)} />
        </>
      )}
    </>
  );
}
