(function ( win ) {

    var root = win,
        moduleClass = "clubman" + (new Date - 0),
        loadings = [],
        core;


    var _ = function () {
        return new _();
    }

    _.config = function (settings) {
        for (var k in settings) {
            var val = settings[k];
            //paths
            if (typeof core.plugin[k] === 'function') {
                core.plugin[k](val);
            }
        }
        return this;
    }

    core = _.config;

    core.plugin = {};
    //模块路径
    core.paths = {};
    //默认主路径
    core.baseUrl = function () {
        var cur = getActiveUrl();
        cur = cur.replace(/[?#].*/, '');
        return cur.slice(0, cur.lastIndexOf('/') + 1);
    }();

    core.plugin['paths'] = function (val) {
        var map = core.paths;
        for (var c in val) {
            map[c] = val[c];
        }
    }

    //模块状态
    var modules = _.modules = {};


    //获取当前url
    function getActiveUrl() {
        var stack;
        try {
            aa.bb.cc.dd();
        } catch (e) {
            stack = e.stack;
        }
        if (stack) {
            stack = stack.split(/[@ ]/g).pop();
            return stack.slice(0, stack.lastIndexOf('/') + 1);
        }
    }

    //js css 加载
    var parentUrlFilter = /\/\w+\/\.\./;
    var loadCssJs = function (url, parent, ret, shim) {
        var baseUrl = core.baseUrl;
        //转化为完整路径
        if (_.config.paths[url]) {
            //paths路径 类 often/jquery-1.11.1
            ret = _.config.paths[url];
            if (typeof ret === 'object') {
                shim = ret;
                ret = shim.src;
            }
        } else {
            if (/^(\w+)(\d)?:.*/.test(url)) {
                ret = url;
            } else {
                parent = parent.substr(0, parent.lastIndexOf('/'));
                var tmp = url.charAt(0);
                //依赖列表-相对于根目录 例 :['jquery','tinyscrollbar']
                if (tmp !== '.' && tmp !== '/') {
                    ret = baseUrl + url;
                    //依赖列表-相对于兄弟路径 例 :['./jquery','./tinyscrollbar']
                } else if (url.slice(0, 2) === './') {
                    ret = parent + url.slice(1);
                    //依赖列表-相对于父路径 例 :['../jquery','../tinyscrollbar']
                } else if (url.slice(0, 2) === "..") {
                    ret = parent + "/" + url;
                    while (parentUrlFilter.test(ret)) {
                        ret = ret.replace(RegExp['$&'], '');
                    }
                } else if (tmp === "/") {
                    ret = parent + url;
                } else {
                    throw '不符合模块标识规则' + url;
                }
            }
        }
        // ret 加载路径
        // ret 是否有后缀 例 : .js .css
        var src = ret.replace(/[?#].*/, ''), mate;
        if (/\.(js|css)$/.test(src)) {
            mate = RegExp.$1;
        }
        if (!mate) {
            src += '.js';
            mate = 'js';
        }
        //开始加载js或css
        if (mate === 'js') {
            //如果之前没有加载过
            if (!modules[src]) {
                modules[src] = {
                    id: src,
                    parent: parent,
                    exports: {}
                };
                if (shim) {
                    _.require(shim.deps || '', function () {
                        loadJs(src, function () {
                            modules[src].state = 2;
                            modules[src].exprots = typeof shim.exports === 'function' ?
                                shim.exports() : window[shim.exports];
                            checkDeps();
                        })
                    });
                } else {
                    loadJs(src);
                }
            }
            return src;
        } else {
            loadCss(src);
        }
    }

    //js 加载处理
    function loadJs(url, callback) {
        var node = document.createElement('script');
        node.className = moduleClass;
        node[document.dispatchEvent ? 'onload' : 'onreadystatechange'] = function () {
            if (document.dispatchEvent || /loaded|complete/i.test(node.readyState)) {

                if (callback) {
                    callback();
                }
                if (checkDie(node, false, !document.dispatchEvent)) {
                    console.log("已成功加载 " + node.src);
                }
            }
        }
        node.onerror = function () {
            checkDie(node, true);
        }
        node.src = url;
        document.head.insertBefore(node, document.head.firstChild);
        console.log("正准备加载 " + node.src);
    }

    //css 加载处理
    function loadCss(url) {
        var id = url.replace(/(#.+|\W)/g, '');
        if (!document.getElementById(id)) {
            var node = document.createElement('link');
            node.rel = 'stylesheet';
            node.href = url;
            node.id = id;
            document.head.insertBefore(node, document.head.firstChild);
        }

    }

    //检测此JS模块的依赖是否都已安装完毕,是则安装自身
    function checkDie(node, onError, IE) {
        var id = node.src;
        node.onload = node.onreadystatechange = node.onerror = null;
        if (onError || (IE && !modules[id].state)) {
            setTimeout(function () {
                document.head.removeChild(node);
            });
            console.log("加载 " + id + " 失败!");
        } else {
            return true;
        }
    }

    //检测依赖是否加载完成
    function checkDeps() {
        loop : for (var i = loadings.length, id; id = loadings[--i];) {
            var obj = modules[id],
                deps = obj.deps;
                for (var key in deps) {
                    if (hasOwn.call(deps, key) && modules[key].state !== 2) {
                        continue loop;
                    }
                }

            if (obj.state !== 2) {
                loadings.splice(i, 1); //删除这项
                fireFactory(obj.id, obj.args, obj.factory);
                checkDeps();
            }
        }
    }

    function fireFactory(id, deps, factory) {
        for (var i = 0, array = [], d; d = deps[i++];) {
            array.push(modules[d].exprots);
        }
        var module = Object(array),
            ret = factory.apply(root, array);
        module.state = 2;
        if (ret !== void 0) {
            modules[id].exports = ret;
        }
        return ret;
    }

    window.reuqire = _.require = function (list, factory, parent) {
        // 用于检测它的依赖是否都为2
        var deps = {},
        // 用于保存依赖模块的返回值
            args = [],
        // 需要安装的模块数
            dn = 0,
        // 已安装完的模块数
            cn = 0,
            id = parent || 'callback' + setTimeout('1');
        parent = parent || core.baseUrl;

        list.forEach(function (v, k, arr) {
            var url = loadCssJs(v, parent);
            if (url) {
                dn++;
                if (modules[url] && modules[url].state === 2) {
                    cn++;
                }
                if (!deps[url]) {
                    args.push(url);
                }
            }
        });

        modules[id] = {//创建一个对象,记录模块的加载情况与其他信息
            id: id,
            factory: factory,
            deps: deps,
            args: args,
            state: 1
        }
        //需要安装与安装数

        if (dn === cn) {
            fireFactory(id, args, factory);
        } else {
            loadings.unshift(id);
        }
        checkDeps();
    }


    root._ = _;




})(self)