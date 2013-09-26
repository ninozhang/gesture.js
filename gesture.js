/**
 * gesture.js
 */
(function() {

    var isMobile = navigator.userAgent.match(/(android|ipad;|ipod;|iphone;|iphone os|windows phone)/i);
    
    var ArrayProto = Array.prototype,
        ObjProto = Object.prototype,
        FuncProto = Function.prototype;

    var toString = ObjProto.toString,
        slice = ArrayProto.slice;

    var isArray = Array.isArray;

    // 判断对象的类型
    function type(obj) {
        var t;
        if (obj === null) {
            t = String(obj);
        } else if(typeof obj === 'undefined') {
            return 'undefined';
        } else {
            t = toString.call(obj).toLowerCase();
            t = t.substring(8, t.length - 1);
        }
        return t;
    }

    // 是否是对象
    function isObject(obj) {
        return obj === Object(obj);
    }

    // 是否是函数
    function isFunction(obj) {
        return type(obj) === 'function';
    }

    // 是否字符串
    function isString(obj) {
        return type(obj) == 'string';
    }

    // 是否不是数值
    function isNaN(obj) {
        // `NaN` is the only value for which `===` is not reflexive.
        return obj !== obj;
    }

    // 是否未定义
    function isUndef(obj) {
        return obj === void 0;
    }

    // 是否已经定义
    function isDef(obj) {
        return !isUndef(obj);
    }

    /**
     * 选择器分解
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
     * 只实现了以下5种选择元素的功能
     */
    function $(selector) {
        var matches = selectorExec(selector);

        // 处理 document
        if (matches[2] === 'document') {
            return [document];

        // 处理 body
        } else if (matches[2] === 'body') {
            return [document.body];

        // 处理 class
        } if (matches[1] === '.') {
            return document.getElementsByClassName(matches[2]);

        // 处理 id
        } else if (matches[1] === '#') {
            var el = document.getElementById(matches[2]);
            return el ? [el] : [];

        // 处理 tagName
        } else if (matches[1] === selector) {
            return document.getElementsByTagName(matches[2]);
        }
    }

    // 扩展方法
    function extend(obj) {
        each(slice.call(arguments, 1), function(source) {
            for (var prop in source) {
                obj[prop] = source[prop];
            }
        });
        return obj;
    }

    var breaker = {};

    // 遍历
    function each(obj, iterator, context) {
        if (obj === null) {
            return;
        }
        if (ObjProto.forEach && obj.forEach === ObjProto.forEach) {
            obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; i < l; i++) {
                if (i in obj && iterator.call(context, obj[i], i, obj) === breaker) return;
            }
        } else {
            for (var key in obj) {
                if (iterator.call(context, obj[key], key, obj) === breaker) return;
            }
        }
    }
        
    var ctor = function(){};

    // 将方法的 this 绑定为指定的对象
    function bind(fn, context) {
        var args;
        if (FuncProto.bind) {
            return FuncProto.bind.apply(fn, slice.call(arguments, 1));
        } else {
            args = slice.call(arguments, 2);
            var bound = function() {
                if (!(this instanceof bound)) return fn.apply(context, args.concat(slice.call(arguments)));
                ctor.prototype = func.prototype;
                var self = new ctor;
                var result = func.apply(self, args.concat(slice.call(arguments)));
                if (Object(result) === result) return result;
                return self;
            };
            return bound;
        }
    }

    /**
     * 生成随机字符串
     */
    function uuid() {
        var S4 = function () {
            return Math.floor(
                Math.random() * 0x10000 /* 65536 */
            ).toString(16);
        };

        return (
            S4() + S4() + "-" +
            S4() + "-" +
            S4() + "-" +
            S4() + "-" +
            S4() + S4() + S4()
        );
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
                this.map[key] = isFunction(init) ? init.call() : init;
            }
            return this.map[key];
        },
        has: function(key) {
            return isDef(this.map[key]);
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
                each(this.map, function(value, key) {
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

    /*----------业务逻辑----------*/

    var LEFT = 'left';
    var RIGHT = 'right';
    var UP = 'up';
    var DOWN = 'down';
    var IN = 'in';
    var OUT = 'out';

    var DRAG = 'drag';
    var DRAGGING = 'dragging';
    var DOUBLE_TAP = 'doubletap';
    var HOLD = 'hold';
    var HOLD_END = 'holdend';
    var ROTATE = 'rotate';
    var ROTATING = 'rotating';
    var SWIPE = 'swipe';
    var SWIPING = 'swiping';
    var TAP = 'tap';
    var TAP2 = 'tap2';
    var TOUCH = 'touch';
    var PINCH = 'pinch';
    var PINCHING = 'pinching';

    var TOUCH_START = 'touchstart';
    var TOUCH_MOVE = 'touchmove';
    var TOUCH_END = 'touchend';

    /**
     * 默认配置
     */
    var defaults = {
        type: TAP,

        preventDefault: false,
        stopPropagation: false,
        stopImmediatePropagation: false,

        // 移动时间响应时间间隔
        moveInterval: 10,

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
        rotateMinAngle: 5 // degrees
    };

    /**
     * Gesture
     */
    function Gesture() {
        this.init.apply(this, arguments);
    }

    /**
     * 事件类型
     */
    Gesture.prototype.types = [
        TOUCH_START, TOUCH_MOVE, TOUCH_END,
        DOUBLE_TAP, HOLD, HOLD_END, TAP, TAP2, TOUCH,
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
     * 事件监听配置
     * 数据结构
     * eventMap: {
     *      proxy: { // 事件托管元素
     *          type: { // 事件类型
     *              selector: [ // 事件过滤
     *                  {fn, context, args}, // 处理函数, 上下文, 参数
     *                  {fn, context} // 处理函数, 上下文
     *              ]
     *          }
     *     }
     * }
     */
    Gesture.prototype.eventMap = null;

    /**
     * 代理类配置
     * 数据结构
     * proxyMap: {
     *      proxy: { // 代理的元素
     *          startFn, moveFn, endFn
     *      }
     * }
     */
    Gesture.prototype.proxyMap = null;
    
    /**
     * 取消事件默认方法或者冒泡
     */
    Gesture.prototype.cancelEvent = function (event, force) {
        var defaults = this.defaults;
        if (defaults.preventDefault === true ||
            force === true) {
            event.cancelBubble = true;
            event.returnValue = false;
            event.preventDefault();
        }
        if (defaults.stopPropagation === true ||
            force === true) {
            event.cancelBubble = true;
            event.returnValue = false;
            event.stopPropagation();
        }
        if (defaults.stopImmediatePropagation === true ||
            force === true) {
            event.cancelBubble = true;
            event.returnValue = false;
            event.stopImmediatePropagation();
        }
    };

    Gesture.prototype.preventDefault = function () {
        return function() {
            // 无效方法
            this.isDefaultPrevented = true;
        };
    };

    Gesture.prototype.stopPropagation = function () {
        return function() {
            this.isPropagationStopped = true;
        };
    };

    Gesture.prototype.stopImmediatePropagation = function () {
        return function() {
            this.isImmediatePropagationStopped = true;
        };
    };

    /**
     * 初始化
     */
    Gesture.prototype.init = function(options) {
        this.defaults = extend({}, defaults, options);
        this.reset();
    };

    /**
     * 重置所有环境
     */
    Gesture.prototype.reset = function () {
        if (this.proxyMap) {
            this.proxyMap.each(function(context, selector) {
                this.removeEvent(selector);
            }, this);
        }
        this.proxyMap = new Map();
        this.eventMap = new Map();
        return this;
    };

    /**
     * 配置默认选项
     */
    Gesture.prototype.config = function (key, value) {
        if (isObject(key)) {
            each(key, function(v, k) {
                this.defaults[k] = v;
            }, this);

        } else if (isDef(value)) {
            this.defaults[key] = value;
        }
        return this;
    };

    /**
     * 解析 item
     */
    Gesture.prototype.parseItem = function (item) {
        if (!item) {
            return;
        }

        var fn, context, args;

        // item 是响应函数
        if (isFunction(item)) {
            fn = item;

        // item 是数组
        } else if (isArray(item)) {
            // 第一个参数是响应函数
            fn = item[0];

            // 第二个参数如果是对象则是上下文
            if (isObject(item[1])) {
                context = item[1];
            }

            // 第三个参数或第二个参数是数组则是参数数组
            if (isArray(item[2])) {
                args = item[2];
            } else if (isArray(item[1])) {
                args = item[1];
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
    Gesture.prototype.on = function (selectors, proxy, item, options) {
        if (isObject(selectors)) {
            each(selectors, function(item, selector) {
                this.on(selector, proxy, item, options);
            }, this);
        } else if (isString(selectors)) {
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
    Gesture.prototype.off = function (selectors, proxy, item) {
        if (isObject(selectors)) {
            each(selectors, function(item, selector) {
                this.off(selector, proxy, item);
            }, this);
        } else if (isString(selectors)) {
            this.eachSelector(selectors, function(type, selector) {
                this.bindEvent(type, selector, proxy, item, true);
            }, this);
        } else if (selectors === true &&
            (isString(proxy) || isUndef(proxy))) {
            proxy = (proxy || 'document').trim();
            this.removeEvent(proxy);
        }
        return this;
    };

    /**
     * 绑定元素事件监听
     */
    Gesture.prototype.addEvent = function (proxy) {
        if (!proxy) {
            return;
        }

        var that = this,
            bind,
            els = $(proxy),
            options = this.proxyMap.get(proxy);

        // 找不到托管的元素或者已存在相应的处理函数则不需要再添加
        if (!els || options) {
            return;
        }

        bind = function(fn) {
            return function(event) {
                fn.call(that, event, options);
            };
        };

        options = {
            proxy: proxy,
            id: uuid(),
            startFn: bind(this.onTouchStart()),
            moveFn: bind(this.onTouchMove()),
            endFn: bind(this.onTouchEnd())
        };

        // 执行事件绑定
        each(els, function(el) {
            if (el && el.addEventListener) {
                if (isMobile) {
                    el.addEventListener('touchstart', options.startFn);
                    el.addEventListener('touchmove', options.moveFn);
                    el.addEventListener('touchend', options.endFn);
                    el.addEventListener('touchcancel', options.endFn);
                } else {
                    el.addEventListener('mousedown', options.startFn);
                    el.addEventListener('mousemove', options.moveFn);
                    el.addEventListener('mouseup', options.endFn);
                }
            }
        });

        this.proxyMap.set(proxy, options);
    };

    /**
     * 解绑元素事件监听
     */
    Gesture.prototype.removeEvent = function (proxy) {
        if (!proxy) {
            return;
        }

        var options = this.proxyMap.get(proxy);
        if (!options) {
            return;
        }

        var els = $(proxy);
        each(els, function(el) {
            if (el && el.removeEventListener) {
                el.removeEventListener('touchstart', options.startFn);
                el.removeEventListener('touchmove', options.moveFn);
                el.removeEventListener('touchend', options.endFn);
                el.removeEventListener('touchcancel', options.endFn);
                el.removeEventListener('mousedown', options.startFn);
                el.removeEventListener('mousemove', options.moveFn);
                el.removeEventListener('mouseup', options.endFn);
            }
        });

        this.proxyMap.remove(proxy);
    };

    /**
     * 更新元素事件监听
     * 如果没有监听就移除，如果还有加入监听则
     */
    Gesture.prototype.updateEvent = function (proxy) {
        this.eventMap.each(function(typeMap, p) {
            if (!proxy || proxy === p) {
                var active = 0;
                typeMap.each(function(selectorMap, selector) {
                    selectorMap.each(function(items, key) {
                        if (items.length === 0) {
                            selectorMap.remove(key);
                        } else {
                            active += items.length;
                        }
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
    Gesture.prototype.eachSelector = function (selectors, iterator) {
        var items, type, selector;
        selectors = selectors.split(',');
        each(selectors, function(item) {
            items = item.split(' ');
            if (items.length > 0 && items[0] && this.types.indexOf(items[0].toLowerCase()) > -1) {
                type = items.shift().toLowerCase();
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
    var splitSelector = function (selectors) {
        var a, s;
        if (isArray(selectors)) {
            a = [];
            each(selectors, function(selector) {
                s = splitSelector(selector);
                a.push(s);
            });
        } else if (isString(selectors)) {
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
     * 检查元素是否与指定的选择器匹配
     */
    Gesture.prototype.isSelectorMatch = function (el, selector) {
        if (!el || !selector) {
            return false;
        }

        var array = splitSelector(selector),
            len = array.length,
            matches, isMatch;
        for (var i = 0; i < len; i++) {
            var part = array[i];
            matches = selectorExec(part);
            isMatch = false;
            
            // 处理 class
            if (matches[1] === '.') {
                // 提取元素的 class
                var className = el.className;
                if (className) {
                    // 遍历是否包含指定的 classname
                    each(className.split(' '), function(c) {
                        if (c === matches[2]) {
                            isMatch = true;
                        }
                    });
                }

            // 处理 id
            } else if (matches[1] === '#') {
                // 判断元素的 id 是否匹配
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
    Gesture.prototype.walk = function (type, proxy, target, fn) {
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
        each(origins, function(selector) {
            selectors.push(selector.split(' '));
        });

        while (el) {
            each(selectors, function(selectorArray, index) {
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
        each(orders, function(index) {
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
    Gesture.prototype.bindEvent = function (type, selector, proxy, item, options) {
// console.log('bind', type, selector, proxy, 'item', options);
        if (!type || !isString(type) ||
            !selector || !isString(selector)) {
            return;
        }

        // 截断选择器的前后空格
        selector = selector.trim();

        // 处理不指定 proxy 的情况
        if (isFunction(proxy) || isObject(proxy)) {
            item = proxy;
            proxy = 'document';

        // 处理 proxy 为字符串的情况
        } else if (isString(proxy) || isUndef(proxy)) {
            proxy = (proxy || 'document').trim();
        }

        // 解析 item
        if (item) {
            item = this.parseItem(item);
            extend(item.options, this.defaults);
            if (isObject(options)) {
                extend(item.options, options);
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
                    each(content, function(c) {
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
    Gesture.prototype.trigger = function (type, options) {
        var proxy, event,
            typeMap, selectorMap,
            fireEvent = this.fireEvent;

        if (!options) {
            options = {};
        } else if (isArray(options)) {
            options = {args: options};
        } else if (isString(options)) {
            proxy = options;
            options = {proxy: proxy};
        } else if (isObject(options)) {
            proxy = options.proxy;
            event = options.event;
        }

        options.type = type;

        if (!proxy || !isString(proxy)) {
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
    Gesture.prototype.fireEvent = function (items, options) {
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
        if (isArray(items)) {
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
    Gesture.prototype.onTouchStart = function () {
        return function(event, options) {
// console.log('touch start', options, this);
            this.touching = true;
            this.cancelEvent(event);
            this.touchStart(options);

            var start = this.extractTouches(event),
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
                options.initAngle = this.detectAngle(start);
                options.initDistance = this.detectDistance(start);
            }
        };
    };

    /**
     * 响应触摸移动
     */
    Gesture.prototype.onTouchMove = function () {
        return function(event, options) {
// console.log('touch move', options, this);
            
            if (!this.touching) {
                return;
            }

            var that = this,
                defaults = this.defaults,
                lastMoveTime = options.lastMoveTime,
                moveInterval = defaults.moveInterval;

            if (options.moveTimer) {
                clearTimeout(options.moveTimer);
            }
            if (lastMoveTime &&
                Date.now() - lastMoveTime < moveInterval) {
                options.moveTimer = setTimeout(function() {
                    that.onTouchMove(event, options);
                }, moveInterval);
                return;
            }
            options.lastMoveTime = Date.now();

            this.cancelEvent(event);
            this.touchMove(options);
            this.hold(options, false);

            options.moveEvent = event;
            options.prev = options.current;
            options.current = this.extractTouches(event);

            var fingers = options.current.length;

            if (fingers === options.fingers) {
                if (fingers === 1) {
                    if (defaults.swipe && (options.swiping = this.isSwipe(options))) {
                        this.swping(options);
                    } else if(defaults.drag && options.holding) {
                        options.dragging = true;
                        this.dragging(options);
                    }
                } else if (fingers === 2) {
                    this.cancelEvent(event, true);
                    options.rotating = defaults.rotate && this.rotating(options);
                    options.pinching = defaults.pinch && this.pinching(options);
                    if (defaults.drag) {
                        options.dragging = true;
                        this.dragging(options);
                    }
                }
            } else {
                this.resetGesture(options);
            }
        };
    };

    /**
     * 响应触摸结束
     */
    Gesture.prototype.onTouchEnd = function () {
        return function(event, options) {
// console.log('touch end', options, this);
            this.touching = false;
            this.cancelEvent(event);
            this.touchEnd(options);
            this.holdEnd(options);

            options.endEvent = event;

            var defaults = this.defaults,
                fingers = options.fingers;
            if (fingers === 1) {
                if (defaults.doubleTap && options.doubleTap) {
                    this.doubleTap(options);
                } else if (defaults.swipe && this.isSwipe(options)) {
                    this.swipe(options);
                } else if (defaults.drag && options.dragging) {
                    this.drag(options);
                } else if (defaults.tap && !options.holding && this.isTap(options)) {
                    this.tap(options);
                }
            } else if (fingers === 2) {
                if (defaults.tap2 && this.isTap2(options)) {
                    options.tap2 = true;
                    this.tap2(options);
                }
                if (!options.tap2) {
                    if (defaults.rotate && options.rotating) {
                        this.rotate(options);
                    }
                    if (defaults.pinch && options.pinching) {
                        this.pinch(options);
                    }
                    if (defaults.drag &&
                        ((!options.pinching && !options.rotating && this.isDrag(options)) ||
                            options.dragging)) {
                        this.drag(options);
                    }
                }
            }
        };
    };

    /**
     * 重置手势
     */
    Gesture.prototype.resetGesture = function (options, more) {
        if (!more) {
            more = {};
        }
        options.isDefaultPrevented = false;
        options.isImmediatePropagationStopped = false;
        options.isPropagationStopped = false;
        options.preventDefault = bind(this.preventDefault(), options);
        options.stopPropagation = bind(this.stopPropagation(), options);
        options.stopImmediatePropagation = bind(this.stopImmediatePropagation(), options);
        // touchstart 的 event
        options.event = null;
        // touchmove 的 event
        options.moveEvent = null;
        // touchend 的 event
        options.endEvent = null;
        options.last = options.start || [];
        options.start = more.start || [];
        options.touches = options.start;
        options.prev = more.prev || [];
        options.current = more.current || [];
        options.fingers = more.fingers || 0;
        options.angle = more.distance || 0;
        options.initAngle = more.angle || 0;
        options.lastAngle = more.angle || NaN;
        options.angleDiff = 0;
        options.distance = more.distance || 0;
        options.initDistance = more.distance || 0;
        options.lastDistance = more.distance || 0;
        options.distanceDiff = 0;
        options.scale = 1;
        options.tap2 = false;
        options.doubleTap = more.doubleTap || false;
        options.doubleTapInterval = more.doubleTapInterval || 0;
        options.doubleTapDistance = more.doubleTapDistance || 0;
        options.lastMoveTime = 0;
        options.scale = 1;
        options.touching = false;
        options.holding = false;
        options.dragging = false;
        options.pinching = false;
        options.rotating = false;
    };

    /**
     * 合并属性
     */
    Gesture.prototype.merge = function(options, more) {
        if (!more) {
            more = {};
        }
        return extend(options, more);
    };

    /**
     * touchStart
     */
    Gesture.prototype.touchStart = function (options) {
        this.trigger(TOUCH_START, options);
    };

    /**
     * touchMove
     */
    Gesture.prototype.touchMove = function (options) {
        this.trigger(TOUCH_MOVE, options);
    };

    /**
     * touchEnd
     */
    Gesture.prototype.touchEnd = function (options) {
        this.trigger(TOUCH_END, options);
    };

    /**
     * tap
     */
    Gesture.prototype.tap = function (options) {
        this.trigger(TAP, options);
    };

    /**
     * 2 fingers tap
     */
    Gesture.prototype.tap2 = function (options) {
        var proxy = options.proxy,
            start = options.start,
            distance = this.detectDistance(start);
        options = this.merge(options, {distance: distance});
        this.trigger(TAP2, options);
    };

    /**
     * double tap
     */
    Gesture.prototype.doubleTap = function (options) {
        var interval = options.doubleTapInterval,
            distance = options.doubleTapDistance;
        options = this.merge(options, {distance: distance, interval: interval});
        this.trigger(DOUBLE_TAP, options);
    };

    /**
     * hold
     */
    Gesture.prototype.hold = function (options, remove) {
        clearTimeout(options.holdTimer);
        if (remove !== false) {
            var that = this;
            options.holdTimer = setTimeout(function() {
                options.event.preventDefault();
                that.cancelEvent(options.event, true);
                options.holding = true;
                that.trigger(HOLD, options);
            }, this.defaults.holdTimeout);
        }
    };

    /**
     * holdEnd
     */
    Gesture.prototype.holdEnd = function (options) {
        clearTimeout(options.holdTimer);
        if (options.holding === true) {
            options.holding = false;
            this.trigger(HOLD_END, options);
        }
    };

    /**
     * drag
     */
    Gesture.prototype.drag = function (options) {
        var start = options.start,
            current = options.current,
            distance = this.detectDistance(start, current),
            direction = this.detectDirection(start, current);
        options = this.merge(options, {direction: direction, distance: distance});
        this.trigger(DRAG, options);
        this.trigger(DRAG + direction, options);
    };

    /**
     * draging
     */
    Gesture.prototype.dragging = function (options) {
        var event = options.moveEvent,
            start = options.start,
            prev = options.prev,
            current = options.current,
            distance = this.detectDistance(start, current),
            direction = this.detectDirection(start, current),
            delta = this.detectDistance(prev, current),
            deltaX = this.deltaX(prev, current),
            deltaY = this.deltaY(prev, current);
        this.cancelEvent(event, true);
        options = this.merge(options, {direction: direction,
            distance: distance, delta: delta,
            deltaX: deltaX, deltaY: deltaY});
        this.trigger(DRAGGING, options);
    };

    /**
     * swipe
     */
    Gesture.prototype.swipe = function (options) {
        var start = options.start,
            current = options.current,
            distance = this.detectDistance(start, current),
            direction = this.detectDirection(start, current);
        options = this.merge(options, {direction: direction, distance: distance});
        this.trigger(SWIPE, options);
        this.trigger(SWIPE + direction, options);
    };

    /**
     * swiping
     */
    Gesture.prototype.swping = function (options) {
        var start = options.start,
            prev = options.prev,
            current = options.current,
            distance = this.detectDistance(start, current),
            direction = this.detectDirection(start, current),
            delta = this.detectDistance(prev, current);
        options = this.merge(options, {direction: direction, distance: distance, delta: delta});
        this.trigger(SWIPING, options);
    };

    /**
     * rotate
     */
    Gesture.prototype.rotate = function (options) {
        var angleDiff = options.angleDiff,
            direction = angleDiff > 0 ? RIGHT : LEFT;
        options = this.merge(options, {angle: angleDiff, direction: direction});
        this.trigger(ROTATE, options);
        this.trigger(ROTATE + direction, options);
    };

    /**
     * rotating
     */
    Gesture.prototype.rotating = function (options) {
        var angle, diff, delta, symbol, direction,
            current = options.current,
            captured = false;
        angle = this.detectAngle(current);
        diff = options.initAngle - angle;
        if (isNaN(options.lastAngle)) {
            options.lastAngle = angle;
        }
        delta = options.lastAngle - angle;
        while (Math.abs(delta) > 180) {
            if (delta < 0) {
                delta += 180;
            } else {
                delta -= 180;
            }
        }
        if ((Math.abs(diff) > this.defaults.rotateMinAngle || options.angleDiff !== 0) &&
            delta !== 0) {
            options.lastAngle = angle;
            options.angleDiff = diff;
            direction = diff > 0 ? RIGHT : LEFT;
// console.log('angle:' + angle + ' delta:' + delta + ' direction:' + direction + ' after:' + (angle + delta));
            options = this.merge(options, {direction: direction,
                angle: diff, delta: delta});
            this.trigger(ROTATING, options);
            captured = true;
        }
        return captured;
    };

    /**
     * pinch
     */
    Gesture.prototype.pinch = function (options) {
        var distanceDiff = options.distanceDiff,
            scale = options.scale,
            direction = distanceDiff > 0 ? OUT : IN;
        options = this.merge(options, {distance: distanceDiff,
            direction: direction, scale: scale});
        this.trigger(PINCH, options);
        this.trigger(PINCH + direction, options);
    };

    /**
     * pinching
     */
    Gesture.prototype.pinching = function (options) {
        var distance, diff, delta, scale, direction,
            proxy = options.proxy,
            current = options.current,
            captured = false;
        distance = this.detectDistance(current);
        diff = distance - options.initDistance;
        delta = (options.lastDistance === 0) ? 0 : (distance - options.lastDistance);
        options.lastDistance = distance;
        if (Math.abs(diff) > this.defaults.pinchMinDistance &&
            delta !== 0) {
            options.distanceDiff = diff;
            options.scale = scale = Math.abs(distance) / Math.abs(options.initDistance);
            direction = diff > 0 ? OUT : IN;
            options = this.merge(options, {direction: direction,
                distance: distance, delta: delta, scale: scale});
            this.trigger(PINCHING, options);
            captured = true;
        }
        return captured;
    };

    /**
     * 判断是否是 tap
     */
    Gesture.prototype.isTap = function (options) {
        var defaults = this.defaults,
            start = options.start,
            current = options.current,
            d = Math.abs(this.detectDistance(start, current)) < defaults.tapMaxDistance;
        return d;
    };

    /**
     * 判断是否是 2 fingers tap
     */
    Gesture.prototype.isTap2 = function (options) {
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
    Gesture.prototype.isDoubleTap = function (options) {
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
     * 判断是否是 drag
     */
    Gesture.prototype.isDrag = function (options) {
        var defaults = this.defaults,
            start = options.start,
            current = options.current,
            d = Math.abs(this.detectDistance(start, current)) > defaults.dragMinDistance;
        return d;
    };

    /**
     * 判断是否是 swipe
     */
    Gesture.prototype.isSwipe = function (options) {
        var defaults = this.defaults,
            start = options.start,
            current = options.current,
            d = Math.abs(this.detectDistance(start, current)) > defaults.swipeMinDistance,
            t = this.detectInterval(start, current) <= defaults.swipeMaxTime;
        return d && t;
    };

    /**
     * 提取 touch 信息
     */
    Gesture.prototype.extractTouches = function (event) {
        var touches = event.touches,
            ts = [],
            el, id, x, y, t;
        if (touches) {
            for (var i = 0, len = touches.length; i < len; i++) {
                var touch = touches[i];
                el = touch.target;
                id = touch.identifier || uuid();
                x = touch.pageX;
                y = touch.pageY;
                t = new Date();
                ts.push({el: el, id: id, x: x, y: y, t: t});
            }
        } else {
            ts.push({
                el: event.target,
                id: uuid(),
                x: event.clientX,
                y: event.clientY,
                t: new Date()
            });
        }
        return ts;
    };

    /**
     * 提取对比的点
     */
    Gesture.prototype.extractPoints = function (start, end) {
        var p1, p2;
        if (start && start.length && start.length >= 2 &&
            !end) {
            p1 = start[0];
            p2 = start[1];
        } else if (start && start.length && start.length >= 1 &&
            end && end.length && end.length >= 1) {
            p1 = start[0];
            p2 = end[0];
        } else {
            p1 = start;
            p2 = end;
        }
        return {p1: p1, p2: p2};
    };

    /**
     * 检测角度
     */
    Gesture.prototype.detectAngle = function (start, end) {
        var points = this.extractPoints(start, end),
            p1 = points.p1,
            p2 = points.p2;
        if (!p1 || !p2) {
            return 0;
        }
        var dx = p1.x - p2.x,
            dy = p1.y - p2.y,
            angle = Math.atan((dy) * -1 / (dx)) * (180 / Math.PI);console.log('origin angle:' + angle);
        if (angle < 0) {
            angle += 360;
        }console.log('after angle:' + angle);
        return angle;
    };

    /**
     * 检测距离
     */
    Gesture.prototype.detectDistance = function (start, end) {
        var points = this.extractPoints(start, end),
            p1 = points.p1,
            p2 = points.p2;
        if (!p1 || !p2) {
            return 0;
        }
// console.log(p1.x + ' ' + p1.y + ' ' + p2.x + ' ' + p2.y);
        var dx = p2.x - p1.x,
            dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    };

    /**
     * 检测方向
     */
    Gesture.prototype.detectDirection = function (start, end) {
        var points = this.extractPoints(start, end),
            p1 = points.p1,
            p2 = points.p2;
        if (!p1 || !p2) {
            return '';
        }
        var dx = Math.abs(p1.x - p2.x),
            dy = Math.abs(p1.y - p2.y),
            d;
        if (dx >= dy) {
            if (p1.x - p2.x > 0) {
                d = LEFT;
            } else {
                d = RIGHT;
            }
        } else {
            if (p1.y - p2.y > 0) {
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
    Gesture.prototype.detectInterval = function (start, end) {
        var points = this.extractPoints(start, end),
            p1 = points.p1,
            p2 = points.p2;
        if (!p1 || !p2) {
            return 0;
        }
        return p2.t - p1.t;
    };

    /**
     * 检测时间间隔
     */
    Gesture.prototype.deltaX = function (start, end) {
        var points = this.extractPoints(start, end),
            p1 = points.p1,
            p2 = points.p2;
        if (!p1 || !p2) {
            return 0;
        }
        return p2.x - p1.x;
    };

    /**
     * 检测时间间隔
     */
    Gesture.prototype.deltaY = function (start, end) {
        var points = this.extractPoints(start, end),
            p1 = points.p1,
            p2 = points.p2;
        if (!p1 || !p2) {
            return 0;
        }
        return p2.y - p1.y;
    };

    window.Gesture = Gesture;
})();