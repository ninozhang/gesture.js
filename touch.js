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
     * 简单的元素选择器
     */
    function $(selector) {
        var match = this.match(selector);

        // 处理 document
        if (match[2] === 'document') {
            return [doc];

        // 处理 body
        } else if (match[2] === 'body') {
            return [body];

        // 处理 class
        } if (match[1] === '.') {
            return doc.getElementsByClassName(match[2]);

        // 处理 id
        } else if (match[1] === '#') {
            var el = doc.getElementById(match[2]);
            return el ? [el] : [];

        // 处理 tagName
        } else if (match[1] === selector) {
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
    function on(selectors, proxy, fn, options) {
        if (_.isObject(selectors)) {
            _.each(selectors, function(fn, selector) {
                on(selector, proxy, fn, options);
            });
        } else if (_.isString(selectors)) {
            eachSelector(selectors, function(type, selector) {
                matchEvent(selector, proxy, fn, options);
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
    function off(selectors, proxy, fn) {
        if (_.isObject(selectors)) {
            _.each(selectors, function(fn, selector) {
                off(selector, proxy, fn);
            });
        } else if (_.isString(selectors)) {
            eachSelector(selectors, function(type, selector) {
                matchEvent(selector, proxy, fn, true);
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
    function addEvent(proxy) {
        if (!proxy) {
            return;
        }
        var els = this.$(proxy),
            context = proxyMap.get(proxy);
        if (!els || context) {
            return;
        }
        context = {};
        context.startFn = _.bind(onTouchStart(event), context);
        context.moveFn = _.bind(onTouchMove(event), context);
        context.endFn = _.bind(onTouchEnd(event), context);
        els.forEach(function(el) {
            if (el && el.addEventListener) {
                el.addEventListener('touchstart', startFn);
                el.addEventListener('touchmove', moveFn);
                el.addEventListener('touchend', endFn);
                el.addEventListener('touchcancel', endFn);
            }
        });
        proxyMap.set(proxy, context);
    }

    /**
     * 解绑元素事件监听
     */
    function removeEvent(proxy) {
        if (!proxy) {
            return;
        }
        var els = this.$(proxy),
            context = proxyMap.get(proxy);
        if (!els || !context) {
            return;
        }
        var startFn = context.startFn;
        var moveFn = context.moveFn;
        var endFn = context.endFn;
        els.forEach(function(el) {
            if (el && el.removeEventListener) {
                el.removeEventListener('touchstart', startFn);
                el.removeEventListener('touchmove', moveFn);
                el.removeEventListener('touchend', endFn);
                el.removeEventListener('touchcancel', endFn);
            }
        });
        proxyMap.remove(proxy);
    }

    /**
     * 更新元素事件监听
     * 如果没有监听就移除，如果还有加入监听则
     */
    function updateEvent(proxy) {
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

    }

    /**
     * 简单的选择器匹配方法
     */
    function match(selector) {
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
    function matchEvent(type, selector, proxy, item, options) {
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

        // 检查是否已有该 proxy 对应的 map ，没有则创建一个
        var proxyMap, fns;

        if (item) {
            proxyMap = eventMap.get(proxy, newMap);
            
            typeMap = proxyMap.get(selector, []);

            // 移除 selector 对应的响应函数
            if (options === true) {
                var fn = _.isArray(item) ? item[0] : item;
                fns = without(fns, fn);
                if (fns.length === 0) {
                    proxyMap.remove(selector);
                }

            // 加入 selector 对应的响应函数
            } else {
                fns.push(item);
            }

            this.updateEvent(proxy);

        // 移除监听
        } else if (options === true) {
            // 解绑 proxy 监听 selector 下所有响应函数
            if (proxy === true) {
                this.map.each(function(proxyMap) {
                    proxyMap.remove(selector);
                });
                this.updateEvent();

            // 解绑 selector 下所有响应函数
            } else {
                proxyMap = this.map.get(proxy);
                if (proxyMap) {
                    proxyMap.remove(selector);
                }
                this.updateEvent(proxy);
            }
        }
    }

    /**
     * 向绑定事件监听的元素派发事件
     */
    function dispatchEvent(event, proxy) {
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
                match = this.match(selector);
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
        return function(event) {
            var options = this.options
                if(opts.preventDefault) evt.preventDefault();
                if(opts.stopPropagation) evt.stopPropagation();
            var t = event.touches[0],
                x = t.clientX,
                y = t.clientY,
                now = new Date().getTime(),
                click = [x, y, now, x, y, now];
            this.clickMap.set(selector, click);

            touches = new Jester.TouchGroup(evt);

                eventSet.execute("start", touches, evt);

            var delta, fingers, now, touches;
      now = Date.now();
      delta = now - (GESTURE.last || now);
      TOUCH_TIMEOUT && clearTimeout(TOUCH_TIMEOUT);
      touches = _getTouches(event);
      fingers = touches.length;
      FIRST_TOUCH = _fingersPosition(touches, fingers);
      GESTURE.el = $$(_parentIfText(touches[0].target));
      GESTURE.fingers = fingers;
      GESTURE.last = now;
      if (fingers === 1) {
        GESTURE.isDoubleTap = delta > 0 && delta <= 250;
        return setTimeout(_hold, HOLD_DELAY);
      } else if (fingers === 2) {
        GESTURE.initial_angle = parseInt(_angle(FIRST_TOUCH), 10);
        GESTURE.initial_distance = parseInt(_distance(FIRST_TOUCH), 10);
        GESTURE.angle_difference = 0;
        return GESTURE.distance_difference = 0;
      }

      _pos.start = getXYfromEvent(event);
                _touch_start_time = new Date().getTime();
                _fingers = countFingers(event);
                _first = true;
                _event_start = event;

                // borrowed from jquery offset https://github.com/jquery/jquery/blob/master/src/offset.js
                var box = element.getBoundingClientRect();
                var clientTop  = element.clientTop  || document.body.clientTop  || 0;
                var clientLeft = element.clientLeft || document.body.clientLeft || 0;
                var scrollTop  = window.pageYOffset || element.scrollTop  || document.body.scrollTop;
                var scrollLeft = window.pageXOffset || element.scrollLeft || document.body.scrollLeft;

                _offset = {
                    top: box.top + scrollTop - clientTop,
                    left: box.left + scrollLeft - clientLeft
                };

                _mousedown = true;

                // hold gesture
                gestures.hold(event);

                if(options.prevent_default) {
                    cancelEvent(event);
                }
        };
    }
    /**
     * 更新移动位置
     */
    function onTouchMove(event) {
        return function(event) {
            var t = event.touches[0],
                x = t.clientX,
                y = t.clientY,
                now = new Date().getTime(),
                click = this.clickMap.get(selector);
            click[3] = x;
            click[4] = y;
            click[5] = now;
            this.clickMap.set(selector, click);
        };
    }
    /**
     * 判断是否为有效的点击
     */
    function onTouchEnd(event) {
        return function(event) {
            var click = this.clickMap.get(selector);
            if (click &&
                Math.abs(click[0] - click[3]) < clickThreshold &&
                Math.abs(click[1] - click[4]) < clickThreshold &&
                click[5] - click[2] < clickTimeout) {
                this.dispatchEvent(event, selector);
            }
        };
    }

    window.touch = touch;
})();