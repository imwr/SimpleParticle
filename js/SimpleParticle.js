/* =========================================================== *
 * @site http:tt-cc.cn
 * @email mvpjly@163.com
 * Copyright 2014 imwr
 * Licensed under the Apache License, Version 2.0 (the "License")
 *
 * Refer to http://www.cnblogs.com/miloyip/archive/2010/06/14/kinematics_particlesystem.html
 *
 * =========================================================== */
;
(function ($) {
    var defaults = {
        mode: "dom",//dom || canvas
        clearCanvas: true,//mode=canvas时，每次更新是否清除canvas
        auto: true,//是否自动开始
        createNew: function () {
            return true
        },//是否创建新粒子
        particlesNum: 10000,//最大粒子数
        duration: 20,//画面更新频率
        effectors: [],//自定义效果集合 function(...){this.apply = function(particle){}}}
        particle: {
            position: null,//初始位置数组[x,y]，默认容器内随机位置,或指定随机范围如:[[100,200], [10,30]]，默认容器中央
            speed: [100, 100],//初始x,y速度大小数组[vx,vy],默认[100, 500]随机，或指定随机范围如:[[100,200], [10,30]]
            color: "random",//[R,G,B],初始颜色，默认随机，或指定随机范围如:[[0,0,1], [1,0,0]]，["white", "red"]
            angle: [0, Math.PI * 2],//初始x,y速度方向，范围0-2π,默认0-2π随机
            life: 2, //生命周期（秒），初始生命0
            size: 8,//初始大小
            node: "<div style='position:absolute;border-radius:4px;'></div>"//mode=dom有效
        },
        particles: null,//初始设置粒子Particle集合(不会创建新的粒子)，Particle = $(dom).simpleParticles("createParticle", particle's option)
        updateProperty: [true, true],//是否按生命比率更新[颜色,大小]
        gravity: [0, 100],//(x,y)重力
        acceleration: [0, 100],//加速度，可变
        initEmtr: null,//粒子发射源初始执行方法，可用于emtrTrail扩展参数。参数:（发射源Particle对象)
        emtrTrail: null,//粒子发射源运动轨迹函数。参数:（发射源Particle对象)
        onStart: null//粒子渲染前执行的函数。参数：（Particles粒子集合对象, 发射源Particle对象）
    };
    $.fn.simpleParticles = function (method) {
        var args = arguments, retval;
        this.each(function () {
            var ui = $._data(this, "SimpleParticle");
            if (!ui) {
                if (method == "destroy") return;
                var opts = $.extend(true, {}, defaults, typeof method === "object" ? method : {});
                ui = new SimpleParticle(this, opts);
                $._data(this, "SimpleParticle", ui);
            }
            if (typeof method === "string" && typeof ui[method] == "function") {
                retval = ui[method].apply(ui, Array.prototype.slice.call(args, 1));
                (method == "destroy") && $._data(this, "SimpleParticle", null);
            }
        });
        return retval || this
    };
    var SimpleParticle = function (element, options) {
        this.ele = element;
        this.options = options;
        return "undefined" != typeof this.init && this.init.apply(this, arguments)
    };
    $.fn.test = function () {
        var ui = $._data(this[0], "SimpleParticle");
        return ui.randColor();
    };
    SimpleParticle.prototype = {
        init: function () {
            this.container = $(this.ele) || $(document.body);
            if (this.options.mode == "canvas") {
                if (this.ele.tagName != "CANVAS") {
                    var canvas = document.createElement("canvas");
                    canvas.setAttribute("width", this.ele.clientWidth);
                    canvas.setAttribute("height", this.ele.clientHeight);
                    this.ele = this.ele.appendChild(canvas);
                    this.ctx = canvas.getContext("2d");
                } else {
                    this.ele.setAttribute("width", this.ele.clientWidth);
                    this.ele.setAttribute("height", this.ele.clientHeight);
                    this.ctx = this.ele.getContext("2d");
                }
            } else if (this.options.mode == "dom") {
                this.ele.style.position = "relative";
            }
            this._initValue();
            this._analyzeEffects();
            this._createTimer();
            return this;
        },
        _initValue: function () {
            this.createNewParticles = !this.options.particles;
            this.particles = this.options.particles || [];
            this.effectors = [];
            this.gravity = this.createPoint(this.options.gravity);
            this.acceleration = this.createPoint(this.options.acceleration);
            this.duration = this.options.duration / 1000;
            if (this.options.emtrTrail) {
                this.emtr = {
                    position: {
                        x: 0,
                        y: 0
                    }
                };
                this.options.initEmtr && this.options.initEmtr(this.emtr);
            }
            this._analyzeBasicValue(this.options.particle)
        },
        _analyzeBasicValue: function (opts) {
            this.position = opts.position || [this.ele.clientWidth / 2, this.ele.clientHeight / 2];
            this.speed = opts.speed || [
                    [100, 500],
                    [100, 500]
                ];
            this.angle = opts.angle || [
                    [0, Math.PI * 2],
                    [0, Math.PI * 2]
                ];
            this.color = opts.color || "random";
        },
        _analyzeEffects: function () {
            for (var i in this.options.effectors) {
                var e = this.options.effectors[i];
                if (typeof e.apply == "function") {
                    this.effectors.push(e);
                }
            }
        },
        settings: function (opts) {
            this.options = $.extend(true, {}, this.options, opts || {});
            if (opts.duration) {
                this.duration = this.options.duration / 1000;
                this.stop();
                this.start();
            }
        },
        initPosition: function () {
            if (Object.prototype.toString.call(this.position) == '[object Array]' && this.position.length >= 2) {
                var x = this.position[0], y = this.position[1];
                Object.prototype.toString.call(x) == '[object Array]' && (x = this.ranNum(x[0], x[1]));
                Object.prototype.toString.call(y) == '[object Array]' && (y = this.ranNum(y[0], y[1]));
                return this.createPoint(x, y);
            }
            return new Point(0, 0)
        },
        initVelocity: function () {
            var speed = 0, angle = 0;
            if (Object.prototype.toString.call(this.angle) == '[object Array]' && this.angle.length >= 2) {
                angle = this.ranNum(this.angle[0], this.angle[1]);
            } else if (typeof  (this.angle) == 'number') {
                angle = this.angle;
            }
            if (Object.prototype.toString.call(this.speed) == '[object Array]' && this.speed.length >= 2) {
                var x = this.speed[0], y = this.speed[1];
                Object.prototype.toString.call(x) == '[object Array]' && (x = this.ranNum(x[0], x[1]));
                Object.prototype.toString.call(y) == '[object Array]' && (y = this.ranNum(y[0], y[1]));
                speed = this.createPoint(x, y);
            } else {
                speed = this.createPoint(0, 0)
            }
            return this.createVelocity(angle, speed);
        },
        initColor: function () {
            var color = this.color;
            if (Object.prototype.toString.call(color) == '[object Array]') {
                if (color.length == 2) {
                    return this.ranColor(this.createColor(color[0]), this.createColor(color[1]));
                }
                if (color.length == 3) {
                    return this.createColor(color)
                }
            }
            return this.createColor(color)
        },
        _addBornParticle: function () {
            if (!this.options.createNew || !this.options.createNew()) return;
            var n;
            if (this.options.mode == "dom") {
                n = this.initNode();
                this.container.append(n);
            }
            //如果是自定义发射源，应用参数
            this.options.emtrTrail && this._analyzeEmtrValue(this.emtr);
            this.particles.push(this.createParticle({node: n}));
        },
        createParticle: function (particle) {
            particle = particle || {};
            return new Particle({
                position: particle.position && particle.position.length == 2 ?
                    this.createPoint(particle.position[0], particle.position[1]) : this.initPosition(),
                velocity: particle.speed && particle.speed.length == 2 && particle.angle && particle.angle.length == 2 ?
                    this.ranVelocity(particle.angle[0], particle.angle[1], particle.speed[0], particle.speed[1]) : this.initVelocity(),
                life: particle.life || this.options.particle.life,
                color: particle.color || this.initColor(),
                size: particle.size || this.options.particle.size,
                node: particle.node
            });
        },
        initNode: function () {
            var wrapper = document.createElement('div');
            wrapper.innerHTML = this.options.particle.node;
            return wrapper.firstChild;
        },
        _analyzeEmtrValue: function (emtr) {
            if (Object.prototype.toString.call(emtr.position) == '[object Array]' && emtr.position.length >= 2) {
                this.position = emtr.position
            } else if (emtr.position) {
                this.position = [emtr.position.x, emtr.position.y]
            }
            emtr.speed && (this.speed = emtr.speed);
            emtr.angle && (this.angle = emtr.angle);
            emtr.color && (this.color = emtr.color);
        },
        createPoint: function (x, y) {
            if (arguments.length == 1) {
                if (Object.prototype.toString.call(x) == '[object Array]') {
                    return new Point(x[0], x[1]);
                } else if (x === "random") {
                    return this.ranPoint(0, this.container.width(), 0, this.container.height());
                }
            }
            return new Point(x || 0, y || 0);
        },
        createColor: function (rgb) {//[255,255,255] or "red"
            if (arguments.length == 0 || rgb === "random") {
                return new Color(Math.random(), Math.random(), Math.random());
            }
            var color = new Color();
            if (Object.prototype.toString.call(rgb) == '[object Array]' && rgb.length == 3) {
                color.r = rgb[0];
                color.g = rgb[1];
                color.b = rgb[2];
                return color;
            } else if (color.basic[rgb]) {
                rgb = color.basic[rgb];
                color.r = rgb[0];
                color.g = rgb[1];
                color.b = rgb[2];
                return color;
            }
            return new Color(Math.random(), Math.random(), Math.random());
        },
        createVelocity: function (angle, v) {
            if (arguments.length == 0) {
                return this.createPoint("random").multiply(this.ranNum(100, 1000));
            }
            return new Point(Math.cos(angle), Math.sin(angle)).multiply(v);
        },
        ranVelocity: function (minAngle, maxAngle, minV, maxV) {
            var angle = this.ranAngle(minAngle, maxAngle);
            var v = this.ranNum(minV || 20, maxV || 20);
            return new Point(Math.cos(angle), Math.sin(angle)).multiply(v);
        },
        ranAngle: function (minAngle, maxAngle) {
            var t = Math.random();
            return minAngle * t + maxAngle * (1 - t);
        },
        ranPoint: function (minX, maxX, minY, maxY) {
            var x = this.ranNum(minX || 0, maxX || 9999);
            var y = this.ranNum(minY || 0, maxY | 9999);
            return new Point(x, y);
        },
        ranColor: function (color1, color2) {
            if (arguments.length == 0)  return new Color(Math.random(), Math.random(), Math.random());
            if (typeof  color1 == "string") {
                color1 = this.createColor(color1);
            } else if (Object.prototype.toString.call(color1) == '[object Array]') {
                color1 = new Color(color1[0] || 0, color1[1] || 0, color1[2] || 0);
            }
            if (typeof  color2 == "string") {
                color2 = this.createColor(color2);
            } else if (Object.prototype.toString.call(color2) == '[object Array]') {
                color2 = new Color(color2[0] || 0, color2[1] || 0, color2[2] || 0);
            }
            var t = Math.random();
            return color1.multiply(t).add(color2.multiply(1 - t));
        },
        ranNum: function (min, max) {
            var t = Math.random();
            return min * t + max * (1 - t);
        },
        _createTimer: function () {
            var _this = this;
            _this.timer = $.timer(_this.options.duration, function () {
                _this.update();
            }, _this.options.auto);
            _this.start = function () {
                _this.timer && _this.timer.start(_this.options.duration);
            };
            _this.stop = function () {
                _this.timer && _this.timer.stop();
            };
            _this.pause = function () {
                _this.timer && _this.timer.pause();
            };
            _this.resume = function () {
                _this.timer && _this.timer.resume();
            };
            _this.toggle = function () {
                _this.timer && _this.timer.toggle(_this.options.duration);
            };
        },
        update: function () {
            this.createNewParticles && this.particles.length < this.options.particlesNum && this._addBornParticle();
            if (this.options.emtrTrail) {
                this.options.emtrTrail(this.emtr);
            }
            this._applyGravity();
            this._applyEffectors();
            this.options.mode == "dom" ? this._updateDomParticle() : this._updateCtxParticle();
        },
        _updateDomParticle: function () {
            for (var i in this.particles) {
                var p = this.particles[i], per = (1 - p.age / p.life).toFixed(2);
                var node = p.node, size = (this.options.updateProperty[1] ? p.size * per : p.size);
                if (this.options.updateProperty[0]) {
                    node.style.backgroundColor = "rgba("
                        + Math.floor(p.color.r * 255) + ","
                        + Math.floor(p.color.g * 255) + ","
                        + Math.floor(p.color.b * 255) + ","
                        + per + ")";
                }
                node.style.left = (p.position.x - size / 2).toFixed(2) + "px";
                node.style.top = (p.position.y - size / 2).toFixed(2) - p.size / 2 + "px";
                node.style.height = size + "px";
                node.style.width = size + "px";
            }
            this.options.onStart && this.options.onStart(this.particles, this.emtr);
        },
        _updateCtxParticle: function () {
            if (this.options.clearCanvas) {
                this.ctx.clearRect(0, 0, this.ele.width, this.ele.height);
            } else {
                this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
                this.ctx.fillRect(0, 0, this.ele.width, this.ele.height);
            }
            for (var i in this.particles) {
                var p = this.particles[i], per = (1 - p.age / p.life).toFixed(2);
                this.ctx.beginPath();
                this.ctx.arc(p.position.x, p.position.y, this.options.updateProperty[1] ? p.size * per / 2 : p.size / 2, 0, Math.PI * 2, true);
                this.ctx.closePath();
                var rgbacolor = "rgba("
                    + Math.floor(p.color.r * 255) + ","
                    + Math.floor(p.color.g * 255) + ","
                    + Math.floor(p.color.b * 255) + ",";
                rgbacolor = rgbacolor + (this.options.updateProperty[0] ? per : "1") + ")";
                this.ctx.fillStyle = rgbacolor;
                this.ctx.fill();
            }
            this.options.onStart && this.options.onStart(this.particles, this.emtr);
        },
        _applyGravity: function () {
            for (var i in this.particles) {
                var par = this.particles[i];
                par.position = par.position.add(par.velocity.multiply(this.duration));//position
                par.velocity = par.velocity.add(this.acceleration.multiply(this.duration));//velocity
                par.age += this.duration;
                par.age >= par.life && this._remove(i); //age
            }
        },
        _applyEffectors: function () {
            for (var j in this.effectors) {
                var apply = this.effectors[j];
                for (var i in this.particles) {
                    apply(this.particles[i]);
                }
            }
        },
        _remove: function (index) {
            if (this.particles.length > 1) {
                this.particles[index].node && $(this.particles[index].node).remove();
                this.particles[index] = this.particles[this.particles.length - 1];
            }
            this.particles.pop();
        },
        destroy: function () {
            if (this.options.mode == "dom") {
                for (var i in this.particles) {
                    $(this.particles[i].node).remove()
                }
            } else {
                this.ctx.clearRect(0, 0, this.ele.width, this.ele.height);
                this.ctx = null;
            }
            this.stop();
            this.timer = null;
            this.particles = null;
            this.effectors = null;
        }
    };
    var Particle = function () {
        return "undefined" != typeof this.initialize && this.initialize.apply(this, arguments)
    };
    Particle.prototype = {
        position: null,
        velocity: null,
        acceleration: null,
        speend: 0,
        angle: 0,
        age: 0,
        left: null,
        color: null,
        size: 4,
        node: null,
        initialize: function (opts) {
            for (var property in opts) {
                this[property] = "";
                this[property] = opts[property];
            }
        }
    };
    var Point = function () {
        return "undefined" != typeof this.initialize && this.initialize.apply(this, arguments)
    };
    Point.prototype = {
        x: 0,
        y: 0,
        initialize: function (x, y) {
            this.x = x;
            this.y = y;
        },
        copy: function () {
            return new Point(this.x, this.y);
        },
        length: function () {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        },
        sqrLength: function () {
            return this.x * this.x + this.y * this.y;
        },
        normalize: function () {
            var inv = 1 / this.length();
            return new Point(this.x * inv, this.y * inv);
        },
        negate: function () {
            return new Point(-this.x, -this.y);
        },
        add: function (v) {
            return new Point(this.x + v.x, this.y + v.y);
        },
        subtract: function (v) {
            return new Point(this.x - v.x, this.y - v.y);
        },
        multiply: function (f) {
            if (typeof f == "number") {
                return new Point(this.x * f, this.y * f);
            }
            return new Point(this.x * f.x, this.y * f.y);
        },
        divide: function (f) {
            var invf = 1 / f;
            return new Point(this.x * invf, this.y * invf);
        },
        dot: function (v) {
            return this.x * v.x + this.y * v.y;
        }
    };
    var Color = function (r, g, b) {
        return "undefined" != typeof this.initialize && this.initialize.apply(this, arguments)
    };
    Color.prototype = {
        r: 0,
        g: 0,
        b: 0,
        basic: {
            black: [0, 0, 0],
            white: [1, 1, 1],
            red: [1, 0, 0],
            green: [0, 1, 0],
            blue: [0, 0, 1],
            yellow: [1, 1, 0],
            cyan: [0, 1, 1],
            purple: [1, 0, 1]
        },
        initialize: function (r, g, b) {
            this.r = r;
            this.g = g;
            this.b = b;
        },
        randomColor: function () {
            return '#' +
                (function (color) {
                    return (color += '0123456789abcdef'[Math.floor(Math.random() * 16)])
                    && (color.length == 6) ? color : arguments.callee(color);
                })('');
        },
        colorHexToRGB: function (color) {
            color = color.toUpperCase();
            var regexpHex = /^#[0-9a-fA-F]{3,6}$/;//Hex
            if (regexpHex.test(color)) {
                var hexArray = [];
                var count = 1;
                for (var i = 1; i <= 3; i++) {
                    if (color.length - 2 * i > 3 - i) {
                        hexArray.push(Number("0x" + color.substring(count, count + 2)));
                        count += 2;
                    } else {
                        hexArray.push(Number("0x" + color.charAt(count) + color.charAt(count)));
                        count += 1;
                    }
                }
                return "RGB(" + hexArray.join(",") + ")";
            } else {
                return color;
            }
        },
        colorRGBToHex: function (color) {
            var regexpRGB = /^(rgb|RGB)\([0-9]{1,3},\s?[0-9]{1,3},\s?[0-9]{1,3}\)$/;//RGB
            if (regexpRGB.test(color)) {
                color = color.replace(/(\(|\)|rgb|RGB)*/g, "").split(",");
                var colorHex = "#";
                for (var i = 0; i < color.length; i++) {
                    var hex = Number(color[i]).toString(16);
                    if (hex.length == 1) hex = "0" + hex;
                    colorHex += hex;
                }
                return colorHex;
            } else {
                return color;
            }
        },
        copy: function () {
            return new Color(this.r, this.g, this.b);
        },
        add: function (c) {
            this.r = this.r + c.r;
            this.g = this.g + c.g;
            this.b = this.b + c.b;
            return this;
        },
        multiply: function (s) {
            this.r = this.r * s;
            this.g = this.g * s;
            this.b = this.b * s;
            return this;
        },
        modulate: function (c) {
            this.r = this.r * c.r;
            this.g = this.g * c.g;
            this.b = this.b * c.b;
            return this;
        },
        saturate: function () {
            this.r = Math.min(this.r, 1);
            this.g = Math.min(this.g, 1);
            this.b = Math.min(this.b, 1);
        }
    };
    $.timer = function (interval, callback, autostart) {
        var options = jQuery.extend({reset: 20}, autostart);
        interval = interval || options.reset;
        if (!callback) {
            return false;
        }
        var Timer = function (interval, callback) {
            this.internalCallback = function () {
                callback(self);
            };
            this.toggle = function (time) {
                if (this.state === 1) {
                    this.pause();
                } else if (this.state === 2) {
                    this.resume();
                } else {
                    this.start(time);
                }
            };
            this.stop = function () {
                if (this.state === 1 && this.id) {
                    clearInterval(self.id);
                    this.state = 0;
                    return true;
                }
                return false;
            };
            this.start = function (time) {
                if (self.id) {
                    clearInterval(self.id);
                }
                if (!time || time <= 0) {
                    time = options.reset;
                }
                this.id = setInterval($.proxy(this.internalCallback, this), time);
                this.state = 1;
                return true;
            };
            this.pause = function () {
                if (self.id && this.state === 1) {
                    clearInterval(this.id);
                    this.state = 2;
                    return true;
                }
                return false;
            };
            this.resume = function () {
                if (this.state === 2) {
                    this.state = 1;
                    this.id = setInterval($.proxy(this.internalCallback, this), this.interval);
                    return true;
                }
                return false;
            };
            this.interval = interval;
            if (autostart) {
                this.id = setInterval($.proxy(this.internalCallback, this), this.interval);
                this.state = 1;
            }
            var self = this;
        };
        return new Timer(interval, callback);
    };
})
(jQuery);