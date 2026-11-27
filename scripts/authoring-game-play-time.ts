// 판 함수가 보낸 명령의 시간 재기 — 읽기 · 입력 · 기타가 하나라도 돈 시간과 아무 명령도 안 돈 기다림을 낸다 (도메인/게임 §3.10 「계획으로 해 보기」)
// 16094 · 16097 실측에서 한 바퀴 읽기에 3~7초, 바퀴 1/3 을 기다림으로 썼는데 판 기록에 안 남아 회고가 못 봤다

export interface 시간표 { 읽기ms: number; 입력ms: number; 기타ms: number; 기다림ms: number }

type 종류 = '읽기' | '입력' | '기타';

const 읽기명령 = new Set(['get', 'text', 'tree', 'components', 'members', 'static-get', 'scenes', 'layout', 'timescale-get', 'pref-get', 'logs', 'screenshot']);
const 입력명령 = new Set(['key', 'key-down', 'key-up', 'click', 'tap', 'touch-down', 'touch-move', 'touch-up', 'pad', 'mouse-move', 'pointer', 'swipe', 'scroll', 'long-press', 'type', 'tilt']);

export function 명령종류(cmd: unknown): 종류 {
  const 이름 = String(cmd);
  return 읽기명령.has(이름) || 이름.startsWith('find') ? '읽기' : 입력명령.has(이름) ? '입력' : '기타';
}

/**
 * 명령이 여럿 겹쳐 돌 수 있다 — 종류마다 「그 종류가 하나라도 도는 동안」을 한 번만 센다.
 * 켜기 전에 시작한 명령(게임 열 때 ping)은 안 센다. 끝낼 때 아직 도는 명령은 끝낸 때까지만 센다
 */
export function 시간재기(지금: () => number = Date.now) {
  let 켠때: number | null = null;
  const 도는 = { 읽기: 0, 입력: 0, 기타: 0, 전체: 0 };
  const 시작 = { 읽기: 0, 입력: 0, 기타: 0, 전체: 0 };
  const 합 = { 읽기: 0, 입력: 0, 기타: 0, 전체: 0 };
  type 키 = keyof typeof 도는;
  const 열기 = (k: 키, t: number): void => {
    if (도는[k]++ === 0) 시작[k] = t;
  };
  const 닫기 = (k: 키, t: number): void => {
    if (--도는[k] === 0) 합[k] += t - 시작[k];
  };
  return {
    켠다(t: number): void {
      켠때 = t;
    },
    async 재서<T>(cmd: unknown, 일: () => Promise<T>): Promise<T> {
      if (켠때 === null) return 일();
      const k = 명령종류(cmd);
      const 연때 = 지금();
      열기(k, 연때);
      열기('전체', 연때);
      try {
        return await 일();
      } finally {
        const t = 지금();
        닫기(k, t);
        닫기('전체', t);
      }
    },
    끝낸다(끝: number): 시간표 {
      const 쓴 = (k: 키): number => 합[k] + (도는[k] > 0 ? 끝 - 시작[k] : 0);
      return { 읽기ms: 쓴('읽기'), 입력ms: 쓴('입력'), 기타ms: 쓴('기타'), 기다림ms: Math.max(0, 끝 - (켠때 ?? 끝) - 쓴('전체')) };
    },
  };
}

/** 출력 덧줄 — 초 단위 반올림. 기타는 반올림해 1초 이상일 때만 낸다 */
export function 바퀴줄(표: 시간표): string {
  const 초 = (ms: number): number => Math.round(ms / 1000);
  return `바퀴: 읽기 ${초(표.읽기ms)}초 · 입력 ${초(표.입력ms)}초${초(표.기타ms) > 0 ? ` · 기타 ${초(표.기타ms)}초` : ''} · 기다림 ${초(표.기다림ms)}초`;
}
