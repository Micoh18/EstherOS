import { createTauriExecutor } from "./client";
import { setDefaultDbExecutorFactory } from "./executor";

setDefaultDbExecutorFactory(createTauriExecutor);

export { DB_URL, getDb } from "./client";
export {
  getDbExecutor,
  setDbExecutor,
  type DbExecutor,
  type ExecuteResult,
  type Row,
  type SqlValue,
  type Statement,
} from "./executor";
export {
  escapeLike,
  execute,
  placeholders,
  select,
  selectOne,
  transaction,
  type Tx,
} from "./query";
export {
  DB_CHANGED,
  emitDbChanged,
  onDbChanged,
  type DbChangedDetail,
  type DbTable,
} from "./events";
export * from "./schema";
export * from "./tags";
export * from "./backup";
