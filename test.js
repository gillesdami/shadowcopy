
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
            const p = new ShadowCopy({
                'bla': {}
            }, 
            {
                get(target, key) {
                    return key === 'bar' ? 'bar' : ShadowCopy.nest();
                }
            });
            assert.isDefined(p.bla);
            assert.strictEqual(p.bla.foo, undefined);
            assert.strictEqual(p.bla.bar, 'bar');
        });

        it('can trap property setters', () => {
            const p = new ShadowCopy({}, {
                set(obj, prop, value) {
                    assert.strictEqual(prop, 'bar');
                    assert.strictEqual(value, 'val');

                    return true;
                }
            });
            p.bar = 'val';
        });

        it('can trap the constructor', () => {
            const p = new ShadowCopy(function() {}, {
                construct(target, args) {
                    assert.strictEqual(args[0], 'foo')
                    return { answer: 42 }
                }
            });
            assert.deepEqual(new p('foo'), { answer: 42 });
        });

        it('can trap applications', () => {
            const p = new ShadowCopy(function () {}, {
                apply(target, thisArg, argumentsList) {
                    return 'i was applied!';
                }
            });
            assert.strictEqual(p(), 'i was applied!');
        });

    });

    describe('path', function() {
        it('ShadowCopy.path property contains the correct path', function() {
            const p = new ShadowCopy({'1': {'2': {'3': {'4': '5'}}}}, {});
            
            p['1'];
            assert.deepEqual(ShadowCopy.path, ['1']);
            p['1']['2'];
            assert.deepEqual(ShadowCopy.path, ['1', '2']);
            p['a'] = {};
            assert.deepEqual(ShadowCopy.path, ['a']);
            p['a']['b'] = {};
            assert.deepEqual(ShadowCopy.path, ['a', 'b']);
        });

        it('ShadowCopy.path property contains the correct path with multiple instances', function() {
            const p1 = new ShadowCopy({'1': {'2': {'3': {'4': '5'}}}}, {});
            const p2 = new ShadowCopy({'a': {'b': {'c': {'d': 'e'}}}}, {});
            
            p1['1']['2']['3'];
            assert.deepEqual(ShadowCopy.path, ['1', '2', '3']);
            p2['a']['b']['c'] = {};
            assert.deepEqual(ShadowCopy.path, ['a', 'b', 'c']);
        });

        it('ShadowCopy.path property contains the correct path from a getter or setter', function() {
            const p = new ShadowCopy({'1': {'2': {'3': {'4': '5'}}}}, {
                set: function(target, p, value) {
                    assert.deepEqual(ShadowCopy.path, ['1', '2', '3']);
                    target[p] = value;

                    return true;
                }
            });
            
            p['1']['2']['3'] = {};

            const result = [];
            const p2 = new ShadowCopy({'1': {'2': {'3': {'4': '5'}}}}, {
                get: function(target, p) {
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
        it('works on the example in the README');
    });
});
