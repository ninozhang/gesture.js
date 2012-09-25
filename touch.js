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
    var DRAGING = 'draging';
    var DOUBLE_TAP = 'doubleTap';
    var HOLD= 'hold';
    var ROTATE = 'rotate';
    var ROTATING = 'rotating';
    var SWIPE = 'swipe';
    var SWIPING = 'swiping';
    var TAP = 'tap';
    var TOUCH = 'touch';
    var PINCH = 'pinch';
    var PINCHING = 'pinching';

    var doc = document,
        body = doc.body,
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
            swipeTime: 100,   // ms
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

            pinchMinDistance: 10,

            tap: true,
            tapDouble: true,
            tapMaxInterval: 300,
            tapMaxDistance: 10,
            tapDoubleDistance: 20,

            hold: true,
            holdTimeout: 350
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
     *          type: {
     *              selector: [
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
    function on(selectors, proxy, fn, options) {//console.log('on', selectors, proxy, fn, options);
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
    function off(type, selectors, proxy, fn) {//console.log('off', selectors, proxy, fn);
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
            eventMap.remove(proxy);
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
    function addEvent(proxy) {//console.log('addEvent', proxy);
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
    function removeEvent(proxy) {//console.log('removeEvent', proxy);
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
    function updateEvent(proxy) {//console.log('updateEvent', proxy);
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
     * 绑定或解绑事件
     *  (type, selector[, proxy], item[, options])
     * 绑定对应的响应函数
     *  (type, selector, proxy, fn) // 指定代理元素
     *  (type, selector, fn) // 不指定代理元素
     * 解绑对应的响应函数
     *  (type, selector, item, true) // 解绑元素在 document 上的指定事件的响应函数
     *  (type, selector, proxy, item, true) // 解绑元素在指定父级元素上指定事件的响应函数
     * 解绑在指定父级元素所有响应函数
     *  (type, selector, undefined, true)
     *  (type, selector, proxy, undefined, true)
     * 解绑在所有父级元素所有响应函数
     *  (type, selector, true, undefined, true)
     */
    function bindEvent(type, selector, proxy, item, options) {//console.log('bindEvent', type, selector, proxy, item, options);
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
        item = parseItem(item);
        _.extend(item.options, defaults);
        if (_.isObject(options)) {
            _.extend(item.options, options);
        }

        var typeMap, selectorMap, content,
            remove = (options === true);
        // 移除响应的响应函数
        if (remove === true) {
            // 解绑对应的 item
            if (item) {
                typeMap = eventMap.get(proxy);
                if (!typeMap) {
                    return;
                }

                selectorMap = typeMap.get(type);
                if (!selectorMap) {
                    return;
                }

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
            typeMap = eventMap.get(proxy, newMap);
            selectorMap = typeMap.get(type, newMap);
            content = selectorMap.get(selector, []);
            content.push(item);
            updateEvent(proxy);
        }
    }

    /**
     * 向绑定事件监听的元素派发事件
     */
    function trigger(type, options) {console.log('trigger', type, options);
        var proxy = options.proxy,
            event = options.event,
            target = event.target,
            currentTarget = event.currentTarget,
            typeMap, selectorMap,
            targetFound = false,
            matches, isMatch,
            classes, e, context;

        typeMap = eventMap.get(proxy);
        if (!typeMap) {
            return;
        }

        selectorMap = typeMap.get(type);
        if (!selectorMap) {
            return;
        }

        // 从事件触发的目标开始向上查找匹配事件监听的节点
        while (target && target !== currentTarget) {
            selectorMap.each(function(items, selector) {
                matches = selectorMatch(selector);
                isMatch = false;
                // 处理 class
                if (matches[1] === '.') {
                    classes = target.className.split(' ');
                    for (var i = 0; i < classes.length; i++) {
                        if (classes[i] === matches[2]) {
                            isMatch = true;
                            break;
                        }
                    }

                // 处理 id
                } else if (matches[1] === '#') {
                    isMatch = target.id === matches[2];

                // 处理 tagName
                } else if (matches[2] === selector) {
                    isMatch = target.tagName.toLowerCase() === selector.toLowerCase();
                }

                if (isMatch) {
                    if (!targetFound) {
                        e = _.extend(eventProxy(event), {
                            currentTarget: target
                        });
                    }
                    targetFound = true;
                    _.each(items, function(item) {
                        var fn = item.fn,
                            context = item.context || target;
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
     * 响应触摸开始
     */
    function onTouchStart() {
        return function(event) {console.log('touch start', event, this);
            cancelEvent(event);
            var proxy = this.proxy,
                last = this.start,
                start = extendTouches(event.touches),
                fingers = this.fingers = start.length,
                doubleTap = false,
                angle = 0,
                distance = 0;
            if (fingers === 1) {
                // 判断是否 double tap
                if (last && last[0] && start[0].t - last[0].t < defaults.tapMaxInterval) {
                    doubleTap = true;
                }

                // 判断是否 hold
                hold.call(this, event);
            } else if (fingers === 2) {
                angle = parseInt(angle(start), 10);
                distance = parseInt(distance(start), 10);
            }
            this.start = start;
            this.current = [];
            this.angle = angle;
            this.angleDiff = 0;
            this.distance = distance;
            this.distanceDiff = 0;
            this.doubleTap = doubleTap;console.log('this.start');
for (var i = 0;i  < this.start.length; i++) {
    var t = this.start[i];
    console.log('id:' + t.id + ' x:' + t.pageX + ' y:' + t.pageY);
}
        };
    }

    /**
     * 响应触摸移动
     */
    function onTouchMove() {
        return function(event) {console.log('touch move', event);
console.log('origin touches');
for (var i = 0;i  < event.touches.length; i++) {
    var t = event.touches[i];
    console.log('id:' + t.identifier + ' x:' + t.pageX + ' y:' + t.pageY);
}
                console.log('this.start');
for (var i = 0;i  < this.start.length; i++) {
    var t = this.start[i];
    console.log('id:' + t.id + ' x:' + t.pageX + ' y:' + t.pageY);
}
            cancelEvent(event);
            hold.call(this, false);
            var proxy = this.proxy,
                current = this.current = extendTouches(event.touches),
                fingers = this.fingers = current.length;
console.log('this.current');
for (var i = 0;i  < this.current.length; i++) {
    var t = this.current[i];
    console.log('id:' + t.id + ' x:' + t.pageX + ' y:' + t.pageY);
}
            console.log('current x:' + event.touches[0].clientX);
            console.log('start x:' + this.start[0].x);
            if (fingers === 1) {
                if (isSwipe.call(this, event)) {
                    trigger(SWIPING, {event: event, proxy: proxy});
                }
            } else if (fingers === 2) {
                captureRotate.call(this);
                capturePinch.call(this);
                cancelEvent(event, true);
            }
        };
    }

    /**
     * 响应触摸结束
     */
    function onTouchEnd() {
        return function(event) {console.log('touch end', event);
            cancelEvent(event);
            hold.call(this, false);
            var proxy = this.proxy,
                start = this.start,
                current = this.current,
                fingers = this.fingers,
                doubleTap = this.doubleTap;
            if (doubleTap) {
                trigger(DOUBLE_TAP, {event: event, proxy: proxy});
            } else if (fingers === 1) {
                if (isSwipe.call(this, event)) {
                    trigger(SWIPE, {event: event, proxy: proxy});
                    swipeDirection.call(this, event);
                } else {
                    trigger(TAP, {event: event, proxy: proxy});
                }
            } else if (fingers === 2) {
                var anyevent = false;
                if (this.angleDiff!== 0) {
                    trigger(ROTATE, {event: event, proxy: proxy, angle: this.angleDiff});
                    rotateDirection.call(this, event);
                    anyevent = true;
                }
                if (this.distanceDiff !== 0) {
                    trigger(PINCH, {event: event, proxy: proxy, distance: this.distanceDiff});
                    pinchDirection.call(this, event);
                    anyevent = true;
                }
                if (!anyevent && touches[0]) {
                    if (Math.abs(start[0].x - touches[0].x) > dragMinDistance ||
                        Math.abs(start[0].y - touches[0].y) > dragMinDistance) {
                        trigger(DRAG, {event: event, proxy: proxy});
                        dragDirection.call(this, event);
                    }
                }
            }
        };
    }
    
    /**
     * 取消事件
     */
    function cancelEvent(event, force) {//console.log('cancel', defaults.preventDefault, defaults.stopPropagation);
        if(defaults.preventDefault === true || force === true) {//console.log('cancel default');
            event.preventDefault();
        }
        if(defaults.stopPropagation === true || force === true) {//console.log('cancel propagation');
            event.stopPropagation();
        }
    }

    /**
     * 判断是否是 swipe
     */
    function isSwipe(event) {
        var horizontal, vertical, time,
            swipe = false,
            start = this.start,
            current = this.current;
        if (current && current[0] && start && start[0]) {
            horizontal = Math.abs(start[0].x - current[0].x) > defaults.swipeMinDistance;
            vertical = Math.abs(start[0].y - current[0].y) > defaults.swipeMinDistance;
            time = (current[0].t - start[0].t) > defaults.swipeTime;
            console.log('==' + (start == current));
            console.log('start[0].x:' + start[0].x + 'current[0].x:' + current[0].x);
            console.log('start[0].y:' + start[0].y + 'current[0].y:' + current[0].y);
            console.log('time:' + time + 'horizontal:' + horizontal + 'vertical:' + vertical);
            swipe = time && (horizontal || vertical);
        }console.log('isSwipe:' + swipe);
        return swipe;
    }

    /**
     * 判断方向
     */
    function direction(start, end) {
        if (!start || !start[0] || !end || !end[0]) {
            return '';
        }
        var x1 = start[0].x,
            y1 = start[0].y,
            x2 = end[0].x,
            y2 = end[0].y,
            xDelta = Math.abs(x1 - x2),
            yDelta = Math.abs(y1 - y2),
            proxy = this.proxy,
            d;
        if (xDelta >= yDelta) {
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
     * drag 方向
     */
    function dragDirection(event) {
        var proxy = this.proxy,
            start = this.start,
            current = this.current,
            d = direction(start, current),
            type = DRAG + capFirst(d);
        trigger(type, {event: event, proxy: proxy, direction: d});
    }

    /**
     * swipe 方向
     */
    function swipeDirection(event) {
        var proxy = this.proxy,
            start = this.start,
            current = this.current,
            d = direction(start, current),
            type = SWIPE + capFirst(d);
        trigger(type, {event: event, proxy: proxy, direction: d});
    }

    /**
     * rotate 方向
     */
    function rotateDirection(event) {
        var proxy = this.proxy,
            angleDiff = this.angleDiff,
            d = this.angleDiff > 0 ? RIGHT : LEFT,
            type = ROTATE + capFirst(d);
        trigger(type, {event: event, proxy: proxy, angle: angleDiff, direction: d});
    }

    /**
     * pinch 方向
     */
    function pinchDirection(event) {
        var proxy = this.proxy,
            distanceDiff = THIS.distanceDiff,
            d = distanceDiff > 0 ? OUT : IN,
            type = PINCH + capFirst(d);
        trigger(type, {event: event, proxy: proxy, distance: distanceDiff, direction: d});
    }


    /**
     * 捕获旋转
     */
    function captureRotate(event) {
        var angle, diff, i, symbol,
            proxy = this.proxy,
            current = this.current;
        angle = parseInt(angle(current), 10);
        diff = parseInt(this.angle - angle, 10);
        if (Math.abs(diff) > 20 || this.angleDiff !== 0) {
            i = 0;
            symbol = this.angleDiff < 0 ? "-" : "+";
            while (Math.abs(diff - this.angleDiff) > 90 && i++ < 10) {
                eval("diff " + symbol + "= 180;");
            }
            diff = parseInt(diff, 10);
            this.angleDiff = diff;
            trigger(ROTATING, {event: event, proxy: proxy, angle: diff});
        }
    }

    /**
     * 捕获旋转
     */
    function capturePinch(event) {
        var diff, distance,
            proxy = this.proxy,
            current = this.current;
        distance = parseInt(distance(current), 10);
        diff = this.distance - distance;
        if (Math.abs(diff) > defaults.pinchMinDistance) {
            this.distanceDiff = diff;
            trigger(PINCHING, {event: event, proxy: proxy, distance: diff});
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
                cancelEvent(event, true);
                trigger(HOLD, {event: event, proxy: proxy});
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
            id = touch.identifier || Math.random() * 10000000;
            x = touch.pageX;
            y = touch.pageY;
            t = now();
            ts.push({el: el, id: id, x: x, y: y, t: t});
        });
        return ts;
    }

    /**
     * 计算角度
     */
    function angle(touches) {
        if (!touches || touches.length < 2) {
            return 0;
        }
        var t1 = touches[0],
            t2 = touches[1],
            a = Math.atan((t2.y - t1.y) * -1 / (t2.x - t1.x)) * (180 / Math.PI);
        if (a < 0) {
            a += 180;
        }
        return a;
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