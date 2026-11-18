// 결정 목록 「미션 승인」 탭의 카드 — 게임 작성 AI 가 낸 미션 가운데 체크한 것만 게임 시나리오 테스트로 쓴다 · [제외](확인 창) · 제외한 미션 복원 (도메인/작성 §3.6 「★ 결정 목록」 「미션 승인」)
// [제외] · [복원]은 적용 버튼을 안 기다리고 곧바로 서버에 간다 — [제외]만 확인 창이 한 번 묻는다

import { useState } from 'react';

import { 막힘줄, 요청고리, type 고름하기 } from './AuthoringDecideItems.js';
import { decideApi, type 결정항목 } from './decideApi.js';
import { 켜졌나, type 고른값 } from './decideView.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { message } from './ui.js';

type 미션항목 = Extract<결정항목, { kind: 'MISSIONS' }>;
type 미션 = 미션항목['missions'][number];

export function 미션고르기({ service, x, 고른, on고름, open, on바뀜 }: { service: string; x: 미션항목; 고른: 고른값 | undefined; on고름: 고름하기; open: readonly number[]; on바뀜: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [뺄것, set뺄것] = useState<미션 | null>(null);
  const [바쁨, set바쁨] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const 고르나 = x.picks.includes('WRITE') && 켜졌나(x);
  const 바꿀수있나 = x.blockedBy !== 'NO_WRITE';
  const 체크 = new Set(고른?.missions ?? []);
  const 체크바꾸기 = (새: Set<string>) => on고름(x.key, 새.size === 0 ? null : { pick: 'WRITE', missions: x.missions.filter((m) => 새.has(m.id)).map((m) => m.id) });

  async function 바꾸기(m: 미션, skip: boolean) {
    set바쁨(true);
    set오류(null);
    try {
      await decideApi.skipMission(service, x.requestId, m.id, skip);
      if (skip && 체크.has(m.id)) 체크바꾸기(new Set([...체크].filter((id) => id !== m.id)));
      set뺄것(null);
      on바뀜();
    } catch (err) {
      set오류(message(err, 언어));
    }
    set바쁨(false);
  }

  return (
    <div className="decide-item">
      <div className="decide-qline">
        <span className="decide-q">
          {x.missions.length === 0 ? t('테스트로 쓸 미션이 없습니다') : t('미션 {수}개 중 테스트로 쓸 미션을 체크해 주세요', { 수: x.missions.length })}{' '}
          <small className="hint">
            <요청고리 번호들={[x.requestId]} />
          </small>
        </span>
        {!고르나 || x.missions.length < 2 ? null : (
          <button className="btn ghost small" type="button" onClick={() => 체크바꾸기(new Set(x.missions.map((m) => m.id)))}>
            {t('전체 선택')}
          </button>
        )}
      </div>
      {x.needsApply === true ? <small className="hint">{t('승인 대기를 먼저 처리해 주세요')}</small> : null}
      {x.uncovered.length === 0 ? null : (
        <div className="decide-warn" role="note">
          <b>{t('테스트도 미션도 없는 규칙 {수}개', { 수: x.uncovered.length })}</b>
          {x.uncovered.map((u) => (
            <span key={u.reqId}>
              <span className="prd-id">{u.reqId}</span> {u.text}
            </span>
          ))}
        </div>
      )}
      {x.gaps.length === 0 ? null : (
        <div className="decide-warn" role="note">
          <b>{t('공식에 빈칸이 있어 값을 못 정한 규칙 {수}개', { 수: x.gaps.length })}</b>
          {x.gaps.map((g) => (
            <span key={g.reqId}>
              <span className="prd-id">{g.reqId}</span> {g.note}
            </span>
          ))}
        </div>
      )}
      {x.missions.map((m) => (
        <div key={m.id} className={`decide-mission${체크.has(m.id) ? ' on' : ''}`}>
          <div className="decide-mission-head">
            {고르나 ? (
              <input
                type="checkbox"
                aria-label={`${m.id} ${m.title}`}
                checked={체크.has(m.id)}
                onChange={() => 체크바꾸기(new Set(체크.has(m.id) ? [...체크].filter((id) => id !== m.id) : [...체크, m.id]))}
              />
            ) : null}
            <span className="prd-id">{m.id}</span>
            <b>{m.title}</b>
            {!바꿀수있나 ? null : (
              <button className="btn ghost small" type="button" onClick={() => set뺄것(m)}>
                {t('제외')}
              </button>
            )}
          </div>
          <dl className="decide-mission-body">
            <dt>{t('시작 조건')}</dt>
            <dd>{m.start}</dd>
            <dt>{t('할 일')}</dt>
            <dd>{m.todo}</dd>
            <dt>{t('통과 조건')}</dt>
            <dd>{m.success}</dd>
            <dt>{t('확인할 로그')}</dt>
            <dd>
              {m.logs.map((l, i) => (
                <span key={`${l.reqId}-${String(i)}`} className="decide-mission-log">
                  {l.text} — <span className="prd-id">{l.reqId}</span>
                </span>
              ))}
            </dd>
          </dl>
        </div>
      ))}
      {x.skipped.length === 0 ? null : (
        <details className="decide-skipped">
          <summary>{t('제외한 미션 {수}개', { 수: x.skipped.length })}</summary>
          {x.skipped.map((m) => (
            <div key={m.id} className="decide-saved">
              <span>
                <span className="prd-id">{m.id}</span> {m.title}
              </span>
              {!바꿀수있나 ? null : (
                <button className="btn ghost small" type="button" disabled={바쁨} onClick={() => void 바꾸기(m, false)}>
                  {t('복원')}
                </button>
              )}
            </div>
          ))}
        </details>
      )}
      {오류 === null || 뺄것 !== null ? null : <p className="error-text">{오류}</p>}
      <막힘줄 까닭={x.blockedBy} open={open} />
      {뺄것 === null ? null : (
        <Modal
          제목={t('미션 제외')}
          onClose={() => set뺄것(null)}
          버튼={
            <>
              <button className="btn ghost" type="button" onClick={() => set뺄것(null)}>
                {t('취소')}
              </button>
              <button className="btn" type="button" disabled={바쁨} onClick={() => void 바꾸기(뺄것, true)}>
                {t('제외')}
              </button>
            </>
          }
        >
          <p>{t('{미션} 미션을 제외합니다', { 미션: `${뺄것.id} ${뺄것.title}` })}</p>
          <ul className="decide-list">
            <li>{t('AI 가 이 미션으로 테스트를 쓰지 않습니다')}</li>
            <li>{t('아래 「제외한 미션」에서 복원할 수 있습니다')}</li>
          </ul>
          {오류 === null ? null : <p className="error-text">{오류}</p>}
        </Modal>
      )}
    </div>
  );
}
