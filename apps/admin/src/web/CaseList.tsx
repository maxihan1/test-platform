// 케이스 목록 화면 (SPEC §8.1). JSON 원문은 목록에 절대 노출하지 않는다
// '마지막 결과' 칸과 줄의 판정 흐름 막대를 GET /api/runs/last-by-case 한 번으로 전부 채운다 (SPEC §7.1)
// 목록은 케이스마다 이력을 따로 부르지 않는다. 상세 펼침만 예외이고 그것은 사람이 한 줄을 폈을 때다
// 한 건(줄의 ▶) · 여러 건을 거는 흐름은 useRunPick 이 통째로 들고 있다 — 둘 다 같은 실행 창을 연다 (SPEC §8.10)

import { useRef, useState } from 'react';

import { api, type CasePage } from './api.js';
import { 고른것고치기 } from './CaseBulkEdit.js';
import { use엑셀받기 } from './CaseExport.js';
import { use검색조건 } from './CaseListFilter.js';
import { Empty, 목록부제 } from './CaseListNotes.js';
import { 표머리 } from './CaseListHead.js';
import { 결과라벨, 기법고르개, 조건칩들, 찾기폼, 케이스줄 } from './CaseListParts.js';
import { Head } from './Head.js';
import { keyOf, type LastMap, 마지막결과로거른다, 판정개수 } from './catalogView.js';
import { use말, use언어 } from './i18n.js';
import type { 글자표 } from './pickRun.js';
import type { 판정 } from './role.js';
import { 집계띠 } from './Summary.js';
import { 다음이있나 } from './paging.js';
import { RunPickModal } from './RunPickModal.js';
import { Failed, Loading, message, useAsync } from './ui.js';
import { useRunPick } from './useRunPick.js';

