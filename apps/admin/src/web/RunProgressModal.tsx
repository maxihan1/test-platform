// 실행 하나를 「도는 중」과 「끝났다」 두 모습으로 그리는 모달 (SPEC §8.9 · DESIGN.md 모달)
// 모달을 둘로 나누면 같은 화면이 두 번 가로막는다. 그래서 상자는 하나이고 상태가 내용을 고른다

import type { ReactNode } from 'react';

import type { 항목진행 } from './api.js';
import { t, use말, use언어, type 언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { RunDoneItems } from './RunDoneItems.js';
import { 기록띠, 화면카드들 } from './RunLiveCards.js';
import { 진행왼쪽, 셈알약 } from './RunLiveLeft.js';
import { type RunDetail, 진행상황 } from './runProgress.js';
import { 도는중, 준비실패 } from './runState.js';
import { 걸린글 } from './trialView.js';
import { 그중미확정글 } from './unconfirmed.js';

/** ⑤ 실행 중 — 왼쪽 숫자 · 목록, 오른쪽 화면 카드가 처음부터 보인다 (도메인/실행 §8.16 ⑤ · 점검표 D7) */
function 진행내용({ data, 진행목록, 남은ms }: { data: RunDetail; 진행목록: 항목진행[]; 남은ms: number | null }) {
  const 지금 = 진행상황(data, 진행목록);
  return (
    <>
      <기록띠 data={data} />
      <div className="rl">
        <진행왼쪽 data={data} 진행={지금} 남은ms={남은ms} />
        <div className="rl-right">
          <화면카드들 runId={data.runId} 것들={지금.지금도는것들} />
        </div>
      </div>
    </>
  );
}

function 완료내용({ data, onClose }: { data: RunDetail; onClose: () => void }) {
  const t말 = use말();
  const 언어 = use언어();
  const 총 = data.finishedAt === null ? null : Date.parse(data.finishedAt) - Date.parse(data.startedAt);

  return (
    <>
      <p>
        {[data.title, t말('대상 서버 {서버}', { 서버: data.env }), ...(총 === null || Number.isNaN(총) ? [] : [t말('총 {시간}', { 시간: 걸린글(총, 언어) })])].join(' · ')}
      </p>
      {/* 점수는 한 줄 알약 — 시험 결과 ④ 와 같다. 0 은 점선 회색이다 (시안 A ④ · 점검표 B18) */}
      <div className="rl-pills">
        <셈알약 종류="pass" 이름={t말('통과')} 수={data.counts.pass} />
        <셈알약 종류="fail" 이름={t말('실패')} 수={data.counts.fail} />
        <셈알약 종류="na" 이름={t말('미실행')} 수={data.counts.na} />
      </div>
      {그중미확정글(data.counts, 언어) === '' ? null : <p className="hint">{그중미확정글(data.counts, 언어)}</p>}
      <RunDoneItems runId={data.runId} items={data.items} onClose={onClose} />
    </>
  );
}

function 제목(data: RunDetail, 언어: 언어): string {
  // 한 건 실행은 실행 기록에 줄이 없어 RUN 번호로는 찾을 데가 없다 — 케이스로 말한다. 묶음 실행은 지금대로 RUN 번호다 (2026-10-31 시험 d7)
  const 케이스 = 한건이름(data);
  if (케이스 !== null) {
    if (도는중(data.status)) return t('{케이스} 실행 중', 언어, { 케이스 });
    if (data.status === 준비실패) return t('{케이스} 테스트 데이터 준비에 실패했습니다', 언어, { 케이스 });
    return data.status === 'ABORTED' ? t('{케이스} 실행이 중단됐습니다', 언어, { 케이스 }) : t('{케이스} 실행이 완료되었습니다', 언어, { 케이스 });
  }
  if (도는중(data.status)) return t('RUN {번호} 실행 중', 언어, { 번호: data.runId });
  if (data.status === 준비실패) return t('RUN {번호} 테스트 데이터 준비에 실패했습니다', 언어, { 번호: data.runId });
  // 사람이 끊어서 끝난 것과 끝까지 돌아서 끝난 것은 같은 말로 알리지 않는다 (SPEC §3.2)
  return data.status === 'ABORTED'
    ? t('RUN {번호} 실행이 중단됐습니다', 언어, { 번호: data.runId })
    : t('RUN {번호} 실행이 완료되었습니다', 언어, { 번호: data.runId });
}

/** 한 건 실행이면 그 케이스 번호, 아니면 null */
export function 한건이름(data: RunDetail): string | null {
  return data.origin === 'SINGLE' ? (data.items[0]?.tcId ?? null) : null;
}

export function RunProgressModal({
  data,
  진행목록,
  남은ms = null,
  onClose,
  on멈추기,
  on결과보기,
  덧붙임,
}: {
  data: RunDetail;
  /** 러너에게 따로 물어 온 지금 절차들. 기본값을 두지 않는다 — 두면 호출부가 조회를 빠뜨려도
   *  조용히 「절차 없는」 화면이 나온다. 컴파일 단계에서 배선하게 만든다 */
  진행목록: 항목진행[];
  /** 서버가 잰 남은 시간. 모르면 null — 「계산 중」으로 적는다 */
  남은ms?: number | null;
  onClose: () => void;
  /** 도는 동안 멈출 수 있는 사람에게만 준다. 없으면 버튼을 아예 두지 않는다 — 못 누르는 버튼을 놓지 않는다 */
  on멈추기?: () => void;
  /** 그 실행 화면 밖에서 뜬 완료 상자 — 「결과 보기」가 그 화면으로 간다. 없으면 이미 그 화면이라 닫기만 한다 (도메인/실행 §8.9) */
  on결과보기?: () => void;
  /** 끝난 상자 맨 위에 붙는 한 줄 — 한 건 실행이 어디에 붙었나 (RunSingleDone) */
  덧붙임?: ReactNode;
}) {
  const t말 = use말();
  const 언어 = use언어();
  const 도는가 = 도는중(data.status);

  return (
    <Modal
      제목={제목(data, 언어)}
      onClose={onClose}
      틀={도는가 ? '실행 중' : '결과'}
      // 한 틀은 바깥을 눌러 닫히지 않고 휴대폰에서 화면 가득이다 (§8.16 「틀」 「닫는 길」)
      바깥눌러닫기={false}
      버튼={
        도는가 ? (
          <>
            {/* 되돌릴 수 없는 일은 주 단추와 떨어진 왼쪽이다 (§8.16 「바닥」). 멈추기 확인은 이 창 위에 겹친다 */}
            {on멈추기 === undefined ? null : (
              <button className="btn ghost trial-stop" onClick={on멈추기}>
                {t말('실행 중단')}
              </button>
            )}
            <span className="rl-note">{t말('닫아도 실행은 계속되고 완료되면 알림이 옵니다')}</span>
            <button className="btn" onClick={onClose} data-first>
              {t말('닫기')}
            </button>
          </>
        ) : on결과보기 === undefined ? (
          <button className="btn" onClick={onClose}>
            {t말('결과 보기')}
          </button>
        ) : (
          <>
            <button className="btn ghost" onClick={onClose}>
              {t말('닫기')}
            </button>
            <button className="btn" onClick={on결과보기}>
              {t말('결과 보기')}
            </button>
          </>
        )
      }
    >
      {도는가 ? (
        <진행내용 data={data} 진행목록={진행목록} 남은ms={남은ms} />
      ) : (
        <>
          {덧붙임}
          <완료내용 data={data} onClose={onClose} />
        </>
      )}
    </Modal>
  );
}
