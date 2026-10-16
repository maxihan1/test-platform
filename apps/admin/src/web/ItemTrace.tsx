// 항목 상세의 「네트워크 · 조작 · 콘솔」 — 개발자 도구 탭 꼴 (2026-10-16 시안 A · 도메인/실행 §3.2 「trace」)
// 값은 서버가 넣을 때 가렸다. 원본 trace 파일은 사람이 내려받지 않으므로 내려받기 고리가 없다

import { useState } from 'react';

import { trace없는까닭 } from '../execution/traceReason.js';
import type { ItemTrace } from './api.js';
import { use말 } from './i18n.js';

type 탭 = 'network' | 'actions' | 'console';
type 네트워크 = ItemTrace['network'][number];

const 실패요청 = (n: 네트워크) => n.failure !== null || (n.status !== null && n.status >= 400);
const 실패조작 = (a: ItemTrace['actions'][number]) => a.error !== null;
// 잡히지 않은 오류는 pageerror 로 온다 (traceParse.ts)
const 실패콘솔 = (c: ItemTrace['console'][number]) => c.level === 'error' || c.level === 'pageerror';

const 밀리초 = (ms: number | null) => (ms === null ? '—' : `${ms.toLocaleString()}ms`);

export function ItemTraceSection({ trace }: { trace: ItemTrace | null }) {
  const t = use말();
  return (
    <div className="sec">
      <div className="sec-h">{t('네트워크 · 조작 · 콘솔')}</div>
      {trace === null || trace.status !== 'DONE' ? <없음 trace={trace} /> : <기록 trace={trace} />}
    </div>
  );
}

function 없음({ trace }: { trace: ItemTrace | null }) {
  const t = use말();
  const [꼬리표, 글] =
    trace === null
      ? [t('아직 없음'), t('기록을 아직 정리하지 않았거나 이 기능 전에 돈 항목입니다 — 방금 끝난 실행이면 잠시 뒤 새로 고쳐 주세요')]
      : trace.status === 'FAILED'
        ? [t('읽기 실패'), t('기록 파일을 읽지 못했습니다 — 서버 로그를 확인해 주세요')]
        : [t('trace 없음'), 없는까닭글(trace.reason, t)];
  return (
    <div className="trace-empty">
      <span className="trace-tag">{꼬리표}</span>
      <span>{글}</span>
    </div>
  );
}

function 없는까닭글(reason: string | null, t: (키: string) => string): string {
  if (reason === trace없는까닭.앱) return t('Android 앱 실행은 기록을 남기지 않습니다');
  if (reason === trace없는까닭.끊김) return t('러너가 실행을 끊어(제한 시간 · 멈춤) 기록이 남지 않았습니다');
  if (reason === trace없는까닭.파일없음) return t('다른 컴퓨터의 러너에서 돌았거나 기록 파일을 옮기다 실패해 기록이 없습니다');
  // 모르는 사유는 원문 그대로 — 빈 칸보다 낫다
  return reason ?? t('기록이 없습니다');
}

function 기록({ trace }: { trace: ItemTrace }) {
  const t = use말();
  const 실패수 = {
    network: trace.network.filter(실패요청).length,
    actions: trace.actions.filter(실패조작).length,
    console: trace.console.filter(실패콘솔).length,
  };
  // 실패가 있으면 실패가 든 첫 탭을 「실패만」으로 연다 — 콘솔에만 오류가 있는데 빈 네트워크 표로 열면 「아무 일 없음」으로 읽힌다
  const 첫실패 = (['network', 'actions', 'console'] as const).find((x) => 실패수[x] > 0);
  const [탭, set탭] = useState<탭>(첫실패 ?? 'network');
  const [실패만, set실패만] = useState(첫실패 !== undefined);

  const 탭들: { id: 탭; 이름: string; 수: number; 실패: string | null }[] = [
    { id: 'network', 이름: t('네트워크'), 수: trace.network.length, 실패: 실패수.network === 0 ? null : t('실패 {건수}', { 건수: 실패수.network }) },
    { id: 'actions', 이름: t('조작'), 수: trace.actions.length, 실패: 실패수.actions === 0 ? null : t('실패 {건수}', { 건수: 실패수.actions }) },
    { id: 'console', 이름: t('콘솔'), 수: trace.console.length, 실패: 실패수.console === 0 ? null : t('오류 {건수}', { 건수: 실패수.console }) },
  ];

  return (
    <>
      <div className="trace-tabs" role="tablist" aria-label={t('기록 종류')}>
        {탭들.map((x) => (
          <button key={x.id} role="tab" aria-selected={탭 === x.id} className="trace-tab" onClick={() => set탭(x.id)}>
            {x.이름}
            <span className="trace-n">{x.수}</span>
            {x.실패 === null ? null : <span className="trace-n bad">· {x.실패}</span>}
          </button>
        ))}
        <label className="trace-only">
          <input type="checkbox" checked={실패만} onChange={(e) => set실패만(e.currentTarget.checked)} /> {t('실패만')}
        </label>
      </div>
      <div className="trace-pane" role="tabpanel">
        {탭 === 'network' ? (
          // 편 줄은 거른 목록의 차례로 적는다 — 거르기가 바뀌면 새로 그려 엉뚱한 줄이 펴지지 않게
          <네트워크표 key={String(실패만)} 줄들={실패만 ? trace.network.filter(실패요청) : trace.network} />
        ) : 탭 === 'actions' ? (
          <조작표 줄들={실패만 ? trace.actions.filter(실패조작) : trace.actions} />
        ) : (
          <콘솔표 줄들={실패만 ? trace.console.filter(실패콘솔) : trace.console} />
        )}
      </div>
    </>
  );
}

