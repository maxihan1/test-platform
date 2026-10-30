// 케이스 목록 화면 (SPEC §8.1). JSON 원문은 목록에 절대 노출하지 않는다
// '마지막 결과' 칸과 줄의 판정 흐름 막대를 GET /api/runs/last-by-case 한 번으로 전부 채운다 (SPEC §7.1)
// 목록은 케이스마다 이력을 따로 부르지 않는다. 상세 칸만 예외이고 그것은 사람이 한 줄을 열었을 때다
// 줄의 이름을 누르면 오른쪽 서랍으로 상세 칸이 들어온다 — 값 고치기 · 저장 · 실행도 거기서 한다 (2026-10-19 ⑫ 시안 A · 2026-10-20 ⑬-2)
// 한 건(줄의 ▶) · 여러 건을 거는 흐름은 useRunPick 이 통째로 들고 있다 — 둘 다 같은 실행 창을 연다 (SPEC §8.10)

import { useRef, useState } from 'react';

import { api, type CasePage, type 앱종류 } from './api.js';
import { 고른것고치기 } from './CaseBulkEdit.js';
import { CaseDetail } from './CaseDetail.js';
import { 빈기억 } from './caseDetailView.js';
import { use엑셀받기 } from './CaseExport.js';
import { use검색조건 } from './CaseListFilter.js';
import { 걸린칩들, 묶음머리줄 } from './CaseListContext.js';
import { 결과탭들, 고른조건칩들, use필터조건들, 필터판 } from './CaseListFilterBar.js';
import { Empty, 목록부제 } from './CaseListNotes.js';
import { 쪽넘기기, 표머리 } from './CaseListHead.js';
import { 찾기폼, 케이스줄 } from './CaseListParts.js';
import { use묶음접기, 번호들, 줄과머리 } from './caseGroups.js';
import { Head } from './Head.js';
import { keyOf, type LastMap } from './catalogView.js';
import { use말, use언어 } from './i18n.js';
import type { 글자표 } from './pickRun.js';
import type { 판정 } from './role.js';
import { 다음이있나 } from './paging.js';
import { RunPickModal } from './RunPickModal.js';
import { Failed, Loading, message, useAsync } from './ui.js';
import { useRunPick } from './useRunPick.js';

