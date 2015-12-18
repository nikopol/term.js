/*
TERM JSON FORMAT
term.js - niko
*/

(function(_){

  "use strict";

  _.json={
      mask: '*.json',
      mime: 'application/json',
      read: function(o){
        try {
          return typeof(o)=='string'
            ? JSON.parse(o)
            : o;
        } catch(ex) {
          return o;
        }
      },
      write: function(o){
        return typeof(o)=='object'
          ? JSON.stringify(o,null,2)
          : o.toString();
      }
    }
  };

})(term.formats);
