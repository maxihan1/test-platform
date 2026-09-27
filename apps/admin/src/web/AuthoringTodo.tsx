// 작성 요청 상세의 「해야 할 일」 — 상태마다 사람이 움직일 것만 모은다. 중단 · 폐기 확인 상자도 여기 있다 (도메인/작성 §7 「중단 · 폐기 · 진척」 · DESIGN.md 「작성 상태」)

import { useState } from 'react';

import { api, type AuthoringAsset, type AuthoringRow } from './api.js';
import { 다시작성되나 } from './authoringStatus.js';
import { 줄보임 } from './authoringView.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { 할수있나, type 등급 } from './role.js';
import { message, when } from './ui.js';

type 확인 = 'stop' | 'discard' | null;

interface Props {
  service: string;
  요청: AuthoringRow;
  role: 등급;
  /** 기획서와 화면의 차이 수 (역방향). 0 이면 확인할 차이 항목을 안 낸다 */
  차이수: number;
  reload: () => void;
}

/** 번호 붙은 한 가지 일. 번호는 순서가 뜻을 가질 때만(완료), 고르는 일은 A · B 로 적는다 */
function 일({ 표, 제목, 설명, children }: { 표: string; 제목: string; 설명: string; children?: React.ReactNode }) {
  return (
    <li>
      <span className="k" aria-hidden="true">
        {표}
      </span>
      <div>
        <span className="t">{제목}</span>
        <p>{설명}</p>
        {children}
      </div>
    </li>
  );
}

export function AuthoringTodo({ service, 요청, role, 차이수, reload }: Props) {
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

  /** 누르면 곧장 서버로 가는 일(반영 · 다시 작성). 새로 선 줄로 보낸다 — 여기 머물면 아무 일도 안 난 것처럼 보이고 또 누른다 (2026-09-23) */
  function 새줄로(만든다: () => Promise<{ id: number }>) {
    if (보내는중) return;
    set보내는중(true);
    set오류(null);
    void 만든다()
      .then((선것) => {
        window.location.hash = `#/authoring/${String(선것.id)}`;
      })
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
            ? t('에이전트 응답이 끊겼습니다. 작성 중단을 누른 뒤 다시 작성하세요')
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
                ? t('아직 시작하지 않아 바로 줄에서 뺍니다.')
                : t('중단하면 30초 안에 멈추고, 지금까지 만든 것은 버려집니다.')}
            </span>
          </>
        )}
      </>
    );
  } else if (요청.status === 'DONE' && 요청.kind === 'MERGE') {
    본문 = <p>{t('테스트가 반영됐습니다. 케이스 목록에서 새 케이스를 볼 수 있습니다.')}</p>;
  } else if (요청.status === 'DONE') {
    // **화면이 버튼을 안 그리는 것은 편의이지 방어가 아니다** — 서버 gate.ts 가 다시 막는다
    const 반영권한 = 할수있나(role, '작성머지');
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
    // FAILED · STOPPED — 둘 중 하나를 고른다
    const 다시 = 다시작성되나(요청) && 할수있나(role, '작성요청');
    본문 = (
      <ol>
        <일
          표="A"
          제목={t('같은 자료로 다시 작성')}
          설명={
            요청.compare === true
              ? t('화면과 대조한 요청은 다시 작성할 수 없습니다. 새 요청으로 다시 넣으세요.')
              : 요청.status === 'FAILED'
                ? t('까닭을 먼저 고친 뒤 누르세요. 넣었던 자료 그대로 새 요청을 만듭니다.')
                : t('넣었던 자료 그대로 새 요청을 만들어 처음부터 다시 돌립니다. 이 요청은 기록으로 남습니다.')
          }
        >
          {다시 ? (
            <button
              className="btn"
              type="button"
              disabled={보내는중}
              onClick={() => 새줄로(() => api.createAuthoringRequest(service, { kind: 'RERUN', sourceId: 요청.id }))}
            >
              {보내는중 ? t('시작하는 중…') : t('같은 자료로 다시 작성')}
            </button>
          ) : null}
        </일>
        {폐기버튼 === null ? null : (
          <일 표="B" 제목={t('폐기')} 설명={t('목록에서 사라집니다. 통계와 토큰 기록은 남습니다')}>
            <div className="btns">{폐기버튼}</div>
          </일>
        )}
      </ol>
    );
  }

  const 분 = Math.floor((요청.progress?.elapsedSec ?? 0) / 60);

  return (
    <section className="authoring-todo" aria-label={t('해야 할 일')}>
      <h3>{t('해야 할 일')}</h3>
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
              ? t('목록에서 사라집니다. 통계와 토큰 기록은 남습니다')
              : 요청.status === 'PENDING'
                ? t('아직 시작하지 않았습니다. 줄에서 뺍니다')
                : t('{분}분 동안 만든 것이 버려집니다', { 분 })}
            <br />
            {t('되돌릴 수 없습니다.')}
          </p>
          {오류 === null ? null : <p className="err">{오류}</p>}
        </Modal>
      )}
    </section>
  );
}
