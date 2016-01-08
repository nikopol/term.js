/*
DUMB TERM MOD 
term.js - niko

just, like a parrot, echo what you say
just, like a parrot, echo what you say
*/


(function(_){

  _.dumb = {
    version: '0.1',
    exec: function(cmd,p){
      p.resolve(cmd);
      return p;
    }
  };

})(term.mods);