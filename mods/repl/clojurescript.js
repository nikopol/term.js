/*
REPL/CLOJURESCRIPT TERM MOD 
term.js - niko

just a clojurescript read eval print loop

require repl-web.js
from https://github.com/kanaka/cljs-bootstrap
*/


(function(_){

  function getNS(){
    return cljs_bootstrap.core.current_ns.state.str || '';
  }

  _.clojurescript = {
    version: '0.1',
    init: function(){
      this.vars({ns: getNS(), prompt: '$NS>'});
    },
    exec: function(cmd,p){
      var self=this;
      try {
        cljs_bootstrap.core.read_eval_print(cmd, function(ok, r){
          self.vars('ns',getNS());
          ok ? p.resolve(r) : p.fail(r);
        });
      } catch (e) {
        p.reject(e.message);
      }
      return p;
    }
  };

})(term.mods);