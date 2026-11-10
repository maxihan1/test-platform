// 테스트 작성 대기줄 목록. 무엇을 요청했고 맥이 어디까지 했는지 보는 자리다 (도메인/작성 §3.6 · §7)
//
// **코드는 여기 없다.** 이 화면이 드는 것은 요청과 작업 단계뿐이고, 테스트 코드는
// 맥이 초안 PR 로 저장소에 올린다 — 저장소가 계속 유일한 진실이다 (§1 영구 제외 표)

import { useEffect, useState } from 'react';

import { api, type AuthoringListRow, type EnvRow, type Paged, type 앱종류 } from './api.js';
import { AuthoringDecide } from './AuthoringDecide.js';
import { AuthoringNew } from './AuthoringNew.js';
import { decideApi } from './decideApi.js';
import { 탭읽기, type 탭 } from './decideView.js';
import { AuthoringStartModal } from './AuthoringStartModal.js';
import { 구분글, 단계꼬리, 대상글, 소요시간글, 소요초, 작성자글, 작성일글, 케이스수 } from './authoringSummary.js';
import { 반영보임, 줄보임, 칩글, 할일칩들 } from './authoringView.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { use주소조건, 주소조건 } from './leaveGuard.js';
import { 다음이있나 } from './paging.js';
import type { 판정 } from './role.js';
import { Failed, Loading, useAsync } from './ui.js';

function 표머리() {
  const t = use말();
  return (
    <div className="rowhead authoring-head" role="row">
      <span role="columnheader">{t('번호')}</span>
      <span role="columnheader">{t('구분')}</span>
      <span role="columnheader">{t('대상')}</span>
      <span role="columnheader" className="num">{t('케이스 수')}</span>
      <span role="columnheader" className="num">{t('소요 시간')}</span>
      <span role="columnheader">{t('작성자')}</span>
      <span role="columnheader">{t('작성일')}</span>
      <span role="columnheader">{t('상태')}</span>
    </div>
  );
}

/**
 * 한 줄 표 — 번호 · 구분 · 대상 · 케이스 수 · 소요 시간 · 작성자 · 작성일 · 상태 (2026-11-10 사용자 시안).
 * 세 줄 카드가 자리를 많이 써서 칸으로 나눴다. 휴대폰 폭에서는 CSS 가 두 줄로 접는다
 */
function 작성줄({ 것, 지금 }: { 것: AuthoringListRow; 지금: number }) {
  const t = use말();
  const 언어 = use언어();
  const 보 = 줄보임(것, 지금);
  // 사람 손이 남았으면 상태 대신 할 일을 적는다 — 남았는데 초록 「완료」로 보이던 것을 고친다 (점검 11.2 · N2)
  const 할일 = 할일칩들(것.todo, 언어);
  const 보임 = 반영보임(보, 것.todo.apply);
  // 보이는 번호는 뿌리 하나다 — 줄은 그 요청의 최신 실행이다 (도메인/작성 §7 「실행 기록」)
  const 번호 = 것.rootId ?? 것.id;
  const 대상 = 대상글(것.summary, 언어);
  const 수 = 케이스수(것.summary);
  const 초 = 소요초(것.summary, 것, 지금);
  // 초안은 올리는 중이든 올리다 버려졌든 DRAFT 다 — 둘 다에 맞는 말을 쓴다. 업로드 거절은 사람이 세운 중단과 가른다
  const 상태 =
    할일.length > 0
      ? 할일.map((칩) => 칩.글).join(' · ')
      : 것.status === 'DRAFT'
        ? t('자료 업로드가 완료되지 않았습니다')
        : 것.status === 'STOPPED' && 것.stopReason === 'REJECTED'
          ? t('업로드 거절')
          : 칩글(것, 보, 언어);
  // 단계는 따로 둔다 — 휴대폰 폭에서는 대상이 먼저 읽히게 CSS 가 숨긴다
  const 단계 = 할일.length > 0 ? null : 단계꼬리(것.summary, 것, 보, 언어);
  // 중단은 판정이 아니다 — 사람이나 한도가 멈춘 것이라 실패 색을 쓰지 않는다 (DESIGN.md 「작성 상태」)
  const 색 = 할일.some((칩) => 칩.실패) || 보임 === 'failed' || 보임 === 'stalled' ? 'fail' : 할일.length > 0 ? 'todo' : 보임 === 'done' ? 'pass' : 보 === 'running' ? 'run' : 'na';
  return (
    <div className="row authoring-row">
      <span className="tcid">#{번호}</span>
      <span className="a-kind">{구분글(것.summary, 언어)}</span>
      {/* 대상을 모르면(끝나기 전) 「—」만 남는다 — 줄 전체를 누르는 링크라 읽어 줄 이름은 번호로 둔다 */}
      <a className="a-target" href={`#/authoring/${String(번호)}`} aria-label={대상 === '—' ? `#${String(번호)}` : undefined}>
        {대상}
      </a>
      {/* 넓은 화면에서는 묶음이 없는 것처럼 칸으로 서고(display: contents) 휴대폰에서는 둘째 줄 한 줄이 된다 */}
      <span className="a-meta">
        <span className="num a-cases" data-label={t('케이스 수')}>{수 ?? '—'}</span>
        <span className="num a-took">{초 === null ? '—' : 소요시간글(초, 언어)}</span>
        <span className="a-who">{작성자글(것.summary, 것)}</span>
        <span className="a-at">{작성일글(것.createdAt)}</span>
      </span>
      <span className="a-state" data-tone={색}>
        <i aria-hidden="true" />
        <span>
          {상태}
          {단계 === null ? null : <span className="a-step"> · {단계}</span>}
        </span>
      </span>
    </div>
  );
}

