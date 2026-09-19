// 케이스 목록 화면 (SPEC §8.1). JSON 원문은 목록에 절대 노출하지 않는다
// '마지막 결과' 칸은 GET /api/runs/last-by-case 한 번으로 전부 채운다 — 케이스마다 이력을 따로 부르지 않는다 (SPEC §7.1)

import { useState } from 'react';

import { api, type CaseRow, type ItemStatus, type Paged, type Platform } from './api.js';
import { keyOf, type LastMap, 마지막결과로거른다, 마지막판정, 빈이유 } from './catalogView.js';
import { 다음이있나 } from './paging.js';
import { Failed, Loading, message, PLATFORM_LABEL, seconds, STATUS_COLOR, useAsync, Verdict, when } from './ui.js';

const 결과칩: (ItemStatus | 'ALL')[] = ['ALL', 'PASS', 'FAIL', 'NA'];
const 디바이스칩: (Platform | 'ALL')[] = ['ALL', 'desktop', 'mobile'];
const 결과라벨: Record<ItemStatus | 'ALL', string> = {
  ALL: '전체',
  PASS: '통과',
  FAIL: '실패',
  NA: '미실행',
};

export function CaseList({ service }: { service: string }) {
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  // 서비스를 바꾸면 첫 페이지로 돌아간다. 3페이지에서 케이스가 적은 서비스로 옮기면
  // 빈 목록에 '3 / 1' 이 뜨고 사람은 목록이 비었다고 생각한다
  const [본서비스, set본서비스] = useState(service);
  if (본서비스 !== service) {
    set본서비스(service);
    setPage(1);
    setQ('');
    setTyped('');
  }
  // 검색 조건 넷 중 셋은 서버가 거른다 (SPEC §8.1 표)
  const [디바이스, set디바이스] = useState<Platform | 'ALL'>('ALL');
  const [활성만, set활성만] = useState(true);
  // 마지막 결과만 화면이 겹쳐 거른다 — 실행할 때마다 바뀌어 카탈로그가 알지 못한다
  const [결과, set결과] = useState<ItemStatus | 'ALL'>('ALL');
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const cases = useAsync<Paged<CaseRow>>(
    () =>
      api.cases({
        service,
        q,
        page,
        ...(디바이스 === 'ALL' ? {} : { platform: 디바이스 }),
        ...(활성만 ? {} : { active: false }),
      }),
    [service, q, page, 디바이스, 활성만],
  );
  const scan = useAsync(() => api.lastScan(), []);
  const last = useAsync(() => api.lastByCase(), []);

  const lastMap: LastMap = {};
  for (const item of last.data?.items ?? []) lastMap[keyOf(item.tcId, item.platform)] = item;

  const 보일것 = 마지막결과로거른다(cases.data?.items ?? [], lastMap, 결과);
  const 건조건 = q !== '' || 디바이스 !== 'ALL' || !활성만 || 결과 !== 'ALL';

  async function rescan() {
    setScanning(true);
    setNotice(null);
    try {
      await api.rescan();
      scan.reload();
      cases.reload();
    } catch (err) {
      setNotice(message(err));
    } finally {
      setScanning(false);
    }
  }

  function search(term: string) {
    setQ(term);
    setPage(1);
  }

  function 조건지우기() {
    setTyped('');
    setQ('');
    set디바이스('ALL');
    set활성만(true);
    set결과('ALL');
    setPage(1);
  }

  // 총건수로 페이지 수를 계산하지 않는다. 그 값은 안내로만 쓴다 (SPEC §8.1)
  const 더있나 = cases.data !== null && 다음이있나(cases.data);

  return (
    <div className="screen">
      <div className="bar">
        <div>
          <div className="runid">테스트 케이스</div>
          <div className="runmeta">
            {cases.data === null ? '불러오는 중입니다' : `모두 ${cases.data.total}건`}
          </div>
        </div>
        <button className="btn ghost" onClick={() => void rescan()} disabled={scanning}>
          {scanning ? '스캔하는 중' : '다시 스캔하기'}
        </button>
      </div>

      <div className="scan">
        <ScanInfo scan={scan.data} error={notice ?? scan.error} />
      </div>

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          search(typed);
        }}
      >
        <input
          type="text"
          placeholder="케이스 이름이나 ID로 찾기"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <button className="chip" type="submit">
          찾기
        </button>
        {!건조건 ? null : (
          <button className="chip" type="button" onClick={조건지우기}>
            검색 지우기
          </button>
        )}
      </form>

      {/* 검색 조건 넷 (SPEC §8.1 표가 정본). 서비스는 조건이 아니라 맨 위 띠의 선택이다 */}
      <div className="toolbar">
        <span className="filter-label">디바이스</span>
        {디바이스칩.map((값) => (
          <button
            className="chip"
            key={값}
            aria-pressed={디바이스 === 값}
            onClick={() => {
              set디바이스(값);
              setPage(1);
            }}
          >
            {값 === 'ALL' ? '전체' : PLATFORM_LABEL[값]}
          </button>
        ))}
        <span className="filter-label">표시</span>
        {/* 비활성 케이스는 기본으로 감춘다. 코드에서 사라진 케이스는 지우지 않고 남겨 두므로
            시간이 지날수록 목록이 과거로 채워진다 (SPEC §8.1) */}
        <button
          className="chip"
          aria-pressed={활성만}
          onClick={() => {
            set활성만(true);
            setPage(1);
          }}
        >
          활성만
        </button>
        <button
          className="chip"
          aria-pressed={!활성만}
          onClick={() => {
            set활성만(false);
            setPage(1);
          }}
        >
          전체
        </button>
        <span className="filter-label">마지막 결과</span>
        {결과칩.map((값) => (
          <button
            className="chip"
            key={값}
            aria-pressed={결과 === 값}
            onClick={() => {
              set결과(값);
              setPage(1);
            }}
          >
            {결과라벨[값]}
          </button>
        ))}
      </div>

      {cases.error !== null ? (
        <Failed error={cases.error} />
      ) : cases.data === null ? (
        <Loading />
      ) : 보일것.length === 0 && 결과 !== 'ALL' && cases.data.items.length > 0 ? (
        // 마지막 결과만 화면이 거른다. **서버가 나눠 준 이 쪽 안에서만** 걸러지므로
        // 「없다」고 단정하면 다음 쪽에 있는 것을 없다고 말하게 된다 (SPEC §8.1 이
        // 「케이스가 수백 건이 되면 서버 쪽으로 옮긴다」고 예고한 자리다)
        <div className="empty">
          이 쪽에는 {결과라벨[결과]}인 케이스가 없습니다
          <small>다음 쪽에 있을 수 있습니다. 나머지 조건은 서버가 전체에서 거릅니다</small>
        </div>
      ) : 보일것.length === 0 ? (
        <Empty
          형편={{
            scannedAt: scan.data?.scannedAt ?? null,
            전체건수: cases.data.total,
            건조건,
            친글자: q,
          }}
          onScan={() => void rescan()}
          onClear={조건지우기}
        />
      ) : (
        보일것.map((row) => (
          <div className="row" key={row.tcId}>
            <div className="gutter" style={{ background: STATUS_COLOR[마지막판정(row, lastMap)] }} />
            <div className="tcid">{row.tcId}</div>
            <div className="title">
              {row.name}
              <small>지원 디바이스 {row.platforms.map((p) => PLATFORM_LABEL[p]).join(', ')}</small>
            </div>
            <div className="right">
              <div className="devices">
                {row.platforms.map((platform) => {
                  const result = lastMap[keyOf(row.tcId, platform)];
                  return (
                    <div className="device" key={platform}>
                      <span className="device-name">{PLATFORM_LABEL[platform]}</span>
                      {result === undefined ? (
                        <span className="device-none">기록 없음</span>
                      ) : (
                        <a href={`#/runs/${result.runId}/items/${result.historyId}`} title={`${when(result.finishedAt)} · ${seconds(result.durationMs)}`}>
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
        ))
      )}

      {page === 1 && !더있나 ? null : (
        <div className="pager">
          <button onClick={() => setPage((n) => n - 1)} disabled={page <= 1}>
            이전
          </button>
          <span>{page}쪽</span>
          <button onClick={() => setPage((n) => n + 1)} disabled={!더있나}>
            다음
          </button>
        </div>
      )}
    </div>
  );
}

function ScanInfo({ scan, error }: { scan: Awaited<ReturnType<typeof api.lastScan>> | null; error: string | null }) {
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

/**
 * 목록이 비었을 때 (SPEC §8.1).
 *
 * 하나로 뭉뚱그리면 **검색한 적 없는 사람에게도 「찾는 케이스가 없습니다」라고 말한다.**
 * 이 화면은 이 도구를 처음 켠 사람이 만나는 자리다.
 */
function Empty({
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
