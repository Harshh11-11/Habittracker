"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  todayInZone,
  shiftDate,
  dayDiff,
  pretty,
} from "@/lib/dates";

/* ══════════════════ streak algebra ══════════════════ */

function currentStreak(
  desc: string[],
  today: string
): number {
  if (!desc.length) return 0;

  const gap = dayDiff(today, desc[0]);

  if (gap < 0 || gap > 1) return 0;

  let n = 1;
  let cur = desc[0];

  for (const d of desc.slice(1)) {
    if (dayDiff(cur, d) === 1) {
      n++;
      cur = d;
    } else {
      break;
    }
  }

  return n;
}

function longestStreak(
  desc: string[]
): number {
  if (!desc.length) return 0;

  let best = 1;
  let run = 1;

  for (let i = 1; i < desc.length; i++) {
    run =
      dayDiff(
        desc[i - 1],
        desc[i]
      ) === 1
        ? run + 1
        : 1;

    best = Math.max(
      best,
      run
    );
  }

  return best;
}

/* ══════════════════ validation ══════════════════ */

type Habit = {
  id: string;
  name: string;
  hue: number;
  createdOn: string;
  checkins: string[];
};

type Result =
  | { ok: true }
  | {
      ok: false;
      code:
        | "FUTURE_DATE"
        | "DUPLICATE_DAY"
        | "TOO_OLD";
      message: string;
    };

function validate(
  h: Habit,
  date: string,
  today: string,
  tz: string
): Result {
  if (dayDiff(date, today) > 0) {
    return {
      ok: false,
      code: "FUTURE_DATE",
      message: `${pretty(date)} hasn't begun in ${tz}`,
    };
  }

  if (h.checkins.includes(date)) {
    return {
      ok: false,
      code: "DUPLICATE_DAY",
      message: `${pretty(date)} already sealed`,
    };
  }

  const floor =
    dayDiff(
      h.createdOn,
      shiftDate(today, -365)
    ) > 0
      ? h.createdOn
      : shiftDate(today, -365);

  if (dayDiff(date, floor) < 0) {
    return {
      ok: false,
      code: "TOO_OLD",
      message: `beyond backfill horizon — ${pretty(
        floor
      )}`,
    };
  }

  return { ok: true };
}

/* ══════════════════ geometry ══════════════════ */

const RING = 28;
const R_OUT = 96;
const R_IN = 68;
const GAP = 1.6;

function arc(
  i: number,
  total: number,
  rOut: number,
  rIn: number
) {
  const step = 360 / total;

  const a0 =
    (i * step - 90 + GAP / 2) *
    (Math.PI / 180);

  const a1 =
    ((i + 1) * step - 90 - GAP / 2) *
    (Math.PI / 180);

  const P = (r: number, a: number) =>
    `${(r * Math.cos(a)).toFixed(2)} ${(
      r * Math.sin(a)
    ).toFixed(2)}`;

  const large = step > 180 ? 1 : 0;

  return `M ${P(
    rOut,
    a0
  )} A ${rOut} ${rOut} 0 ${large} 1 ${P(
    rOut,
    a1
  )} L ${P(
    rIn,
    a1
  )} A ${rIn} ${rIn} 0 ${large} 0 ${P(
    rIn,
    a0
  )} Z`;
}

const zones =
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("timeZone")
    : [
        "UTC",
        "Asia/Kolkata",
        "Europe/Berlin",
        "America/New_York",
      ];

/* ══════════════════ page ══════════════════ */

