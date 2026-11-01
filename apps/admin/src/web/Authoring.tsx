// 테스트 작성 대기줄 목록. 무엇을 요청했고 맥이 어디까지 했는지 보는 자리다 (도메인/작성 §3.6 · §7)
//
// **코드는 여기 없다.** 이 화면이 드는 것은 요청과 작업 단계뿐이고, 테스트 코드는
// 맥이 초안 PR 로 저장소에 올린다 — 저장소가 계속 유일한 진실이다 (§1 영구 제외 표)

import { useEffect, useState } from 'react';

import { api, type AuthoringListRow, type EnvRow, type Paged, type 앱종류 } from './api.js';
import { AuthoringDecide } from './AuthoringDecide.js';
import { AuthoringNew } from './AuthoringNew.js';
import { decideApi } from './decideApi.js';
import { Drawer } from './Drawer.js';
import { AuthoringStartModal } from './AuthoringStartModal.js';
import { 목록글 } from './authoringStatus.js';
import { 결과글, 무슨테스트, 시작글, 종류꼬리표 } from './authoringSummary.js';
import { 반영보임, 줄보임, 칩글, 할일칩들, type 보임 } from './authoringView.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 종류, 종류이름 } from './kind.js';
import { use주소조건, 주소조건 } from './leaveGuard.js';
import { 다음이있나 } from './paging.js';
import type { 판정 } from './role.js';
import { Failed, Loading, useAsync } from './ui.js';

function 표머리() {
  const t = use말();
  return (
    <div className="rowhead runhead" role="row">
      <span aria-hidden="true" />
      <span role="columnheader">{t('번호')}</span>
      <span role="columnheader">{t('요청')}</span>
      <span role="columnheader">{t('상태')}</span>
      <span aria-hidden="true" />
    </div>
  );
}

/** 왼쪽 색 띠. 한눈에 훑기 위한 것이고 판정은 오른쪽 글자가 말한다 (SPEC §8.7 과 같은 규칙). 반영 대기는 판정이 아니다 */
function 띠색(보: 보임 | 'waiting'): string {
  if (보 === 'done') return 'var(--pass)';
  if (보 === 'failed' || 보 === 'stalled') return 'var(--fail)';
  // 중단은 판정이 아니다 — 사람이나 한도가 멈춘 것이라 판정 색을 쓰지 않는다 (DESIGN.md 「작성 상태」)
  if (보 === 'stopped') return 'var(--line-2)';
  return 'var(--na)';
}

