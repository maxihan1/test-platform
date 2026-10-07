// 결과 화면 옆 칸 — 실행 정보 · 같은 사유로 실패 · 해결 · 증적 문서. 상자 안에서는 접힌 줄 하나 (도메인/실행 §8.3)

import { api, type Platform, type RunInsights as 비교 } from './api.js';
import { type 증적칸, 증적알림과목록 } from './EvidenceSection.js';
import { use말, use언어 } from './i18n.js';
import { RunInsights, 해결들 } from './RunInsights.js';
import { 시간글자 } from './RunProgressModal.js';
import { 실행자이름 } from './runState.js';
import { PLATFORM_LABEL, when } from './ui.js';

type 실행 = Awaited<ReturnType<typeof api.run>>;

const 디바이스순서: Platform[] = ['desktop', 'mobile', 'android'];

interface Props {
  data: 실행;
  insights: 비교 | null;
  /** 견주기가 실패했을 때의 문장. 결과는 그대로 서되 조용히 사라지지는 않는다 */
  견줌오류: string | null;
  증적칸: 증적칸;
  상자안: boolean;
}

export function RunSide({ data, insights, 견줌오류, 증적칸, 상자안 }: Props) {
  const t = use말();
  const 언어 = use언어();
  const 오류줄 =
    견줌오류 === null ? null : (
      <p className="hint">
        {t('직전 실행과 비교하지 못했습니다.')} {견줌오류}
      </p>
    );

  // 상자 안: 정보는 부제가 맡고 증적은 머리 줄에 붙는다. 남는 것은 사유 묶음과 해결뿐이라 접힌 줄 하나로 둔다.
  // 접기 껍데기를 「있나 없나」 바깥에 두면 첫 실행에 내용 없는 줄이 남는다 (공통/7-데모와-완료 §7)
  if (상자안) {
    const 묶음수 = insights?.실패덩어리들.length ?? 0;
    const 해결수 = 해결들(insights).length;
    if (묶음수 === 0 && 해결수 === 0 && 오류줄 === null) return null;
    return (
      <aside className="rr-side">
        {오류줄}
        {묶음수 === 0 && 해결수 === 0 ? null : (
          <details className="rr-fold">
            <summary>{t('같은 사유로 실패 {묶음}묶음 · 해결 {건수}', { 묶음: 묶음수, 건수: 해결수 })}</summary>
            <RunInsights insights={insights} />
          </details>
        )}
      </aside>
    );
  }

  const 디바이스들 = 디바이스순서.filter((p) => data.items.some((i) => i.platform === p));
  const 앞 = insights?.previous ?? null;
  const 종류 = data.kind === 'UI' ? t('UI 테스트') : data.kind === 'FN' ? t('기능 테스트') : null;
  const 소요 =
    data.finishedAt === null
      ? '—'
      : 시간글자(Math.max(0, new Date(data.finishedAt).getTime() - new Date(data.startedAt).getTime()), 언어);

  return (
    <aside className="rr-side">
      <section className="rr-flat">
        <h2 className="rr-h">{t('실행 정보')}</h2>
        <dl className="rr-kv">
          <dt>{t('서비스')}</dt>
          <dd>{data.serviceName}</dd>
          {종류 === null ? null : (
            <>
              <dt>{t('테스트 유형')}</dt>
              <dd>{종류}</dd>
            </>
          )}
          <dt>{t('대상 서버')}</dt>
          <dd>
            {data.env}
            {data.baseUrl === '' ? null : <span className="mono rr-sub">{data.baseUrl}</span>}
          </dd>
          <dt>{t('시작 시각')}</dt>
          <dd>{when(data.startedAt, 언어)}</dd>
          <dt>{t('소요 시간')}</dt>
          <dd>{소요}</dd>
          <dt>{t('실행자')}</dt>
          <dd>{실행자이름(data, 언어)}</dd>
          <dt>{t('디바이스')}</dt>
          <dd>{디바이스들.map((p) => PLATFORM_LABEL[p]).join(', ')}</dd>
          {앞 === null ? null : (
            <>
              <dt>{t('비교 기준')}</dt>
              <dd>
                <a className="mono" href={`#/runs/${String(앞.runId)}`}>
                  RUN {앞.runId}
                </a>{' '}
                · {when(앞.startedAt, 언어)}
              </dd>
            </>
          )}
        </dl>
        {오류줄}
      </section>

      <RunInsights insights={insights} />

      <증적알림과목록 칸={증적칸} />
    </aside>
  );
}
