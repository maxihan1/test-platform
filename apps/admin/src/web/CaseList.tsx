// 케이스 목록 화면 (SPEC §8.1). JSON 원문은 목록에 절대 노출하지 않는다
// '마지막 결과' 칸은 GET /api/runs/last-by-case 한 번으로 전부 채운다 — 케이스마다 이력을 따로 부르지 않는다 (SPEC §7.1)

import { useState } from 'react';

import { api, type CaseRow, type ItemStatus, type LastResult, type Paged, type Platform } from './api.js';
import { Failed, Loading, message, PLATFORM_LABEL, seconds, STATUS_COLOR, useAsync, Verdict, when } from './ui.js';

type LastMap = Record<string, LastResult>;

const keyOf = (tcId: string, platform: Platform) => `${tcId}:${platform}`;

// 환경이 둘인 케이스에서 한쪽만 깨졌을 때도 행이 실패로 보여야 한다
function worst(row: CaseRow, last: LastMap): ItemStatus {
  const found = row.platforms.map((platform) => last[keyOf(row.tcId, platform)]?.status);
  if (found.includes('FAIL')) return 'FAIL';
  if (found.every((status) => status === 'PASS')) return 'PASS';
  return 'NA';
}

export function CaseList({ service }: { service: string }) {
  const [typed, setTyped] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const cases = useAsync<Paged<CaseRow>>(() => api.cases({ service, q, page }), [service, q, page]);
  const scan = useAsync(() => api.lastScan(), []);
  const last = useAsync(() => api.lastByCase(), []);

  const lastMap: LastMap = {};
  for (const item of last.data?.items ?? []) lastMap[keyOf(item.tcId, item.platform)] = item;

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

  const totalPages = cases.data === null ? 1 : Math.max(1, Math.ceil(cases.data.total / cases.data.pageSize));

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
        {q === '' ? null : (
          <button
            className="chip"
            type="button"
            onClick={() => {
              setTyped('');
              search('');
            }}
          >
            검색 지우기
          </button>
        )}
      </form>

      {cases.error !== null ? (
        <Failed error={cases.error} />
      ) : cases.data === null ? (
        <Loading />
      ) : cases.data.items.length === 0 ? (
        <div className="empty">찾는 케이스가 없습니다.</div>
      ) : (
        cases.data.items.map((row) => (
          <div className="row" key={row.tcId}>
            <div className="gutter" style={{ background: STATUS_COLOR[worst(row, lastMap)] }} />
            <div className="tcid">{row.tcId}</div>
            <div className="title">
              {row.name}
              <small>지원 환경 {row.platforms.map((p) => PLATFORM_LABEL[p]).join(', ')}</small>
            </div>
            <div className="right">
              <div className="envs">
                {row.platforms.map((platform) => {
                  const result = lastMap[keyOf(row.tcId, platform)];
                  return (
                    <div className="env" key={platform}>
                      <span className="env-name">{PLATFORM_LABEL[platform]}</span>
                      {result === undefined ? (
                        <span className="env-none">기록 없음</span>
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

      {totalPages <= 1 ? null : (
        <div className="pager">
          <button onClick={() => setPage((n) => n - 1)} disabled={page <= 1}>
            이전
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage((n) => n + 1)} disabled={page >= totalPages}>
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
