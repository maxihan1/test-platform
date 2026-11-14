// 결과 분석 › QA 리포트 — 탭 둘(애플리케이션 · 프로젝트)과 애플리케이션 리포트 목록 · 거르개 (도메인/리포팅 §8.21 · 시안 QJUwEvAPXvUrRpwBCRibpq ①)

import { useState } from 'react';

import type { ServiceRow } from './api.js';
import { Head } from './Head.js';
import { use말, use언어, type 언어 } from './i18n.js';
import { use주소조건, 주소조건 } from './leaveGuard.js';
import { 다음이있나 } from './paging.js';
import { qaReportApi, 쪽크기, type 리포트종류, type 리포트줄 } from './qaReportApi.js';
import { Failed, Loading, useAsync, when } from './ui.js';

type 말 = ReturnType<typeof use말>;
type 승인거르개 = '' | 'false' | 'true';

const 종류이름: Record<리포트종류, string> = { FN: '기능', UI: 'UI', E2E: 'E2E', COMPAT: '호환성', PERF: '성능' };

/** 줄 이름 — 빌드 번호, 빌드 없는 실행 하나면 `RUN 812`, 성능 실행 하나면 성능 실행 화면의 `PRF-0012` 꼴 (§8.21 「애플리케이션 탭」) */
export function 리포트이름(줄: Pick<리포트줄, 'buildNo' | 'runId' | 'perfRunId'>, t: 말): string {
  if (줄.buildNo !== null) return t('빌드 {빌드}', { 빌드: 줄.buildNo });
  if (줄.runId !== null) return `RUN ${String(줄.runId)}`;
  return `PRF-${String(줄.perfRunId ?? 0).padStart(4, '0')}`;
}

function 줄하나({ 줄, t, 언어 }: { 줄: 리포트줄; t: 말; 언어: 언어 }) {
  const 승인됨 = 줄.approvedAt !== null;
  return (
    // ponytail: 리포트 보기 화면(QAR-F1-10)이 서기 전까지 HTML 문서를 새 탭으로 연다. 10 이 `#/qa-reports/<번호>` 로 바꾼다
    <li>
      <a className="qar-row" href={`/api/qa-reports/${String(줄.id)}/file?format=HTML`} target="_blank" rel="noreferrer">
        <span className="qar-row-top">
          <b className="qar-name">{리포트이름(줄, t)}</b>
          {/* 상태를 색으로만 말하지 않는다 — 글자가 먼저다 */}
          <span className={승인됨 ? 'qar-state ok' : 'qar-state wait'}>{승인됨 ? t('승인됨 · {승인자}', { 승인자: 줄.approvedBy ?? '' }) : t('승인 전')}</span>
        </span>
        <span className="qar-meta">
          {줄.env} · {t('버전 {버전}', { 버전: 줄.version })}
          {/* 아직 다 돌기 전이면 끝난 시각이 없다 — 빈 칸 대신 아래 「진행 중」이 말한다 */}
          {줄.finishedAt === null ? null : <> · {t('마지막 실행 {시각}', { 시각: when(줄.finishedAt, 언어) })}</>}
        </span>
        <span className="qar-kinds">
          {줄.kinds.map((k) => (
            <span key={k} className="qar-kind">
              {/* 저장된 첫 장 재료라 모르는 종류가 올 수 있다 — 그 값 그대로 둔다 */}
              {종류이름[k] === undefined ? k : t(종류이름[k])}
            </span>
          ))}
          {줄.running > 0 ? <span className="qar-kind running">{t('진행 중')}</span> : null}
        </span>
      </a>
    </li>
  );
}

