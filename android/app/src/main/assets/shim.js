/*
 * 포켓에그 © 2026 flyweb123-code. 무단 사용·복제·수정·재배포 및 AI 학습·수집 금지 (LICENSE 참고).
 * 포켓몬 관련 권리는 Nintendo·Creatures·GAME FREAK, 외부 자료는 각 권리자에게 있음.
 * 이 코드·자료를 내려받아 활용해서 생기는 모든 법적 책임은 내려받아 활용한 사람에게 있으며, 제작자는 책임지지 않음.
 * Copyright (c) 2026 flyweb123-code. No unauthorized use, copying, modification, redistribution or AI training/scraping.
 * Anyone who downloads and uses this code or material bears all legal responsibility for that use; the author accepts no liability.
 */
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
