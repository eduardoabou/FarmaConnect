export type SqlValue = string | number | null;
export type SqlRow = Record<string, unknown>;

export interface SqlResult {
  rows: SqlRow[];
  rowsAffected: number;
}

export interface SqlExecutor {
  execute(sql: string, params?: SqlValue[]): Promise<SqlResult>;
}

export interface SqlDatabase extends SqlExecutor {
  transaction<T>(work: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
