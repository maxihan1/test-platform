// 작성이 끝나 PR 이 선 요청의 「다음 단계」 — 만든 케이스 확인 → 다른 곳 → 입력 → 중복 → 반영 → 계정 → 폐기를 한 줄로 (DESIGN.md 「작성 상태」 시안 A · 점검 12.12 · 12.15)
// 입력 · 중복 표를 그 단계 안에 편다 — 표가 맨 아래, 반영 단추가 맨 위에 있어 값을 다 넣고 다시 올라가야 했다

import { useState } from 'react';

import { 계정미등록종류 } from '../prd/heldText.js';
import { 계정없음일 } from './AuthoringAccountHold.js';
import { api, type AuthoringAsset, type AuthoringCoverage, type AuthoringMadeCase, type AuthoringRow } from './api.js';
import { AuthoringConflicts } from './AuthoringConflicts.js';
import { AuthoringHeld, 보류진척 } from './AuthoringHeld.js';
import { 반영단계 } from './AuthoringMergeStep.js';
import { 남은요구이어작성, 일 } from './authoringTodoParts.js';
import { use말 } from './i18n.js';
import type { 판정 } from './role.js';
import { RunWindow } from './RunWindow.js';

/** 링크(#…)는 해시 라우터 주소를 덮는다 — 주소는 두고 그 자리로 내려가기만 한다 */
const 내려가기 = (id: string) => () => document.getElementById(id)?.scrollIntoView();

/** 셈에서 계정이 없어 제외한 요구 수 — 셈이 없거나 원장이 없으면 0 */
export function 계정없음수(셈: AuthoringCoverage | null): number {
  return 셈 === null || 'none' in 셈 ? 0 : (셈.excluded[계정미등록종류] ?? 0);
}

interface Props {
  service: string;
  요청: AuthoringRow;
  할수: 판정;
  차이수: number;
  커버리지: AuthoringCoverage | null;
  보내는중: boolean;
  새줄로: (만든다: () => Promise<{ id: number }>) => void;
  폐기버튼: React.ReactNode;
  reload: () => void;
}

export function 작성끝단계({ service, 요청, 할수, 차이수, 커버리지, 보내는중, 새줄로, 폐기버튼, reload }: Props) {
  const t = use말();
  const held = 요청.held ?? [];
  const conflicts = 요청.conflicts ?? [];
  const 만든것 = 요청.cases ?? null;
  const 표시사본 = (요청.assets ?? []).filter((a: AuthoringAsset) => a.role === 'MARKED');
  const 계정 = 계정없음수(커버리지);
  let 번호 = 0;
  const 다음 = () => String(++번호);

  if (요청.prUrl === null) {
    return (
      <>
        <p>{t('올라간 PR 이 없습니다. 아래 만든 것을 확인하세요.')}</p>
        {폐기버튼 === null ? null : <div className="btns">{폐기버튼}</div>}
      </>
    );
  }
  return (
    <ol>
      {만든것 === null ? (
        <일 표={다음()} 제목={t('만든 테스트 코드 검토')} 설명={t('초안 PR로 올라갔습니다. 읽어 보고 이상하면 PR에 댓글을 남기세요.')}>
          <a className="btn ghost" href={요청.prUrl} target="_blank" rel="noreferrer">
            {t('만든 테스트 코드 보기 (PR)')}
          </a>
        </일>
      ) : (
        <일
          표={다음()}
          제목={t('만든 케이스 {수}건 확인', { 수: 만든것.length })}
          설명={t('아래 표에서 이름 · 확인 내용 · 요구사항을 봅니다. 코드는 PR 에서 봅니다.')}
        >
          <div className="btns">
            <button className="btn ghost" type="button" onClick={내려가기('made-cases')}>
              {t('만든 케이스 보기')}
            </button>
            <a className="btn ghost" href={요청.prUrl} target="_blank" rel="noreferrer">
              {t('PR 열기')}
            </a>
          </div>
        </일>
      )}
      {차이수 === 0 ? null : (
        <일
          표={다음()}
          제목={t('기획서와 다른 곳 {수}건 확인', { 수: 차이수 })}
          설명={t('화면에서 본 값으로 만든 케이스라 미확정 표시가 붙었습니다. PRD 관리에서 어느 쪽이 맞는지 정하세요.')}
        >
          <div className="btns">
            <button className="btn ghost" type="button" onClick={내려가기('diffs')}>
              {t('다른 곳 보기')}
            </button>
            <a className="btn ghost" href="#/prd">
              {t('PRD 관리로 가기')}
            </a>
            {표시사본.map((a) => (
              <a key={a.id} className="btn ghost" href={api.authoringAssetUrl(요청.id, a.id)} download>
                {t('표시한 기획서 내려받기')}
              </a>
            ))}
          </div>
        </일>
      )}
      {held.length === 0 ? null : (
        <보류진척 표={다음()} held={held}>
          <AuthoringHeld service={service} 요청번호={요청.id} held={held} 편집={할수('작성요청')} reload={reload} />
        </보류진척>
      )}
      {/* 겹침은 반영이 겹침으로 실패한 뒤 그 반영의 원본(이 작성 실행)에 붙는다 */}
      {conflicts.length === 0 ? null : (
        <일
          표={다음()}
          제목={t('중복 케이스 {수}건 중 {고른}건 선택', { 수: conflicts.length, 고른: conflicts.length - (요청.conflictsOpen ?? 0) })}
          설명={t('두 케이스 비교를 눌러 내용을 보고 고릅니다.')}
        >
          <AuthoringConflicts service={service} 요청번호={요청.id} conflicts={conflicts} 새것={만든것} 편집={할수('작성요청')} reload={reload} />
        </일>
      )}
      <반영단계 service={service} 요청={요청} 표={다음()} 반영권한={할수('작성머지')} 보내는중={보내는중} 새줄로={새줄로} 커버리지={커버리지} />
      {계정 === 0 ? null : <계정없음일 service={service} 표={다음()} 수={계정} 운영자={할수('설정')} />}
      {/* 같은 기획서로 두 번 작성한 쪽이 「반영 대기」로 남지 않게 (PRD-F9-16) */}
      {폐기버튼 === null ? null : (
        <일 표={다음()} 제목={t('폐기')} 설명={t('반영하지 않을 테스트면 폐기합니다. 올라간 PR 은 폐기한 뒤 GitHub 에서 닫습니다.')}>
          <div className="btns">{폐기버튼}</div>
        </일>
      )}
    </ol>
  );
}

