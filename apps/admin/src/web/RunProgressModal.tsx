// 실행 하나를 「도는 중」과 「끝났다」 두 모습으로 그리는 모달 (SPEC §8.9 · DESIGN.md 모달)
// 모달을 둘로 나누면 같은 화면이 두 번 가로막는다. 그래서 상자는 하나이고 상태가 내용을 고른다

import type { RunItemSummary, 항목진행 } from './api.js';
import { groupByCase, 회차요약 } from './group.js';
import { Modal } from './Modal.js';
import { type RunDetail, type 진행, 진행상황 } from './runProgress.js';
import { 도는중, 미실행사유 } from './runState.js';
import { STATUS_LABEL } from './ui.js';

const 실패목록최대 = 5;

/**
 * 밀리초를 사람이 읽는 글자로.
 *
 * `ui.tsx` 의 `seconds()` 를 쓰지 않는다 — 소수 둘째 자리까지 적고 분으로 올리지 않아
 * 제한 5분이 「300.00초」로 나온다. 2초마다 바뀌는 자리라 소수점도 읽기를 방해한다.
 */
function 시간글자(ms: number): string {
  const 초 = Math.round(ms / 1000);
  if (초 < 60) return `${초}초`;
  const 남은초 = 초 % 60;
  return 남은초 === 0 ? `${초 / 60}분` : `${Math.floor(초 / 60)}분 ${남은초}초`;
}

function 막대칸들(막대: 진행['막대']) {
  return [
    { 이름: '통과', 수: 막대.통과, 색: 'var(--pass)', 판정: true },
    { 이름: '실패', 수: 막대.실패, 색: 'var(--fail)', 판정: true },
    { 이름: '미실행', 수: 막대.미실행, 색: 'var(--na)', 판정: true },
    // 남은 것은 판정이 아니다. 판정 색 셋 중 하나를 쓰면 아직 안 난 결과가 결과처럼 읽힌다 (DESIGN.md)
    { 이름: '남음', 수: 막대.남은것, 색: 'var(--rule)', 판정: false },
  ];
}

/**
 * 방금 끝난 항목 옆에 적을 사유 한 줄.
 *
 * **미실행과 실패를 같은 길로 보내지 않는다.** 러너는 실패에도 `error` 를 채우는데
 * 그것을 `미실행사유()` 에 넘기면 영문 예외가 「러너에 닿지 못했습니다」로 바뀐다 —
 * 그냥 깨진 테스트가 러너 장애로 보인다 (`runState.ts` 의 `칸사유` 주석과 같은 자리).
 */
function 사유한줄(item: RunItemSummary): string | null {
  if (item.status === 'NA') return 미실행사유(item.error);
  // 스택은 상세 화면이 갖는다. 모달은 480px 이라 첫 줄만 들어간다
  return item.error === null ? null : (item.error.message.split('\n')[0] ?? null);
}

function 판정칸들({ 칸들 }: { 칸들: ReturnType<typeof 막대칸들> }) {
  return (
    <div className="tally">
      {칸들.map((칸) => (
        <div key={칸.이름}>
          <b style={칸.판정 ? { color: 칸.색 } : undefined}>{칸.수}</b>
          <span>{칸.이름}</span>
        </div>
      ))}
    </div>
  );
}

/** 지금 도는 항목 하나. 이름 줄과 절차 줄이 한 덩어리다 */
function 도는줄({ 항목, 절차 }: { 항목: RunItemSummary; 절차: 항목진행 | null }) {
  return (
    <div className="pre">
      <div className="one-line">
        {항목.tcId} {항목.tcName}
      </div>
      {/* 절차를 모를 때는 줄을 **아예 두지 않는다.** 빈 자리를 잡아 두면 2초마다 다시 묻는 이 화면에서
          절차가 왔다 갔다 할 때 상자 높이가 같이 튄다. 이름 줄과 붙여 둬서 덩어리만 짧아진다 */}
      {절차 === null ? null : (
        <div className="now-step">
          <span className="one-line">
            절차 {절차.seq} · {절차.title}
          </span>
          {/* 분모 없는 순번은 진행이 아니라 그냥 번호로 읽힌다. 진행을 실제로 말하는 것은
              2초마다 바뀌는 경과라 순번보다 크게 두고, 제한과 나란히 둬야
              「느린 것」과 「멈춘 것」이 갈린다 (게이트 1 화면 규칙) */}
          <b>{시간글자(절차.elapsedMs)}째</b>
          <span className="lim">/ 제한 {시간글자(절차.timeoutMs)}</span>
        </div>
      )}
    </div>
  );
}

