// 작성 요청 한 건의 Status 카드 — 단계 막대 · 진척 · 시간 막대 · 숫자 칸 · 방금 한 일. 상세 페이지와 시작 모달이 같이 쓴다 (DESIGN.md 「작성 상태」)

import type { AuthoringCoverage, AuthoringRow } from './api.js';
import { 실패글 } from './authoringFailText.js';
import { 단계글라벨, 단계라벨, 단계이름들, 단계자리, 시간판, 진척이찼나 } from './authoringStatus.js';
import { 반영보임, 반영할일, 줄보임, 중단이유라벨, 칩글 as 칩글자, type 보임 } from './authoringView.js';
import { use말, use언어 } from './i18n.js';
import { PRD항목주소 } from './route.js';
import { 시각글자 as 시각, 시간글자, 작성남은글 } from './remainText.js';

/** 칩 모양. 색은 판정(완료·실패·응답 없음)에만 — 나머지는 잉크다 (DESIGN.md 원칙 1) */
function 칩모양(보: 보임 | 'waiting'): string {
  if (보 === 'done') return 'status-chip done';
  if (보 === 'failed' || 보 === 'stalled') return 'status-chip fail';
  if (보 === 'stopped' || 보 === 'draft') return 'status-chip quiet';
  return 'status-chip live';
}

function 막대({ 이름, 비율, 흐림 = false }: { 이름: string; 비율: number; 흐림?: boolean }) {
  const 퍼센트 = Math.round(비율 * 100);
  return (
    <div className={흐림 ? 'status-bar soft' : 'status-bar'} role="progressbar" aria-label={이름} aria-valuemin={0} aria-valuemax={100} aria-valuenow={퍼센트}>
      <i style={{ width: `${String(퍼센트)}%` }} />
    </div>
  );
}

/**
 * PRD 요구사항 집계. 셋(만듦 · 제외 · 빠짐)이 합쳐 전부라는 것이 보이게 제외 · 빠짐은 0 이어도 남긴다.
 * 갈래 수는 둘째 줄로 뗀다 — 한 줄에 이으면 「기능 247 · UI 152」가 만든 수(368)를 넘어 틀린 셈으로 읽혔다 (점검 N16).
 * 판정이 아니라 잉크로만 적는다 (DESIGN.md 원칙 1)
 */
function 커버리지글(c: AuthoringCoverage, 상태: AuthoringRow['status'], t: ReturnType<typeof use말>): { 셈: string; 갈래: string | null } {
  if ('none' in c) return { 셈: t('집계 없음 — {까닭}', { 까닭: c.none }), 갈래: null };
  const 제외 = Object.values(c.excluded).reduce((합, 수) => 합 + 수, 0);
  const 원장밖 = c.unread?.length ?? 0;
  // 보류는 DONE 때만 센다 — 중단된 실행의 null 은 「모름」이 아니라 「안 셈」이라 빼 둔다
  const 보류 = c.held === null ? (상태 === 'DONE' ? t('입력이 필요한지 확인할 수 없음') : null) : c.held > 0 ? t('입력이 필요한 케이스로만 {수}', { 수: c.held }) : null;
  const 칸 = [
    c.total > 0
      ? t('요구 {총}개 중 케이스로 만듦 {덮음}개 ({퍼센트}%)', { 총: c.total, 덮음: c.cased, 퍼센트: Math.round((c.cased / c.total) * 100) })
      : t('요구 {총}개 중 케이스로 만듦 {덮음}개', { 총: c.total, 덮음: c.cased }),
    보류,
    c.later.length > 0 ? t('제외 {수} (다음 작성 {다음})', { 수: 제외, 다음: c.later.length }) : t('제외 {수}', { 수: 제외 }),
    t('빠짐 {수}', { 수: c.missing.length }),
    원장밖 > 0 ? t('PRD 밖 자료 {수}', { 수: 원장밖 }) : null,
  ];
  // 갈래 수는 이 칸 전 실행에 없다 — 0 으로 채우면 「그 갈래로 덮은 요구 0개」로 읽힌다
  const 갈래 =
    c.casedFn === undefined || c.casedUi === undefined
      ? null
      : t('만든 {덮음}개 중 기능 테스트가 덮은 것 {기능} · UI 테스트가 덮은 것 {UI} — 둘 다 덮은 요구는 양쪽에 셉니다', { 덮음: c.cased, 기능: c.casedFn, UI: c.casedUi });
  return { 셈: 칸.filter((x): x is string => x !== null).join(' · '), 갈래 };
}

/** 빠진 요구 번호 — 수만 보이면 무엇이 빠졌는지 찾으러 가야 했다 (점검 12.10). 길어지면 앞의 열 개만 */
const 빠짐보임 = 10;

