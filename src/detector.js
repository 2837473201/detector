
define(function(require, exports, module) {

  var detector = {};

  var userAgent = navigator.userAgent || "";
  //var platform = navigator.platform || "";
  //var vendor = navigator.vendor || "";
  var external = window.external;

  var re_msie = /\b(?:msie|ie) ([0-9.]+)/;

  function toString(object){
    return Object.prototype.toString.call(object);
  }
  function isObject(object){
    return toString(object) === "[object Object]";
  }
  function isFunction(object){
    return toString(object) === "[object Function]";
  }
  function each(object, factory, argument){
    for(var i=0,b,l=object.length; i<l; i++){
      if(factory.call(object, object[i], i) === false){break;}
    }
  }

  // 硬件设备信息识别表达式。
  // 使用数组可以按优先级排序。
  var DEVICES = [
    ["nokia", function(ua){
      if(ua.indexOf("nokia ") !== -1){
        return /\bnokia ([0-9]+)?/;
      }else if(/\bnokia[\d]/.test(ua)){
        return /\bnokia(\d+)/;
      }else{
        return "nokia";
      }
    }],
    ["wp", function(ua){
      return ua.indexOf("windows phone ") !== -1 ||
        ua.indexOf("xblwp") !== -1 ||
        ua.indexOf("zunewp") !== -1 ||
        ua.indexOf("windows ce") !== -1;
    }],
    ["pc", "windows"],
    ["ipad", "ipad"],
    ["ipod", "ipod"],
    ["iphone", "iphone"],
    ["mac", "macintosh"],
    ["mi", function(ua){
      if(ua.indexOf("mi-one plus") !== -1){
        return {
          version: "1s"
        };
      }else{
        return /\bmi ([0-9.as]+)/;
      }
    }],
    ["aliyun", "aliyunos"],
    ["meizu", /\bm([0-9]+)\b/],
    ["nexus", /\bnexus ([0-9.]+)/],
    ["android", "android"],
    ["blackberry", "blackberry"]
  ];
  // 操作系统信息识别表达式
  var OS = [
    ["wp", function(ua){
      if(ua.indexOf("windows phone ") !== -1){
        return /\bwindows phone (?:os )?([0-9.]+)/;
      }else if(ua.indexOf("xblwp") !== -1){
        return /\bxblwp([0-9.]+)/;
      }else if(ua.indexOf("zunewp") !== -1){
        return /\bzunewp([0-9.]+)/;
      }
      return "windows phone";
    }],
    ["windows", /\bwindows nt ([0-9.]+)/],
    ["macosx", /\bmac os x ([0-9._]+)/],
    ["ios", /\bcpu(?: iphone)? os ([0-9._]+)/],
    ["yunos", /\baliyunos ([0-9.]+)/],
    ["android", /\bandroid[ -]([0-9.]+)/],
    ["chromeos", /\bcros i686 ([0-9.]+)/],
    ["linux", "linux"],
    ["windowsce", /\bwindows ce(?: ([0-9.]+))?/],
    ["symbian", /\bsymbianos\/([0-9.]+)/],
    ["blackberry", "blackberry"]
  ];

  /*
   * 解析使用 Trident 内核的浏览器的 `浏览器模式` 和 `文档模式` 信息。
   * @param {String} ua, userAgent string.
   * @return {Object}
   */
  function IEMode(ua){
    if(!re_msie.test(ua)){return null;}

    var m,
        engineMode, engineVersion,
        browserMode, browserVersion,
        compatible=false;

    // IE8 及其以上提供有 Trident 信息，
    // 默认的兼容模式，UA 中 Trident 版本不发生变化。
    if(ua.indexOf("trident/") !== -1){
      m = /\btrident\/([0-9.]+)/.exec(ua);
      if(m && m.length>=2){
        // 真实引擎版本。
        engineVersion = m[1];
        var v_version = m[1].split(".");
        v_version[0] = parseInt(v_version[0], 10) + 4;
        browserVersion = v_version.join(".");
      }
    }

    m = re_msie.exec(ua);
    browserMode = m[1];
    var v_mode = m[1].split(".");
    if("undefined" === typeof browserVersion){
      browserVersion = browserMode;
    }
    v_mode[0] = parseInt(v_mode[0], 10) - 4;
    engineMode = v_mode.join(".");
    if("undefined" === typeof engineVersion){
      engineVersion = engineMode;
    }

    return {
      browserVersion: browserVersion,
      browserMode: browserMode,
      engineVersion: engineVersion,
      engineMode: engineMode,
      compatible: engineVersion !== engineMode
    };
  }
  /**
   * 针对同源的 TheWorld 和 360 的 external 对象进行检测。
   * @param {String} key, 关键字，用于检测浏览器的安装路径中出现的关键字。
   * @return {Undefined,Boolean,Object} 返回 undefined 或 false 表示检测未命中。
   */
  function checkTW360External(key){
    if(!external){return;} // return undefined.
    try{
      //        360安装路径：
      //        C:%5CPROGRA~1%5C360%5C360se3%5C360SE.exe
      var runpath = external.twGetRunPath.toLowerCase();
      // 360SE 3.x ~ 5.x support.
      // 暴露的 external.twGetVersion 和 external.twGetSecurityID 均为 undefined。
      // 因此只能用 try/catch 而无法使用特性判断。
      var security = external.twGetSecurityID(window);
      var version = external.twGetVersion(security);

      if(runpath && runpath.indexOf(key) === -1){return false;}
      if(version){return {version: version};}
    }catch(ex){}
  }

  var ENGINE = [
    ["trident", re_msie],
    //["blink", /blink\/([0-9.+]+)/],
    ["webkit", /\bapplewebkit\/([0-9.+]+)/],
    ["gecko", /\bgecko\/(\d+)/],
    ["presto", /\bpresto\/([0-9.]+)/]
  ];
  var BROWSER = [
    // Sogou.
    ["sg", / se ([0-9.x]+)/],
    // 在 360 规则中使用 mimeTypes 特性时，需要置于 360 规则之前。
    ["mx", function(ua){
      if(external && (external.mxVersion || external.max_version)){
        return {
          version: external.mxVersion || external.max_version
        };
      }
      return /\bmaxthon(?:[ \/]([0-9.]+))?/;
    }],
    // 360SE, 360EE.
    ["360", function(ua) {
      var x = checkTW360External("360se");
      if(typeof x !== "undefined"){return x;}

      // 利用 360 急速模式的特性进行识别。
      // Maxthon 4 也支持这个特性，并返回的对象与 360SE 类似，
      // 但 Maxthon 有明显的特征，因此需要将 Maxthon 的规则前置。
      //
      // 360 v6: mimeTypes["application/x-shockwave-flash"] === "Adobe Flash movie"
      // 360 v7: 修复了这个问题，但是有 2个 Flash 插件。
      var mimeTypes = navigator.mimeTypes;
      if(mimeTypes && mimeTypes.length){
        for(var i=0,l=mimeTypes.length; i<l; i++){
          if(mimeTypes[i].type === "application/x-shockwave-flash" &&
              mimeTypes[i].description === "Adobe Flash movie"){
            return true;
          }
        }
      }
      return (/\b360(?:se|ee|chrome)/);
    }],
    ["qq", /\bqqbrowser\/([0-9.]+)/],
    // TheWorld (世界之窗)
    // NOTE: 由于裙带关系，TW API 与 360 高度重合。
    // 只能通过程序安装路径中的应用程序名来区分。
    ["tw", function(ua){
      var x = checkTW360External("theworld");
      if(typeof x !== "undefined"){return x;}
      return "theworld";
    }],
    ["green", "greenbrowser"],
    ["tt", /\btencenttraveler ([0-9.]+)/],
    ["lb", function(ua){
      if(ua.indexOf("lbbrowser") === -1){return false;}
      var version = "-1";
      if(external && external.LiebaoGetVersion){
        try{
          version = external.LiebaoGetVersion();
        }catch(ex){}
      }
      return {
        version: version
      };
    }],
    ["tao", /\btaobrowser\/([0-9.]+)/],
    ["fs", /\bcoolnovo\/([0-9.]+)/],
    ["sy", "saayaa"],
    // 有基于 Chromniun 的急速模式和基于 IE 的兼容模式。必须在 IE 的规则之前。
    ["baidu", /\bbidubrowser[ \/]([0-9.x]+)/],
    // 后面会做修复版本号，这里只要能识别是 IE 即可。
    ["ie", re_msie],
    ["mi", /\bmiuibrowser\/([0-9.]+)/],
    // Opera 15 之后开始使用 Chromniun 内核，需要放在 Chrome 的规则之前。
    ["opera", function(ua){
      var re_opera_old = /\bopera.+version\/([0-9.ab]+)/;
      var re_opera_new = /\bopr\/([0-9.]+)/;
      return re_opera_old.test(ua) ? re_opera_old : re_opera_new;
    }],
    ["chrome", / (?:chrome|crios|crmo)\/([0-9.]+)/],
    // Android 默认浏览器。该规则需要在 safari 之前。
    ["android", function(ua){
      if(ua.indexOf("android") === -1){return;}
      return /\bversion\/([0-9.]+(?: beta)?)/;
    }],
    ["safari", /\bversion\/([0-9.]+(?: beta)?)(?: mobile(?:\/[a-z0-9]+)?)? safari\//],
    ["firefox", /\bfirefox\/([0-9.ab]+)/],
    ["uc", function(ua){
      return ua.indexOf("ucbrowser") !== -1 ? /\bucbrowser\/([0-9.]+)/ : /\bucweb([0-9.]+)/;
    }]
  ];

  /**
   * UserAgent Detector.
   * @param {String} ua, userAgent.
   * @param {Object} expression
   * @return {Object}
   *    返回 null 表示当前表达式未匹配成功。
   */
  function detect(name, expression, ua){
    if("undefined" === typeof ua){ua = userAgent;}
    var expr = isFunction(expression) ? expression.call(null, ua) : expression;
    if(!expr){return null;}
    var info = {
      name: name,
      version: "-1",
      codename: ""
    };
    var t = toString(expr);
    if(expr === true){
      return info;
    }else if(t === "[object String]"){
      if(ua.indexOf(expr) !== -1){
        return info;
      }
    }else if(isObject(expr)){ // Object
      if(expr.hasOwnProperty("version")){
        info.version = expr.version;
      }
      return info;
    }else if(expr.exec){ // RegExp
      var m = expr.exec(ua);
      if(m){
        if(m.length >= 2 && m[1]){
          info.version = m[1].replace(/_/g, ".");
        }else{
          info.version = "-1";
        }
        return info;
      }
    }
  }

  var na = {name:"na", version:"-1"};
  // 初始化识别。
  function init(ua, patterns, factory, detector){
    var detected = na;
    each(patterns, function(pattern){
      var d = detect(pattern[0], pattern[1], ua);
      if(d){
        detected = d;
        return false;
      }
    });
    factory.call(detector, detected.name, detected.version);
  }

  /**
   * 解析 UserAgent 字符串
   * @param {String} ua, userAgent string.
   * @return {Object}
   */
  var parse = function(ua){
    ua = (ua || "").toLowerCase();
    var d = {};

    init(ua, DEVICES, function(name, version){
      var v = parseFloat(version);
      d.device = {
        name: name,
        version: v,
        fullVersion: version
      };
      d.device[name] = v;
    }, d);

    init(ua, OS, function(name, version){
      var v = parseFloat(version);
      d.os = {
        name: name,
        version: v,
        fullVersion: version
      };
      d.os[name] = v;
    }, d);

    var ieCore = IEMode(ua);

    init(ua, ENGINE, function(name, version){
      var mode = version;
      // IE 内核的浏览器，修复版本号及兼容模式。
      if(ieCore){
        version = ieCore.engineVersion || ieCore.engineMode;
        mode = ieCore.engineMode;
      }
      var v = parseFloat(version);
      d.engine = {
        name: name,
        version: v,
        fullVersion: version,
        mode: parseFloat(mode),
        fullMode: mode,
        compatible: ieCore ? ieCore.compatible : false
      };
      d.engine[name] = v;
    }, d);

    init(ua, BROWSER, function(name, version){
      var mode = version;
      // IE 内核的浏览器，修复浏览器版本及兼容模式。
      if(ieCore){
        // 仅修改 IE 浏览器的版本，其他 IE 内核的版本不修改。
        if(name === "ie"){
          version = ieCore.browserVersion;
        }
        mode = ieCore.browserMode;
      }
      var v = parseFloat(version);
      d.browser = {
        name: name,
        version: v,
        fullVersion: version,
        mode: parseFloat(mode),
        fullMode: mode,
        compatible: ieCore ? ieCore.compatible : false
      };
      d.browser[name] = v;
    }, d);
    return d;
  };

  detector = parse(userAgent);
  detector.detect = parse;

  module.exports = detector;
});
