/*
REPL/JAVASCRIPT TERM MOD 
term.js - niko

just a javascript read eval print loop
*/


(function(_){

  _.javascript = {
    version: '0.1',
    init: function(){
      this.format('json');
    },
    exec: function(cmd,p){
      try {
        var r=eval(cmd);
        p.resolve(r);
      } catch(e) {
        p.reject(e ? (e.message || e) : 'unknown error');
      }
      return p;
    }
  };

})(term.mods);