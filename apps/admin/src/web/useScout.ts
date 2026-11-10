// Scout 대화 한 벌의 상태 — 열 때 읽고, 도는 질문은 이어 받고, 묻기 · 중단 · 대화 초기화를 한다 (도메인/챗봇 §8.18 · §7)

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from './api.js';
import { use언어 } from './i18n.js';
import { scoutApi } from './scoutApi.js';
import { 끝났나, 조각붙이기, type 질문, type 질문상태 } from './scoutView.js';
import { message } from './ui.js';

export interface Scout상태 {
  /** null 이면 아직 안 읽었다 */
  질문들: 질문[] | null;
  btsUrl: string | null;
  /** 도는 질문이 대기 중일 때 앞에 선 수. 모르면 null */
  앞: number | null;
  읽기오류: string | null;
  묻기오류: string | null;
  /** 창이 닫힌 동안 답이 끝났다 — HUD 점 (§8.18 ⑤) */
  도착: boolean;
  도는중: boolean;
  묻기: (글: string) => Promise<void>;
  중단: () => Promise<void>;
  초기화: () => Promise<void>;
  도착봄: () => void;
}

/** 창을 처음 열 때 읽는다. 닫아도 이어 받기는 계속한다 — 답이 끝나면 HUD 에 점을 붙여야 해서다 */
export function useScout(projectId: number, 열림: boolean): Scout상태 {
  const 언어 = use언어();
  const [질문들, set질문들] = useState<질문[] | null>(null);
  const [btsUrl, setBtsUrl] = useState<string | null>(null);
  const [앞, set앞] = useState<number | null>(null);
  const [읽기오류, set읽기오류] = useState<string | null>(null);
  const [묻기오류, set묻기오류] = useState<string | null>(null);
  const [도착, set도착] = useState(false);
  const 귀 = useRef<EventSource | null>(null);
  const 열림참조 = useRef(열림);
  열림참조.current = 열림;

  const 고치기 = useCallback((id: number, 바꿈: (q: 질문) => 질문) => {
    set질문들((앞것) => 앞것?.map((q) => (q.id === id ? 바꿈(q) : q)) ?? 앞것);
  }, []);

  const 끊기 = useCallback(() => {
    귀.current?.close();
    귀.current = null;
  }, []);

  const 읽기 = async () => {
    try {
      const 받음 = await scoutApi.open(projectId);
      set질문들(받음.questions);
      setBtsUrl(받음.btsUrl);
      set읽기오류(null);
      const 도는 = 받음.questions.find((q) => !끝났나(q.status));
      if (도는 !== undefined) 잇기(도는.id, 도는.lastSeq);
    } catch (e) {
      set읽기오류(message(e, 언어));
    }
  };

  const 잇기 = (id: number, after: number) => {
    끊기();
    const es = scoutApi.stream(id, after);
    귀.current = es;
    es.addEventListener('chunk', (e) => {
      const m = e as MessageEvent<string>;
      const { kind, body } = JSON.parse(m.data) as { kind: string; body: unknown };
      고치기(id, (q) => 조각붙이기(q, Number(m.lastEventId), kind, body));
    });
    es.addEventListener('wait', (e) => set앞((JSON.parse((e as MessageEvent<string>).data) as { ahead: number }).ahead));
    es.addEventListener('end', (e) => {
      const { status } = JSON.parse((e as MessageEvent<string>).data) as { status: 질문상태 };
      고치기(id, (q) => ({ ...q, status }));
      set앞(null);
      if (!열림참조.current) set도착(true);
      if (귀.current === es) 끊기();
    });
    // 404 · 403 처럼 다시 붙어도 소용없는 답이면 EventSource 가 스스로 그만둔다 — 대화를 다시 읽어 지금 상태로 맞춘다
    es.onerror = () => {
      if (es.readyState !== EventSource.CLOSED || 귀.current !== es) return;
      끊기();
      void 읽기();
    };
  };

  // 읽기는 그릴 때마다 새로 서서 의존에 넣지 않는다. 못 읽었으면 창을 다시 열 때 다시 읽는다 — 프로젝트가 바뀌면 껍데기가 이 훅째 새로 띄운다(key)
  useEffect(() => {
    if (열림 && 질문들 === null) void 읽기();
  }, [열림, 질문들]);

  useEffect(() => 끊기, [끊기]);

  const 묻기 = async (글: string) => {
    set묻기오류(null);
    try {
      const { id, ahead } = await scoutApi.ask(projectId, 글);
      set질문들((앞것) => [...(앞것 ?? []), { id, text: 글, status: 'QUEUED', createdAt: new Date().toISOString(), answer: '', steps: [], lastSeq: 0 }]);
      set앞(ahead);
      잇기(id, 0);
    } catch (e) {
      // 다른 탭에서 먼저 물었다 — 그 질문을 보이게 다시 읽는다
      if (e instanceof ApiError && e.code === 'BUSY') return void (await 읽기());
      set묻기오류(message(e, 언어));
    }
  };

  const 도는것 = 질문들?.find((q) => !끝났나(q.status)) ?? null;

  const 중단 = async () => {
    if (도는것 === null) return;
    try {
      await scoutApi.stop(도는것.id);
    } catch (e) {
      // 그사이 끝났다 — 이어 받기가 끝 상태를 이미 받았거나 곧 받는다
      if (!(e instanceof ApiError && e.code === 'NOT_RUNNING')) set묻기오류(message(e, 언어));
    }
  };

  const 초기화 = async () => {
    set묻기오류(null);
    try {
      await scoutApi.reset(projectId);
      끊기();
      set질문들([]);
      set앞(null);
    } catch (e) {
      set묻기오류(message(e, 언어));
    }
  };

  return { 질문들, btsUrl, 앞, 읽기오류, 묻기오류, 도착, 도는중: 도는것 !== null, 묻기, 중단, 초기화, 도착봄: () => set도착(false) };
}
