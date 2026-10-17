/* Minimal array-oriented adapter around Praat's GPL-3.0-or-later analysis. */
#include "Sound_and_Spectrogram.h"
#include <emscripten/emscripten.h>
#include <vector>
#include <string>
#include <cmath>
static std::vector<float> output;
static std::string error;
static double dt,df,t1,f1;
static int nt,nf;
extern "C" {
EMSCRIPTEN_KEEPALIVE int sg_analyse(const float *pcm,int length,double rate,double window,double maximum,double hop,double frequencyStep){
 output.clear();error.clear();nt=nf=0;
 try{
  MelderThread_debugMultithreading(false,1,0,false);
  if(!pcm||length<2||!std::isfinite(rate)||rate<=0||!std::isfinite(window)||window<=0||!std::isfinite(hop)||hop<=0||!std::isfinite(frequencyStep)||frequencyStep<=0||!std::isfinite(maximum)||maximum<=0){error="Invalid analysis parameters";return -1;}
  auto sound=Sound_createSimple(1,double(length)/rate,rate);
  for(integer i=1;i<=sound->nx;i++)sound->z[1][i]=pcm[i-1];
  auto result=Sound_to_Spectrogram_e(sound.get(),window,maximum,hop,frequencyStep,kSound_to_Spectrogram_windowShape::GAUSSIAN,8,8);
  nt=int(result->nx);nf=int(result->ny);dt=result->dx;df=result->dy;t1=result->x1;f1=result->y1;
  output.resize(size_t(nt)*size_t(nf));
  for(int t=0;t<nt;t++)for(int f=0;f<nf;f++)output[size_t(t)*nf+f]=float(result->z[f+1][t+1]);
  return 0;
 }catch(MelderError){error=Melder_peek32to8(Melder_getError());Melder_clearError();return -1;}
 catch(const std::exception &e){error=e.what();return -1;}
}
EMSCRIPTEN_KEEPALIVE const float *sg_data(){return output.data();}
EMSCRIPTEN_KEEPALIVE int sg_frames(){return nt;}
EMSCRIPTEN_KEEPALIVE int sg_bins(){return nf;}
EMSCRIPTEN_KEEPALIVE double sg_time_step(){return dt;}
EMSCRIPTEN_KEEPALIVE double sg_frequency_step(){return df;}
EMSCRIPTEN_KEEPALIVE double sg_first_time(){return t1;}
EMSCRIPTEN_KEEPALIVE double sg_first_frequency(){return f1;}
EMSCRIPTEN_KEEPALIVE const char *sg_error(){return error.c_str();}
}
