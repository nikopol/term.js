/*
██████ ████ ████  ██   ██      ██  ████
  ██   ██   ██ ██ ███ ███      ██ ██
  ██   ███  ████  ██ █ ██      ██  ████
  ██   ██   ██ ██ ██   ██   ██ ██     ██
  ██   ████ ██ ██ ██   ██ █  ███  █████
  0.3 - niko


constructor
-----------

var t = term({ //default options (all optionals) :
  id: false,             // term id for locale storage isolation mainly (history, vars, etc) 
  parent: 'body',        // jquery selector on the term dom container
  mod: false,            // name of a mod to use. you have to load it manually after term.js
  autofocus: false,      // focus on mouse over
  vars: {                // terminal vars object
    hello: ["term.js"],  //   welcome message displayed at start
    max_history: 100,    //   max lines kept in history
    prompt: '▶ '         //   prompt to display at start of each command. could also be a
                         //   function returning a string
  }
});


methods & properties
--------------------

t.reset()                // reset storage and default var
 .open()                 // attach to the dom
 .close()                // detach from the dom
 .toggle()               // toglle open/close
 .focus()                // force focus
;

jquery way
----------

options={autofocus:true}; //see constructor
$('#my-term-container').term(options)

*/

var term=(function(){

  "use strict";

  var
    DFTVARS={
      version: '0.3',
      hello: '<grey>term.js v$VERSION</grey>',
      max_history: 100,
      prompt: '▶ '
    },
    termid = 0,
    term,
    tools,
    formats;

/*
██████ ████   ████  ██    ████
  ██  ██  ██ ██  ██ ██   ██
  ██  ██  ██ ██  ██ ██    ███
  ██  ██  ██ ██  ██ ██      ██
  ██   ████   ████  ████ ████
*/

  tools=(function(){

    var
      STYLES=(
        "black white yellow grey red cyan blue green magenta "+
        "bg-black bg-white bg-yellow bg-grey bg-red bg-cyan bg-blue bg-green bg-magenta "+
        "error bold center right one-line").split(' '),
      REX={
        STARTSTYLE: new RegExp('<('+STYLES.join('|')+')>','gi'),
        ENDSTYLE: new RegExp('<\/('+STYLES.join('|')+')>','gi'),
        VARS: /\$([A-Z0-9_]+)/g,
      },
      HTMLCHARS=[ //order matters
        [/&/gm, '&amp;'],
        [/</gm, '&lt;'],
        [/>/gm, '&gt;'],
        [/\n/gm, '<br>'],
      ];

    function varize(o,vars){
      if( typeof(o)=='string' ) {
        vars.time=Date().substr(16,8);
        if( o=='null' ) return null;
        if( o=='true' ) return true;
        if( o=='false' ) return false;
        if( /^\d+$/.test(o) ) return parseInt(o,10);
        var m, wars=[];
        while( (m=REX.VARS.exec(o))!==null )
          wars.push({p:m.index, l:m[0].length, s:tools.dump(vars[m[1].toLowerCase()]) || ''});
        while( (m=wars.pop()) )
          o=o.substr(0,m.p)+m.s+o.substr(m.p+m.l);
      }
      return o;
    }

    function stylize(o){
      if( typeof(o)=='string' ) {
        var m, cols=[];
        while( (m=REX.STARTSTYLE.exec(o))!==null )
          cols.push({p:m.index,l:m[0].length,s:'<span class="'+m[1]+'">'});
        while( (m=cols.pop()) )
          o=o.substr(0,m.p)+m.s+o.substr(m.p+m.l);
        return o.replace(REX.ENDSTYLE,'</span>');
      }
      return o;
    }

    return {
      array: function(o,s){
        if( $.isArray(o) ) return o;
        if( o===null ) return [];
        if( typeof(o)=='object' ) return Object.keys(o);
        return o.toString().split(s || '');
      },
      stringify: function(s){
        if(s===undefined) return 'undefined';
        if(s===null) return 'null';
        return s.toString();
      },
      encode: function(h){
        HTMLCHARS.forEach(function(c){
          h=h.replace(c[0],c[1]);
        });
        return h;
      },
      decode: function(h){
        HTMLCHARS.forEach(function(c){
          h=h.replace(c[1],c[0]);
        });
        return h;
      },
      dump: function(o){
        var h, t=typeof(o);
        if( o===null )            h='null';
        else if( o===true )       h='true';
        else if( o===false )      h='false';
        else if( t=='undefined' ) h='undefined';
        else if( t=='function' )  h='function';
        else if( t=='string' )    h=o;
        else h=JSON.stringify(o,null,2);
        return h;
      },
      eval: varize,
      evals: function(o,vars){
        if( !$.isArray(o) ) o=[o];
        return o.map(function(z){ return varize(z,vars) });
      },
      style: stylize,
      styles: function(o){
        if( !$.isArray(o) ) o=[o];
        return o.map(stylize);
      },
      ajax: function(method,url,data,cfg){
        var pp=/^P(OS|U)T$/i.test(method), o=cfg || {}, p=o.promise || $.Deferred();
        if( !pp && data && typeof(data)=='object' ) {
          var k, args=[];
          for(k in data)
            if( data[k]!=undefined )
              args.push(k+'='+encodeURIComponent(data[k]));
          url+=(url.indexOf('?')==-1 ? '?' : '&')+args.join('&');
        }
        $.ajax({
          method: method,
          url: url,
          data: pp ? JSON.stringify(data) : null,
          contentType: pp ? 'application/json; charset=UTF-8' : o.contentType,
          success: function(d){
            if( o.transform ) d=o.transform(d);
            p.resolve(o.success ? o.success(d) : d, o.css);
          },
          error: function(d){ p.reject(o.error ? o.error(d) : d); }
        });
        return p;
      }
    };
  })();

/*
████  ████  ████  ██   ██  ████  ██████
██   ██  ██ ██ ██ ███ ███ ██  ██   ██
███  ██  ██ ████  ██ █ ██ ██████   ██
██   ██  ██ ██ ██ ██   ██ ██  ██   ██
██    ████  ██ ██ ██   ██ ██  ██   ██
*/

  formats={
    list: function(){
      return Object.keys(formats).filter(function(f){ return typeof(formats[f])=='object' });
    },
    html: {
      mask: '*.html',
      mime: 'text/html',
      read: function(o){
        console.log('[term] html reader not implemented');
        return null;
      },
      write: function(o,css){

        function dump(o,css){
          var h='';
          if( $.isArray(o) ) {
            //if( o.length==1 ) return dump(o[0],css);
            h=o.map(function(row){
              if( $.isArray(row) ) {
                if( row.length > 1 )
                  return '<tr>'+row.map(function(col,n){
                    return'<td'+(css && n<css.length ? ' class="'+css[n]+'"' : '')+'>'+dump(col)+'</td>'
                  }).join('')+'</tr>';
                row=row[0];
              }
              return '<tr><td>'+dump(row,css)+'</td></tr>';
            }).join('');
            return '<table>'+h+'</table>';
          } else if( o!==null && typeof(o)=='object' ) {
            if(!css) css=['key','value'];
            for( var k in o )
              h+=
                '<tr>'+
                  '<td class="'+css[0]+'">'+tools.encode(k)+'</td>'+
                  '<td class="'+css[1]+'">'+dump(o[k],css.slice(1))+'</td>'+
                '</tr>';
            return '<table>'+h+'</table>';
          }
          return tools.dump(o,css);
        }

        return dump(o,css);
      }
    }
  };

  function termobj(usrcfg){
    if( !usrcfg ) usrcfg={};

    var
      self=this,
      mod=(usrcfg.mod ? term.mods[usrcfg.mod] : false) || {},
      vars=$.extend({}, DFTVARS, usrcfg.vars, mod.vars),
      cfg={
        parent: usrcfg.parent || 'body',
        id: usrcfg.id || 'term'+(++termid),
        exec: usrcfg.exec,
        autofocus: usrcfg.autofocus
      },
      fmt, mod, core, output, input;

/*
 ████  ██  ██ ██████ █████  ██  ██ █████
██  ██ ██  ██   ██   ██  ██ ██  ██   ██
██  ██ ██  ██   ██   █████  ██  ██   ██
██  ██ ██  ██   ██   ██     ██  ██   ██
 ████   ████    ██   ██      ████    ██
*/

    output=(function(){
      var $output;

      return {

        build: function(){
          return $output=$('<div class="output"></div>');
        },

        clear: function(){
          $output.empty();
        },

        out: function(o,css){
          var r=tools.style(o.toString());
          $output.append(
            '<div'+(css && typeof(css)=='string' ? ' class="'+css+'"' : '')+'>'+
              (r.replace(/([\”\↵\s\n\r\"\(\>]|^)(https?:\/\/[^\↵\s\n\r\"\”\<)]+)/gmi, '$1<a target="_blank" href="$2">$2</a>')
                .replace(/(\W|^)@([\w_]+)/gm, '$1<a class="twittos" target="_blank" href="https://twitter.com/$2">@$2</a>')
                .replace(/([\w-_\.]+@[\w-_\.]+)/gm, '<a class="email" href="mailto:$1">$1</a>')
                .replace(/\{img([^\}]+)\}/gm, '<img $1>'))+
            '</div>'
          );
          core.scroll();
        },

        echo: function(o,css){
          if( o!==undefined ) {
            try {
              var s=$.isArray(css) ? formats[fmt].write.call(self,o,css) : formats[fmt].write.call(self,o);
              if( s!==undefined ){
                if( formats[fmt].mime!='text/html' ) s=tools.encode(s);
                output.out(s,css);
              }
            } catch(e) {
              output.out('error formating output ('+(e.message || 'unknown error')+')','error');
            }
          }
        }
      }
    })();

/*
██ ██  ██ █████  ██  ██ █████
██ ███ ██ ██  ██ ██  ██   ██
██ ██ ███ █████  ██  ██   ██
██ ██  ██ ██     ██  ██   ██
██ ██  ██ ██      ████    ██
*/

    input=(function(){
      var $input, $prompt, $cmd, $clip, buf='', cursor=0, select, history, clipboard, skeys, ckeys, askcb=false, quote=false;

      history=(function(){
        var list=[], n=0, c;

        function get(d){
          if( list.length ) {
            n+=d;
            if( n>list.length ) n=list.length;
            else if( n<0 ) n=0;
            c=n==list.length ? '' : list[n];
            select.unset();
            buf=c;
            cursor=c.length;
            show();
          }
        }

        function save(){
          core.store('history',list);
        }

        return {
          load: function(){
            list=core.store('history') || [];
            n=list.length;
          },
          clear: function(){
            list=[];
            n=0;
          },
          push: function(c){
            if( !list.length || list[list.length-1]!=c ) {
              list.push(c);
              while( list.length>vars.max_history )
                list.shift();
              save();
            }
            n=list.length;
          },
          prev: function(){
            return get(-1);
          },
          next: function(){
            return get(1);
          }
        };
      })();

      select=(function(){
        var pos=false;
        return {
          get: function(){
            return pos===false
              ? ''
              : pos<cursor
                ? buf.substr(pos, cursor-pos)
                : buf.substr(cursor, pos-cursor);
          },
          set: function(p) {
            if( pos===false ) pos=p;
          },
          unset: function(){
            pos=false;
          },
          del: function(){
            if( pos!==false ) {
              if( cursor>pos ) {
                buf=buf.substr(0,pos)+buf.substr(cursor);
                cursor=pos;
              } else
                buf=buf.substr(0,cursor)+buf.substr(pos);
              select.unset();
            }
          },
          length: function(){ return pos===false ? 0 : Math.abs(cursor-pos); },
          pos: function(){ return pos; }
        }
      })();

      clipboard=(function(){
        return {
          copy: function(){
            var txt=select.get();
            $clip.val(txt).select();
            document.execCommand('copy');
            core.term().focus();
          },
          paste: function(txt){
            if( txt && txt.length ) {
              buf=buf.substr(0,cursor)+txt+buf.substr(cursor);
              show(cursor+txt.length);
            }
          }
        }
      })();

      function show(pos,skey){
        var h;
        if( pos!==undefined ) {
          if( skey ) select.set(cursor);
          else select.unset();
          cursor=pos;
        }
        var slen=select.length(), spos=select.pos();
        if( cursor<buf.length ) {
          if( !slen )
            h=tools.encode(buf.substr(0,cursor))+
              '<span class="cursor">'+
              tools.encode(buf.substr(cursor,1))+
              '</span>'+
              tools.encode(buf.substr(cursor+1));
          else if( spos<cursor )
            h=tools.encode(buf.substr(0,spos))+
              '<span class="select">'+
              tools.encode(buf.substr(spos,cursor-spos))+
              '</span><span class="cursor">'+
              tools.encode(buf.substr(cursor,1))+
              '</span>'+
              tools.encode(buf.substr(cursor+1));
          else
            h=tools.encode(buf.substr(0,cursor))+
              '<span class="select"><span class="cursor">'+
              tools.encode(buf.substr(cursor,1))+
              '</span>'+
              tools.encode(buf.substr(cursor+1,spos-cursor-1))+
              '</span>'+
              tools.encode(buf.substr(spos));
        } else if( slen ) {
          h=tools.encode(buf.substr(0,spos))+
            '<span class="select">'+
            tools.encode(buf.substr(spos))+
            '</span><span class="cursor">&nbsp;</span>';
        } else
          h=tools.encode(buf)+'<span class="cursor">&nbsp;</span>'
        $cmd.html(h);
      }

      function stroke(chr){
        select.del();
        buf=buf.substr(0,cursor)+chr+buf.substr(cursor);
        show(cursor+1);
        core.scroll();
      }

      function unescape(txt){
        return txt.replace(/\\(.)/gm, "$1");
      }

      function openquote(txt){
        var quote=false, i=0, len=txt.length, c;
        while( i<len ) {
          c=txt[i];
          if( c=='\\' ) i++;
          else if( c=='"' || c=="'" ) {
            if( !quote ) quote=c;
            else if( quote==c ) quote=false;
          }
          i++;
        }
        return quote;
      }

      function newline(){
        select.unset();
        $cmd.html(tools.encode(buf)); //remove input.cursor
        output.out($input.html()); //output command
        $prompt.empty(); //remove prompt
        input.clear(); //remove command
      }

      skeys={
        8: /*BACKSPACE*/ function(){
          if( select.length() )
            select.del();
          else if( cursor ) {
            buf=buf.substr(0,cursor-1)+buf.substr(cursor);
            cursor--;
          }
          show();
        },
        9: /*TAB*/ function(){
          select.unset();
          var s=core.suggest(buf.substr(0,cursor),buf);
          if(s) {
            buf=s;
            select.set(s.length);
          }
          show();
        },
        13: /*ENTER*/ function(e){
          var cmd=buf, bef=buf.substr(0,cursor);
          if( openquote(bef) )
            stroke("\n");
          else {
            newline();
            if( askcb ) askcb(cmd);
            else core.exec(cmd);
          }
        },
        27: /*ESC*/ function(){
          if( askcb )
            askcb(false);
          else {
            select.unset();
            core.hide();
          }
        },
        35: /*END*/ function(e){
          if( cursor<buf.length )
            show(buf.length, e.shiftKey);
        },
        36: /*HOME*/ function(e){
          if( cursor )
            show(0, e.shiftKey);
        },
        37: /*LEFT*/ function(e){
          if( cursor )
            show(cursor-1, e.shiftKey);
        },
        39: /*RIGHT*/ function(e){
          if( !e.shiftKey && select.pos()==buf.length )
            show(buf.length, false);
          else if( cursor<buf.length )
            show(cursor+1, e.shiftKey);
        },
        38: /*UP*/ function(){
          history.prev();
        },
        40: /*DOWN*/ function(){
          history.next();
        },
        45: /*INSER*/ function(e){
          if(e.shiftKey)
            clipboard.paste();
        },
        46: /*DELETE*/ function(){
          if( select.length() )
            select.del();
          else if( cursor<buf.length )
            buf=buf.substr(0,cursor)+buf.substr(cursor+1);
          show();
        },
      };

      ckeys={
        45: /*CTRL+INSER*/ function(){
          clipboard.copy();
        },
        67: /*CTRL+C*/ function(){
          // if( askcb ) askcb(false);
          // newline();
        },
        76: /*CTRL+L*/ function(){
          output.clear();
        }
      };

      return {
        history: history,
        select: select,
        clipboard: clipboard,

        build: function(){
          history.load();
          return $input=$('<div class="input"></div>')
            .append( $prompt=$('<span class="prompt"></span>') )
            .append( $cmd=$('<span class="cmd"></span>') )
            .append( $clip=$('<textarea class="clipboard"></textarea>') );
        },

        skeystroke: function(e){
          var c=e.which, keys=e.ctrlKey ? ckeys : skeys;
          if( keys[c] ) {
            e.preventDefault();
            keys[c](e);
            core.scroll();
            return false;
          }
          return true;
        },

        keystroke: function(e){
          var c=e.which, chr=String.fromCharCode(c);
          if( !e.ctrlKey && c>31 && c<255 ) { //REGULAR CHAR
            e.preventDefault();
            stroke(chr);
            return false;
          }
          return true;
        },

        prompt: function(ps1){
          var p=ps1 || (typeof(vars.prompt)=='function' ? vars.prompt.call(self) : vars.prompt.toString());
          $prompt.html(tools.style(tools.eval(p, vars)));
          show();
        },

        unprompt: function(){
          show();
        },

        clear: function(){
          buf='';
          show(0);
        },

        ask: function(prompt,dft,cb){
          core.term().removeClass('run');
          input.prompt((prompt || '')+(dft ? ' [<grey>'+dft+'</grey>]' : '')+': ');
          askcb=function(i){
            askcb=false;
            core.term().addClass('run');
            cb.call(window.term,i==='' && dft ? dft : i);
          };
        }

      };
    })();

/*
 ███  ████  ████  ████
██   ██  ██ ██ ██ ██
██   ██  ██ ████  ███
██   ██  ██ ██ ██ ██
 ███  ████  ██ ██ ████
*/

    core=(function(){
      var $term, $file, uploadcb, opened=false;

      function upload(e){
        var file=event.target.files[0];
        if( file ) {
          var reader=new FileReader();
          reader.onload=function(r){
            var txt=r.target.result;
            if( uploadcb ) uploadcb(txt);
          };
          reader.readAsText(file);
        } else if( uploadcb )
          uploadcb(false);
      }

      return {

        build: function(){
          if( !fmt ) fmt='html';
          if( !$term ) {
            $file=$('<input type="file">').on('change',upload);
            $term=$('<div class="term" tabindex="1"></div>')
              .append($file)
              .append(output.build())
              .append(input.build())
              .on('keypress',input.keystroke)
              .on('keydown',input.skeystroke)
              .on('keyup',input.prevent)
              .on('paste',function(e){
                if( e.originalEvent && e.originalEvent.clipboardData )
                  input.clipboard.paste(e.originalEvent.clipboardData.getData('text/plain'));
              })
            ;
            if( cfg.autofocus ) $term.hover(function(){
              console.log('autofocus!');
              $term.focus();
            });

          }
        },

        store: function(k,v){
          var tk=cfg.id+'_'+k;
          return !window.localStorage
            ? false
            : v===undefined
              ? JSON.parse(localStorage.getItem(tk))
              : v===null
                ? localStorage.removeItem(tk)
                : localStorage.setItem(tk,JSON.stringify(v));
        },

        scroll: function(){
          var t=$term[0];
          t.scrollTop=t.scrollHeight;
        },

        format: function(f){
          if( f && f in formats ) fmt=f;
          return fmt;
        },

        exec: function(cmd){
          var p=$.Deferred();
          $term.addClass('run');
          input.history.push(cmd);
          if( cfg.exec ) p=cfg.exec.call(self,cmd,p);
          else if( mod.exec ) p=mod.exec.call(self,cmd,p);
          else p.resolve();
          p.done(function(){ 
            if( arguments.length )
              output.echo.apply(self,arguments);
          }).fail(function(e){
            if( e!==undefined )
              output.echo(typeof(e)=='object' && 'statusText' in e ? e.statusText : e,'error');
          }).always(function(){
            $term.removeClass('run');
            input.prompt();
          });
        },

        open: function(){
          if( !opened ) $(cfg.parent).append($term);
          opened=true;
          $term.focus();
          input.prompt();
          core.scroll();
        },

        close: function(){
          input.unprompt();
          if( opened ) $term.detach();
          opened=false;
        },

        toggle: function(){
          if( opened ) core.close();
          else core.open();
        },

        save: function(file,data,mime){
          var
            m=mime || 'text/plain',
            b=new Blob([data], {type: m}),
            $a=$('<a class="save"></a>'),
            a=$a[0];
          a.href=window.URL.createObjectURL(b);
          a.download=file;
          a.dataset.downloadurl=[m, a.download, a.href].join(':');
          $term.append($a);
          a.onclick=function(){
            setTimeout(function(){
              window.URL.revokeObjectURL(a.href);
              $a.detach();
              $a=a=null;
            }, 1500);
            return true;
          };
          a.click();
        },

        load: function(cb, type){
          uploadcb=cb;
          $file.attr('accept', type || '').click();
        },

        signal: function(s){
          if( s==SIG.INT ){
            $term.removeClass('run');
            input.prompt();
          }
        },

        term: function(){ return $term; }
      }
    })();

    //this

    $.extend(this,{
      tools: tools,
      history: history,
      cfg: function(k){ return cfg[k] },
      vars: function(k){ 
        if( arguments.length>1 )
          vars[k]=arguments[1]
        else if( typeof(k)=='object' )
          for(var n in k)
            vars[n]=k[n];
        else
          return vars[k];
      },
      reset: function(){
        localStorage && localStorage.clear();
        input.history.clear();
        vars=$.extend({},DFTVARS);
        output.clear();
        return this;
      },
      format: core.format,
      load: core.load,
      save: core.save,
      on: function(e,cb){
        core.term().on(e,cb);
        return this;
      },
      toggle: function(){
        core.toggle();
        return this;
      },
      open: function(){
        core.open();
        return this;
      },
      close: function(){
        core.close();
        return this;
      },
      focus: function(){
        core.term().focus();
        return this;
      },
      echo: function(o, css){
        output.echo(o, css);
        return this;
      },
      clear: function(){
        output.clear();
        return this;
      },
      ask: function(prompt,dft,cb){
        input.ask(prompt,dft,cb);
        return this;
      },
      exec: function(cmd){
        core.exec(cmd);
        return this;
      },
      ajax: {
        get: function(url,data,cfg){
          return tools.ajax('GET',url,data,cfg);
        },
        post: function(url,data,cfg){
          return tools.ajax('POST',url,data,cfg);
        },
        put: function(url,data,cfg){
          return tools.ajax('PUT',url,data,cfg);
        },
        delete: function(url,data,cfg){
          return tools.ajax('DELETE',url,data,cfg);
        }
      }
    });

    //init
    core.build();
    core.store('vars',vars);
    usrcfg.init && usrcfg.init.call(self);
    vars.hello && output.echo(tools.evals(vars.hello, vars));
    mod.version && output.echo('<grey>module '+usrcfg.mod+' '+(mod.version || '')+' loaded');
    mod.init && mod.init.call(self,usrcfg[usrcfg.mod]);

  };

  term=function(o){ return new termobj(o) };
  term.formats=formats;
  term.mods={};

  return term;

})();

//jquery stuff

(function($){
  $.fn.term=function(config){
    this.each(function(e){
      term($.extend(true,{},config,{parent:e}));
    });
  };
}(jQuery));
