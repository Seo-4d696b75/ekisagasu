import { useRef } from "react";

/**
 * コールバック関数をrefに保持する
 * 
 * `useCallback`とは異なり`dependencies`引数は無く、返り値は毎回異なる関数オブジェクトになりますが、
 * どの返り値の関数を呼び出してもrefで保持される最新のコールバック関数を呼び出します
 * 
 * `useMemo`で値をメモ化するとき、依存に含まれるコールバック関数の変化による再計算を回避するため、
 * この`useRefCallback`でコールバック関数をラップして使用します
 * 返り値の関数は`dependencies`に含める必要はありません
 * 
 * @param update 呼び出して欲しいコールバック関数の実体
 * @returns 返り値の関数を呼び出すと update引数で更新された最新のコールバック関数を同じ引数で呼び出す
 */
export function useRefCallback<T extends (...args: any[]) => void>(update: T): ((...args: Parameters<T>) => void)  {
  const ref = useRef<T>()
  ref.current = update
  return (...args: Parameters<T>) => {
      ref.current?.(...args)
  }
}

export function useRefValue<T>(updateFunc: (update: (newValue: T) => void)=>void): T | undefined {
  const ref = useRef<T>()
  updateFunc((newValue: T) => {
    ref.current = newValue
  })
  return ref.current
}