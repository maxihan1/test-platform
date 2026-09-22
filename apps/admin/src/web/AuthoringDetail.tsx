// 작성 요청 한 건 상세. 어디까지 했고 무엇이 나왔는지 보고, 마음에 들면 머지를 건다
// (도메인/작성 §3.6 · §7 · 도메인/인증 §7 「등급으로 갈리는 자리」)

import { useEffect, useState } from 'react';

import { api, type AuthoringRow } from './api.js';
import { 보임라벨, 종류라벨, 줄보임 } from './authoringView.js';
import { Head } from './Head.js';
import { use말, use언어 } from './i18n.js';
import { 할수있나, type 등급 } from './role.js';
import { Failed, Loading, message, useAsync, when } from './ui.js';

/** 끝난 것은 더 안 바뀐다. 계속 물으면 탭 하나가 2초마다 서버를 두드린다 */
function 끝났나(status: AuthoringRow['status']): boolean {
  return status === 'DONE' || status === 'FAILED';
}

export function AuthoringDetail({ service, id, role }: { service: string; id: number; role: 등급 }) {
  const t = use말();
  const 언어 = use언어();
  const [머지중, set머지중] = useState(false);
  const [머지오류, set머지오류] = useState<string | null>(null);

  const 것 = useAsync<AuthoringRow>(() => api.authoringRequest(service, id), [service, id]);
  const data = 것.data;
  const reload = 것.reload;
  const 도는중 = data !== null && !끝났나(data.status);

  // 맥이 뒤에서 이어 간다. 끝날 때까지만 다시 묻고 끝나면 멈춘다 (RunResult 와 같은 모양)
  useEffect(() => {
    if (!도는중) return;
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [도는중, reload]);

  if (것.error !== null) return <Failed error={것.error} />;
  if (data === null) return <Loading />;

  const 보 = 줄보임(data, Date.now());

  // **화면이 버튼을 안 그리는 것은 편의이지 방어가 아니다** — 서버 gate.ts 가 다시 막는다.
  // PR 주소가 없으면 머지할 대상 자체가 없다
  const 머지할수있나 = 할수있나(role, '작성머지') && data.status === 'DONE' && data.prUrl !== null;

  async function 머지건다() {
    if (머지중) return;
    set머지중(true);
    set머지오류(null);
    try {
      // 사람이 여기서 정하고 맥이 집어 실행한다. 맥은 판단하지 않는다 (도메인/작성 §3.6)
      const 선것 = await api.createAuthoringMerge(service, id);
      // **방금 만든 줄로 보낸다** (2026-09-23 검토가 잡았다). 이 화면에 머물면
      // 보고 있던 행은 그대로 `끝남` 이라 **아무 일도 안 일어난 것처럼 보이고**,
      // 사람이 또 누른다 — 누를 때마다 머지 요청이 하나씩 더 선다
      window.location.hash = `#/authoring/${선것.id}`;
    } catch (err) {
      set머지오류(message(err, 언어));
    } finally {
      set머지중(false);
    }
  }

  return (
    <>
      {/* 상세의 제목은 **그 대상 자체**다 — 실행 결과가 `RUN 2113` 을 쓰는 것과 같은 모양.
          자리 이름(`테스트 작성`)을 또 쓰면 어느 요청을 보고 있는지가 안 보인다 */}
      <Head 제목={`#${String(data.id)}`} 부제={종류라벨(data.kind, 언어)} />

      <div className="screen">
        <dl className="detail">
          <dt>{t('상태')}</dt>
          <dd>
            {보임라벨(보, 언어)}
            {/* **알려 주기만 하고 길을 안 주면 안 된다.** 멈춘 행은 지금 되살릴 방법이 없다 —
                집기는 대기 중인 것만 집고, 끝내기는 집은 쪽만 부를 수 있다 (2026-09-23 검토) */}
            {보 === 'stalled' ? <small>{t('맥이 멈춘 것 같습니다. 새 요청으로 다시 넣으세요')}</small> : null}
          </dd>

          <dt>{t('작업 단계')}</dt>
          <dd>{data.stage ?? t('기록 없음')}</dd>

          <dt>{t('요청한 사람')}</dt>
          <dd>{data.requestedByName}</dd>

          <dt>{t('집어 간 계정')}</dt>
          <dd>{data.claimedBy ?? t('기록 없음')}</dd>

          <dt>{t('요청한 시각')}</dt>
          <dd>{when(data.createdAt, 언어)}</dd>
        </dl>

        {/* 실패는 왜인지 말해야 한다. 「실패」만 뜨면 사람이 할 수 있는 일이 없다 */}
        {data.error === null ? null : <p className="error-text">{data.error}</p>}

        {data.prUrl === null ? null : (
          <p>
            <a href={data.prUrl} target="_blank" rel="noreferrer">
              {t('초안 PR 열기')}
            </a>
          </p>
        )}

        {머지할수있나 ? (
          <button className="btn" type="button" disabled={머지중} onClick={() => void 머지건다()}>
            {머지중 ? t('보내는 중') : t('머지')}
          </button>
        ) : null}

        {머지오류 === null ? null : <p className="error-text">{머지오류}</p>}
      </div>
    </>
  );
}
