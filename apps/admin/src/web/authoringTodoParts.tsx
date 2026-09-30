// 작성 요청 「다음 단계」 카드의 항목들 — 번호 붙은 한 가지 일 · 이어서 작성 · 남은 요구로 이어 작성
// (도메인/작성 §7 「이어하기」 · §3.6 「★ 원장」 「남은 요구로 이어 작성」 · DESIGN.md 「작성 상태」)

import { api, type AuthoringCoverage, type AuthoringRow } from './api.js';
import { use말, use언어, type 언어 } from './i18n.js';

/** 번호 붙은 한 가지 일. 번호는 순서가 뜻을 가질 때만(완료), 고르는 일은 A · B 로 적는다 */
export function 일({ 표, 제목, 설명, children }: { 표: string; 제목: string; 설명: string; children?: React.ReactNode }) {
  return (
    <li>
      <span className="k" aria-hidden="true">
        {표}
      </span>
      <div>
        <span className="t">{제목}</span>
        <p>{설명}</p>
        {children}
      </div>
    </li>
  );
}

/** 「10월 5일」 — 이어갈 수 있는 마지막 날. 시각까지는 안 쓴다 */
function 날짜(iso: string, 언어: 언어): string {
  return new Intl.DateTimeFormat(언어 === 'en' ? 'en-US' : 'ko-KR', { month: 'long', day: 'numeric' }).format(new Date(iso));
}

/**
 * 중단된 요청의 A — 이어서 작성. 누를 수 없으면 까닭을 한 줄로 말한다(이미 이어받음 · 보관 기간 지남).
 * 보관 기간은 서버가 날짜로 준다(`resumeUntil`) — 날 수를 화면에 또 적지 않는다
 */
export function 이어서작성({
  service,
  요청,
  권한,
  보내는중,
  새줄로,
}: {
  service: string;
  요청: AuthoringRow;
  권한: boolean;
  보내는중: boolean;
  새줄로: (만든다: () => Promise<{ id: number }>) => void;
}) {
  const t = use말();
  const 언어 = use언어();
  const 수 = 요청.progress?.caseFiles ?? 0;

  if (요청.canResume !== true) {
    return (
      <일 표="A" 제목={t('이어서 작성')} 설명="">
        {/* 이어받은 실행은 같은 번호의 실행 기록에 있다 — 새 번호로 가는 고리를 두지 않는다 (§7 「실행 기록」) */}
        {typeof 요청.resumedBy === 'number' ? (
          <p className="hint">{t('이미 이어서 작성했습니다. 아래 실행 기록을 보세요.')}</p>
        ) : (
          <p className="hint">{t('보관 기간이 지나 작성 결과를 지웠습니다. 처음부터 다시 작성하세요.')}</p>
        )}
      </일>
    );
  }
  const 앞 =
    수 > 0
      ? t('중단 전까지 만든 테스트 {수}개를 이어받아 남은 작업을 계속합니다.', { 수 })
      : t('중단된 자리부터 남은 작업을 계속합니다.');
  const 기한 =
    typeof 요청.resumeUntil === 'string' ? t('{날}까지 이어갈 수 있습니다.', { 날: 날짜(요청.resumeUntil, 언어) }) : '';
  return (
    <일 표="A" 제목={t('이어서 작성')} 설명={[앞, 기한].filter((글) => 글 !== '').join(' ')}>
      {권한 ? (
        <button
          className="btn"
          type="button"
          disabled={보내는중}
          onClick={() => 새줄로(() => api.createAuthoringRequest(service, { kind: 'RERUN', sourceId: 요청.id, resume: true }))}
        >
          {보내는중 ? t('시작하는 중…') : t('이어서 작성')}
        </button>
      ) : (
        <p className="hint">{t('다시 작성은 실행 권한이 있는 사람만 할 수 있습니다.')}</p>
      )}
    </일>
  );
}

/** 셈에 남은 요구(다음 요청 · 빠짐) 수. 셈이 없거나 원장이 없으면 null */
export function 남은수(셈: AuthoringCoverage | null): { 다음: number; 빠짐: number } | null {
  if (셈 === null || 'none' in 셈) return null;
  return { 다음: 셈.later.length, 빠짐: 셈.missing.length };
}

/**
 * 반영 끝난 요청의 A — 남은 요구로 이어 작성. **새 번호로 넘어간다** — 같은 번호에 쌓는 이어서 작성 · 다시 작성과 다르다.
 * 낱말은 늘 「남은 요구」 — 「이어서 작성」(재개)과 한 화면에 같이 나와도 헷갈리지 않게 (2026-09-30 계획 검토).
 * 누를 수 있는지는 서버가 잰다(`canContinue`). 못 누르면 까닭을 한 줄로 — 셈은 반영한 작성 실행 것이다(머지 행에는 셈이 없다)
 */
export function 남은요구이어작성({
  요청,
  셈,
  권한,
  보내는중,
  새번호로,
}: {
  요청: AuthoringRow;
  셈: AuthoringCoverage | null;
  권한: boolean;
  보내는중: boolean;
  새번호로: (뿌리: number) => void;
}) {
  const t = use말();
  const 제목 = t('남은 요구로 이어 작성');
  if (typeof 요청.continuedBy === 'number') {
    const 번호 = 요청.continuedBy;
    return (
      <일 표="A" 제목={제목} 설명={t('남은 요구는 #{번호} 요청이 맡았습니다.', { 번호 })}>
        <a className="btn ghost" href={`#/authoring/${String(번호)}`}>
          {t('#{번호} 요청 보기', { 번호 })}
        </a>
      </일>
    );
  }
  const 남음 = 남은수(셈);
  if (요청.canContinue !== true) {
    const 까닭 =
      셈 !== null && 'none' in 셈
        ? t('기획서 요구를 세지 못해 이어 작성할 수 없습니다.')
        : 남음 !== null && 남음.다음 + 남음.빠짐 === 0
          ? t('이어 작성할 요구가 없습니다. 모두 케이스로 만들었거나 제외했습니다.')
          : t('이 요청은 이어 작성할 수 없습니다.');
    return <일 표="A" 제목={제목} 설명={까닭} />;
  }
  const 설명 = [
    ...(남음 === null ? [] : [t('반영한 실행 기준으로 다음 요청 {다음}개 · 빠짐 {빠짐}개가 남았습니다.', 남음)]),
    t('이것을 새 요청으로 작성하고 새 번호로 넘어갑니다. 남은 요구는 에이전트가 시작할 때 다시 셉니다.'),
  ].join(' ');
  const 뿌리 = 요청.rootId ?? 요청.id;
  return (
    <일 표="A" 제목={제목} 설명={설명}>
      {권한 ? (
        <button className="btn" type="button" disabled={보내는중} onClick={() => 새번호로(뿌리)}>
          {보내는중 ? t('시작하는 중…') : 제목}
        </button>
      ) : (
        <p className="hint">{t('이어 작성은 작성 요청 권한이 있는 사람만 할 수 있습니다.')}</p>
      )}
    </일>
  );
}
