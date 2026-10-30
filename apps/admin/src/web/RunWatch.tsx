// 진행 창을 연 실행을 어느 화면에서든 따라간다 — 닫으면 진행 알약, 누르면 다시 진행 창, 끝나면 완료 창 (도메인/실행 §8.9 · DESIGN.md 「창이 아닌 떠 있는 것」)
// 바깥 틀(Shell)에 하나만 선다. 결과 화면이 상자를 따로 들면 같은 실행에 상자가 둘 뜬다

import { useEffect, useState } from 'react';

import { api } from './api.js';
import { use말 } from './i18n.js';
import { RunAbortModal } from './RunAbortModal.js';
import { 실행판정, type 판정하기 } from './runJudge.js';
import { 진행상황 } from './runProgress.js';
import { RunProgressModal } from './RunProgressModal.js';
import { 도는중, 멈출수있나, 본것으로적는다, 알림본적있나 } from './runState.js';
import { use지켜봄, 지켜본다, type 지켜봄 } from './runWatchStore.js';
import { useAsync } from './ui.js';
import { useRunProgress } from './useRunProgress.js';
import { use보는실행 } from './viewedRun.js';

export function RunWatch({ 판정하기 }: { 판정하기: 판정하기 }) {
  const 봄 = use지켜봄();
  // 실행이 바뀌면 상태를 새로 연다 — 앞 실행의 「멈출까」가 남지 않게
  return 봄 === null ? null : <지켜보는실행 key={봄.runId} 봄={봄} 판정하기={판정하기} />;
}

function 지켜보는실행({ 봄, 판정하기 }: { 봄: 지켜봄; 판정하기: 판정하기 }) {
  const t = use말();
  const [멈출까, set멈출까] = useState(false);
  const [멈추는중, set멈추는중] = useState(false);
  const run = useAsync(() => api.run(봄.runId), [봄.runId]);
  const data = run.data;
  const running = data !== null && 도는중(data.status);
  const reload = run.reload;
  const { 진행목록, 남은ms } = useRunProgress(running, 봄.runId);
  const 보는실행 = use보는실행();

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [running, reload]);

  // 끝난 것을 이미 알린 실행이면 내려놓는다 — 그 결과 화면에서 완료 창을 닫았다.
  // 처음 읽기부터 못 하면(지워졌거나 권한이 사라졌다) 알약을 세울 값이 없어 내려놓는다 — 끝나면 본문 위 알림 줄이 받는다.
  // 도는 중의 읽기 실패는 앞 값을 쥔 채 2초 뒤 다시 묻는다(useAsync)
  const 끝 = data !== null && !running;
  useEffect(() => {
    if (끝 && 알림본적있나(봄.runId)) 지켜본다(null);
  }, [끝, 봄.runId]);
  useEffect(() => {
    if (run.error !== null && data === null) 지켜본다(null);
  }, [run.error, data]);

  if (data === null) return null;

  if (끝) {
    // 알약이 떠 있던 실행은 끝나면 어느 화면에서든 완료 창을 받는다 (도메인/실행 §8.9 「완료 모달」의 예외)
    const 닫는다 = () => {
      본것으로적는다(data.runId);
      지켜본다(null);
    };
    return (
      <RunProgressModal
        data={data}
        진행목록={진행목록}
        onClose={닫는다}
        on결과보기={
          보는실행 === data.runId
            ? undefined
            : () => {
                닫는다();
                window.location.hash = `#/runs/${String(data.runId)}`;
              }
        }
      />
    );
  }

  const { 끝난수, 전체수 } = 진행상황(data, 진행목록);
  return (
    <>
      {봄.열림 ? (
        <RunProgressModal
          data={data}
          진행목록={진행목록}
          남은ms={남은ms}
          onClose={() => 지켜본다({ runId: 봄.runId, 열림: false })}
          on멈추기={멈출수있나(data.status, 실행판정(판정하기, data)) ? () => set멈출까(true) : undefined}
        />
      ) : (
        <button
          type="button"
          className="run-pill"
          aria-haspopup="dialog"
          aria-label={t('RUN {번호} 진행 보기 · {끝난} / {전체} 완료', { 번호: data.runId, 끝난: 끝난수, 전체: 전체수 })}
          onClick={() => 지켜본다({ runId: 봄.runId, 열림: true })}
        >
          <span className="pulse" />
          <b>RUN {data.runId}</b>
          <span className="run-pill-bar">
            <i style={{ width: `${String(전체수 === 0 ? 0 : (끝난수 / 전체수) * 100)}%` }} />
          </span>
          <span>
            {끝난수} / {전체수}
          </span>
        </button>
      )}

      {/* 진행 창 위에 겹친다. Esc 는 맨 위 하나만 닫는다 (Modal 의 열린상자들) */}
      {!멈출까 ? null : (
        <RunAbortModal
          runId={data.runId}
          멈추는중={멈추는중}
          on멈추는중={set멈추는중}
          onClose={() => set멈출까(false)}
          on멈춤={() => {
            set멈출까(false);
            void reload();
          }}
        />
      )}
    </>
  );
}
