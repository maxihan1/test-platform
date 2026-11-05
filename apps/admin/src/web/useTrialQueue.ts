// 여러 케이스를 「시험 실행」으로 케이스 × 디바이스 한 번씩 차례로 돌리는 큐 — 기록에 남지 않는다 (도메인/실행 §3.2 · §7)
//
// 서버는 사람당 한 건만 받는다(TRIAL_BUSY). 그래서 병렬이 아니라 차례로 돌리고, 한 번이 끝나야 다음을 시작한다.
// 새 서버 API 는 없다 — 케이스 테스트 실행 통로 둘(시작 · 결과)을 케이스 × 디바이스마다 되풀이한다

import { useEffect, useRef, useState } from 'react';

import { api, ApiError, type Platform, type RunRequestItem, type TrialResult, type TrialStep } from './api.js';
import { use말, use언어 } from './i18n.js';
import { message, 디바이스순서 } from './ui.js';

export type 시험줄 =
  | { 종류: 'wait' }
  | { 종류: 'run' }
  | { 종류: 'done'; 결과: TrialResult }
  | { 종류: 'notice'; 글: string }
  /** 중단해서 차례가 안 왔다 — 완료 창의 「실행 안 함」 (시안 7판 ⑤ ⑥) */
  | { 종류: 'skip' };

/** 케이스 한 줄 안의 디바이스 한 칸 — 고른 디바이스마다 하나, 디바이스차례 순서다 */
export interface 디바이스칸 {
  platform: Platform;
  줄: 시험줄;
}

/** 오른쪽 실시간 칸이 그릴 시험 — 마지막으로 시작한 것. 끝나도 남아 마지막 장면을 보인다 */
export interface 지금시험 {
  tcId: string;
  trialId: string;
  platform: Platform;
  /** VISION 이 폰을 잡은 동안 그 폰 화면 주소 */
  vision: string | null;
  /** 몇째인지 · 모두 몇 번인지 (1부터) — 케이스 × 디바이스로 센다 */
  차례: number;
  전체: number;
  /**
   * 물을 때마다 받은 지금 단계를 쌓은 것. 서버는 지나간 단계를 모아 두지 않아 화면이 쌓는다 —
   * 묻는 사이(1.5초)에 끝난 짧은 단계는 빠질 수 있다 (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」)
   */
  단계들: TrialStep[];
}

/** 같은 단계면 경과만 고치고 새 단계면 뒤에 붙인다 */
export function 단계쌓기(단계들: TrialStep[], 새: TrialStep | undefined): TrialStep[] {
  if (새 === undefined) return 단계들;
  const 끝 = 단계들[단계들.length - 1];
  if (끝?.seq === 새.seq) return 끝.elapsedMs === 새.elapsedMs ? 단계들 : [...단계들.slice(0, -1), 새];
  return [...단계들, 새];
}

const 기본간격 = 1500;

/** PC → 모바일 → Android 앱 차례 — 사람이 고른 순서와 상관없이 화면의 다른 디바이스 칩과 같은 차례로 돈다 */
export const 디바이스차례 = (platforms: readonly Platform[]): Platform[] => 디바이스순서.filter((p) => platforms.includes(p));

