// 실행 창 「시험 실행」 · 「실행」을 누르면 겹쳐 뜨는 시작 확인 창 — 기록이 남는지 · 무엇이 어디서 도는지 (도메인/실행 §8.10 · 시안 7판 ③-1)
// 앞 판은 단추 아래 「기록·리포트가 남지 않습니다」 「기록이 남습니다」 두 줄(이번에 걷었다)과 「결과가 남는 곳」 줄(2026-11-05 WEB-F9-01 에 걷었다)이 이 일을 했다

import { api, type CaseRow, type Platform, type 모바일위치 } from './api.js';
import { use말, use언어 } from './i18n.js';
import { Modal } from './Modal.js';
import { PLATFORM_LABEL, useAsync, when } from './ui.js';
import { 디바이스차례 } from './useTrialQueue.js';

type 곳 = { 붙음: { runId: number; title: string; startedAt: string } | null } | 'NEW_RUN';

/**
 * 서버가 실행을 만들 때 고르는 규칙(execution/single.ts 시작방식정하기)을 따라 읽는다.
 * 「실패 1건 다시 실행」(원래실행)은 통로를 부르지 않고 그 실행을 읽는다 — 반복 실행이면 서버가 붙이지 않고 새 RUN(RERUN)을 만든다.
 * 대상 서버를 바꿨으면 그 실행에 안 붙고 이번 서버에서 고르므로 통로로 넘어간다. 모바일이 든 한 건은 모바일 실행 위치를 바꿨을 때도 같다 —
 * 그 실행의 위치는 실제 폰 모바일 항목이 남긴 폰 모델(mobileDevices)로 읽는다 (도메인/실행 §3.2 「모바일 웹 실행 위치」).
 * ponytail: 서버는 기기 칸이 찼나로 가른다 — 폰 모델을 못 읽은 실제 폰 항목만 있는 실행은 여기서 흉내로 읽혀 이 글이 서버와 갈린다. 실행 응답에 위치 칸을 따로 실으면 그것으로 바꾼다
 */
async function 붙을곳읽기(tcId: string, env: string, 디바이스: Platform[], 원래실행: number | undefined, mobileOn: 모바일위치): Promise<곳> {
  if (원래실행 !== undefined) {
    const 원래 = await api.run(원래실행);
    if (원래.items.some((it) => it.attempt > 1)) return 'NEW_RUN';
    const 같은위치 = !디바이스.includes('mobile') || ((원래.mobileDevices ?? []).length > 0) === (mobileOn === 'vision');
    // ponytail: 빌드 스모크는 서버가 붙이지 않는데 화면은 그 칸을 모른다 — 스모크 결과 화면에서 다시 돌리면 이 글이 틀린다. 실행 응답에 buildStage 가 실리면 거른다
    if (원래.env === env && 같은위치) return { 붙음: { runId: 원래.runId, title: 원래.title, startedAt: 원래.startedAt } };
  }
  const { target } = await api.rerunTarget(tcId, env, 디바이스, mobileOn);
  return { 붙음: target };
}

export interface 시작확인속성 {
  종류: 'trial' | 'formal';
  /** 돌릴 것 — 한 건 창이면 고른 디바이스로 좁힌 것이다 */
  케이스들: CaseRow[];
  env: string;
  반복수: number;
  /** Slack 칸이 보이는 창이면 켰는지. 칸이 없으면 null — 줄을 안 적는다 */
  slack: boolean | null;
  /** 고른 케이스에 모바일이 있을 때 고른 실행 위치 */
  mobileOn: 모바일위치 | null;
  /** 「실패 1건 다시 실행」의 원래 실행 */
  원래실행?: number;
  onClose: () => void;
  on시작: () => void;
}

