// 마법사 1단계에서 트랜잭션 줄을 폈을 때 보이는 자세히 — 종류(HTTP · WebSocket · gRPC)별 입력 칸 · 변수 추출 · 응답 검증 · AI 설명 (도메인/성능 §3.9 「게임 서버 부하」)

import { useState } from 'react';

import { use말 } from './i18n.js';
import type { Transaction } from './perfApi.js';

const 메서드들: Transaction['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const 추출곳: Record<'JSON' | 'HEADER' | 'COOKIE', string> = { JSON: '응답 본문', HEADER: '응답 머리글', COOKIE: '쿠키' };

export type 전송종류 = NonNullable<Transaction['type']>;
export const 종류글자: Record<전송종류, string> = { HTTP: 'HTTP', WS: 'WebSocket', GRPC: 'gRPC' };
const 종류들: 전송종류[] = ['HTTP', 'WS', 'GRPC'];

// 서버 검사(perf/scenarios.ts)의 proto 상한과 같다
const PROTO_최대 = 200_000;

export const 종류의 = (tx: Transaction): 전송종류 => tx.type ?? 'HTTP';

/** 종류를 바꿀 때 지울 칸. 서버가 「gRPC 만 grpc 를 든다」로 검사하고 값 추출은 HTTP 만 쓴다 */
export function 종류바꿈(tx: Transaction, 종류: 전송종류): Partial<Transaction> {
  return {
    type: 종류 === 'HTTP' ? undefined : 종류,
    grpc: 종류 === 'GRPC' ? (tx.grpc ?? { proto: '', method: '' }) : undefined,
    messages: 종류 === 'WS' ? tx.messages : undefined,
    extract: 종류 === 'HTTP' ? tx.extract : undefined,
  };
}

/** 저장 본문에 싣기 전 다듬기 — 보낼 메시지의 빈 줄은 뺀다 */
export function 저장꼴(tx: Transaction): Transaction {
  if (tx.messages === undefined) return tx;
  const 메시지 = tx.messages.filter((m) => m !== '');
  return { ...tx, messages: 메시지.length === 0 ? undefined : 메시지 };
}

export function PerfTxDetail({ tx, 설명, 쓰나, 고침 }: { tx: Transaction; 설명: string | undefined; 쓰나: boolean; 고침: (덮: Partial<Transaction>) => void }) {
  const t = use말();
  const 종류 = 종류의(tx);
  const [proto오류, setProto오류] = useState<string | null>(null);
  const 검증 = [
    tx.check?.status === undefined ? null : t('상태 코드 {코드}', { 코드: tx.check.status.join(', ') }),
    tx.check?.contains === undefined ? null : t('본문에 {글} 포함', { 글: tx.check.contains }),
  ].filter((it) => it !== null);

  async function proto읽기(파일: File) {
    setProto오류(null);
    const 글 = await 파일.text();
    if (글.length > PROTO_최대) {
      setProto오류(t('proto 파일은 20만 자까지입니다'));
      return;
    }
    고침({ grpc: { proto: 글, method: tx.grpc?.method ?? '' } });
  }

  return (
    <div className="perf-well">
      <div className="perf-fields">
        <label className="perf-field">
          {t('트랜잭션')}
          <input value={tx.name} maxLength={100} disabled={!쓰나} onChange={(e) => 고침({ name: e.target.value })} />
        </label>
        <label className="perf-field">
          {t('종류')}
          <select value={종류} disabled={!쓰나} onChange={(e) => 고침(종류바꿈(tx, e.target.value as 전송종류))}>
            {종류들.map((k) => (
              <option key={k} value={k}>
                {종류글자[k]}
              </option>
            ))}
          </select>
        </label>
        {종류 === 'HTTP' ? (
          <label className="perf-field">
            {t('메서드')}
            <select value={tx.method} disabled={!쓰나} onChange={(e) => 고침({ method: e.target.value as Transaction['method'] })}>
              {메서드들.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        ) : null}
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
      {종류 === 'WS' ? (
        <>
          <label className="perf-field">
            {t('보낼 메시지')}
            <textarea rows={3} value={(tx.messages ?? []).join('\n')} disabled={!쓰나} onChange={(e) => 고침({ messages: e.target.value === '' ? undefined : e.target.value.split('\n') })} />
            <span className="perf-faint">{t('한 줄에 메시지 하나입니다. 연결한 뒤 차례로 보냅니다')}</span>
          </label>
          <label className="perf-field">
            {t('기다릴 글자')}
            <input
              value={tx.check?.contains ?? ''}
              disabled={!쓰나}
              onChange={(e) => 고침({ check: { ...tx.check, contains: e.target.value === '' ? undefined : e.target.value } })}
            />
            <span className="perf-faint">{t('비워 두면 연결만 되면 통과입니다. 적으면 10초 안에 그 글자가 든 메시지가 와야 통과입니다')}</span>
          </label>
        </>
      ) : null}
      {종류 === 'GRPC' ? (
        <>
          <div className="perf-fields">
            <label className="perf-field">
              {t('proto 파일')}
              <input
                type="file"
                accept=".proto"
                disabled={!쓰나}
                onChange={(e) => {
                  const 파일 = e.target.files?.[0];
                  // 비워 둬야 같은 파일을 다시 골라도 onChange 가 선다
                  e.target.value = '';
                  if (파일 !== undefined) void proto읽기(파일);
                }}
              />
              {(tx.grpc?.proto ?? '') === '' ? null : <span className="perf-faint">{t('proto 파일을 읽었습니다 ({글자}자)', { 글자: (tx.grpc?.proto ?? '').length })}</span>}
            </label>
            <label className="perf-field" style={{ flex: '1 1 280px' }}>
              {t('메서드')}
              <input
                value={tx.grpc?.method ?? ''}
                placeholder="shop.Cart/AddItem"
                disabled={!쓰나}
                onChange={(e) => 고침({ grpc: { proto: tx.grpc?.proto ?? '', method: e.target.value } })}
              />
              <span className="perf-faint">{t('패키지.서비스/메서드 꼴로 적습니다')}</span>
            </label>
          </div>
          {proto오류 === null ? null : <p className="perf-err" role="alert">{proto오류}</p>}
        </>
      ) : null}
      {종류 === 'WS' || (종류 === 'HTTP' && tx.method === 'GET') ? null : (
        <label className="perf-field">
          {종류 === 'GRPC' ? t('메시지(JSON)') : t('요청 본문')}
          <textarea rows={3} value={tx.body ?? ''} disabled={!쓰나} onChange={(e) => 고침({ body: e.target.value === '' ? undefined : e.target.value })} />
        </label>
      )}
      {종류 !== 'HTTP' || (tx.extract ?? []).length === 0 ? null : (
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
      {검증.length === 0 || 종류 === 'WS' ? null : (
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
