// 작성 에이전트가 자식 claude 에 거는 모델·effort·예비 모델과 Claude CLI 최신화 판단 (SPEC 공통/6 §9)

export interface 모델 {
  model: string;
  effort: string;
  /** 본 모델이 과부하·미제공일 때만 넘어간다. 구독 한도는 넘겨 주지 않는다 (CLI 도움말) */
  fallback: string | null;
}

// CLI `--effort` 가 받는 값. 도움말(2.1.280)이 정본이다
const effort들 = ['low', 'medium', 'high', 'xhigh', 'max'];
// 별칭(opus)과 전체 이름(claude-opus-5-5 · claude-opus-5-5[1m])만. 인자 배열로 넘겨도 셸 글자는 애초에 안 받는다
const 모델모양 = /^[a-z0-9][a-z0-9.\-[\]]{0,63}$/;

export function 모델설정(env: Record<string, string | undefined>): 모델 | { 까닭: string } {
  const model = env.AUTHORING_MODEL || 'opus';
  const effort = env.AUTHORING_EFFORT || 'high';
  const 예비 = env.AUTHORING_FALLBACK_MODEL || 'sonnet';
  if (!모델모양.test(model)) return { 까닭: `AUTHORING_MODEL(${model}) 이 모델 이름 모양이 아니다` };
  if (!effort들.includes(effort)) return { 까닭: `AUTHORING_EFFORT(${effort}) 는 ${effort들.join('·')} 중 하나다` };
  if (예비 !== 'none' && !모델모양.test(예비)) {
    return { 까닭: `AUTHORING_FALLBACK_MODEL(${예비}) 이 모델 이름 모양이 아니다` };
  }
  return { model, effort, fallback: 예비 === 'none' || 예비 === model ? null : 예비 };
}

export function 모델인자(m: 모델): string[] {
  return ['--model', m.model, '--effort', m.effort, ...(m.fallback === null ? [] : ['--fallback-model', m.fallback])];
}

/** 자식이 구독 한도에 걸려 멈췄나. 걸렸으면 사람이 「기다렸다 다시」를 알아야 한다 — 기획서 탓이 아니다 */
export function 한도걸렸나(글: string): boolean {
  return /usage limit reached|hit your limit|rate limit/i.test(글);
}

const 하루 = 24 * 60 * 60 * 1000;

/** 하루 한 번, 도는 작업이 없을 때만. 도는 claude 아래에서 판을 바꾸지 않는다 */
export function 업데이트할까(지금: number, 마지막: number | null, 도는수: number): boolean {
  return 도는수 === 0 && (마지막 === null || 지금 - 마지막 >= 하루);
}

/** npm 에 넘기는 인자. 판은 기본 stable (2026-09-24 게이트 1) — latest 는 며칠 검증을 건너뛴다 */
export function 업데이트인자(판: string | undefined): string[] | null {
  const 값 = 판 || 'stable';
  if (!/^(stable|latest|\d+\.\d+\.\d+)$/.test(값)) return null;
  return ['install', '-g', `@anthropic-ai/claude-code@${값}`];
}

export function 버전뽑기(글: string): string | null {
  return /^(\d+\.\d+\.\d+)/m.exec(글.trim())?.[1] ?? null;
}

/**
 * 올린 판이 우리가 쓰는 깃발을 다 아는가. 격리의 한 축이 `--disallowedTools`·`--permission-mode` 라
 * 설치는 됐는데 깃발이 사라진 판으로 돌면 막아 둔 도구가 조용히 풀린다 (2026-09-24 계획 검토)
 */
export function 점검통과(도움말: string): boolean {
  return ['--model', '--effort', '--fallback-model', '--disallowedTools', '--permission-mode'].every((깃발) =>
    도움말.includes(깃발),
  );
}
