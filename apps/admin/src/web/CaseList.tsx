// 케이스 목록 화면 (SPEC §8.1). JSON 원문은 목록에 절대 노출하지 않는다
// '마지막 결과' 칸은 GET /api/runs/last-by-case 한 번으로 전부 채운다 — 케이스마다 이력을 따로 부르지 않는다 (SPEC §7.1)

import { useRef, useState } from 'react';

import {
  api,
  type CaseQuery,
  type CaseRow,
  type ItemStatus,
  type Paged,
  type Platform,
  type RunRequestItem,
  type ServiceRow,
} from './api.js';
import { Empty, ScanInfo, 결과라벨, 조건칩들, 찾기폼, 케이스줄 } from './CaseListParts.js';
import { keyOf, type LastMap, 마지막결과로거른다 } from './catalogView.js';
import { 다음이있나 } from './paging.js';
import { 담을것 } from './pickRun.js';
import { RunPickModal, type 실행요청 } from './RunPickModal.js';
import { 상한 } from './runPlan.js';
import { Failed, Loading, message, useAsync } from './ui.js';

/**
 * 실행 기록 목록이 이 제목으로 실행을 가리고(§8.7) 증적 문서 머리에도 박제된다(§8.3).
 *
 * 한 건이면 실행 설정 화면과 **같은 말**로 적는다 — 같은 일에 두 가지 제목이 생기지 않게.
 * 여러 건이면 맨 앞 케이스와 나머지 수로 적는다. 「3건 실행」처럼 수만 적으면
 * 목록에 같은 제목이 줄줄이 쌓여 무엇을 돌린 실행인지 가려낼 수 없다.
 */
