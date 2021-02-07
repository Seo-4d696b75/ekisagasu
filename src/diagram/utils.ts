

export function stringHash(str: string): number {
	// https://stackoverflow.com/questions/194846/is-there-any-kind-of-hash-code-function-in-javascript
	// https://github.com/darkskyapp/string-hash/blob/master/index.js
	var hash = 5381;
	if (typeof str === "string") {
		var i = str.length - 1;
		while (i >= 0) {
			hash = (hash * 33) ^ str.charCodeAt(i);
			i--;
		}
	}
	return hash & hash;
}

type Comparator<E> = (obj1: E, obj2: E) => boolean
type HashGetter<E> = (e: E) => number

/**
 * primitiveではないObjectを要素にもつ重複なしの集合を表す
 * 要素の等価判定はコンストラクタに渡されるcomparator（評価器）で定義する
 * hashが計算するハッシュ値は要素の検索高速化のために使うが、
 * comparator(obj1,obj2) === true ならば hash(obj1) === hash(obj2) でなければならない
 * 演算子"==="でハッシュ値の等価性を評価するとおり、ハッシュ値はprimitiveでなければならない
 * 検索の高速化のためには、
 * hash(obj1) === hash(obj2) かつ comparator(obj1,obj2) === false となるハッシュの衝突はできるだけ避けるのが望ましい
 */
export class ObjectSet<E> {

	/**
	 * 
	 * @param {(obj1,obj2) => boolean} comparator 要素の等価判定を行う
	 * @param {(obj) => hashCode} hash 要素のハッシュ値を計算する
	 * @param {iterable} collection 初期化する要素（省略可）
	 */
	constructor(comparator: Comparator<E>, hash: HashGetter<E>, collection?: Array<E>) {
		this.compare = comparator;
		this.hash = hash;
		this.map = new Map();
		if (collection) {
			collection.forEach(element => {
				this.add(element);
			});
		}
	}

	compare: Comparator<E>
	hash: HashGetter<E>
	map: Map<number, Array<E>>

	clone() {
		var tmp = new ObjectSet<E>(this.compare, this.hash);
		for (let pair of this.map.entries()) {
			var key: number = pair[0];
			var list = pair[1];
			tmp.map.set(key, Array.from(list));
		}
		return tmp;
	}

	/**
	 * 要素の追加を行う
	 * @param {*} e 追加したい要素
	 * @return {boolean} 既存の集合に等価な要素が存在せず追加に成功したらtrue, false otherwise
	 */
	add(e: E): boolean {
		var hash = this.hash(e);
		var list = this.map.get(hash);
		if (list) {
			if (list.every(element => !this.compare(element, e))) {
				list.push(e);
				return true;
			}
			return false;
		} else {
			list = [e];
			this.map.set(hash, list);
			return true;
		}
	}

	/**
	 * 指定した要素が集合に含まれるか判定する
	 * @param {*} e 検査対象の要素
	 */
	has(e: E): boolean {
		var list = this.map.get(this.hash(e));
		return !!list && list.some(element => this.compare(element, e));
	}

	/**
	 * 指定した要素の削除を行う
	 * @param {*} e 削除したい要素
	 * @return {boolean} 集合に削除対象の要素が存在し削除に成功したらtrue, false otherwise
	 */
	remove(e: E): boolean {
		var hash = this.hash(e);
		var list = this.map.get(hash);
		if (list) {
			if (list.length === 1 && this.compare(list[0], e)) {
				this.map.delete(hash);
				return true;
			}
			var removed = list.filter(element => !this.compare(element, e));
			if (list.length === removed.length) {
				return false;
			} else {
				this.map.set(hash, removed);
				return true;
			}
		}
		return false;
	}

	size(): number {
		var size = 0;
		for (let list of this.map.values()) {
			size += list.length;
		}
		return size;
	}

	clear(): void {
		this.map.clear();
	}

	/**
	 * 
	 * @param {(obj) => void} consumer 
	 */
	forEach(consumer: (e: E) => void): void {
		for (let value of this) {
			consumer(value);
		}
	}

	*[Symbol.iterator]() {
		var size = 0;
		for (let list of this.map.values()) {
			for (let value of list) {
				size += 1;
				yield value;
			}
		}
		return size;
	}

