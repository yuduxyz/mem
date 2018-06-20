'use strict';
const mimicFn = require('mimic-fn');
const isPromise = require('p-is-promise');

const cacheStore = new WeakMap();

const defaultCacheKey = (...args) => {
	if (args.length === 1) {
		const [firstArgument] = args;
		if (
			firstArgument === null ||
			firstArgument === undefined ||
			(typeof firstArgument !== 'function' && typeof firstArgument !== 'object')
		) {
			return firstArgument;
		}
	}

	return JSON.stringify(args);
};

module.exports = (fn, options) => {
	options = Object.assign({
		cacheKey: defaultCacheKey,
		cache: new Map(),
		cachePromiseRejection: false
	}, options);

	const memoized = function (...args) {
		const cache = cacheStore.get(memoized);
		const key = options.cacheKey(...args);

		if (cache.has(key)) {
			const c = cache.get(key);

			if (typeof options.maxAge !== 'number' || Date.now() < c.maxAge) {
				return c.data;
			}

			cache.delete(key);
		}

		const ret = fn.call(this, ...args);

		const setData = (key, data) => {
			cache.set(key, {
				data,
				maxAge: Date.now() + (options.maxAge || 0)
			});
		};

		setData(key, ret);

		if (isPromise(ret) && options.cachePromiseRejection === false) {
			// Remove rejected promises from cache unless `cachePromiseRejection` is set to `true`
			ret.catch(() => cache.delete(key));
		}

		return ret;
	};

	mimicFn(memoized, fn);

	cacheStore.set(memoized, options.cache);

	return memoized;
};

module.exports.clear = fn => {
	const cache = cacheStore.get(fn);

	if (cache && typeof cache.clear === 'function') {
		cache.clear();
	}
};
