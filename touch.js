/**
 * touch.js
 */
(function() {

    var DRAG = 'drag';
    var DRAG_LEFT = 'dragLeft';
    var DRAG_RIGHT = 'dragRight';
    var DRAG_UP = 'dragUp';
    var DRAG_DOWN = 'dragDown';
    var HOLD= 'hold';
    var TAP = 'tap';
    var DOUBLE_TAP = 'doubleTap';
    var TOUCH = 'touch';
    var SWIPE = 'swipe';
    var SWIPING = 'swiping';
    var SWIPE_LEFT = 'swipeLeft';
    var SWIPE_RIGHT = 'swipeRight';
    var SWIPE_UP = 'swipeUp';
    var SWIPE_DOWN = 'swipeDown';
    var ROTATE = 'rotate';
    var ROTATING = 'rotating';
    var ROTATE_LEFT = 'rotateLeft';
    var ROTATE_RIGHT = 'rotateRight';
    var PINCH = 'pinch';
    var PINCHING = 'pinching';
    var PINCH_IN = 'pinchIn';
    var PINCH_OUT = 'pinchOut';

    var doc = document,
        body = doc.body,
        clickThreshold = 3,
        clickTimeout = 300,
        eventMethods = {
            preventDefault: 'isDefaultPrevented',
            stopImmediatePropagation: 'isImmediatePropagationStopped',
            stopPropagation: 'isPropagationStopped'
        },
        returnTrue = function () {
            return true;
        },
        returnFalse = function () {
            return false;
        };

    function eventProxy(event) {
        var proxy = _.extend({
                originalEvent: event
            }, event),
            iterator = function (name, predicate) {
                proxy[name] = function () {
                    this[predicate] = returnTrue;
                    return event[name].apply(event, arguments);
                };
                proxy[predicate] = returnFalse;
            };
        for (var key in eventMethods) {
            if (iterator.call(this, eventMethods[key], key, eventMethods) === {}) {
                break;
            }
        }
        return proxy;
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
     * 简单的选择器匹配方法
     */
    function selectorMatch(selector) {
        if (!selector) {
            return [];
        }

        // 处理 class 和 id
        var selectorExpr = /([\.#])(.*)/,
            match = selectorExpr.exec(selector);

        // 处理 tagName
        if (!match) {
            match = [selector, null, selector];
        }
        return match;
    }

    /**
     * 简单的元素选择器
     */
    function $(selector) {
        var matches = selectorMatch(selector);

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

    function now() {
        return new Date();
    }

    function usec(time) {
        return (time ? new Date(time) : now()).getTime();
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
        size: function() {
            return Object.keys(this.map).length;
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
            // prevent the default event or not... might be buggy when false
            preventDefault: false,
            stopPropagation: false,
            type: TAP,
            css_hacks: true,

            swipe: true,
            swipeTime: 200,   // ms
            swipeMinDistance : 20, // pixels

            drag: true,
            dragVertical: true,
            dragHorizontal: true,
            // minimum distance before the drag event starts
            dragMinDistance: 20, // pixels

            // pinch zoom and rotation
            transform: true,
            scaleTreshold: 0.1,
            rotationTreshold: 15, // degrees

            tap: true,
            tapDouble: true,
            tapMaxInterval: 300,
            tapMaxDistance: 10,
            tapDoubleDistance: 20,

            hold: true,
            holdTimeout: 500
        },
        originDefaults = _.extend({}, defaults),
        touch = {
            config: config,
            on: on,
            off: off,
            bind: on,
            unbind: off
        };

    /**
     * 配置默认选项
     */
    function config(key, value) {
        if (value) {
            defaults[key] = value;
        }
        return touch;
    }

    /**
     * 重置所有环境
     */
    function reset(resetDefaults) {
        if (proxyMap) {
            proxyMap.each(function(event, selector) {
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

    function parseItem(item) {
        if (!item) {
            return;
        }
        var fn, context, args;
        if (_.isFunction(item)) {
            fn = item;
        } else if (_.isArray(item)) {
            fn = itemp[0];
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
     *          selector: {
     *              type: [
     *                  {fn, context, args}
     *              ]
     *          }
     *     }
     * }
     */
    var eventMap = new Map();

    /**
     * 委托响应函数
     *
     * 将元素的响应函数委托给某个上级
     *              [fn, context]
     *              [fn, args]
     *              [fn, context, args]
     *  on('.ok'[, '#alert'], fn)
     *
     * 批量将元素的响应函数委托给某个上级
     *  on({
     *      '.ok': okFn
     *      '.cancel': cancelFn
     *  }[, '#alert'])
     */
    function on(selectors, proxy, fn, options) {console.log('on', selectors, proxy, fn, options);
        if (_.isObject(selectors)) {
            _.each(selectors, function(fn, selector) {
                on(selector, proxy, fn, options);
            });
        } else if (_.isString(selectors)) {
            eachSelector(selectors, function(type, selector) {
                bindEvent(type, selector, proxy, fn, options);
            });
        }
        return touch;
    }

    /**
     * 移除委托的响应函数
     *
     * 解绑元素委托在某个上级的指定响应函数
     *  off('.ok'[, '#alert'], fn)
     *
     * 批量解绑元素委托在某个上级的指定响应函数
     *  off({
     *      '.ok': okFn
     *      '.cancel': cancelFn
     *  }[, '#alert'])
     *
     * 解绑元素委托在某个上级的所有响应函数
     *  off('.ok'[, '#alert'])
     *
     * 解绑元素委托在所有上级的所有响应函数
     *  off('.ok', true)
     *
     * 解绑委托在指定元素上的所有响应函数
     *  off(true, '#alert')
     *
     * 解绑委托在任何元素上的任何响应函数，相当于初始化
     *  off()
     */
    function off(selectors, proxy, fn) {console.log('off', selectors, proxy, fn);
        if (_.isObject(selectors)) {
            _.each(selectors, function(fn, selector) {
                off(selector, proxy, fn);
            });
        } else if (_.isString(selectors)) {
            eachSelector(selectors, function(type, selector) {
                bindEvent(type, selector, proxy, fn, true);
            });
        } else if (selectors === true &&
            (_.isString(proxy) || _.isUndef(proxy))) {
            proxy = (proxy || 'document').trim();
            this.map.remove(proxy);
            this.removeEvent(proxy);
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
        context.startFn = _.bind(onTouchStart(event), context);
        context.moveFn = _.bind(onTouchMove(event), context);
        context.endFn = _.bind(onTouchEnd(event), context);
        els.forEach(function(el) {
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
        var els = this.$(proxy),
            context = proxyMap.get(proxy);
        if (!els || !context) {
            return;
        }
        els.forEach(function(el) {
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
    function updateEvent(proxy) {console.log('updateEvent', proxy);
        eventMap.each(function(map, p) {
            if (!proxy || proxy === p) {
                if (map.size() > 0) {
                    addEvent(p);
                } else {
                    removeEvent(p);
                }
            }
        });
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
     * 进行事件匹配
     * 绑定对应的响应函数
     *  ('.ok'[, '#alert'], fn)
     * 解绑对应的响应函数
     *  ('.ok'[, '#alert'], fn, true)
     * 解绑在指定元素所有响应函数
     *  ('.ok'[, '#alert'], undefined, true)
     * 解绑在所有元素所有响应函数
     *  ('.ok', true, undefined, true)
     */
    function bindEvent(type, selector, proxy, item, options) {console.log('bindEvent', type, selector, proxy, item, options);
        // selector 为空则不处理
        if (!_.isString(selector) || !selector) {
            return;
        }
        selector = selector.trim();

        // 处理不指定 proxy 的情况
        if (_.isFunction(proxy) || _.isArray(proxy)) {
            item = proxy;
            proxy = 'document';

        // 处理 proxy 为字符串的情况
        } else if (_.isString(proxy) || _.isUndef(proxy)) {
            proxy = (proxy || 'document').trim();
        }

        // 解析 item
        item = parseItem(item);
        _.extend(item.options, defaults);
        if (_.isObject(options)) {
            _.extend(item.options, options);
        }

        // 检查是否已有该 proxy 对应的 map ，没有则创建一个
        var selectorMap, typeMap, content,
            remove = (options === true);
        // 移除监听
        if (remove === true) {
            // 解绑对应的 item
            if (item) {
                selectorMap = eventMap.get(proxy);
                if (!selectorMap) {
                    return;
                }

                typeMap = selectorMap.get(selector);
                if (!typeMap) {
                    return;
                }

                content = typeMap.get(type);
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
                typeMap.set(type, newContent);

                updateEvent(proxy);

            // 解绑 proxy 监听 selector 下所有响应函数
            } else if (proxy === true) {
                eventMap.each(function(selectorMap) {
                    selectorMap.remove(selector);
                });
                updateEvent();

            // 解绑 selector 下所有响应函数
            } else {
                selectorMap = eventMap.get(proxy);
                if (selectorMap) {
                    selectorMap.remove(selector);
                }
                updateEvent(proxy);
            }

        // 如果有 item
        } else if (item) {
            selectorMap = eventMap.get(proxy, newMap);
            typeMap = selectorMap.get(selector, newMap);
            content = typeMap.get(type, []);
            content.push(item);
            updateEvent(proxy);
        }
    }

    /**
     * 向绑定事件监听的元素派发事件
     */
    function trigger(type, proxy, options) {console.log('trigger', type, proxy);
        var target = event.target,
            currentTarget = event.currentTarget,
            proxyMap = this.map.get(proxy),
            targetFound = false,
            match, isMatch,
            classes, e, context;

        if (!proxyMap) {
            return;
        }
        // 从事件触发的目标开始向上查找匹配事件监听的节点
        while (target && target !== currentTarget) {
            proxyMap.each(function(fns, selector) {
                match = selectorMatch(selector);
                isMatch = false;
                // 处理 class
                if (match[1] === '.') {
                    classes = target.className.split(' ');
                    for (var i = 0; i < classes.length; i++) {
                        if (classes[i] === match[2]) {
                            isMatch = true;
                            break;
                        }
                    }

                // 处理 id
                } else if (match[1] === '#') {
                    isMatch = target.id === match[2];

                // 处理 tagName
                } else if (match[2] === selector) {
                    isMatch = target.tagName.toLowerCase() === selector.toLowerCase();
                }

                if (isMatch) {
                    // 只组装一次 event
                    if (!targetFound) {
                        e = _.extend(eventProxy(event), {
                            currentTarget: target
                        });
                    }
                    targetFound = true;
                    fns.forEach(function(fn) {
                        context = target;
                        if (_.isArray(fn)) {
                            context = fn[1];
                            fn = fn[0];
                        }
                        fn.call(context, e);
                    });
                }
            }, this);

            if (targetFound) {
                break;
            }

            target = target.parentNode;
        }
    }

    /**
     * 记录初始位置
     */
    function onTouchStart(event) {
        return function(event) {console.log('touch start', event, this);
            cancelEvent(event);
            var proxy = this.proxy,
                touches = extendTouches(event.touches),
                fingers = this.fingers = touches.length,
                doubleTap = false,
                init = {},
                last = this.start;
            if (fingers === 1) {
                // 判断是否 double tap
                if (last && last[0] && touches[0].t - last[0].t < defaults.tapMaxInterval) {
                    doubleTap = true;
                }

                // 判断是否 hold
                hold.call(this, event);
            } else if (fingers === 2) {
                init.angle = parseInt(angle(touches), 10);
                init.angleDiff = 0;
                init.distance = parseInt(distance(touches), 10);
            }
            this.start = touches;
            this.init = init;
            this.doubleTap = doubleTap;
        };
    }
    /**
     * 更新移动位置
     */
    function onTouchMove(event) {
        return function(event) {console.log('touch move', event);
            cancelEvent(event);
            hold.call(this, false);
            var proxy = this.proxy,
                touches = extendTouches(event.touches),
                fingers = this.fingers = touches.length;
            if (fingers === 1) {
                if (isSwipe.call(this, event)) {
                    trigger(SWIPING, proxy);
                }
            } else if (fingers === 2) {
                captureRotate();
                capturePinch();
                cancelEvent(event, true);
            }
        };
    }

    /**
     * 判断是否为有效的点击
     */
    function onTouchEnd(event) {
        return function(event) {console.log('touch end', event);
            cancelEvent(event);
            hold.call(this, false);
            var proxy = this.proxy,
                touches = extendTouches(event.touches),
                fingers = this.fingers = touches.length,
                start = this.start,
                doubleTap = this.doubleTap;
            if (doubleTap) {console.log(DOUBLE_TAP);
                trigger(DOUBLE_TAP, proxy);
            } else if (fingers === 1) {
                if (isSwipe.call(this, event)) {
                    trigger(SWIPE, proxy);
                    swipeDirection.call(this, event);
                } else {console.log(TAP);
                    trigger(TAP, proxy);
                }
            } else if (fingers === 2) {

            }
        };
    }
    
    /**
     * 取消事件
     */
    function cancelEvent(event, force) {
        if(defaults.preventDefault === true || force === true) {
            event.preventDefault();
        }
        if(defaults.stopPropagation === true || force === true) {
            event.stopPropagation();
        }
    }

    /**
     * 判断是否是 swipe
     */
    function isSwipe(event) {
        var horizontal,
            vertical,
            time,
            swipe = false,
            touches = extendTouches(event.touches),
            last = this.start;
        if (touches && touches[0] && last && last[0]) {
            horizontal = Math.abs(last[0].x - touches[0].x) > defaults.swipeMinDistance;
            vertical = Math.abs(last[0].y - touches[0].y) > defaults.swipeMinDistance;
            time = (touches[0].t - last[0].t) > defaults.swipeTime;
            swipe = time && (horizontal || vertical);
        }
        return swipe;
    }

    /**
     * 捕获旋转
     */
    function swipeDirection(event, start, end) {
        if (!start || !start[0] || !end || !end[0]) {
            return;
        }
        var x1 = start[0].x,
            y1 = start[0].y,
            x2 = end[0].x,
            y2 = end[0].y,
            xDelta = Math.abs(x1 - x2),
            yDelta = Math.abs(y1 - y2),
            proxy = this.proxy,
            type;
        if (xDelta >= yDelta) {
            if (x1 - x2 > 0) {
                type = SWIPE_LEFT;
            } else {
                type = SWIPE_RIGHT;
            }
        } else {
            if (y1 - y2 > 0) {
                type = SWIPE_UP;
            } else {
                type = SWIPE_DOWN;
            }
        }
        trigger(type, proxy);
    }

    /**
     * 捕获旋转
     */
    function captureRotate(event) {
    }

    /**
     * 捕获旋转
     */
    function capturePinch(event) {
        var diff, distance;
        distance = parseInt(_distance(CURRENT_TOUCH), 10);
        diff = GESTURE.initial_distance - distance;
        if (Math.abs(diff) > 10) {
        GESTURE.distance_difference = diff;
        return _trigger("pinching", {
        distance: diff
        });
        }
    }

    /**
     * hold 定时器
     */
    function hold(event) {
        clearTimeout(this.holdTimer);
        if (event) {
            var proxy = this.proxy;
            this.holdTimer = setTimeout(function() {
                trigger(HOLD, proxy);
            }, defaults.holdTimeout);
        }
    }

    /**
     * 扩展 touch 信息
     */
    function extendTouches(touches) {
        var ts = [],
            el, id, x, y, t;
        _.each(touches, function(touch) {
            el = touch.target;
            id = touch.identifier;
            x = touch.clientX;
            y = touch.clientY;
            t = now();
            _.extend(touch, {el: el, id: id, x: x, y: y, t: t});
            ts.push(touch);
        });
        return ts;
    }

    /**
     * 扩展 touch 信息
     */
    function angle(touches) {
        if (!touches || touches.length < 2) {
            return 0;
        }
        var t1 = touches[0],
            t2 = touches[1],
            angle = Math.atan((t2.y - t1.y) * -1 / (t2.x - t1.x)) * (180 / Math.PI);
        if (angle < 0) {
            angle += 180;
        }
        return angle;
    }

    /**
     * 扩展 touch 信息
     */
    function distance(touches) {
        if (!touches || touches.length < 2) {
            return 0;
        }
        var t1 = touches[0],
            t2 = touches[1];
        return Math.sqrt((t2.x - t1.x) * (t2.x - t1.x) + (t2.y - t1.y) * (t2.y - t1.y)) * -1;
    }

    window.touch = touch;
})();