
enum ResultType {
  Success, Error,
}

type AsyncResult<T> = {
  type: ResultType.Success,
  value: T
} | {
  type: ResultType.Error,
  err?: any
}

async function impl<T>(
  tag: string,
  tasks: Map<string, Promise<any>>,
  task: () => Promise<T>,
): Promise<T> {
  const running = tasks.get(tag) ?? Promise.resolve()
  const next: Promise<AsyncResult<T>> = running.then(() => {
    // 前段の処理を待機
    return task()
  }).then(result => {
    return {
      type: ResultType.Success,
      value: result,
    }
  }).catch(err => {
    return {
      type: ResultType.Error,
      err: err,
    }
  })
  tasks.set(tag, next)
  // TODO reduxで状態管理する
  // dataLoadingCallback?.(message, next)
  // nextはrejectされない
  return next.then(result => {
    // 後処理
    if (Object.is(tasks.get(tag), next)) {
      tasks.delete(tag)
    }
    if (result.type === ResultType.Success) {
      return result.value
    } else {
      return Promise.reject(result.err)
    }
  })
}


/**
 * tagで指定した非同期タスクの実行を同期する.
 * 
 * tagで識別される同種のタスクが並行して高々１つのみ実行されることを保証する
 * この関数呼び出し時に以前に実行を開始した別の非同期処理がまだ完了してない場合はその完了を待ってから実行する
 * 
 * @param tag 同期するタスクの種類の識別子
 * @param task 同期したいタスク asyncな関数・λ式を利用する.引数はこの関数の呼び出し時の状況に応じて,  
 *             - 該当する実行中の別タスクが存在する場合はその実行を待機してから実行
 *             - 該当する実行中の別タスクが存在しない場合は即座にtaskを実行
 * @returns task の実行結果
 */
export interface Synchronizer {
  <T>(
    tag: string,
    task: () => Promise<T>,
  ): Promise<T>
}

export function getSynchronizer(): Synchronizer {
  const tasks: Map<string, Promise<any>> = new Map()
  return (tag, task) => impl(tag, tasks, task)
}