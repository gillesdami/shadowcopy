
import chai from 'chai';
const { assert } = chai;

import ShadowCopy from './index.js';

describe('a proxy supporting deep nesting', () => {
    describe('basics', function () {
        it('transparently mimicks the original object by default', () => {
            const p = new ShadowCopy({
                foo: 'bar',
                baz: 'bax',
                ter: {
                    quat: 2
                },
                bla() { return 1 },
            }, {});

            assert.strictEqual(p.foo, 'bar');
            assert.strictEqual(p.baz, 'bax');
            assert.strictEqual(p.bla(), 1);
            assert.strictEqual(p.ter.quat, 2);
            assert.isUndefined(p.baa);
        });

        it('can get a custom value or nest', () => {
            const p = new ShadowCopy({'bla': {}}, {
                get (target, key) {
                    return key === 'bar' ? 'bar' : ShadowCopy.nest();
                }
            });

            assert.isDefined(p.bla);
            assert.strictEqual(p.bla.foo, undefined);
            assert.strictEqual(p.bla.bar, 'bar');
        });

        it('can trap property setters', () => {
            const p = new ShadowCopy({}, {
                set (obj, prop, value) {
                    assert.strictEqual(prop, 'bar');
                    assert.strictEqual(value, 'val');

                    return true;
                }
            });

            p.bar = 'val';
        });

        it('can trap the constructor', () => {
            const p = new ShadowCopy(function() {}, {
                construct (target, args) {
                    assert.strictEqual(args[0], 'foo')
                    return { answer: 42 }
                }
            });

            assert.deepEqual(new p('foo'), { answer: 42 });
        });

        it('can trap applications', () => {
            const p = new ShadowCopy(function () {}, {
                apply (target, thisArg, argumentsList) {
                    return 'i was applied!';
                }
            });

            assert.strictEqual(p(), 'i was applied!');
        });

        it('nest the shadow copy by default', () => {
            const original = {'foo': {'bar': 'val'}};
            const p = new ShadowCopy(original, {});

            assert.notStrictEqual(original, p['foo']);
        });
    });

    describe('path', function() {
        it('ShadowCopy.path contains the correct path', function() {
            const p = new ShadowCopy({'1': {'2': {'3': {'4': '5'}}}}, {
                set (target, p, value) {
                    assert.deepEqual(ShadowCopy.path, ['1', '2', '3']);
                    target[p] = value;

                    return true;
                }
            });
            
            p['1']['2']['3'] = {};

            const result = [];
            const p2 = new ShadowCopy({'1': {'2': {'3': {'4': '5'}}}}, {
                get (target, p) {
                    result.push(ShadowCopy.path);
                    return ShadowCopy.nest(target[p]);
                }
            });
            
            p2['1']['2']['3'];
            p2['1']['a'];
            assert.deepEqual(result, [['1'], ['1', '2'], ['1', '2', '3'], ['1'], ['1', 'a']]);
        });
    });
    
    describe('cache', function() {
        it('the cache update when a property is set', function() {
            const p = new ShadowCopy({'foo': {'bar': 'val'}}, {});
    
            assert.strictEqual(p.foo.bar, 'val');
            p.foo.bar = 'val2';
            assert.strictEqual(p.foo.bar, 'val2');
            const ref = { bar: 'val3'}
            p.foo = ref;
            assert.deepEqual(p.foo, ref);
        });
    
        it('nested objects are not re-instanciated', function() {
            const p = new ShadowCopy({'foo': {'bar': 'val'}}, {});
    
            assert.strictEqual(p.foo, p.foo);
            assert.strictEqual(p.foo.bar, p.foo.bar);
        });

        it('the cache doesnt keep deleted properties', function() {
            const p = new ShadowCopy({'foo': {'bar': 'val'}}, {});

            p.foo.bar; // generate cache

            delete p.foo.bar;
            assert.strictEqual(p.foo.bar, undefined);

            delete p.foo;
            assert.strictEqual(p.foo, undefined);
        });
    });
    
    describe('readme', function() {
        it('exemple 1: using ShadowCopy', function() {
            const db = new ShadowCopy({}, {
                get () {
                    return ShadowCopy.nest(function() {});
                },
                apply (target, thisArg, argArray) {
                    return [ShadowCopy.path, argArray];
                }
            });

            assert.deepEqual(db.select.from.where('a === b'), [['select', 'from', 'where'], ['a === b']])
        });

        it('example 2: watch', function () {
            function watch(watched, name) {
                function getCallee() {
                    return (new Error()).stack.split('\n').map(v => v.trim()).filter(v => v.startsWith('at'))[3];
                }

                return new ShadowCopy(watched, {
                    set (target, p, value) {
                        assert.deepEqual(ShadowCopy.path, ['foo', 'bar']);
                        assert.strictEqual(name, 'my_foo');
                        assert.strictEqual(target[p], 'val');
                        assert.strictEqual(value, 'sneak!');

                        // console.log(
                        //     'modified property "', ShadowCopy.path,
                        //     '" of object "', name,
                        //     '" at "', getCallee(),
                        //     '" from "', target[p],
                        //     '" to "', value);

                        target[p] = value;
                        return true;
                    }
                });
            }
            
            const p = watch({'foo': {'bar': 'val'}}, 'my_foo');

            (function alo(val) {
                val['foo']['bar'] = 'sneak!';
            })(p);
        });

        it('exemple 3: private property protection on "set"', function() {
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
            assert.throws(() => p['foo']['_private'] = 'val2', Error);
        });
    });
});
