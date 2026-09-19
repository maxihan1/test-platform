// 설정 화면 (SPEC §8.8). 서비스와 계정을 여기서 만들고 고친다. 운영 등급에게만 보인다
// 책상에서만 쓰는 화면이라 좁은 화면 대응을 하지 않는다 (§8)

import { useState } from 'react';

import { api, type EnvRow, type SettingsServiceRow, type UserRow } from './api.js';
import { 등급, 할수있나 } from './role.js';
import { 마지막운영계정인가, 색사유, 설정오류문장, 접두사사유, 웹훅칸 } from './settingsView.js';
import { Failed, Loading, message, useAsync } from './ui.js';

const 등급이름: Record<등급, string> = { viewer: '보기만', operator: '실행까지', admin: '운영' };
const 등급들: 등급[] = ['viewer', 'operator', 'admin'];

export function Settings({ role }: { role: 등급 | null }) {
  const services = useAsync<{ items: SettingsServiceRow[] }>(() => api.settingsServices(), []);
  const users = useAsync<{ items: UserRow[] }>(() => api.settingsUsers(), []);

  // 서버 gate.ts 가 이미 막지만, 주소를 직접 친 사람에게 403 대신 이유를 보여준다
  if (!할수있나(role, '설정')) {
    return (
      <div className="screen">
        <div className="empty">
          설정은 운영 등급만 볼 수 있습니다
          <small>필요하면 운영 등급인 사람에게 올려 달라고 합니다</small>
        </div>
      </div>
    );
  }

  if (services.error !== null) return <Failed error={services.error} />;
  if (services.data === null || users.data === null) return <Loading />;

  return (
    <div className="screen">
      <ServiceSection rows={services.data.items} onDone={services.reload} />
      <UserSection
        rows={users.data.items}
        services={services.data.items}
        onDone={users.reload}
      />
    </div>
  );
}

/* ── 서비스 ────────────────────────────────────────────────────── */

function ServiceSection({ rows, onDone }: { rows: SettingsServiceRow[]; onDone: () => void }) {
  const [여는것, set여는것] = useState<number | 'new' | null>(null);

  return (
    <section className="sec">
      <div className="sec-h">
        <span>서비스</span>
        <button className="btn ghost" onClick={() => set여는것(여는것 === 'new' ? null : 'new')}>
          {여는것 === 'new' ? '닫기' : '더하기'}
        </button>
      </div>

      {여는것 === 'new' ? (
        <ServiceForm
          onDone={() => {
            set여는것(null);
            onDone();
          }}
        />
      ) : null}

      {rows.length === 0 ? (
        <div className="empty">
          아직 서비스가 없습니다
          <small>위 「더하기」로 첫 서비스를 만듭니다</small>
        </div>
      ) : (
        rows.map((it) => (
          <div key={it.id}>
            <div className="set-row">
              {/* 띠에서 쓸 색을 여기서 그대로 보여준다. 글자만 보고는 어떤 색인지 모른다 */}
              <span className="set-swatch" style={{ background: it.color }} aria-hidden="true" />
              <span className="set-name">
                {it.name}
                {it.isActive ? null : <span className="chip">비활성</span>}
              </span>
              <span className="set-sub">{it.prefix}-</span>
              <span className="set-sub">케이스 {it.caseCount}건</span>
              <span className="set-sub">
                {it.envs.length === 0 ? '대상 서버 없음' : `대상 서버 ${String(it.envs.length)}개`}
              </span>
              <button
                className="btn ghost"
                onClick={() => set여는것(여는것 === it.id ? null : it.id)}
              >
                {여는것 === it.id ? '닫기' : '고치기'}
              </button>
            </div>
            {여는것 === it.id ? (
              <ServiceForm
                row={it}
                onDone={() => {
                  set여는것(null);
                  onDone();
                }}
              />
            ) : null}
          </div>
        ))
      )}
    </section>
  );
}

