// 설정 › 애플리케이션 「CI 토큰」 구획 — CI 가 새 빌드를 올릴 때 쓰는 토큰을 만들고 · 보고 · 끊는다 (도메인/실행 §3.11 · §7 「빌드마다 돌리기」)

import { useState } from 'react';

import { api, type SettingsServiceRow } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 오류문장 } from './SettingsService.js';
import { Failed, Loading, useAsync, when } from './ui.js';

type 탭 = 'github' | 'curl';

// 파일을 올리는 종류는 APK 를 보낸다. 화면 · API 는 배포가 끝난 뒤 알리기만 한다.
// 한국어가 든 템플릿 문자열은 messages.test.ts 가 막으므로 줄을 배열로 이어 붙인다
function 예시글(종류: SettingsServiceRow['kind'], 탭: 탭, env: string, 제목: string, 바탕: string): string {
  const 파일 = 종류 === 'APP' || 종류 === 'GAME';
  const github = 탭 === 'github';
  const 들여 = github ? '    ' : '';
  const 열쇠 = github ? '${{ secrets.QAHUB_TOKEN }}' : '$QAHUB_TOKEN';
  const 번호 = github ? '${{ github.run_number }}' : '$BUILD_NO';
  const 주소 = `${바탕}/api/builds?env=${encodeURIComponent(env)}&buildNo=${번호}`;
  const curl = [
    'curl --fail -X POST \\',
    `  -H "Authorization: Bearer ${열쇠}" \\`,
    ...(파일 ? ['  -H "Content-Type: application/octet-stream" \\', '  --data-binary @build/app-qa.apk \\'] : []),
    `  "${주소}"`,
  ].map((줄) => 들여 + 줄);
  return github ? ['- name: ' + 제목, '  run: |', ...curl].join('\n') : curl.join('\n');
}

