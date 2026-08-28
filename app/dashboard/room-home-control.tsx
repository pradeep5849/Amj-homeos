"use client";

import {useCallback,useEffect,useMemo,useRef,useState} from "react";

type Room={id:string;name:string};
type ChannelDevice={id:string;state:Record<string,unknown>;capabilities:string[]};
type Channel={id:string;position:number;controlType:string;label:string;capabilities:string[];device:ChannelDevice|null};
type Board={id:string;roomId:string;name:string;moduleSize:string;configurationCode:string;configurationLabel:string;isOnline:boolean;channels:Channel[]};
type Device={id:string;roomId:string|null;name:string;deviceType:string;capabilities:string[];state:Record<string,unknown>;isOnline:boolean;healthStatus:string};
type WeightedControl={channel:Channel;label:string;weight:number};

type Props={homeId:string;homeName:string;rooms:Room[];onLinkedDeviceIds?:(ids:string[])=>void};

const SWITCH_ROW_MAX_WEIGHT=8;
const SWITCH_ROW_MAX_SWITCHES=6;

function countFrom(label:string,kind:string){const m=label.match(new RegExp(`(\\d+)\\s*${kind}`,"i"));return m?Number(m[1]):0}
function displayChannels(board:Board){
 const label=board.configurationLabel||"";
 const statedSwitches=countFrom(label,"Switch"),statedFans=countFrom(label,"Fan"),statedSockets=countFrom(label,"Socket");
 const switches=board.channels.filter(c=>c.controlType==="SWITCH");
 const fans=board.channels.filter(c=>c.controlType==="FAN");
 const sockets=board.channels.filter(c=>c.controlType==="SOCKET");
 const others=board.channels.filter(c=>!(["SWITCH","FAN","SOCKET"] as string[]).includes(c.controlType));
 if(!statedSwitches&&!statedFans&&!statedSockets)return [...board.channels].sort((a,b)=>a.position-b.position);
 const normalSwitches=Math.max(0,statedSwitches-statedSockets);
 return [...switches.slice(0,normalSwitches),...sockets.slice(0,statedSockets),...fans.slice(0,statedFans),...others].sort((a,b)=>a.position-b.position);
}
function weight(type:string){return type==="FAN"?3:type==="SOCKET"?2:1}
function labelsFor(channels:Channel[]){let sw=0,fan=0,socket=0,other=0;return channels.map(ch=>{if(ch.controlType==="FAN")return `FAN ${++fan}`;if(ch.controlType==="SOCKET")return `SKT ${++socket}`;if(ch.controlType==="SWITCH")return `SW ${++sw}`;if(ch.controlType==="HEAVY_SWITCH")return `HSW ${++other}`;if(ch.controlType==="DOORBELL")return "BELL";return `${ch.controlType.replaceAll("_"," ")} ${++other}`})}
function icon(type:string){if(type==="FAN")return "✣";if(type==="SOCKET")return "▣";if(type==="DOORBELL")return "◌";if(type==="HEAVY_SWITCH")return "▰";return "◉"}
function powerCap(ch:Channel){return (ch.device?.capabilities??ch.capabilities).includes("power")}
function speedCap(ch:Channel){return (ch.device?.capabilities??ch.capabilities).includes("speed")}

function layoutRows(board:Board){
 const channels=displayChannels(board),labels=labelsFor(channels);
 const entries=channels.map((channel,i):WeightedControl=>({channel,label:labels[i],weight:weight(channel.controlType)}));
 const switches=entries.filter(x=>x.channel.controlType!=="FAN"&&x.channel.controlType!=="SOCKET");
 const fans=entries.filter(x=>x.channel.controlType==="FAN");
 const sockets=entries.filter(x=>x.channel.controlType==="SOCKET");
 const rows:WeightedControl[][]=[];
 for(let i=0;i<switches.length;i+=SWITCH_ROW_MAX_SWITCHES)rows.push(switches.slice(i,i+SWITCH_ROW_MAX_SWITCHES));
 if(!rows.length&&sockets.length===0&&fans.length===0)return [entries];
 const last=rows.at(-1);
 if(last&&sockets.length){let used=last.reduce((n,x)=>n+x.weight,0);while(sockets.length&&used+sockets[0].weight<=SWITCH_ROW_MAX_WEIGHT){const item=sockets.shift()!;last.push(item);used+=item.weight}}
 if(fans.length||sockets.length)rows.push([...fans,...sockets]);
 return rows.filter(Boolean);
}