function 진행내용({ data, 진행목록 }: { data: RunDetail; 진행목록: 항목진행[] }) {
  const { 막대, 끝난수, 전체수, 지금도는것들, 방금끝난것 } = 진행상황(data, 진행목록);
  const 칸들 = 막대칸들(막대);

  return (
    <>
      {/* 넷의 합이 전체수와 같아 폭 비율을 flex 가 그대로 낸다.
          여백과 「줄어들지 않는다」는 styles.css 의 `.modal-body .stripe` 가 갖는다 —
          인라인으로 두면 그 규칙이 있는지 다음 사람이 알 수 없다.
          **전체수가 0 이면 띠를 안 그린다** — 네 칸이 다 폭 0 이라 회색 빈 띠만 남는다.
          결과 목록도 같은 자리에서 같은 판단을 한다 (RunResult.tsx) */}
      {전체수 === 0 ? null : (
        <div className="stripe">
          {칸들.map((칸) => (
            <i key={칸.이름} style={{ background: 칸.색, flex: 칸.수 }} />
          ))}
        </div>
      )}
      {/* 색만으로는 판정을 전달하지 않는다 — 칸마다 숫자와 글자를 같이 적는다 (SPEC §8.9) */}
      <판정칸들 칸들={칸들} />
      <p>
        {끝난수} / {전체수} 완료
      </p>

      {지금도는것들.length === 0 ? null : (
        <div>
          {/* 「실행 중: X」라고 쓰지 않는다. 항목 둘이 동시에 돌아(EXECUTION_CONCURRENCY 기본 2)
              여기 뜨는 것이 전부라는 보장이 없다 — 단정하면 없는 확실함을 만든다 (runProgress.ts) */}
          <div className="sec-h">진행 중</div>
          {지금도는것들.map(({ 항목, 절차 }) => (
            <도는줄 key={항목.historyId} 항목={항목} 절차={절차} />
          ))}
        </div>
      )}

      {방금끝난것.length === 0 ? null : (
        <div>
          <div className="sec-h">방금 끝난 것</div>
          {방금끝난것.map((item) => {
            const 사유 = 사유한줄(item);
            return (
              <div className="pre" key={item.historyId}>
                {item.tcId} {item.tcName} · {STATUS_LABEL[item.status]}
                {사유 === null ? null : <div className="hint">{사유}</div>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/**
 * 실패한 **케이스**. 항목이 아니다.
 *
 * **회차를 접는다.** 5회 반복에서 케이스 하나가 3회 깨지면 항목으로 세었을 때
 * **그 하나가 목록 다섯 칸 중 셋을 먹고** 다른 케이스가 「외 N건」 뒤로 밀린다.
 * 제목이 「실패한 케이스」라 사람은 서로 다른 케이스를 봤다고 읽는다.
 *
 * 접는 규칙은 목록과 같은 `회차요약()` 이다 — SPEC §8.3 이 「케이스 1건 = 1행」으로 정했고
 * 바로 아래 결과 목록이 이미 그 규칙으로 그린다. **한 화면이 같은 것을 두 단위로 말하면 안 된다.**
 */
function 실패한케이스들(items: RunItemSummary[]): { tcId: string; tcName: string }[] {
  return groupByCase(items)
    .filter((묶음) =>
      Object.values(묶음.byPlatform).some((칸) => 칸 !== undefined && 칸.length > 0 && 회차요약(칸).status === 'FAIL'),
    )
    .map((묶음) => ({ tcId: 묶음.tcId, tcName: 묶음.tcName }));
}

function 완료내용({ data }: { data: RunDetail }) {
  const 칸들 = 막대칸들({ 통과: data.counts.pass, 실패: data.counts.fail, 미실행: data.counts.na, 남은것: 0 }).filter(
    (칸) => 칸.판정,
  );
  const 실패목록 = 실패한케이스들(data.items);

  return (
    <>
      <p>
        {data.title} · 대상 서버 {data.env}
      </p>
      <판정칸들 칸들={칸들} />
      {실패목록.length === 0 ? null : (
        <div>
          {/* 숫자만 보여주면 사람이 결국 목록을 뒤져야 한다 (SPEC §8.9) */}
          <div className="sec-h">실패한 케이스</div>
          {실패목록.slice(0, 실패목록최대).map((것) => (
            <div className="pre" key={것.tcId}>
              {것.tcId} {것.tcName}
            </div>
          ))}
          {실패목록.length > 실패목록최대 ? <p className="hint">외 {실패목록.length - 실패목록최대}건</p> : null}
        </div>
      )}
    </>
  );
}

function 제목(data: RunDetail): string {
  if (도는중(data.status)) return `RUN ${String(data.runId)} 이 진행 중입니다`;
  // 사람이 끊어서 끝난 것과 끝까지 돌아서 끝난 것은 같은 말로 알리지 않는다 (SPEC §3.2)
  return `RUN ${String(data.runId)} 이 ${data.status === 'ABORTED' ? '멈췄습니다' : '끝났습니다'}`;
}

export function RunProgressModal({
  data,
  진행목록,
  onClose,
}: {
  data: RunDetail;
  /** 러너에게 따로 물어 온 지금 절차들. 기본값을 두지 않는다 — 두면 호출부가 조회를 빠뜨려도
   *  조용히 「절차 없는」 화면이 나온다. 컴파일 단계에서 배선하게 만든다 */
  진행목록: 항목진행[];
  onClose: () => void;
}) {
  const 도는가 = 도는중(data.status);

  return (
    <Modal
      제목={제목(data)}
      onClose={onClose}
      // 도는 중에도 못 누르는 버튼을 놓지 않는다. 이 상자에서 사람이 할 수 있는 일은 닫는 것 하나뿐이다
      버튼={
        <button className="btn" onClick={onClose}>
          {도는가 ? '닫기' : '결과 보기'}
        </button>
      }
    >
      {도는가 ? <진행내용 data={data} 진행목록={진행목록} /> : <완료내용 data={data} />}
    </Modal>
  );
}
