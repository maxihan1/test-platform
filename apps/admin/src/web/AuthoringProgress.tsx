// 작성 요청 상세의 진척 · 중단 조각. 진척 글자와 중단·폐기 버튼·확인 상자를 그린다 (도메인/작성 §7 「중단 · 폐기 · 진척」)

import { useState } from 'react';

import { api, type AuthoringRow } from './api.js';
import { 중단이유라벨 } from './authoringView.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { message } from './ui.js';

/** 진척을 `dl.detail` 의 줄로. 막대가 아니라 글자다 — 한도는 자식 한 번의 것이라 전체 진도가 아니다 */
export function 진척줄들({ 요청 }: { 요청: AuthoringRow }) {
  const t = use말();
  const p = 요청.progress ?? null;
  // 자식이 끝난 뒤에는 서버가 childRunning 만 내린 진척을 줄 수 있다 — 숫자 칸이 다 찬 것만 진척으로 그린다
  if (p === null || ![p.elapsedSec, p.limitSec, p.caseFiles, p.tokens].every((v) => typeof v === 'number')) {
    return (
      <>
        <dt>{t('진척')}</dt>
        <dd>{t('기록 없음')}</dd>
      </>
    );
  }
  const 분 = Math.floor(p.elapsedSec / 60);
  // 자식이 끝난 뒤(올리기·PR)에는 한도가 없다 — 분모를 붙이면 넘을 듯이 읽힌다
  const 경과 = p.childRunning ? t('{분}분 / {한도}분', { 분, 한도: Math.floor(p.limitSec / 60) }) : t('{분}분', { 분 });
  const 초전 =
    p.lastActionAt === undefined ? null : Math.max(0, Math.round((Date.now() - new Date(p.lastActionAt).getTime()) / 1000));
  return (
    <>
      <dt>{t('경과')}</dt>
      <dd>{경과}</dd>

      {p.screens === undefined ? null : (
        <>
          <dt>{t('화면')}</dt>
          <dd>{t('{수}장', { 수: p.screens })}</dd>
        </>
      )}

      <dt>{t('케이스 파일')}</dt>
      <dd>{t('{수}개', { 수: p.caseFiles })}</dd>

      {/* 도는 중에 센 것이라 하한값이다 */}
      <dt>{t('토큰')}</dt>
      <dd>{t('{수} 이상', { 수: p.tokens.toLocaleString('en-US') })}</dd>

      <dt>{t('마지막 동작')}</dt>
      <dd>
        <div className="one-line">{p.lastAction ?? t('기록 없음')}</div>
        {초전 === null ? null : <small>{t('{초}초 전', { 초: 초전 })}</small>}
      </dd>
    </>
  );
}

/** 누가 왜 멈췄는지. 'system' 은 사람이 아니다 — 아이디를 흘리지 않고 「시스템」 */
export function 중단줄들({ 요청 }: { 요청: AuthoringRow }) {
  const t = use말();
  const 언어 = use언어();
  const 누가 = 요청.stoppedBy === 'system' ? t('시스템') : (요청.stoppedByName ?? 요청.stoppedBy ?? t('기록 없음'));
  return (
    <>
      <dt>{t('중단한 사람')}</dt>
      <dd>{누가}</dd>
      <dt>{t('중단 이유')}</dt>
      <dd>{중단이유라벨(요청.stopReason, 언어)}</dd>
    </>
  );
}

/**
 * 중단 · 폐기 버튼과 확인 상자. **버튼은 서버가 잰 `canStop`·`canDiscard` 만 보고 그린다** —
 * 화면은 요청한 사람을 모른다. 그리지 않는 것은 편의이고 서버가 다시 막는다
 */
export function 멈춤폐기({ service, 요청, reload }: { service: string; 요청: AuthoringRow; reload: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [열린, set열린] = useState<'stop' | 'discard' | null>(null);
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);

  function 닫는다() {
    set열린(null);
    set오류(null);
  }

  function 보낸다() {
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

  const 분 = Math.floor((요청.progress?.elapsedSec ?? 0) / 60);

  return (
    <>
      {요청.canStop === true ? (
        <button className="btn ghost" type="button" onClick={() => set열린('stop')}>
          {t('작성 중단')}
        </button>
      ) : null}
      {요청.canDiscard === true ? (
        <button className="btn ghost" type="button" onClick={() => set열린('discard')}>
          {t('폐기')}
        </button>
      ) : null}

      {열린 === null ? null : (
        <Modal
          제목={열린 === 'stop' ? t('작성을 멈출까요?') : t('이 요청을 폐기할까요?')}
          onClose={닫는다}
          버튼={
            <>
              <button className="btn ghost" type="button" onClick={닫는다}>
                {t('아니오')}
              </button>
              <button className="btn" type="button" disabled={보내는중} onClick={보낸다}>
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
    </>
  );
}
