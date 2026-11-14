// QA 리포트 하나 보기 — 서버가 짓는 HTML 리포트를 화면 안에 싣고, 그 위에 버전 · 다운로드 · 승인 · 남은 리스크 문장 수정을 둔다 (도메인/리포팅 §8.21 「리포트 보기」 · 「승인」)
// 첫 장 · 종류별 구획을 화면이 따로 그리지 않는다 — 리포트 글은 서버 한 곳(reporting/qaReportText*.ts)이 짓고, 화면이 따로 지으면 같은 숫자를 다른 말로 적게 된다

import { useEffect, useRef, useState } from 'react';

import { ApiError, type User } from './api.js';
import { Head } from './Head.js';
import { use말, use언어, type 언어 } from './i18n.js';
import { qaReportApi, 리포트이름, 리포트파일주소, type 리포트응답, type 리포트형식 } from './qaReportApi.js';
import { 할수있나 } from './role.js';
import { Failed, Loading, message, useAsync, when, 기다림글자 } from './ui.js';

type 말 = ReturnType<typeof use말>;

const 형식들: { 형식: 리포트형식; 이름: string }[] = [
  { 형식: 'PDF', 이름: 'PDF' },
  { 형식: 'HTML', 이름: 'HTML' },
  { 형식: 'DOCX', 이름: '워드' },
];

/** 승인 통로의 거절 코드 — 같은 코드를 다른 화면(계정 승인 · 작성 반영)이 다른 뜻으로 써서 공용 표에 넣지 않는다 (§7 「승인 · 문장 고치기」) */
const 승인거절: Record<string, string> = {
  SELF_APPROVAL: '수행자는 승인할 수 없습니다',
  RUNNING: '진행 중인 실행이 완료되면 승인할 수 있습니다',
  AI_PENDING: 'AI 가 남은 리스크를 작성하는 중입니다. 작성이 완료되면 승인할 수 있습니다',
  ALREADY_APPROVED: '이미 승인된 리포트입니다',
  NOT_LATEST: '더 새 버전이 있습니다. 마지막 버전에서 승인할 수 있습니다',
  APPROVED: '승인된 버전은 수정할 수 없습니다',
};

function 거절문장(e: unknown, t: 말, 언어: 언어): string {
  if (e instanceof ApiError && 승인거절[e.code] !== undefined) return t(승인거절[e.code]!);
  return message(e, 언어);
}

/** 화면이 미리 아는 막힘 — 서버가 잠금 안에서 다시 본다. AI 일은 응답에 상태가 없어 서버 거절로만 알린다 */
function 승인못하는까닭(r: 리포트응답, 나: string): string | null {
  const 마지막 = Math.max(...r.versions.map((v) => v.version));
  if (r.version < 마지막) return '더 새 버전이 있습니다. 마지막 버전에서 승인할 수 있습니다';
  if (r.performers.includes(나)) return '수행자는 승인할 수 없습니다';
  if (r.summary.overview.running > 0) return '진행 중인 실행이 완료되면 승인할 수 있습니다';
  return null;
}

/** 문서 높이에 iframe 을 맞춘다 — 안에서 따로 스크롤하면 휴대폰에서 화면 스크롤과 엉킨다. 사진이 늦게 오면 높이가 또 바뀐다 */
function 문서칸({ id }: { id: number }) {
  const t = use말();
  const 틀 = useRef<HTMLIFrameElement>(null);
  const [실음, set실음] = useState(false);
  const 지켜봄 = useRef<ResizeObserver | null>(null);
  useEffect(() => () => 지켜봄.current?.disconnect(), []);
  const 맞춘다 = () => {
    const 문서 = 틀.current?.contentDocument;
    if (틀.current === null || 문서 === null || 문서 === undefined) return;
    const 높이 = () => {
      if (틀.current !== null) 틀.current.style.height = `${String(문서.documentElement.scrollHeight)}px`;
    };
    높이();
    지켜봄.current?.disconnect();
    if (typeof ResizeObserver !== 'undefined' && 문서.body !== null) {
      지켜봄.current = new ResizeObserver(높이);
      지켜봄.current.observe(문서.body);
    }
    set실음(true);
  };
  return (
    <div className="qar-doc-wrap">
      {실음 ? null : <Loading />}
      {/* 스크립트는 막고(리포트 HTML 에는 스크립트가 없다) 같은 출처만 열어 높이를 읽는다. 문서 안 링크(PR · 사진)는 새 탭으로 나간다 */}
      <iframe
        ref={틀}
        className="qar-doc"
        title={t('리포트 본문')}
        src={리포트파일주소(id, 'HTML')}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        onLoad={맞춘다}
      />
    </div>
  );
}

