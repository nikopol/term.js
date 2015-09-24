/*
██████ ████ ████  ██   ██      ██  ████
  ██   ██   ██ ██ ███ ███      ██ ██
  ██   ███  ████  ██ █ ██      ██  ████
  ██   ██   ██ ██ ██   ██   ██ ██     ██
  ██   ████ ██ ██ ██   ██ █  ███  █████ 
  0.1 - niko
*/

var term = (function(){
  "use strict";

  var 
    DFTVARS={
      version: '0.1',
      hello: '<grey>term.js v$VERSION</grey>',
      max_history: 100,
      path: '/',
      prompt: '▶ '
    },
    SIG={
      INT: 1
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
        ['&', '&amp;'],
        ['<', '&lt;'],
        ['>', '&gt;']
      ];

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

    function dig(o,rex,k,n){
      var r=[], z, t=typeof(o);
      if( o===undefined || o===null ) return r;
      if( $.isArray(o) ) {
        o.forEach(function(s){ r=r.concat(dig(s,rex,k,n)) });
        return r;
      }
      if( n<k.length ) {
        if( t!='object' ) return r;
        z=k[n];
        if( !z in o && n ) z=k[n=0];
        if( z in o ) {
          var s=o[z];
          n++;
          if( n<k.length || rex ) r=r.concat(dig(s,rex,k,n));
          else r.push(s);
        }
        for( z in o )
          r=r.concat(dig(o[z],rex,k,0));
      } else if( t=='object' ) {
        for( z in o )
          r=r.concat(dig(o[z],rex,k,0));
      } else {
        if( rex.test(o.toString()) )
          r.push(o);
      }
      return r;
    }

    return {
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
      getin: function(o,k){
        return typeof(o)=='object' && typeof(k)=='string'
          ? dig(o,k.split('.'))
          : null;
      },
      grep: function(o,v,k){
        var p=k ? k.toString().split(/\.+/) : [], rex=v ? new RegExp(v,'im') : false;
        return !v && !k ? [o] : dig(o,rex,p,0);
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
              '<td class="'+css[0]+'">'+k+'</td>'+
              '<td class="'+css[1]+'">'+dump(o[k],css.slice(1))+'</td>'+
            '</tr>';
        return '<table>'+h+'</table>'; 
      }
      return '<pre'+(css && css.length ? ' class="'+css[0]+'"' : '')+'>'+tools.dump(o)+'</pre>';
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
          '<pre'+(css ? ' class="'+css+'"' : '')+'>'+
            (r.replace(/([\”\↵\s\n\r\"\(\>]|^)(https?:\/\/[^\↵\s\n\r\"\”\<)]+)/gmi, '$1<a target="_blank" href="$2">$2</a>')
              .replace(/(\W|^)@([\w_]+)/gm, '$1<a class="twittos" target="_blank" href="https://twitter.com/$2">@$2</a>')
              .replace(/([\w-_\.]+@[\w-_\.]+)/gm, '<a class="email" href="mailto:$1">$1</a>'))+
          '</pre>'
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
    var $input, $prompt, $cmd, buf='', cursor=0, select, history, clipboard, skeys, ckeys, askcb=false;

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
      var clip=false;
      return {
        copy: function(){
          clip=select.get();
        },
        paste: function(){
          if(clip!==false && clip.length) {
            buf=buf.substr(0,cursor)+clip+buf.substr(cursor);
            show(cursor+clip.length);
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
        var cmd=buf;
        select.unset();
        $cmd.html(tools.encode(buf)); //remove input.cursor
        output.out($input.html()); //output command
        $prompt.empty(); //remove prompt
        input.clear(); //remove command
        if( askcb ) askcb(cmd);
        else core.exec(cmd); 
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
        select.unset();
        core.signal(SIG.INT);
      },
      76: /*CTRL+L*/ function(){
        output.clear();
      }
    };

    return {
      history: history,
      select: select,

      build: function(){
        history.load();
        return $input=$('<div class="input"></div>')
          .append( $prompt=$('<span class="prompt"></span>') )
          .append( $cmd=$('<span class="cmd"></span>') );
      },

      skeystroke: function(e){
        var c=e.which, keys=e.ctrlKey ? ckeys : skeys;
        if( keys[c] ) {
          e.preventDefault();
          keys[c](e);
          core.scroll();
          return false;
        }
        //console.log('skey',c);
        return true;
      },

      keystroke: function(e){
        var c=e.which;
        if( !e.ctrlKey && c>31 && c<255 ) { //REGULAR CHAR
          e.preventDefault();
          select.del();
          buf=buf.substr(0,cursor)+String.fromCharCode(c)+buf.substr(cursor);
          show(cursor+1);
          core.scroll();
          return false;
        }
        //console.log('key',c);
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
      return Object.keys(formats).filter(function(f){ return typeof(f)=='object' });
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
      help: 'extract keys from an object',
      syntax: 'cut [key1[.key2[.key3...]] [object]]',
      args: ['.+'],
      bin: function(opt,last){
        var
          k=(opt.args.shift() || '').toString().split(/\.+/),
          o=opt.args.shift() || last,
          p=$.Deferred(),
          r;
        if( typeof(o)!='object' ) 
          p.reject('invalid object');
        if( $.isArray(o) ) {
          r=[];
          o.forEach(function(l){
            var rs={};
            k.forEach(function(_){ rs[_]=(_ in l ? l[_] : null) });
            r.push(rs);
          });
          p.resolve(r);
        } else {
          var r={};
          k.forEach(function(_){ r[_]=(_ in o ? o[_] : null) });
          p.resolve(r);
        }
        return p;
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
          fmt=formats[opt.options.fmt || formats.default],
          file=opt.options.file || 'export.'+fmt, 
          o=opt.args.length ? tools.eval(opt.args.shift()) : last,
          p=$.Deferred();
        if( fmt ) {
          core.save(file, fmt.write(o), fmt.mime);
          p.resolve();
        } else
          p.reject('unknown format. (available: '+formats.list().join(',')+')');
        return p;
      }
    },

    foreach: {
      help: 'loop on an array',
      syntax: 'foreach [key [object]]',
      bin: function(opt){
        var 
          k=opt.args.length>1 ? opt.args.shift() : false, 
          o=opt.args.shift(),
          p=$.Deferred();
        if( k ) o=tools.getin(o,k);
        if( o ) p.resolve($.isArray(o) ? o : [o]);
        else    p.reject('value not found');
        return p;
      }
    },

    grep: {
      help: 'search in an object, array, string',
      syntax: 'grep [-k=key1[.key2[...]]] [value [object]]',
      bin: function(opt,last){
        var v=opt.args.shift(), o=opt.args.shift() || last, k=opt.options.k, p=$.Deferred();
        return p.resolve(v || k ? tools.grep(o,v,k) : o);
      }
    },

    help: {
      help: 'launch a nuclear attack',
      syntax: 'man [-c] [-l] [filter]',
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
              if(cmd.help) h.purpose=cmd.help;
              if(cmd.options) h.options=cmd.options;
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

    set: {
      help: 'get/set a variable',
      syntax: 'set [var [-d] [value]]',
      options: { '-d': 'delete variable' },
      bin: function(opt){
        var k=opt.args.shift(), l=[], v;
        if( k ) {
          if( opt.options.d ) {
            delete vars[k];
            core.store('vars',vars);
          } else {
            if( /^[a-z0-9_]+$/i.test(k) ) {
              v=opt.args.shift();
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

    uniq: {
      help: 'deduplicate array entry',
      syntax: 'uniq [-c] [array]',
      options: { '-c': 'count' },
      bin: function(opt,last){
        var 
          o=opt.args.shift() || last,
          p=$.Deferred();
        if( $.isArray(o) ) {
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
        } else
          p.resolve(o);
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
    var $term, $file, started=0, alias, uploadcb;

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
          console.log(txt);
          if( uploadcb ) uploadcb(txt);
        };
        console.log('read',file);
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
          args: l
            .filter(function(a){ return a[0]!='-' })
            .map(function(a){ return tools.eval(a) }),
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
          return core.exec(a, {chain:true});
        } else if( opt && opt.cmd ) {
          if( !ctx.chain ) input.history.push(cmd);
          $term.addClass('run');
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
              if( opt.options.help || opt.options['?'] ) {
                //hack for --help
                opt.args.unshift(c);
                p=commands.help.bin(opt);
              } else if( badargs(opt,c) )
                p=$.Deferred().reject('invalid or missing arguments');
              else if( c.alias ) {
                //hack for alias
                cmd=unparse(typeof(c.alias)=='function' ? c.alias(opt) : c.alias, opt);
                return core.exec(cmd, {chain:true});
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
          p.done(function(out,css){
            console.log(opt.raw,out);
            vars._=out;
            if( opt.then )
              core.exec(opt.then, {chain:true});
            else {
              if( out!==undefined ) output.echo(out,css);
              $term.removeClass('run');
              input.prompt();
            }
          }).fail(function(e){
            if( e!==undefined ) output.echo(typeof(e)=='object' && 'statusText' in e ? e.statusText : e,'error');
            $term.removeClass('run');
            input.prompt();
          });
        } else
          input.prompt();
      },

      open: function(){
        $(cfg.parent).append($term);
        $term.focus();
        input.prompt();
      },

      close: function(){
        input.unprompt();
        $term.detach();
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
    cfg: cfg,
    vars: vars,
    tools: tools,
    input: input,
    output: output,
    history: history,
    init: function(o){
      core.build();
      cfg=$.extend(true,cfg,o.cfg);
      commands=$.extend(true,commands,o.commands);
      formats=$.extend(true,formats,o.formats);
      vars=$.extend(DFTVARS,core.store('vars'),o.vars);
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

})();