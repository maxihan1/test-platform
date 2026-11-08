// 결정 목록의 승인 대기 · 결함 판정 항목과 함께 쓰는 고르개 · 막힘 줄. 탭과 적용 버튼은 AuthoringDecide.tsx, 요구사항 확인은 AuthoringDecideCheck.tsx 가 그린다 (도메인/작성 §3.6 「★ 결정 목록」 항목 표)

import { Fragment } from 'react';

import { 무슨테스트, 올릴테스트수 } from './authoringSummary.js';
import type { 결정항목, 고르기, 막힘 } from './decideApi.js';
import type { 고른값 } from './decideView.js';
import { use말, use언어 } from './i18n.js';
import { 실행기록주소 } from './route.js';
import { when } from './ui.js';

type 항목of<K extends 결정항목['kind']> = Extract<결정항목, { kind: K }>;
export type 고름하기 = (key: string, 값: 고른값 | null) => void;

/** 요청 번호 고리들 — 「#12 · #15」 */
function 요청고리({ 번호들 }: { 번호들: readonly number[] }) {
  return (
    <>
      {번호들.map((번호, i) => (
        <Fragment key={번호}>
          {i === 0 ? null : ' · '}
          <a href={`#/authoring/${String(번호)}`}>#{번호}</a>
        </Fragment>
      ))}
    </>
  );
}

/** 버튼이 없는 까닭 — 누구에게 부탁할 일인지 알게 한 줄 남긴다(화면공통 §8 「등급이 낮아서 못 하는 것은 보이지 않는다」의 예외 줄) */
export function 막힘줄({ 까닭, open }: { 까닭: 막힘 | null; open: readonly number[] }) {
  const t = use말();
  if (까닭 === 'AUTHORING_OPEN') {
    return (
      <small className="hint">
        <요청고리 번호들={open} /> {t('이 반영된 뒤에 집계합니다')}
      </small>
    );
  }
  const 글: Record<Exclude<막힘, 'AUTHORING_OPEN'>, string> = {
    ADMIN_ONLY: t('승인 · 반려는 관리자가 합니다'),
    NO_WRITE: t('작성 쓰기 권한이 있는 사람이 선택합니다'),
    NO_RUN_WRITE: t('결함 판정은 실행 쓰기 권한이 있는 사람이 합니다'),
  };
  return 까닭 === null ? null : <small className="hint">{글[까닭]}</small>;
}

/**
 * 고르기 버튼 줄. 이 사람이 못 고르는 값은 버튼이 없다. 고른 버튼을 한 번 더 누르면 풀린다 —
 * 「나중에」 버튼은 없앴다(2026-11-04 사용자). 안 고른 일은 그대로 목록에 남아 누를 일이 없었다
 */
export function 고르개({
  x,
  고른,
  on고름,
  글들,
  꺼짐 = false,
  처음값 = {},
}: {
  x: 결정항목;
  고른: 고른값 | undefined;
  on고름: 고름하기;
  글들: [고르기, string][];
  꺼짐?: boolean;
  처음값?: Partial<고른값>;
}) {
  if (x.picks.length === 0) return null;
  return (
    <span className="chip-group decide-choices" role="group">
      {글들
        .filter(([p]) => x.picks.includes(p))
        .map(([p, 글]) => (
          <button
            key={p}
            className="chip"
            type="button"
            aria-pressed={고른?.pick === p}
            disabled={꺼짐}
            onClick={() => on고름(x.key, 고른?.pick === p ? null : { ...처음값, ...고른, pick: p })}
          >
            {글}
          </button>
        ))}
    </span>
  );
}

export function 반영대기({ x, 고른, on고름 }: { x: 항목of<'APPLY'>; 고른: 고른값 | undefined; on고름: 고름하기 }) {
  const t = use말();
  const 언어 = use언어();
  const 수 = 올릴테스트수(x.summary);
  return (
    <div className="decide-item">
      <span className="decide-q">{수 === null ? t('테스트를 승인할까요?') : t('테스트 {수}건을 승인할까요?', { 수 })}</span>
      <small className="hint">
        <요청고리 번호들={[x.rootId]} /> · {무슨테스트(x.summary, 언어)} · {t('요청한 사람')} {x.requestedByName}
        {x.finishedAt === null ? null : ` · ${when(x.finishedAt, 언어)}`}
        {x.prUrl === null ? null : (
          <>
            {' · '}
            <a href={x.prUrl} target="_blank" rel="noreferrer">
              {t('테스트 검토하기')}
            </a>
          </>
        )}
      </small>
      <고르개
        x={x}
        고른={고른}
        on고름={on고름}
        글들={[
          ['APPLY', t('승인')],
          ['REJECT', t('반려')],
        ]}
      />
      <막힘줄 까닭={x.blockedBy} open={[]} />
    </div>
  );
}

export function 상세할일({ x }: { x: 항목of<'FIX'> }) {
  const t = use말();
  const 질문 = {
    APPLY_FAILED: t('#{번호} 반영이 실패했습니다', { 번호: x.rootId }),
    HELD: t('#{번호} 케이스 {수}건에 값이 필요합니다', { 번호: x.rootId, 수: x.count }),
    CONFLICT: t('#{번호} 케이스 {수}건이 다른 요청과 겹칩니다', { 번호: x.rootId, 수: x.count }),
  }[x.why];
  return (
    <div className="decide-item">
      <span className="decide-q">{질문}</span>
      {x.waiting.length === 0 ? null : (
        <small className="hint">
          {t('뒤에서')} <요청고리 번호들={x.waiting} /> {t('이 기다립니다 — 수정하거나 삭제하면 이어서 실행됩니다')}
        </small>
      )}
      {/* 값을 넣거나 겹침을 고르는 일은 상세가 맡는다 — 이름은 거기서 할 일이다 */}
      <a className="btn ghost small decide-go" href={`#/authoring/${String(x.rootId)}`}>
        {{ APPLY_FAILED: t('실패 원인 보기'), HELD: t('값 입력'), CONFLICT: t('충돌 해결') }[x.why]}
      </a>
    </div>
  );
}

export function 실패판정({ x, 고른, on고름 }: { x: 항목of<'FAIL'>; 고른: 고른값 | undefined; on고름: 고름하기 }) {
  const t = use말();
  return (
    <div className="decide-item">
      <span className="decide-q">{t('테스트가 실패했습니다. 어떻게 처리할까요?')}</span>
      <div className="decide-box">
        <span className="hint">{t('기획서')}</span>
        <span>
          {x.reqs.map((r) => (
            <span key={r.reqId} className="decide-req">
              <span className="prd-id">{r.reqId}</span> {r.text}
            </span>
          ))}
        </span>
        {x.verify === null ? null : (
          <>
            <span className="hint">{t('확인')}</span>
            <span>{x.verify}</span>
          </>
        )}
        {x.reason === null ? null : (
          <>
            <span className="hint">{t('실패 까닭')}</span>
            <span>{x.reason}</span>
          </>
        )}
        <span className="hint">{t('테스트')}</span>
        <span>
          <span className="prd-id">{x.tcId}</span> · RUN {x.runId} · <a href={실행기록주소(x.tcId, x.runId, true)}>{t('실패 화면 보기')}</a>
        </span>
      </div>
      <고르개
        x={x}
        고른={고른}
        on고름={on고름}
        글들={[
          ['BUG', t('이슈 등록')],
          ['SCREEN', t('PRD 수정')],
        ]}
      />
      {x.picks.length > 0 && x.blockedBy !== 'NO_RUN_WRITE' ? null : <막힘줄 까닭={x.blockedBy} open={[]} />}
    </div>
  );
}
