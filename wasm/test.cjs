// Run after python3 wasm/build.py. Exercises the real WASM analysis.
const assert=require('node:assert/strict');
const create=require('./build/praat-spectrogram.js');
(async()=>{
 const m=await create();const rate=44100,n=rate;
 const ptr=m._malloc(n*4);assert(ptr);
 try{
  for(let i=0;i<n;i++)m.HEAPF32[(ptr>>>2)+i]=.2*Math.sin(2*Math.PI*1000*i/rate);
  const status=m._sg_analyse(ptr,n,rate,.025,3500,.005,20);
  assert.equal(status,0,m.UTF8ToString(m._sg_error()));
  assert.equal(m._sg_frames(),191);assert.equal(m._sg_bins(),325);
  const count=m._sg_frames()*m._sg_bins();const values=m.HEAPF32.slice(m._sg_data()>>>2,(m._sg_data()>>>2)+count);
  let peak=0;for(let i=1;i<m._sg_bins();i++)if(values[i]>values[peak])peak=i;
  const peakHz=m._sg_first_frequency()+peak*m._sg_frequency_step();assert(Math.abs(peakHz-1000)<12);
  assert(values.every(Number.isFinite));assert(values.every(x=>x>=0));
  console.log(JSON.stringify({frames:m._sg_frames(),bins:m._sg_bins(),timeStep:m._sg_time_step(),frequencyStep:m._sg_frequency_step(),peakHz}));
  m.HEAPF32.fill(0,ptr>>>2,(ptr>>>2)+n);
  assert.equal(m._sg_analyse(ptr,n,rate,.025,3500,.005,20),0);
  const silence=m.HEAPF32.slice(m._sg_data()>>>2,(m._sg_data()>>>2)+count);assert(silence.every(x=>x===0));
  assert.equal(m._sg_analyse(ptr,n,0,.025,3500,.005,20),-1);
  assert(m.UTF8ToString(m._sg_error()).length>0);
  assert.equal(m._sg_analyse(ptr,2,rate,.025,3500,.005,20),-1);
  console.log('PASS: real WASM tone, silence, invalid parameters and short-buffer error');
 }finally{m._free(ptr)}
})().catch(e=>{console.error(e);process.exitCode=1});