export function RoomHomeControl({homeId,homeName,rooms,onLinkedDeviceIds}:Props){
 const[boards,setBoards]=useState<Board[]>([]),[devices,setDevices]=useState<Device[]>([]),[notice,setNotice]=useState(""),[selectedRoomId,setSelectedRoomId]=useState<string>(rooms[0]?.id??"");
 const touchX=useRef<number|null>(null);
 const load=useCallback(async()=>{try{const[b,d]=await Promise.all([fetch(`/api/v1/homes/${homeId}/switchboards`),fetch(`/api/v1/homes/${homeId}/devices`)]);if(!b.ok||!d.ok)throw new Error();const bs=(await b.json()).switchboards as Board[],ds=(await d.json()).devices as Device[];setBoards(bs);setDevices(ds);onLinkedDeviceIds?.(bs.flatMap(x=>x.channels.flatMap(ch=>ch.device?[ch.device.id]:[])));setNotice("")}catch{setNotice("Unable to load Home controls right now.")}},[homeId,onLinkedDeviceIds]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{const saved=localStorage.getItem(`ruvexa:room:${homeId}`);const next=rooms.find(r=>r.id===saved)?.id??rooms[0]?.id??"";setSelectedRoomId(next)},[homeId,rooms]);
 useEffect(()=>{if(selectedRoomId)localStorage.setItem(`ruvexa:room:${homeId}`,selectedRoomId)},[homeId,selectedRoomId]);
 const linked=useMemo(()=>new Set(boards.flatMap(b=>b.channels.flatMap(ch=>ch.device?[ch.device.id]:[]))),[boards]);
 const selectedIndex=Math.max(0,rooms.findIndex(r=>r.id===selectedRoomId));
 const selectedRoom=rooms[selectedIndex]??rooms[0];
 const roomBoards=selectedRoom?boards.filter(b=>b.roomId===selectedRoom.id):[];
 const otherDevices=selectedRoom?devices.filter(d=>d.roomId===selectedRoom.id&&!linked.has(d.id)):[];
 async function deviceCommand(deviceId:string,command:"setPower"|"setSpeed"|"setBrightness",value:boolean|number){const r=await fetch(`/api/v1/devices/${deviceId}/commands`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({command,value})});if(!r.ok){setNotice("Unable to control this device right now.");return false}await load();return true}
 async function channelCommand(ch:Channel,command:"setPower"|"setSpeed",value:boolean|number){if(!ch.device)return;await deviceCommand(ch.device.id,command,value)}
 async function master(board:Board){const powerChannels=displayChannels(board).filter(ch=>ch.device&&powerCap(ch));if(!powerChannels.length)return;const allOn=powerChannels.every(ch=>ch.device?.state.power===true),value=!allOn;const results=await Promise.all(powerChannels.map(ch=>fetch(`/api/v1/devices/${ch.device!.id}/commands`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({command:"setPower",value})})));if(results.some(r=>!r.ok)){setNotice("Some controls on this switchboard could not be changed.");}await load()}
 function move(delta:number){if(!rooms.length)return;const next=Math.min(rooms.length-1,Math.max(0,selectedIndex+delta));if(next!==selectedIndex)setSelectedRoomId(rooms[next].id)}
 function controlTile(item:WeightedControl){const ch=item.channel,on=ch.device?.state.power===true,speed=Math.max(0,Math.min(4,Math.ceil(Number(ch.device?.state.speed??0)/2.5))),fan=ch.controlType==="FAN";return <div className={`rv-3d-control ${fan?"fan":""} ${ch.controlType==="SOCKET"?"socket":""} ${on?"is-on":"is-off"}`} key={ch.id} style={{flexGrow:item.weight,flexBasis:0}}><span className="rv-control-icon">{icon(ch.controlType)}</span><strong>{item.label}</strong>{powerCap(ch)&&<button type="button" className="rv-rocker" aria-pressed={on} aria-label={`${item.label} ${on?"on":"off"}`} onClick={()=>void channelCommand(ch,"setPower",!on)}><span/></button>}{fan&&speedCap(ch)&&<div className="rv-fan-dots" aria-label={`${item.label} speed`}>{[1,2,3,4].map((level,i)=><button type="button" key={level} className={on&&level<=speed?"active":""} aria-label={`Set ${item.label} speed ${level}`} onClick={()=>void channelCommand(ch,"setSpeed",[2,5,8,10][i])}/>)}</div>}</div>}
 function extraControl(d:Device){const on=d.state.power===true;return <article className="rv-extra-row" key={d.id}><div><span className="rv-extra-icon">{d.deviceType==="FAN"?"✣":d.deviceType==="SENSOR"?"◌":d.deviceType.includes("CURTAIN")?"▥":"◉"}</span><span><strong>{d.name}</strong><small>{d.isOnline?"Online":d.healthStatus?.toLowerCase()||"Status unavailable"}</small></span></div>{d.capabilities.includes("power")?<button type="button" className={`rv-extra-toggle ${on?"on":""}`} aria-pressed={on} onClick={()=>void deviceCommand(d.id,"setPower",!on)}><span/>{on?"ON":"OFF"}</button>:<span className="rv-extra-status">{d.deviceType==="SENSOR"?"STATUS":"VIEW"}</span>}</article>}
 if(!rooms.length)return <section className="rv-home-empty"><h3>No rooms yet</h3><p>Add a room to start arranging your Ruvexa controls.</p></section>;
 return <section className="rv-room-home" onTouchStart={e=>{touchX.current=e.touches[0]?.clientX??null}} onTouchEnd={e=>{if(touchX.current==null)return;const dx=(e.changedTouches[0]?.clientX??touchX.current)-touchX.current;touchX.current=null;if(Math.abs(dx)<55)return;move(dx<0?1:-1)}}>
   <header className="rv-home-heading"><div><span>MY HOME</span><strong>{homeName}</strong></div><small>Swipe left / right to change room</small></header>
   <nav className="rv-room-tabs" aria-label="Home rooms">{rooms.map(r=><button key={r.id} type="button" className={r.id===selectedRoom?.id?"active":""} onClick={()=>setSelectedRoomId(r.id)}>{r.name}</button>)}</nav>
   <div className="rv-room-title"><button type="button" disabled={selectedIndex===0} onClick={()=>move(-1)} aria-label="Previous room">‹</button><h2>{selectedRoom?.name}</h2><button type="button" disabled={selectedIndex===rooms.length-1} onClick={()=>move(1)} aria-label="Next room">›</button></div>
   <div className="rv-board-stack">{roomBoards.map(board=>{const powerChannels=displayChannels(board).filter(ch=>ch.device&&powerCap(ch)),allOn=powerChannels.length>0&&powerChannels.every(ch=>ch.device?.state.power===true);return <article className="rv-board" key={board.id}><header><div><strong>{board.name}</strong><small>{board.moduleSize} · {board.isOnline?"ONLINE":"OFFLINE"}</small></div><button type="button" className={`rv-master ${allOn?"on":""}`} aria-pressed={allOn} disabled={!powerChannels.length} onClick={()=>void master(board)}><span/><b>{allOn?"ON":"OFF"}</b></button></header><div className="rv-board-rows">{layoutRows(board).map((row,i)=><div className="rv-control-row" key={i}>{row.map(controlTile)}</div>)}</div></article>})}{roomBoards.length===0&&<div className="rv-no-boards">No switchboards installed in this room.</div>}</div>
   {otherDevices.length>0&&<section className="rv-other-devices"><h3>Other Devices</h3><div>{otherDevices.map(extraControl)}</div></section>}
   {notice&&<div className="toast error" role="alert">{notice}</div>}
 </section>
}
