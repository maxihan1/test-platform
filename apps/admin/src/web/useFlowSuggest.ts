// E2E 마법사 「AI 추천」의 일 — 흐름 후보를 맡기고 끝날 때까지 묻는다. 성능 마법사의 usePerfJob 과 같은 꼴이다 (도메인/시나리오 §3.7 결정 15 · §8.11 「마법사」)

import { useEffect, useRef, useState } from 'react';

import { ApiError, type Platform } from './api.js';
import { use언어 } from './i18n.js';
import { scenarioApi, type FlowJob } from './scenarioApi.js';
import { message } from './ui.js';
import { 묻는간격 } from './usePerfJob.js';

export interface 흐름일 {
  /** 맡긴 일의 마지막 응답. 맡기기 전이거나 첫 응답 전이면 null */
  결과: FlowJob | null;
  /** 맡기는 중이거나 일이 아직 안 끝났다 */
  도나: boolean;
  /** 503 AGENT_OFFLINE — 작성 에이전트가 꺼져 있다 */
  꺼짐: boolean;
  /** 맡기기 · 묻기가 실패한 문장. 일이 FAILED 로 끝난 사유는 결과.error 다 */
  오류: string | null;
  맡겼나: boolean;
  맡기기: (요청: { service: string; platform: Platform; wish?: string }) => void;
  /** 받은 결과를 버린다 — 시작 방법 · 애플리케이션 · 디바이스가 바뀌면 그 결과는 다른 조건의 것이다 */
  버리기: () => void;
}

export function useFlowSuggest(): 흐름일 {
  const 언어 = use언어();
  const [일, set일] = useState<number | null>(null);
  const [결과, set결과] = useState<FlowJob | null>(null);
  const [맡기는중, set맡기는중] = useState(false);
  const [맡겼나, set맡겼나] = useState(false);
  const [꺼짐, set꺼짐] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  // 버린 뒤 늦게 온 맡기기 응답이 새 조건의 화면을 덮지 않게 판을 센다
  const 판 = useRef(0);

  useEffect(() => {
    if (일 === null) return;
    let 끊김 = false;
    void (async () => {
      try {
        for (;;) {
          const 받음 = await scenarioApi.flowJob(일);
          if (끊김) return;
          set결과(받음);
          if (받음.status === 'DONE' || 받음.status === 'FAILED') return;
          await new Promise((풀기) => setTimeout(풀기, 묻는간격.ms));
          if (끊김) return;
        }
      } catch (err) {
        if (!끊김) set오류(message(err, 언어));
      }
    })();
    return () => {
      // 마법사를 떠나거나 다시 맡기면 앞 일은 묻지 않는다 — 안 멈추면 닫힌 화면의 상태를 고치려 든다
      끊김 = true;
    };
  }, [일, 언어]);

  function 버리기() {
    판.current += 1;
    set일(null);
    set결과(null);
    set맡기는중(false);
    set맡겼나(false);
    set꺼짐(false);
    set오류(null);
  }

  function 맡기기(요청: { service: string; platform: Platform; wish?: string }) {
    버리기();
    const 이번 = 판.current;
    set맡기는중(true);
    set맡겼나(true);
    scenarioApi.suggestFlows(요청).then(
      ({ jobId }) => {
        if (판.current !== 이번) return;
        set맡기는중(false);
        set일(jobId);
      },
      (err: unknown) => {
        if (판.current !== 이번) return;
        set맡기는중(false);
        if (err instanceof ApiError && err.code === 'AGENT_OFFLINE') set꺼짐(true);
        else set오류(message(err, 언어));
      },
    );
  }

  const 끝남 = 결과 !== null && (결과.status === 'DONE' || 결과.status === 'FAILED');
  return { 결과, 도나: 오류 === null && (맡기는중 || (일 !== null && !끝남)), 꺼짐, 오류, 맡겼나, 맡기기, 버리기 };
}