function 애플리케이션탭({ service, t }: { service: ServiceRow; t: 말 }) {
  const 언어 = use언어();
  const [처음] = useState(주소조건);
  // 고르개는 대상 서버가 둘 이상일 때만 선다 — 고르개가 없는데 주소의 값으로 거르면 사람이 풀 길이 없다.
  // 다른 애플리케이션에서 넘어온 대상 서버도 이 애플리케이션에 없을 수 있다 — 둘 다 전체로 본다
  const 서버고르나 = service.envs.length > 1;
  const [env, setEnv] = useState(() => {
    const 값 = 처음.get('env') ?? '';
    return 서버고르나 && service.envs.some((e) => e.env === 값) ? 값 : '';
  });
  const [승인, set승인] = useState<승인거르개>(() => {
    const 값 = 처음.get('approved');
    return 값 === 'true' || 값 === 'false' ? 값 : '';
  });
  const [page, setPage] = useState(1);
  // 거르개는 주소에 남는다 — 리포트를 보고 돌아와도 같은 목록이다 (공통/5-화면공통 §8 「화면을 오가도 하던 일이 풀리지 않는다」)
  use주소조건('#/qa-reports', { ...(env === '' ? {} : { env }), ...(승인 === '' ? {} : { approved: 승인 }) });
  const 목록 = useAsync(
    () => qaReportApi.list(service.prefix, { ...(env === '' ? {} : { env }), ...(승인 === '' ? {} : { approved: 승인 === 'true' }), page }),
    [service.prefix, env, 승인, page],
  );
  const 승인고르개: { 값: 승인거르개; 이름: string }[] = [
    { 값: '', 이름: t('전체') },
    { 값: 'false', 이름: t('승인 전') },
    { 값: 'true', 이름: t('승인됨') },
  ];
  const 거른 = env !== '' || 승인 !== '';

  return (
    <>
      <div className="qar-filters">
        <div className="chip-group" role="group" aria-label={t('승인 상태')}>
          {승인고르개.map((g) => (
            <button
              key={g.값}
              type="button"
              className="chip"
              aria-pressed={승인 === g.값}
              onClick={() => {
                set승인(g.값);
                setPage(1);
              }}
            >
              {g.이름}
            </button>
          ))}
        </div>
        {서버고르나 ? (
          <label className="qar-env">
            <span className="filter-label">{t('대상 서버')}</span>
            <select
              value={env}
              onChange={(e) => {
                setEnv(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('전체')}</option>
              {service.envs.map((e) => (
                <option key={e.env} value={e.env}>
                  {e.env}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {목록.error !== null ? (
        <Failed error={목록.error} />
      ) : 목록.data === null ? (
        <Loading />
      ) : 목록.data.items.length === 0 && page === 1 ? (
        거른 ? (
          <div className="empty">{t('조건에 맞는 리포트가 없습니다')}</div>
        ) : (
          <div className="empty">
            {t('아직 QA 리포트가 없습니다')}
            <small>{t('실행이 완료되면 빌드마다 리포트를 만듭니다')}</small>
          </div>
        )
      ) : (
        <>
          <p className="qar-count">{t('리포트 {수}건', { 수: 목록.data.total })}</p>
          <ul className="qar-list">
            {목록.data.items.map((줄) => (
              <줄하나 key={줄.id} 줄={줄} t={t} 언어={언어} />
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

export function QaReports({ service, tab }: { service: ServiceRow; tab: 'app' | 'project' }) {
  const t = use말();
  const 탭들 = [
    { 값: 'app', 이름: t('애플리케이션'), 주소: '#/qa-reports' },
    { 값: 'project', 이름: t('프로젝트§탭'), 주소: '#/qa-reports/project' },
  ] as const;
  return (
    <div className="qar">
      <Head 제목={t('QA 리포트')} />
      {/* 탭마다 주소가 있다 — 보내 준 주소로 같은 탭이 열린다 (§8.21 「자리」) */}
      <nav className="qar-tabs" aria-label={t('리포트 종류')}>
        {탭들.map((x) => (
          <a key={x.값} href={x.주소} className="qar-tab" aria-current={tab === x.값 ? 'page' : undefined}>
            {x.이름}
          </a>
        ))}
      </nav>
      {tab === 'app' ? (
        <애플리케이션탭 service={service} t={t} />
      ) : (
        // 프로젝트 리포트 목록 · 만들기는 QAR-F1-11 이 이 자리에 단다
        <div className="empty">
          {t('프로젝트 리포트가 없습니다')}
          <small>{t('{프로젝트} 프로젝트의 모든 애플리케이션을 기간 단위로 묶어 보여 줍니다', { 프로젝트: service.projectName })}</small>
        </div>
      )}
    </div>
  );
}