/**
 * 반영이 끝난 요청 — 넣은 케이스로 바로 이어 간다 (점검 12.3). 실행 하나에 한 종류만 담겨 기능 · UI 를 따로 건다(서버 runKind).
 * 남은 요구로 이어 작성은 누를 수 있을 때만 — 못 누르는 줄을 「할 수 없습니다」로 남기면 할 일처럼 읽힌다 (점검 N17)
 */
export function 반영끝({
  service,
  운영자,
  요청,
  만든것,
  셈,
  권한,
  보내는중,
  새번호로,
}: {
  service: string;
  운영자: boolean;
  요청: AuthoringRow;
  만든것: AuthoringMadeCase[] | null;
  셈: AuthoringCoverage | null;
  권한: boolean;
  보내는중: boolean;
  새번호로: (뿌리: number) => void;
}) {
  const t = use말();
  const [돌릴것, set돌릴것] = useState<string[] | null>(null);
  const 갈래들 = (['FN', 'UI'] as const)
    .map((k) => ({ k, 번호들: (만든것 ?? []).filter((c) => (k === 'UI') === /-UI-\d{3}$/.test(c.tcId)).map((c) => c.tcId) }))
    .filter((g) => g.번호들.length > 0);
  // 이 칸을 모르는 옛 응답에는 안 그린다
  const 이어작성 = 요청.canContinue !== undefined && (요청.canContinue || typeof 요청.continuedBy === 'number');
  const 계정 = 계정없음수(셈);
  return (
    <>
      <p>
        {만든것 === null
          ? t('테스트가 반영됐습니다. 케이스 목록에서 새 케이스를 볼 수 있습니다.')
          : t('테스트 {수}건을 케이스 목록에 넣었습니다.', { 수: 만든것.length })}
      </p>
      <div className="btns">
        {갈래들.map((g) => (
          <button key={g.k} className="btn" type="button" onClick={() => set돌릴것(g.번호들)}>
            {g.k === 'UI' ? t('UI 테스트 {수}건 바로 실행', { 수: g.번호들.length }) : t('기능 테스트 {수}건 바로 실행', { 수: g.번호들.length })}
          </button>
        ))}
        {만든것 === null ? (
          <a className="btn ghost" href="#/cases">
            {t('케이스 목록 열기')}
          </a>
        ) : (
          <button className="btn ghost" type="button" onClick={내려가기('made-cases')}>
            {t('만든 케이스 {수}건 보기', { 수: 만든것.length })}
          </button>
        )}
      </div>
      {!이어작성 && 계정 === 0 ? null : (
        <ol>
          {이어작성 ? <남은요구이어작성 요청={요청} 셈={셈} 권한={권한} 보내는중={보내는중} 새번호로={새번호로} /> : null}
          {계정 === 0 ? null : <계정없음일 service={service} 표={이어작성 ? 'B' : 'A'} 수={계정} 운영자={운영자} />}
        </ol>
      )}
      {돌릴것 === null ? null : <RunWindow tcIds={돌릴것} onClose={() => set돌릴것(null)} />}
    </>
  );
}
