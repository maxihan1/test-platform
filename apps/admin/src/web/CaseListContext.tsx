// 케이스 목록의 맥락 조각 — 묶음 머리 줄 · 줄 아래 요구 줄과 작은 줄 · 걸린 묶음 칩 (도메인/카탈로그 §8.1 「맥락」, 시안 A)
// 줄 하나를 그리는 케이스줄(CaseListParts)이 300줄에 닿아 맥락 부분을 여기로 뗐다

import type { CaseRow, 케이스축 } from './api.js';
import { 기법태그들 } from './CaseDetail.js';
import type { 묶음자리, 묶음조건 } from './CaseListFilter.js';
import { 파일이름, type 묶음머리 } from './caseGroups.js';
import { use말 } from './i18n.js';
import { PRD항목주소 } from './route.js';
import { PLATFORM_LABEL } from './ui.js';

const 화면글 = (머리: 묶음머리, file: string) => 머리.주소 ?? 파일이름(file);

/** 머리 이름 — 기능 묶음 이름 · 화면 주소(없으면 파일 이름) · 화면 조각 파일 이름 */
export function 머리이름(머리: 묶음머리, 없음글: string): string {
  if (머리.단 === 1) return 머리.값 ?? 없음글;
  if (머리.단 === 2) return 화면글(머리, 머리.값 ?? '');
  return 파일이름(머리.값 ?? '');
}

/** 「이것만 보기」로 건 조건 칩의 글 — 위 묶음까지 `회원가입 › /signup › terms` */
function 묶음글(머리: 묶음머리, 없음글: string): string {
  const { feature, screen, part } = 머리.조건;
  return [feature === '' ? 없음글 : feature, screen === undefined ? null : 화면글(머리, screen), part === undefined ? null : 파일이름(part)]
    .filter((x) => x !== null)
    .join(' › ');
}

function 같은묶음(걸린: 묶음조건 | null, 조건: 묶음자리): boolean {
  return 걸린 !== null && 걸린.feature === 조건.feature && 걸린.screen === 조건.screen && 걸린.part === 조건.part;
}

export function 묶음머리줄({
  머리,
  접힘,
  실패한,
  걸린,
  on접기,
  on이것만,
}: {
  머리: 묶음머리;
  접힘: boolean;
  /** 서비스 전체에서 마지막 결과가 실패인 케이스 */
  실패한: ReadonlySet<string>;
  /** 지금 건 묶음 조건 — 이 머리와 같으면 「이것만 보기」를 다시 두지 않는다 */
  걸린: 묶음조건 | null;
  on접기: () => void;
  on이것만: (조건: 묶음조건) => void;
}) {
  const t = use말();
  const 없음글 = t('기능 묶음 없음');
  const 이름 = 머리이름(머리, 없음글);
  // 화면 · 화면 조각은 위 묶음까지 붙인 이름 — 같은 화면이 두 기능 묶음 아래 설 수 있다
  const 긴이름 = 묶음글(머리, 없음글);
  const 실패수 = 머리.tcIds.filter((id) => 실패한.has(id)).length;
  return (
    <div className={`grp g${머리.단}`}>
      <button type="button" className="grp-toggle" aria-expanded={!접힘} onClick={on접기}>
        <span className="grp-caret" aria-hidden="true">
          ▸
        </span>
        <span className="grp-name">{이름}</span>
        {머리.단 === 1 ? null : <span className="grp-kind">{머리.단 === 2 ? t('화면') : t('화면 조각')}</span>}
        <span className="grp-count">
          {t('{건수}건', { 건수: 머리.tcIds.length })}
          {실패수 === 0 ? null : <> · <b>{t('실패 {건수}', { 건수: 실패수 })}</b></>}
          {머리.단 === 1 && 머리.값 === null ? <> · {t('PRD 에 연결되지 않은 케이스')}</> : null}
          {머리.이어짐 ? <> · {t('앞 쪽에서 이어짐')}</> : null}
        </span>
      </button>
      {같은묶음(걸린, 머리.조건) ? null : (
        // 이름에 묶음을 넣는다 — 「이것만 보기」가 줄마다 같은 글이라 화면 읽기로는 어느 묶음인지 모른다
        <button type="button" className="grp-only" aria-label={t('{이름}만 보기', { 이름: 긴이름 })} onClick={() => on이것만({ ...머리.조건, 이름: 긴이름 })}>
          {t('이것만 보기')}
        </button>
      )}
    </div>
  );
}

