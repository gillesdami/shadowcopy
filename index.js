const HAS_PROPERTY_KEY_PARAM = ['getOwnPropertyDescriptor', 'has', 'get', 'set', 'deleteProperty', 'defineProperty'];
const MAY_ERASE_VALUE_IN_OBJECT = ['set', 'defineProperty', 'deleteProperty'];

let currentHandler = null; // Holds the original handler of the latest accessed ShadowCopy
let currentTarget = null; // Holds the last accessed target object of a ShadowCopy
let currentP = null; // Holds the last accessed property name of a ShadowCopy
let currentCache = null; // Holds the cache of the lastest accessed ShadowCopy

/**
 * Set the current values
 * 
 * @param {object} handler 
 * @param {Map} cache 
 * @param {object} target 
 * @param {string} p 
 */
function setCurrents(handler, cache, target, p) {
    currentHandler = handler;
    currentCache = cache;
    currentTarget = target;
    currentP = p;
}

export default class ShadowCopy {
    // The property chain called in the last accessed object
    static path = [];

    /**
     * @param {object} target
     * @param {object} handler
     * @param {string[]} path property chain relative to the root object
     */
    constructor(target, handler, path = []) {
        // A cache to avoid Proxy instances recreation at every access
        const cache = new WeakMap();

        const finalHandler = {
            // those are the defaults handlers to ensure by default nesting with cache.
            // target=args[0], p=args[1] value=args[2]
            get (...args) {
                setCurrents(handler, cache, args[0], args[1]);
                ShadowCopy.path = [...path, args[1]];
                return ShadowCopy.nest();
            },
            set (...args) {
                setCurrents(handler, cache, args[0], args[1]);
                cache.delete(args[0][args[1]]);
                args[0][args[1]] = args[2];
                return true;
            },
            defineProperty (...args) {
                cache.delete(args[0][args[1]]);
                return Reflect.defineProperty(...args);
            },
            deleteProperty (...args) {
                cache.delete(args[0][args[1]]);
                return delete args[0][args[1]];
            }
        };

        for (let [key, handle] of Object.entries(handler)) {
            finalHandler[key] = function(...args) {
                // target=args[0], p=args[1] 
                setCurrents(handler, cache, args[0], args[1]);

                if (HAS_PROPERTY_KEY_PARAM.includes(key)) {
                    ShadowCopy.path = [...path, args[1]];
                } else {
                    ShadowCopy.path = [...path];
                }
                
                if (MAY_ERASE_VALUE_IN_OBJECT.includes(key)) {
                    cache.delete(args[0][args[1]]);
                }

                return handle(...args);
            }
        }
        
        return new Proxy(target, finalHandler);
    }

    /**
     * Return a ShadowCopy using currentHandler, ShadowCopy.path and currentP and currentTarget.
     * Also, tries to restore or save the ShadowCopy from the cache
     * 
     * @param {object|undefined} original
     */
    static nest(original = currentTarget[currentP]) {
        if (currentCache.has(original)) {
            return currentCache.get(original);
        }

        if (typeof original === 'object' && original !== null || typeof original === 'function') {
            const shadow = new ShadowCopy(original, currentHandler, [...ShadowCopy.path]);

            currentCache.set(original, shadow);
            return shadow;
        }

        return original;
    }
}