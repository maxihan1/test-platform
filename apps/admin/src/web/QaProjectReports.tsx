// QA 리포트 › 프로젝트 탭 — 프로젝트 리포트 목록과 「리포트 만들기」 기간 선택 (도메인/리포팅 §8.21 「프로젝트 탭」 · 시안 QJUwEvAPXvUrRpwBCRibpq ①)

import { useState } from 'react';

import { 빠른기간, 짧은날 } from '../reporting/qaProjectReportShape.js';
import type { ServiceRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 다음이있나 } from './paging.js';
import { qaReportApi, 쪽크기, type 프로젝트리포트줄 } from './qaReportApi.js';
import { Failed, Loading, message, useAsync, when, 기다림글자 } from './ui.js';

type 기간꼴 = 'week' | 'month' | 'custom';

const 시간대 = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;
/** 이 브라우저 시간대의 오늘 — sv-SE 꼴이 곧 YYYY-MM-DD 다 */
const 오늘 = (): string => new Intl.DateTimeFormat('sv-SE', { timeZone: 시간대() }).format(new Date());

function 만들기창({ projectId, on닫기 }: { projectId: number; on닫기: () => void }) {
  const t = use말();
  const 언어 = use언어();
  const [꼴, set꼴] = useState<기간꼴>('week');
  const 지금 = 오늘();
  const [직접, set직접] = useState(() => 빠른기간(지금, 'week'));
  const [중, set중] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const 기간 = 꼴 === 'custom' ? 직접 : 빠른기간(지금, 꼴);
  const 고르개: { 값: 기간꼴; 이름: string }[] = [
    { 값: 'week', 이름: t('이번 주') },
    { 값: 'month', 이름: t('이번 달') },
    { 값: 'custom', 이름: t('직접 선택') },
  ];
  const 만들기 = async () => {
    set중(true);
    set오류(null);
    try {
      const { id } = await qaReportApi.projectCreate(projectId, 기간.from, 기간.to, 시간대());
      window.location.hash = `#/qa-reports/project/${String(id)}`;
    } catch (e) {
      set오류(message(e, 언어));
      set중(false);
    }
  };
  return (
    <div className="qar-make" role="group" aria-label={t('리포트 기간')}>
      <div className="chip-group">
        {고르개.map((g) => (
          <button key={g.값} type="button" className="chip" aria-pressed={꼴 === g.값} onClick={() => set꼴(g.값)}>
            {g.이름}
          </button>
        ))}
      </div>
      {꼴 === 'custom' ? (
        <div className="qar-dates">
          <label>
            <span className="filter-label">{t('시작일')}</span>
            <input type="date" value={직접.from} max={지금} onChange={(e) => set직접((x) => ({ ...x, from: e.target.value }))} />
          </label>
          <label>
            <span className="filter-label">{t('종료일')}</span>
            <input type="date" value={직접.to} max={지금} onChange={(e) => set직접((x) => ({ ...x, to: e.target.value }))} />
          </label>
        </div>
      ) : null}
      <p className="hint">
        {t('{시작} ~ {끝} · 기간은 92일까지 선택할 수 있습니다', { 시작: 기간.from, 끝: 기간.to })}
      </p>
      <div className="qar-acts">
        <button type="button" className="btn ghost" onClick={on닫기} disabled={중}>
          {t('취소')}
        </button>
        <button type="button" className="btn primary" onClick={() => void 만들기()} disabled={중 || 기간.from === '' || 기간.to === ''}>
          <기다림글자 중={중} 평소={t('만들기')} 기다림={t('만드는 중')} />
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

function 줄하나({ 줄 }: { 줄: 프로젝트리포트줄 }) {
  const t = use말();
  const 언어 = use언어();
  return (
    <li>
      <a className="qar-row" href={`#/qa-reports/project/${String(줄.id)}`}>
        <span className="qar-row-top">
          <b className="qar-name">
            {짧은날(줄.from)} ~ {짧은날(줄.to)}
          </b>
          <span className="qar-state">{줄.origin === 'SCHEDULED' ? t('자동') : t('직접 만듦 · {이름}', { 이름: 줄.createdBy })}</span>
        </span>
        <span className="qar-meta">{t('{시각} 집계', { 시각: when(줄.createdAt, 언어) })}</span>
      </a>
    </li>
  );
}

export function QaProjectReports({ service, 쓰나 }: { service: ServiceRow; 쓰나: boolean }) {
  const t = use말();
  const [page, setPage] = useState(1);
  const [만드는중, set만드는중] = useState(false);
  const 목록 = useAsync(() => qaReportApi.projectList(service.projectId, page), [service.projectId, page]);

  return (
    <>
      <div className="qar-proj-head">
        <span className="qar-meta">{t('{프로젝트} 프로젝트의 모든 애플리케이션을 기간 단위로 묶어 보여 줍니다', { 프로젝트: service.projectName })}</span>
        {/* 만들기는 실행 write 다 — 못 하는 사람에게는 단추를 안 그린다 (인증 §7) */}
        {쓰나 && !만드는중 ? (
          <button type="button" className="btn primary" onClick={() => set만드는중(true)}>
            {t('리포트 만들기')}
          </button>
        ) : null}
      </div>
      {만드는중 ? <만들기창 projectId={service.projectId} on닫기={() => set만드는중(false)} /> : null}
      {목록.error !== null ? (
        <Failed error={목록.error} />
      ) : 목록.data === null ? (
        <Loading />
      ) : 목록.data.items.length === 0 && page === 1 ? (
        <div className="empty">
          {t('프로젝트 리포트가 없습니다')}
          {쓰나 ? <small>{t('리포트 만들기에서 기간을 선택하면 그 기간의 숫자로 리포트를 만듭니다')}</small> : null}
        </div>
      ) : (
        <>
          <p className="qar-count">{t('리포트 {수}건', { 수: 목록.data.total })}</p>
          <ul className="qar-list">
            {목록.data.items.map((줄) => (
              <줄하나 key={줄.id} 줄={줄} />
            ))}
          </ul>
          {page === 1 && !다음이있나({ items: 목록.data.items, pageSize: 쪽크기 }) ? null : (
            <div className="pager">
              <button onClick={() => setPage((n) => n - 1)} disabled={page <= 1}>
                {t('이전')}
              </button>
              <span>{t('{쪽}페이지', { 쪽: page })}</span>
              <button onClick={() => setPage((n) => n + 1)} disabled={!다음이있나({ items: 목록.data.items, pageSize: 쪽크기 })}>
                {t('다음')}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
