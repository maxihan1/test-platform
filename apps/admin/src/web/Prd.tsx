// 「PRD 관리」 화면 — 표준 기획서를 보고 고치고 확정한다 (도메인/작성 §3.6 「★ 표준 기획서」 「사람이 고칠 때」 · 2026-10-10 시안 C 「할 일 먼저」)
// 저장 · 확정 · 되돌리기는 모두 바로 새 판이다. 테스트에 넣는 반영 버튼은 PrdTodo 의 반영 안 됨 칸이다 — 작성 요청 하나 · PR 하나 (PR #207)

import { useMemo, useState } from 'react';

import type { 결과읽기 } from '../prd/trace.js';
import { api, ApiError } from './api.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { prdApi } from './prdApi.js';
import { PrdList } from './PrdList.js';
import { PrdTodo } from './PrdTodo.js';
import { PrdVersions } from './PrdVersions.js';
import type { 판정 } from './role.js';
import { Failed, Loading, message, useAsync, 받을이름, 파일로저장 } from './ui.js';

/** 새 판을 짓는 일 하나. 지금 판 번호를 넘겨 보낸다 — 그 사이 다른 저장이 있었으면 서버가 PRD_STALE 로 막는다 */
export type 판짓기 = (일: (baseVersion: number) => Promise<{ version: number }>) => Promise<boolean>;

// 여기 — 케이스 목록의 요구 번호에서 왔다. 그 항목을 펴서 보인다 (도메인/카탈로그 §8.1 「맥락」)
// 결과보나 · 케이스보나 — 실행 · 케이스 칸이 none 이면 마지막 결과를 안 부르고 케이스 목록 고리를 안 단다. 부르면 서버가 403 을 낸다
export function Prd({
  service,
  할수,
  여기,
  결과보나 = false,
  케이스보나 = false,
}: {
  service: string;
  할수: 판정;
  여기?: string;
  결과보나?: boolean;
  케이스보나?: boolean;
}) {
  const t = use말();
  const 언어 = use언어();
  const 판 = useAsync(() => prdApi.now(service), [service]);
  const [알림, set알림] = useState<{ ok: boolean; 글: string } | null>(null);
  const [이력, set이력] = useState(false);
  const [더하기, set더하기] = useState(false);
  const [받는중, set받는중] = useState<'docx' | 'xlsx' | null>(null);
  // 마지막 결과는 케이스 목록과 같은 통로다 (도메인/작성 §7 GET /api/prd `cases`). 못 받으면 결과 칸만 빈다 — 메뉴는 그대로 쓴다
  const last = useAsync(() => (결과보나 ? api.lastByCase() : Promise.resolve(null)), [결과보나]);
  const 결과 = useMemo((): 결과읽기 | null => {
    if (last.data === null) return null;
    const 표 = new Map(last.data.items.map((l) => [`${l.tcId}:${l.platform}`, l.status]));
    return (tcId, platform) => 표.get(`${tcId}:${platform}`);
  }, [last.data]);

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

  // 워드는 역기획서 워드의 자리, 엑셀은 요구사항 추적표다 — 보기 권한이면 받는다 (도메인/작성 §3.6 「워드로 내려받기」 · 「메뉴가 곧 요구사항 추적표다」)
  const 받기 = async (형식: 'docx' | 'xlsx') => {
    set받는중(형식);
    set알림(null);
    try {
      const { 파일, 머리 } = await (형식 === 'docx' ? prdApi.wordExport(service) : prdApi.rtmExport(service));
      파일로저장(파일, 받을이름(머리, 형식 === 'docx' ? `${service}-PRD.docx` : `${service}-RTM.xlsx`));
    } catch (err) {
      set알림({ ok: false, 글: message(err, 언어) });
    } finally {
      set받는중(null);
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
              <>
                <button className="btn ghost" onClick={() => void 받기('docx')} disabled={받는중 !== null}>
                  {받는중 === 'docx' ? t('만드는 중…') : t('워드로 내려받기')}
                </button>
                <button className="btn ghost" onClick={() => void 받기('xlsx')} disabled={받는중 !== null}>
                  {받는중 === 'xlsx' ? t('만드는 중…') : t('추적표 엑셀로 내려받기')}
                </button>
                <button className="btn ghost" aria-expanded={이력} onClick={() => set이력(!이력)}>
                  {t('판 이력')}
                </button>
              </>
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
      {/* 못 읽은 것을 「실패 없음」으로 보이면 안 된다 — 결과 칸이 왜 비었는지 적는다 */}
      {last.error === null ? null : <p className="prd-note bad">{t('마지막 결과를 못 읽었습니다 — {까닭}', { 까닭: last.error })}</p>}
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
          <PrdList
            service={service}
            now={now}
            쓰나={쓰나}
            짓기={짓기}
            더하기={더하기}
            on더하기닫기={() => set더하기(false)}
            여기={여기}
            결과={결과}
            케이스보나={케이스보나}
          />
        </>
      )}
    </>
  );
}