function 작성줄({ 것, 지금, 운영자 }: { 것: AuthoringListRow; 지금: number; 운영자: boolean }) {
  const 언어 = use언어();
  const 보 = 줄보임(것, 지금);
  // 사람 손이 남았으면 상태 대신 할 일 칩을 단다 — 남았는데 초록 「완료」로 보이던 것을 고친다 (점검 11.2 · N2)
  const 할일 = 할일칩들(것.todo, 언어);
  const 보임 = 반영보임(보, 것.todo.apply);
  // 보이는 번호는 뿌리 하나다 — 줄은 그 요청의 최신 실행이다 (도메인/작성 §7 「실행 기록」)
  const 번호 = 것.rootId ?? 것.id;
  // 끝나기 전이거나 셀 것이 없으면 지금 상태 글이 둘째 줄이다 (2026-10-26 WEB-F6-06 시작 질문)
  const 결과 = 결과글(것.summary, 언어);
  const 종류 = 종류꼬리표(것.summary, 언어);
  const 제목 = 무슨테스트(것.summary, 언어);
  return (
    <div className="row authoring-row">
      <div className="gutter" style={{ background: 띠색(보임) }} />
      <div className="tcid">#{번호}</div>
      <div className="title">
        {/* 제목은 무슨 테스트인가다 — 자료 이름 제목은 무엇을 만들었는지 몰랐다 (도메인/작성 §3.6 「작성 목록 줄」) */}
        {/* 제목이 종류로 떨어졌으면(끝나기 전 · 자료 없음) 꼬리표를 또 달지 않는다 — 같은 글이 두 번 선다 */}
        {제목 === 종류 ? null : <span className="authoring-kind">{종류}</span>}
        <a href={`#/authoring/${String(번호)}`}>{제목}</a>
        {/* 중단은 판정이 아니다 — 사람이나 한도가 멈춘 것이라 실패 색을 쓰지 않는다 (DESIGN.md 「작성 상태」 · 띠색과 같다) */}
        <small className={결과?.실패 === true && 것.status !== 'STOPPED' ? 'authoring-result fail' : 'authoring-result'}>{결과?.글 ?? 목록글(것, 언어, 운영자)}</small>
        <small>{시작글(것.summary, 것, 언어)}</small>
      </div>
      <div className="right">
        {할일.length === 0 ? (
          칩글(것, 보, 언어)
        ) : (
          <span className="authoring-todo-chips">
            {할일.map((칩) => (
              <span key={칩.글} className={칩.실패 ? 'todo-chip fail' : 'todo-chip'}>
                {칩.글}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

export function Authoring({ service, serviceId, envs = [], 피그마토큰 = true, 앱종류, 할수 }: { service: string; serviceId?: number; envs?: EnvRow[]; 피그마토큰?: boolean; 앱종류?: 앱종류; 할수: 판정 }) {
  const t = use말();
  const 언어 = use언어();
  // 쪽은 주소에 남는다 — 상세에 갔다 뒤로 와도 그 쪽이다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  const [page, setPage] = useState(() => Math.max(1, Math.floor(Number(주소조건().get('page')) || 1)));
  // 「결정 필요」 — 목록 자리에 결정 목록이 선다. 주소의 todo=1 은 앞 이름 「조치 필요」 때 것을 그대로 쓴다 (도메인/작성 §3.6 「★ 결정 목록」)
  const [할일만, set할일만] = useState(() => 주소조건().get('todo') === '1');
  use주소조건('#/authoring', { ...(할일만 ? { todo: '1' } : {}), ...(page === 1 ? {} : { page: String(page) }) });
  // 새 요청 폼은 오른쪽 서랍에 둔다 — 요청은 가끔 넣고 목록은 자주 보니 목록이 폭을 다 쓴다 (2026-10-20 사용자 · WEB-F5-04 시안 C)
  const [서랍, set서랍] = useState(false);
  const 서랍닫기 = () => {
    set서랍(false);
  };
  // 방금 줄에 세운 요청. 시작 모달이 이것을 보인다 — 닫으면 null
  const [방금, set방금] = useState<number | null>(null);
  // 서비스를 바꾸면 첫 쪽으로. 안 그러면 다른 서비스에서 「없다」를 보여주고 왜인지 말하지 않는다
  const [본서비스, set본서비스] = useState(service);
  if (본서비스 !== service) {
    set본서비스(service);
    setPage(1);
  }

  // 받은 목록에 무엇을 물은 답인지 붙여 둔다 — 서비스 · 쪽 · 거르기를 바꾼 뒤의 실패에 앞 조건의 줄을 남기지 않게 (리뷰 L17 검사)
  const 물음 = `${service}|${String(page)}`;
  const 줄들 = useAsync<Paged<AuthoringListRow> & { 물음: string }>(
    () => api.authoringRequests(service, page).then((r) => ({ ...r, 물음 })),
    [service, page],
  );
  // 칩의 「결정 필요 N」과 결정 목록이 같은 답을 쓴다. 목록처럼 저절로 다시 읽지 않는다 — 고르는 중에 항목이 바뀌면 안 된다
  const 결정 = useAsync(() => decideApi.list(service).then((r) => ({ ...r, service })), [service]);
  const 결정판 = 결정.data?.service === service ? 결정.data : null;
  const 거르기 = (값: boolean) => {
    set할일만(값);
    setPage(1);
  };
  const reload = 줄들.reload;

  // **맥이 뒤에서 이어 간다.** 안 읽으면 사람이 손으로 새로고침할 때까지 화면이
  // 「대기」인 채로 멈춰 있고, 「응답 없음」 판정도 그때서야 뜬다 (2026-09-23 검토가 잡았다).
  // 상세와 달리 **끝난 것만 있어도 계속 읽는다** — 새 요청이 언제든 들어오는 목록이다
  // 결정 목록을 보는 동안은 안 읽는다 — 보이지 않는 목록이고, 결정 목록은 목록을 기다리지 않는다
  useEffect(() => {
    if (할일만) return;
    const timer = setInterval(reload, 5000);
    return () => clearInterval(timer);
  }, [reload, 할일만]);

  // 같은 조건의 다시 읽기가 실패했으면 받아 둔 목록과 서랍을 그대로 둔다 — 통째로 바꾸면 쓰던 새 요청 폼이 사라진다 (리뷰 L17)
  if (!할일만 && 줄들.error !== null && 줄들.data?.물음 !== 물음) return <Failed error={줄들.error} />;
  if (!할일만 && 줄들.data === null) return <Loading />;
  const 목록 = 줄들.data;

  // 「응답 없음」 판정이 지금 시각을 쓴다. 그릴 때 한 번만 읽어 줄마다 다른 기준으로 재지 않는다
  const 지금 = Date.now();
  const 더있나 = 목록 !== null && 다음이있나(목록);

  return (
    <>
      <Head
        제목={t('테스트 작성')}
        부제={목록 === null ? undefined : t('모두 {건수}건', { 건수: 목록.total })}
        행동={
          할수('작성요청') ? (
            <button className="btn" type="button" aria-expanded={서랍} aria-controls="authoring-new-drawer" onClick={() => (서랍 ? 서랍닫기() : set서랍(true))}>
              {t('새 작성')}
            </button>
          ) : undefined
        }
      />

      {/* 목록 옆 판 — 무엇을 넣어야 하는지는 종류가 정한다. 결정 목록을 보는 동안은 새 작성과 상관없어 뺀다 (시안 11판 「종류마다 달라지는 칸」 · WEB-F7-16) */}
      <div className={할일만 ? 'auth-cols one' : 'auth-cols'}>
      <div className="screen list-screen">
        {할일만 || 줄들.error === null ? null : <Failed error={줄들.error} />}
        <div className="toolbar">
          <span className="filter-group">
            <span className="filter-label">{t('필터')}</span>
            <button className="chip" type="button" aria-pressed={!할일만} onClick={() => 거르기(false)}>
              {t('전체')}
            </button>
            <button
              className="chip"
              type="button"
              aria-pressed={할일만}
              onClick={() => {
                // 들어올 때만 다시 읽는다 — 결정 목록에서 또 누르면 고르던 항목이 바뀐다
                if (!할일만) 결정.reload();
                거르기(true);
              }}
            >
              {결정판 === null ? t('결정 필요') : t('결정 필요 {수}', { 수: 결정판.count })}
            </button>
          </span>
        </div>

        {할일만 ? (
          결정.error !== null && 결정판 === null ? (
            <Failed error={결정.error} />
          ) : 결정판 === null ? (
            <Loading />
          ) : (
            // 판(.screen)이 넘친 아래를 숨긴다 — 줄 목록처럼 스크롤 칸에 넣어야 창보다 긴 결정 목록의 아래 항목 · 진행 버튼에 닿는다
            <div className="rows-scroll">
              <AuthoringDecide key={service} service={service} 목록={결정판} envs={envs} 다시읽기={결정.reload} />
            </div>
          )
        ) : 목록 === null ? null : (
          <>
        <div className="rows-scroll">
          {/* 건수가 한 쪽 크기의 배수면 「다음」이 빈 쪽으로 간다(paging.ts) — 거기서 「기록이 없다」고 하면 거짓이다 (리뷰 L18) */}
          {목록.items.length === 0 && page > 1 && 목록.total > 0 ? (
            <div className="empty">{t('이 쪽에는 요청이 없습니다')}</div>
          ) : 목록.items.length === 0 ? (
            <div className="empty">
              {t('아직 작성을 요청한 기록이 없습니다')}
              <small>{t(할수('작성요청') ? '기획서를 넣으면 여기에 줄이 생깁니다' : '작성 요청이 들어오면 여기에 줄이 생깁니다')}</small>
            </div>
          ) : (
            <>
              <표머리 />
              {목록.items.map((것) => (
                <작성줄 key={것.id} 것={것} 지금={지금} 운영자={할수('설정')} />
              ))}
            </>
          )}
        </div>

        {목록.items.length === 0 && page === 1 ? null : (
          <div className="pager">
            <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>
              {t('이전')}
            </button>
            <button type="button" disabled={!더있나} onClick={() => setPage(page + 1)}>
              {t('다음')}
            </button>
          </div>
        )}
          </>
        )}
      </div>
      {할일만 ? null : (
        <aside className="screen auth-inputs" aria-labelledby="auth-inputs-title">
          <h2 id="auth-inputs-title">
            {t('새 작성에 넣는 자료')} <span>{종류이름(앱종류, 언어)}</span>
          </h2>
          <ol>
            {종류(앱종류).작성자료.map((줄) => (
              <li key={줄}>{t(줄)}</li>
            ))}
          </ol>
        </aside>
      )}
      </div>

      {서랍 && 할수('작성요청') ? (
        <Drawer className="authoring-drawer" id="authoring-new-drawer" aria-labelledby="authoring-new-title" onClose={서랍닫기}>
          <div className="drawer-head">
            <h2 id="authoring-new-title">{t('새 작성 요청')}</h2>
            <button type="button" className="btn ghost icon" aria-label={t('닫기')} onClick={서랍닫기}>
              ✕
            </button>
          </div>
          <AuthoringNew service={service} serviceId={serviceId} envs={envs} 운영자={할수('설정')} 피그마토큰={피그마토큰} 앱종류={앱종류} on넣었다={(id) => {
              줄들.reload();
              서랍닫기();
              set방금(id);
            }} />
        </Drawer>
      ) : null}

      {방금 === null ? null : <AuthoringStartModal service={service} id={방금} onClose={() => set방금(null)} />}
    </>
  );
}