/**
 * 케이스명 아래 맥락 두 줄 — 요구 줄과 작은 줄.
 * 작은 줄은 덩어리마다 통째로 넘어간다. 가운뎃점으로 잇지 않는다 — 다음 줄이 점으로 시작했다 (진행판 WEB-F2-14)
 */
export function 케이스맥락({ row, 요구보나, 요구쓰나 }: { row: CaseRow; 요구보나: boolean; 요구쓰나: boolean }) {
  const t = use말();
  const reqs = row.reqs ?? [];
  const 첫 = reqs[0];
  const 더 = new Set(reqs.map((r) => r.reqId)).size - 1;
  // UI 목록은 전부 UI 라 종류를 안 적는다
  const 축들 = [...new Set(reqs.map((r) => r.axis))].filter((a): a is Exclude<케이스축, 'UI'> => a !== 'UI');
  return (
    <>
      {첫 === undefined ? (
        // PRD 를 안 쓰는 서비스는 줄마다 「없음」을 달지 않는다 — 줄 하나만 버린다
        요구쓰나 ? <span className="case-req none">{t('연결된 요구 없음')}</span> : null
      ) : (
        <span className="case-req">
          {첫.text === null || !요구보나 ? (
            <span className="case-req-id">{첫.reqId}</span>
          ) : (
            <a className="case-req-id" href={PRD항목주소(첫.reqId)} title={t('PRD 관리에서 보기')}>
              {첫.reqId}
            </a>
          )}
          <span className="case-req-text" title={첫.text ?? undefined}>
            {첫.text ?? t('PRD 에 없는 번호예요')}
          </span>
          {더 <= 0 ? null : <span className="case-req-more">{t('외 {건수}건', { 건수: 더 })}</span>}
        </span>
      )}
      <small className="case-meta">
        {축들.map((a) => (
          <span className="axis-tag" key={a}>
            {t(a)}
          </span>
        ))}
        {(row.screens ?? []).map((s) => (
          <span className="case-screen" key={s.file}>
            {s.url ?? 파일이름(s.file)}
          </span>
        ))}
        {row.techniques?.length ? (
          <span className="tech-line">
            {t('설계 기법')} <기법태그들 기법들={row.techniques} />
          </span>
        ) : null}
        <span>{t('지원 디바이스 {목록}', { 목록: row.platforms.map((p) => t(PLATFORM_LABEL[p])).join(', ') })}</span>
      </small>
    </>
  );
}

/** 걸린 묶음 · 요구 번호 — 도구 줄에 칩으로 보이고 ✕ 로 푼다 */
export function 걸린칩들({
  검색,
}: {
  검색: { 묶음: 묶음조건 | null; on묶음: (값: 묶음조건 | null) => void; 요구: string | null; 요구지우기: () => void };
}) {
  const t = use말();
  return (
    <>
      {검색.묶음 === null ? null : <걸린칩 글={검색.묶음.이름} on풀기={() => 검색.on묶음(null)} />}
      {검색.요구 === null ? null : <걸린칩 글={t('요구 {번호}', { 번호: 검색.요구 })} on풀기={검색.요구지우기} />}
    </>
  );
}

function 걸린칩({ 글, on풀기 }: { 글: string; on풀기: () => void }) {
  const t = use말();
  return (
    <span className="filter-on">
      {글}
      <button type="button" aria-label={t('{조건} 조건 풀기', { 조건: 글 })} onClick={on풀기}>
        ✕
      </button>
    </span>
  );
}
