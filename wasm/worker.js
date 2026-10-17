/* Instantiate from this directory; build output must remain in ./build/. */
importScripts('build/praat-spectrogram.js');
const ready=PraatSpectrogram({locateFile:name=>new URL('build/'+name,self.location.href).href});
self.onmessage=async({data})=>{
 const {id,pcm,sampleRate,windowSeconds=.025,maximumFrequency=3500,timeStep=.005,frequencyStep=20}=data;
 let module,pointer=0;
 try{
  if(!(pcm instanceof Float32Array)||pcm.length<2)throw new Error('pcm must be a Float32Array with at least two samples');
  module=await ready;
  pointer=module._malloc(pcm.byteLength);if(!pointer)throw new Error('Unable to allocate input memory');
  module.HEAPF32.set(pcm,pointer>>>2);
  if(module._sg_analyse(pointer,pcm.length,sampleRate,windowSeconds,maximumFrequency,timeStep,frequencyStep)!==0)throw new Error(module.UTF8ToString(module._sg_error()));
  const frames=module._sg_frames(),bins=module._sg_bins(),base=module._sg_data()>>>2;
  const power=module.HEAPF32.slice(base,base+frames*bins);
  self.postMessage({id,frames,bins,firstTime:module._sg_first_time(),timeStep:module._sg_time_step(),firstFrequency:module._sg_first_frequency(),frequencyStep:module._sg_frequency_step(),power},[power.buffer]);
 }catch(error){self.postMessage({id,error:error.message})}
 finally{if(pointer)module._free(pointer)}
};
