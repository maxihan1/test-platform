// 결정 필요 「PRD 초안」 카드 — 배포된 기능으로 만든 기획서 초안의 줄을 골라 담거나 버리고, 실패한 초안은 다시 만든다 (도메인/BTS 「PRD 초안 → 결정 필요」 · BTS-F5-04)

import { 막힘줄, type 고름하기 } from './AuthoringDecideItems.js';
import { 중단이유라벨 } from './authoringView.js';
import type { 결정항목 } from './decideApi.js';
import type { 고른값 } from './decideView.js';
import { use말, use언어 } from './i18n.js';
import { PRD항목주소 } from './route.js';

type 초안항목 = Extract<결정항목, { kind: 'PRD_DRAFT' }>;

/** 이슈 고리들 — 주소가 있으면 새 창으로 열고 없으면 글자만. 「키 제목」(제목이 없으면 키만) */
function 이슈고리({ x }: { x: 초안항목 }) {
  const t = use말();
  return (
    <small className="hint decide-issues">
      {x.issues.map((이슈) => {
        const 글 = [이슈.key, 이슈.title].filter((s) => s !== null).join(' ');
        return 이슈.url === null ? (
          <span key={이슈.key}>{글}</span>
        ) : (
          <a key={이슈.key} href={이슈.url} target="_blank" rel="noreferrer">
            {글}
          </a>
        );
      })}
      {x.buildNo === '' ? null : <span>{t('빌드 {번호}', { 번호: x.buildNo })}</span>}
    </small>
  );
}

/** 끝난 초안 — 줄마다 체크하고 담는다. 체크하지 않은 줄은 이 카드에서 빠지고, 화면만 보고 적은 줄은 「확인 필요」로 남는다 */
function 끝난초안({ x, 고른, on고름 }: { x: 초안항목; 고른: 고른값 | undefined; on고름: 고름하기 }) {
  const t = use말();
  const 종류글 = { ADD: t('추가'), EDIT: t('수정'), DEL: t('삭제') };
  const 체크 = new Set(고른?.pick === 'TAKE' ? (고른.rows ?? []) : []);
  const 버림 = 고른?.pick === 'DROP';
  const 고르나 = x.picks.includes('TAKE');
  const 모두 = x.rows.flatMap((r, i) => (r.sure && !r.gone ? [i] : []));
  const 바꿔체크 = (i: number) => {
    const 새 = new Set(체크);
    if (!새.delete(i)) 새.add(i);
    on고름(x.key, 새.size === 0 ? null : { pick: 'TAKE', rows: [...새].sort((a, b) => a - b) });
  };
  const 버리기 = (
    <button className="chip" type="button" aria-pressed={버림} onClick={() => on고름(x.key, 버림 ? null : { pick: 'DROP' })}>
      {x.rows.length === 0 ? t('확인§초안') : t('초안 삭제')}
    </button>
  );
  return (
    <div className="decide-item">
      <div className="decide-qline">
        <span className="decide-q">
          {x.rows.length === 0 ? t('배포된 기능 {수}건으로 바뀐 요구가 없어요', { 수: x.issues.length }) : t('배포된 기능 {수}건으로 기획서를 고칠까요?', { 수: x.issues.length })}
        </span>
        {x.picks.length === 0 ? null : (
          <span className="chip-group decide-choices" role="group">
            {!고르나 || 모두.length < 2 ? null : (
              <button className="btn ghost small" type="button" disabled={버림} onClick={() => on고름(x.key, { pick: 'TAKE', rows: 모두 })}>
                {t('이슈에 적힌 {수}줄 모두 체크', { 수: 모두.length })}
              </button>
            )}
            {x.picks.includes('DROP') ? 버리기 : null}
          </span>
        )}
      </div>
      <이슈고리 x={x} />
      {x.rows.map((r, i) => (
        <label key={`${String(i)}-${r.op}`} className="decide-box decide-draft-row">
          <input type="checkbox" checked={체크.has(i)} disabled={!고르나 || 버림 || r.gone} onChange={() => 바꿔체크(i)} />
          <span>
            <span className={`decide-op ${r.op.toLowerCase()}`}>{종류글[r.op]}</span>
            {r.reqId === undefined ? null : (
              <>
                {' '}
                <a className="prd-id" href={PRD항목주소(r.reqId)}>
                  {r.reqId}
                </a>
              </>
            )}{' '}
            {/* 삭제 줄의 text 는 AI 가 적은 지우는 까닭이다 — 지워질 요구 문장을 앞에 보이고 까닭은 아래로 내린다 */}
            {r.op === 'DEL' && r.oldText !== null ? <del>{r.oldText}</del> : r.text}
            {r.sure ? null : <span className="decide-op unsure">{t('화면만 보고 적음')}</span>}
            {r.oldText === null || (r.op !== 'EDIT' && r.op !== 'DEL') ? null : (
              <>
                <br />
                {r.op === 'EDIT' ? <del className="hint">{r.oldText}</del> : <span className="hint">{r.text}</span>}
              </>
            )}
            <br />
            <small className="hint">
              {r.basis}
              {r.gone ? <> · {t('지금 기획서에 없는 요구라 고를 수 없어요')}</> : r.sure ? null : <> · {t('체크하지 않으면 「확인 필요」로 남아요')}</>}
            </small>
          </span>
        </label>
      ))}
      {x.e2e.length === 0 ? null : (
        <div className="decide-sub">
          {x.e2e.map((e) => (
            <span key={e.title}>
              <b>{t('E2E 제안')}</b> {e.title} <small className="hint">· {e.services.join(' → ')}</small>
            </span>
          ))}
          <small className="hint">{t('테스트를 다시 만든 뒤 E2E 메뉴에서 만들 수 있어요')}</small>
        </div>
      )}
      {x.picks.length > 0 ? null : <막힘줄 까닭={x.blockedBy} open={[]} />}
    </div>
  );
}