/**
 * `커버리지` 를 넘기면 `요청` 의 셈 대신 그것을 쓴다 — 상세는 머지를 뺀 최신 작성 실행의 셈을 넘긴다.
 * 머지 행에는 셈이 없어 반영 뒤 줄이 사라진다 (2026-09-30 계획 검토 BLOCKER 1).
 * `최신` 은 뿌리의 최신 실행(실패한 반영 포함) — 칩과 반영 칸은 그것으로 정한다. 목록이 같은 규칙으로 「반영 실패」를 단다 (점검 N2)
 */
export function AuthoringStatusCard({
  요청,
  지금,
  service,
  커버리지,
  최신,
  뿌리종류,
  운영자 = false,
  세로단계 = false,
}: {
  요청: AuthoringRow;
  지금: number;
  service?: string;
  커버리지?: AuthoringCoverage | null;
  최신?: Pick<AuthoringRow, 'kind' | 'status'>;
  뿌리종류?: AuthoringRow['kind'];
  운영자?: boolean;
  /** 시작 모달은 좁은 창 · 휴대폰 아래 판이라 단계를 세로로 쌓고 도는 칸에 맥박을 단다 (시안 11판 「새 작성 · 접수」) */
  세로단계?: boolean;
}) {
  const t = use말();
  const 언어 = use언어();
  const 셈 = 커버리지 === undefined ? (요청.coverage ?? null) : 커버리지;
  const 셈글 = 셈 === null ? null : 커버리지글(셈, 요청.status, t);
  const 빠진 = 셈 === null || 'none' in 셈 ? [] : 셈.missing;
  const 보 = 줄보임(요청, 지금);
  const 반영 = 반영할일(최신 ?? 요청);
  const 자리 = 단계자리(요청, { 뿌리종류, 최신 });
  const 시간 = 시간판(요청, 지금);
  // 도는 동안만, 평소 걸린 시간을 서버가 줬을 때만 (도메인/작성 §7). 끝난 요청은 「걸림」 한 줄로 충분하다
  const 남은글 = 요청.status === 'RUNNING' ? 작성남은글(시간.걸린ms ?? 0, 지금, 요청.expected, 언어) : null;
  const p = 진척이찼나(요청.progress) ? 요청.progress : null;
  const 도는중 = 요청.status === 'RUNNING';
  // 머지 · 고치기도 같은 상태 칩을 쓰되 「작성 중」은 거짓말이다 — 반영하는 중 · 고치는 중이다
  const 칩글 = 칩글자(요청, 보, 언어, 반영);
  const 실패 = 요청.error === null ? null : 실패글(요청.error, 언어, 운영자);

  const 입력 = (요청.assets ?? []).filter((a) => (a.role ?? 'INPUT') === 'INPUT');
  const 파일수 = 입력.filter((a) => a.kind === 'FILE').length;
  const 피그마수 = 입력.filter((a) => a.kind === 'FIGMA').length;
  // API 문서는 기획서가 아니다 — 이름(「API 문서 버전 3」)을 그대로 적는다
  const API문서 = 입력.find((a) => a.kind === 'API_DOC')?.name ?? null;
  const 요약 = [
    service,
    파일수 > 0 ? t('기획서 {수}', { 수: 파일수 }) : null,
    피그마수 > 0 ? t('피그마 {수}', { 수: 피그마수 }) : null,
    API문서,
    요청.compare === true ? t('화면과 대조') : null,
  ].filter((x): x is string => x !== null && x !== undefined);

  return (
    <div className="status-card">
      <div className="status-top">
        <span className="status-sum">{요약.join(' · ')}</span>
        <span className={칩모양(반영보임(보, 반영))}>
          <span className="dot" aria-hidden="true" />
          {칩글}
        </span>
      </div>

      {자리 === null ? null : (
        <ol className={세로단계 ? 'status-steps v' : 'status-steps'} aria-label={t('단계')}>
          {단계이름들.map((이름, i) => {
            const 끝낸 = i < 자리.끝난;
            const 여기 = 자리.지금 === i;
            const 모양 = 여기 ? (자리.멈춤 === 'failed' ? 'fail' : 자리.멈춤 === 'stopped' ? 'halt' : 'now') : 끝낸 ? 'done' : '';
            return (
              <li key={이름} className={모양 === 'now' && 도는중 ? 'now live' : 모양} aria-current={여기 ? 'step' : undefined}>
                <span className="m" aria-hidden="true">
                  {끝낸 ? '✓' : 모양 === 'fail' ? '!' : 모양 === 'halt' ? '‖' : ''}
                </span>
                {단계라벨(이름, 언어)}
              </li>
            );
          })}
        </ol>
      )}

      {/* 단계 막대가 지금 칸을 보인다 — 「3단계 진행 중 · 40%」를 또 적으면 같은 말이 둘이다 (점검 12.16) */}
      {요청.status === 'PENDING' || 요청.status === 'DRAFT' ? (
        <div className="status-row">
          <span className="status-label">{t('진척')}</span>
          <span className="status-sub">
            {요청.status === 'PENDING' ? t('작성 순서를 기다리는 중') : t('자료 올리기가 끝나지 않았습니다')}
          </span>
        </div>
      ) : null}

      {시간.시작 === null ? null : (
        <div className="status-row">
          <span className="status-label">{시간.끝 === null ? t('시간') : 요청.status === 'DONE' ? t('완료') : t('끝남')}</span>
          <div className="status-v">
            {시간.한도 === null ? null : <막대 이름={t('시간')} 비율={시간.한도.비율} 흐림 />}
            <span className="status-sub">
              {시간.끝 !== null ? (
                <>
                  <b>{시각(시간.끝, 언어)}</b> ·{' '}
                  {t('{시간} 걸림 (시작 {시작})', { 시간: 시간글자(시간.걸린ms ?? 0, 언어), 시작: 시각(시간.시작, 언어) })}
                </>
              ) : 시간.한도 !== null ? (
                <>
                  {t('{지난} 지남 / 한도 {한도}', { 지난: 시간글자(시간.한도.지난ms, 언어), 한도: 시간글자(시간.한도.한도ms, 언어) })} ·{' '}
                  {t('시작 {시각}', { 시각: 시각(시간.시작, 언어) })} ·{' '}
                  <b>{t('늦어도 {시각} 완료', { 시각: 시각(시간.한도.늦어도, 언어) })}</b>
                  {남은글 === null ? null : <> · {남은글}</>}
                </>
              ) : (
                <>
                  {t('{지난} 지남', { 지난: 시간글자(시간.걸린ms ?? 0, 언어) })} ·{' '}
                  {남은글 ?? t('시작 {시각}', { 시각: 시각(시간.시작, 언어) })}
                </>
              )}
            </span>
          </div>
        </div>
      )}

      {요청.status === 'STOPPED' ? (
        <div className="status-stop">
          <b>
            {요청.stoppedBy === 'system' ? t('시스템') : (요청.stoppedByName ?? 요청.stoppedBy ?? t('기록 없음'))} ·{' '}
            {중단이유라벨(요청.stopReason, 언어)}
          </b>
        </div>
      ) : null}

      {/* 중단도 까닭 글이 있으면 보인다 — 올리기 거절은 무엇을 고칠지가 거기 있다. 회색 중단이라도 까닭은 늘 보인다 (작성 §7) */}
      {/* 에이전트 글은 개발자 반말이라 사람 말로 옮기고 원문은 접어 둔다 (점검 12.7) */}
      {(요청.status === 'FAILED' || 요청.status === 'STOPPED') && 실패 !== null ? (
        <div className={요청.status === 'STOPPED' ? 'status-reason stopped' : 'status-reason'}>
          {실패.글}
          {실패.원문 === null ? null : (
            <details className="status-raw">
              <summary>{t('원문 보기')}</summary>
              <pre className="mono">{실패.원문}</pre>
            </details>
          )}
        </div>
      ) : null}

      {p === null || 자리 === null ? null : (
        <div className="status-facts">
          <div>
            <span className="status-label">{t('작성한 케이스 파일')}</span>
            <b>{t('{수}개', { 수: p.caseFiles })}</b>
          </div>
          <div>
            <span className="status-label">{t('탐색한 화면')}</span>
            <b>{p.screens === undefined ? '—' : t('{수}장', { 수: p.screens })}</b>
          </div>
          {/* 토큰 수는 사람이 할 일과 상관없어 뺐다 — Grafana 「작성 토큰」이 본다 (점검 12.9) */}
        </div>
      )}

      {/* 숫자 칸 조건과 따로 — 진척 기록이 없는 끝난 실행에도 셈은 있다.
          계정이 없어 못 쓴 요구는 역할 이름 · 넣을 곳과 함께 「다음 단계」가 말한다 (점검 12.4) */}
      {셈글 === null ? null : (
        <div className="status-row">
          <span className="status-label">{t('PRD 요구사항')}</span>
          <span className="status-sub">
            {셈글.셈}
            {셈글.갈래 === null ? null : (
              <>
                <br />
                <span className="hint">{셈글.갈래}</span>
              </>
            )}
            {빠진.length === 0 ? null : (
              <>
                <br />
                <span className="hint">{t('빠진 요구')}</span>{' '}
                {빠진.slice(0, 빠짐보임).map((r) => (
                  <a key={r} className="mono made-req" href={PRD항목주소(r)}>
                    {r}
                  </a>
                ))}
                {빠진.length - 빠짐보임 > 0 ? <span className="hint">{t('외 {수}개', { 수: 빠진.length - 빠짐보임 })}</span> : null}
              </>
            )}
          </span>
        </div>
      )}

      {/* 에이전트 기록 줄(마지막 활동)은 개발자 말이라 뺐다 — 지금 하는 일만 적는다 (점검 12.8) */}
      {도는중 && 요청.stage !== null ? (
        <div className="status-now">
          <span className="status-label">{t('지금 하는 일')}</span>
          <span className="one-line">{단계글라벨(요청.stage, 언어)}</span>
        </div>
      ) : null}
    </div>
  );
}
