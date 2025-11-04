declare module "sqlite3" {
  export interface RunResult {
    lastID: number;
    changes: number;
  }

  export type Callback = (error: Error | null) => void;

  export class Database {
    constructor(filename: string, mode?: number, callback?: Callback);
    run(sql: string, callback?: (this: RunResult, error: Error | null) => void): this;
    run(sql: string, params: unknown[], callback?: (this: RunResult, error: Error | null) => void): this;
    get<T>(sql: string, callback: (error: Error | null, row: T | undefined) => void): void;
    get<T>(sql: string, params: unknown[], callback: (error: Error | null, row: T | undefined) => void): void;
    close(callback?: Callback): void;
  }

  export const OPEN_READONLY: number;
  export const OPEN_READWRITE: number;
  export const OPEN_CREATE: number;

  export function verbose(): typeof import("sqlite3");

  const sqlite3: {
    Database: typeof Database;
    OPEN_READONLY: typeof OPEN_READONLY;
    OPEN_READWRITE: typeof OPEN_READWRITE;
    OPEN_CREATE: typeof OPEN_CREATE;
    verbose: typeof verbose;
  };

  export default sqlite3;
}
