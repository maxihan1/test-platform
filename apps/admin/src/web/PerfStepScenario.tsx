// 마법사 1단계 — 시나리오 이름 · 가져오기 · AI 줄 · 트랜잭션 표. 줄을 펴면 고치고 변수 추출 · 응답 검증 · AI 설명을 본다 (도메인/성능 §8.14)

import { Fragment, useState } from 'react';

import type { ServiceRow } from './api.js';
import { use말 } from './i18n.js';
import type { Transaction, 초안결과 } from './perfApi.js';
import { PerfImport } from './PerfImport.js';

const 메서드들: Transaction['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export interface 일단계값 {
  name: string;
  transactions: Transaction[];
  notes: Record<string, string>;
  /** 마지막 가져오기의 녹화 셈 · 제외 목록 · 옮기지 못한 부분 */
  가져온: 초안결과 | null;
}

export function PerfStepScenario({
  값,
  고침,
  service,
  새것,
  쓰나,
  초안받음,
}: {
  값: 일단계값;
  고침: (값: 일단계값) => void;
  service: ServiceRow;
  /** 이름은 만들 때만 정한다 — 저장 통로가 이름을 고치지 않는다 (도메인/성능 §7 PUT) */
  새것: boolean;
  쓰나: boolean;
  초안받음: (jobId: number) => void;
}) {
  const t = use말();
  const [편줄, set편줄] = useState<number | null>(null);
  const txs = 값.transactions;
  const 줄고침 = (i: number, 덮: Partial<Transaction>) => 고침({ ...값, transactions: txs.map((tx, n) => (n === i ? { ...tx, ...덮 } : tx)) });

  function 추가() {
    let 번호 = txs.length + 1;
    while (txs.some((tx) => tx.name === t('트랜잭션 {번호}', { 번호 }))) 번호 += 1;
    고침({ ...값, transactions: [...txs, { name: t('트랜잭션 {번호}', { 번호 }), method: 'GET', url: '/' }] });
    set편줄(txs.length);
  }

  const 가져온 = 값.가져온;
  return (
    <section className="perf-panel" aria-labelledby="perf-s1">
      <h2 id="perf-s1">{t('시나리오 구성')}</h2>
      {새것 ? (
        <label className="perf-field">
          {t('시나리오 이름')}
          <input value={값.name} maxLength={100} onChange={(e) => 고침({ ...값, name: e.target.value })} />
        </label>
      ) : null}
      {쓰나 ? (
        <PerfImport
          service={service}
          받음={(결과, jobId) => {
            고침({ ...값, transactions: 결과.transactions, notes: 결과.notes ?? {}, 가져온: 결과 });
            set편줄(null);
            초안받음(jobId);
          }}
        />
      ) : null}
      {가져온 === null ? null : <가져온줄 결과={가져온} />}
      {txs.length === 0 ? (
        <div className="empty">{t('아직 트랜잭션이 없습니다. 위에서 가져오거나 직접 추가해 주세요')}</div>
      ) : (
        <div className="perf-table-box">
          <table className="perf-table">
            <thead>
              <tr>
                <th>{t('순서')}</th>
                <th>{t('트랜잭션')}</th>
                <th>{t('요청')}</th>
                <th>{t('변수 추출')}</th>
                <th>{t('Think Time')}</th>
                {쓰나 ? <th aria-label={t('삭제')} /> : null}
              </tr>
            </thead>
            <tbody>
              {txs.map((tx, i) => {
                const 폈나 = 편줄 === i;
                return (
                  <Fragment key={i}>
                    <tr className={폈나 ? 'perf-open' : undefined}>
                      <td className="mono">{i + 1}</td>
                      <td>
                        <button type="button" className="perf-toggle" aria-expanded={폈나} onClick={() => set편줄(폈나 ? null : i)}>
                          {폈나 ? '▾' : '▸'} {tx.name}
                        </button>
                      </td>
                      <td className="mono">
                        {tx.method} {tx.url}
                      </td>
                      <td>
                        {(tx.extract ?? []).length === 0 ? <span className="perf-faint">-</span> : (tx.extract ?? []).map((x) => x.var).join(', ')}
                        {값.notes[tx.name] === undefined ? null : <> <span className="perf-ai">AI</span></>}
                      </td>
                      <td className="mono">{tx.thinkTimeSec === undefined ? '-' : t('{초}초', { 초: tx.thinkTimeSec })}</td>
                      {쓰나 ? (
                        <td>
                          <button
                            type="button"
                            className="btn ghost small"
                            aria-label={t('{이름} 삭제', { 이름: tx.name })}
                            onClick={() => {
                              고침({ ...값, transactions: txs.filter((_, n) => n !== i) });
                              set편줄(null);
                            }}
                          >
                            {t('삭제')}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                    {폈나 ? (
                      <tr className="perf-open">
                        <td />
                        <td colSpan={쓰나 ? 5 : 4}>
                          <줄자세히 tx={tx} 설명={값.notes[tx.name]} 쓰나={쓰나} 고침={(덮) => 줄고침(i, 덮)} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {쓰나 ? (
        <div>
          <button type="button" className="btn ghost small" onClick={추가}>
            {t('트랜잭션 추가')}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function 가져온줄({ 결과 }: { 결과: 초안결과 }) {
  const t = use말();
  const 셈 = 결과.recorded;
  const 뺀것 = 결과.excluded ?? [];
  const 못옮긴것 = 결과.unconverted ?? [];
  return (
    <div className="perf-well">
      <div className="perf-row">
        <span className="perf-ai">AI</span>
        {셈 === undefined ? (
          <span>{t('트랜잭션 {수}개를 만들었습니다', { 수: 결과.transactions.length })}</span>
        ) : (
          <>
            <span>{t('녹화 요청 {전체}건 중 API {사용}건 사용', { 전체: 셈.total, 사용: 셈.used })}</span>
            <span className="perf-faint">{t('정적 리소스 {수}건 제외', { 수: 셈.staticExcluded })}</span>
          </>
        )}
      </div>
      {뺀것.length === 0 ? null : (
        <details>
          <summary>{t('제외 목록 {수}건', { 수: 뺀것.length })}</summary>
          <ul>
            {뺀것.map((it, i) => (
              <li key={i}>
                <span className="mono">{it.url}</span> <span className="perf-faint">{it.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {못옮긴것.length === 0 ? null : (
        <details open>
          <summary>{t('옮기지 못한 부분 {수}건 — 직접 고쳐 주세요', { 수: 못옮긴것.length })}</summary>
          <ul>
            {못옮긴것.map((it, i) => (
              <li key={i}>
                {it.what} <span className="perf-faint">{it.why}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function 줄자세히({ tx, 설명, 쓰나, 고침 }: { tx: Transaction; 설명: string | undefined; 쓰나: boolean; 고침: (덮: Partial<Transaction>) => void }) {
  const t = use말();
  const 검증 = [
    tx.check?.status === undefined ? null : t('상태 코드 {코드}', { 코드: tx.check.status.join(', ') }),
    tx.check?.contains === undefined ? null : t('본문에 {글} 포함', { 글: tx.check.contains }),
  ].filter((it) => it !== null);
  return (
    <div className="perf-well">
      <div className="perf-fields">
        <label className="perf-field">
          {t('트랜잭션')}
          <input value={tx.name} maxLength={100} disabled={!쓰나} onChange={(e) => 고침({ name: e.target.value })} />
        </label>
        <label className="perf-field">
          {t('메서드')}
          <select value={tx.method} disabled={!쓰나} onChange={(e) => 고침({ method: e.target.value as Transaction['method'] })}>
            {메서드들.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="perf-field" style={{ flex: '1 1 320px' }}>
          {t('주소')}
          <input value={tx.url} disabled={!쓰나} onChange={(e) => 고침({ url: e.target.value })} />
        </label>
        <label className="perf-field">
          {t('Think Time (초)')}
          <input
            type="number"
            min={0}
            max={600}
            value={tx.thinkTimeSec ?? ''}
            disabled={!쓰나}
            onChange={(e) => 고침({ thinkTimeSec: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </label>
      </div>
      {tx.method === 'GET' ? null : (
        <label className="perf-field">
          {t('요청 본문')}
          <textarea rows={3} value={tx.body ?? ''} disabled={!쓰나} onChange={(e) => 고침({ body: e.target.value === '' ? undefined : e.target.value })} />
        </label>
      )}
      {(tx.extract ?? []).length === 0 ? null : (
        <table className="perf-table">
          <thead>
            <tr>
              <th>{t('변수')}</th>
              <th>{t('추출 위치')}</th>
              <th>{t('추출 방식')}</th>
            </tr>
          </thead>
          <tbody>
            {(tx.extract ?? []).map((x) => (
              <tr key={x.var}>
                <td className="mono">{x.var}</td>
                <td>
                  {t(추출곳[x.where])} <span className="mono">{x.path}</span>
                </td>
                <td>{x.pick === 'RANDOM' ? t('무작위 1개') : t('첫 값')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {검증.length === 0 ? null : (
        <div className="perf-row">
          <span className="perf-field">{t('응답 검증')}</span>
          <span className="mono">{검증.join(', ')}</span>
        </div>
      )}
      {설명 === undefined ? null : (
        <div className="perf-row">
          <span className="perf-ai">AI</span>
          <span>{설명}</span>
        </div>
      )}
    </div>
  );
}

const 추출곳: Record<'JSON' | 'HEADER' | 'COOKIE', string> = { JSON: '응답 본문', HEADER: '응답 머리글', COOKIE: '쿠키' };
