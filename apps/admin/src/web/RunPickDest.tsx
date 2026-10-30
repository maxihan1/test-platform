// 실행 창 「결과가 남는 곳」 한 줄 — 한 건 · 반복 1 이면 붙을 실행을 읽어 적는다 (도메인/실행 §8.10 · §3.2 「★ 한 건 실행은 묶음 실행에 붙는다」)

import { api, type Platform } from './api.js';
import { use말, use언어 } from './i18n.js';
import { useAsync, when } from './ui.js';

type 곳 = { 붙음: { runId: number; title: string; startedAt: string } | null } | 'NEW_RUN';

/**
 * 서버가 실행을 만들 때 고르는 규칙(execution/single.ts 시작방식정하기)을 따라 읽는다.
 * 「실패 1건 다시 실행」(원래실행)은 통로를 부르지 않고 그 실행을 읽는다 — 반복 실행이면 서버가 붙이지 않고 새 RUN(RERUN)을 만든다.
 * 대상 서버를 바꿨으면 그 실행에 안 붙고 이번 서버에서 고르므로 통로로 넘어간다
 */
async function 붙을곳읽기(tcId: string, env: string, 디바이스: Platform[], 원래실행: number | undefined): Promise<곳> {
  if (원래실행 !== undefined) {
    const 원래 = await api.run(원래실행);
    if (원래.items.some((it) => it.attempt > 1)) return 'NEW_RUN';
    // ponytail: 빌드 스모크는 서버가 붙이지 않는데 화면은 그 칸을 모른다 — 스모크 결과 화면에서 다시 돌리면 이 글이 틀린다. 실행 응답에 buildStage 가 실리면 거른다
    if (원래.env === env) return { 붙음: { runId: 원래.runId, title: 원래.title, startedAt: 원래.startedAt } };
  }
  const { target } = await api.rerunTarget(tcId, env, 디바이스);
  return { 붙음: target };
}

export function 결과남는곳({
  tcId,
  디바이스,
  env,
  반복수,
  원래실행,
}: {
  /** 한 건이면 그 케이스. 여러 건이면 null — 늘 새 RUN 이다 */
  tcId: string | null;
  디바이스: Platform[];
  env: string;
  반복수: number;
  원래실행?: number;
}) {
  const t = use말();
  const 언어 = use언어();
  const 한건 = tcId !== null && 반복수 === 1 && env !== '';
  const 읽음 = useAsync<곳 | null>(
    () => (한건 ? 붙을곳읽기(tcId, env, 디바이스, 원래실행) : Promise.resolve(null)),
    [한건, tcId, env, 디바이스.join(','), 원래실행],
  );
  const 곳 = 읽음.data;

  const 글 =
    tcId === null || 반복수 !== 1 || 곳 === 'NEW_RUN'
      ? t('실행 기록에 새 RUN 으로 남습니다')
      : env === ''
        ? t('대상 서버를 고르면 보입니다')
        : 읽음.error !== null
          ? t('붙을 실행을 확인하지 못했습니다')
          : 곳 === null
            ? t('확인하는 중입니다')
            : 곳.붙음 === null
              ? t('아직 전체 테스트에 들어간 적이 없어 이 케이스 상세에만 남습니다')
              : t('RUN {번호} 결과에 다시 실행으로 붙습니다 · {제목} · {시각}', {
                  번호: 곳.붙음.runId,
                  제목: 곳.붙음.title,
                  시각: when(곳.붙음.startedAt, 언어),
                });

  return (
    <div className="mdest">
      <span className="one-label">{t('결과가 남는 곳')}</span>
      <span>{글}</span>
    </div>
  );
}
