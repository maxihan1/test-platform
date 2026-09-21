// 실행 하나를 「도는 중」과 「끝났다」 두 모습으로 그리는 모달 (SPEC §8.9 · DESIGN.md 모달)
// 모달을 둘로 나누면 같은 화면이 두 번 가로막는다. 그래서 상자는 하나이고 상태가 내용을 고른다

import type { RunItemSummary } from './api.js';
import { Modal } from './Modal.js';
import { type RunDetail, type 진행, 진행상황 } from './runProgress.js';
import { 도는중, 미실행사유 } from './runState.js';
import { STATUS_LABEL } from './ui.js';

const 실패목록최대 = 5;

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

function 진행내용({ data }: { data: RunDetail }) {
  const { 막대, 끝난수, 전체수, 지금도는것, 방금끝난것 } = 진행상황(data);
  const 칸들 = 막대칸들(막대);

  return (
    <>
      {/* 넷의 합이 전체수와 같아 폭 비율을 flex 가 그대로 낸다. 바깥 여백은 모달이 이미 갖고 있다 */}
      <div className="stripe" style={{ margin: 0 }}>
        {칸들.map((칸) => (
          <i key={칸.이름} style={{ background: 칸.색, flex: 칸.수 }} />
        ))}
      </div>
      {/* 색만으로는 판정을 전달하지 않는다 — 칸마다 숫자와 글자를 같이 적는다 (SPEC §8.9) */}
      <판정칸들 칸들={칸들} />
      <p>
        {끝난수} / {전체수} 완료
      </p>

      {지금도는것 === null ? null : (
        <div>
          {/* 「실행 중: X」라고 쓰지 않는다. 항목 둘이 동시에 돌아(EXECUTION_CONCURRENCY 기본 2)
              여기 뜨는 것은 도는 둘 중 하나다 — 단정하면 없는 확실함을 만든다 (runProgress.ts) */}
          <div className="sec-h">진행 중</div>
          <div className="pre">
            {지금도는것.tcId} {지금도는것.tcName}
          </div>
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

function 완료내용({ data }: { data: RunDetail }) {
  const 칸들 = 막대칸들({ 통과: data.counts.pass, 실패: data.counts.fail, 미실행: data.counts.na, 남은것: 0 }).filter(
    (칸) => 칸.판정,
  );
  const 실패목록 = data.items.filter((item) => item.status === 'FAIL');

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
          {실패목록.slice(0, 실패목록최대).map((item) => (
            <div className="pre" key={item.historyId}>
              {item.tcId} {item.tcName}
            </div>
          ))}
          {실패목록.length > 실패목록최대 ? <p className="hint">외 {실패목록.length - 실패목록최대}건</p> : null}
        </div>
      )}
    </>
  );
}

function 제목(data: RunDetail): string {
  if (도는중(data.status)) return `RUN ${String(data.runId)} 이 도는 중입니다`;
  // 사람이 끊어서 끝난 것과 끝까지 돌아서 끝난 것은 같은 말로 알리지 않는다 (SPEC §3.2)
  return `RUN ${String(data.runId)} 이 ${data.status === 'ABORTED' ? '멈췄습니다' : '끝났습니다'}`;
}

export function RunProgressModal({ data, onClose }: { data: RunDetail; onClose: () => void }) {
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
      {도는가 ? <진행내용 data={data} /> : <완료내용 data={data} />}
    </Modal>
  );
}