function ServiceForm({ row, onDone }: { row?: SettingsServiceRow; onDone: () => void }) {
  const 새것 = row === undefined;
  const [prefix, setPrefix] = useState(row?.prefix ?? '');
  const [name, setName] = useState(row?.name ?? '');
  const [color, setColor] = useState(row?.color ?? '#3A5FCD');
  const [testsRepo, setTestsRepo] = useState(row?.testsRepo ?? '');
  const [testsDir, setTestsDir] = useState(row?.testsDir ?? '');
  const [envs, setEnvs] = useState<EnvRow[]>(row?.envs ?? []);
  // 빈 글자와 「안 건드림」은 다르다. null 이면 서버에 아예 안 보낸다 (지금 것을 그대로 둔다)
  const [webhook, setWebhook] = useState<string | null>(새것 ? '' : null);
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const 접두사틀림 = 접두사사유(prefix);
  const 색틀림 = 색사유(color);
  const 웹훅 = 웹훅칸(row?.hasSlackWebhook ?? false);
  const 채웠나 = name !== '' && testsDir !== '' && (!새것 || prefix !== '');

  async function 보낸다() {
    set보내는중(true);
    setErr(null);
    try {
      if (새것) {
        await api.createService({
          prefix,
          name,
          color,
          testsRepo,
          testsDir,
          envs,
          ...(webhook === null || webhook === '' ? {} : { slackWebhook: webhook }),
        });
      } else {
        // 접두사는 안 보낸다. 보내면 서버가 400 PREFIX_IMMUTABLE 을 낸다 (SPEC §8.8)
        await api.updateService(row.id, {
          name,
          color,
          testsRepo,
          testsDir,
          envs,
          ...(webhook === null ? {} : { slackWebhook: webhook }),
        });
      }
      onDone();
    } catch (e) {
      setErr(e instanceof Error && 'code' in e ? 설정오류문장(String(e.code)) : message(e));
    } finally {
      set보내는중(false);
    }
  }

  return (
    <div className="set-form">
      <div className="field">
        <label htmlFor="sf-prefix">접두사</label>
        <div>
          <input
            id="sf-prefix"
            value={prefix}
            disabled={!새것}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            placeholder="PAY"
          />
          <div className="hint">
            {새것
              ? '만들 때만 정합니다. 케이스 번호(PAY-001) 안에 박히므로 나중에 바꿀 수 없습니다'
              : '만든 뒤에는 바꿀 수 없습니다. 케이스 번호 안에 이미 박혀 있습니다'}
          </div>
          {접두사틀림 === null ? null : <div className="err">{접두사틀림}</div>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="sf-name">이름</label>
        <input id="sf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="결제 서비스" />
      </div>

      <div className="field">
        <label htmlFor="sf-color">색</label>
        <div className="set-color">
          <input id="sf-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          <input
            className="set-hex"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="색 코드"
          />
          <span className="set-preview" style={{ background: color }}>
            {name === '' ? '띠 미리보기' : name}
          </span>
        </div>
      </div>
      {/* 막지 않고 알린다. 기준을 아는 사람이 일부러 쓸 수도 있다 (DESIGN.md) */}
      {색틀림 === null ? null : (
        <div className="field">
          <span />
          <div className="err">{색틀림}</div>
        </div>
      )}

      <div className="field">
        <label htmlFor="sf-dir">테스트 폴더</label>
        <div>
          <input id="sf-dir" value={testsDir} onChange={(e) => setTestsDir(e.target.value)} placeholder="pay" />
          <div className="hint">플랫폼이 실제로 훑을 폴더입니다</div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="sf-repo">테스트 저장소</label>
        <div>
          <input
            id="sf-repo"
            value={testsRepo}
            onChange={(e) => setTestsRepo(e.target.value)}
            placeholder="https://github.com/..."
          />
          <div className="hint">적어 두기만 합니다. 플랫폼이 받아오지는 않습니다</div>
        </div>
      </div>

      <EnvEditor envs={envs} onChange={setEnvs} />

      <div className="field">
        <label htmlFor="sf-hook">Slack 웹훅</label>
        <div>
          {webhook === null ? (
            <div className="set-hook">
              <span>{웹훅.글}</span>
              <button className="btn ghost" onClick={() => setWebhook('')}>
                {웹훅.버튼}
              </button>
            </div>
          ) : (
            <input
              id="sf-hook"
              type="password"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/..."
            />
          )}
          <div className="hint">
            비밀값이라 한 번 넣으면 되돌려 보여주지 않습니다. 비우면 그 서비스는 알림을 안 보냅니다
          </div>
        </div>
      </div>

      {err === null ? null : <div className="err">{err}</div>}

      <div className="set-foot">
        {새것 ? null : (
          <button
            className="btn ghost"
            disabled={보내는중}
            onClick={() => {
              void api
                .updateService(row.id, { isActive: !row.isActive })
                .then(onDone)
                .catch((e: unknown) => setErr(message(e)));
            }}
          >
            {row.isActive ? '비활성으로 내리기' : '다시 활성으로'}
          </button>
        )}
        {/* 버튼은 살아 있고 왜 안 되는지를 말한다 (SPEC §8.2 · DESIGN.md) */}
        <button className="btn" disabled={보내는중} onClick={() => void 보낸다()}>
          {새것 ? '서비스 만들기' : '저장'}
        </button>
      </div>
      {채웠나 && 접두사틀림 === null ? null : (
        <div className="hint set-why">
          {접두사틀림 !== null ? '접두사 모양을 고칩니다' : '이름과 테스트 폴더는 있어야 합니다'}
        </div>
      )}
    </div>
  );
}

/** 대상 서버는 여러 줄이다. 환경변수 한 줄로는 서비스가 셋만 되어도 안 들어간다 (SPEC §8.8) */
function EnvEditor({ envs, onChange }: { envs: EnvRow[]; onChange: (next: EnvRow[]) => void }) {
  return (
    <div className="field">
      <label>대상 서버</label>
      <div className="set-envs">
        {envs.map((it, i) => (
          <div className="set-env" key={i}>
            <input
              value={it.env}
              placeholder="qa"
              aria-label={`대상 서버 ${String(i + 1)} 키`}
              onChange={(e) => onChange(envs.map((v, k) => (k === i ? { ...v, env: e.target.value } : v)))}
            />
            <input
              value={it.baseUrl}
              placeholder="https://qa.example.com"
              aria-label={`대상 서버 ${String(i + 1)} 주소`}
              onChange={(e) => onChange(envs.map((v, k) => (k === i ? { ...v, baseUrl: e.target.value } : v)))}
            />
            <button
              className="btn ghost"
              aria-label={`대상 서버 ${String(i + 1)} 빼기`}
              onClick={() => onChange(envs.filter((_, k) => k !== i))}
            >
              빼기
            </button>
          </div>
        ))}
        <button className="btn ghost" onClick={() => onChange([...envs, { env: '', baseUrl: '' }])}>
          줄 더하기
        </button>
        {envs.length === 0 ? (
          <div className="hint">하나도 없으면 실행 설정에서 고를 것이 없어 실행을 못 합니다</div>
        ) : null}
      </div>
    </div>
  );
}

/* ── 계정 ──────────────────────────────────────────────────────── */

function UserSection({
  rows,
  services,
  onDone,
}: {
  rows: UserRow[];
  services: SettingsServiceRow[];
  onDone: () => void;
}) {
  const [여는것, set여는것] = useState<string | 'new' | null>(null);
  // 만든 직후 한 번만 보여준다. 닫으면 다시 못 본다 (SPEC §8.8)
  const [임시비밀번호, set임시비밀번호] = useState<{ username: string; password: string } | null>(null);

  return (
    <section className="sec">
      <div className="sec-h">
        <span>계정</span>
        <button className="btn ghost" onClick={() => set여는것(여는것 === 'new' ? null : 'new')}>
          {여는것 === 'new' ? '닫기' : '더하기'}
        </button>
      </div>

      {임시비밀번호 === null ? null : (
        <div className="set-pw">
          <div>
            <b>{임시비밀번호.username}</b> 의 임시 비밀번호는 <code>{임시비밀번호.password}</code> 입니다
          </div>
          <div className="hint">
            지금 적어서 본인에게 전합니다. <b>닫으면 다시 볼 수 없습니다</b> — 잊으면 다시 만듭니다
          </div>
          <button className="btn ghost" onClick={() => set임시비밀번호(null)}>
            적었습니다
          </button>
        </div>
      )}

      {여는것 === 'new' ? (
        <UserForm
          services={services}
          onCreated={(username, password) => {
            set임시비밀번호({ username, password });
            set여는것(null);
            onDone();
          }}
        />
      ) : null}

      {rows.map((it) => (
        <div key={it.username}>
          <div className="set-row">
            <span className="set-swatch set-none" aria-hidden="true" />
            <span className="set-name">
              {it.displayName}
              {it.isActive ? null : <span className="chip">비활성</span>}
            </span>
            <span className="set-sub">{it.username}</span>
            <span className="set-sub">
              {it.services.length === 0 ? '배정 없음' : it.services.join(' · ')}
            </span>
            <span className="set-sub">{등급이름[it.role]}</span>
            <button
              className="btn ghost"
              onClick={() => set여는것(여는것 === it.username ? null : it.username)}
            >
              {여는것 === it.username ? '닫기' : '고치기'}
            </button>
          </div>
          {여는것 === it.username ? (
            <UserForm
              row={it}
              rows={rows}
              services={services}
              onDone={() => {
                set여는것(null);
                onDone();
              }}
              onPassword={(password) => set임시비밀번호({ username: it.username, password })}
            />
          ) : null}
        </div>
      ))}
    </section>
  );
}

function UserForm({
  row,
  rows = [],
  services,
  onDone,
  onCreated,
  onPassword,
}: {
  row?: UserRow;
  rows?: UserRow[];
  services: SettingsServiceRow[];
  onDone?: () => void;
  onCreated?: (username: string, password: string) => void;
  onPassword?: (password: string) => void;
}) {
  const 새것 = row === undefined;
  const [username, setUsername] = useState(row?.username ?? '');
  const [displayName, setDisplayName] = useState(row?.displayName ?? '');
  const [role, setRole] = useState<등급>(row?.role ?? 'viewer');
  const [배정, set배정] = useState<string[]>(row?.services ?? []);
  const [보내는중, set보내는중] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 맞으면 등급을 낮추거나 내리는 길을 아예 안 그린다 (SPEC §3.5 · §7)
  const 마지막운영 = row !== undefined && 마지막운영계정인가(rows, row.username);

  async function 보낸다() {
    set보내는중(true);
    setErr(null);
    try {
      if (새것) {
        const { tempPassword } = await api.createUser({ username, displayName, role, services: 배정 });
        onCreated?.(username, tempPassword);
      } else {
        await api.updateUser(row.username, { displayName, role, services: 배정 });
        onDone?.();
      }
    } catch (e) {
      setErr(e instanceof Error && 'code' in e ? 설정오류문장(String(e.code)) : message(e));
    } finally {
      set보내는중(false);
    }
  }

  return (
    <div className="set-form">
      <div className="field">
        <label htmlFor="uf-id">아이디</label>
        <input
          id="uf-id"
          value={username}
          disabled={!새것}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="kim"
        />
      </div>

      <div className="field">
        <label htmlFor="uf-name">이름</label>
        <input
          id="uf-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="김철수"
        />
      </div>

      <div className="field">
        <label htmlFor="uf-role">등급</label>
        <div>
          {마지막운영 ? (
            <div className="hint">
              <b>운영</b> — 마지막 운영 계정이라 등급을 낮출 수 없습니다. 먼저 다른 사람을 운영으로 올립니다
            </div>
          ) : (
            <select id="uf-role" value={role} onChange={(e) => setRole(e.target.value as 등급)}>
              {등급들.map((it) => (
                <option key={it} value={it}>
                  {등급이름[it]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="field">
        <label>서비스</label>
        <div className="set-picks">
          {services.length === 0 ? (
            <span className="hint">먼저 서비스를 만듭니다</span>
          ) : (
            services.map((s) => (
              <label key={s.prefix} className="set-pick">
                <input
                  type="checkbox"
                  checked={배정.includes(s.prefix)}
                  onChange={(e) =>
                    set배정(
                      e.target.checked ? [...배정, s.prefix] : 배정.filter((p) => p !== s.prefix),
                    )
                  }
                />
                {s.name}
              </label>
            ))
          )}
          <div className="hint">배정받지 않은 서비스는 그 사람의 띠에 뜨지 않습니다</div>
        </div>
      </div>

      {새것 ? (
        <div className="field">
          <span />
          <div className="hint">
            비밀번호는 시스템이 만듭니다. 만든 직후 <b>한 번만</b> 보여 줍니다
          </div>
        </div>
      ) : null}

      {err === null ? null : <div className="err">{err}</div>}

      <div className="set-foot">
        {새것 ? null : (
          <>
            <button
              className="btn ghost"
              disabled={보내는중}
              onClick={() => {
                void api
                  .resetPassword(row.username)
                  .then(({ tempPassword }) => onPassword?.(tempPassword))
                  .catch((e: unknown) => setErr(message(e)));
              }}
            >
              비밀번호 다시 만들기
            </button>
            {/* 마지막 운영 계정은 내리는 길 자체가 없다. 막히면 설정 자리에 아무도 못 들어간다 */}
            {마지막운영 ? null : (
              <button
                className="btn ghost"
                disabled={보내는중}
                onClick={() => {
                  void api
                    .updateUser(row.username, { isActive: !row.isActive })
                    .then(() => onDone?.())
                    .catch((e: unknown) => setErr(message(e)));
                }}
              >
                {row.isActive ? '비활성으로 내리기' : '다시 활성으로'}
              </button>
            )}
          </>
        )}
        <button
          className="btn"
          disabled={보내는중 || username === '' || displayName === ''}
          onClick={() => void 보낸다()}
        >
          {새것 ? '계정 만들기' : '저장'}
        </button>
      </div>
    </div>
  );
}
