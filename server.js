import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import { cases } from './data/cases.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: false } });
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.get('/health', (_req, res) => res.json({ ok:true, game:'MINDTRAP', version:'0.1.0' }));

const rooms = new Map();
const ROUND_SECONDS = { incident:120, investigation:150, interrogation:180, twist:120, judgement:150 };
const ORDER = ['incident','investigation','interrogation','twist','judgement'];
const clean = (s, max=500) => String(s ?? '').replace(/[<>]/g,'').trim().slice(0,max);
const publicPlayer = p => ({ id:p.id, name:p.name, ready:p.ready, host:p.host, connected:p.connected, roleName:p.role?.name ?? null });
function roomSnapshot(room, socketId) {
  const me = room.players.get(socketId);
  return {
    code:room.code, mode:room.mode, status:room.status, phase:room.phase,
    players:[...room.players.values()].map(publicPlayer),
    caseInfo: room.status === 'playing' ? { title:room.case.title, intro:room.case.intro, publicFacts:room.case.publicFacts, clues:room.case.clues.map(({id,title,text,status})=>({id,title,text,status})) } : null,
    myDossier: room.status === 'playing' && me?.role ? { role:me.role.name, description:me.role.description, dossier:me.role.dossier, mission:me.role.mission.text, ability:me.role.ability } : null,
    messages:room.messages.slice(-60), deadline:room.deadline,
    votes:room.status === 'finished' ? Object.fromEntries(room.votes) : undefined,
    result: room.status === 'finished' ? room.result : undefined
  };
}
function emitRoom(room) { for (const id of room.players.keys()) io.to(id).emit('state', roomSnapshot(room,id)); }
function system(room, text) { room.messages.push({type:'system', text, at:Date.now()}); }
function startTimer(room) {
  clearTimeout(room.timer);
  const seconds = ROUND_SECONDS[room.phase] ?? 120;
  room.deadline = Date.now() + seconds*1000;
  room.timer = setTimeout(() => advance(room), seconds*1000);
}
function begin(room) {
  const c = structuredClone(cases[0]);
  // Randomise role-to-seat assignment while keeping the case's truth fixed.
  const roles = [...c.roles].sort(() => Math.random() - 0.5);
  [...room.players.values()].forEach((p,i) => { p.role = roles[i]; p.ready = false; p.submitted = false; });
  room.case = c; room.status='playing'; room.phase='incident'; room.round=0; room.claims=[]; room.votes=new Map(); room.investigations=new Set();
  system(room, `CASE OPENED: ${c.title}. Your private dossier has been delivered.`);
  startTimer(room); emitRoom(room);
}
function advance(room) {
  if (room.status !== 'playing') return;
  const idx = ORDER.indexOf(room.phase);
  if (idx < ORDER.length-1) {
    room.phase = ORDER[idx+1];
    if (room.phase === 'twist') system(room, `${room.case.twist.title}: ${room.case.twist.text}`);
    if (room.phase === 'judgement') system(room, 'FINAL JUDGEMENT: Submit one suspect and a short explanation. Votes are private until the reveal.');
    else system(room, `PHASE CHANGE: ${room.phase.toUpperCase()}`);
    startTimer(room); emitRoom(room);
  } else finish(room);
}
function finish(room) {
  clearTimeout(room.timer); room.status='finished'; room.phase='results';
  const culprit = room.case.roles.find(r => r.id === room.case.culprit);
  const votedFor = [...room.votes.values()];
  const counts = new Map(); votedFor.forEach(v=>counts.set(v,(counts.get(v)||0)+1));
  const top = [...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];
  for (const p of room.players.values()) {
    p.score = (p.vote === room.case.culprit ? 100 : 0) + (p.role.id === room.case.culprit && top !== room.case.culprit ? 100 : 0);
  }
  room.result = { culprit:culprit.name, timeline:room.case.timeline, votes:Object.fromEntries(room.votes), reveal:'The Technician transferred ECHO after manually interrupting the camera system.' };
  system(room, `CASE CLOSED. The culprit was ${culprit.name}.`); emitRoom(room);
}