export function CI토큰구획({ row }: { row: SettingsServiceRow }) {
  const t = use말();
  const 언어 = use언어();
  const list = useAsync(() => api.serviceTokens(row.id), [row.id]);
  const [이름, set이름] = useState('');
  const [오류, set오류] = useState<string | null>(null);
  const [보내는중, set보내는중] = useState(false);
  const [끊을것, set끊을것] = useState<number | null>(null);
  const [새토큰, set새토큰] = useState<string | null>(null);
  const [탭, set탭] = useState<탭>('github');
  const [env, setEnv] = useState('');
  const [복사, set복사] = useState<'token' | 'example' | null>(null);

  // 실서비스에는 CI 가 빌드를 못 올린다 — 고르개에 아예 안 둔다. 서버가 막는 칸(is_prod) 그대로 본다 — 저장된 줄이라 늘 온다
  const 서버들 = row.envs.filter((it) => it.isProd !== true);
  const 고른env = 서버들.some((it) => it.env === env) ? env : (서버들[0]?.env ?? '');
  const 종류 = row.kind ?? 'SCREEN';
  const 파일 = 종류 === 'APP' || 종류 === 'GAME';
  // 브라우저를 연 주소는 localhost 일 수 있어 CI 가 닿지 않는다 — 서버의 공개 주소가 있으면 그것을 쓴다 (GAME-F2-17)
  const 바탕 = list.data?.publicUrl ?? window.location.origin;
  const 예시 = 예시글(종류, 탭, 고른env, 파일 ? t('QA Hub 에 빌드 올리기') : t('QA Hub 에 빌드 알리기'), 바탕);

  async function 일하기(일: () => Promise<void>) {
    set오류(null);
    set보내는중(true);
    try {
      await 일();
      await list.reload();
    } catch (err) {
      set오류(오류문장(err, 언어));
    } finally {
      set보내는중(false);
    }
  }

  function 만들기() {
    if (이름.trim() === '') {
      set오류(t('토큰 이름을 적어 주세요'));
      return;
    }
    void 일하기(async () => {
      const r = await api.createServiceToken(row.id, 이름.trim());
      set새토큰(r.token);
      set복사(null);
      set이름('');
    });
  }

  // 클립보드는 https 에서만 열린다. http 로 연 사내 서버에는 navigator.clipboard 가 없어 그 자리에서 던진다 — 약속 안에서 불러 실패 갈래로 받는다(PhoneShell.tsx 와 같다). 토큰은 code 칸에서 골라 복사할 수 있다
  function 복사하기(글: string, 무엇: 'token' | 'example') {
    void Promise.resolve()
      .then(() => navigator.clipboard.writeText(글))
      .then(() => set복사(무엇), () => set복사(null));
  }

  // 처음 읽기에 실패했을 때만 구획을 오류로 바꾼다 — 만든 직후 다시 읽기가 실패해도 한 번만 보이는 토큰 상자가 사라지면 안 된다
  if (list.data === null) return list.error !== null ? <Failed error={list.error} /> : <Loading />;
  const 줄들 = list.data.tokens;

  return (
    <div className="set-ci">
      {오류 === null ? null : <p className="perf-err" role="alert">{오류}</p>}
      {list.error === null ? null : <p className="perf-err" role="alert">{list.error}</p>}
      {줄들.length === 0 ? (
        <div className="empty">{t('아직 만든 토큰이 없습니다')}</div>
      ) : (
        <div className="perf-table-box">
          <table className="perf-table">
            <thead>
              <tr>
                <th>{t('이름')}</th>
                <th>{t('만든 사람')}</th>
                <th>{t('만든 날')}</th>
                <th>{t('마지막 사용')}</th>
                <th aria-label={t('끊기')} />
              </tr>
            </thead>
            <tbody>
              {줄들.map((it) => (
                <tr key={it.tokenId}>
                  <td>{it.name}</td>
                  <td>{it.createdBy}</td>
                  <td className="perf-faint">{when(it.createdAt, 언어)}</td>
                  <td className="perf-faint">{it.lastUsedAt === null ? t('쓴 적 없음') : when(it.lastUsedAt, 언어)}</td>
                  <td>
                    {끊을것 === it.tokenId ? (
                      <div className="set-warn">
                        {t('이 토큰을 쓰는 CI 는 다음 빌드부터 올리지 못합니다')}{' '}
                        <button type="button" className="btn ghost set-warn" disabled={보내는중} onClick={() => void 일하기(async () => { await api.revokeServiceToken(row.id, it.tokenId); set끊을것(null); })}>
                          {t('끊는다')}
                        </button>{' '}
                        <button type="button" className="btn ghost" disabled={보내는중} onClick={() => set끊을것(null)}>
                          {t('그만두기')}
                        </button>
                      </div>
                    ) : (
                      <button type="button" className="btn ghost small" aria-label={t('{이름} 끊기', { 이름: it.name })} onClick={() => set끊을것(it.tokenId)}>
                        {t('끊기')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="perf-row">
        <input aria-label={t('토큰 이름')} value={이름} maxLength={100} onChange={(e) => set이름(e.target.value)} />
        <button type="button" className="btn" disabled={보내는중} onClick={만들기}>
          {t('토큰 만들기')}
        </button>
      </div>

      {새토큰 === null ? null : (
        <div className="set-pw">
          <strong>{t('토큰은 지금 한 번만 보입니다. 아래 순서대로 CI 에 넣으세요')}</strong>
          <div className="perf-cmd">
            <code>{새토큰}</code>
            <button type="button" className="btn ghost small" onClick={() => 복사하기(새토큰, 'token')}>
              {복사 === 'token' ? t('복사함') : t('복사')}
            </button>
          </div>
          <ol>
            <li>{t('CI 비밀값에 QAHUB_TOKEN 이름으로 위 토큰을 넣습니다')}</li>
            <li>
              {t('빌드 단계 뒤에 아래 한 단계를 붙입니다')}
              {서버들.length === 0 ? (
                <p className="hint">{t('실서비스가 아닌 대상 서버를 먼저 등록해야 빌드를 받을 수 있습니다')}</p>
              ) : (
                <label className="perf-field">
                  {t('대상 서버')}
                  <select value={고른env} onChange={(e) => setEnv(e.target.value)}>
                    {서버들.map((it) => (
                      <option key={it.env} value={it.env}>
                        {it.env}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </li>
          </ol>
          {서버들.length === 0 ? null : (
            <>
              <div className="perf-row">
                <button type="button" className={탭 === 'github' ? 'btn small' : 'btn ghost small'} aria-pressed={탭 === 'github'} onClick={() => set탭('github')}>
                  {t('GitHub Actions')}
                </button>
                <button type="button" className={탭 === 'curl' ? 'btn small' : 'btn ghost small'} aria-pressed={탭 === 'curl'} onClick={() => set탭('curl')}>
                  {t('그 밖의 CI (curl)')}
                </button>
              </div>
              <div className="perf-cmd">
                <pre>{예시}</pre>
                <button type="button" className="btn ghost small" onClick={() => 복사하기(예시, 'example')}>
                  {복사 === 'example' ? t('복사함') : t('예시 복사')}
                </button>
              </div>
              {파일 ? (
                <>
                  <p className="hint">{t('APK 경로는 CI 가 만든 파일로 바꿉니다. 회사 저장소에 올려 둔 APK 라면 파일 대신 JSON 으로 apkUrl 을 보내도 됩니다')}</p>
                  <p className="hint">{t('앱의 versionCode 를 빌드 번호와 같게 두면 폰에 다른 빌드가 깔렸을 때 실행 결과에서 알 수 있습니다')}</p>
                </>
              ) : (
                <p className="hint">{t('배포를 끝낸 뒤에 부릅니다')}</p>
              )}
            </>
          )}
          <button type="button" className="btn" onClick={() => set새토큰(null)}>
            {t('적었습니다')}
          </button>
        </div>
      )}
    </div>
  );
}