export function Authoring({ service, serviceId, envs = [], 피그마토큰 = true, 앱종류, 할수 }: { service: string; serviceId?: number; envs?: EnvRow[]; 피그마토큰?: boolean; 앱종류?: 앱종류; 할수: 판정 }) {
  const t = use말();
  // 쪽은 주소에 남는다 — 상세에 갔다 뒤로 와도 그 쪽이다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  const [page, setPage] = useState(() => Math.max(1, Math.floor(Number(주소조건().get('page')) || 1)));
  // 「결정 필요」 — 목록 자리에 결정 목록이 선다. 주소의 todo=1 은 앞 이름 「조치 필요」 때 것을 그대로 쓴다 (도메인/작성 §3.6 「★ 결정 목록」)
  const [할일만, set할일만] = useState(() => 주소조건().get('todo') === '1');
  // 결정 필요 탭도 주소에 남는다 — 탭을 옮길 때마다 기록을 쌓아 뒤로 가기가 앞 탭으로 간다. 이름은 todo 와 겹치지 않게 decide
  const [결정탭, set결정탭] = useState<탭 | null>(() => 탭읽기(주소조건().get('decide')));
  // 애플리케이션도 남긴다 — 링크를 받은 사람도 이 애플리케이션의 목록을 연다 (공통/5-화면공통 §8 「링크에 애플리케이션이 담긴다」)
  use주소조건('#/authoring', { ...(할일만 ? { todo: '1' } : {}), ...(할일만 && 결정탭 !== null ? { decide: 결정탭 } : {}), ...(page === 1 ? {} : { page: String(page) }), ...(service === '' ? {} : { service }) }, {
    쌓는칸: ['decide'],
    // 뒤로 가기에 화면을 다시 그리지 않는다 — 탭마다 고르던 것과 고치던 글을 잃지 않게
    듣기: (조건) => {
      set할일만(조건.get('todo') === '1');
      set결정탭(탭읽기(조건.get('decide')));
      setPage(Math.max(1, Math.floor(Number(조건.get('page')) || 1)));
    },
  });
  // 새 작성은 가운데 창 마법사다 — 목록이 뒤에 보여 지금 어디서 무엇을 하는지 잃지 않는다 (2026-11-11 사용자 시안 WizardB.
  // 앞 판 2026-10-20 WEB-F5-04 는 오른쪽 서랍 한 폼에 칸이 다 있어 무엇부터 채울지 몰랐다)
  const [마법사, set마법사] = useState(false);
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

  // 같은 조건의 다시 읽기가 실패했으면 받아 둔 목록과 마법사를 그대로 둔다 — 통째로 바꾸면 쓰던 새 요청 폼이 사라진다 (리뷰 L17)
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
            <button className="btn" type="button" aria-haspopup="dialog" onClick={() => set마법사(true)}>
              {t('새 작성')}
            </button>
          ) : undefined
        }
      />

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
              <AuthoringDecide key={service} service={service} 목록={결정판} envs={envs} 다시읽기={결정.reload} 탭={결정탭} on탭={set결정탭} />
            </div>
          )
        ) : 목록 === null ? null : (
          <>
        <div className="rows-scroll">
          {/* 건수가 한 쪽 크기의 배수면 「다음」이 빈 쪽으로 간다(paging.ts) — 거기서 「기록이 없다」고 하면 거짓이다 (리뷰 L18) */}
          {목록.items.length === 0 && page > 1 && 목록.total > 0 ? (
            <div className="empty">{t('이 페이지에는 요청이 없습니다')}</div>
          ) : 목록.items.length === 0 ? (
            <div className="empty">
              {t('아직 작성을 요청한 기록이 없습니다')}
              <small>{t(할수('작성요청') ? '기획서를 넣으면 여기에 줄이 생깁니다' : '작성 요청이 들어오면 여기에 줄이 생깁니다')}</small>
            </div>
          ) : (
            <>
              <표머리 />
              {목록.items.map((것) => (
                <작성줄 key={것.id} 것={것} 지금={지금} />
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

      {마법사 && 할수('작성요청') ? (
        <AuthoringNew
          // 애플리케이션이 바뀌면 새로 그린다 — 앞 애플리케이션의 가이드 글을 들고 있다가 새 애플리케이션에 저장하지 않게
          key={service}
          service={service}
          serviceId={serviceId}
          envs={envs}
          운영자={할수('설정')}
          피그마토큰={피그마토큰}
          앱종류={앱종류}
          onClose={() => set마법사(false)}
          on넣었다={(id) => {
            줄들.reload();
            set마법사(false);
            set방금(id);
          }}
        />
      ) : null}

      {방금 === null ? null : <AuthoringStartModal service={service} id={방금} onClose={() => set방금(null)} />}
    </>
  );
}