io.on('connection', socket => {
  socket.on('create-room', ({name,mode='auto'}={}, cb=()=>{}) => {
    const code = nanoid(6).toUpperCase();
    const room = {code,mode:mode==='host'?'host':'auto',status:'lobby',phase:'lobby',players:new Map(),messages:[],votes:new Map(),timer:null,deadline:null};
    room.players.set(socket.id,{id:socket.id,name:clean(name,24)||'Player 1',host:true,ready:false,connected:true});
    rooms.set(code,room); socket.join(code); cb({ok:true,code}); emitRoom(room);
  });
  socket.on('join-room', ({code,name}={}, cb=()=>{}) => {
    const room=rooms.get(clean(code,6).toUpperCase());
    if(!room) return cb({ok:false,error:'Room not found.'});
    if(room.status!=='lobby') return cb({ok:false,error:'This match has already started.'});
    if(room.players.size>=4) return cb({ok:false,error:'Room is full.'});
    room.players.set(socket.id,{id:socket.id,name:clean(name,24)||`Player ${room.players.size+1}`,host:false,ready:false,connected:true});
    socket.join(room.code); cb({ok:true,code:room.code}); emitRoom(room);
  });
  socket.on('ready', () => { const r=findRoom(socket.id); if(!r||r.status!=='lobby')return; r.players.get(socket.id).ready=true; emitRoom(r); if(r.players.size===4 && [...r.players.values()].every(p=>p.ready)) begin(r); });
  socket.on('start-game', () => { const r=findRoom(socket.id); if(!r||r.status!=='lobby')return; const p=r.players.get(socket.id); if(r.mode==='host'&&!p.host)return; if(r.players.size!==4)return socket.emit('error-message','Four players are required.'); begin(r); });
  socket.on('chat', ({text}={}) => { const r=findRoom(socket.id); if(!r||r.status!=='playing')return; const p=r.players.get(socket.id); const body=clean(text,500); if(!body)return; r.messages.push({type:'chat',name:p.name,text:body,at:Date.now()}); emitRoom(r); });
  socket.on('private-message', ({to,text}={}) => { const r=findRoom(socket.id); if(!r||r.status!=='playing')return; const sender=r.players.get(socket.id), recipient=r.players.get(to), body=clean(text,400); if(!recipient||!body)return; const msg={type:'private',from:sender.name,to:recipient.name,text:body,at:Date.now()}; io.to(recipient.id).emit('private-message',msg); socket.emit('private-message',{...msg,to:'you'}); });
  socket.on('claim', ({text}={}) => { const r=findRoom(socket.id); if(!r||r.status!=='playing'||!['incident','interrogation'].includes(r.phase))return; const p=r.players.get(socket.id); const body=clean(text,300); if(!body)return; r.claims.push({player:p.name,text:body,at:Date.now()}); r.messages.push({type:'claim',name:p.name,text:body,at:Date.now()}); emitRoom(r); });
  socket.on('investigate', ({clueId}={}) => { const r=findRoom(socket.id); if(!r||r.status!=='playing'||r.phase!=='investigation')return; const p=r.players.get(socket.id); const key=`${socket.id}:${clueId}`; if(r.investigations.has(key))return socket.emit('error-message','You have already investigated this clue.'); const clue=r.case.clues.find(c=>c.id===clueId); if(!clue)return; r.investigations.add(key); socket.emit('investigation-result',{title:clue.title,detail:clue.detail}); });
  socket.on('vote', ({suspect,reason}={}) => { const r=findRoom(socket.id); if(!r||r.status!=='playing'||r.phase!=='judgement')return; const p=r.players.get(socket.id); const target=[...r.players.values()].find(x=>x.name===suspect); if(!target)return; r.votes.set(p.name,suspect); p.vote=target.role.id; socket.emit('vote-locked'); if(r.votes.size===4)finish(r); else emitRoom(r); });
  socket.on('next-case', () => { const r=findRoom(socket.id); if(!r||r.status!=='finished')return; const p=r.players.get(socket.id); if(!p?.host)return; r.status='lobby'; r.phase='lobby'; r.case=null; r.votes.clear(); r.messages=[]; r.players.forEach(x=>{x.role=null;x.ready=false;x.vote=null;}); system(r,'New case lobby opened.'); emitRoom(r); });
  socket.on('disconnect',()=>{const r=findRoom(socket.id); if(!r)return; const p=r.players.get(socket.id); if(p){p.connected=false; p.name=`${p.name} (disconnected)`;} emitRoom(r);});
});
function findRoom(id){ return [...rooms.values()].find(r=>r.players.has(id)); }
httpServer.listen(PORT,()=>console.log(`MINDTRAP running on http://localhost:${PORT}`));
