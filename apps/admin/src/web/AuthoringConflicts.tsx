// 작성 상세의 중복 케이스(겹침) — 두 케이스를 나란히 보고 케이스마다 둘 다 유지 · 새 케이스 제외를 고른다 (도메인/작성 §3.6 「★ 반영 때 겹침 검사」 · 점검 12.6)

import { Fragment, useState } from 'react';

import { api, type AuthoringConflict, type AuthoringConflictAction, type AuthoringConflictKind, type AuthoringMadeCase, type CaseRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 케이스주소 } from './route.js';
import { message, useAsync, when } from './ui.js';

const 종류글: Record<AuthoringConflictKind, string> = {
  TCID: '케이스 번호 중복',
  REQUIREMENT: '요구사항 중복',
  NAME: '이름 중복',
};

interface Props {
  service: string;
  /** 반영하려는 작성 실행 번호 — 서버가 결정을 이 행에 붙인다 */
  요청번호: number;
  conflicts: AuthoringConflict[];
  /** 이번 작성이 만든 케이스(에이전트가 센 것) — 나란히 보기의 왼쪽. 옛 에이전트면 null */
  새것?: AuthoringMadeCase[] | null;
  /** 작성 쓰기 권한. **화면이 버튼을 안 그리는 것은 편의다** — 서버 gate 가 다시 막는다 */
  편집: boolean;
  reload: () => void;
}

