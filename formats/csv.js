/*
TERM CSV FORMAT
term.js - niko
*/

(function(_){

  "use strict";

  function trim(txt){
    return txt.replace(/(^\s+|\s+$)/g,'');
  }

  function fmt(o){
    return $.isArray(o) ? o.map(fmt).join("\n") :
           o==null ? 'null' :
           typeof(o)=='object' ? Object.keys(o).map(function(k){ return k+': '+fmt(o[k]) }).join("\n") :
           typeof(o)=='string' && isNaN(o) ? '"'+o.replace(/"/g,'""')+'"' :
           o.toString();
  }

  _.csv={
    mask: '*.csv',
    mime: 'application/csv',

    read: function(csv){
      if( typeof(csv)!='string' ) return csv;
      var
        SEP=this.vars('csv_separator') || ';',
        HEADER=this.vars('csv_header') || false,
        error=function(t){ this.echo(e,'error') },
        fields,
        out=[],
        row=[],
        buf="",
        p=0, q, len;
      if( SEP=='\t' ) SEP="\t";
      //skip utf bom
      if(csv.length>1 && csv.charCodeAt(0)==0xfe && csv.charCodeAt(1)==0xff) csv=csv.subtr(2);
      len=csv.length;
      while( p<len ){
        c=csv[p++];
        //quote field
        if( c=='"' ) {
          q=p;
          while( q<len ) {
            if( csv[q]=='"' ) {
              //manage escaped double quote
              if( q+1<len && csv[q+1]=='"') q++;
              else break;
            }
            q++;
          }
          if( q==len ) return error('unbalanced quote at '+(p-1));
          buf+=csv.subtr(p,q-p);
          p=q+1;
        } else if( c==SEP ) {
          row.push(trim(buf));
        } else if( c=="\n" ) {
          row.push(buf);
          buf='';
          if( HEADER ) {
            if( !fields )
              fields=row || [];
            else {
              q={};
              row.forEach(function(c,n){ q[(n<fields.length?fields[n]:false) || 'field'+n] = c });
              out.push(q);
            }
          } else
            out.push(row);
          row=[];
        } else if( c!="\r" && c!=' ' ) {
          q=p;
          while( q<len && csv[q]!=SEP ) q++;
          if( q==len ) buf+=trim(csv.substr(p));
          else buf+=trim(csv.substr(p,q-p));
          p=q;
        }
      }
      return out;
    },

    write: function(o){
      var
        SEP=this.vars('csv_separator') || ';',
        BOM=this.vars('csv_bom') || false,
        HEADER=this.vars('csv_header') || false,
        out=BOM ? "\xfe\xff" : '',
        fields;
      if( !$.isArray(o) ) o=[o];
      if( HEADER && o.length ) {
        var h=o[0];
        if( typeof(h)=='object' )
          out+=($.isArray(h) ? h.map(function(c,n){ return 'field'+n }) : fields=Object.keys(h)).map(fmt).join(SEP);
        out+="\n";
      }
      o.forEach(function(row){
        if( $.isArray(row) )
          out+=row.map(fmt).join(SEP)+"\n";
        else if( typeof(row)=='object' ) {
          if( !fields ) fields=Object.keys(row);
          out+=fields.map(function(k){
            return k in row ? fmt(row[k]) : ''
          }).join(SEP)+"\n";
        } else
          out+=fmt(row)+"\n";
      });
      return out;
    }
  };

})(term.formats);
