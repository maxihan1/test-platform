// 자식 프로세스의 stdout 조각을 모아 완성된 진행 줄만 내놓는다. 청크 경계는 줄 경계와 무관하다 (SPEC §5.2)

import { PROGRESS_MARKER, type StepProgress } from '@platform/kit';

export interface ProgressCollector {
  push(chunk: string): StepProgress[];
}

export function createProgressCollector(): ProgressCollector {
  let pending = '';

  return {
    push(chunk) {
      pending += chunk;
      const lines = pending.split(/\r?\n/);
      // 개행이 아직 안 온 마지막 조각은 다음 청크와 이어 붙여야 한다
      pending = lines.pop() ?? '';

      const found: StepProgress[] = [];
      for (const line of lines) {
        if (!line.startsWith(PROGRESS_MARKER)) continue;
        try {
          found.push(JSON.parse(line.slice(PROGRESS_MARKER.length)) as StepProgress);
        } catch {
          // 진행 표시가 깨졌다고 실행까지 죽이지 않는다. 판정은 결과 줄이 하고 이건 곁다리다
        }
      }
      return found;
    },
  };
}