export function AuthoringConflicts({ service, 요청번호, conflicts, 새것 = null, 편집, reload }: Props) {
  const t = use말();
  const 언어 = use언어();
  const [보내는중, set보내는중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [열린, set열린] = useState<string | null>(null);

  if (conflicts.length === 0) return null;
  const 남은 = conflicts.filter((c) => c.input === null).length;

  // 막는 것은 서버다 — 한 줄이라도 실패하면 거기서 멈추고 까닭을 보인다. 이미 간 것은 그대로 남는다
  function 보낸다(일들: (() => Promise<unknown>)[]) {
    if (보내는중) return;
    set보내는중(true);
    set오류(null);
    void 일들
      .reduce<Promise<unknown>>((앞, 일) => 앞.then(일), Promise.resolve())
      .catch((err: unknown) => set오류(message(err, 언어)))
      .finally(() => {
        set보내는중(false);
        reload();
      });
  }

  const 고른다 = (c: AuthoringConflict, a: AuthoringConflictAction) => () => api.putAuthoringConflict(service, 요청번호, c.tcId, a);

  return (
    <section id="conflicts" tabIndex={-1} className="authoring-conflicts" aria-label={t('중복 케이스')}>
      <div className="conflicts-head">
        <p className="hint">
          {t('먼저 반영된 케이스와 번호 · 요구사항 · 이름이 겹칩니다. 케이스마다 고른 뒤에 반영할 수 있습니다.')}
        </p>
        {편집 && 남은 > 0 ? (
          <button
            className="btn ghost"
            type="button"
            disabled={보내는중}
            onClick={() => 보낸다(conflicts.filter((c) => c.input === null).map((c) => 고른다(c, 'KEEP')))}
          >
            {t('모두 유지')}
          </button>
        ) : null}
      </div>
      {오류 === null ? null : <p className="error-text" role="alert">{오류}</p>}
      <div className="authoring-diffs-wrap">
        <table className="dhist" aria-label={t('중복 케이스')}>
          <thead>
            <tr>
              <th>{t('케이스')}</th>
              <th>{t('중복 항목')}</th>
              <th>{t('기존 케이스')}</th>
              <th>{t('선택')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {conflicts.map((c) => (
              <Fragment key={c.tcId}>
              <tr className={열린 === c.tcId ? 'open' : undefined}>
                <td>
                  <span className="mono">{c.tcId}</span>
                  <br />
                  {c.name}
                  <br />
                  <button className="btn ghost small" type="button" aria-expanded={열린 === c.tcId} onClick={() => set열린(열린 === c.tcId ? null : c.tcId)}>
                    {열린 === c.tcId ? t('접기') : t('두 케이스 비교')}
                  </button>
                </td>
                <td>
                  {c.kinds.map((k) => (
                    <span key={k} className="held-chip">
                      {t(종류글[k])}
                    </span>
                  ))}
                  {c.requirements === undefined || c.requirements.length === 0 ? null : (
                    <>
                      <br />
                      <span className="hint">{c.requirements.join(' · ')}</span>
                    </>
                  )}
                </td>
                <td>
                  {c.with.map((w) => (
                    <div key={`${w.tcId}-${w.file}`}>
                      <span className="mono">{w.tcId}</span> {w.name}
                    </div>
                  ))}
                </td>
                <td>
                  {c.input === null ? (
                    t('선택 전')
                  ) : (
                    <>
                      {c.input.action === 'KEEP' ? t('둘 다 유지') : t('새 케이스 제외')}
                      <br />
                      <span className="hint">
                        {c.input.by} · {when(c.input.at, 언어)}
                      </span>
                      {c.input.action === 'KEEP' && c.kinds.includes('TCID') ? (
                        <>
                          <br />
                          <span className="hint">{t('번호가 겹쳐 반영할 때 새 번호를 받습니다')}</span>
                        </>
                      ) : null}
                    </>
                  )}
                </td>
                <td className="held-btns">
                  {!편집 ? null : (
                    <>
                      <button className={c.input?.action === 'KEEP' ? 'btn' : 'btn ghost'} type="button" aria-pressed={c.input?.action === 'KEEP'} aria-label={`${c.tcId} ${t('둘 다 유지')}`} disabled={보내는중} onClick={() => 보낸다([고른다(c, 'KEEP')])}>
                        {t('둘 다 유지')}
                      </button>
                      <button className={c.input?.action === 'DROP' ? 'btn' : 'btn ghost'} type="button" aria-pressed={c.input?.action === 'DROP'} aria-label={`${c.tcId} ${t('새 케이스 제외')}`} disabled={보내는중} onClick={() => 보낸다([고른다(c, 'DROP')])}>
                        {t('새 케이스 제외')}
                      </button>
                      {c.input === null ? null : (
                        <button
                          className="btn ghost"
                          type="button"
                          aria-label={`${c.tcId} ${t('되돌리기')}`}
                          disabled={보내는중}
                          onClick={() => 보낸다([() => api.deleteAuthoringConflict(service, 요청번호, c.tcId)])}
                        >
                          {t('되돌리기')}
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
              {열린 === c.tcId ? (
                <tr className="open">
                  <td colSpan={5}>
                    <나란히 c={c} 새것={새것?.find((n) => n.tcId === c.tcId) ?? null} />
                  </td>
                </tr>
              ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * 펼친 줄 — 왼쪽은 이번에 만든 것(에이전트가 센 확인 내용 · 요구), 오른쪽은 main 에 있는 것(카탈로그 단건).
 * 겹친 요구 번호는 양쪽에 같은 표시를 한다 — 무엇 때문에 묶였는지가 한눈에 보이게
 */
function 나란히({ c, 새것 }: { c: AuthoringConflict; 새것: AuthoringMadeCase | null }) {
  const t = use말();
  const 겹친요구 = new Set(c.requirements ?? []);
  const 요구 = (r: string) => (
    <span key={r} className={겹친요구.has(r) ? 'mono side-same' : 'mono'}>
      {r}
    </span>
  );
  return (
    <div className="side-by-side">
      <div>
        <span className="status-label">{t('이번에 만든 것')}</span>
        <b>{새것?.name ?? c.name}</b>
        {새것 === null ? (
          <p className="hint">{t('확인 내용은 PR 에서 보세요')}</p>
        ) : (
          <>
            <ul>
              {새것.verifies.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
            {새것.reqs.length === 0 ? null : <p className="hint">{t('요구사항')} {새것.reqs.map(요구)}</p>}
          </>
        )}
      </div>
      {c.with.map((w) => (
        <기존것 key={`${w.tcId}-${w.file}`} tcId={w.tcId} 이름={w.name} 겹친요구={[...겹친요구]} />
      ))}
    </div>
  );
}

function 기존것({ tcId, 이름, 겹친요구 }: { tcId: string; 이름: string; 겹친요구: string[] }) {
  const t = use말();
  const 것 = useAsync<CaseRow>(() => api.caseOf(tcId), [tcId]);
  return (
    <div>
      <span className="status-label">
        {t('기존 케이스')} · <a className="mono" href={케이스주소(tcId)}>{tcId}</a>
      </span>
      <b>{것.data?.name ?? 이름}</b>
      {것.error !== null ? <p className="hint">{것.error}</p> : null}
      {/* 카탈로그 단건에는 확인 문장이 없다 — 절차를 보려면 케이스 번호를 눌러 상세로 간다 */}
      {것.data === null || 것.data.precondition.length === 0 ? null : (
        <>
          <span className="hint">{t('사전 조건')}</span>
          <ul>
            {것.data.precondition.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </>
      )}
      {/* 카탈로그 단건에는 요구가 없다 — 겹침이 알려 준 같은 요구만 그 이름으로 적는다(이 케이스의 요구 전부가 아니다) */}
      {겹친요구.length === 0 ? null : (
        <p className="hint">
          {t('겹친 요구사항')}{' '}
          {겹친요구.map((r) => (
            <span key={r} className="mono side-same">
              {r}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