function 승인칸({ r, 나, 관리자, on바뀜 }: { r: 리포트응답; 나: string; 관리자: boolean; on바뀜: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [중, set중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [복사함, set복사함] = useState(false);
  const a = r.approval;

  if (a !== null) {
    return (
      <div className="qar-sign">
        <p>
          <b>{t('승인됨 · {승인자}', { 승인자: a.byName ?? a.by })}</b> · {when(a.at, 언어)}
          {a.late ? <> · {t('사후 승인')}</> : null}
        </p>
        {a.sha256 === null ? null : (
          <p className="qar-hash">
            {/* 지문은 문서 안에 못 넣는다(자기 지문을 자기 안에 담을 수 없다) — 화면에 보인다 (§3.17 「첫 장」 승인) */}
            {t('PDF 지문')} <code title={a.sha256}>{a.sha256.slice(0, 12)}</code>
            <button
              type="button"
              className="btn ghost"
              onClick={() => void navigator.clipboard.writeText(a.sha256 ?? '').then(() => set복사함(true), () => set복사함(false))}
            >
              {복사함 ? t('복사함') : t('복사')}
            </button>
          </p>
        )}
      </div>
    );
  }
  // 승인은 관리자 일이다 — 못 하는 사람에게는 자리를 안 그린다(role.ts). 상태는 머리 칩이 말한다
  if (!관리자) return null;
  const 까닭 = 승인못하는까닭(r, 나);
  const 승인 = async () => {
    set중(true);
    set오류(null);
    try {
      await qaReportApi.approve(r.id);
      on바뀜();
    } catch (e) {
      set오류(거절문장(e, t, 언어));
      // 그사이 남이 승인했거나 새 버전이 섰으면 지금 상태를 다시 읽는다
      if (e instanceof ApiError && (e.code === 'ALREADY_APPROVED' || e.code === 'NOT_LATEST')) on바뀜();
    } finally {
      set중(false);
    }
  };
  return (
    <div className="qar-sign">
      <p>{t('승인은 이 리포트의 시험 범위와 결과를 확인했다는 뜻입니다')}</p>
      <div className="qar-acts">
        <button type="button" className="btn primary" disabled={까닭 !== null || 중} onClick={() => void 승인()}>
          <기다림글자 중={중} 평소={t('승인')} 기다림={t('승인하는 중')} />
        </button>
      </div>
      {까닭 === null ? null : <p className="hint">{t(까닭)}</p>}
      {오류 === null ? null : (
        <p className="qar-error" role="alert">
          {오류}
        </p>
      )}
    </div>
  );
}

function 문장수정({ r, on바뀜 }: { r: 리포트응답; on바뀜: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [열림, set열림] = useState(false);
  const [글, set글] = useState('');
  const [중, set중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const 지금글 = r.ai !== null && !('failed' in r.ai) ? r.ai.current : '';

  if (!열림) {
    return (
      <button
        type="button"
        className="btn ghost"
        onClick={() => {
          set글(지금글);
          set오류(null);
          set열림(true);
        }}
      >
        {t('남은 리스크 문장 수정')}
      </button>
    );
  }
  const 저장 = async () => {
    set중(true);
    set오류(null);
    try {
      await qaReportApi.saveAi(r.id, 글);
      set열림(false);
      on바뀜();
    } catch (e) {
      set오류(거절문장(e, t, 언어));
    } finally {
      set중(false);
    }
  };
  return (
    <div className="qar-edit">
      <label htmlFor="qar-ai">{t('남은 리스크')}</label>
      {/* 「기능 리스크」 · 「비기능 리스크」 줄은 묶음 머리다. 줄마다 「- 」로 쓰면 문서가 목록으로 그린다 */}
      <textarea id="qar-ai" value={글} maxLength={4000} rows={10} onChange={(e) => set글(e.target.value)} />
      <p className="hint">{t('AI 가 처음 쓴 글은 따로 남고 리포트에는 수정한 글이 들어갑니다')}</p>
      <div className="qar-acts">
        <button type="button" className="btn ghost" onClick={() => set열림(false)} disabled={중}>
          {t('취소')}
        </button>
        <button type="button" className="btn primary" onClick={() => void 저장()} disabled={중 || 글.trim() === ''}>
          <기다림글자 중={중} 평소={t('저장')} 기다림={t('저장하는 중')} />
        </button>
      </div>
      {오류 === null ? null : (
        <p className="qar-error" role="alert">
          {오류}
        </p>
      )}
    </div>
  );
}

export function QaReport({ id, user }: { id: number; user: User }) {
  const t = use말();
  const 리포트 = useAsync(() => qaReportApi.get(id), [id]);
  // 승인 · 문장 수정 뒤 문서를 다시 받는다 — key 가 바뀌면 iframe 이 새로 실린다
  const [판, set판] = useState(0);
  const 다시 = () => {
    void 리포트.reload();
    set판((n) => n + 1);
  };

  if (리포트.error !== null) return <Failed error={리포트.error} />;
  if (리포트.data === null) return <Loading />;
  const r = 리포트.data;
  const 승인됨 = r.approval !== null;
  const 쓰나 = 할수있나(user, r.service, '실행');

  return (
    <div className="qar qar-view">
      <Head
        위치={t('QA 리포트')}
        제목={리포트이름(r, t)}
        부제={
          <span className="qar-sub">
            <span className={승인됨 ? 'qar-state ok' : 'qar-state wait'}>{승인됨 ? t('승인됨') : t('승인 전')}</span>
            {r.summary.overview.serviceName} · {r.env}
            {r.versions.length > 1 ? (
              <select
                aria-label={t('버전')}
                value={r.id}
                // 버전마다 리포트 번호가 달라 주소를 바꾼다 — 보낸 주소로 같은 버전이 열린다
                onChange={(e) => {
                  window.location.hash = `#/qa-reports/${e.target.value}`;
                }}
              >
                {r.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {t('버전 {버전}', { 버전: v.version })}
                    {v.approvedAt === null ? '' : ` · ${t('승인됨')}`}
                  </option>
                ))}
              </select>
            ) : (
              <> · {t('버전 {버전}', { 버전: r.version })}</>
            )}
          </span>
        }
        행동={
          <details className="qar-down">
            <summary className="btn ghost">{t('다운로드')}</summary>
            <ul>
              {형식들.map((f) => (
                <li key={f.형식}>
                  <a href={리포트파일주소(r.id, f.형식)} target="_blank" rel="noreferrer">
                    {f.형식 === 'DOCX' ? t(f.이름) : f.이름}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        }
      />
      <div className="qar-panel">
        <승인칸 r={r} 나={user.username} 관리자={user.role === 'admin'} on바뀜={다시} />
        {/* 승인된 버전은 서버가 409 로 막는다 — 단추를 안 그린다 */}
        {쓰나 && !승인됨 ? <문장수정 key={`${String(r.id)}:${r.updatedAt}`} r={r} on바뀜={다시} /> : null}
      </div>
      {/* 판이 바뀌면 칸을 새로 그린다 — 다시 싣는 동안 「불러오는 중」이 다시 보이게 */}
      <문서칸 key={판} id={r.id} />
    </div>
  );
}