// 결과보나 — 실행 칸이 none 이면 마지막 결과를 부르지 않는다. 부르면 서버가 403 을 낸다
export function CaseList({ service, 할수, 결과보나, kind }: { service: string; 할수: 판정; 결과보나: boolean; kind: 'UI' | 'FN' }) {
  const t = use말();
  const 언어 = use언어();
  const 검색 = use검색조건(service, kind);
  const { 조건, 결과, page } = 검색;
  const [본서비스, set본서비스] = useState(service);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // 줄에서 고친 값. 모달도 같은 표를 쓴다 — 두 벌이면 두 자리가 다른 값을 보여준다 (SPEC §8.1)
  const [글자, set글자] = useState<글자표>({});
  // 상세를 편 줄. 한 번에 여럿 펼 수 있고, 부른 것은 그 조각이 들고 있는다
  const [편줄, set편줄] = useState<ReadonlySet<string>>(new Set());
  // 고치기 요청 상자를 닫으면 그 상자를 연 버튼이 고른 것과 같이 사라진다 — 포커스는 주 행동으로 보낸다
  const 실행단추 = useRef<HTMLButtonElement>(null);

  const cases = useAsync<CasePage>(() => api.cases(조건), [service, 검색.q, page, 검색.디바이스, 검색.활성만, 검색.기법]);
  const scan = useAsync(() => api.lastScan(), []);
  const last = useAsync(() => (결과보나 ? api.lastByCase() : Promise.resolve({ items: [] })), [결과보나]);

  const lastMap: LastMap = {};
  for (const item of last.data?.items ?? []) lastMap[keyOf(item.tcId, item.platform)] = item;

  const 엑셀 = use엑셀받기(조건, cases.data?.total ?? null);
  const 뽑기 = useRunPick({ service, 조건, 결과, 마지막: lastMap, 알림: setNotice });

  // 서비스를 바꾸면 첫 페이지로 돌아간다. 3페이지에서 케이스가 적은 서비스로 옮기면
  // 빈 목록에 '3 / 1' 이 뜨고 사람은 목록이 비었다고 생각한다
  if (본서비스 !== service) {
    set본서비스(service);
    검색.찾기비우기();
    // 고른 것도 같이 버린다. 남기면 다른 서비스에서 「고른 2건」이라 말한다
    뽑기.비우기();
    // 고친 값도 버린다. 칸 이름이 같으면(env·userId) 남의 서비스 케이스에 그대로 붙는다
    set글자({});
    set편줄(new Set());
  }

  const 보일것 = 마지막결과로거른다(cases.data?.items ?? [], lastMap, 결과);
  // 지금 보이는 것을 센다 — 칩을 걸면 숫자도 같이 좁혀져야 「보이는 것과 세는 것」이 갈리지 않는다
  const 셈 = 판정개수(보일것, lastMap);

  async function rescan() {
    setScanning(true);
    setNotice(null);
    try {
      await api.rescan();
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

  function 더보기(tcId: string) {
    set편줄((전) => {
      const 다음 = new Set(전);
      if (!다음.delete(tcId)) 다음.add(tcId);
      return 다음;
    });
  }

  // 총건수로 페이지 수를 계산하지 않는다. 그 값은 안내로만 쓴다 (SPEC §8.1)
  const 더있나 = cases.data !== null && 다음이있나(cases.data);

  return (
    <>
      {/* 제목과 주 행동은 본문 면 **바깥**에 선다. 안에 넣으면 머리와 본문이 다시 붙는다 (SPEC §8) */}
      {/* 자리 이름은 **무엇을 다루는 곳인가**(`테스트 스크립트`), 화면 제목은
          **지금 보는 것이 무엇인가**(`테스트 스크립트 목록`)를 말한다 (SPEC §8) */}
      {/* 스캔 결과 · 미확정 요약 · 모으는 중이 머리 부제에 선다 (CaseListNotes.tsx) */}
      <Head
        제목={t('테스트 스크립트 목록')}
        부제={
          <목록부제
            종류={kind}
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
            {/* 고른 것으로 삭제 · 확정 요청 — 작성 쓰기일 때만 (도메인/카탈로그 §8.1 「여러 건 골라」) */}
            {!할수('작성요청') ? null : (
              <고른것고치기 service={service} 고른={뽑기.고른} 다되면={() => { 뽑기.비우기(); 실행단추.current?.focus(); }} />
            )}
            {/* 버튼은 하나이고 글자만 바뀐다. 둘로 나누면 같은 자리에서 같은 일을 하는 버튼이 둘이 된다 (SPEC §8.1) */}
            {!할수('실행') ? null : (
              <button className="btn" ref={실행단추} onClick={() => void 뽑기.모으기()} disabled={뽑기.모으는중}>
                {뽑기.고른.size === 0 ? t('전체 실행') : t('선택한 {건수}건 실행', { 건수: 뽑기.고른.size })}
              </button>
            )}
          </>
        }
      />

      <div className="screen list-screen">
      {/* 목록을 열자마자 「지금 이 서비스가 어떤 상태인가」가 먼저 온다.
          배지 하나만 있을 때는 실패가 몇 건인지 세로로 훑어야 알았다 */}
      {셈.전체 === 0 ? null : (
        <집계띠
          전체={셈.전체}
          통과={셈.통과}
          실패={셈.실패}
          미실행={셈.미실행}
          부제={{ 통과: t('마지막 실행 기준'), 미실행: t('실행한 적 없음') }}
        />
      )}

      {/* 찾기와 조건 칩이 한 줄에 선다 (2026-09-22). 두 줄이면 132px 을 먹었다.
          기능 목록은 설계 기법 고르개로 두 줄이 된다 — 받아들였다 (도메인/카탈로그 §8.1, 2026-10-05 게이트 2) */}
      <div className="toolbar">
        <찾기폼
          typed={검색.typed}
          건조건={검색.건조건}
          onTyped={검색.setTyped}
          onSearch={() => 검색.search(검색.typed)}
          onClear={검색.조건지우기}
        />

        <조건칩들
          디바이스={검색.디바이스}
          활성만={검색.활성만}
          결과={결과}
          on디바이스={검색.on디바이스}
          on활성만={검색.on활성만}
          on결과={검색.on결과}
        />
        {/* 디바이스 · 표시 칩처럼 고른 것은 그대로 둔다 — 다른 쪽에서 고른 것을 말없이 버리지 않는다 (도메인/카탈로그 §8.1 「설계 기법」) */}
        {kind !== 'FN' ? null : <기법고르개 기법={검색.기법} on기법={검색.on기법} />}
        {엑셀.버튼}
      </div>
      {엑셀.알림}

      {/* `case-rows` — 목록 폭이 좁으면 줄을 쌓는 규칙(styles.css)을 이 상자에만 건다. 실행 기록 · 작성 목록은 그대로다 */}
      <div className="rows-scroll case-rows">
      {cases.error !== null ? (
        <Failed error={cases.error} />
      ) : cases.data === null ? (
        <Loading />
      ) : 보일것.length === 0 && 결과 !== 'ALL' && cases.data.items.length > 0 ? (
        // 마지막 결과만 화면이 거른다. **서버가 나눠 준 이 쪽 안에서만** 걸러지므로
        // 「없다」고 단정하면 다음 쪽에 있는 것을 없다고 말하게 된다 (SPEC §8.1 이
        // 「케이스가 수백 건이 되면 서버 쪽으로 옮긴다」고 예고한 자리다)
        <div className="empty">
          {t('이 쪽에는 {결과}인 케이스가 없습니다', { 결과: t(결과라벨[결과]) })}
          <small>{t('다음 쪽에 있을 수 있습니다. 나머지 조건은 서버가 전체에서 거릅니다')}</small>
        </div>
      ) : 보일것.length === 0 ? (
        <Empty
          형편={{
            scannedAt: scan.data?.scannedAt ?? null,
            전체건수: cases.data.total,
            건조건: 검색.건조건,
            친글자: 검색.q,
          }}
          onScan={할수('다시스캔') ? () => void rescan() : undefined}
          onClear={검색.조건지우기}
        />
      ) : (
        <>
        <표머리
          고름상태={
            보일것.every((row) => 뽑기.고른.has(row.tcId)) ? 'all' : 보일것.some((row) => 뽑기.고른.has(row.tcId)) ? 'some' : 'none'
          }
          on모두고르기={() => 뽑기.모두뒤집기(보일것)}
        />
        {보일것.map((row) => (
          <케이스줄
            key={row.tcId}
            row={row}
            마지막={lastMap}
            고름={뽑기.고른.has(row.tcId)}
            뒤집기={뽑기.뒤집기}
            글자={글자[row.tcId]}
            폈나={편줄.has(row.tcId)}
            on실행={할수('실행') ? (row) => void 뽑기.하나열기(row) : undefined}
            저장된다={할수('입력값저장')}
            고칠서비스={할수('작성요청') ? service : undefined}
            on값={값고침}
            on더보기={더보기}
            on저장됨={async (tcId) => {
              // 저장값이 곧 칸의 새 시작값이다. 다시 읽기가 도착한 뒤에 비운다 — 먼저 비우면 도착 전까지 옛 값으로 돌아가 보인다
              if (await cases.reload()) set글자((전) => ({ ...전, [tcId]: { params: {}, expected: {} } }));
            }}
          />
        ))}
        </>
      )}
      </div>

      {page === 1 && !더있나 ? null : (
        <div className="pager">
          <button onClick={() => 검색.setPage((n) => n - 1)} disabled={page <= 1}>
            {t('이전')}
          </button>
          <span>{t('{번호}쪽', { 번호: page })}</span>
          <button onClick={() => 검색.setPage((n) => n + 1)} disabled={!더있나}>
            {t('다음')}
          </button>
        </div>
      )}

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
    </>
  );
}
