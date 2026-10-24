uniform float uTime;
uniform vec3 uSun;
uniform vec3 fogColor;
uniform float fogDensity;
varying vec3 vW;
varying vec2 vU;
varying float vWave;
varying float vDepth;
${Zu}
void main(){
  vec2 flow=vec2(vW.x*.42,vW.z*.27+uTime*3.3);
  float large=ns(vec3(flow*.72,1.));
  float small=ns(vec3(flow*3.4,uTime*.09));
  float grain=ns(vec3(flow*11.,2.));
  float rough=.3+max(0.,sin(vU.y*.034))*.45;
  vec3 normal=normalize(vec3(
    sin(flow.y*3.3+flow.x*2.+large*5.)*.15+cos(flow.x*5.-uTime)*.07,
    1.,cos(flow.x*3.+flow.y*4.+small*6.)*.19));
  vec3 eye=normalize(cameraPosition-vW);
  float fresnel=pow(1.-max(dot(eye,normal),0.),3.5);
  vec3 deep=vec3(.025,.14,.135),shallow=vec3(.075,.31,.265);
  vec3 col=mix(deep,shallow,large*.8);
  vec3 reflected=mix(vec3(.08,.18,.135),fogColor*.68,smoothstep(.08,.8,reflect(-eye,normal).y));
  col=mix(col,reflected,fresnel*.73);
  float crest=sin(vW.z*1.2+uTime*11.+large*5.);
  float foam=smoothstep(.78,.96,large*.56+small*.3+grain*.14+crest*.10+rough*.11);
  float edge=smoothstep(.85,1.,abs(vU.x-.5)*2.);
  foam=max(foam,edge*smoothstep(.38,.8,small)*.72);
  float sparkle=pow(max(0.,dot(reflect(-uSun,normal),eye)),170.);
  col+=vec3(1.,.94,.8)*sparkle*.35;
  col=mix(col,vec3(.7,.83,.78),foam*.88);
  float fog=1.-exp(-fogDensity*fogDensity*vDepth*vDepth);
  gl_FragColor=vec4(mix(col,fogColor,min(.94,fog)),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