/** 실패 · 멈춘 초안 — 다시 만들거나 버린다 */
function 못만든초안({ x, 고른, on고름 }: { x: 초안항목; 고른: 고른값 | undefined; on고름: 고름하기 }) {
  const t = use말();
  const 언어 = use언어();
  const 키들 = x.issues.map((이슈) => 이슈.key).join(', ');
  const 까닭 = x.state === 'FAILED' ? (x.reason ?? '').split('\n')[0]! : 중단이유라벨(x.reason, 언어);
  const 글들: ['RETRY' | 'DROP', string][] = [
    ['RETRY', t('다시 만들기')],
    ['DROP', t('삭제')],
  ];
  return (
    <div className="decide-item">
      <div className="decide-qline">
        <span className="decide-q">
          {x.state === 'FAILED' ? t('{키들} 기획서 초안을 만들지 못했어요', { 키들 }) : t('{키들} 기획서 초안 만들기가 멈췄어요', { 키들 })}
        </span>
        {x.picks.length === 0 ? null : (
          <span className="chip-group decide-choices" role="group">
            {글들
              .filter(([p]) => x.picks.includes(p))
              .map(([p, 글]) => (
                <button key={p} className="chip" type="button" aria-pressed={고른?.pick === p} onClick={() => on고름(x.key, 고른?.pick === p ? null : { pick: p })}>
                  {글}
                </button>
              ))}
          </span>
        )}
      </div>
      <이슈고리 x={x} />
      {까닭 === '' ? null : <small className="hint">{까닭}</small>}
      {x.picks.length > 0 ? null : <막힘줄 까닭={x.blockedBy} open={[]} />}
    </div>
  );
}

export function 초안카드({ x, 고른, on고름 }: { x: 초안항목; 고른: 고른값 | undefined; on고름: 고름하기 }) {
  return x.state === 'DONE' ? <끝난초안 x={x} 고른={고른} on고름={on고름} /> : <못만든초안 x={x} 고른={고른} on고름={on고름} />;
}