export default function Page() {
  const [habits, setHabits] =
    useState<Habit[] | null>(null);

  const [tz, setTz] = useState("UTC");

  const [timezoneSearch, setTimezoneSearch] =
    useState("");

  const [today, setToday] = useState("");
  const [draft, setDraft] = useState("");

  const [scrub, setScrub] = useState<{
    id: string;
    date: string;
  } | null>(null);

  const [flash, setFlash] = useState<{
    id: string;
    msg: string;
    bad: boolean;
  } | null>(null);

  const [sparks, setSparks] = useState<
    { key: number; id: string }[]
  >([]);

  const seq = useRef(0);

  /* ══════════════════ load user + habits ══════════════════ */

  useEffect(() => {
    async function loadUserAndHabits() {
      try {
        const userResponse =
          await fetch("/api/auth/me");

        if (!userResponse.ok) {
          window.location.href = "/login";
          return;
        }

        const userData =
          await userResponse.json();

        const userTimezone =
          userData.user.timezone;

        const habitsResponse =
          await fetch("/api/habits");

        if (!habitsResponse.ok) {
          throw new Error(
            "Unable to load habits."
          );
        }

        const habitsData =
          await habitsResponse.json();

        const loadedHabits: Habit[] =
          habitsData.habits.map(
            (
              h: {
                id: string;
                name: string;
                createdAt: string;
                checkIns: {
                  localDate: string;
                }[];
              },
              index: number
            ) => ({
              id: h.id,
              name: h.name,
              hue:
                (index * 67 + 168) % 360,
              createdOn:
                h.createdAt.slice(0, 10),
              checkins:
                h.checkIns.map(
                  (c) => c.localDate
                ),
            })
          );

        setTz(userTimezone);
        setHabits(loadedHabits);

        setToday(
          todayInZone(userTimezone)
        );
      } catch (error) {
        console.error(error);
        setHabits([]);
      }
    }

    loadUserAndHabits();
  }, []);

  /* ══════════════════ timezone clock ══════════════════ */

  useEffect(() => {
    if (!tz) return;

    setToday(todayInZone(tz));

    const timer = setInterval(() => {
      setToday(todayInZone(tz));
    }, 30_000);

    return () => clearInterval(timer);
  }, [tz]);

  /* ══════════════════ flash messages ══════════════════ */

  useEffect(() => {
    if (!flash) return;

    const t = setTimeout(
      () => setFlash(null),
      2600
    );

    return () => clearTimeout(t);
  }, [flash]);

  /* ══════════════════ timezone search ══════════════════ */

  const filteredZones = useMemo(() => {
    const search =
      timezoneSearch.trim().toLowerCase();

    if (!search) return zones;

    return zones.filter((zone) =>
      zone.toLowerCase().includes(search)
    );
  }, [timezoneSearch]);

  /* ══════════════════ days ══════════════════ */

  const days = useMemo(
    () =>
      today
        ? Array.from(
            { length: RING },
            (_, i) =>
              shiftDate(
                today,
                -(RING - 1 - i)
              )
          )
        : [],
    [today]
  );

  /* ══════════════════ clock ══════════════════ */

  const clock = useMemo(() => {
    if (!today) return "";

    return new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }
    ).format(new Date());
  }, [tz, today]);

  /* ══════════════════ check-in ══════════════════ */

  async function commit(
    h: Habit,
    date: string
  ) {
    /*
     * If already checked in, release it.
     */

    if (h.checkins.includes(date)) {
      try {
        const response = await fetch(
          "/api/habits/checkin",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              habitId: h.id,
              localDate: date,
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          setFlash({
            id: h.id,
            msg:
              data.error ||
              "Unable to remove check-in.",
            bad: true,
          });

          return;
        }

        setHabits((hs) =>
          hs!.map((x) =>
            x.id === h.id
              ? {
                  ...x,
                  checkins:
                    x.checkins.filter(
                      (d) => d !== date
                    ),
                }
              : x
          )
        );

        setFlash({
          id: h.id,
          msg: `${pretty(
            date
          )} released`,
          bad: false,
        });

        return;
      } catch (error) {
        console.error(error);

        setFlash({
          id: h.id,
          msg:
            "Unable to connect to the server.",
          bad: true,
        });

        return;
      }
    }

    /*
     * Validate before POST.
     */

    const res = validate(
      h,
      date,
      today,
      tz
    );

    if (!res.ok) {
      setFlash({
        id: h.id,
        msg: res.message,
        bad: true,
      });

      return;
    }

    try {
      const response = await fetch(
        "/api/habits/checkin",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            habitId: h.id,
            localDate: date,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setFlash({
          id: h.id,
          msg:
            data.error ||
            "Unable to save check-in.",
          bad: true,
        });

        return;
      }

      /*
       * Only update UI after DB succeeds.
       */

      setHabits((hs) =>
        hs!.map((x) =>
          x.id === h.id
            ? {
                ...x,
                checkins: [
                  ...x.checkins,
                  date,
                ].sort(),
              }
            : x
        )
      );

      const key = ++seq.current;

      setSparks((s) => [
        ...s,
        {
          key,
          id: h.id,
        },
      ]);

      setTimeout(() => {
        setSparks((s) =>
          s.filter(
            (x) => x.key !== key
          )
        );
      }, 700);

      setFlash({
        id: h.id,
        msg: `${pretty(
          date
        )} sealed`,
        bad: false,
      });
    } catch (error) {
      console.error(error);

      setFlash({
        id: h.id,
        msg:
          "Unable to connect to the server.",
        bad: true,
      });
    }
  }

  /* ══════════════════ create habit ══════════════════ */

  async function add(
    e: React.FormEvent
  ) {
    e.preventDefault();

    const name = draft
      .trim()
      .slice(0, 42);

    if (!name || !habits) return;

    try {
      const response = await fetch(
        "/api/habits",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setFlash({
          id: "new",
          msg:
            data.error ||
            "Unable to create habit.",
          bad: true,
        });

        return;
      }

      const created = data.habit;

      const newHabit: Habit = {
        id: created.id,
        name: created.name,
        hue:
          (habits.length * 67 + 168) %
          360,
        createdOn: today,
        checkins: [],
      };

      setHabits([
        ...habits,
        newHabit,
      ]);

      setDraft("");
    } catch (error) {
      console.error(error);

      setFlash({
        id: "new",
        msg:
          "Unable to connect to the server.",
        bad: true,
      });
    }
  }

  /* ══════════════════ loading ══════════════════ */

  if (!habits) {
    return <main className="void" />;
  }

  /* ══════════════════ UI ══════════════════ */

  return (
    <>
      <style>{css}</style>

      <main className="void">
        <div
          className="grid-bg"
          aria-hidden
        />

        <header className="hud">
          <div className="brand">
            <span className="pulse" />

            <span>
              ORBITAL / streak engine
            </span>
          </div>

          <div className="hud-right">
            <div className="timezone-control">
              <input
                type="text"
                value={timezoneSearch}
                onChange={(e) =>
                  setTimezoneSearch(
                    e.target.value
                  )
                }
                placeholder="search timezone..."
                aria-label="Search timezone"
                className="timezone-search"
              />

              <select
                value={tz}
                onChange={async (e) => {
                  const newTimezone =
                    e.target.value;

                  try {
                    const response =
                      await fetch(
                        "/api/auth/timezone",
                        {
                          method: "PATCH",
                          headers: {
                            "Content-Type":
                              "application/json",
                          },
                          body: JSON.stringify({
                            timezone:
                              newTimezone,
                          }),
                        }
                      );

                    const data =
                      await response.json();

                    if (!response.ok) {
                      setFlash({
                        id: "timezone",
                        msg:
                          data.error ||
                          "Unable to update timezone.",
                        bad: true,
                      });

                      return;
                    }

                    setTz(
                      data.user.timezone
                    );

                    setToday(
                      todayInZone(
                        data.user.timezone
                      )
                    );

                    setTimezoneSearch("");
                  } catch (error) {
                    console.error(error);

                    setFlash({
                      id: "timezone",
                      msg:
                        "Unable to connect to the server.",
                      bad: true,
                    });
                  }
                }}
                aria-label="Timezone"
                className="timezone-select"
              >
                {filteredZones.length > 0 ? (
                  filteredZones.map((z) => (
                    <option
                      key={z}
                      value={z}
                    >
                      {z}
                    </option>
                  ))
                ) : (
                  <option disabled>
                    No timezone found
                  </option>
                )}
              </select>
            </div>

            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch(
                    "/api/auth/logout",
                    {
                      method: "POST",
                    }
                  );
                } finally {
                  window.location.href =
                    "/login";
                }
              }}
            >
              Log out
            </button>

            <span className="clock">
              {clock}
            </span>

            <span className="civil">
              {today}
            </span>
          </div>
        </header>

        <form
          className="cmd"
          onSubmit={add}
        >
          <span className="caret">
            ▸
          </span>

          <input
            value={draft}
            onChange={(e) =>
              setDraft(e.target.value)
            }
            placeholder="define habit…"
            maxLength={42}
            aria-label="New habit"
          />

          <button
            type="submit"
            disabled={!draft.trim()}
          >
            deploy
          </button>
        </form>

        {habits.length === 0 && (
          <p className="hint">
            No orbits yet. Each ring is{" "}
            <b>{RING}</b> local days in{" "}
            <b>{tz}</b> — outer edge is
            today.
          </p>
        )}

        <section className="orbits">
          {habits.map((h) => {
            const desc = [
              ...h.checkins,
            ]
              .sort()
              .reverse();

            const cur =
              currentStreak(
                desc,
                today
              );

            const best =
              longestStreak(desc);

            const alive = cur > 0;

            const f =
              flash?.id === h.id
                ? flash
                : null;

            const scrubbed =
              scrub?.id === h.id
                ? scrub.date
                : null;

            const todayDone =
              h.checkins.includes(
                today
              );

            const burst =
              sparks.some(
                (s) => s.id === h.id
              );

            return (
              <article
                key={h.id}
                className={`orbit ${
                  f?.bad ? "shake" : ""
                } ${
                  alive ? "alive" : ""
                }`}
                style={
                  {
                    ["--hue" as string]:
                      h.hue,
                  }
                }
              >
                <div className="dial">
                  <svg
                    viewBox="-110 -110 220 220"
                    role="group"
                    aria-label={`${h.name} ring`}
                  >
                    <defs>
                      <radialGradient
                        id={`glow-${h.id}`}
                      >
                        <stop
                          offset="55%"
                          stopColor={`oklch(0.72 0.19 ${h.hue} / 0.28)`}
                        />

                        <stop
                          offset="100%"
                          stopColor="transparent"
                        />
                      </radialGradient>
                    </defs>

                    {alive && (
                      <circle
                        r="104"
                        fill={`url(#glow-${h.id})`}
                        className="halo"
                      />
                    )}

                    {days.map(
                      (d, i) => {
                        const done =
                          h.checkins.includes(
                            d
                          );

                        const isToday =
                          d === today;

                        const stale =
                          dayDiff(
                            d,
                            h.createdOn
                          ) < 0;

                        return (
                          <path
                            key={d}
                            d={arc(
                              i,
                              RING,
                              isToday
                                ? R_OUT + 7
                                : R_OUT,
                              R_IN
                            )}
                            className={`seg ${
                              done
                                ? "on"
                                : ""
                            } ${
                              isToday
                                ? "now"
                                : ""
                            } ${
                              stale
                                ? "stale"
                                : ""
                            } ${
                              scrubbed === d
                                ? "hi"
                                : ""
                            }`}
                            onMouseEnter={() =>
                              setScrub({
                                id: h.id,
                                date: d,
                              })
                            }
                            onMouseLeave={() =>
                              setScrub(null)
                            }
                            onClick={() =>
                              commit(h, d)
                            }
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (
                                e.key ===
                                  "Enter" ||
                                e.key === " "
                              ) {
                                e.preventDefault();

                                commit(
                                  h,
                                  d
                                );
                              }
                            }}
                          />
                        );
                      }
                    )}

                    <path
                      d={arc(
                        0,
                        RING,
                        R_OUT + 7,
                        R_IN
                      )}
                      transform={`rotate(${
                        360 / RING
                      })`}
                      className="seg future"
                      onMouseEnter={() =>
                        setScrub({
                          id: h.id,
                          date: shiftDate(
                            today,
                            1
                          ),
                        })
                      }
                      onMouseLeave={() =>
                        setScrub(null)
                      }
                      onClick={() =>
                        setFlash({
                          id: h.id,
                          msg: `${pretty(
                            shiftDate(
                              today,
                              1
                            )
                          )} hasn't begun in ${tz}`,
                          bad: true,
                        })
                      }
                    />

                    {burst &&
                      Array.from(
                        { length: 14 },
                        (_, i) => (
                          <line
                            key={i}
                            className="spark"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="-104"
                            transform={`rotate(${
                              (360 / 14) *
                              i
                            })`}
                            style={{
                              animationDelay: `${i * 12}ms`,
                            }}
                          />
                        )
                      )}
                  </svg>

                  <button
                    className={`core ${
                      todayDone
                        ? "sealed"
                        : ""
                    }`}
                    onClick={() =>
                      commit(
                        h,
                        today
                      )
                    }
                    aria-label={
                      todayDone
                        ? "Release today"
                        : "Log today"
                    }
                  >
                    <b>{cur}</b>

                    <em>
                      {todayDone
                        ? "today sealed"
                        : "tap to seal"}
                    </em>
                  </button>
                </div>

                <div className="meta">
                  <h2>{h.name}</h2>

                  <dl>
                    <div>
                      <dt>
                        current
                      </dt>

                      <dd>{cur}</dd>
                    </div>

                    <div>
                      <dt>
                        longest
                      </dt>

                      <dd>{best}</dd>
                    </div>

                    <div>
                      <dt>
                        total
                      </dt>

                      <dd>
                        {h.checkins.length}
                      </dd>
                    </div>
                  </dl>

                  <p
                    className={
                      f
                        ? f.bad
                          ? "read bad"
                          : "read good"
                        : "read"
                    }
                  >
                    {f
                      ? f.msg
                      : scrubbed
                      ? `${pretty(
                          scrubbed
                        )} · ${
                          h.checkins.includes(
                            scrubbed
                          )
                            ? "sealed"
                            : "open"
                        }`
                      : alive
                      ? `unbroken since ${pretty(
                          shiftDate(
                            desc[0],
                            -(cur - 1)
                          )
                        )}`
                      : "dormant — seal today to ignite"}
                  </p>
                </div>
              </article>
            );
          })}
        </section>

        <footer className="foot">
          days are civil calendar dates,
          never 24h windows · changing zone
          never rewrites history
        </footer>
      </main>
    </>
  );
}

