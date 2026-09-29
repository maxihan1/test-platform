// 작성 요청 상세의 「다음 단계」 — 상태마다 사람이 움직일 것만 모은다. 중단 · 폐기 확인 상자도 여기 있다 (도메인/작성 §7 「중단 · 폐기 · 진척」 · DESIGN.md 「작성 상태」)

import { useState } from 'react';

import { api, type AuthoringAsset, type AuthoringRow } from './api.js';
import { 다시작성원본, 시간판 } from './authoringStatus.js';
import { 이어서작성, 일 } from './authoringTodoParts.js';
import { 줄보임 } from './authoringView.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import type { 판정 } from './role.js';
import { message, when } from './ui.js';

type 확인 = 'stop' | 'discard' | null;

interface Props {
  service: string;
  요청: AuthoringRow;
  /** 고른 서비스에서 이 사람이 할 수 있나 (role.ts `판정을만든다`) */
  할수: 판정;
  /** 기획서와 화면의 차이 수 (역방향). 0 이면 확인할 차이 항목을 안 낸다 */
  차이수: number;
  reload: () => void;
}

export function AuthoringTodo({ service, 요청, 할수, 차이수, reload }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [열린, set열린] = useState<확인>(null);
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);

  const 보 = 줄보임(요청, Date.now());
  // DONE·FAILED 로 끝난 뒤 남은 멈춤 요청은 무시한다 (도메인/작성 §7 — 서버가 지우지 않는다)
  const 멈춤요청됨 = 요청.status === 'RUNNING' && 요청.stopRequestedAt != null;
  // 자식이 끝나고 올리는 중이면 서버가 멈춤을 안 받는다. 버튼이 사라진 까닭을 말한다
  const 올리는중 = 요청.status === 'RUNNING' && !멈춤요청됨 && 요청.canStop !== true && 요청.progress?.childRunning === false;
  const 표시사본 = (요청.assets ?? []).filter((a: AuthoringAsset) => a.role === 'MARKED');

  /**
   * 누르면 곧장 서버로 가는 일(반영 · 다시 작성 · 이어서 작성). 새 실행은 같은 번호의 실행 기록에 쌓이므로
   * 이 쪽에 머물러 다시 읽는다 — 새 번호로 보내면 한 요청이 번호 여럿으로 흩어진다 (§7 「실행 기록」, 2026-09-29)
   */
  function 새줄로(만든다: () => Promise<{ id: number }>) {
    if (보내는중) return;
    set보내는중(true);
    set오류(null);
    void 만든다()
      .then(() => reload())
      .catch((err: unknown) => set오류(message(err, 언어)))
      .finally(() => set보내는중(false));
  }

  function 닫는다() {
    set열린(null);
    set오류(null);
  }

  function 확인했다() {
    set보내는중(true);
    set오류(null);
    const 할일 =
      열린 === 'stop'
        ? api.stopAuthoring(service, 요청.id).then(() => {
            닫는다();
            reload();
          })
        : api.discardAuthoring(service, 요청.id).then(() => {
            // 폐기한 것은 목록에서 사라진다. 여기 남으면 사라진 행을 보고 있게 된다
            window.location.hash = '#/authoring';
          });
    void 할일.catch((err: unknown) => set오류(message(err, 언어))).finally(() => set보내는중(false));
  }

  const 중단버튼 =
    요청.canStop === true ? (
      <button className="btn ghost" type="button" onClick={() => set열린('stop')}>
        {t('작성 중단')}
      </button>
    ) : null;
  const 폐기버튼 =
    요청.canDiscard === true ? (
      <button className="btn ghost" type="button" onClick={() => set열린('discard')}>
        {t('폐기')}
      </button>
    ) : null;

  let 본문: React.ReactNode;
  if (요청.discardedAt) {
    본문 = <p>{t('폐기됨')} · {when(요청.discardedAt, 언어)}</p>;
  } else if (요청.status === 'DRAFT') {
    본문 = (
      <>
        <p>{t('이 요청은 줄에 서지 않았습니다. 폐기하고 새 요청으로 다시 넣으세요')}</p>
        <div className="btns">{폐기버튼}</div>
      </>
    );
  } else if (요청.status === 'PENDING' || 요청.status === 'RUNNING') {
    본문 = (
      <>
        <p>
          {보 === 'stalled'
            ? t('에이전트 응답이 끊겼습니다. 작성 중단을 누른 뒤 이어서 작성하세요')
            : t('지금은 없습니다. 작성이 끝나면 여기에 검토할 것이 생깁니다. 이 페이지를 닫아도 됩니다.')}
        </p>
        {멈춤요청됨 ? (
          <p className="hint">
            {t('중단하는 중')} · {when(요청.stopRequestedAt ?? '', 언어)}
          </p>
        ) : null}
        {올리는중 ? <p className="hint">{t('올리는 중 — 멈출 수 없습니다')}</p> : null}
        {중단버튼 === null ? null : (
          <>
            <div className="btns">{중단버튼}</div>
            <span className="hint">
              {요청.status === 'PENDING'
                ? t('아직 시작 전이라 누르면 바로 취소됩니다.')
                : t('중단하면 30초 안에 멈춥니다. 만든 것은 남겨 두어 이어서 작성할 수 있습니다.')}
            </span>
          </>
        )}
      </>
    );
  } else if (요청.status === 'DONE' && 요청.kind === 'MERGE') {
    본문 = <p>{t('테스트가 반영됐습니다. 케이스 목록에서 새 케이스를 볼 수 있습니다.')}</p>;
  } else if (요청.status === 'DONE') {
    // **화면이 버튼을 안 그리는 것은 편의이지 방어가 아니다** — 서버 gate.ts 가 다시 막는다
    const 반영권한 = 할수('작성머지');
    let 번호 = 0;
    const 다음 = () => String(++번호);
    본문 =
      요청.prUrl === null ? (
        <p>{t('올라간 PR 이 없습니다. 아래 만든 것을 확인하세요.')}</p>
      ) : (
        <ol>
          <일 표={다음()} 제목={t('만든 테스트 코드 검토')} 설명={t('초안 PR 로 올라갔습니다. 읽어 보고 이상하면 PR 에 댓글을 남기세요.')}>
            <a className="btn ghost" href={요청.prUrl} target="_blank" rel="noreferrer">
              {t('만든 테스트 코드 보기 (PR)')}
            </a>
          </일>
          {차이수 === 0 ? null : (
            <일
              표={다음()}
              제목={t('기획서와 다른 곳 {수}건 확인', { 수: 차이수 })}
              설명={t('화면에서 본 값으로 만든 케이스라 미확정 표시가 붙었습니다. 기획자에게 어느 쪽이 맞는지 물어보세요.')}
            >
              {표시사본.map((a) => (
                <a key={a.id} className="btn ghost" href={api.authoringAssetUrl(요청.id, a.id)} download>
                  {t('표시한 기획서 내려받기')}
                </a>
              ))}
            </일>
          )}
          <일 표={다음()} 제목={t('테스트 반영하기')} 설명={t('검토가 끝나면 PR 을 합쳐 케이스 목록에 올립니다.')}>
            {반영권한 ? (
              <button className="btn" type="button" disabled={보내는중} onClick={() => 새줄로(() => api.createAuthoringMerge(service, 요청.id))}>
                {보내는중 ? t('반영하는 중') : t('테스트 반영하기')}
              </button>
            ) : (
              <span className="hint">{t('반영은 운영 권한이 있는 사람이 합니다.')}</span>
            )}
          </일>
        </ol>
      );
  } else {
    // FAILED · STOPPED — 고른다. 중단이면 이어서 작성이 맨 앞이다 (시안 A, 2026-09-28 사용자)
    const 권한 = 할수('작성요청');
    const 원본 = 다시작성원본(요청);
    const 중단 = 요청.status === 'STOPPED';
    // 버튼이 없으면 왜 없는지 말한다 — 제목과 설명만 남고 버튼이 사라지면 누를 길을 찾아 헤맨다 (2026-09-28 검토)
    // 「처음부터 다시」를 두 상태 모두 말한다 — 이어서 작성과 헷갈리면 안 된다 (2026-09-28 검토)
    const 설명 = !권한
      ? t('다시 작성은 실행 권한이 있는 사람이 합니다.')
      : [
          요청.status === 'FAILED'
            ? t('원인을 먼저 고친 뒤 누르세요. 넣었던 자료 그대로 새 요청을 만들어 처음부터 다시 돌립니다.')
            : t('넣었던 자료 그대로 새 요청을 만들어 처음부터 다시 돌립니다. 이 요청은 기록으로 남습니다.'),
          ...(요청.compare === true ? [t('대상 서버와 시작 주소도 원본 그대로 씁니다.')] : []),
        ].join(' ');
    const 다시작성 = (
      <일 표={중단 ? 'B' : 'A'} 제목={t('같은 자료로 다시 작성')} 설명={설명}>
        {권한 && 원본 !== null ? (
          <button
            className={중단 ? 'btn ghost' : 'btn'}
            type="button"
            disabled={보내는중}
            onClick={() => 새줄로(() => api.createAuthoringRequest(service, { kind: 'RERUN', sourceId: 원본 }))}
          >
            {보내는중 ? t('시작하는 중…') : t('같은 자료로 다시 작성')}
          </button>
        ) : null}
      </일>
    );
    본문 = (
      <ol>
        {중단 ? <이어서작성 service={service} 요청={요청} 권한={권한} 보내는중={보내는중} 새줄로={새줄로} /> : null}
        {다시작성}
        {폐기버튼 === null ? null : (
          <일
            표={중단 ? 'C' : 'B'}
            제목={t('폐기')}
            설명={중단 ? t('목록에서 사라집니다. 보관한 작업물도 지웁니다. 통계와 토큰 기록은 남습니다.') : t('목록에서 사라집니다. 통계와 토큰 기록은 남습니다.')}
          >
            <div className="btns">{폐기버튼}</div>
          </일>
        )}
      </ol>
    );
  }

  // 카드와 같은 계산이어야 한다 — 마지막 신호의 elapsedSec 를 그대로 쓰면 카드는 19분, 이 창은 11분이라고 했다 (2026-09-28 화면 검사)
  const 시간 = 시간판(요청, Date.now());
  const 분 = Math.floor((시간.한도?.지난ms ?? 시간.걸린ms ?? 0) / 60_000);

  return (
    <section className="authoring-todo" aria-label={t('다음 단계')}>
      <h3>{t('다음 단계')}</h3>
      {본문}
      {열린 === null && 오류 !== null ? <p className="error-text">{오류}</p> : null}

      {열린 === null ? null : (
        <Modal
          제목={열린 === 'stop' ? t('작성을 멈출까요?') : t('이 요청을 폐기할까요?')}
          onClose={닫는다}
          버튼={
            <>
              <button className="btn ghost" type="button" onClick={닫는다}>
                {t('아니오')}
              </button>
              <button className="btn" type="button" disabled={보내는중} onClick={확인했다}>
                {열린 === 'stop'
                  ? 보내는중 ? t('중단하는 중') : t('작성 중단')
                  : 보내는중 ? t('폐기하는 중') : t('폐기')}
              </button>
            </>
          }
        >
          <p>
            {열린 === 'discard'
              ? 요청.status === 'STOPPED'
                ? t('목록에서 사라집니다. 보관한 작업물도 지웁니다. 통계와 토큰 기록은 남습니다.')
                : t('목록에서 사라집니다. 통계와 토큰 기록은 남습니다.')
              : 요청.status === 'PENDING'
                ? t('아직 시작 전이라 바로 취소됩니다.')
                : t('{분}분 동안 만든 것은 남겨 두어 나중에 이어서 작성할 수 있습니다.', { 분 })}
            {열린 === 'discard' ? (
              <>
                <br />
                {t('되돌릴 수 없습니다.')}
              </>
            ) : null}
          </p>
          {오류 === null ? null : <p className="err">{오류}</p>}
        </Modal>
      )}
    </section>
  );
}
