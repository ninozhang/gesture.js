/**
 * touch.js
 */
(function() {

    var LEFT = 'left';
    var RIGHT = 'right';
    var UP = 'up';
    var DOWN  = 'down';
    var IN = 'in';
    var OUT = 'out';

    var DRAG = 'drag';
    var DRAGGING = 'dragging';
    var DOUBLE_TAP = 'doubleTap';
    var HOLD= 'hold';
    var ROTATE = 'rotate';
    var ROTATING = 'rotating';
    var SWIPE = 'swipe';
    var SWIPING = 'swiping';
    var TAP = 'tap';
    var TAP2 = 'tap2';
    var TOUCH = 'touch';
    var PINCH = 'pinch';
    var PINCHING = 'pinching';

    var doc = document,
        body = doc.body;

    /**
     * 首字母大写
     */
    function capFirst(word) {
        return word.substring(0, 1).toUpperCase() + word.substring(1);
    }

    /**
     * 排除数组中的指定元素
     */
    function without(array, value) {
        var t = [];
        array.forEach(function(v) {
            if ((_.isArray(v) && v[0] !== value) ||
                (_.isFunction(v) && v !== value)) {
                t.push(v);
            }
        });
        return t;
    }
    
    /**
     * 取消事件默认方法或者冒泡
     */
    function cancelEvent(event, force) {
        if (defaults.preventDefault === true || force === true) {
            event.preventDefault();
        }
        if (defaults.stopPropagation === true || force === true) {
            event.stopPropagation();
        }
        if (defaults.stopImmediatePropagation === true || force === true) {
            event.stopImmediatePropagation();
        }
    }

    /**
     * 简单的选择器匹配方法
     */
    function selectorExec(selector) {
        if (!selector) {
            return [];
        }

        // 处理 class 和 id
        var selectorExpr = /([\.#])(.*)/,
            matches = selectorExpr.exec(selector);

        // 处理 tagName
        if (!matches) {
            matches = [selector, null, selector];
        }
        return matches;
    }

    /**
     * 简单的元素选择器
     */
    function $(selector) {
        var matches = selectorExec(selector);

        // 处理 document
        if (matches[2] === 'document') {
            return [doc];

        // 处理 body
        } else if (matches[2] === 'body') {
            return [body];

        // 处理 class
        } if (matches[1] === '.') {
            return doc.getElementsByClassName(match[2]);

        // 处理 id
        } else if (matches[1] === '#') {
            var el = doc.getElementById(match[2]);
            return el ? [el] : [];

        // 处理 tagName
        } else if (matches[1] === selector) {
            return doc.getElementsByTagName(match[2]);
        }
    }

    /**
     * 当前时间
     */
    function now() {
        return new Date();
    }

    function Map() {
        this.init.apply(this, arguments);
    }
    Map.prototype = {
        init: function() {
            this.reset();
            this.set.apply(this, arguments);
        },
        get: function(key, init) {
            if (!this.has(key) && init) {
                this.map[key] = _.isFunction(init) ? init.call() : init;
            }
            return this.map[key];
        },
        has: function(key) {
            return _.isDef(this.map[key]);
        },
        add: function(key, value) {
            if (!this.has(key)) {
                this.set(key, value);
            }
        },
        set: function(key, value) {
            if (key) {
                this.map[key] = value;
            }
        },
        remove: function(key) {
            delete this.map[key];
        },
        keys: function() {
            return Object.keys(this.map);
        },
        size: function() {
            return this.keys().length;
        },
        each: function(fn, context) {
            if (fn) {
                var map = this.map,
                    iterator = function(value, key) {
                        fn.call(this, value, key);
                    };
                if (!context) {
                    context = this;
                }
                for (var key in map) {
                    if (iterator.call(context, map[key], key, map) === {}) {
                        break;
                    }
                }
            }
        },
        reset: function() {
            this.map = {};
        }
    };

    function newMap() {
        return new Map();
    }

    /**
     * 默认配置
     */
    var defaults = {
            type: TAP,

            preventDefault: false,
            stopPropagation: false,
            stopImmediatePropagation: false,

            swipe: true,
            swipeMaxTime: 350, // ms
            swipeMinDistance : 20, // pixels

            drag: true,
            dragVertical: true,
            dragHorizontal: true,
            dragMinDistance: 20, // pixels

            pinch: true,
            pinchMinDistance: 10, // pixels

            rotate: true,
            rotateMinAngle: 10, // degrees

            tap: true,
            tapMaxDistance: 10,

            tap2: true,
            tap2MaxInterval: 150,
            tap2MaxDistance: 15,

            doubleTap: true,
            doubleTapMaxInterval: 300,
            doubleTapMaxDistance: 20,

            hold: true,
            holdTimeout: 350
        },
        originDefaults = _.extend({}, defaults),
        touch = {
            config: config,
            on: on,
            off: off,
            bind: on,
            unbind: off,
            trigger: trigger
        };

    /**
     * 配置默认选项
     */
    function config(key, value) {
        if (_.isObject(key)) {
            _.each(key, function(v, k) {
                defaults[k] = v;
            });
        } else if (_.isDef(value)) {
            defaults[key] = value;
        }
        return touch;
    }

    /**
     * 重置所有环境
     */
    function reset(resetDefaults) {
        if (proxyMap) {
            proxyMap.each(function(context, selector) {
                removeEvent(selector);
            });
        }
        if (resetDefaults === true) {
            defaults = _.extend({}, originDefaults);
        }
        proxyMap = new Map();
        eventMap = new Map();
        return touch;
    }

    /**
     * 解析 item
     */
    function parseItem(item) {
        if (!item) {
            return;
        }
        var fn, context, args;
        if (_.isFunction(item)) {
            fn = item;
        } else if (_.isArray(item)) {
            fn = item[0];
            if (_.isArray(item[1])) {
                args = item[1];
            } else if (_.isObject(item[1])) {
                context = item[1];
            }
            if (_.isArray(item[2])) {
                args = item[2];
            }
        }
        return {fn: fn, context: context, args: args, options: {}};
    }

    /**
     * 事件监听配置
     * 数据结构
     * eventMap: {
     *      proxy: {
     *          type: {
     *              selector: [
     *                  {fn, context, args},
     *                  {fn, context}
     *              ]
     *          }
     *     }
     * }
     */
    var eventMap = new Map();

    /**
     * 委托响应函数
     *  on(selectors, item)
     *  on(selectors, proxy, item)
     * item 格式允许如下形式
     *  [fn, context]
     *  [fn, args]
     *  [fn, context, args]
     */
    function on(selectors, proxy, item, options) {
        if (_.isObject(selectors)) {
            _.each(selectors, function(item, selector) {
                on(selector, proxy, item, options);
            });
        } else if (_.isString(selectors)) {
            eachSelector(selectors, function(type, selector) {
                bindEvent(type, selector, proxy, item, options);
            });
        }
        return touch;
    }

    /**
     * 移除委托的响应函数
     *
     * 解绑元素委托在某个上级的指定响应函数
     *  off(selector, item)
     *  off(selector, proxy, item)
     *
     * 批量解绑元素委托在某个上级的指定响应函数
     *  off(selectors)
     *  off(selectors, proxy)
     *
     * 解绑元素委托在某个上级的所有响应函数
     *  off(selector)
     *  off(selector, proxy)
     *
     * 解绑元素委托在所有上级的所有响应函数
     *  off(selector, true)
     *
     * 解绑委托在指定元素上的所有响应函数
     *  off(true, selector)
     */
    function off(selectors, proxy, item) {
        if (_.isObject(selectors)) {
            _.each(selectors, function(item, selector) {
                off(selector, proxy, item);
            });
        } else if (_.isString(selectors)) {
            eachSelector(selectors, function(type, selector) {console.log('off:', type, selector, proxy, item, true);
                bindEvent(type, selector, proxy, item, true);
            });
        } else if (selectors === true &&
            (_.isString(proxy) || _.isUndef(proxy))) {
            proxy = (proxy || 'document').trim();
            removeEvent(proxy);
        }
        return touch;
    }

    /**
     * 代理类配置
     * 数据结构
     * proxyMap: {
     *      proxy: {
     *          startFn, moveFn, endFn
     *      }
     * }
     */
    var proxyMap = new Map();

    /**
     * 绑定元素事件监听
     */
    function addEvent(proxy) {console.log('addEvent', proxy);
        if (!proxy) {
            return;
        }
        var els = $(proxy),
            context = proxyMap.get(proxy);
        if (!els || context) {
            return;
        }
        context = {proxy: proxy};
        context.startFn = _.bind(onTouchStart(), context);
        context.moveFn = _.bind(onTouchMove(), context);
        context.endFn = _.bind(onTouchEnd(), context);
        _.each(els, function(el) {
            if (el && el.addEventListener) {
                el.addEventListener('touchstart', context.startFn);
                el.addEventListener('touchmove', context.moveFn);
                el.addEventListener('touchend', context.endFn);
                el.addEventListener('touchcancel', context.endFn);
            }
        });
        proxyMap.set(proxy, context);
    }

    /**
     * 解绑元素事件监听
     */
    function removeEvent(proxy) {console.log('removeEvent', proxy);
        if (!proxy) {
            return;
        }

        var context = proxyMap.get(proxy);
        if (!context) {
            return;
        }

        var els = $(proxy);
        _.each(els, function(el) {
            if (el && el.removeEventListener) {
                el.removeEventListener('touchstart', context.startFn);
                el.removeEventListener('touchmove', context.moveFn);
                el.removeEventListener('touchend', context.endFn);
                el.removeEventListener('touchcancel', context.endFn);
            }
        });

        proxyMap.remove(proxy);
    }

    /**
     * 更新元素事件监听
     * 如果没有监听就移除，如果还有加入监听则
     */
    function updateEvent(proxy) {
        eventMap.each(function(typeMap, p) {
            if (!proxy || proxy === p) {
                var active = 0;
                typeMap.each(function(selectorMap) {
                    selectorMap.each(function(items) {
                        active += items.length;
                    });
                });
                if (active > 0) {
                    addEvent(p);
                } else {
                    removeEvent(p);
                }
            }
        });
    }

    /**
     * 拆分选择器
     */
    function splitSelector(selectors) {
        var a, s;
        if (_.isArray(selectors)) {
            a = [];
            _.each(selectors, function(selector) {
                s = splitSelector(selector);
                a.push(s);
            });
            return a;
        } else if (_.isString(selectors)) {
            if (!selectors) {
                return [];
            }
            a = selectors.replace(/\./g, '\x00.').replace(/#/g, '\x00#').split('\x00');
            return without(a, '');
        }
    }

    /**
     * 分解选择器并遍历
     */
    function eachSelector(selectors, iterator, context) {
        var type, selector;
        selectors = selectors.split(',');
        _.each(selectors, function(item) {
            item = item.split(' ');
            type = item.length > 1 ? item[0] : defaults.type;
            selector = item[1] || item[0];
            iterator.call(context || this, type, selector);
        });
    }

    /**
     * 绑定或解绑事件
     *  (type, selector[, proxy], item[, options])
     * 绑定对应的响应函数
     *  (type, selector, proxy, fn) // 指定代理元素
     *  (type, selector, fn) // 不指定代理元素
     * 解绑对应的响应函数
     *  (type, selector, item, true) // 解绑元素在 document 上的指定事件的响应函数
     *  (type, selector, proxy, item, true) // 解绑元素在指定父级元素上指定事件的响应函数
     * 解绑在指定父级元素所有响应函数
     *  (type, true, proxy, undefined, true)
     * 解绑在所有父级元素所有响应函数
     *  (type, selector, true, undefined, true)
     */
    function bindEvent(type, selector, proxy, item, options) {
        if (!type || !_.isString(type) ||
            !selector || !_.isString(selector)) {
            return;
        }
        selector = selector.trim();

        // 处理不指定 proxy 的情况
        if (_.isFunction(proxy) || _.isObject(proxy)) {
            item = proxy;
            proxy = 'document';

        // 处理 proxy 为字符串的情况
        } else if (_.isString(proxy) || _.isUndef(proxy)) {
            proxy = (proxy || 'document').trim();
        }

        // 解析 item
        if (item) {
            item = parseItem(item);
            _.extend(item.options, defaults);
            if (_.isObject(options)) {
                _.extend(item.options, options);
            }
        }
        var typeMap, selectorMap, content,
            remove = (options === true);

        // 移除响应的响应函数
        if (remove === true) {
            if ((proxy.toString() === 'true') &&
                (selector.toString() === 'true')) {
                reset();

            // 解绑在所有父级元素所有响应函数
            } else if (proxy.toString() === 'true') {
                eventMap.each(function(typeMap) {
                    selectorMap = typeMap.get(type);
                    if (selectorMap) {
                        selectorMap.remove(selector);
                    }
                });
                proxy = null;

            // 解绑在指定父级元素所有响应函数
            } else if (selector.toString() === 'true') {
                typeMap = eventMap.get(proxy);
                if (typeMap) {
                    typeMap.remove(type);
                }
            } else {
                typeMap = eventMap.get(proxy);
                if (!typeMap) {
                    return;
                }

                selectorMap = typeMap.get(type);
                if (!selectorMap) {
                    return;
                }

                if (item) {
                    content = selectorMap.get(selector);
                    if (!content) {
                        return;
                    }

                    var newContent = [];
                    _.each(content, function(c) {
                        if (c.fn !== item.fn) {
                            newContent.push(c);
                        }
                    });
                    content = newContent;
                    selectorMap.set(selector, newContent);
                } else {
                    selectorMap.remove(selector);
                }
                
            }

        // 如果有 item
        } else if (item) {
            typeMap = eventMap.get(proxy, newMap);
            selectorMap = typeMap.get(type, newMap);
            content = selectorMap.get(selector, []);
            content.push(item);
        }

        updateEvent(proxy);
    }

    /**
     * 向绑定事件监听的元素派发事件
     */
    function trigger(type, options) {//console.log('trigger:' + type);
        var proxy, event, target, currentTarget,
            typeMap, selectorMap;

        if (!options) {
            options = {};
        } else if (_.isArray(options)) {
            options = {args: options};
        } else if (_.isString(options)) {
            proxy = options;
            options = {proxy: proxy};
        } else if (_.isObject(options)) {
            proxy = options.proxy;
            event = options.event;
        }

        options.type = type;

        if (!proxy || !_.isString(proxy)) {
            proxy = 'document';
        }

        // 手动触发
        if (!event) {
            typeMap = eventMap.get(proxy);
            if (!typeMap) {
                return;
            }

            selectorMap = typeMap.get(type);
            if (!selectorMap) {
                return;
            }

            selectorMap.each(function(items) {
                fireEvent(items, options);
            });

        // 事件触发
        } else {
            target = options.target = options.currentTarget = event.target;

            walk(type, proxy, target, function(item) {
                fireEvent(item, options);
            });
        }
    }

    /**
     * 向上遍历元素
     */
    function walk(type, proxy, source, fn) {
        // 从事件触发的目标开始向上查找匹配事件监听的节点
        var selectors, origins;

        typeMap = eventMap.get(proxy);
        if (!typeMap) {
            return;
        }

        selectorMap = typeMap.get(type);
        if (!selectorMap) {
            return;
        }

        selectors = selectorMap.keys();
        origins = selectors.slice();




        while (target) {
            selectorMap.each(function(items, selector) {
                if (isSelectorMatch(target, selector)) {
                    fn(items);
                }
            }, this);

            if (target.parentNode && target.parentNode != target) {
                target = target.parentNode;
            }
        }
    }

    /**
     * 是否匹配选择器
     */
    function isSelectorMatch(el, selector) {
        if (!el || !selector) {
            return false;
        }

        var className,
            matches = selectorExec(selector);

        // 处理 class
        if (matches[1] === '.') {
            className = el.className;
            if (className) {
                _.each(className.split(' '), function(c) {
                    if (c === matches[2]) {
                        return true;
                    }
                });
            }

        // 处理 id
        } else if (matches[1] === '#') {
            return el.id === matches[2];

        // 处理 tagName
        } else if (matches[2] === selector) {
            return el.tagName.toLowerCase() === selector.toLowerCase();
        }
    }

    /**
     * 触发事件
     */
    function fireEvent(items, options) {
        var fn, context, args, target, iterator;
        if (!options) {
            options = {};
        }
        target = options.target || window;
        iterator = function(item) {
            fn = item.fn;
            context = item.context || target;
            if (options.args) {
                args = options.args.slice();
            } else if (item.args) {
                args = item.args.slice();
            } else {
                args = [];
            }
            args.unshift(options);
            fn.apply(context, args);
        };
        if (_.isArray(items)) {
            _.each(items, iterator);
        } else {
            iterator(items);
        }
    }

    /**
     * 响应触摸开始
     */
    function onTouchStart() {
        return function(event) {//console.log('touch start', event, this);
            cancelEvent(event);
            var proxy = this.proxy,
                start = extractTouches(event.touches),
                fingers = start.length,
                doubleTap = false;

            // 重置手势
            resetGesture.call(this, {start: start, prev: start, current: start, fingers: fingers});

            if (fingers === 1) {
                // 判断是否 double tap
                if (defaults.doubleTap && isDoubleTap.call(this, event)) {
                    this.doubleTap = true;
                }

                // 判断是否 hold
                if (defaults.hold) {
                    hold.call(this, event);
                }
            } else if (fingers === 2) {
                this.angle = parseInt(detectAngle(start), 10);
                this.distance = parseInt(detectDistance(start), 10);
            }
        };
    }

    /**
     * 响应触摸移动
     */
    function onTouchMove() {
        return function(event) {
            cancelEvent(event);
            hold.call(this, false);
            this.prev = this.current;
            var proxy = this.proxy,
                start = this.start,
                current = this.current = extractTouches(event.touches),
                fingers = current.length;
            if (fingers === this.fingers) {
                if (fingers === 1) {
                    if (defaults.swipe && (this.swiping = isSwipe.call(this, event))) {
                        swping.call(this, event);
                    } else if(defaults.drag && this.hold) {
                        this.drag = true;
                        dragging.call(this, event);
                    }
                } else if (fingers === 2) {
                    cancelEvent(event, true);
                    this.rotate = defaults.rotate && rotating.call(this, event);
                    this.pinch = defaults.pinch && pinching.call(this, event);
                    if (!this.rotate && !this.pinch && defaults.drag) {
                        this.drag = true;
                        dragging.call(this, event);
                    }
                }
            } else {
                resetGesture();
            }
        };
    }

    /**
     * 响应触摸结束
     */
    function onTouchEnd() {
        return function(event) {
            cancelEvent(event);
            hold.call(this, false);
            var proxy = this.proxy,
                start = this.start,
                current = this.current,
                fingers = this.fingers;
            if (fingers === 1) {
                if (defaults.doubleTap && this.doubleTap) {
                    doubleTap.call(this, event);
                } else if (defaults.swipe && isSwipe.call(this, event)) {
                    swipe.call(this, event);
                } else if (defaults.drag && this.drag) {
                    drag.call(this, event);
                } else if (defaults.tap && !this.hold && isTap.call(this, event)) {
                    tap.call(this, event);
                }
            } else if (fingers === 2) {
                if (defaults.tap2 && isTap2.call(this, event)) {
                    this.tap2 = true;
                    tap2.call(this, event);
                }
                if (!this.tap2) {
                    if (defaults.rotate && this.rotate) {
                        rotate.call(this, event);
                    }
                    if (defaults.pinch && this.pinch) {
                        pinch.call(this, event);
                    }
                    if (defaults.drag &&
                        ((!this.pinch && !this.rotate && isDrag.call(this, event)) || this.drag)) {
                        drag.call(this, event);
                    }
                }
            }
        };
    }

    /**
     * 重置手势
     */
    function resetGesture(options) {
        if (!options) {
            options = {};
        }
        this.last = this.start || [];
        this.start = options.start || [];
        this.prev = options.prev || [];
        this.current = options.current || [];
        this.fingers = options.fingers || 0;
        this.angle = options.angle || 0;
        this.lastAngle = options.angle || 0;
        this.angleDiff = 0;
        this.distance = options.distance || 0;
        this.lastDistance = options.distance || 0;
        this.distanceDiff = 0;
        this.tap2 = false;
        this.doubleTap = options.doubleTap || false;
        this.doubleTapInterval = options.doubleTapInterval || 0;
        this.doubleTapDistance = options.doubleTapDistance || 0;
        this.scale = 1;
        this.hold = false;
        this.drag = false;
        this.pinch = false;
        this.rotate = false;
    }

    /**
     * tap
     */
    function tap(event) {
        var proxy = this.proxy,
            start = this.start,
            options = {event: event, proxy: proxy, touches: start};
        trigger(TAP, options);
    }

    /**
     * 2 fingers tap
     */
    function tap2(event) {
        var proxy = this.proxy,
            start = this.start,
            distance = detectDistance(start[0], start[1]),
            options = {event: event, proxy: proxy, distance: distance, touches: start};
        trigger(TAP2, options);
    }

    /**
     * double tap
     */
    function doubleTap(event) {
        var proxy = this.proxy,
            start = this.start,
            interval = this.doubleTapInterval,
            distance = this.doubleTapDistance,
            options = {event: event, proxy: proxy, touches: start, distance: distance, interval: interval};
        trigger(DOUBLE_TAP, options);
    }

    /**
     * hold
     */
    function hold(event) {
        clearTimeout(this.holdTimer);
        if (event) {
            var that = this,
                proxy = this.proxy,
                start = this.start,
                options = {event: event, proxy: proxy, touches: start};
            this.holdTimer = setTimeout(function() {
                cancelEvent(event, true);
                that.hold = true;
                trigger(HOLD, options);
            }, defaults.holdTimeout);
        }
    }

    /**
     * drag
     */
    function drag(event) {
        var proxy = this.proxy,
            start = this.start,
            current = this.current,
            distance = detectDistance(start, current),
            direction = detectDirection(start, current),
            options = {event: event, proxy: proxy, direction: direction, distance: distance, touches: start};
        trigger(DRAG, options);
        trigger(DRAG + capFirst(direction), options);
    }

    /**
     * draging
     */
    function dragging(event) {
        var proxy = this.proxy,
            start = this.start,
            prev = this.prev,
            current = this.current,
            distance = detectDistance(start, current),
            direction = detectDirection(start, current),
            delta = detectDistance(prev, current),
            options = {event: event, proxy: proxy, direction: direction, distance: distance, delta: delta, touches: start};
        trigger(DRAGGING, options);
    }

    /**
     * swipe
     */
    function swipe(event) {
        var proxy = this.proxy,
            start = this.start,
            current = this.current,
            distance = detectDistance(start, current),
            direction = detectDirection(start, current),
            options = {event: event, proxy: proxy, direction: direction, distance: distance, touches: start};
        trigger(SWIPE, options);
        trigger(SWIPE + capFirst(direction), options);
    }

    /**
     * swiping
     */
    function swping(event) {
        var proxy = this.proxy,
            start = this.start,
            prev = this.prev,
            current = this.current,
            distance = detectDistance(start, current),
            direction = detectDirection(start, current),
            delta = detectDistance(prev, current),
            options = {event: event, proxy: proxy, direction: direction, distance: distance, delta: delta, touches: start};
        trigger(SWIPING, options);
    }

    /**
     * rotate
     */
    function rotate(event) {
        var proxy = this.proxy,
            angleDiff = this.angleDiff,
            direction = this.angleDiff > 0 ? RIGHT : LEFT,
            options = {event: event, proxy: proxy, angle: angleDiff, direction: direction};
        trigger(ROTATE, options);
        trigger(ROTATE + capFirst(direction), options);
    }

    /**
     * rotating
     */
    function rotating(event) {
        var angle, diff, delta, i, symbol, direction,
            proxy = this.proxy,
            current = this.current,
            captured = false;
        angle = parseInt(detectAngle(current), 10);
        diff = parseInt(this.angle - angle, 10);
        symbol = this.angleDiff < 0 ? "-" : "+";
        i = 0;
        while (Math.abs(diff - this.angleDiff) > 90 &&
            i++ < 10) {
            if (symbol === '+') {
                diff += 180;
            } else {
                diff -= 180;
            }
        }
        diff = parseInt(diff, 10);
        delta = this.lastAngle - angle;
        if ((Math.abs(diff) > defaults.rotateMinAngle || this.angleDiff !== 0) &&
            delta !== 0) {
            this.lastAngle = angle;
            this.angleDiff = diff;
            direction = diff > 0 ? RIGHT : LEFT;
            trigger(ROTATING, {event: event, proxy: proxy, direction: direction, angle: diff, delta: delta});
            captured = true;
        }
        return captured;
    }

    /**
     * pinch
     */
    function pinch(event) {
        var proxy = this.proxy,
            distanceDiff = this.distanceDiff,
            scale = this.scale,
            direction = distanceDiff > 0 ? OUT : IN,
            options = {event: event, proxy: proxy, distance: distanceDiff, direction: direction, scale: scale};
        trigger(PINCH, options);
        trigger(PINCH + capFirst(d), options);
    }

    /**
     * pinching
     */
    function pinching(event) {
        var distance, diff, delta, scale, direction,
            proxy = this.proxy,
            current = this.current,
            captured = false;
        distance = parseInt(detectDistance(current), 10);
        diff = distance - this.distance;
        delta = distance - this.lastDistance;
        if (Math.abs(diff) > defaults.pinchMinDistance &&
            delta !== 0) {
            this.lastDistance = distance;
            this.distanceDiff = diff;
            this.scale = scale = Math.abs(distance) / Math.abs(this.distance);
            direction = diff > 0 ? OUT : IN;
            trigger(PINCHING, {event: event, proxy: proxy, direction: direction, distance: diff, delta: delta, scale: scale});
            captured = true;
        }
        return captured;
    }

    /**
     * 判断是否是 tap
     */
    function isTap(event) {
        var start = this.start,
            current = this.current,
            d = Math.abs(detectDistance(start, current)) < defaults.tapMaxDistance;
        return d;
    }

    /**
     * 判断是否是 2 fingers tap
     */
    function isTap2(event) {
        var start = this.start,
            current = this.current,
            d = Math.abs(detectDistance(start, current)) < defaults.tap2MaxDistance,
            t = detectInterval(start, current) <= defaults.tap2MaxInterval;
        return d && t;
    }

    /**
     * 判断是否是 double tap
     */
    function isDoubleTap(event) {
        var last = this.last,
            start = this.start,
            doubleTapInterval,
            doubleTapDistance;
        if (last && last[0]) {
            doubleTapInterval = detectInterval(last, start);
            doubleTapDistance = Math.abs(detectDistance(start, last));
            if (doubleTapInterval  < defaults.doubleTapMaxInterval &&
                doubleTapDistance < defaults.doubleTapMaxDistance) {
                this.doubleTapInterval = doubleTapInterval;
                this.doubleTapDistance = doubleTapDistance;
                return true;
            }
        }
        return false;
    }

    /**
     * 判断是否是 swipe
     */
    function isSwipe(event) {
        var start = this.start,
            current = this.current,
            d = Math.abs(detectDistance(start, current)) > defaults.swipeMinDistance,
            t = detectInterval(start, current) <= defaults.swipeMaxTime;
        return d && t;
    }

    /**
     * 判断是否是 drag
     */
    function isDrag(event) {
        var start = this.start,
            current = this.current,
            d = Math.abs(detectDistance(start, current)) > defaults.dragMinDistance;
        return d;
    }

    /**
     * 提取 touch 信息
     */
    function extractTouches(touches) {
        var ts = [],
            el, id, x, y, t;
        _.each(touches, function(touch) {
            el = touch.target;
            id = touch.identifier || Math.random() * 10000000;
            x = touch.pageX;
            y = touch.pageY;
            t = now();
            ts.push({el: el, id: id, x: x, y: y, t: t});
        });
        return ts;
    }

    /**
     * 检测角度
     */
    function detectAngle(start, end) {
        var t1, t2;
        if (!end) {
            t1 = start[0];
            t2 = start[1];
        } else if (start.length) {
            t1 = start[0];
            t2 = end[0];
        } else {
            t1 = start;
            t2 = end;
        }
        var dx = t2.x - t1.x,
            dy = t2.y - t1.y,
            angle = Math.atan((dy) * -1 / (dx)) * (180 / Math.PI);
        if (angle < 0) {
            angle += 180;
        }
        return angle;
    }

    /**
     * 检测距离
     */
    function detectDistance(start, end) {
        var t1, t2;
        if (!end) {
            t1 = start[0];
            t2 = start[1];
        } else if (start.length) {
            t1 = start[0];
            t2 = end[0];
        } else {
            t1 = start;
            t2 = end;
        }
        var dx = t2.x - t1.x,
            dy = t2.y - t1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 检测方向
     */
    function detectDirection(start, end) {
        if (!start || !start[0] || !end || !end[0]) {
            return '';
        }
        var x1 = start[0].x,
            y1 = start[0].y,
            x2 = end[0].x,
            y2 = end[0].y,
            dx = Math.abs(x1 - x2),
            dy = Math.abs(y1 - y2),
            proxy = this.proxy,
            d;
        if (dx >= dy) {
            if (x1 - x2 > 0) {
                d = LEFT;
            } else {
                d = RIGHT;
            }
        } else {
            if (y1 - y2 > 0) {
                d = UP;
            } else {
                d = DOWN;
            }
        }
        return d;
    }

    /**
     * 检测时间间隔
     */
    function detectInterval(start, end) {
        var t1, t2;
        if (!end) {
            t1 = start[0];
            t2 = start[1];
        } else if (start.length) {
            t1 = start[0];
            t2 = end[0];
        } else {
            t1 = start;
            t2 = end;
        }
        return t2.t - t1.t;
    }

    window.touch = touch;
})();