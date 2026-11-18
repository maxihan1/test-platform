// 결정 목록 「결함 판정」 탭의 설명 안 되는 줄 카드 — 게임 시나리오가 남긴 줄을 이슈 등록 · PRD 수정으로 가른다 (도메인/작성 §3.6 「★ 결정 목록」 · 도메인/게임 §3.10 결정 24 의 5)
// PRD 수정은 요구사항 확인의 [수정]과 같은 손이다 — 칸을 열어 적고 [저장]해야 고른 것이 된다

import { useState } from 'react';

import { 문장칸, 저장한문장, type 편집표, type 편집하기 } from './AuthoringDecideCheck.js';
import { 막힘줄, type 고름하기 } from './AuthoringDecideItems.js';
import type { 결정항목 } from './decideApi.js';
import type { 고른값 } from './decideView.js';
import { use말 } from './i18n.js';
import { 실행기록주소 } from './route.js';

type 설명항목 = Extract<결정항목, { kind: 'NOTE' }>;

/** 줄에 남은 값 — 글자는 그대로, 그 밖은 JSON 한 줄. 없으면 빈 글 */
const 값글 = (v: unknown): string => (v === null || v === undefined ? '' : typeof v === 'string' ? v : JSON.stringify(v));

export function 설명판정({ x, 고른, on고름, 편집, on편집 }: { x: 설명항목; 고른: 고른값 | undefined; on고름: 고름하기; 편집: 편집표; on편집: 편집하기 }) {
  const t = use말();
  const [차례, set차례] = useState(고른?.option ?? 0);
  const 요구 = x.reqs[차례] ?? x.reqs[0]!;
  const 적던 = 편집.get(x.key);
  const 저장함 = 고른?.pick === 'EDIT' ? (고른.text ?? '') : null;
  return (
    <div className="decide-item">
      <span className="decide-q">{t('미션 테스트에 설명 안 되는 줄이 있습니다. 어떻게 처리할까요?')}</span>
      <div className="decide-box">
        <span className="hint">{t('미션')}</span>
        <span>
          <span className="prd-id">{x.tcId}</span> {x.name} · RUN {x.runId} · <a href={실행기록주소(x.tcId, x.runId, true)}>{t('실행 결과 보기')}</a>
        </span>
        <span className="hint">{t('기획서')}</span>
        <span>
          {x.reqs.map((r) => (
            <span key={r.reqId} className="decide-req">
              <span className="prd-id">{r.reqId}</span> {r.text}
            </span>
          ))}
        </span>
        <span className="hint">{t('설명 안 되는 줄')}</span>
        <span>
          {x.notes.map((n, i) => (
            <span key={i} className="decide-req">
              {n.statement}
              {값글(n.actual) === '' ? null : ` — ${값글(n.actual)}`}
            </span>
          ))}
        </span>
      </div>
      {x.picks.length === 0 ? null : (
        <span className="chip-group decide-choices" role="group">
          {!x.picks.includes('BUG') ? null : (
            <button className="chip" type="button" aria-pressed={고른?.pick === 'BUG'} onClick={() => on고름(x.key, 고른?.pick === 'BUG' ? null : { pick: 'BUG' })}>
              {t('이슈 등록')}
            </button>
          )}
          {/* 칸을 열기만 해서는 고른 것이 안 바뀐다 — [저장]해야 PRD 수정이 된다 */}
          {!x.picks.includes('EDIT') ? null : (
            <button
              className="chip"
              type="button"
              aria-pressed={적던 !== undefined || 저장함 !== null}
              onClick={() => {
                if (적던 !== undefined) return on편집(x.key, null);
                if (저장함 !== null) return on고름(x.key, null);
                on편집(x.key, 요구.text);
              }}
            >
              {t('PRD 수정')}
            </button>
          )}
        </span>
      )}
      {적던 === undefined ? null : (
        <>
          {x.reqs.length < 2 ? null : (
            <span className="chip-group" role="group" aria-label={t('수정할 요구사항')}>
              {x.reqs.map((r, i) => (
                <button
                  key={r.reqId}
                  className="chip"
                  type="button"
                  aria-pressed={i === 차례}
                  onClick={() => {
                    set차례(i);
                    on편집(x.key, r.text);
                  }}
                >
                  {r.reqId}
                </button>
              ))}
            </span>
          )}
          <문장칸
            이름={t('수정할 요구사항')}
            기존={요구.text}
            글={적던}
            on글={(글) => on편집(x.key, 글)}
            on취소={() => on편집(x.key, null)}
            on저장={() => {
              on고름(x.key, { pick: 'EDIT', text: 적던, option: 차례 });
              on편집(x.key, null);
            }}
          />
        </>
      )}
      {적던 !== undefined || 저장함 === null ? null : <저장한문장 글={저장함} on다시={() => on편집(x.key, 저장함)} />}
      {x.picks.length > 0 && x.blockedBy !== 'NO_RUN_WRITE' ? null : <막힘줄 까닭={x.blockedBy} open={[]} />}
    </div>
  );
}
