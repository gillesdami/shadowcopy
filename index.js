let currentHandler = null; // Holds the original handler of the latest accessed ShadowCopy
let currentTarget = null; // Holds the last accessed target object of a ShadowCopy
let currentP = null; // Holds the last accessed property name of a ShadowCopy
let currentCache = null; // Holds the cache of the lastest accessed ShadowCopy

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
        const cache = new Map();
        
        const finalHandler = {
            ...handler,
            
            get: function(target, p, receiver) {
                currentHandler = handler;
                currentCache = cache;
                currentTarget = target;
                currentP = p;
                ShadowCopy.path = [...path, p];
                
                if (!handler.get) {
                    return ShadowCopy.nest();
                }

                return handler.get(target, p, receiver);
            },

            set: function (target, p, value, receiver) {
                currentHandler = handler;
                currentCache = cache;
                currentTarget = target;
                currentP = p;
                ShadowCopy.path = [...path, p];

                cache.delete(target[p]);

                if (!handler.set) {
                    target[p] = ShadowCopy.nest(value);
                    return true;
                }
                
                return handler.set(target, p, value, receiver)
            },

            deleteProperty: function (target, p) {
                currentHandler = handler;
                currentCache = cache;
                currentTarget = target;
                currentP = p;

                cache.delete(target[p]);

                if (!handler.deleteProperty) {
                    return delete target[p];
                }

                return handler.deleteProperty(target, p);
            }
        };
        
        return new Proxy(target, finalHandler);
    }

    /**
     * Return a ShadowCopy using currentHandler, ShadowCopy.path and currentP and currentTarget.
     * Also, tries to restore or save the ShadowCopy from the cache
     * 
     * @param {object|undefined} original
     */
    static nest(original = currentTarget[currentP]) {
        if (currentCache.has(currentTarget[currentP])) {
            return currentCache.get(currentTarget[currentP]);
        }

        if (typeof original === 'object' && original !== null) {
            const shadow = new ShadowCopy(original, currentHandler, [...ShadowCopy.path]);

            currentCache.set(original, shadow);
            return shadow;
        }

        return original;
    }
}