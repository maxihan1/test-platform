// 안정화 지표 오류 상세 화면 — 위치 줄 · 머리 · 해결 처리 · Issue Bunker 등록 · 판들 (도메인/안정화 §8.19 「상세」 · 시안 6판 Detail6 · Detail6m)

import { useState } from 'react';

import { ApiError } from './api.js';
import { BTS이름 } from './btsName.js';
import { use말, use언어 } from './i18n.js';
import { use휴대폰 } from './phone.js';
import { stabilityApi, type 오류상세 } from './stabilityApi.js';
import { AI요약판, 견본판, 디바이스판, 발생케이스판, 상세숫자칸, 상세추이판 } from './StabilityDetailParts.js';
import { 상태칩 } from './StabilityErrors.js';
import { 날글자, 작성시각 } from './stabilityView.js';
import { Failed, Loading, message, useAsync } from './ui.js';

type 말 = ReturnType<typeof use말>;

/** 이미 처리된 것을 다시 누른 것 — 다른 탭 · 다른 사람이 먼저 눌렀다. 알리지 않고 다시 읽어 그 상태를 보인다 */
const 이미됨 = (err: unknown) => err instanceof ApiError && (err.code === 'ALREADY_RESOLVED' || err.code === 'ALREADY_REGISTERED');

/**
 * 오른쪽 두 자리. 해결 처리한 종류는 버튼 대신 `해결 · 11-12 처리`, 올린 종류는 이슈 키 링크, 보내는 중이면 `등록 중` 이 선다.
 * 버튼은 실행 write 만 보이고, Issue Bunker 를 잇지 않은 프로젝트에는 등록 버튼이 없다 (§3.15 「Issue Bunker 등록」)
 */
function 행동({ 상세, 쓰나, 다시읽기, t }: { 상세: 오류상세; 쓰나: boolean; 다시읽기: () => Promise<boolean>; t: 말 }) {
  const 언어 = use언어();
  const [바쁨, set바쁨] = useState(false);
  const [오류, set오류] = useState<string | null>(null);

  async function 누름(일: () => Promise<unknown>) {
    set바쁨(true);
    set오류(null);
    try {
      await 일();
    } catch (err) {
      if (!이미됨(err)) set오류(message(err, 언어));
    }
    await 다시읽기();
    set바쁨(false);
  }

  const { issue } = 상세;
  const 해결칸 =
    상세.resolvedAt !== null ? (
      <span className="stab-done">{t('해결 · {날} 처리', { 날: 작성시각(상세.resolvedAt, undefined).날 })}</span>
    ) : 쓰나 ? (
      <button type="button" className="btn ghost" disabled={바쁨} onClick={() => void 누름(() => stabilityApi.resolve(상세.id))}>
        {t('해결 처리')}
      </button>
    ) : null;
  const 등록칸 =
    issue !== null && 'key' in issue ? (
      issue.url === null ? (
        <span className="stab-done mono">{issue.key}</span>
      ) : (
        <a className="stab-done mono" href={issue.url} target="_blank" rel="noreferrer">
          {issue.key} ↗
        </a>
      )
    ) : issue?.state === 'PENDING' ? (
      <span className="stab-done">{t('등록 중')}</span>
    ) : 쓰나 && 상세.btsLinked ? (
      <button type="button" className="btn" disabled={바쁨} onClick={() => void 누름(() => stabilityApi.issue(상세.id))}>
        {t('{bts} 등록', { bts: BTS이름 })}
      </button>
    ) : null;
  if (해결칸 === null && 등록칸 === null) return null;
  return (
    <div className="stab-act-wrap">
      <div className="stab-act">
        {해결칸}
        {등록칸}
      </div>
      {/* 마지막 등록이 포기됐으면 까닭을 보이고 다시 누를 수 있다 (BTS §3.12 「버그 바퀴」) */}
      {issue !== null && 'state' in issue && issue.state === 'GAVE_UP' ? (
        <p className="stab-faint">{t('{bts} 등록 실패 · {까닭}', { bts: BTS이름, 까닭: issue.reason ?? '' })}</p>
      ) : null}
      {오류 === null ? null : (
        <p className="note" role="alert">
          {오류}
        </p>
      )}
    </div>
  );
}

function 머리({ 상세, 쓰나, 다시읽기 }: { 상세: 오류상세; 쓰나: boolean; 다시읽기: () => Promise<boolean> }) {
  const t = use말();
  const 휴대폰 = use휴대폰();
  // 빌드 번호가 없으면(웹 대부분) 그 칸을 뺀다. 휴대폰은 정기 실행 번호를 뺀다 (Detail6m)
  const 최초 = [
    날글자(상세.firstDay),
    ...(상세.firstBuildNo === null ? [] : [t('빌드 #{빌드}', { 빌드: 상세.firstBuildNo })]),
  ].join(' · ');
  return (
    <header className="stab-dhead">
      <div className="stab-dtitle">
        <div className="stab-dmeta">
          <상태칩 상태={상세.state} t={t} />
          <span className="stab-faint">
            {t('최초 발생 {날}', { 날: 최초 })}
            {휴대폰 ? null : (
              <>
                {' · '}
                <a href={`#/runs/${String(상세.firstRunId)}`}>{t('정기 실행 #{번호}', { 번호: 상세.firstRunId })}</a>
              </>
            )}
          </span>
        </div>
        <h1 className="mono">{상세.title}</h1>
        {상세.message === null ? null : <p className="stab-faint">{상세.message}</p>}
      </div>
      <행동 상세={상세} 쓰나={쓰나} 다시읽기={다시읽기} t={t} />
    </header>
  );
}

export function StabilityDetail({ id, run, 쓰나 }: { id: number; run: number | undefined; 쓰나: boolean }) {
  const t = use말();
  const 휴대폰 = use휴대폰();
  const { data, error, reload } = useAsync(() => stabilityApi.error(id, run), [id, run]);
  // 돌아가면 이 상세를 연 그날로 간다 — 목록에서 다른 날을 골라 들어왔으면 그날이어야 한다
  const 돌아갈곳 = data === null ? '#/stability' : `#/stability?run=${String(data.runId)}`;

  return (
    <div className="stab stab-detail">
      {휴대폰 ? (
        <a className="stab-back" href={돌아갈곳}>
          ‹ {t('안정화 지표')}
        </a>
      ) : (
        <nav className="stab-crumb stab-faint" aria-label={t('위치')}>
          <a href={돌아갈곳}>{t('안정화 지표')}</a> › {t('오류 상세')}
        </nav>
      )}
      {error !== null ? (
        <Failed error={error} />
      ) : data === null ? (
        <Loading />
      ) : (
        <>
          <머리 상세={data} 쓰나={쓰나} 다시읽기={reload} />
          <AI요약판 상세={data} />
          <상세숫자칸 상세={data} />
          <발생케이스판 상세={data} />
          <div className="stab-dsplit">
            <견본판 상세={data} />
            <div className="stab-dside">
              <상세추이판 상세={data} />
              <디바이스판 상세={data} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
