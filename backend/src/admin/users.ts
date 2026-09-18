/** Cognito ListUsers が返すユーザーのうち、集計に使う項目だけを受け取る。 */
export type CognitoUserInput = {
  UserStatus?: string;
  Enabled?: boolean;
  UserCreateDate?: Date | string;
};

export type UserGrowthPoint = {
  /** JST の日付 (YYYY-MM-DD) */
  date: string;
  /** その日の新規登録数 */
  signups: number;
  /** その日までの累計ユーザー数 */
  cumulative: number;
};

export type UserStats = {
  total: number;
  confirmed: number;
  unconfirmed: number;
  disabled: number;
  newLast7Days: number;
  newLast30Days: number;
  growth: UserGrowthPoint[];
};

/** 推移グラフの期間（日数）。 */
const WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
/** JST の日付境界で集計するためのオフセット。Lambda は UTC で動くため自前でずらす。 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function jstDateKey(at: Date): string {
  return new Date(at.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Cognito のユーザー一覧から、管理画面に出す利用者統計を組み立てる。
 * 登録日を持たないユーザー（Cognito が返さないケース）は合計には入れるが推移には入れない。
 */
export function aggregateUsers(users: CognitoUserInput[], now: Date): UserStats {
  const createdAt: Date[] = [];
  let confirmed = 0;
  let disabled = 0;

  for (const user of users) {
    if (user.UserStatus === "CONFIRMED") confirmed += 1;
    if (user.Enabled === false) disabled += 1;
    if (user.UserCreateDate) createdAt.push(new Date(user.UserCreateDate));
  }

  const since = (days: number) =>
    createdAt.filter((at) => now.getTime() - at.getTime() <= days * DAY_MS).length;

  const signupsByDay = new Map<string, number>();
  for (const at of createdAt) {
    const key = jstDateKey(at);
    signupsByDay.set(key, (signupsByDay.get(key) ?? 0) + 1);
  }

  const firstDayKey = jstDateKey(new Date(now.getTime() - (WINDOW_DAYS - 1) * DAY_MS));
  // 期間開始より前に登録したユーザーは、初日の累計に最初から乗せる。
  let cumulative = createdAt.filter((at) => jstDateKey(at) < firstDayKey).length;

  const growth: UserGrowthPoint[] = [];
  for (let i = WINDOW_DAYS - 1; i >= 0; i -= 1) {
    const date = jstDateKey(new Date(now.getTime() - i * DAY_MS));
    const signups = signupsByDay.get(date) ?? 0;
    cumulative += signups;
    growth.push({ date, signups, cumulative });
  }

  return {
    total: users.length,
    confirmed,
    unconfirmed: users.length - confirmed,
    disabled,
    newLast7Days: since(7),
    newLast30Days: since(30),
    growth,
  };
}