export function 시작확인({ 종류, 케이스들, env, 반복수, slack, mobileOn, 원래실행, onClose, on시작 }: 시작확인속성) {
  const t = use말();
  const 시험 = 종류 === 'trial';
  // 디바이스마다 몇 건인지 — 「PC 3 · 모바일 2 (가상 기기)」. 반복은 따로 적는다
  const 디바이스들 = 디바이스차례(케이스들.flatMap((c) => c.platforms));
  const 디바이스글 = 디바이스들
    .map((p) => {
      const 수 = 케이스들.filter((c) => c.platforms.includes(p)).length;
      const 위치 = p === 'mobile' && mobileOn !== null ? ` (${mobileOn === 'vision' ? t('실제 디바이스') : t('가상 디바이스')})` : '';
      return `${t(PLATFORM_LABEL[p])} ${수}${위치}`;
    })
    .join(' · ');
  // 케이스마다 켠 디바이스가 달라 케이스별로 센다 — 곱셈식은 F9-01 이 뺐고 결과 한 줄만 적는다 (점검표 U9)
  const 총횟수 = 케이스들.reduce((합, c) => 합 + c.platforms.length, 0) * 반복수;
  // 합이 케이스 수와 우연히 같아도 숨기지 않는다 — 숨기는 것은 모든 케이스가 디바이스 하나 · 반복 1 일 때뿐이다
  const 한번씩 = 반복수 === 1 && 케이스들.every((c) => c.platforms.length === 1);
  const 브라우저 = 디바이스들.some((p) => p !== 'android');

  return (
    <Modal
      제목={시험 ? t('시험 실행을 시작할까요?') : t('정식 실행을 시작할까요?')}
      onClose={onClose}
      버튼={
        <>
          <button className="btn ghost" onClick={onClose}>
            {t('취소')}
          </button>
          <button className="btn" onClick={on시작}>
            {시험 ? t('시험 실행 시작') : t('실행 시작')}
          </button>
        </>
      }
    >
      {시험 ? (
        <p className="start-band">
          {t('결과는 이 창에서만 보이고')} <b>{t('실행 기록 · 리포트에 남지 않습니다')}</b>
        </p>
      ) : (
        <남는곳 한건={케이스들.length === 1 && 반복수 === 1 ? 케이스들[0]! : null} env={env} 원래실행={원래실행} mobileOn={mobileOn ?? 'server'} />
      )}
      <dl className="start-what">
        <dt>{t('케이스')}</dt>
        {/* 1건이면 차례가 없다 — 앞 판은 1건에도 「한 건씩 차례로」가 붙었다 (도메인/실행 §8.16 ② · 점검표 B15c) */}
        <dd>{t(시험 && 케이스들.length > 1 ? '{수}건 · 한 건씩 차례로' : '{수}건', { 수: 케이스들.length })}</dd>
        <dt>{t('디바이스')}</dt>
        <dd>{디바이스글}</dd>
        <dt>{t('대상 서버')}</dt>
        <dd>{env}</dd>
        {시험 ? null : (
          <>
            <dt>{slack === null ? t('반복') : t('반복 · 알림')}</dt>
            <dd>
              {[t('{수}회', { 수: 반복수 }), ...(slack === null ? [] : [slack ? t('Slack 알림 켬') : t('Slack 알림 끔')])].join(' · ')}
            </dd>
          </>
        )}
      </dl>
      {!한번씩 ? <p className="start-total">{t('모두 {수}번 실행', { 수: 총횟수 })}</p> : null}
      <p className="hint">
        {시험
          ? 브라우저
            ? t('동작마다 1초씩 천천히 실행하고, 실행 화면을 실시간으로 보여 줍니다')
            : t('실행 화면을 실시간으로 보여 줍니다')
          : t('창을 닫아도 실행은 계속됩니다')}
      </p>
    </Modal>
  );
}

/** 정식 실행의 주황 띠 — 한 건 · 반복 1 이면 붙을 실행을 읽어 적는다 (도메인/실행 §3.2 「★ 한 건 실행은 묶음 실행에 붙는다」) */
function 남는곳({ 한건, env, 원래실행, mobileOn }: { 한건: CaseRow | null; env: string; 원래실행?: number; mobileOn: 모바일위치 }) {
  const t = use말();
  const 언어 = use언어();
  const 읽음 = useAsync<곳 | null>(
    () => (한건 === null ? Promise.resolve(null) : 붙을곳읽기(한건.tcId, env, 한건.platforms, 원래실행, mobileOn)),
    [한건?.tcId, env, 한건?.platforms.join(','), 원래실행, mobileOn],
  );
  const 곳 = 읽음.data;
  const 글 =
    한건 === null || 곳 === 'NEW_RUN'
      ? t('끝나면 실행 기록에 새 RUN 으로 남고 리포트가 만들어집니다')
      : 읽음.error !== null
        ? t('붙을 실행을 확인하지 못했습니다')
        : 곳 === null
          ? t('붙을 실행을 확인하는 중입니다')
          : 곳.붙음 === null
            ? t('이 케이스만 따로 실행해 케이스 상세의 실행 기록에만 남습니다')
            : t('끝나면 RUN {번호} 결과에 다시 실행으로 추가됩니다 · {제목} · {시각}', {
                번호: 곳.붙음.runId,
                제목: 곳.붙음.title,
                시각: when(곳.붙음.startedAt, 언어),
              });
  return <p className="start-band rec">{글}</p>;
}