function 단계칸({ seq }: { seq: number | null }) {
  const t = use말();
  return seq === null ? <td className="trace-dim">{t('준비 · 정리')}</td> : <td className="trace-m">{seq}</td>;
}

function 빈표({ 칸 }: { 칸: number }) {
  const t = use말();
  return (
    <tr>
      <td colSpan={칸} className="trace-dim">
        {t('보일 줄이 없습니다')}
      </td>
    </tr>
  );
}

function 네트워크표({ 줄들 }: { 줄들: 네트워크[] }) {
  const t = use말();
  // 처음엔 본문이 있는 첫 실패 줄을 펴 둔다 — 실패를 가르는 재료가 거기 있다
  const [편, set편] = useState<Set<number>>(() => {
    const i = 줄들.findIndex((n) => 실패요청(n) && (n.requestBody !== null || n.responseBody !== null));
    return new Set(i === -1 ? [] : [i]);
  });
  const 뒤집기 = (i: number) => set편((s) => (s.has(i) ? new Set([...s].filter((x) => x !== i)) : new Set([...s, i])));
  return (
    <table className="trace-table">
      <thead>
        <tr>
          <th>{t('단계§trace')}</th>
          <th>{t('방식§trace')}</th>
          <th>{t('주소')}</th>
          <th>{t('상태')}</th>
          <th>{t('시간')}</th>
        </tr>
      </thead>
      <tbody>
        {줄들.length === 0 ? <빈표 칸={5} /> : null}
        {줄들.flatMap((n, i) => {
          const 본문 = n.requestBody !== null || n.responseBody !== null;
          const 줄 = (
            <tr key={i} className={실패요청(n) ? 'bad' : undefined}>
              <단계칸 seq={n.seq} />
              <td className="trace-m">{n.method}</td>
              <td className="trace-url">
                {본문 ? (
                  <button className="trace-open" aria-expanded={편.has(i)} onClick={() => 뒤집기(i)}>
                    {n.url}
                  </button>
                ) : (
                  n.url
                )}
              </td>
              <td className="trace-m trace-status">{n.failure ?? n.status ?? '—'}</td>
              <td className="trace-m">{밀리초(n.durationMs)}</td>
            </tr>
          );
          if (!본문 || !편.has(i)) return [줄];
          return [
            줄,
            <tr key={`${i}-body`} className="trace-body-row">
              <td />
              <td colSpan={4}>
                <pre className="trace-body">
                  {n.requestBody === null ? null : `${t('요청')}  ${n.requestBody}\n`}
                  {n.responseBody === null ? null : `${t('응답')}  ${n.responseBody}`}
                </pre>
              </td>
            </tr>,
          ];
        })}
      </tbody>
    </table>
  );
}

function 조작표({ 줄들 }: { 줄들: ItemTrace['actions'] }) {
  const t = use말();
  return (
    <table className="trace-table">
      <thead>
        <tr>
          <th>{t('단계§trace')}</th>
          <th>{t('조작')}</th>
          <th>{t('대상')}</th>
          <th>{t('시간')}</th>
        </tr>
      </thead>
      <tbody>
        {줄들.length === 0 ? <빈표 칸={4} /> : null}
        {줄들.map((a, i) => (
          <tr key={i} className={실패조작(a) ? 'bad' : undefined}>
            <단계칸 seq={a.seq} />
            <td>
              {a.title}
              {a.error === null ? null : <div className="trace-note">{a.error}</div>}
            </td>
            <td className="trace-m trace-url">{a.target ?? '—'}</td>
            <td className="trace-m">{밀리초(a.durationMs)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function 콘솔표({ 줄들 }: { 줄들: ItemTrace['console'] }) {
  const t = use말();
  return (
    <table className="trace-table">
      <thead>
        <tr>
          <th>{t('단계§trace')}</th>
          <th>{t('수준')}</th>
          <th>{t('글')}</th>
        </tr>
      </thead>
      <tbody>
        {줄들.length === 0 ? <빈표 칸={3} /> : null}
        {줄들.map((c, i) => (
          <tr key={i} className={실패콘솔(c) ? 'bad' : undefined}>
            <단계칸 seq={c.seq} />
            <td>
              <span className={`trace-lvl ${c.level}`}>{c.level}</span>
            </td>
            <td className="trace-url">
              {c.text}
              {c.url === null ? null : <div className="trace-note">{c.url}</div>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
