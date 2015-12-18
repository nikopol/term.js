/*
██████ ████ ████  ██   ██      ██  ████
  ██   ██   ██ ██ ███ ███      ██ ██
  ██   ███  ████  ██ █ ██      ██  ████
  ██   ██   ██ ██ ██   ██   ██ ██     ██
  ██   ████ ██ ██ ██   ██ █  ███  █████
  0.3 - niko
*/


if( !term ) term={mods:{}};

$.extend(term,(function(){
  "use strict";

  var
    DFTVARS={
      version: '0.2',
      hello: '<grey>term.js v$VERSION</grey>',
      max_history: 100,
      path: '/',
      prompt: '▶ '
    },
    SIG={
      INT: 1
    },
    LOG={
      ERROR: 0,
      WARN: 1,
      NOTICE: 2,
      INFO: 3,
      DEBUG: 4
    },
    cfg={ parent: 'body' },
    tools, commands, formats, core, output, input, fs, vars;

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
      ],
      REVLOG={};

    for(var k in LOG) REVLOG[LOG[k]]=k.toLowerCase();

    function varize(o){
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
      evals: function(o){
        if( !$.isArray(o) ) o=[o];
        return o.map(varize);
      },
      style: stylize,
      styles: function(o){
        if( !$.isArray(o) ) o=[o];
        return o.map(stylize);
      },
      log: function(lvl){
        if( 'debug' in vars && lvl<=vars.debug ) {
          var args=[].slice.call(arguments,1);
          console.log.apply(console,['[term:'+REVLOG[lvl]+']'].concat(args));
        }
      }
    };
  })();

