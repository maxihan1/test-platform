// 케이스 목록 화면이 그리는 조각 셋 — 케이스 한 줄 · 빈 목록 안내 · 스캔 결과 줄 (SPEC §8.1)
// 고르는 칸이 붙으면서 CaseList 가 300줄을 넘었다. 판단은 CaseList 에 두고 그리는 쪽만 여기로 옮겼다

import type { CaseRow, LastScan } from './api.js';
import { keyOf, type LastMap, 마지막판정, 빈이유 } from './catalogView.js';
import { PLATFORM_LABEL, seconds, STATUS_COLOR, Verdict, when } from './ui.js';

export function 케이스줄({
  row,
  마지막,
  고름,
  뒤집기,
}: {
  row: CaseRow;
  마지막: LastMap;
  고름: boolean;
  뒤집기: (tcId: string) => void;
}) {
  return (
    <div className="row pickable">
      <div className="gutter" style={{ background: STATUS_COLOR[마지막판정(row, 마지막)] }} />
      {/* 고르는 칸은 왼쪽 거터 칸 안이다. 줄 내용 쪽 첫 요소로 두면 620px 미만에서
          줄이 2단으로 접힐 때 케이스명 위에 체크박스만 홀로 한 줄이 된다 (SPEC §8.1) */}
      <div className="pick">
        <input
          type="checkbox"
          checked={고름}
          aria-label={`${row.tcId} 고르기`}
          onChange={() => 뒤집기(row.tcId)}
        />
      </div>
      <div className="tcid">{row.tcId}</div>
      <div className="title">
        {row.name}
        <small>지원 디바이스 {row.platforms.map((p) => PLATFORM_LABEL[p]).join(', ')}</small>
      </div>
      <div className="right">
        <div className="devices">
          {row.platforms.map((platform) => {
            const result = 마지막[keyOf(row.tcId, platform)];
            return (
              <div className="device" key={platform}>
                <span className="device-name">{PLATFORM_LABEL[platform]}</span>
                {result === undefined ? (
                  <span className="device-none">기록 없음</span>
                ) : (
                  <a
                    href={`#/runs/${result.runId}/items/${result.historyId}`}
                    title={`${when(result.finishedAt)} · ${seconds(result.durationMs)}`}
                  >
                    <Verdict status={result.status} />
                  </a>
                )}
              </div>
            );
          })}
        </div>
        <a className="btn small" href={`#/cases/${encodeURIComponent(row.tcId)}/run`}>
          실행
        </a>
      </div>
    </div>
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
  onScan: () => void;
  onClear: () => void;
}) {
  const 것 = 빈이유(형편);
  // 검색에 안 걸린 것만 「지우기」다. 나머지 둘은 다시 훑는 길을 준다
  const 누르면 = 형편.건조건 ? onClear : onScan;

  return (
    <div className="empty">
      {것.무엇}
      <small>{것.왜}</small>
      <button className="btn" style={{ marginTop: '14px' }} onClick={누르면}>
        {것.버튼}
      </button>
    </div>
  );
}

export function ScanInfo({ scan, error }: { scan: LastScan | null; error: string | null }) {
  if (error !== null) return <span className="scan-error">{error}</span>;
  if (scan === null) return <span className="scan-text">아직 스캔 기록이 없습니다.</span>;

  return (
    <>
      <span className="scan-text">
        마지막 스캔 {when(scan.scannedAt)} · 추가 {scan.added} · 갱신 {scan.updated} · 비활성 {scan.deactivated}
      </span>
      {scan.duplicates.length === 0 ? null : (
        <span className="scan-error">
          {scan.duplicates.map((dup) => `${dup.tcId}이 ${dup.files[0]}와 ${dup.files[1]}에 겹쳐 있습니다.`).join('\n')}
        </span>
      )}
      {scan.error === undefined ? null : <span className="scan-error">{scan.error}</span>}
    </>
  );
}
