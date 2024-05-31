import { useCallback, useEffect, useRef } from "react";
import { PropsEvent, handleIf } from "../model/event";

/**
 * コールバック関数をrefでメモ化します
 * 
 * `useCallback`とは異なり`dependencies`引数は無く、返り値は毎回同一の関数オブジェクトになります  
 * 返り値の関数を呼び出すと、refで保持される最新のコールバック関数を呼び出します
 * 
 * `useMemo`で値をメモ化するとき、依存に含まれるコールバック関数の変化による再計算を回避するため、
 * この`useRefCallback`でコールバック関数をラップして使用します  
 * 返り値の関数は変化しないため`dependencies`に含めても再計算をトリガーしません
 * 
 * @param update 呼び出して欲しいコールバック関数の実体
 * @returns 返り値の関数を呼び出すと update引数で更新された最新のコールバック関数を同じ引数で呼び出す
 */
export function useRefCallback<T extends (...args: any[]) => any>(update: T): ((...args: Parameters<T>) => ReturnType<T>) {
  const ref = useRef<T>()
  ref.current = update
  return useCallback((...args: Parameters<T>) => ref.current?.(...args), [])
}

/**
 * `useEffect`で`PropsEvent`をハンドリングします
 * 
 * `useEffect`による次のような使用と等価です
 * ```
 * useEffect(() => {
 *   handleIf(event, value => {
 *     // your handler
 *   })
 * }, [event])
 * ```
 * イベントオブジェクトeventが変化して有効な値を保持する場合、
 * `useEffect`のタイミングで１回のみコールバック関数を呼び出します
 * 
 * @param event ハンドリングするイベント `useEffect`のタイミングでhandler関数を呼び出します
 * @param handler eventをハンドリングする関数
 */
export function useEventEffect<T>(event: PropsEvent<T>, handler: (value: T) => void) {
  useEffect(() => {
    handleIf(event, handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])
}