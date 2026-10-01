// 작성 요청 한 건의 Status 카드 — 단계 막대 · 진척 · 시간 막대 · 숫자 칸 · 방금 한 일. 상세 페이지와 시작 모달이 같이 쓴다 (DESIGN.md 「작성 상태」)

import type { AuthoringCoverage, AuthoringRow } from './api.js';
import { 단계글라벨, 단계라벨, 단계이름들, 단계자리, 시간판, 진척, 진척이찼나, 짧은수, 활동글 } from './authoringStatus.js';
import { 줄보임, 중단이유라벨, 칩글 as 칩글자, type 보임 } from './authoringView.js';
import { use말, use언어, type 언어 } from './i18n.js';
import { 시간글자 } from './RunProgressModal.js';

function 시각(d: Date, 언어: 언어): string {
  return new Intl.DateTimeFormat(언어 === 'en' ? 'en-US' : 'ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

/** 칩 모양. 색은 판정(완료·실패·응답 없음)에만 — 나머지는 잉크다 (DESIGN.md 원칙 1) */
function 칩모양(보: 보임): string {
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
 * 기획서 요구 셈 한 줄. 넷(덮음 · 제외 · 빠짐)이 합쳐 전부라는 것이 보이게 제외 · 빠짐은 0 이어도 남긴다.
 * 판정이 아니라 잉크로만 적는다 (DESIGN.md 원칙 1)
 */
function 커버리지글(c: AuthoringCoverage, 상태: AuthoringRow['status'], t: ReturnType<typeof use말>): string {
  if ('none' in c) return t('셈 없음 — {까닭}', { 까닭: c.none });
  const 제외 = Object.values(c.excluded).reduce((합, 수) => 합 + 수, 0);
  const 원장밖 = c.unread?.length ?? 0;
  // 보류는 DONE 때만 센다 — 중단된 실행의 null 은 「모름」이 아니라 「안 셈」이라 빼 둔다
  const 보류 = c.held === null ? (상태 === 'DONE' ? t('보류 모름') : null) : c.held > 0 ? t('보류로만 {수}', { 수: c.held }) : null;
  const 칸 = [
    c.total > 0
      ? t('{총}개 → 케이스로 덮음 {덮음} ({퍼센트}%)', { 총: c.total, 덮음: c.cased, 퍼센트: Math.round((c.cased / c.total) * 100) })
      : t('{총}개 → 케이스로 덮음 {덮음}', { 총: c.total, 덮음: c.cased }),
    보류,
    c.later.length > 0 ? t('제외 {수} (다음 요청 {다음})', { 수: 제외, 다음: c.later.length }) : t('제외 {수}', { 수: 제외 }),
    t('빠짐 {수}', { 수: c.missing.length }),
    원장밖 > 0 ? t('원장 밖 자료 {수}', { 수: 원장밖 }) : null,
  ];
  return 칸.filter((x): x is string => x !== null).join(' · ');
}

/**
 * `커버리지` 를 넘기면 `요청` 의 셈 대신 그것을 쓴다 — 상세는 머지를 뺀 최신 작성 실행의 셈을 넘긴다.
 * 머지 행에는 셈이 없어 반영 뒤 줄이 사라진다 (2026-09-30 계획 검토 BLOCKER 1)
 */
export function AuthoringStatusCard({
  요청,
  지금,
  service,
  커버리지,
}: {
  요청: AuthoringRow;
  지금: number;
  service?: string;
  커버리지?: AuthoringCoverage | null;
}) {
  const t = use말();
  const 언어 = use언어();
  const 셈 = 커버리지 === undefined ? (요청.coverage ?? null) : 커버리지;
  const 보 = 줄보임(요청, 지금);
  const 자리 = 단계자리(요청);
  const 시간 = 시간판(요청, 지금);
  const p = 진척이찼나(요청.progress) ? 요청.progress : null;
  const 도는중 = 요청.status === 'RUNNING';
  // 머지 · 고치기도 같은 상태 칩을 쓰되 「작성 중」은 거짓말이다 — 반영하는 중 · 고치는 중이다
  const 칩글 = 칩글자(요청, 보, 언어);

  const 입력 = (요청.assets ?? []).filter((a) => (a.role ?? 'INPUT') === 'INPUT');
  const 파일수 = 입력.filter((a) => a.kind !== 'FIGMA').length;
  const 피그마수 = 입력.length - 파일수;
  const 요약 = [
    service,
    파일수 > 0 ? t('기획서 {수}', { 수: 파일수 }) : null,
    피그마수 > 0 ? t('피그마 {수}', { 수: 피그마수 }) : null,
    요청.compare === true ? t('화면과 대조') : null,
  ].filter((x): x is string => x !== null && x !== undefined);

  const 초전 =
    p?.lastActionAt === undefined || p.lastAction === undefined
      ? null
      : Math.max(0, Math.round((지금 - Date.parse(p.lastActionAt)) / 1000));

  return (
    <div className="status-card">
      <div className="status-top">
        <span className="status-sum">{요약.join(' · ')}</span>
        <span className={칩모양(보)}>
          <span className="dot" aria-hidden="true" />
          {칩글}
        </span>
      </div>

      {자리 === null ? null : (
        <ol className="status-steps" aria-label={t('단계')}>
          {단계이름들.map((이름, i) => {
            const 끝낸 = i < 자리.끝난;
            const 여기 = 자리.지금 === i;
            const 모양 = 여기 ? (자리.멈춤 === 'failed' ? 'fail' : 자리.멈춤 === 'stopped' ? 'halt' : 'now') : 끝낸 ? 'done' : '';
            return (
              <li key={이름} className={모양} aria-current={여기 ? 'step' : undefined}>
                <span className="m" aria-hidden="true">
                  {끝낸 ? '✓' : 모양 === 'fail' ? '!' : 모양 === 'halt' ? '‖' : ''}
                </span>
                {단계라벨(이름, 언어)}
              </li>
            );
          })}
        </ol>
      )}

      {자리 === null ? null : (
        <div className="status-row">
          <span className="status-label">{t('진척')}</span>
          {요청.status === 'PENDING' || 요청.status === 'DRAFT' ? (
            <span className="status-sub">
              {요청.status === 'PENDING' ? t('에이전트 순서를 기다리는 중') : t('자료 올리기가 끝나지 않았습니다')}
            </span>
          ) : (
            <div className="status-v">
              <막대 이름={t('진척')} 비율={진척(자리).비율} />
              <span className="status-sub">
                {자리.지금 === null
                  ? t('{번호} / {전체} 단계 · {퍼센트}%', { 번호: 진척(자리).번호, 전체: 단계이름들.length, 퍼센트: Math.round(진척(자리).비율 * 100) })
                  : t(자리.멈춤 === null ? '{번호}단계 진행 중 · {퍼센트}%' : '{번호}단계에서 멈춤 · {퍼센트}%', {
                      번호: 진척(자리).번호,
                      퍼센트: Math.round(진척(자리).비율 * 100),
                    })}
              </span>
            </div>
          )}
        </div>
      )}

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
                </>
              ) : (
                <>
                  {t('{지난} 지남', { 지난: 시간글자(시간.걸린ms ?? 0, 언어) })} · {t('시작 {시각}', { 시각: 시각(시간.시작, 언어) })}
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
      {(요청.status === 'FAILED' || 요청.status === 'STOPPED') && 요청.error !== null ? (
        <div className={요청.status === 'STOPPED' ? 'status-reason stopped' : 'status-reason'}>{요청.error}</div>
      ) : null}

      {p === null || 자리 === null ? null : (
        <div className="status-facts">
          <div>
            <span className="status-label">{t('만든 케이스 파일')}</span>
            <b>{t('{수}개', { 수: p.caseFiles })}</b>
          </div>
          <div>
            <span className="status-label">{t('훑은 화면')}</span>
            <b>{p.screens === undefined ? '—' : t('{수}장', { 수: p.screens })}</b>
          </div>
          <div>
            {/* 캐시 읽기를 넣은 값이라 Grafana 「작성 토큰」(입력+출력)보다 수십 배 크다 — 라벨로 드러낸다 */}
            <span className="status-label">{도는중 ? t('토큰 (캐시 읽기 포함 · 지금까지)') : t('토큰 (캐시 읽기 포함)')}</span>
            <b>{짧은수(p.tokens)}</b>
          </div>
        </div>
      )}

      {/* 숫자 칸 조건과 따로 — 진척 기록이 없는 끝난 실행에도 셈은 있다 */}
      {셈 === null ? null : (
        <div className="status-row">
          <span className="status-label">{t('기획서 요구')}</span>
          <span className="status-sub">{커버리지글(셈, 요청.status, t)}</span>
        </div>
      )}

      {도는중 ? (
        초전 !== null && p !== null && p.childRunning ? (
          <div className="status-now">
            <span className="status-label">{t('마지막 활동')}</span>
            <span className="one-line">{활동글(p.lastAction ?? '')}</span>
            <span className="ago">{t('{시간} 전', { 시간: 시간글자(초전 * 1000, 언어) })}</span>
          </div>
        ) : 요청.stage === null ? null : (
          <div className="status-now">
            <span className="status-label">{t('지금 하는 일')}</span>
            <span className="one-line">{단계글라벨(요청.stage, 언어)}</span>
          </div>
        )
      ) : null}
    </div>
  );
}
