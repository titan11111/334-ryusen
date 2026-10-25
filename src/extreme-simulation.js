// RYUSEN EXTREME. Pure simulation; embedded by tools/update_extreme.py.
// Distances and speed are game units, not measured white-water speeds.
function kh(n, e, input, rocks) {
  if (n.phase !== 'playing') return [];
  const events = [], previous = n.s, craft = At(n.vesselId);
  const touring = n.mode === 'scenic', multiplier = touring ? 1 : 3.25;
  n.time += e;
  for (const key of ['immunity', 'captionT', 'landing', 'reaction'])
    n[key] = Math.max(0, (n[key] || 0) - e);
  n.shake *= Math.exp(-e * 5);
  if (n.stamina <= 2) n.exhausted = true;
  if (n.stamina >= 28) n.exhausted = false;
  const active = !n.exhausted && n.stamina > 2;
  n.braking = !!input.brake && active;
  n.bracing = !!input.brace && active && !n.braking;
  if (n.brakeImpulse) {if (n.braking) n.speed *= .88; n.brakeImpulse=false;}
  n.stamina = _f(n.stamina + e * (n.bracing ? -11 : n.braking ? -17 : n.race ? 8 : 15), 0, 100);
  const flow = un(n.s, n.offset, n.time, n.flowSeed || 0);
  n.flowLateral = flow.lateral;
  n.waveImpact = Math.max(0, Math.sin(n.s * Math.PI * 2 / flow.period));
  const technique = n.race ? xf(n, e, {...input, stroke:input.stroke && !n.bracing && !n.braking}, flow, events) : 0;
  // Narrowing and slope accelerate the boat; bends push it toward the outer bank.
  const narrowing = Math.max(0, (rt(n.s - 18) - rt(n.s + 18)) / 10);
  const slope = Math.min(1.8, bf(n.s));
  const bend = (Fv(n.s + 9) - Fv(n.s - 9)) * n.speed * .5;
  const target = (n.race ? Math.max(8, flow.speed - 1.5 + technique + ga(n.s) * 3)
    : (touring ? 9 : 12.4) + er(n.s) * (touring ? 3.4 : 7)) * multiplier
    * Math.pow(craft.speed, .18) * (n.speedScale || 1) + (n.wakeBoost || 0)
    + (touring ? 0 : narrowing * 9 + slope * 6);
  const desired = n.braking ? Math.max(9, target * .35) : target;
  n.speed += (desired - n.speed) * Math.min(1, e * (n.braking ? 4.8 : 1.7));
  if (flow.wave > .75 && n.waveImpact > .94 && n.time-(n.lastWave || -10)>1.5) {
    n.lastWave=n.time; n.reaction=Math.max(n.reaction,.4);
    if(n.bracing){n.surfCount=(n.surfCount||0)+1;n.surge=Math.min(7,(n.surge||0)+1.2);}
    else {n.speed*=.93;n.shake=Math.max(n.shake,.3);}
    events.push({type:'wave',braced:n.bracing});
  }
  const control = (n.bracing ? .38 : n.braking ? 1.5 : 1) * (touring ? 1 : 2.1);
  n.vx += (input.x * 13.5 * craft.turn * control
    + (flow.lateral * (touring ? 1 : 1.5) - bend) / craft.stability - n.vx * 3.1) * e;
  n.offset += n.vx * e;
  n.s += n.speed * e;
  const half = Math.max(1, rt(n.s) * .5 - craft.radius - .97);
  if (Math.abs(n.offset) > half) {
    const impact = Math.abs(n.vx);
    n.offset = Math.sign(n.offset) * half; n.vx *= -.25;
    if (n.immunity <= 0) damage(9 + impact * 1.4, 'bank');
  }
  // Swept collision: fast boats cannot tunnel through rocks between simulation steps.
  for (const rock of rocks) {
    if (rock.s > n.s + 160) break;
    const dx = rock.offset - n.offset, ds = rock.s - n.s;
    const crossed = rock.s >= previous - rock.r - craft.halfHit
      && rock.s <= n.s + rock.r + craft.halfHit;
    if (crossed && Math.abs(dx) < rock.r + craft.radius && n.immunity <= 0) {
      rock.hit = true; n.vx += Math.sign(-dx || 1) * 5;
      damage(16 + n.speed * .65, 'rock');
    }
    if (!rock.passed && ds < -rock.r - craft.halfHit) {
      rock.passed = true;
      if (!rock.hit && Math.abs(dx) < rock.r + craft.radius + 2) {
        n.near++; events.push({type:'near'});
      }
    }
  }
  for (const fall of Ln) {
    if (previous < fall.start && n.s >= fall.start) {
      n.activeDrop = fall.id; n.lastFall = fall.start;
      events.push({type:'fall', drop:fall});
    }
    if (previous < fall.end && n.s >= fall.end && !n.landedDrops.includes(fall.id)) {
      n.landedDrops.push(fall.id); n.activeDrop = -1; n.landing = n.reaction = 1;
      n.shake = Math.max(n.shake, fall.height / 15);
      if (n.bracing) {
        n.surge = Math.min(7, (n.surge || 0) + 2); n.safeDrops = (n.safeDrops || 0) + 1;
      } else if (!touring) damage(fall.height * 3 + n.speed * .28, 'fall');
      events.push({type:'landing', drop:fall, braced:n.bracing});
    }
  }
  // A sustained boil may capsize an unbraced craft. Escape direction is visible in HUD.
  const trapped = (flow.vortex?.influence || 0) > .67 && !n.bracing;
  n.capsize = _f((n.capsize || 0) + e * (trapped ? .9 / craft.stability : -1.5));
  if (!touring && n.capsize >= 1 && n.immunity <= 0) {damage(110, 'vortex'); n.capsize = 0;}
  if (n.pax) for (const person of n.pax) if (person.st === 1) {
    person.t += e;
    const water = un(person.s, person.o, n.time, n.flowSeed || 0);
    person.sp += ((water.speed || 19) * multiplier * .78 - person.sp) * Math.min(1, e * 1.3);
    person.s += person.sp * e; person.o += (water.lateral || 0) * .4 * e;
    const width = rt(person.s) * .5 - 1.1;
    person.o = _f(person.o, -width, width);
    const gap = person.s - n.s;
    if (person.t > .55 && Math.abs(gap) < 5 && Math.abs(person.o - n.offset) < 3.6) {
      person.st = 0; n.passengers++; n.rescued++; events.push({type:'rescue'});
    } else if (Math.abs(gap) > 125) {person.st = 2; n.lostPax++; events.push({type:'teamPickup'});}
  }
  n.danger = RRforecast(n, rocks);
  if (n.hp <= 0 || (n.passengers === 0 && !n.pax?.some(q => q.st === 1))) {
    n.phase = 'lost'; events.push({type:'lost'});
  } else if (n.s >= n.finishS) {
    n.s = n.finishS; n.finishTime = n.time; n.phase = 'won';
    n.pax?.forEach(q => {if (q.st === 1) {q.st = 2; n.lostPax++;}});
    events.push({type:'won'});
  }
  return events;
  function damage(base, source) {
    const amount = base * (touring ? .28 : 1) * (n.bracing ? .27 : 1) * craft.damage;
    n.hp = Math.max(0, n.hp - amount); n.hits++; n.reaction = 1;
    n.shake = Math.min(1.6, amount / 20); n.immunity = .65;
    n.lastDamage = source; n.speed *= n.bracing ? .88 : .57;
    n.surge = 0; n.combo = 0; n.recovery = n.bracing ? .3 : 1.2;
    let lost = 0;
    if (!touring && !n.bracing && amount > 28 && n.totalPassengers > 1) {
      const person = n.pax?.find(q => q.st === 0);
      if (person) {Object.assign(person,{st:1,s:n.s-2,o:n.offset+(person.id%2?1:-1)*2.3,t:0,sp:n.speed*.85}); n.passengers--; lost=1;}
    }
    events.push({type:'impact',damage:amount,lost,source});
  }
}

function RRforecast(state, rocks) {
  const speed = Math.max(1, state.speed), horizon = Math.max(65, speed * 2.8);
  let best = null;
  for (const fall of Ln) {
    const distance = fall.end - state.s;
    if (distance > 0 && distance < horizon) {
      best = {kind:'fall', seconds:distance/speed, distance, name:fall.name, height:fall.height, action:'踏ん張る', offset:state.offset}; break;
    }
  }
  for (const rock of rocks) {
    const distance = rock.s - state.s - rock.r - At(state.vesselId).halfHit;
    if (distance < 0 || distance > horizon) continue;
    if (Math.abs(rock.offset-state.offset) > rock.r+At(state.vesselId).radius+1) continue;
    if (!best || distance < best.distance) best = {kind:'rock',seconds:distance/speed,distance,name:'衝突コース',action:rock.offset>=state.offset?'← 左へ回避':'右へ回避 →',offset:rock.offset};
  }
  return best;
}