/*
 ████  ██  ██ ██████ █████  ██  ██ █████
██  ██ ██  ██   ██   ██  ██ ██  ██   ██
██  ██ ██  ██   ██   █████  ██  ██   ██
██  ██ ██  ██   ██   ██     ██  ██   ██
 ████   ████    ██   ██      ████    ██
*/

  output=(function(){
    var $output;

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
          '<div'+(css ? ' class="'+css+'"' : '')+'>'+
            (r.replace(/([\”\↵\s\n\r\"\(\>]|^)(https?:\/\/[^\↵\s\n\r\"\”\<)]+)/gmi, '$1<a target="_blank" href="$2">$2</a>')
              .replace(/(\W|^)@([\w_]+)/gm, '$1<a class="twittos" target="_blank" href="https://twitter.com/$2">@$2</a>')
              .replace(/([\w-_\.]+@[\w-_\.]+)/gm, '<a class="email" href="mailto:$1">$1</a>')
              .replace(/\{img([^\}]+)\}/gm, '<img $1>'))+
          '</div>'
        );
        core.scroll();
      },

      echo: function(o,css){
        if( $.isArray(css) ) output.out(dump(o,css));
        else output.out(dump(o),css);
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
        length: function(){ return pos===false ? 0 : Math.abs(cursor-pos); },
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
        if( askcb ) askcb(false);
        newline();
        core.signal(SIG.INT);
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
        tools.log(LOG.DEBUG,'skey',c);
        return true;
      },

      keystroke: function(e){
        var c=e.which, chr=String.fromCharCode(c);
        if( !e.ctrlKey && c>31 && c<255 ) { //REGULAR CHAR
          e.preventDefault();
          stroke(chr);
          return false;
        }
        tools.log(LOG.DEBUG,'key',c);
        return true;
      },

      prompt: function(ps1){
        $prompt.html(tools.style(tools.eval(ps1 || vars.prompt)));
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
█████  ████
██    ██
████   ███
██       ██
██    ████
*/

  fs={
    tree: {
      path: '/',
      subs: []
    },
    dir: false,
    norm: function(p){
      var n=typeof(p)=='object' ? p.join('/') : p.toString();
      return n=='' || n.substr(-1)=='/' ? n : n+'/';
    },
    parse: function(branch,parent){
      if( parent ) {
        branch.parent=parent;
        branch.rexname=new RegExp('^'+branch.name+'$');
      } else {
        branch.path='/';
        branch.parent=false;
      }
      if( branch.dirs )
        for( var n in branch.dirs ) {
          if( !branch.dirs[n] ) branch.dirs[n]={};
          branch.dirs[n].name=n;
          fs.parse(branch.dirs[n],branch);
        }
    },
    init: function(tree){
      if( tree ) {
        fs.parse(tree,'');
        fs.tree=tree;
      }
      fs.dir=fs.tree;
      if( !vars.path || !fs.cd(vars.path)) fs.cd('/');
    },
    branch: function(path,from){
      path=fs.norm(path);
      var i, p=path.split('/'), d=p.shift(), c=from ? from : fs.dir, o;
      p.pop();
      if(d=='') {
        //from root
        c=fs.tree;
        d=p.shift();
      }
      while(d){
        if(d=='..') {
          //up
          if(!c.parent) return false;
          c=c.parent;
        } else if(c.dirs) {
          o=false;
          for(var n in c.dirs)
            if(c.dirs[n].rexname.test(d)) {
              o=c.dirs[n];
              o.name=d;
              o.path=fs.norm(o.parent.path+d);
              break;
            }
          if(!o) return false;
          c=o;
        } else
          return false;
        d=p.shift();
      }
      return c;
    },
    cd: function(path){
      var c=fs.branch(path);
      if(c) {
        fs.dir=c;
        vars.path=c.path.length==1 ? '/' : c.path.substr(0,c.path.length-1);
        core.store('vars',vars);
      }
      return c;
    }
  };

/*
████  ████  ████  ██   ██  ████  ██████
██   ██  ██ ██ ██ ███ ███ ██  ██   ██
███  ██  ██ ████  ██ █ ██ ██████   ██
██   ██  ██ ██ ██ ██   ██ ██  ██   ██
██    ████  ██ ██ ██   ██ ██  ██   ██
*/

  formats={
    default: 'json',
    list: function(){
      return Object.keys(formats).filter(function(f){ return typeof(formats[f])=='object' });
    },
    json: {
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

/*
 ███  ████  ██   ██ ██   ██  ████  ██  ██ ████
██   ██  ██ ███ ███ ███ ███ ██  ██ ███ ██ ██  ██
██   ██  ██ ██ █ ██ ██ █ ██ ██████ ██ ███ ██  ██
██   ██  ██ ██   ██ ██   ██ ██  ██ ██  ██ ██  ██
 ███  ████  ██   ██ ██   ██ ██  ██ ██  ██ ████
*/

  commands={

    alias: {
      help: 'set/get an alias',
      syntax: 'alias [name [-d] ["cmd -option"]]',
      options: { '-d': 'delete alias' },
      bin: function(opt){
        var k=opt.args.shift(), v=opt.args.join(' '), r;
        if( v )
          core.alias.set(k,v);
        else if( k ) {
          if(opt.options.d) core.alias.del(k);
          else r=core.alias.get(k);
        } else
          r=core.alias.list();
        return $.Deferred().resolve(r);
      }
    },

    cd: {
      help: 'change directory',
      syntax: 'cd [path]',
      bin: function(opt){
        var path=opt.args.pop(), p=$.Deferred();
        return fs.cd(path || '/') ? p.resolve() : p.reject('path not found');
      }
    },

    cls: {
      help: 'clear output',
      syntax: 'cls',
      bin: function(opt){
        return $.Deferred().resolve(output.clear());
      }
    },

    count: {
      help: 'count an array or a string or object keys',
      syntax: 'count [-d=str] [obj]',
      options: {
        '-d=string': 'string delimiter (" " by default)',
      },
      bin: function(opt,last){
        var o=tools.array(opt.args.shift() || last, opt.options.d || ' ');
        return $.Deferred().resolve(o.length);
      }
    },

    curl: {
      help: 'http call',
      syntax: 'curl [-X=method] url [-key1=value [-key2=value]]',
      args: ['.+'],
      options: { '-X': 'get/post/put/delete' },
      bin: function(opt){
        var
          url=opt.args.shift(),
          mode=(opt.options.X || 'GET').toUpperCase(),
          data=opt.options,
          p;
        if( /POST|PUT|GET|DELETE/.test(mode) ) {
          delete data.X
          opt.args.forEach(function(a){
            if( typeof(a)=='object' )
              data=$.extend(data,a);
          });
          p=core.ajax(mode,url,data);
        } else
          p=$.Deferred().reject('unknown method');
        return p;
      }
    },

    cut: {
      help: 'slice an array or a string or object keys',
      syntax: 'cut [-d=delimiter] [-start=[-]index] [-end=[-]index] [obj]',
      options: {
        '-start:index': 'inclusive start index, negative value is from the end (default 0)',
        '-end:index': 'inclusive end index (default until the end)',
        '-d=string': 'string delimiter ("" by default)',
        '-first': 'return first element',
        '-last': 'return last element'
      },
      bin: function(opt,last){
        var
          s=opt.options.start || 0,
          e=opt.options.end,
          o=tools.array(opt.args.shift() || last, opt.options.d);
        o=o.slice(s,e!==undefined ? e+1 : e)
        return $.Deferred().resolve(
          opt.options.first 
            ? o.shift() 
            : opt.options.last
              ? o.pop()
              : o
        );
      }
    },

    echo: {
      help: 'echo "echo"',
      syntax: 'echo strings',
      options: {
        '-fmt=format': 'format (raw by default)'
      },
      bin: function(opt,last){
        var
          fmt=opt.options.fmt || formats.default,
          p=$.Deferred(),
          o=opt.args.length
            ? opt.args
            : $.isArray(last)
              ? last
              : [last];
        if( fmt )
          return fmt in formats
            ? p.resolve(o.map(function(_){ return formats[fmt].write(_) }))
            : p.reject(['unknown fmt','available format are '+formats.list().join(', ')]);
        return p.resolve(opt.args);
      }
    },

    eval: {
      help: 'eval 21*2-1',
      syntax: 'eval expression',
      bin: function(opt){
        var p=$.Deferred();
        try {
          p.resolve(eval.call(term,opt.args.join(' ')));
        } catch(e) {
          p.reject(e);
        }
        return p;
      }
    },

    exit: {
      help: 'close the terminal',
      syntax: 'exit',
      bin: function(){
        core.close();
        return $.Deferred().resolve();
      }
    },

    export: {
      help: 'save as file last result',
      syntax: 'export [-file=filename] [-fmt=format] [object]',
      options: {
        '-file=filename': 'filename to export',
        '-fmt=format': 'format (json by default)'
      },
      bin: function(opt,last){
        var
          ext=opt.options.fmt || formats.default,
          fmt=formats[ext],
          file=opt.options.file || 'export.'+ext,
          o=opt.args.length ? tools.eval(opt.args.shift()) : last,
          p=$.Deferred();
        if( fmt ) {
          try {
            core.save(file, fmt.write(o), fmt.mime);
            p.resolve();
          } catch(e) {
            p.reject(e.message);
          }
        } else
          p.reject('unknown format. (available: '+formats.list().join(',')+')');
        return p;
      }
    },

    foreach: {
      help: 'loop on an array',
      syntax: 'foreach [object]',
      options: {'-flat': 'flatten result arrays'},
      bin: function(opt,last){
        var p=$.Deferred(), r=[], o=opt.args.length ? opt.args : tools.array(last,/\s+/);

        function loop(){
          if( o.length ) {
            vars._=o.shift();
            tools.log(LOG.DEBUG,'foreach loop',vars._);
            core.exec(opt.then,{chain:true, silent:true, done:function(x){
              tools.log(LOG.DEBUG,'foreach done',x);
              if( opt.options.flat && $.isArray(x) ) r=r.concat(x);
              else r.push(x);
              loop();
            }});
          } else
            p.resolve(r,false,true);
        }

        if( opt.then ) loop();
        else p.resolve(a)

        return p;
      }
    },

    key: {
      help: 'get the value of a key in an object',
      syntax: 'key key1[.subkey1][,key2...] [object]',
      args: ['.+'],
      bin: function(opt,last){
        var
          k=opt.args.shift().split(','),
          o=opt.args.shift() || last;
        
        function getkey(o,k,n){
          if( n<k.length && o!==null && typeof(o)=='object' ) {
            var _=k[n];
            if( $.isArray(o) ) {
              if( isNaN(_) ) return;
              _=parseInt(_,10);
            }
            if( _ in o ) {
              if( n==k.length-1 ) return o[_];
              return getkey(o[_],k,n+1);
            }
          }
          return;
        }

        return $.Deferred().resolve(k.map(function(_){ return getkey(o,_.split('.'),0) }));
      }
    },

    grep: {
      help: 'search in an object, array, string',
      syntax: 'grep [-r] [-i] [-e] [-v] [-p[=int]] search[=value] [object]',
      args: ['.+'],
      options: {
        '-i': 'insensitive',
        '-e': 'exact search',
        '-r': 'regexp search',
        '-v': 'reverse match',
        '-p[=nth]': '[nth] parent of matching key'
      },
      bin: function(opt,last){
        var
          m=opt.args.shift().toString().match(/^([^=]+)=?(.+)?$/),
          s=m[1],
          val=m[2],
          r=opt.options.r ? s : s.replace(/([\.\[\]\(\)\{\}\?\*\+])/gm,"\\$1"),
          rex=new RegExp(opt.options.e ? '^'+r+'$' : r,'m'+(opt.options.i ? 'i' : '')),
          o=opt.args.shift() || last,
          up='p' in opt.options ? 0+opt.options.p : 0;

        function dig(o,rex,val,bool,up,stack){
          var r=[], z, t=typeof(o), ok;
          if( o===undefined || o===null ) return r;
          stack.unshift(o);
          if( $.isArray(o) )
            o.forEach(function(s){ r=r.concat(dig(s,rex,val,bool,up,stack)) });
          else if( t=='object' ) {
            for( z in o ) {
              if( rex.test(z)===bool && (!val || tools.stringify(o[z])===val) ) 
                r.push(up ? (up<=stack.length ? stack[up-1] : stack[stack.length-1]) : o[z]);
              else 
                r=r.concat(dig(o[z],rex,val,bool,up,stack));
            }
          } else if( rex.test(o.toString())===bool )
            r.push(o);
          stack.shift();
          return r;
        }

        return $.Deferred().resolve(dig(o,rex,val,!opt.options.v,up,[]));
      }
    },

    help: {
      help: 'launch a nuclear attack',
      syntax: 'help [-c] [-l] [filter]',
      options: {
        '-c': 'core commands',
        '-l': 'local commands'
      },
      bin: function(opt){
        var
          p=$.Deferred(),
          filter=opt.args.shift(),
          cmds=opt.options.l && !opt.options.c ? [] : Object.keys(commands),
          dircmds=opt.options.c && !opt.options.l ? {} : opt.dir.commands || {};
        if( typeof(filter)=='object' )
          cmds=[filter];
        else {
          Object.keys(dircmds)
            .filter(function(c){ return !commands[c]; })
            .forEach(function(c){ cmds.push(c); })
          if( filter ) {
            var rex=new RegExp(filter,'i');
            cmds=cmds.filter(function(c){ return rex.test(c) });
          }
          cmds.sort();
        }
        if( cmds.length ) {
          if( filter ) {
            var r=[];
            cmds.forEach(function(c,n){
              var cmd=typeof(c)=='object' ? c : dircmds[c] ? dircmds[c] : commands[c], h={};
              h.command=cmd.syntax || c;
              if( cmd.help ) h.purpose=cmd.help;
              if( cmd.options ) h.options=cmd.options;
              r.push(h);
            });
            p.resolve(r);
          } else
            p.resolve(cmds.map(function(c){
              var row=[], col='', cmd, kind;
              if( dircmds[c] ) {
                cmd=dircmds[c];
                col='<yellow>';
                kind='local';
              } else {
                cmd=commands[c];
                kind='core';
              }
              return [col+(cmd.syntax || c), kind, (cmd.help || '')];
            }), ['value','key','blue']);
        } else
          p.reject('command not found');
        return p;
      }
    },

    import: {
      help: 'import a file',
      syntax: 'import [-fmt=format] [var]',
      options: { '-fmt=format': 'format (json by default)' },
      bin: function(opt){
        var p=$.Deferred(), v=opt.args.shift(), fmt=formats[opt.options.fmt || formats.default];
        if( fmt )
          core.load(function(d){
            if( d===false )
              p.reject();
            else {
              d=fmt.read(d);
              if( v ) vars[v]=d;
              p.resolve(d);
            }
          }, fmt.mask);
        else
          p.reject('unknown format. (available: '+formats.list().join(', ')+')');
        return p;
      }
    },

    ls: {
      help: 'list current directory content',
      syntax: 'ls [-l] [path][filter]',
      options: {'-l': 'long format'},
      bin: function(opt){
        var dir=opt.dir, p=$.Deferred(), pls, rex, path, qry;
        if( opt.args.length ) {
          path=opt.args[0].split('/');
          qry=path.pop();
          if(path.length) dir=fs.branch(path.join('/'),dir);
        }
        if( dir && dir.dirs ) {
          pls = dir.ls ? dir.ls() : $.Deferred().resolve(Object.keys(dir.dirs));
          pls.done(function(d){
            var ls = d;
            if( qry ) {
              rex=new RegExp(qry,'i');
              ls=ls.filter(function(l){ return rex.test(l) });
            }
            if( opt.options.l ) p.resolve(ls,['value','key']);
            else p.resolve(ls.map(function(l){ return $.isArray(l) ? l[0] : l }).join(' '));
          }).fail(function(e){
            p.reject(e);
          });
        } else
          p.reject('path not found');
        return p;
      }
    },

    pwd: {
      help: 'return the current path',
      syntax: 'pwd',
      bin: function(){
        return $.Deferred().resolve(fs.dir.path);
      }
    },

    set: {
      help: 'get/set a variable',
      syntax: 'set [-d] [var][=][value]]',
      options: { '-d': 'delete variable' },
      bin: function(opt){
        var k=opt.rawargs.shift(), l=[], v, p;
        if( k ) {
          p=k.indexOf('=');
          if( p == -1 ) v=opt.rawargs.join(' ');
          else {
            v=k.substr(p+1);
            k=k.substr(0,p);
          }
          if( opt.options.d ) {
            delete vars[k];
            core.store('vars',vars);
          } else {
            if( /^[a-z0-9_]+$/i.test(k) ) {
              if( v!==undefined ) {
                vars[k]=v;
                core.store('vars',vars);
              }
            }
            l=[k];
          }
        } else
          l=Object.keys(vars);
        v={};
        l.forEach(function(k){ v[k]=vars[k] });
        return $.Deferred().resolve(v);
      }
    },

    size: {
      help: 'return size of arguments',
      syntax: 'size [arguments]',
      bin: function(opt,last){
        function size(o){
          if( o===null ) return 0;
          if( $.isArray(o) ) return o.reduce(function(sum,val){ return sum+size(val) },0);
          if( typeof(o)=='object' ) return Object.keys(o).reduce(function(sum,val){ return sum+size(o[val]) },0);
          if( typeof(o)=='string' ) return o.length;
          if( typeof(o)=='number' ) return o.toString().length;
          return 0;
        }
        return $.Deferred().resolve(size(opt.args.length ? opt.args : last));
      }
    },

    uniq: {
      help: 'deduplicate array entry',
      syntax: 'uniq [-c] [array]',
      options: { '-c': 'count' },
      bin: function(opt,last){
        var
          o=tools.array(opt.args.shift() || last),
          p=$.Deferred();
        var h={};
        o.forEach(function(x){
          if( x ) {
            var k=x.toString();
            h[k]=(h[k] || 0)+1;
          }
        });
        o=Object.keys(h);
        if(opt.options.c) p.resolve(o.map(function(_){ return [_,h[_]] }), ['key','value right']);
        else p.resolve(o);
        return p;
      }
    }

  };

/*
 ███  ████  ████  ████
██   ██  ██ ██ ██ ██
██   ██  ██ ████  ███
██   ██  ██ ██ ██ ██
 ███  ████  ██ ██ ████
*/

  core=(function(){
    var $term, $file, started=0, alias, uploadcb, opened=false;

    alias=(function(){
      var h={};
      function save(){
        core.store('alias',h);
      }
      return {
        load: function(){
          h=core.store('alias') || {};
        },
        list: function(){
          var k, a=[];
          for(k in h) a.push([k,h[k]]);
          return a;
        },
        get: function(k){
          return k ? h[k] : undefined;
        },
        set: function(k,v){
          h[k]=v;
          save();
          return h[k];
        },
        del: function(k){
          if( k in h ) {
            delete h[k];
            save();
            return true;
          }
          return false;
        },
        clear: function(){
          h={};
        }
      }
    })();

    function upload(e){
      var file=event.target.files[0];
      if( file ) {
        var reader=new FileReader();
        reader.onload=function(r){
          var txt=r.target.result;
          tools.log(LOG.DEBUG,'upload',txt);
          if( uploadcb ) uploadcb(txt);
        };
        tools.log(LOG.DEBUG,'read',file);
        reader.readAsText(file);
      } else if( uploadcb )
        uploadcb(false);
    }

    function qsplit(cmd,char,unquote){
      var w=[], c, d, i, j;
      for(i=0; i<cmd.length; ++i) {
        c=cmd[i];
        if( c!=' ' ) {
          if( c=='"' || c=="'" ) {
            for(j=i+1; j<cmd.length && cmd[j]!=c; ++j);
            if( j<cmd.length ) {
              if( unquote ) w.push(cmd.substr(i+1,j-i-1));
              else w.push(cmd.substr(i,j-i+1));
              i=j;
            } else {
              w.push(cmd.substr(i));
              i=cmd.length-1;
            }
          } else {
            for(j=i+1; j<cmd.length && cmd[j]!=char; ++j);
            if( j<cmd.length ) {
              w.push(cmd.substr(i,j-i));
              i=j;
            } else {
              w.push(cmd.substr(i));
              i=cmd.length-1;
            }
          }
        }
      }
      return w;
    }

    function piparse(pipe){
      var
        l=qsplit(pipe,' ',true).filter(function(t){ return t.length }),
        c=l.length ? l.shift().split('/') : [''],
        p={
          cmd: c.pop(),
          path: fs.norm(c),
          dir: c.length ? fs.branch(c) : fs.dir,
          options: {},
          rawargs: l.filter(function(a){ return a[0]!='-' }),
          raw: pipe
        };
      l
        .filter(function(t){  return t[0]=='-' })
        .forEach(function(t){
          var m=t.match(/^--?([^\s=]+)(=(.+))?$/);
          p.options[m[1]]=m[3]===undefined
            ? true
            : tools.eval(m[3])
        });
      return p;
    }

    function parse(cmd,then){
      var pipes=qsplit(cmd,'|').map(piparse), first=pipes.shift(), pipe=first, p;
      while( (p=pipes.shift()) ) {
        pipe.then=p;
        pipe=p;
      }
      if( then ) pipe.then=then;
      return first;
    }

    function unparse(cmd,opt){
      var k,v;
      if( opt.args.length )
        cmd+=' '+opt.args.join(' ');
      for(k in opt.options) {
        v=opt.options[k];
        if( v===true ) cmd+=' -'+k;
        else cmd+=' "-'+k+'='+v+'"';
      }
      return cmd;
    }

    function badargs(opt,cmd){
      if( !cmd.args ) return false;
      if( opt.args.length<cmd.args.length ) return true;
      return cmd.args.filter(function(a,n){
        var rex=new RegExp('^'+a+'$');
        return !rex.test(opt.args[n]);
      }).length;
    }

    return {
      started: function(){ return ++started-1 },
      alias: alias,

      build: function(){
        if( !$term ) {
          alias.load();
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
        }
      },

      store: function(k,v){
        return !window.localStorage
          ? false
          : v===undefined
            ? JSON.parse(localStorage.getItem(k))
            : v===null
              ? localStorage.removeItem(k)
              : localStorage.setItem(k,JSON.stringify(v));
      },

      scroll: function(){
        var t=$term[0];
        t.scrollTop=t.scrollHeight;
      },

      suggest: function(cmd,buf){
        var i=parse(cmd) || {dir:fs.dir, path:fs.dir.path}, l=[], n;
        if( i.dir.dirs ) l=l.concat(Object.keys(i.dir.dirs).map(function(o){ return o+'/'; }));
        if( i.dir.commands ) l=l.concat(Object.keys(i.dir.commands));
        l=l
          .concat(Object.keys(commands).filter(function(o){ return l.indexOf(o)==-1 }))
          .map(function(o){ return i.path+o; })
          .filter(function(o){ return cmd==o.substr(0,cmd.length); });
        if( !l.length ) return false;
        n=l.indexOf(buf);
        return n==-1
          ? l[0]
          : l[++n % l.length];
      },

      exec: function(cmd,ctx){
        var p, c,
          opt=typeof(cmd)=='string' ? parse(cmd) : cmd,
          a=opt ? alias.get(opt.cmd) : false;
        if( !ctx ) ctx={};
        if( a ) {
          input.history.push(cmd);
          a=parse(unparse(a,opt), opt.then);
          ctx.chain=true;
          return core.exec(a, ctx);
        } else if( opt && opt.cmd ) {
          if( !ctx.chain ) input.history.push(cmd);
          if( !ctx.silent ) $term.addClass('run');
          if( !opt.dir )
            p=$.Deferred().reject('path not found');
          else {
            if( /^[\(\)0-9\.\-\+\/\*]+$/.test(opt.cmd) ) {
              //hack for auto eval
              opt.args.unshift(opt.cmd);
              opt.cmd='eval';
            }
            c=opt.dir.commands && opt.dir.commands[opt.cmd]
              ? opt.dir.commands[opt.cmd]
              : commands[opt.cmd];
            if( c ) {
              opt.args=opt.rawargs.map(tools.eval);
              if( opt.options.help || opt.options['?'] ) {
                //hack for --help
                opt.args.unshift(c);
                p=commands.help.bin(opt);
              } else if( badargs(opt,c) ) {
                p=$.Deferred().reject('invalid or missing arguments');
              } else if( c.alias ) {
                //hack for alias
                opt=parse(unparse(typeof(c.alias)=='function' ? c.alias(opt,vars._) : c.alias, opt), opt.then);
                ctx.chain=true;
                return core.exec(opt, ctx);
              } else if( c.bin ) {
                //regular exec
                p=c.bin(opt,vars._);
              } else
                p=$.Deferred().reject('invalid command');
            } else
              p=$.Deferred().reject([
                'command unknown',
                'type "help" to get a list of available commands'
              ]);
          }
          p.done(function(out,css,stop){
            tools.log(LOG.INFO,opt.raw,out);
            vars._=out;
            if( opt.then && !stop ) {
              ctx.chain=true;
              return core.exec(opt.then, ctx);
            } else if( ctx.done ) {
              ctx.done(out);
            } else if( !ctx.silent ) {
              if( out!==undefined ) output.echo(out,css);
              $term.removeClass('run');
              input.prompt();
            }
          }).fail(function(e){
            if( e!==undefined ) output.echo(typeof(e)=='object' && 'statusText' in e ? e.statusText : e,'error');
            if( !ctx.silent ) {
              $term.removeClass('run');
              input.prompt();
            }
          });
        } else if( !ctx.silent )
          input.prompt();
        return p;
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

  return {
    tools: tools,
    input: input,
    output: output,
    history: history,
    cfg: function(k){ return cfg[k] },
    vars: function(k){ return vars[k] },
    init: function(o){
      core.build();
      cfg=$.extend(true,cfg,o.cfg);
      commands=$.extend(true,commands,o.commands);
      formats=$.extend(true,formats,o.formats);
      vars=$.extend(DFTVARS,core.store('vars'),o.vars,{version:DFTVARS.version});
      core.store('vars',vars);
      fs.init(o.tree);
      if( vars.hello && !core.started() )
        output.echo(tools.evals(vars.hello));
      input.prompt();
      return this;
    },
    reset: function(){
      window.localStorage && localStorage.clear();
      input.history.clear();
      core.alias.clear();
      vars=$.extend({},DFTVARS);
      output.clear();
    },
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
    echo: function(o, css){
      output.echo(o, css);
      return this;
    },
    exec: function(cmd){
      core.exec(cmd);
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
    ajax: {
      get: function(url,data,cfg){
        return core.ajax('GET',url,data,cfg);
      },
      post: function(url,data,cfg){
        return core.ajax('POST',url,data,cfg);
      },
      put: function(url,data,cfg){
        return core.ajax('PUT',url,data,cfg);
      },
      delete: function(url,data,cfg){
        return core.ajax('DELETE',url,data,cfg);
      }
    }
  };

})());
