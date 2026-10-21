// 성능 테스트 › 기기 성능 — 가장 최근 측정을 열고, 도는 중이면 실행 중 · 끝났으면 결과 · 없으면 측정 시작을 보인다 (도메인/성능 §8.14 「기기 성능」)

import { useEffect, useState } from 'react';

import type { ServiceRow } from './api.js';
import { use언어 } from './i18n.js';
import { perfApi, type 실행상세, type 실행줄 } from './perfApi.js';
import { PerfDeviceLive } from './PerfDeviceLive.js';
import { PerfDeviceResult } from './PerfDeviceResult.js';
import { PerfDeviceStart } from './PerfDeviceStart.js';
import { 기기설정of } from './perfDeviceView.js';
import { 도는중인가 } from './perfRunView.js';
import { Failed, Loading, message } from './ui.js';

/** 쓸 만한 실행 가운데 가장 최근 것. 오류 · 중단으로 끝나 숫자가 없는 실행은 뒤로 미룬다 — 페이지 성능과 같은 규칙이다 */
function 가장최근번호(줄들: 실행줄[]): number | null {
  const 쓸만 = 줄들.filter((줄) => 줄.status !== 'ERROR' && 줄.status !== 'STOPPED');
  return (쓸만.length > 0 ? 쓸만 : 줄들).reduce<number | null>((큰, 줄) => (큰 === null || 줄.id > 큰 ? 줄.id : 큰), null);
}

export function PerfDevices({ service, run, 쓰나 }: { service: ServiceRow; run?: number; 쓰나: boolean }) {
  const 언어 = use언어();
  const [읽은, set읽은] = useState<실행상세 | null>(null);
  const [읽었나, set읽었나] = useState(false);
  const [오류, set오류] = useState<string | null>(null);
  const [새로, set새로] = useState(false);

  async function 다시읽기(): Promise<boolean> {
    if (읽은 === null) return false;
    try {
      set읽은(await perfApi.runOf(읽은.id));
      return true;
    } catch {
      return false;
    }
  }

  // 처음 한 번 — 주소의 실행 → 없으면 가장 최근 측정 → 그것도 없으면 측정 시작 (키로 다시 그리므로 애플리케이션 · 실행이 바뀌면 처음부터다)
  useEffect(() => {
    let 살음 = true;
    void (async () => {
      try {
        const id = run ?? 가장최근번호((await perfApi.devicesRuns(service.id)).runs);
        if (id === null) return;
        const 받음 = await perfApi.runOf(id);
        if (!살음) return;
        // 실행 기록에서 DEVICE 가 아닌 번호가 넘어오면 그 실행의 화면으로 돌려보낸다
        if (받음.kind !== 'DEVICE') return void window.location.replace(`#/perf/runs/${String(id)}`);
        set읽은(받음);
      } catch (err) {
        if (살음) set오류(message(err, 언어));
      } finally {
        if (살음) set읽었나(true);
      }
    })();
    return () => {
      살음 = false;
    };
  }, []);

  if (!읽었나) return <Loading />;
  if (오류 !== null) return <Failed error={오류} />;
  if (읽은 === null || 새로) {
    return <PerfDeviceStart service={service} 앞={읽은 === null ? null : 기기설정of(읽은)} 앞env={읽은?.env ?? null} 쓰나={쓰나} 취소={읽은 === null ? null : () => set새로(false)} />;
  }
  return 도는중인가(읽은.status) ? (
    <PerfDeviceLive run={읽은} 다시읽기={다시읽기} 쓰나={쓰나} />
  ) : (
    <PerfDeviceResult run={읽은} service={service} 다시읽기={다시읽기} 쓰나={쓰나} 새측정={() => set새로(true)} />
  );
}