	/**
	 * 
	 * @param {(obj) => boolean} predicate 
	 */
	filter(predicate: (e: E) => boolean): ObjectSet<E> {
		var tmp = new ObjectSet(this.compare, this.hash);
		for (let element of this) {
			if (predicate(element)) tmp.add(element);
		}
		return tmp;
	}

	/**
	 * 
	 * @param {(obj) => boolean} predicate 
	 */
	removeIf(predicate: (e: E) => boolean): ObjectSet<E> {
		var tmp = new ObjectSet(this.compare, this.hash);
		for (let element of this) {
			if (!predicate(element)) tmp.add(element);
		}
		return tmp;
	}
}

type MapEntry<K, V> = {
	key: K,
	value: V | null
}

export class ObjectMap<K, V> {

	constructor(comparator: Comparator<K>, hash: HashGetter<K>) {
		this.compare = comparator;
		this.hash = hash;
		this.map = new Map();
	}

	compare: Comparator<K>
	hash: HashGetter<K>
	map: Map<number, Array<MapEntry<K, V>>>

	put(key: K, value: V | null): void {
		var hash = this.hash(key);
		var list = this.map.get(hash);
		if (list) {
			var index = list.findIndex(pair => this.compare(pair.key, key));
			if (index < 0) {
				var pair: MapEntry<K, V> = {
					key: key,
					value: value
				}
				list.push(pair);
			} else {
				list[index].value = value;
			}
		} else {
			list = [
				{
					key: key,
					value: value
				}
			];
			this.map.set(hash, list);
		}
	}

	has(key: K): boolean {
		var list = this.map.get(this.hash(key));
		return !!list && list.some(pair => this.compare(pair.key, key));
	}

	get(key: K, defaultValue?: V | null): V | null {
		var list = this.map.get(this.hash(key));
		if (!list) return null;
		var index = list.findIndex(pair => this.compare(pair.key, key));
		if (index < 0) {
			if ( defaultValue ) return defaultValue
			return null
		} else {
			return list[index].value;
		}
	}

	getValue(key: K): V {
		var value = this.get(key)
		if ( value ) return value
		throw new Error(`no such element. key:${key}`)
	}

	/**
	 * 指定されたkeyにマッピングされたvalueを削除する
	 * @param {*} key 
	 * @return {obj} 削除されたvalue, 削除に失敗した場合はnull
	 */
	remove(key: K): V | null {
		var hash = this.hash(key);
		var list = this.map.get(hash);
		if (list) {
			if (list.length === 1 && this.compare(list[0].key, key)) {
				this.map.delete(hash);
				return list[0].value;
			}
			var index = list.findIndex(pair => this.compare(pair.key, key));
			if (index < 0) {
				return null;
			} else {
				var value = list[index].value;
				var removed = list.filter(pair => !this.compare(pair.key, key));
				this.map.set(hash, removed);
				return value;
			}
		}
		return null;
	}

	size(): number {
		var size = 0;
		for (let list of this.map.values()) {
			size += list.length;
		}
		return size;
	}

	clear(): void {
		this.map.clear();
	}

	/**
	 * 
	 * @param {(key) => void} consumer 
	 */
	forEachKey(consumer: (key: K) => void) {
		for (let key of this.keys()) {
			consumer(key);
		}
	}

	* keys() {
		for (let list of this.map.values()) {
			for (let entry of list) {
				yield entry.key;
			}
		}
	}

	/**
	 * 
	 * @param {(value) => void} consumer 
	 */
	forEachValue(consumer: (value: V | null) => void) {
		for (let value of this.values()) {
			consumer(value);
		}
	}

	* values() {
		for (let list of this.map.values()) {
			for (let entry of list) {
				yield entry.value;
			}
		}
	}

	/**
	 * 
	 * @param {(entry: {key:any, value:any}) => void} consumer 
	 */
	forEachEntries(consumer: (e: MapEntry<K, V>) => void) {
		for (let entry of this.entries()) {
			consumer(entry);
		}
	}

	* entries() {
		for (let list of this.map.values()) {
			for (let entry of list) {
				var tmp = {
					key: entry.key,
					value: entry.value
				};
				yield tmp;
			}
		}
	}

}