// 결과보나 — 실행 칸이 none 이면 마지막 결과를 부르지 않는다. 부르면 서버가 403 을 낸다
// 요구보나 — 작성 칸이 none 이면 요구 번호가 「PRD 관리」 고리가 아니라 글자다. 요구 — 「PRD 관리」에서 넘어온 요구 번호 (§8.1 「맥락」)
export function CaseList({ service, 할수, 결과보나, 요구보나 = false, kind, 요구, 앱종류 }: { service: string; 할수: 판정; 결과보나: boolean; 요구보나?: boolean; kind: 'UI' | 'FN'; 요구?: string; 앱종류?: 앱종류 }) {
  const t = use말();
  const 언어 = use언어();
  const 검색 = use검색조건(service, kind, 요구, 앱종류);
  const { 조건, 결과, page } = 검색;
  const [본서비스, set본서비스] = useState(service);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // 상세 칸에서 고친 값. 실행 창도 같은 표를 쓴다 — 두 벌이면 두 자리가 다른 값을 보여준다 (SPEC §8.1)
  const [글자, set글자] = useState<글자표>({});
  // 상세 칸이 받아 온 이력 · 절차. 칸을 닫았다 열어도 다시 안 받는다 (도메인/카탈로그 §8.1)
  const 기억 = useRef(빈기억());
  // 고치기 요청 상자를 닫으면 그 상자를 연 버튼이 고른 것과 같이 사라진다 — 포커스는 주 행동으로 보낸다
  const 실행단추 = useRef<HTMLButtonElement>(null);

  const cases = useAsync<CasePage>(() => api.cases(조건), [service, 검색.q, page, 검색.디바이스, 검색.활성만, 결과, 검색.기법, 검색.축, 검색.스모크, 검색.서버, 검색.묶음, 검색.요구]);
  const scan = useAsync(() => api.lastScan(service), [service]);
  const 요구쓰나 = cases.data?.hasFeatures ?? false;
  const 접기 = use묶음접기(cases.data?.groups, 요구쓰나);
  const last = useAsync(() => (결과보나 ? api.lastByCase() : Promise.resolve({ items: [] })), [결과보나]);

  const lastMap: LastMap = {};
  for (const item of last.data?.items ?? []) lastMap[keyOf(item.tcId, item.platform)] = item;

  const 엑셀 = use엑셀받기(조건, cases.data?.total ?? null);
  const 필터조건들 = use필터조건들(검색, { kind, 앱있음: cases.data?.hasApp ?? false, 앱종류, 서버목록: cases.data?.apiServers ?? [] });
  const 뽑기 = useRunPick({ service, 조건, 알림: setNotice });

  // 서비스를 바꾸면 첫 페이지로 돌아간다. 3페이지에서 케이스가 적은 서비스로 옮기면
  // 빈 목록에 '3 / 1' 이 뜨고 사람은 목록이 비었다고 생각한다
  // 실행 read 가 없으면 서버가 last 를 무시하고 칩도 안 그린다 — 주소에 남은 조건이 보이지 않는 거르기로 남지 않게 푼다
  if (!결과보나 && 결과 !== 'ALL') 검색.on결과('ALL');

  if (본서비스 !== service) {
    set본서비스(service);
    검색.찾기비우기();
    // 고른 것도 같이 버린다. 남기면 다른 서비스에서 「고른 2건」이라 말한다
    뽑기.비우기();
    // 고친 값도 버린다. 칸 이름이 같으면(env·userId) 남의 서비스 케이스에 그대로 붙는다
    set글자({});
    기억.current = 빈기억();
    접기.비우기();
  }

  // 마지막 결과도 서버가 거른다 — 받은 것이 곧 보일 것이다 (도메인/카탈로그 §7 `?last=`)
  const 보일것 = cases.data?.items ?? [];
  const 칸들 = 줄과머리(보일것, cases.data?.groups, 번호들(보일것), 요구쓰나);
  // 연 케이스가 이 쪽에 없으면(쪽을 넘겼다 · 조건 밖) 칸을 안 그린다. 주소는 남겨 돌아오면 다시 열린다
  const 연줄 = 보일것.find((row) => row.tcId === 검색.열린);
  // 머리 건수는 쪽 밖까지 세므로 실패도 서비스 전체 마지막 결과에서 센다 — 디바이스 한쪽만 깨져도 실패(마지막판정과 같다)
  const 실패한 = new Set((last.data?.items ?? []).filter((x) => x.status === 'FAIL').map((x) => x.tcId));

  async function rescan() {
    setScanning(true);
    setNotice(null);
    try {
      await api.rescan(service);
      scan.reload();
      cases.reload();
    } catch (err) {
      setNotice(message(err, 언어));
    } finally {
      setScanning(false);
    }
  }

  /** 한 칸을 고쳤다. 그 케이스 칸만 새로 만들고 나머지는 그대로 둔다 */
  function 값고침(tcId: string, 어디: 'params' | 'expected', key: string, value: string) {
    set글자((전) => {
      const 이것 = 전[tcId] ?? { params: {}, expected: {} };
      return { ...전, [tcId]: { ...이것, [어디]: { ...이것[어디], [key]: value } } };
    });
  }

  // 같은 줄을 다시 누르면 닫는다. 닫으면 누른 이름으로 포커스가 돌아온다 (DESIGN.md 포커스 규칙)
  function 열기(tcId: string) {
    검색.set열린((전) => (전 === tcId ? null : tcId));
  }
  function 닫기() {
    const tcId = 검색.열린;
    검색.set열린(null);
    if (tcId !== null) document.getElementById(`case-open-${tcId}`)?.focus();
  }

  // 총건수로 페이지 수를 계산하지 않는다. 그 값은 안내로만 쓴다 (SPEC §8.1)
  const 더있나 = cases.data !== null && 다음이있나(cases.data);

  return (
    <>
      {/* 제목과 주 행동은 본문 면 **바깥**에 선다. 안에 넣으면 머리와 본문이 다시 붙는다 (SPEC §8) */}
      {/* 화면 제목은 메뉴 이름이다 — 「테스트 스크립트 › 기능 테스트」로 누른 하위 메뉴까지 보인다 (2026-10-19 · 10-20 사용자) */}
      {/* 스캔 결과 · 미확정 요약 · 모으는 중이 머리 부제에 선다 (CaseListNotes.tsx) */}
      <Head
        위치={t('테스트 스크립트')}
        제목={kind === 'UI' ? t('UI 테스트') : t('기능 테스트')}
        부제={
          <목록부제
            전체={cases.data?.total ?? null}
            미확정={cases.data?.unconfirmed}
            scan={scan.data}
            error={notice ?? scan.error}
            모으는중={뽑기.모으는중}
          />
        }
        행동={
          <>
            {!할수('다시스캔') ? null : (
              <button className="btn ghost" onClick={() => void rescan()} disabled={scanning}>
                {scanning ? t('스캔하는 중') : t('다시 스캔')}
              </button>
            )}
            {엑셀.버튼}
            {/* 고른 것으로 삭제 · 확정 요청 — 작성 쓰기일 때만 (도메인/카탈로그 §8.1 「여러 건 골라」) */}
            {!할수('작성요청') ? null : (
              <고른것고치기 service={service} 고른={뽑기.고른} 다되면={() => { 뽑기.비우기(); 실행단추.current?.focus(); }} />
            )}
            {!접기.묶음있나 ? null : (
              <button className="btn ghost" onClick={접기.모두}>
                {접기.다접었나 ? t('모두 펴기') : t('모두 접기')}
              </button>
            )}
            {/* 버튼은 하나이고 글자만 바뀐다. 둘로 나누면 같은 자리에서 같은 일을 하는 버튼이 둘이 된다 (SPEC §8.1) */}
            {!할수('실행') ? null : (
              <button className="btn" ref={실행단추} onClick={() => void 뽑기.모으기()} disabled={뽑기.모으는중}>
                {/* 「전체」가 아니라 조건에 맞는 것만 건다 — 이름이 그렇게 말해야 한다(점검 7.8) */}
                {뽑기.고른.size === 0 ? t('조건에 맞는 {건수}건 실행', { 건수: cases.data?.total ?? 0 }) : t('선택한 {건수}건 실행', { 건수: 뽑기.고른.size })}
              </button>
            )}
          </>
        }
      />

      {/* 상세 칸은 목록 위에 겹치는 서랍이라(⑬-2) 목록은 늘 전체 폭을 쓴다 */}
      <div className="cases-split">
      <div className="screen list-screen">
      {/* 표 위는 한 줄이다 — 결과 탭 · 고른 조건 칩 · 찾기 · 필터 단추. 조건은 필터 판에 접는다 (도메인/카탈로그 §8.1 「검색 조건」 · 2026-10-30 WEB-F7-07) */}
      <div className="toolbar">
        <결과탭들 결과={결과} 건수={cases.data?.lastCounts} on결과={검색.on결과} />
        <고른조건칩들 조건들={필터조건들} />
        <걸린칩들 검색={검색} />
        <찾기폼 typed={검색.typed} 건조건={검색.건조건} onTyped={검색.setTyped} onSearch={() => 검색.search(검색.typed)} onClear={검색.조건지우기} />
        <필터판 조건들={필터조건들} 건수={cases.data?.total ?? null} />
      </div>
      {엑셀.알림}

      {/* `case-rows` — 목록 폭이 좁으면 줄을 쌓는 규칙(styles.css)을 이 상자에만 건다. 실행 기록 · 작성 목록은 그대로다 */}
      <div className="rows-scroll case-rows">
      {cases.error !== null ? (
        <Failed error={cases.error} />
      ) : cases.data === null ? (
        <Loading />
      ) : 보일것.length === 0 ? (
        <Empty
          형편={{
            scannedAt: scan.data?.scannedAt ?? null,
            스캔문제: scan.data?.error !== undefined || (scan.data?.duplicates.length ?? 0) > 0,
            전체건수: cases.data.total,
            건조건: 검색.건조건,
            친글자: 검색.q,
          }}
          onScan={할수('다시스캔') ? () => void rescan() : undefined}
          onClear={검색.조건지우기}
          앱종류={앱종류} 작성보나={요구보나}
        />
      ) : (
        <>
        <표머리
          고름상태={
            보일것.every((row) => 뽑기.고른.has(row.tcId)) ? 'all' : 보일것.some((row) => 뽑기.고른.has(row.tcId)) ? 'some' : 'none'
          }
          on모두고르기={() => 뽑기.모두뒤집기(보일것)}
        />
        {칸들.map((칸) => {
          if (칸.위.some((k) => 접기.접은.has(k))) return null; // 위 묶음이 접혀 있으면 머리도 줄도 그리지 않는다
          if (!('row' in 칸)) {
            return (
              <묶음머리줄
                key={칸.머리.열쇠}
                머리={칸.머리}
                접힘={접기.접은.has(칸.머리.열쇠)}
                실패한={실패한}
                걸린={검색.묶음}
                on접기={() => 접기.뒤집기(칸.머리.열쇠)}
                on이것만={검색.on묶음}
              />
            );
          }
          const row = 칸.row;
          return (
          <케이스줄
            key={row.tcId}
            row={row}
            요구보나={요구보나}
            요구쓰나={요구쓰나}
            마지막={lastMap}
            고름={뽑기.고른.has(row.tcId)}
            뒤집기={뽑기.뒤집기}
            열림={연줄?.tcId === row.tcId}
            on실행={할수('실행') ? (row) => void 뽑기.하나열기(row) : undefined}
            on열기={열기}
            on스모크={할수('스모크고치기') ? cases.reload : undefined}
          />
          );
        })}
        </>
      )}
      </div>

      {page === 1 && !더있나 ? null : <쪽넘기기 page={page} 더있나={더있나} 받은={cases.data} setPage={검색.setPage} />}

      {뽑기.담은것 === null ? null : (
        <RunPickModal
          케이스들={뽑기.담은것}
          초기글자={글자}
          service={뽑기.서비스}
          user={뽑기.사람}
          사유={뽑기.사유}
          안내={뽑기.안내}
          거는중={뽑기.거는중}
          onClose={뽑기.닫기}
          on값고침={뽑기.사유지우기}
          on다시읽기={(tcId) => { void 뽑기.다시읽기(tcId); cases.reload(); }}
          onRun={(요청) => void 뽑기.실행걸기(요청)}
        />
      )}
      </div>

      {/* key — 다른 케이스를 열면 고른 디바이스 같은 칸 안 상태를 새로 시작한다 */}
      {연줄 === undefined ? null : (
        <CaseDetail
          key={연줄.tcId}
          row={연줄}
          마지막={lastMap}
          기억={기억.current}
          글자={글자[연줄.tcId]}
          고칠서비스={할수('작성요청') ? service : undefined}
          요구보나={요구보나}
          저장된다={할수('입력값저장')}
          on실행={할수('실행') ? (row) => void 뽑기.하나열기(row) : undefined}
          onClose={닫기}
          on값={(어디, key, value) => 값고침(연줄.tcId, 어디, key, value)}
          on저장됨={async () => {
            // 저장값이 곧 칸의 새 시작값이다. 다시 읽기가 도착한 뒤에 비운다 — 먼저 비우면 도착 전까지 옛 값으로 돌아가 보인다
            const tcId = 연줄.tcId;
            if (await cases.reload()) set글자((전) => ({ ...전, [tcId]: { params: {}, expected: {} } }));
          }}
        />
      )}
      </div>
    </>
  );
}