/* ══════════════════ styling ══════════════════ */

const css = `
.void{
  --bg:oklch(0.16 0.02 265);
  --ink:oklch(0.96 0.01 260);
  --dim:oklch(0.62 0.03 265);
  --line:oklch(0.32 0.03 265);
  --bad:oklch(0.68 0.2 22);

  position:relative;
  min-height:100vh;

  background:
    radial-gradient(
      120% 90% at 50% -10%,
      oklch(0.24 0.06 270),
      var(--bg) 60%
    );

  color:var(--ink);

  font-family:
    ui-monospace,
    "SF Mono",
    Menlo,
    monospace;

  overflow-x:hidden;

  padding:clamp(1rem,4vw,3rem);
}

.void *{
  box-sizing:border-box;
}

.grid-bg{
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:.5;

  background-image:
    linear-gradient(
      var(--line) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      var(--line) 1px,
      transparent 1px
    );

  background-size:56px 56px;

  mask-image:
    radial-gradient(
      80% 60% at 50% 20%,
      #000,
      transparent
    );
}

.hud{
  position:relative;

  display:flex;
  justify-content:space-between;
  gap:1rem;
  flex-wrap:wrap;
  align-items:center;

  font-size:.68rem;
  letter-spacing:.18em;
  text-transform:uppercase;

  color:var(--dim);

  border-bottom:1px solid var(--line);

  padding-bottom:.9rem;
}

.brand{
  display:flex;
  align-items:center;
  gap:.55rem;
}

.pulse{
  width:7px;
  height:7px;

  border-radius:50%;

  background:oklch(0.78 0.2 150);

  box-shadow:
    0 0 0 0
    oklch(0.78 0.2 150/.6);

  animation:pulse 2s infinite;
}

@keyframes pulse{
  70%{
    box-shadow:
      0 0 0 9px transparent;
  }

  100%{
    box-shadow:
      0 0 0 0 transparent;
  }
}

.hud-right{
  display:flex;
  align-items:center;
  justify-content:flex-end;
  gap:1rem;
  flex-wrap:nowrap;
}

.timezone-control{
  display:flex;
  align-items:center;
  gap:.4rem;
  flex-shrink:0;
}

.timezone-search{
  width:150px;

  font:inherit;
  font-size:.62rem;
  letter-spacing:.06em;

  background:oklch(0.19 0.025 265);

  color:var(--ink);

  border:1px solid var(--line);
  border-radius:2px;

  padding:.35rem .5rem;

  outline:none;
}

.timezone-search::placeholder{
  color:var(--dim);
}

.timezone-search:focus{
  border-color:
    oklch(0.7 0.16 200);

  box-shadow:
    0 0 18px -8px
    oklch(0.7 0.16 200/.7);
}

.timezone-select{
  width:175px;
  min-width:175px;

  font:inherit;
  font-size:.62rem;
  letter-spacing:.06em;

  background:oklch(0.19 0.025 265);

  color:var(--ink);

  border:1px solid var(--line);
  border-radius:2px;

  padding:.35rem .5rem;

  outline:none;

  color-scheme:dark;

  cursor:pointer;
}

.timezone-select:focus{
  border-color:
    oklch(0.7 0.16 200);

  box-shadow:
    0 0 18px -8px
    oklch(0.7 0.16 200/.7);
}

.timezone-select option{
  background:#111318;
  color:#f5f7fa;
}

.hud-right button{
  font:inherit;
  font-size:.68rem;
  letter-spacing:.1em;
  text-transform:uppercase;

  background:transparent;

  color:var(--dim);

  border:1px solid var(--line);
  border-radius:2px;

  padding:.3rem .55rem;

  cursor:pointer;
}

.hud-right button:hover{
  color:var(--ink);
  border-color:var(--ink);
}

.clock{
  font-variant-numeric:tabular-nums;
  color:var(--ink);
  letter-spacing:.1em;
}

.civil{
  color:var(--dim);
}

.cmd{
  position:relative;

  display:flex;
  align-items:center;
  gap:.7rem;

  margin:2rem 0 .4rem;

  border:1px solid var(--line);
  border-radius:3px;

  padding:.55rem .8rem;

  background:
    oklch(0.2 0.03 265/.7);

  backdrop-filter:blur(6px);
}

.cmd:focus-within{
  border-color:
    oklch(0.7 0.16 200);

  box-shadow:
    0 0 24px -8px
    oklch(0.7 0.16 200/.7);
}

.caret{
  color:oklch(0.75 0.17 190);
}

.cmd input{
  flex:1;

  font:inherit;
  font-size:.9rem;

  background:transparent;

  border:0;

  color:var(--ink);

  outline:0;
}

.cmd button{
  font:inherit;
  font-size:.66rem;
  letter-spacing:.18em;
  text-transform:uppercase;

  cursor:pointer;

  background:
    oklch(0.75 0.17 190);

  color:
    oklch(0.18 0.03 240);

  border:0;
  border-radius:2px;

  padding:.45rem .9rem;
}

.cmd button:disabled{
  opacity:.3;
  cursor:not-allowed;
}

.hint{
  position:relative;

  color:var(--dim);

  font-size:.8rem;

  margin-top:2rem;
}

.orbits{
  position:relative;

  display:grid;
  gap:1rem;

  margin-top:2.2rem;

  grid-template-columns:
    repeat(
      auto-fill,
      minmax(min(100%,21rem),1fr)
    );
}

.orbit{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:1rem;

  padding:1.6rem 1.2rem 1.3rem;

  border:1px solid var(--line);
  border-radius:4px;

  background:
    oklch(0.19 0.025 265/.62);

  transition:
    border-color .3s,
    transform .3s,
    box-shadow .3s;
}

.orbit:hover{
  transform:translateY(-3px);

  border-color:
    oklch(0.6 0.1 var(--hue));
}

.orbit.alive{
  box-shadow:
    inset 0 0 60px -30px
    oklch(0.7 0.19 var(--hue)/.8);
}

.orbit.shake{
  animation:
    shake .42s cubic-bezier(.36,.07,.19,.97);

  border-color:var(--bad);
}

@keyframes shake{
  10%,90%{
    transform:translateX(-2px);
  }

  20%,80%{
    transform:translateX(4px);
  }

  30%,50%,70%{
    transform:translateX(-7px);
  }

  40%,60%{
    transform:translateX(7px);
  }
}

.dial{
  position:relative;

  width:min(100%,15rem);

  aspect-ratio:1;
}

.dial svg{
  width:100%;
  height:100%;
  overflow:visible;
}

.halo{
  animation:
    breathe 4.5s ease-in-out infinite;
}

@keyframes breathe{
  50%{
    opacity:.45;
    transform:scale(1.04);
  }
}

.seg{
  fill:oklch(0.28 0.03 265);

  stroke:oklch(0.34 0.03 265);

  stroke-width:.5;

  cursor:pointer;

  transition:
    fill .16s,
    transform .16s;

  transform-origin:0 0;

  outline:0;
}

.seg:hover,
.seg.hi,
.seg:focus-visible{
  fill:
    oklch(0.5 0.09 var(--hue));

  transform:scale(1.045);
}

.seg.on{
  fill:
    oklch(0.72 0.19 var(--hue));

  stroke:
    oklch(0.82 0.16 var(--hue));
}

.seg.on:hover{
  fill:
    oklch(0.8 0.17 var(--hue));
}

.seg.now{
  stroke:var(--ink);
  stroke-width:1.1;
}

.seg.stale{
  opacity:.28;
  cursor:not-allowed;
}

.seg.future{
  fill:transparent;

  stroke:var(--bad);

  stroke-dasharray:3 3;

  cursor:not-allowed;
}

.seg.future:hover{
  fill:
    oklch(0.4 0.12 22/.45);

  transform:none;
}

.spark{
  stroke:
    oklch(0.92 0.14 var(--hue));

  stroke-width:1.4;

  stroke-linecap:round;

  transform-box:fill-box;

  animation:
    spark .58s ease-out forwards;
}

@keyframes spark{
  from{
    opacity:1;

    stroke-dasharray:
      0 104;

    stroke-dashoffset:-70;
  }

  to{
    opacity:0;

    stroke-dasharray:
      26 104;

    stroke-dashoffset:-104;
  }
}

.core{
  position:absolute;

  inset:34%;

  border-radius:50%;

  display:flex;

  flex-direction:column;

  align-items:center;

  justify-content:center;

  gap:.15rem;

  cursor:pointer;

  font:inherit;

  background:
    oklch(0.21 0.03 265);

  border:1px solid var(--line);

  transition:.22s;
}

.core:hover{
  border-color:
    oklch(0.75 0.18 var(--hue));

  box-shadow:
    0 0 34px -10px
    oklch(0.7 0.19 var(--hue));
}

.core:active{
  transform:scale(.94);
}

.core.sealed{
  background:
    oklch(0.24 0.06 var(--hue));

  border-color:
    oklch(0.7 0.18 var(--hue));
}

.core b{
  font-size:2.5rem;

  line-height:1;

  font-variant-numeric:
    tabular-nums;

  color:
    oklch(0.88 0.15 var(--hue));

  text-shadow:
    0 0 22px
    oklch(0.7 0.2 var(--hue)/.7);
}

.core em{
  font-style:normal;

  font-size:.52rem;

  letter-spacing:.14em;

  text-transform:uppercase;

  color:var(--dim);
}

.meta{
  width:100%;
  text-align:center;
}

.meta h2{
  margin:0;

  font-size:1rem;

  font-weight:500;

  letter-spacing:.02em;
}

.meta dl{
  display:flex;

  justify-content:center;

  gap:1.3rem;

  margin:.75rem 0 .55rem;
}

.meta dl div{
  display:flex;

  flex-direction:column;

  gap:.1rem;
}

.meta dt{
  font-size:.52rem;

  letter-spacing:.16em;

  text-transform:uppercase;

  color:var(--dim);
}

.meta dd{
  margin:0;

  font-size:1rem;

  font-variant-numeric:
    tabular-nums;
}

.read{
  margin:0;

  font-size:.7rem;

  color:var(--dim);

  min-height:1.1rem;

  transition:color .2s;
}

.read.bad{
  color:var(--bad);
}

.read.good{
  color:
    oklch(0.82 0.16 150);
}

.foot{
  position:relative;

  margin-top:3rem;

  border-top:1px solid var(--line);

  padding-top:1rem;

  font-size:.62rem;

  letter-spacing:.12em;

  text-transform:uppercase;

  color:var(--dim);
}

@media(max-width:900px){
  .hud-right{
    flex-wrap:wrap;
    justify-content:flex-end;
  }

  .timezone-control{
    flex-shrink:1;
  }

  .timezone-search{
    width:140px;
  }

  .timezone-select{
    width:165px;
    min-width:165px;
  }
}

@media(max-width:650px){
  .hud{
    align-items:flex-start;
  }

  .hud-right{
    width:100%;
    justify-content:flex-start;
    flex-wrap:wrap;
    gap:.5rem;
  }

  .timezone-control{
    width:100%;
  }

  .timezone-search,
  .timezone-select{
    min-width:0;
  }

  .timezone-search{
    flex:1;
    width:auto;
  }

  .timezone-select{
    flex:1;
    width:auto;
  }

  .clock,
  .civil{
    font-size:.6rem;
  }
}

@media(prefers-reduced-motion:reduce){
  .void *{
    animation:none!important;
    transition:none!important;
  }
}
`;