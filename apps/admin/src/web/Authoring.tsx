// 테스트 작성 대기줄 목록. 무엇을 요청했고 맥이 어디까지 했는지 보는 자리다 (도메인/작성 §3.6 · §7)
//
// **코드는 여기 없다.** 이 화면이 드는 것은 요청과 작업 단계뿐이고, 테스트 코드는
// 맥이 초안 PR 로 저장소에 올린다 — 저장소가 계속 유일한 진실이다 (§1 영구 제외 표)

import { useEffect, useState } from 'react';

import { api, type AuthoringRow, type Paged } from './api.js';
import { AuthoringNew } from './AuthoringNew.js';
import { 보임라벨, 종류라벨, 줄보임, type 보임 } from './authoringView.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 다음이있나 } from './paging.js';
import { Failed, Loading, useAsync, when } from './ui.js';

function 표머리() {
  const t = use말();
  return (
    <div className="rowhead runhead" role="row">
      <span aria-hidden="true" />
      <span role="columnheader">{t('번호')}</span>
      <span role="columnheader">{t('작업 단계')}</span>
      <span role="columnheader">{t('상태')}</span>
      <span aria-hidden="true" />
    </div>
  );
}

/** 왼쪽 색 띠. 한눈에 훑기 위한 것이고 판정은 오른쪽 글자가 말한다 (SPEC §8.7 과 같은 규칙) */
function 띠색(보: 보임): string {
  if (보 === 'done') return 'var(--pass)';
  if (보 === 'failed' || 보 === 'stalled') return 'var(--fail)';
  return 'var(--na)';
}

function 작성줄({ 것, 지금 }: { 것: AuthoringRow; 지금: number }) {
  const t = use말();
  const 언어 = use언어();
  const 보 = 줄보임(것, 지금);
  return (
    <div className="row">
      <div className="gutter" style={{ background: 띠색(보) }} />
      <div className="tcid">#{것.id}</div>
      <div className="title">
        {/* 단계가 아직 없으면 빈 칸이 아니라 「기록 없음」이다 — 모르는 것을 아는 척하지 않는다 */}
        <a href={`#/authoring/${것.id}`}>{것.stage ?? t('기록 없음')}</a>
        <small>
          {종류라벨(것.kind, 언어)} · {t('요청한 사람')} {것.requestedByName} · {when(것.createdAt, 언어)}
        </small>
      </div>
      <div className="right">{보임라벨(보, 언어)}</div>
    </div>
  );
}

export function Authoring({ service }: { service: string }) {
  const t = use말();
  const [page, setPage] = useState(1);
  // 서비스를 바꾸면 첫 쪽으로. 안 그러면 다른 서비스에서 「없다」를 보여주고 왜인지 말하지 않는다
  const [본서비스, set본서비스] = useState(service);
  if (본서비스 !== service) {
    set본서비스(service);
    setPage(1);
  }

  const 줄들 = useAsync<Paged<AuthoringRow>>(() => api.authoringRequests(service, page), [service, page]);
  const reload = 줄들.reload;

  // **맥이 뒤에서 이어 간다.** 안 읽으면 사람이 손으로 새로고침할 때까지 화면이
  // 「대기」인 채로 멈춰 있고, 「멈춘 듯」 판정도 그때서야 뜬다 (2026-09-23 검토가 잡았다).
  // 상세와 달리 **끝난 것만 있어도 계속 읽는다** — 새 요청이 언제든 들어오는 목록이다
  useEffect(() => {
    const timer = setInterval(reload, 5000);
    return () => clearInterval(timer);
  }, [reload]);

  if (줄들.error !== null) return <Failed error={줄들.error} />;
  if (줄들.data === null) return <Loading />;

  // 「멈춘 듯」 판정이 지금 시각을 쓴다. 그릴 때 한 번만 읽어 줄마다 다른 기준으로 재지 않는다
  const 지금 = Date.now();
  const 더있나 = 다음이있나(줄들.data);

  return (
    <>
      <Head 제목={t('테스트 작성')} 부제={t('모두 {건수}건', { 건수: 줄들.data.total })} />

      <div className="screen list-screen">
        <AuthoringNew service={service} on넣었다={() => 줄들.reload()} />

        <div className="rows-scroll">
          {줄들.data.items.length === 0 ? (
            <div className="empty">
              {t('아직 작성을 요청한 기록이 없습니다')}
              <small>{t('기획서를 넣으면 여기에 줄이 생깁니다')}</small>
            </div>
          ) : (
            <>
              <표머리 />
              {줄들.data.items.map((것) => (
                <작성줄 key={것.id} 것={것} 지금={지금} />
              ))}
            </>
          )}
        </div>

        {줄들.data.items.length === 0 ? null : (
          <div className="pager">
            <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
              {t('이전')}
            </button>
            <button type="button" disabled={!더있나} onClick={() => setPage(page + 1)}>
              {t('다음')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
