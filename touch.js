/**
 * touch.js
 */
(function() {

    var LEFT = 'Left';
    var RIGHT = 'Right';
    var UP = 'Up';
    var DOWN  = 'Down';
    var IN = 'In';
    var OUT = 'Out';

    var DRAG = 'drag';
    var DRAGGING = 'dragging';
    var DOUBLE_TAP = 'doubleTap';
    var HOLD = 'hold';
    var ROTATE = 'rotate';
    var ROTATING = 'rotating';
    var SWIPE = 'swipe';
    var SWIPING = 'swiping';
    var TAP = 'tap';
    var TAP2 = 'tap2';
    var TOUCH = 'touch';
    var PINCH = 'pinch';
    var PINCHING = 'pinching';

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
                _.each(this.map, function(value, key) {
                    fn.call(this, value, key);
                }, this);
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
     * Touch
     */
    function Touch() {
        this.init.apply(this, arguments);
    }

    /**
     * 事件类型
     */
    Touch.prototype.types = [
        DOUBLE_TAP, HOLD, TAP, TAP2, TOUCH,
        DRAG, DRAGGING,
        DRAG + LEFT, DRAG + RIGHT,
        DRAG + UP, DRAG + DOWN,
        ROTATE, ROTATING,
        ROTATE + LEFT, ROTATE + RIGHT,
        SWIPE, SWIPING,
        SWIPE + LEFT, SWIPE + RIGHT,
        SWIPE + UP, SWIPE + DOWN,
        PINCH, PINCHING,
        PINCH + IN, PINCH + OUT
    ];

    /**
     * 默认配置
     */
    Touch.prototype.defaults = {
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

            hold: true,
            holdTimeout: 350, // ms

            tap: true,
            tapMaxDistance: 10, // pixels

            tap2: true,
            tap2MaxInterval: 150, // ms
            tap2MaxDistance: 15, // pixels

            doubleTap: true,
            doubleTapMaxInterval: 300, // ms
            doubleTapMaxDistance: 20, // pixels

            pinch: true,
            pinchMinDistance: 10, // pixels

            rotate: true,
            rotateMinAngle: 10 // degrees
        };

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
    Touch.prototype.eventMap = null;

    /**
     * 代理类配置
     * 数据结构
     * proxyMap: {
     *      proxy: {
     *          startFn, moveFn, endFn
     *      }
     * }
     */
    Touch.prototype.proxyMap = null;
    
    /**
     * 取消事件默认方法或者冒泡
     */
    Touch.prototype.cancelEvent = function (event, force) {
        if (defaults.preventDefault === true ||
            force === true) {
            event.preventDefault();
        }
        if (defaults.stopPropagation === true ||
            force === true) {
            event.stopPropagation();
        }
        if (defaults.stopImmediatePropagation === true ||
            force === true) {
            event.stopImmediatePropagation();
        }
    };

    /**
     * 简单的元素选择器
     */
    Touch.prototype.$ = function (selector) {
        var matches = selectorExec(selector);

        // 处理 document
        if (matches[2] === 'document') {
            return [document];

        // 处理 body
        } else if (matches[2] === 'body') {
            return [document.body];

        // 处理 class
        } if (matches[1] === '.') {
            return document.getElementsByClassName(match[2]);

        // 处理 id
        } else if (matches[1] === '#') {
            var el = document.getElementById(match[2]);
            return el ? [el] : [];

        // 处理 tagName
        } else if (matches[1] === selector) {
            return document.getElementsByTagName(match[2]);
        }
    };

    /**
     * 初始化
     */
    Touch.prototype.init = function(options) {
        if (options) {
            _.extend(this.defaults, options.defaults);
        }
        this.reset();
    };

    /**
     * 重置所有环境
     */
    Touch.prototype.reset = function (resetDefaults) {
        if (this.proxyMap) {
            this.proxyMap.each(function(context, selector) {
                this.removeEvent(selector);
            }, this);
        }
        if (resetDefaults === true) {
            this.defaults = _.extend({}, this.originDefaults);
        }
        this.proxyMap = new Map();
        this.eventMap = new Map();
        return this;
    };

    /**
     * 配置默认选项
     */
    Touch.prototype.config = function (key, value) {
        if (_.isObject(key)) {
            _.each(key, function(v, k) {
                this.defaults[k] = v;
            });
        } else if (_.isDef(value)) {
            this.defaults[key] = value;
        }
        return this;
    };

    /**
     * 解析 item
     */
    Touch.prototype.parseItem = function (item) {
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
    };

    /**
     * 委托响应函数
     *  on(selectors, item)
     *  on(selectors, proxy, item)
     * item 格式允许如下形式
     *  [fn, context]
     *  [fn, args]
     *  [fn, context, args]
     */
    Touch.prototype.on = function (selectors, proxy, item, options) {
        if (_.isObject(selectors)) {
            _.each(selectors, function(item, selector) {
                this.on(selector, proxy, item, options);
            }, this);
        } else if (_.isString(selectors)) {
            eachSelector(selectors, function(type, selector) {
                this.bindEvent(type, selector, proxy, item, options);
            }, this);
        }
        return this;
    };

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
    Touch.prototype.off = function (selectors, proxy, item) {
        if (_.isObject(selectors)) {
            _.each(selectors, function(item, selector) {
                this.off(selector, proxy, item);
            }, this);
        } else if (_.isString(selectors)) {
            eachSelector(selectors, function(type, selector) {
console.log('off:', type, selector, proxy, item, true);
                this.bindEvent(type, selector, proxy, item, true);
            }, this);
        } else if (selectors === true &&
            (_.isString(proxy) || _.isUndef(proxy))) {
            proxy = (proxy || 'document').trim();
            this.removeEvent(proxy);
        }
        return this;
    };

    /**
     * 绑定元素事件监听
     */
    Touch.prototype.addEvent = function (proxy) {
console.log('addEvent', proxy);
        if (!proxy) {
            return;
        }

        var els = $(proxy),
            context = this.proxyMap.get(proxy);
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

        this.proxyMap.set(proxy, context);
    };

    /**
     * 解绑元素事件监听
     */
    Touch.prototype.removeEvent = function (proxy) {
console.log('removeEvent', proxy);
        if (!proxy) {
            return;
        }

        var context = this.proxyMap.get(proxy);
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

        this.proxyMap.remove(proxy);
    };

    /**
     * 更新元素事件监听
     * 如果没有监听就移除，如果还有加入监听则
     */
    Touch.prototype.updateEvent = function (proxy) {
        eventMap.each(function(typeMap, p) {
            if (!proxy || proxy === p) {
                var active = 0;
                typeMap.each(function(selectorMap) {
                    selectorMap.each(function(items) {
                        active += items.length;
                    });
                });
                if (active > 0) {
                    this.addEvent(p);
                } else {
                    this.removeEvent(p);
                }
            }
        }, this);
    };

    /**
     * 分解选择器并遍历
     */
    Touch.prototype.eachSelector = function (selectors, iterator, context) {
        var items, type, selector;
        if (!context) {
            context = this;
        }
        selectors = selectors.split(',');
        _.each(selectors, function(item) {
            items = item.split(' ');
            if (items.length > 0 && types.indexOf(items[0]) > -1) {
                type = items.shift();
            } else {
                type = defaults.type;
            }
            selector = items.join(' ');
            iterator.call(this, type, selector);
        }, this);
    };

    /**
     * 拆分选择器
     */
    Touch.prototype.splitSelector = function (selectors) {
        var a, s;
        if (_.isArray(selectors)) {
            a = [];
            _.each(selectors, function(selector) {
                s = splitSelector(selector);
                a.push(s);
            });
        } else if (_.isString(selectors)) {
            if (!selectors) {
                return [];
            }
            a = selectors.replace(/\./g, '\x00.').replace(/#/g, '\x00#').split('\x00');
            if (a.length > 0 && a[0] === '') {
                a.shift();
            }
        }
        return a;
    };

    /**
     * 选择器分解
     */
    Touch.prototype.selectorExec = function (selector) {
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
    };

    /**
     * 是否匹配选择器
     */
    Touch.prototype.isSelectorMatch = function (el, selector) {
        if (!el || !selector) {
            return false;
        }

        var array = splitSelector(selector),
            className, matches, isMatch;
        for(var i = 0; i < array.length; i++) {
            var part = array[i];
            matches = selectorExec(part);
            isMatch = false;
            // 处理 class
            if (matches[1] === '.') {
                className = el.className;
                if (className) {
                    _.each(className.split(' '), function(c) {
                        if (c === matches[2]) {
                            isMatch = true;
                        }
                    });
                }

            // 处理 id
            } else if (matches[1] === '#') {
                isMatch = el.id === matches[2];

            // 处理 tagName
            } else if (el && el.tagName) {
                isMatch = el.tagName.toLowerCase() === matches[2].toLowerCase();
            }
            if (!isMatch) {
                return isMatch;
            }
        }
        return true;
    };

    /**
     * 从源目标开始向上查找匹配事件监听的节点
     */
    Touch.prototype.walk = function (type, proxy, el, fn) {
console.log('walk:', type, proxy, el, 'fn');
        typeMap = this.eventMap.get(proxy);
        if (!typeMap) {
            return;
        }

        selectorMap = typeMap.get(type);
        if (!selectorMap) {
            return;
        }

        var origins = selectorMap.keys(),
            selectors = [],
            selector, length;

        // 将 'div .a .b.c' 分解为 ['div', '.a', '.b.c']
        _.each(origins, function(selector) {
            selectors.push(selector.split(' '));
        });

        while (el) {
            _.each(selectors, function(selectorArray) {
                length = selectorArray.length;
                if (length > 0) {
                    selector = selectorArray[length - 1];
                    // 选择器是否匹配当前元素，匹配则取出
                    if (isSelectorMatch(el, selector)) {
                        selectorArray.pop();
                    }
                }
            }, this);

            if (el.parentNode && el.parentNode !== el) {
                el = el.parentNode;
            } else {
                break;
            }
        }

        var items;
        _.each(selectors, function(selectorArray, index) {
            if (selectorArray.length === 0) {
                items = selectorMap.get(origins[index]);
                fn.call(this, items);
            }
        }, this);
    };

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
    Touch.prototype.bindEvent = function (type, selector, proxy, item, options) {
console.log('bind', type, selector, proxy, 'item', options);
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
            item = this.parseItem(item);
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
                this.eventMap.each(function(typeMap) {
                    selectorMap = typeMap.get(type);
                    if (selectorMap) {
                        selectorMap.remove(selector);
                    }
                });
                proxy = null;

            // 解绑在指定父级元素所有响应函数
            } else if (selector.toString() === 'true') {
                typeMap = this.eventMap.get(proxy);
                if (typeMap) {
                    typeMap.remove(type);
                }

            // 指定 type 和 proxy
            } else {
                typeMap = this.eventMap.get(proxy);
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
            typeMap = this.eventMap.get(proxy, newMap);
            selectorMap = typeMap.get(type, newMap);
            content = selectorMap.get(selector, []);
            content.push(item);
        }

        this.updateEvent(proxy);
    };

    /**
     * 向绑定事件监听的元素派发事件
     */
    Touch.prototype.trigger = function (type, options) {
console.log('trigger:' + type);
        var proxy, event,
            target, currentTarget,
            typeMap, selectorMap,
            fireEvent = this.fireEvent;

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
            typeMap = this.eventMap.get(proxy);
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
    };

    /**
     * 触发事件
     */
    Touch.prototype.fireEvent = function (items, options) {
console.log('fireEvent', items, options);
        var fn, context, args, target, iterator;
        if (!options) {
            options = {};
        }
        target = options.target || document;
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
    };

    /**
     * 响应触摸开始
     */
    Touch.prototype.onTouchStart = function () {
        return function(event, context) {
//console.log('touch start', event, this);
            cancelEvent(event);
            var proxy = context.proxy,
                start = extractTouches(event.touches),
                fingers = start.length,
                doubleTap = false;

            // 重置手势
            this.resetGesture({start: start, prev: start, current: start,
                fingers: fingers}, context);

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
    };

    /**
     * 响应触摸移动
     */
    Touch.prototype.onTouchMove = function () {
        return function(event, context) {
            cancelEvent(event);
            hold.call(this, false);
            this.prev = this.current;
            this.current = extractTouches(event.touches);
            var fingers = this.current.length;
            if (fingers === this.fingers) {
                if (fingers === 1) {
                    if (defaults.swipe && (this.swiping = isSwipe.call(this, event))) {
                        swping.call(this, event);
                    } else if(defaults.drag && this.hold) {
                        this.drag = true;
                        that.dragging.call(this, event);
                    }
                } else if (fingers === 2) {
                    cancelEvent(event, true);
                    this.rotate = defaults.rotate && rotating.call(this, event);
                    this.pinch = defaults.pinch && pinching.call(this, event);
                    if (!this.rotate && !this.pinch && defaults.drag) {
                        this.drag = true;
                        that.dragging.call(this, event);
                    }
                }
            } else {
                that.resetGesture();
            }
        };
    };

    /**
     * 响应触摸结束
     */
    Touch.prototype.onTouchEnd = function () {
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
    };

    /**
     * 重置手势
     */
    Touch.prototype.resetGesture = function (options) {
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
    };

    /**
     * tap
     */
    Touch.prototype.tap = function (event) {
        var proxy = this.proxy,
            start = this.start,
            options = {event: event, proxy: proxy, touches: start};
        trigger(TAP, options);
    };

    /**
     * 2 fingers tap
     */
    Touch.prototype.tap2 = function (event) {
        var proxy = this.proxy,
            start = this.start,
            distance = detectDistance(start[0], start[1]),
            options = {event: event, proxy: proxy, touches: start,
                distance: distance};
        trigger(TAP2, options);
    };

    /**
     * double tap
     */
    Touch.prototype.doubleTap = function (event) {
        var proxy = this.proxy,
            start = this.start,
            interval = this.doubleTapInterval,
            distance = this.doubleTapDistance,
            options = {event: event, proxy: proxy, touches: start,
                distance: distance, interval: interval};
        trigger(DOUBLE_TAP, options);
    };

    /**
     * hold
     */
    Touch.prototype.hold = function (event) {
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
    };

    /**
     * drag
     */
    Touch.prototype.drag = function (event) {
        var proxy = this.proxy,
            start = this.start,
            current = this.current,
            distance = detectDistance(start, current),
            direction = detectDirection(start, current),
            options = {event: event, proxy: proxy, touches: start,
                direction: direction.toLowerCase(), distance: distance};
        trigger(DRAG, options);
        trigger(DRAG + direction, options);
    };

    /**
     * draging
     */
    Touch.prototype.dragging = function (event) {
        var proxy = this.proxy,
            start = this.start,
            prev = this.prev,
            current = this.current,
            distance = detectDistance(start, current),
            direction = detectDirection(start, current),
            delta = detectDistance(prev, current),
            options = {event: event, proxy: proxy, touches: start,
                direction: direction.toLowerCase(), distance: distance, delta: delta};
        trigger(DRAGGING, options);
    };

    /**
     * swipe
     */
    Touch.prototype.swipe = function (event) {
        var proxy = this.proxy,
            start = this.start,
            current = this.current,
            distance = detectDistance(start, current),
            direction = detectDirection(start, current),
            options = {event: event, proxy: proxy, touches: start,
                direction: direction.toLowerCase(), distance: distance};
        trigger(SWIPE, options);
        trigger(SWIPE + direction, options);
    };

    /**
     * swiping
     */
    Touch.prototype.swping = function (event) {
        var proxy = this.proxy,
            start = this.start,
            prev = this.prev,
            current = this.current,
            distance = detectDistance(start, current),
            direction = detectDirection(start, current),
            delta = detectDistance(prev, current),
            options = {event: event, proxy: proxy, touches: start,
                direction: direction.toLowerCase(), distance: distance, delta: delta};
        trigger(SWIPING, options);
    };

    /**
     * rotate
     */
    Touch.prototype.rotate = function (event) {
        var proxy = this.proxy,
            angleDiff = this.angleDiff,
            direction = this.angleDiff > 0 ? RIGHT : LEFT,
            options = {event: event, proxy: proxy, touches: start,
                angle: angleDiff, direction: direction.toLowerCase()};
        trigger(ROTATE, options);
        trigger(ROTATE + direction, options);
    };

    /**
     * rotating
     */
    Touch.prototype.rotating = function (event) {
        var angle, diff, delta, i, symbol, direction, options,
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
            options = {event: event, proxy: proxy, touches: start,
                direction: direction.toLowerCase(), angle: diff, delta: delta};
            trigger(ROTATING, options);
            captured = true;
        }
        return captured;
    };

    /**
     * pinch
     */
    Touch.prototype.pinch = function (event) {
        var proxy = this.proxy,
            distanceDiff = this.distanceDiff,
            scale = this.scale,
            direction = distanceDiff > 0 ? OUT : IN,
            options = {event: event, proxy: proxy, touches: start,
                distance: distanceDiff, direction: direction.toLowerCase(), scale: scale};
        trigger(PINCH, options);
        trigger(PINCH + direction, options);
    };

    /**
     * pinching
     */
    Touch.prototype.pinching = function (event) {
        var distance, diff, delta, scale, direction, options,
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
            options = {event: event, proxy: proxy, touches: start,
                direction: direction.toLowerCase(), distance: diff,
                delta: delta, scale: scale};
            trigger(PINCHING, options);
            captured = true;
        }
        return captured;
    };

    /**
     * 判断是否是 tap
     */
    Touch.prototype.isTap = function (event) {
        var start = this.start,
            current = this.current,
            d = Math.abs(detectDistance(start, current)) < defaults.tapMaxDistance;
        return d;
    };

    /**
     * 判断是否是 2 fingers tap
     */
    Touch.prototype.isTap2 = function (event) {
        var start = this.start,
            current = this.current,
            d = Math.abs(detectDistance(start, current)) < defaults.tap2MaxDistance,
            t = detectInterval(start, current) <= defaults.tap2MaxInterval;
        return d && t;
    };

    /**
     * 判断是否是 double tap
     */
    Touch.prototype.isDoubleTap = function (event) {
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
    };

    /**
     * 判断是否是 swipe
     */
    Touch.prototype.isSwipe = function (event) {
        var start = this.start,
            current = this.current,
            d = Math.abs(detectDistance(start, current)) > defaults.swipeMinDistance,
            t = detectInterval(start, current) <= defaults.swipeMaxTime;
        return d && t;
    };

    /**
     * 判断是否是 drag
     */
    Touch.prototype.isDrag = function (event) {
        var start = this.start,
            current = this.current,
            d = Math.abs(detectDistance(start, current)) > defaults.dragMinDistance;
        return d;
    };

    /**
     * 提取 touch 信息
     */
    Touch.prototype.extractTouches = function (touches) {
        var ts = [],
            el, id, x, y, t;
        _.each(touches, function(touch) {
            el = touch.target;
            id = touch.identifier || Math.random() * 10000000;
            x = touch.pageX;
            y = touch.pageY;
            t = new Date();
            ts.push({el: el, id: id, x: x, y: y, t: t});
        });
        return ts;
    };

    /**
     * 检测角度
     */
    Touch.prototype.detectAngle = function (start, end) {
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
    };

    /**
     * 检测距离
     */
    Touch.prototype.detectDistance = function (start, end) {
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
    };

    /**
     * 检测方向
     */
    Touch.prototype.detectDirection = function (start, end) {
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
    };

    /**
     * 检测时间间隔
     */
    Touch.prototype.detectInterval = function (start, end) {
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
    };

    window.touch = self;
})();