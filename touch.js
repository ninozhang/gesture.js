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
            if (typeof key !== 'undefined') {
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
                }, context || this);
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
        tapMaxDistance: 15, // pixels

        tap2: true,
        tap2MaxInterval: 150, // ms
        tap2MaxDistance: 20, // pixels

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
        var defaults = this.defaults;
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

    Touch.prototype.preventDefault = function () {
        return function() {
            // 无效方法
            this.isDefaultPrevented = true;
        };
    };

    Touch.prototype.stopPropagation = function () {
        return function() {
            this.isPropagationStopped = true;
        };
    };

    Touch.prototype.stopImmediatePropagation = function () {
        return function() {
            this.isImmediatePropagationStopped = true;
        };
    };

    /**
     * 简单的元素选择器
     */
    Touch.prototype.$ = function (selector) {
        var matches = this.selectorExec(selector);

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
            }, this);
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
            this.eachSelector(selectors, function(type, selector) {
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
            this.eachSelector(selectors, function(type, selector) {
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

        var that = this,
            bind,
            els = this.$(proxy),
            options = this.proxyMap.get(proxy);
        if (!els || options) {
            return;
        }

        bind = function(fn) {
            return function(event) {
                fn.call(that, event, options);
            };
        };

        options = {proxy: proxy, id: Math.random() * Math.random()};
        options.startFn = bind(this.onTouchStart());
        options.moveFn = bind(this.onTouchMove());
        options.endFn = bind(this.onTouchEnd());
        _.each(els, function(el) {
            if (el && el.addEventListener) {
                el.addEventListener('touchstart', options.startFn);
                el.addEventListener('touchmove', options.moveFn);
                el.addEventListener('touchend', options.endFn);
                el.addEventListener('touchcancel', options.endFn);
            }
        });

        this.proxyMap.set(proxy, options);
    };

    /**
     * 解绑元素事件监听
     */
    Touch.prototype.removeEvent = function (proxy) {
console.log('removeEvent', proxy);
        if (!proxy) {
            return;
        }

        var options = this.proxyMap.get(proxy);
        if (!options) {
            return;
        }

        var els = this.$(proxy);
        _.each(els, function(el) {
            if (el && el.removeEventListener) {
                el.removeEventListener('touchstart', options.startFn);
                el.removeEventListener('touchmove', options.moveFn);
                el.removeEventListener('touchend', options.endFn);
                el.removeEventListener('touchcancel', options.endFn);
            }
        });


        this.proxyMap.remove(proxy);
    };

    /**
     * 更新元素事件监听
     * 如果没有监听就移除，如果还有加入监听则
     */
    Touch.prototype.updateEvent = function (proxy) {
        this.eventMap.each(function(typeMap, p) {
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
    Touch.prototype.eachSelector = function (selectors, iterator) {
        var items, type, selector;
        selectors = selectors.split(',');
        _.each(selectors, function(item) {
            items = item.split(' ');
            if (items.length > 0 && this.types.indexOf(items[0]) > -1) {
                type = items.shift();
            } else {
                type = this.defaults.type;
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

        var array = this.splitSelector(selector),
            className, matches, isMatch;
        for(var i = 0; i < array.length; i++) {
            var part = array[i];
            matches = this.selectorExec(part);
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
    Touch.prototype.walk = function (type, proxy, target, fn) {
        typeMap = this.eventMap.get(proxy);
        if (!typeMap) {
            return;
        }

        selectorMap = typeMap.get(type);
        if (!selectorMap) {
            return;
        }

        var el = target,
            targetMap = new Map(),
            levelMap = new Map(),
            level = 0,
            orders = [],
            origins = selectorMap.keys(),
            selectors = [],
            selector, length;

        // 将 'div .a .b.c' 分解为 ['div', '.a', '.b.c']
        _.each(origins, function(selector) {
            selectors.push(selector.split(' '));
        });

        while (el) {
            _.each(selectors, function(selectorArray, index) {
                length = selectorArray.length;
                if (length > 0) {
                    selector = selectorArray[length - 1];
                    // 选择器是否匹配当前元素，匹配则取出
                    if (this.isSelectorMatch(el, selector)) {
                        if (!targetMap.has(index)) {
                            targetMap.set(index, el);
                            levelMap.set(index, level);
                            orders.push(index);
                        }
                        selectorArray.pop();
                    }
                }
            }, this);

            level++;

            if (el.parentNode && el.parentNode !== el) {
                el = el.parentNode;
            } else {
                break;
            }
        }

        var items;
        _.each(orders, function(index) {
            if (selectors[index].length === 0) {
                selector = origins[index];
                items = selectorMap.get(selector);
                level = levelMap.get(index);
                fn.call(this, items, target, targetMap.get(index, target), level);
            }
        });
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
            _.extend(item.options, this.defaults);
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
        var proxy, event,
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
            var currentLevel = 0;
            this.walk(type, proxy, event.target, function(item, target, currentTarget, level) {
                if (!options.isImmediatePropagationStopped &&
                    (!options.isPropagationStopped ||
                        (options.isPropagationStopped && level <= currentLevel))) {
                    options.target = target;
                    options.currentTarget = currentTarget;
                    fireEvent(item, options);
                    currentLevel = level;
                }
            });
        }
    };

    /**
     * 触发事件
     */
    Touch.prototype.fireEvent = function (items, options) {
        var fn, context, args, target, iterator;
        if (!options) {
            options = {};
        }
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
            var length = items.length;
            for (var i = 0; i < length; i++) {
                var item = items[i];
                iterator(item);
                if (options.isImmediatePropagationStopped) {
                    break;
                }
            }
        } else {
            iterator(items);
        }
    };

    /**
     * 响应触摸开始
     */
    Touch.prototype.onTouchStart = function () {
        return function(event, options) {
//console.log('touch start', options, this);
            this.cancelEvent(event);

            var start = this.extractTouches(event.touches),
                fingers = start.length;

            // 重置手势
            this.resetGesture(options, {start: start, prev: start, current: start,
                fingers: fingers});

            options.event = event;

            if (fingers === 1) {
                // 判断是否 double tap
                if (this.defaults.doubleTap && this.isDoubleTap(options)) {
                    options.doubleTap = true;
                }

                // 判断是否 hold
                if (this.defaults.hold) {
                    this.hold(options);
                }
            } else if (fingers === 2) {
                options.angle = parseInt(this.detectAngle(start), 10);
                options.distance = parseInt(this.detectDistance(start), 10);
            }
        };
    };

    /**
     * 响应触摸移动
     */
    Touch.prototype.onTouchMove = function () {
        return function(event, options) {
//console.log('touch move', options, this);
            this.cancelEvent(event);
            this.hold(options, false);

            options.prev = options.current;
            options.current = this.extractTouches(event.touches);

            var defaults = this.defaults,
                fingers = options.current.length;

            if (fingers === options.fingers) {
                if (fingers === 1) {
                    if (defaults.swipe && (options.swiping = this.isSwipe(options))) {
                        this.swping(options);
                    } else if(defaults.drag && options.hold) {
                        options.drag = true;
                        this.dragging(options);
                    }
                } else if (fingers === 2) {
                    this.cancelEvent(event, true);
                    options.rotate = defaults.rotate && this.rotating(options);
                    options.pinch = defaults.pinch && this.pinching(options);
                    if (!options.rotate && !options.pinch && defaults.drag) {
                        options.drag = true;
                        this.dragging(options);
                    }
                }
            } else {
                this.resetGesture();
            }
        };
    };

    /**
     * 响应触摸结束
     */
    Touch.prototype.onTouchEnd = function () {
        return function(event, options) {
            this.cancelEvent(event);
            this.hold(options, false);

            var defaults = this.defaults,
                fingers = options.fingers;
            if (fingers === 1) {
                if (defaults.doubleTap && options.doubleTap) {
                    this.doubleTap(options);
                } else if (defaults.swipe && this.isSwipe(options)) {
                    this.swipe(options);
                } else if (defaults.drag && options.drag) {
                    this.drag(options);
                } else if (defaults.tap && !options.hold && this.isTap(options)) {
                    this.tap(options);
                }
            } else if (fingers === 2) {
                if (defaults.tap2 && this.isTap2(options)) {
                    options.tap2 = true;
                    this.tap2(options);
                }
                if (!options.tap2) {
                    if (defaults.rotate && options.rotate) {
                        this.rotate(options);
                    }
                    if (defaults.pinch && options.pinch) {
                        this.pinch(options);
                    }
                    if (defaults.drag &&
                        ((!options.pinch && !options.rotate && this.isDrag(options)) ||
                            options.drag)) {
                        this.drag(options);
                    }
                }
            }
        };
    };

    /**
     * 重置手势
     */
    Touch.prototype.resetGesture = function (options, more) {
        if (!more) {
            more = {};
        }
        options.isDefaultPrevented = false;
        options.isImmediatePropagationStopped = false;
        options.isPropagationStopped = false;
        options.preventDefault = _.bind(this.preventDefault(), options);
        options.stopPropagation = _.bind(this.stopPropagation(), options);
        options.stopImmediatePropagation = _.bind(this.stopImmediatePropagation(), options);
        options.last = options.start || [];
        options.start = more.start || [];
        options.touches = options.start;
        options.prev = more.prev || [];
        options.current = more.current || [];
        options.fingers = more.fingers || 0;
        options.angle = more.angle || 0;
        options.lastAngle = more.angle || 0;
        options.angleDiff = 0;
        options.distance = more.distance || 0;
        options.lastDistance = more.distance || 0;
        options.distanceDiff = 0;
        options.tap2 = false;
        options.doubleTap = more.doubleTap || false;
        options.doubleTapInterval = more.doubleTapInterval || 0;
        options.doubleTapDistance = more.doubleTapDistance || 0;
        options.scale = 1;
        options.hold = false;
        options.drag = false;
        options.pinch = false;
        options.rotate = false;
    };

    /**
     * 合并属性
     */
    Touch.prototype.merge = function(options, more) {
        if (!more) {
            more = {};
        }
        return _.extend(options, more);
    };

    /**
     * tap
     */
    Touch.prototype.tap = function (options) {
        this.trigger(TAP, options);
    };

    /**
     * 2 fingers tap
     */
    Touch.prototype.tap2 = function (options) {
        var proxy = options.proxy,
            start = options.start,
            distance = this.detectDistance(start[0], start[1]);
        options = this.merge(options, {distance: distance});
        this.trigger(TAP2, options);
    };

    /**
     * double tap
     */
    Touch.prototype.doubleTap = function (options) {
        var interval = options.doubleTapInterval,
            distance = options.doubleTapDistance;
        options = this.merge(options, {distance: distance, interval: interval});
        this.trigger(DOUBLE_TAP, options);
    };

    /**
     * hold
     */
    Touch.prototype.hold = function (options, remove) {
        clearTimeout(options.holdTimer);
        if (remove !== false) {
            var that = this;
            options.holdTimer = setTimeout(function() {
                that.cancelEvent(options.event, true);
                options.hold = true;
                that.trigger(HOLD, options);
            }, this.defaults.holdTimeout);
        }
    };

    /**
     * drag
     */
    Touch.prototype.drag = function (options) {
        var start = options.start,
            current = options.current,
            distance = this.detectDistance(start, current),
            direction = this.detectDirection(start, current);
        options = this.merge(options, {direction: direction.toLowerCase(), distance: distance});
        this.trigger(DRAG, options);
        this.trigger(DRAG + direction, options);
    };

    /**
     * draging
     */
    Touch.prototype.dragging = function (options) {
        var start = options.start,
            prev = options.prev,
            current = options.current,
            distance = this.detectDistance(start, current),
            direction = this.detectDirection(start, current),
            delta = this.detectDistance(prev, current);
        options = this.merge(options, {direction: direction.toLowerCase(), distance: distance, delta: delta});
        this.trigger(DRAGGING, options);
    };

    /**
     * swipe
     */
    Touch.prototype.swipe = function (options) {
        var start = options.start,
            current = options.current,
            distance = this.detectDistance(start, current),
            direction = this.detectDirection(start, current);
        options = this.merge(options, {direction: direction.toLowerCase(), distance: distance});
        this.trigger(SWIPE, options);
        this.trigger(SWIPE + direction, options);
    };

    /**
     * swiping
     */
    Touch.prototype.swping = function (options) {
        var start = options.start,
            prev = options.prev,
            current = options.current,
            distance = this.detectDistance(start, current),
            direction = this.detectDirection(start, current),
            delta = this.detectDistance(prev, current);
        options = this.merge(options, {direction: direction.toLowerCase(), distance: distance, delta: delta});
        this.trigger(SWIPING, options);
    };

    /**
     * rotate
     */
    Touch.prototype.rotate = function (options) {
        var angleDiff = options.angleDiff,
            direction = angleDiff > 0 ? RIGHT : LEFT;
        options = this.merge(options, {angle: angleDiff, direction: direction.toLowerCase()});
        this.trigger(ROTATE, options);
        this.trigger(ROTATE + direction, options);
    };

    /**
     * rotating
     */
    Touch.prototype.rotating = function (options) {
        var angle, diff, delta, i, symbol, direction,
            current = options.current,
            captured = false;
        angle = parseInt(this.detectAngle(current), 10);
        diff = parseInt(options.angle - angle, 10);
        symbol = options.angleDiff < 0 ? "-" : "+";
        i = 0;
        while (Math.abs(diff - options.angleDiff) > 90 &&
            i++ < 10) {
            if (symbol === '+') {
                diff += 180;
            } else {
                diff -= 180;
            }
        }
        diff = parseInt(diff, 10);
        delta = options.lastAngle - angle;
        if ((Math.abs(diff) > this.defaults.rotateMinAngle ||
            options.angleDiff !== 0) &&
            delta !== 0) {
            options.lastAngle = angle;
            options.angleDiff = diff;
            direction = diff > 0 ? RIGHT : LEFT;
            options = this.merge(options, {direction: direction.toLowerCase(),
                angle: diff, delta: delta});
            this.trigger(ROTATING, options);
            captured = true;
        }
        return captured;
    };

    /**
     * pinch
     */
    Touch.prototype.pinch = function (options) {
        var distanceDiff = options.distanceDiff,
            scale = options.scale,
            direction = distanceDiff > 0 ? OUT : IN;
        options = this.merge(options, {distance: distanceDiff,
            direction: direction.toLowerCase(), scale: scale});
        this.trigger(PINCH, options);
        this.trigger(PINCH + direction, options);
    };

    /**
     * pinching
     */
    Touch.prototype.pinching = function (options) {
        var distance, diff, delta, scale, direction,
            proxy = options.proxy,
            current = options.current,
            captured = false;
        distance = parseInt(this.detectDistance(current), 10);
        diff = distance - options.distance;
        delta = distance - options.lastDistance;
        if (Math.abs(diff) > this.defaults.pinchMinDistance &&
            delta !== 0) {
            options.lastDistance = distance;
            options.distanceDiff = diff;
            options.scale = scale = Math.abs(distance) / Math.abs(options.distance);
            direction = diff > 0 ? OUT : IN;
            options = this.merge(options, {direction: direction.toLowerCase(),
                distance: diff, delta: delta, scale: scale});
            this.trigger(PINCHING, options);
            captured = true;
        }
        return captured;
    };

    /**
     * 判断是否是 tap
     */
    Touch.prototype.isTap = function (options) {
        var defaults = this.defaults,
            start = options.start,
            current = options.current,
            d = Math.abs(this.detectDistance(start, current)) < defaults.tapMaxDistance;
        return d;
    };

    /**
     * 判断是否是 2 fingers tap
     */
    Touch.prototype.isTap2 = function (options) {
        var defaults = this.defaults,
            start = options.start,
            current = options.current,
            d = Math.abs(this.detectDistance(start, current)) < defaults.tap2MaxDistance,
            t = this.detectInterval(start, current) <= defaults.tap2MaxInterval;
        return d && t;
    };

    /**
     * 判断是否是 double tap
     */
    Touch.prototype.isDoubleTap = function (options) {
        var defaults = this.defaults,
            last = options.last,
            start = options.start,
            doubleTapInterval,
            doubleTapDistance;
        if (last && last[0]) {
            doubleTapInterval = this.detectInterval(last, start);
            doubleTapDistance = Math.abs(this.detectDistance(start, last));
            if (doubleTapInterval  < defaults.doubleTapMaxInterval &&
                doubleTapDistance < defaults.doubleTapMaxDistance) {
                options.doubleTapInterval = doubleTapInterval;
                options.doubleTapDistance = doubleTapDistance;
                return true;
            }
        }
        return false;
    };

    /**
     * 判断是否是 swipe
     */
    Touch.prototype.isSwipe = function (options) {
        var defaults = this.defaults,
            start = options.start,
            current = options.current,
            d = Math.abs(this.detectDistance(start, current)) > defaults.swipeMinDistance,
            t = this.detectInterval(start, current) <= defaults.swipeMaxTime;
        return d && t;
    };

    /**
     * 判断是否是 drag
     */
    Touch.prototype.isDrag = function (options) {
        var defaults = this.defaults,
            start = options.start,
            current = options.current,
            d = Math.abs(this.detectDistance(start, current)) > defaults.dragMinDistance;
        return d;
    };

    /**
     * 提取 touch 信息
     */
    Touch.prototype.extractTouches = function (touches) {
        var ts = [],
            length = touches.length,
            el, id, x, y, t;
        for (var i = 0; i < length; i++) {
            var touch = touches[i];
            el = touch.target;
            id = touch.identifier || Math.random() * 10000000;
            x = touch.pageX;
            y = touch.pageY;
            t = new Date();
            ts.push({el: el, id: id, x: x, y: y, t: t});
        }
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

    window.Touch = Touch;
})();