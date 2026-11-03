// 안드로이드 앱 → 게임: 아이폰 앱과 같은 창구(window.webkit.messageHandlers.이름.postMessage)를 만들어 준다.
// 그래서 게임 코드는 아이폰 앱인지 안드로이드 앱인지 몰라도 된다.
// postMessage 는 Promise 를 돌려준다 (아이폰의 WKScriptMessageHandlerWithReply 와 같음).
(function () {
  if (window.webkit && window.webkit.messageHandlers) return;
  var A = window.PkAndroid;
  if (!A) return;
  var seq = 0, waits = {};
  window.__pkReply = function (id, ok, json) {
    var w = waits[id]; if (!w) return; delete waits[id];
    var v = null; try { v = json == null ? null : JSON.parse(json); } catch (e) { v = json; }
    if (ok) w[0](v); else w[1](new Error(String(v)));
  };
  function handler(name) {
    return {
      postMessage: function (body) {
        var id = ++seq;
        return new Promise(function (res, rej) {
          waits[id] = [res, rej];
          var s; try { s = JSON.stringify(body === undefined ? null : body); } catch (e) { s = 'null'; }
          A.post(name, s, id);
        });
      }
    };
  }
  var mh = {}, names = [];
  try { names = JSON.parse(A.handlers()); } catch (e) {}
  names.forEach(function (n) { mh[n] = handler(n); });
  window.webkit = { messageHandlers: mh };
  window.pkAndroid = true;
})();
