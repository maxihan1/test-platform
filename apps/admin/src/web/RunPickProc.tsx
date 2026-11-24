// 실행 창이 테스트 프로시저를 보이는 조각 — 표 위 안내 한 줄 · 프로시저 헤더 줄 · 차례 번호와 「자동 포함」 꼬리표가 붙은 케이스 줄 (DESIGN.md 「실행 창」)
// RunPickModal 이 300줄 상한에 닿아 줄 그리기를 떼어 냈다

import type { 담은줄 } from './pickProc.js';
import { use말 } from './i18n.js';
import { PLATFORM_LABEL } from './ui.js';
import { 시험배지 } from './RunPickTrial.js';
import type { 디바이스칸 } from './useTrialQueue.js';

/** 표 위 안내 — 프로시저 케이스가 하나도 없으면 안 그린다. 자동 포함이 0건이면 그 조각을 뺀다 */
export function 프로시저안내({ 케이스들 }: { 케이스들: readonly 담은줄[] }) {
  const t = use말();
  if (!케이스들.some((c) => c.procId != null)) return null;
  const 자동수 = 케이스들.filter((c) => c.자동포함 === true).length;
  return (
    <div className="mnote proc-note">
      <b>{t('테스트 프로시저는 케이스 전체를 실행합니다')}</b>
      {' · '}
      {자동수 === 0
        ? t('결과는 케이스마다 남습니다')
        : t('선택 {선택}건 · 자동 포함 {자동}건 · 결과는 케이스마다 남습니다', { 선택: 케이스들.length - 자동수, 자동: 자동수 })}
    </div>
  );
}

/**
 * 케이스 줄 한 칸. `머리` 가 참이면 그 프로시저의 첫 줄이라 번호 · 이름 · 케이스 수 헤더가 위에 선다.
 * 자동 포함 줄은 번호 · 이름을 흐리게 두고 값은 서버가 저장값 → 코드 기본값으로 채워 창에서 고치지 않는다 — 입력 칸이 있는 줄의 입력값 열은 「저장값」이다
 */
export function 케이스줄({
  c,
  머리,
  시험줄,
  값수,
  칸있나,
  폈나,
  on접기,
}: {
  c: 담은줄;
  머리: boolean;
  시험줄: 디바이스칸[] | undefined;
  값수: number;
  /** 그 케이스에 입력 칸이 있나 — 자동 포함 줄은 칸을 펴지 않아 값수가 0 이지만 칸이 있으면 「저장값」, 없으면 「없음」이다 */
  칸있나: boolean;
  폈나: boolean;
  on접기: () => void;
}) {
  const t = use말();
  const 자동 = c.자동포함 === true;
  return (
    <>
      {!머리 ? null : (
        <div className="prow prow-proc">
          <span className="id">{c.procId}</span>
          <span className="nm">
            <span>
              <b>{c.procName}</b> <span className="proc-count">{t('케이스 {건수}건', { 건수: c.procCount ?? 0 })}</span>
            </span>
          </span>
        </div>
      )}
      <div className={자동 ? 'prow prow-with' : 'prow'}>
        <span className="id">
          {c.procSeq == null ? null : <span className="proc-seq">{c.procSeq}</span>}
          {c.tcId}
        </span>
        <span className="nm">
          <span>
            {c.name}
            {자동 ? <span className="case-tag">{t('자동 포함')}</span> : null}
          </span>
          <시험배지 칸들={시험줄} />
        </span>
        <span className="dev">
          {c.platforms.map((p) => <span className="tag" key={p}>{t(PLATFORM_LABEL[p])}</span>)}
        </span>
        {/* 입력값 열은 늘 같은 자리다 — 값이 없으면 그 사실을 글로 적는다. 빈 자리를 남기면 「안 불러왔나」로 읽힌다 */}
        {값수 === 0 ? (
          <span className="iv">{t(자동 && 칸있나 ? '저장값' : '없음')}</span>
        ) : (
          <button type="button" className="iv prow-fold" aria-expanded={폈나} onClick={on접기}>
            {폈나 ? t('접기 ▴') : t('{수}개 펼치기 ▾', { 수: 값수 })}
          </button>
        )}
      </div>
    </>
  );
}