function 실행제목(items: RunRequestItem[]): string {
  const 맨앞 = items[0]?.tcId ?? '';
  return items.length <= 1 ? `${맨앞} 실행` : `${맨앞} 외 ${String(items.length - 1)}건 실행`;
}

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
  // 고른 tcId (SPEC §8.1). 비어 있으면 「전체」다 — pickRun 의 담을것 이 그 규칙을 안다
  const [고른, set고른] = useState<ReadonlySet<string>>(new Set());
  const [모으는중, set모으는중] = useState(false);
  // 모은 결과. null 이면 모달이 닫힌 것이다 — 닫으면 모은 것을 버린다 (SPEC §8.10)
  const [담은것, set담은것] = useState<CaseRow[] | null>(null);
  // 대상 서버 목록은 배정 응답에만 실려 온다. 이 화면은 접두사만 받으므로 걸기 직전에 한 번 읽는다
  const [서비스, set서비스] = useState<ServiceRow | null>(null);
  // 두 번 눌러도 실행이 둘 생기지 않게 막는다. 모달은 onRun 을 기다리지 않는다
  const 거는중 = useRef(false);

  const 조건: CaseQuery = {
    service,
    q,
    page,
    ...(디바이스 === 'ALL' ? {} : { platform: 디바이스 }),
    ...(활성만 ? {} : { active: false }),
  };
  const cases = useAsync<Paged<CaseRow>>(() => api.cases(조건), [service, q, page, 디바이스, 활성만]);
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

  /**
   * 「전체」는 보이는 쪽이 아니라 모든 쪽이다 (SPEC §8.1).
   *
   * 서버가 한 쪽씩만 주므로 손에 든 쪽만 담으면 뒤쪽 케이스가 조용히 빠진다.
   * 몇 쪽인지는 총건수로 계산하지 않고 응답이 준 값으로 판단한다 (paging.ts).
   * 마지막 결과 표는 쪽이 없으므로 **다 모은 뒤에** 걸러야 뒤쪽 것이 안 빠진다.
   */
  async function 모으기() {
    set모으는중(true);
    setNotice(null);
    try {
      const 모은: CaseRow[] = [];
      for (let 쪽 = 1; ; 쪽 += 1) {
        const 한쪽 = await api.cases({ ...조건, page: 쪽 });
        모은.push(...한쪽.items);
        // 응답이 거짓말을 해도 쪽이 무한히 늘지 않게 막는다. 상한을 넘으면 어차피 실행이 거절된다
        if (!다음이있나(한쪽) || 모은.length >= 상한) break;
      }
      const 담을 = 담을것(모은, 고른, 결과, lastMap);
      if (담을.length === 0) {
        // 빈 모달을 열지 않는다. 열어 봐야 실행이 서버에서 400 으로 되돌아온다
        setNotice('실행할 케이스가 없습니다. 고른 것이 전부 비활성이거나 걸러졌습니다');
        return;
      }
      const { user } = await api.me();
      set서비스(user.services.find((it) => it.prefix === service) ?? null);
      set담은것(담을);
    } catch (err) {
      setNotice(message(err));
    } finally {
      set모으는중(false);
    }
  }

  /**
   * 모달이 「실행하기」를 누른 뒤 (SPEC §8.10 → §8.2).
   *
   * **칸별 사유를 모달에 되돌리지 못한다.** `POST /api/runs` 는 입력값을 명세로 검증하지 않아
   * `violations` 를 아예 내지 않는다 — 어느 케이스의 어느 칸인지를 서버가 말해 주지 않는다.
   * 그래서 지어내지 않고 서버가 준 사유를 그대로 화면 줄에 적고 모달은 열어 둔다.
   */
  async function 실행걸기(요청: 실행요청) {
    if (거는중.current) return;
    거는중.current = true;
    setNotice(null);
    try {
      const { runId } = await api.createRun({ ...요청, title: 실행제목(요청.items) });
      set담은것(null);
      window.location.hash = `#/runs/${runId}`;
    } catch (err) {
      setNotice(message(err));
    } finally {
      거는중.current = false;
    }
  }

  function 고르기뒤집기(tcId: string) {
    set고른((전) => {
      const 다음 = new Set(전);
      if (!다음.delete(tcId)) 다음.add(tcId);
      return 다음;
    });
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
        {/* 둘을 한 칸에 묶는다. 띠가 space-between 이라 풀어 두면 두 버튼이 양끝으로 갈라진다 */}
        <div className="bar-acts">
          <button className="btn ghost" onClick={() => void rescan()} disabled={scanning}>
            {scanning ? '스캔하는 중' : '다시 스캔하기'}
          </button>
          {/* 버튼은 하나이고 글자만 바뀐다. 둘로 나누면 같은 자리에서 같은 일을 하는 버튼이 둘이 된다 (SPEC §8.1) */}
          <button className="btn" onClick={() => void 모으기()} disabled={모으는중}>
            {고른.size === 0 ? '전체 실행하기' : `고른 ${고른.size}건 실행하기`}
          </button>
        </div>
      </div>

      <div className="scan">
        {/* 비활성 이유는 말풍선이 아니라 화면 줄이다 — 휴대폰에는 올릴 마우스가 없다 (DESIGN.md) */}
        {!모으는중 ? null : (
          <span className="scan-text" role="status">
            케이스 목록을 모으는 중입니다. 다 모을 때까지 버튼을 누를 수 없습니다
          </span>
        )}
        <ScanInfo scan={scan.data} error={notice ?? scan.error} />
      </div>

      <찾기폼
        typed={typed}
        건조건={건조건}
        onTyped={setTyped}
        onSearch={() => search(typed)}
        onClear={조건지우기}
      />

      {/* 조건을 바꾸면 늘 첫 페이지로 돌아간다. 3쪽에서 조건을 좁히면 빈 목록이 뜬다 */}
      <조건칩들
        디바이스={디바이스}
        활성만={활성만}
        결과={결과}
        on디바이스={(값) => {
          set디바이스(값);
          setPage(1);
        }}
        on활성만={(값) => {
          set활성만(값);
          setPage(1);
        }}
        on결과={(값) => {
          set결과(값);
          setPage(1);
        }}
      />

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
          <케이스줄
            key={row.tcId}
            row={row}
            마지막={lastMap}
            고름={고른.has(row.tcId)}
            뒤집기={고르기뒤집기}
          />
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

      {담은것 === null ? null : (
        <RunPickModal
          케이스들={담은것}
          service={서비스}
          onClose={() => set담은것(null)}
          onRun={(요청) => void 실행걸기(요청)}
        />
      )}
    </div>
  );
}