/** @param 간격 결과를 다시 묻는 주기(ms). 검사에서만 줄인다 */
export function useTrialQueue(간격: number = 기본간격) {
  const t = use말();
  const 언어 = use언어();
  const [줄들, set줄들] = useState<Record<string, 디바이스칸[]>>({});
  const [도는중, set도는중] = useState(false);
  const [지금, set지금] = useState<지금시험 | null>(null);
  // 중단을 눌렀다. 지금 시험은 서버에 끊어 달라고 하고 DONE 이 올 때까지 묻는다 — 그 전에 다음을 걸면 TRIAL_BUSY 다
  const [중단함, set중단함] = useState(false);
  const 중단 = useRef(false);
  // 화면을 떠나면 남은 줄을 시작하지 않는다. 안 멈추면 없는 화면에 상태를 쓰며 서버를 계속 두드린다
  const 멈춤 = useRef(false);
  const 도는 = useRef(false);

  useEffect(() => {
    멈춤.current = false;
    return () => {
      멈춤.current = true;
    };
  }, []);

  const 쓴다 = (tcId: string, platform: Platform, 줄: 시험줄) => {
    if (!멈춤.current) {
      set줄들((전) => ({ ...전, [tcId]: (전[tcId] ?? []).map((칸) => (칸.platform === platform ? { platform, 줄 } : 칸)) }));
    }
  };

  /** 이어 돌면 null, 멈추면 남은 칸에 붙일 글 */
  async function 한번(항목: RunRequestItem, platform: Platform, env: string, 차례: number, 전체: number): Promise<string | null> {
    쓴다(항목.tcId, platform, { 종류: 'run' });
    try {
      const { trialId } = await api.startTrial(항목.tcId, { platform, env, params: 항목.params, expected: 항목.expected });
      if (!멈춤.current) set지금({ tcId: 항목.tcId, trialId, platform, vision: null, 차례, 전체, 단계들: [] });
      // 시작 응답을 기다리는 사이 중단을 눌렀다 — 그때는 끊을 번호가 없었다
      if (중단.current) void 끊기(항목.tcId, trialId);
      // 이 시험의 칸일 때만 링크를 바꾼다
      const 링크 = (vision: string | null) => {
        if (!멈춤.current) set지금((앞) => (앞 === null || 앞.trialId !== trialId || 앞.vision === vision ? 앞 : { ...앞, vision }));
      };
      for (;;) {
        const 답 = await api.getTrial(항목.tcId, trialId);
        if (멈춤.current) return '';
        if (답.status === 'DONE') {
          링크(null);
          쓴다(항목.tcId, platform, { 종류: 'done', 결과: 답.result });
          return null;
        }
        링크(답.vision?.url ?? null);
        if (!멈춤.current && 답.step !== undefined) {
          const 단계 = 답.step;
          set지금((앞) => (앞 === null || 앞.trialId !== trialId ? 앞 : { ...앞, 단계들: 단계쌓기(앞.단계들, 단계) }));
        }
        await new Promise((ok) => setTimeout(ok, 간격));
        if (멈춤.current) return '';
      }
    } catch (err) {
      // 결과를 못 받고 끝났다. 서버가 놓았을 폰의 링크를 남기지 않는다 — 시작 전에 막혔으면 앞 시험 것이라 이미 비었다
      if (!멈춤.current) set지금((앞) => (앞 === null || 앞.vision === null ? 앞 : { ...앞, vision: null }));
      if (err instanceof ApiError && err.code === 'TRIAL_BUSY') {
        const 글 = t('이미 시험 실행이 돌고 있습니다');
        쓴다(항목.tcId, platform, { 종류: 'notice', 글 });
        return 글;
      }
      if (err instanceof ApiError && (err.code === 'DEVICE_BUSY' || err.code === 'FARM_OFF')) {
        // 디바이스 하나가 바쁘거나 이 서버에 디바이스 팜이 없을 뿐이라 그 칸만 안내하고 다음 칸은 이어 돈다 — 브라우저 케이스는 돌 수 있다
        쓴다(항목.tcId, platform, { 종류: 'notice', 글: message(err, 언어) });
        return null;
      }
      if (err instanceof ApiError && err.violations.length > 0) {
        // 그 케이스만 안 맞는다. 다음 칸은 이어 돈다
        쓴다(항목.tcId, platform, { 종류: 'notice', 글: t('입력값이 명세와 맞지 않습니다.') });
        return null;
      }
      쓴다(항목.tcId, platform, { 종류: 'notice', 글: message(err, 언어) });
      return t('앞 케이스 오류로 실행하지 않았습니다');
    }
  }

  async function 시작(항목들: RunRequestItem[], env: string): Promise<void> {
    // 두 번 눌러도 큐가 둘 생기지 않게 막는다
    if (도는.current) return;
    도는.current = true;
    set도는중(true);
    // 고른 디바이스를 차례로 다 돈다 — 앞 판은 첫째만 돌아 웹 케이스의 모바일이 안 돌았다 (도메인/실행 §8.2 「케이스 테스트 실행」)
    const 차례들 = 항목들.flatMap((항목) => 디바이스차례(항목.platforms).map((platform) => ({ 항목, platform })));
    // 줄의 칸도 같은 차례들에서 만든다 — 따로 세면 칸 차례와 도는 차례가 어긋날 수 있다
    const 첫줄들: Record<string, 디바이스칸[]> = {};
    for (const { 항목, platform } of 차례들) (첫줄들[항목.tcId] ??= []).push({ platform, 줄: { 종류: 'wait' } });
    set줄들(첫줄들);
    중단.current = false;
    set중단함(false);
    // 지난번 장면은 걷는다 — 새 큐의 첫 장면이 오기 전까지 옛 케이스 화면이 남으면 지금 것으로 읽힌다
    set지금(null);
    try {
      for (let i = 0; i < 차례들.length; i += 1) {
        if (멈춤.current) return;
        const { 항목, platform } = 차례들[i]!;
        if (중단.current) {
          쓴다(항목.tcId, platform, { 종류: 'skip' });
          continue;
        }
        const 멈춘글 = await 한번(항목, platform, env, i + 1, 차례들.length);
        if (멈춘글 === null) continue;
        // 서버 전체에 걸린 사정이나 러너 고장이면 남은 칸도 돌릴 수 없다. 대기로 두면 영영 기다리는 것처럼 보인다.
        // 같은 케이스의 남은 디바이스에 「앞 케이스」라고 적으면 없는 앞 케이스를 찾게 된다
        const 앞오류 = t('앞 케이스 오류로 실행하지 않았습니다');
        for (const 남은 of 차례들.slice(i + 1)) {
          const 글 = 멈춘글 === 앞오류 && 남은.항목.tcId === 항목.tcId ? t('앞 디바이스 오류로 실행하지 않았습니다') : 멈춘글;
          쓴다(남은.항목.tcId, 남은.platform, { 종류: 'notice', 글 });
        }
        break;
      }
    } finally {
      도는.current = false;
      if (!멈춤.current) set도는중(false);
    }
  }

  async function 끊기(tcId: string, trialId: string): Promise<void> {
    try {
      await api.abortTrial(tcId, trialId);
    } catch (err) {
      // 끊기를 못 했어도 남은 차례는 걸지 않는다. 지금 시험은 제 결과로 끝난다
      console.error('[trial] stopping the trial failed; the remaining turns are still skipped', err);
    }
  }

  /** 남은 차례를 걸지 않고 지금 시험을 끊는다. 지금 것이 DONE 이 될 때까지 큐는 묻기를 이어 간다 */
  function 멈추기(): void {
    if (!도는.current || 중단.current) return;
    중단.current = true;
    set중단함(true);
    if (지금 !== null) void 끊기(지금.tcId, 지금.trialId);
  }

  return { 줄들, 도는중, 지금, 시작, 중단: 멈추기, 중단함 };
}
