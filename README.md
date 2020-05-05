# Shadow Copy

Zero dependency deep proxy creation tool.

## usage

This deep proxy tool offers by default nesting, property chain path and a cache to avoid Proxy re-instanciation without preventing carbage collection.

```bash
yarn add shadowcopy-js
```

```js
import ShadowCopy from 'shadowcopy-js';
```

### Example 1 DSL query building

In this example we let the user create property chains by nesting functions and log the path when applied.

```js
const db = new ShadowCopy({}, {
    get () {
        return ShadowCopy.nest(function() {});
    },
    apply (target, thisArg, argArray) {
        return [ShadowCopy.path, argArray];
    }
});

console.log(db.select.from.where('a === b'));
// [['select', 'from', 'where'], ['a === b']]
```

### Example 2 watch

In this exemple we create a watcher logging the modification of an object and his childrens via the handler 'set'.

```js
function watch(watched, name) {
    function getCallee() {
        return (new Error()).stack.split('\n').map(v => v.trim()).filter(v => v.startsWith('at'))[3];
    }

    return new ShadowCopy(watched, {
        set (target, p, value) {
            console.log(
                'modified property "', ShadowCopy.path,
                '" of object "', name,
                '" at "', getCallee(),
                '" from "', target[p],
                '" to "', value, '"');

            target[p] = value;
            return true;
        }
    });
}

// create an object to watch and name it 'my_foo'
const p = watch({'foo': {'bar': 'val'}}, 'my_foo');

(function fn(val) {
    val['foo']['bar'] = 'sneak!';
    //logs: modified property "[ 'foo', 'bar' ]" of object "my_foo" at "at fn (file:///var/www/test.js:165:35)" from "val" to "sneak!"
})(p);
```

### Example 3 Property protection

This third example protects private properties from being set.

```js
const p = new ShadowCopy({'foo': {'bar': 'val'}, '_private': null}, {
    set (target, p, value) {
        if (p[0] === '_') {
            throw new Error(`Invalid attempt to set private "${p}" property`);
        }

        target[p] = value;
        return true;
    }
});

p['foo']['bar'] = 'val2';
p['foo']['_private'] = 'val2'; // Error
```

## api

### class ShadowCopy

Create a deep proxy with nesting by default.

#### contructor (target, handler, path = [])

- target `object` original to copy/proxy
- handler `object` proxy handler (full doc at [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler))
- path `string[]` root path of the original object, will be prepended to ShadowCopy.path

#### static ShadowCopy.path

An array of string which value correspond to the chain of properties called to proc a handler.

It should only be used in a handler.

Example:

```js
const p = new ShadowCopy({'1': {'2': {'3': {'4': '5'}}}}, {
    set (target, p, value) {
        console.log(ShadowCopy.path); // ['1', '2', '3']
        target[p] = value;

        return true;
    }
});

p['1']['2']['3'] = {};
```

#### static nest(original = currentTarget[currentP])

Create a nested Proxy.

It should only be used in a handler.

The default get handler returns a ShadowCopy to offer by default nesting, if you wish to implement the 'get' handler and to keep the by default nesting, return ShadowCopy.nest():

```js
const p = new ShadowCopy({}, {
    get (target, p) {
        return ShadowCopy.nest();
        // same as: return ShadowCopy.nest(target[p]);
    }
});
```

## test

Running the tests requires node at least node 14 and yarn.

```bash
yarn # install the development dependencies
yarn test # run the tests
```

## license

MIT
