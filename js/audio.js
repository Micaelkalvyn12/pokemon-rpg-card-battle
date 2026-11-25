// Sintetizador original: trilha ambiente e efeitos de interface/batalha.
// Nenhum áudio protegido ou faixa de terceiros é incorporado ao projeto.
class GameAudio {
  constructor(){
    this.context=null;
    this.master=null;
    this.musicBus=null;
    this.sfxBus=null;
    this.enabled=true;
    this.scene='home';
    this.timer=null;
    this.note=0;
    this.lastHover=0;
  }

  async unlock(){
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return false;
    if(!this.context){
      this.context=new AudioContextClass();
      this.master=this.context.createGain();
      this.musicBus=this.context.createGain();
      this.sfxBus=this.context.createGain();
      this.master.gain.value=this.enabled?0.78:0;
      this.musicBus.gain.value=0.32;
      this.sfxBus.gain.value=0.82;
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.context.destination);
      this.startMusic();
    }
    if(this.context.state==='suspended')await this.context.resume();
    return true;
  }

  setScene(scene){
    const next=scene==='battle'?'battle':'home';
    if(this.scene===next)return;
    this.scene=next;
    this.note=0;
    if(this.context)this.startMusic();
  }

  toggle(){
    this.enabled=!this.enabled;
    if(this.master && this.context){
      const now=this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(this.enabled?0.78:0,now,0.08);
    }
    if(this.enabled)this.unlock();
    return this.enabled;
  }

  startMusic(){
    if(this.timer)clearInterval(this.timer);
    // Melodia original em escala pentatônica, alternando clima de menu e arena.
    this.timer=setInterval(()=>{
      if(!this.enabled||!this.context||this.context.state!=='running')return;
      const home=[523.25,659.25,783.99,659.25,587.33,783.99,880,783.99];
      const battle=[392,493.88,587.33,493.88,440,587.33,659.25,587.33];
      const seq=this.scene==='battle'?battle:home;
      const freq=seq[this.note%seq.length];
      this.note++;
      this.tone(freq,this.scene==='battle'?0.34:0.48,'triangle',0.075,this.musicBus,1.015);
      if(this.note%4===0){
        const bass=this.scene==='battle'?[98,110,130.81,110]:[130.81,146.83,164.81,146.83];
        this.tone(bass[(this.note/4|0)%4],0.72,'sine',0.035,this.musicBus,0.997);
      }
    },this.scene==='battle'?560:820);
  }

  tone(frequency,duration=0.12,wave='sine',volume=0.12,bus=this.sfxBus,slide=1){
    if(!this.context||!bus||!this.enabled)return;
    const c=this.context,now=c.currentTime;
    const osc=c.createOscillator(),gain=c.createGain(),filter=c.createBiquadFilter();
    osc.type=wave;osc.frequency.setValueAtTime(Math.max(35,frequency),now);
    if(slide!==1)osc.frequency.exponentialRampToValueAtTime(Math.max(35,frequency*slide),now+duration);
    filter.type='lowpass';filter.frequency.value=wave==='sawtooth'?1800:4200;
    gain.gain.setValueAtTime(0.0001,now);
    gain.gain.exponentialRampToValueAtTime(volume,now+0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
    osc.connect(filter);filter.connect(gain);gain.connect(bus);
    osc.start(now);osc.stop(now+duration+0.025);
  }

  noise(duration=0.16,volume=0.12,filterFreq=900){
    if(!this.context||!this.sfxBus||!this.enabled)return;
    const c=this.context,now=c.currentTime,length=Math.max(1,Math.floor(c.sampleRate*duration));
    const buffer=c.createBuffer(1,length,c.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
    const src=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    src.buffer=buffer;filter.type='lowpass';filter.frequency.value=filterFreq;
    gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
    src.connect(filter);filter.connect(gain);gain.connect(this.sfxBus);src.start(now);src.stop(now+duration);
  }

  play(kind='click'){
    if(!this.enabled)return;
    this.unlock();
    const patterns={
      hover:[[560,.045,'sine',.025]],
      click:[[440,.055,'square',.035],[660,.075,'triangle',.045]],
      select:[[523,.09,'triangle',.07],[659,.1,'triangle',.07],[784,.15,'sine',.06]],
      start:[[392,.14,'triangle',.08],[523,.15,'triangle',.085],[659,.18,'triangle',.09],[784,.36,'sine',.09]],
      heal:[[523,.12,'sine',.065],[659,.12,'sine',.07],[784,.2,'sine',.08],[1046,.24,'sine',.06]],
      status:[[440,.09,'square',.055],[330,.16,'sawtooth',.035]],
      faint:[[392,.14,'sawtooth',.055],[294,.18,'sawtooth',.05],[196,.32,'sine',.07]],
      victory:[[523,.13,'triangle',.075],[659,.13,'triangle',.075],[784,.16,'triangle',.08],[1046,.22,'triangle',.085],[1318,.42,'sine',.07]],
      attack:[[330,.09,'sawtooth',.07],[220,.14,'triangle',.07]],
      fire:[[180,.12,'sawtooth',.08,.78],[520,.18,'square',.06,.68]],
      water:[[260,.2,'sine',.08,1.8],[180,.18,'triangle',.05,.72]],
      electric:[[950,.07,'square',.075,1.25],[1450,.11,'sawtooth',.05,.55],[700,.09,'square',.06,1.4]],
      psychic:[[620,.18,'sine',.075,1.45],[880,.2,'triangle',.05,.8]],
      plant:[[420,.16,'triangle',.07,.78],[620,.18,'sine',.06,1.2]],
      ghost:[[260,.18,'sawtooth',.06,.58],[440,.2,'sine',.05,.76]],
      hit:[[110,.16,'sawtooth',.08,.62]],
      shield:[[780,.1,'triangle',.06,1.2],[1046,.17,'sine',.045,.9]],
      menu:[[659,.08,'sine',.035],[784,.1,'sine',.04]]
    };
    if(kind==='hit'){this.noise(.12,.14,750);}
    if(kind==='fire')this.noise(.16,.075,1100);
    if(kind==='water')this.noise(.2,.05,520);
    const seq=patterns[kind]||patterns.click;
    seq.forEach((n,i)=>setTimeout(()=>this.tone(n[0],n[1],n[2],n[3],this.sfxBus,n[4]||1),i*72));
  }
}

export const audio=new GameAudio();
