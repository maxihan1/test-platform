// 케이스 목록 화면이 그리는 조각 셋 — 케이스 한 줄 · 빈 목록 안내 · 스캔 결과 줄 (SPEC §8.1)
// 고르는 칸이 붙으면서 CaseList 가 300줄을 넘었다. 판단은 CaseList 에 두고 그리는 쪽만 여기로 옮겼다

import type { CaseRow, ItemStatus, LastScan, Platform } from './api.js';
import { keyOf, type LastMap, 마지막판정, 빈이유 } from './catalogView.js';
import { PLATFORM_LABEL, seconds, STATUS_COLOR, Verdict, when } from './ui.js';

const 결과칩: (ItemStatus | 'ALL')[] = ['ALL', 'PASS', 'FAIL', 'NA'];
const 디바이스칩: (Platform | 'ALL')[] = ['ALL', 'desktop', 'mobile'];
// 빈 목록 안내도 같은 말을 쓴다. 두 벌을 두면 칩과 안내가 서로 다른 이름으로 같은 것을 부른다
export const 결과라벨: Record<ItemStatus | 'ALL', string> = {
  ALL: '전체',
  PASS: '통과',
  FAIL: '실패',
  NA: '미실행',
};

/** 이름·ID 로 찾는 칸. 「검색 지우기」는 거른 것이 있을 때만 나온다 (SPEC §8.1) */
export function 찾기폼({
  typed,
  건조건,
  onTyped,
  onSearch,
  onClear,
}: {
  typed: string;
  건조건: boolean;
  onTyped: (값: string) => void;
  onSearch: () => void;
  onClear: () => void;
}) {
  return (
    <form
      className="toolbar"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <input
        type="text"
        placeholder="케이스 이름이나 ID로 찾기"
        value={typed}
        onChange={(e) => onTyped(e.target.value)}
      />
      <button className="chip" type="submit">
        찾기
      </button>
      {!건조건 ? null : (
        <button className="chip" type="button" onClick={onClear}>
          검색 지우기
        </button>
      )}
    </form>
  );
}

/** 검색 조건 넷 (SPEC §8.1 표가 정본). 서비스는 조건이 아니라 맨 위 띠의 선택이다 */
export function 조건칩들({
  디바이스,
  활성만,
  결과,
  on디바이스,
  on활성만,
  on결과,
}: {
  디바이스: Platform | 'ALL';
  활성만: boolean;
  결과: ItemStatus | 'ALL';
  on디바이스: (값: Platform | 'ALL') => void;
  on활성만: (값: boolean) => void;
  on결과: (값: ItemStatus | 'ALL') => void;
}) {
  return (
    <div className="toolbar">
      <span className="filter-label">디바이스</span>
      {디바이스칩.map((값) => (
        <button className="chip" key={값} aria-pressed={디바이스 === 값} onClick={() => on디바이스(값)}>
          {값 === 'ALL' ? '전체' : PLATFORM_LABEL[값]}
        </button>
      ))}
      <span className="filter-label">표시</span>
      {/* 비활성 케이스는 기본으로 감춘다. 코드에서 사라진 케이스는 지우지 않고 남겨 두므로
          시간이 지날수록 목록이 과거로 채워진다 (SPEC §8.1) */}
      <button className="chip" aria-pressed={활성만} onClick={() => on활성만(true)}>
        활성만
      </button>
      <button className="chip" aria-pressed={!활성만} onClick={() => on활성만(false)}>
        전체
      </button>
      <span className="filter-label">마지막 결과</span>
      {결과칩.map((값) => (
        <button className="chip" key={값} aria-pressed={결과 === 값} onClick={() => on결과(값)}>
          {결과라벨[값]}
        </button>
      ))}
    </div>
  );
}

export function 케이스줄({
  row,
  마지막,
  고름,
  뒤집기,
}: {
  row: CaseRow;
  마지막: LastMap;
  고름: boolean;
  뒤집기: (row: CaseRow) => void;
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
          onChange={() => 뒤집기(row)}
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
