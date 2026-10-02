// 케이스 목록의 안내 글 — 머리 부제 · 스캔 결과 줄 · 빈 목록 안내 (SPEC §8.1 · 도메인/카탈로그 §8.1)
// 고치기 요청 버튼이 붙으면서 CaseList · CaseListParts 가 300줄을 넘어 떼었다. 판단은 CaseList · catalogView 에 둔다

import type { CasePage, LastScan } from './api.js';
import { 빈이유 } from './catalogView.js';
import { use말, use언어 } from './i18n.js';
import { when } from './ui.js';
import { 미확정나이 } from './unconfirmed.js';

/**
 * 머리 부제. 스캔 결과가 머리 부제로 올라왔다 (2026-09-22) — 목록 위에 따로 줄로 서면 49px 을 먹는데,
 * 그 화면은 표가 창을 채우는 것이 일이라 그만큼 표가 잘린다. **자리만 옮겼고 적히는 것은 그대로다** — 실패 사유도 여기 같이 뜬다
 */
export function 목록부제({
  종류,
  전체,
  미확정,
  scan,
  error,
  모으는중,
}: {
  /** 사이드바 하위 메뉴의 종류 — 맨 앞에 선다. 판정 색을 안 입힌다 (화면공통 §8 · PR #132) */
  종류: 'UI' | 'FN';
  /** 아직 못 받았으면 null */
  전체: number | null;
  미확정: CasePage['unconfirmed'];
  scan: LastScan | null;
  error: string | null;
  모으는중: boolean;
}) {
  const t = use말();
  const 일 = 미확정 === undefined || 미확정.oldestSince === null ? null : 미확정나이(미확정.oldestSince);

  return (
    <>
      {종류 === 'UI' ? t('UI 테스트') : t('기능 테스트')} · {전체 === null ? t('불러오는 중입니다') : t('모두 {건수}건', { 건수: 전체 })}
      {/* 답을 못 받은 미확정은 잊힌다 — 건수와 가장 오래된 것의 나이를 머리에 둔다. 없으면 안 쓴다 (도메인/카탈로그 §8.1) */}
      {미확정 === undefined || 미확정.count === 0 ? null : (
        <>
          {' · '}
          {일 === null
            ? t('미확정 {건수}건', { 건수: 미확정.count })
            : 일 === 0
              ? t('미확정 {건수}건 · 가장 오래된 것 오늘', { 건수: 미확정.count })
              : t('미확정 {건수}건 · 가장 오래된 것 {일}일째', { 건수: 미확정.count, 일 })}
        </>
      )}
      {' · '}
      <ScanInfo scan={scan} error={error} />
      {/* 비활성 이유는 말풍선이 아니라 화면 줄이다 — 휴대폰에는 올릴 마우스가 없다 (DESIGN.md) */}
      {!모으는중 ? null : (
        <span className="scan-text" role="status">
          {' · '}
          {t('케이스 목록을 모으는 중입니다. 다 모을 때까지 실행 버튼을 누를 수 없습니다')}
        </span>
      )}
    </>
  );
}

/**
 * 목록이 비었을 때 (SPEC §8.1).
 *
 * 하나로 뭉뚱그리면 **검색한 적 없는 사람에게도 「찾는 케이스가 없습니다」라고 말한다.**
 * 이 화면은 이 도구를 처음 켠 사람이 만나는 자리다.
 */
export function Empty({
  형편,
  onScan,
  onClear,
}: {
  형편: Parameters<typeof 빈이유>[0];
  onScan?: () => void;
  onClear: () => void;
}) {
  const 것 = 빈이유(형편, use언어());
  // 검색에 안 걸린 것만 「지우기」다. 나머지 둘은 다시 훑는 길을 준다 — 스캔 칸이 없으면 onScan 이 안 와 버튼도 없다 (화면공통 §8)
  const 누르면 = 형편.건조건 ? onClear : onScan;

  return (
    <div className="empty">
      {것.무엇}
      <small>{것.왜}</small>
      {누르면 === undefined ? null : (
        <button className="btn" style={{ marginTop: '14px' }} onClick={누르면}>{것.버튼}</button>
      )}
    </div>
  );
}

export function ScanInfo({ scan, error }: { scan: LastScan | null; error: string | null }) {
  const t = use말();
  const 언어 = use언어();

  // 서버가 준 사유 원문은 번역하지 않는다 — 어느 케이스가 왜 걸렸는지가 원문에 들어 있다
  if (error !== null) return <span className="scan-error">{error}</span>;
  if (scan === null) return <span className="scan-text">{t('아직 스캔 기록이 없습니다.')}</span>;

  return (
    <>
      <span className="scan-text">
        {t('마지막 스캔 {때} · 추가 {추가} · 갱신 {갱신} · 비활성 {비활성}', {
          때: when(scan.scannedAt, 언어),
          추가: scan.added,
          갱신: scan.updated,
          비활성: scan.deactivated,
        })}
      </span>
      {scan.duplicates.length === 0 ? null : (
        <span className="scan-error">
          {scan.duplicates
            .map((dup) =>
              t('{아이디} 중복 — {파일1}, {파일2}', {
                아이디: dup.tcId,
                파일1: dup.files[0],
                파일2: dup.files[1],
              }),
            )
            .join('\n')}
        </span>
      )}
      {scan.error === undefined ? null : <span className="scan-error">{scan.error}</span>}
    </>
  );
}
