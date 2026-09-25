const fs=require('node:fs'),path=require('node:path');
const cache='/home/deepstack/.cache/ngin8r/compilers/23c847269e387299c715b2d125ffbb098be76f77c7c381b6c29a607ae887c173/node_modules/@hpcc-js/wasm-graphviz';
(async()=>{const {Graphviz}=await import(cache+'/dist/index.js');const g=await Graphviz.load();const dot=`digraph {rankdir=LR; node [shape=plain];
a[label=<<TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0"><TR><TD PORT="p0">id</TD></TR><TR><TD PORT="p1">tenant_id</TD></TR></TABLE>>];
b[label=<<TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0"><TR><TD PORT="p0">request_id</TD></TR><TR><TD PORT="p1">tenant_id</TD></TR></TABLE>>];
a:p0:e -> b:p0:w [id="first"];
a:p1:e -> b:p1:w [id="second"];
b:p1:e -> b:p0:e [id="self"];
}`;const json=JSON.parse(g.layout(dot,'json',undefined,{yInvert:true}));if(json.edges.length!==3)throw Error('Missing edge');const records=json.edges.map(e=>({id:e.id,tailport:e.tailport,headport:e.headport,position:e.pos}));if(records[0].position===records[1].position)throw Error('Rows collapsed');const result={packageVersion:JSON.parse(fs.readFileSync(cache+'/package.json','utf8')).version,records,scope:'Direct WASM probe: row ports, two distinct field pairs, self-loop. Does not exercise LikeC4 GraphvizParser, font metrics, drag, or saved-model conversion.'};fs.writeFileSync(path.join(__dirname,'graphviz-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));Graphviz.unload()})().catch(e=>{console.error(e);process.exit(1)});
