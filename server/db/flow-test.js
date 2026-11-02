/**
 * End-to-end API check of the escrow flow. Start the server first (npm run dev), then:
 *   npm run test:flow
 * It registers two throw-away users, so it is safe to run repeatedly.
 */
const BASE = process.env.API || 'http://localhost:5000/api';
let passed = 0;

async function call(method, path, token, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
function check(name, cond, extra = '') {
  if (!cond) { console.error(`FAIL  ${name} ${extra}`); process.exit(1); }
  passed += 1; console.log(`ok    ${name}`);
}

(async () => {
  const stamp = Date.now();
  const mk = async (n) => {
    const email = `${n}${stamp}@ves.ac.in`;
    const r = await call('POST', '/auth/register', null, { name: `Tester ${n}`, email, password: 'secret12' });
    check(`register ${n}`, r.status === 201, JSON.stringify(r.data));
    const l = await call('POST', '/auth/login', null, { email, password: 'secret12', remember: true });
    check(`login ${n}`, l.status === 200 && l.data.token);
    return l.data.token;
  };

  const bad = await call('POST', '/auth/register', null, { name: 'Gmail Guy', email: `x${stamp}@gmail.com`, password: 'secret12' });
  check('non-VES email rejected', bad.status === 400);
  const wrong = await call('POST', '/auth/login', null, { email: 'nobody@ves.ac.in', password: 'nope123' });
  check('wrong login rejected', wrong.status === 401);

  const poster = await mk('poster');
  const f1 = await mk('free1');
  const f2 = await mk('free2');

  let w = (await call('GET', '/wallet', poster)).data;
  check('poster starts with welcome coins', w.balance === 500, JSON.stringify(w));

  // Story from the brief: budget 500, bids 450 and 400, pick 400
  const g = await call('POST', '/gigs', poster, { title: 'Escrow flow gig', description: 'Testing the full escrow path', category: 'Design', budget: 500 });
  check('post gig', g.status === 201);
  const gid = g.data.gig.id;

  const own = await call('POST', `/gigs/${gid}/bids`, poster, { amount: 100 });
  check('cannot bid on own gig', own.status === 400);
  const high = await call('POST', `/gigs/${gid}/bids`, f1, { amount: 900 });
  check('bid above budget rejected', high.status === 400);
  const b1 = await call('POST', `/gigs/${gid}/bids`, f1, { amount: 450, message: 'me', deliveryDays: 3 });
  const b2 = await call('POST', `/gigs/${gid}/bids`, f2, { amount: 400, message: 'me too', deliveryDays: 2 });
  check('two bids placed', b1.status === 201 && b2.status === 201);

  const detail = (await call('GET', `/gigs/${gid}`, poster)).data.gig;
  check('poster sees both bids', detail.bids.length === 2);
  const steal = await call('POST', `/bids/${b2.data.bid.id}/accept`, f1);
  check('non-owner cannot accept', steal.status === 403);

  const acc = await call('POST', `/bids/${b2.data.bid.id}/accept`, poster);
  check('accept 400 bid', acc.status === 200 && acc.data.held === 400, JSON.stringify(acc.data));
  w = (await call('GET', '/wallet', poster)).data;
  check('poster balance 100, 400 locked', w.balance === 100 && w.lockedInEscrow === 400, JSON.stringify(w));
  const again = await call('POST', `/bids/${b1.data.bid.id}/accept`, poster);
  check('cannot accept a second bid', again.status === 409);

  const early = await call('POST', `/gigs/${gid}/confirm`, poster);
  check('cannot confirm before delivery', early.status === 409);
  const notWorker = await call('POST', `/gigs/${gid}/deliver`, f1, { note: 'not mine to deliver' });
  check('wrong freelancer cannot deliver', notWorker.status === 403);
  const del = await call('POST', `/gigs/${gid}/deliver`, f2, { note: 'Here is the first version' });
  check('deliver', del.status === 200);
  const rev = await call('POST', `/gigs/${gid}/revision`, poster, { note: 'Please change the colours' });
  check('request revision', rev.status === 200);
  const del2 = await call('POST', `/gigs/${gid}/deliver`, f2, { note: 'Colours changed, v2' });
  check('re-deliver', del2.status === 200);

  const conf = await call('POST', `/gigs/${gid}/confirm`, poster);
  check('confirm releases 400', conf.status === 200 && conf.data.released === 400, JSON.stringify(conf.data));
  const dbl = await call('POST', `/gigs/${gid}/confirm`, poster);
  check('no double release', dbl.status === 409);

  const w2 = (await call('GET', '/wallet', f2)).data;
  check('freelancer got 900 (500 bonus + 400)', w2.balance === 900 && w2.earned.today === 400, JSON.stringify(w2));
  const wp = (await call('GET', '/wallet', poster)).data;
  check('poster ends with 100, nothing locked', wp.balance === 100 && wp.lockedInEscrow === 0);

  const me = (await call('GET', '/users/me', f2)).data;
  check('freelancer XP 100 + 250 and 1 completed', me.user.xp === 350 && me.stats.gigsCompleted === 1, JSON.stringify(me));
  const pme = (await call('GET', '/users/me', poster)).data;
  check('poster XP 100 + 50 + 100 and 1 posted', pme.user.xp === 250 && pme.stats.gigsPosted === 1, JSON.stringify(pme));

  // withdrawals
  const wd0 = await call('POST', '/wallet/withdraw', f2, { amount: 100, upiId: 'bad id' });
  check('bad UPI rejected', wd0.status === 400);
  const wdBig = await call('POST', '/wallet/withdraw', f2, { amount: 99999, upiId: 'tester@okaxis' });
  check('cannot overdraw', wdBig.status === 402);
  const wd = await call('POST', '/wallet/withdraw', f2, { amount: 300, upiId: 'tester@okaxis' });
  check('withdraw 300', wd.status === 201);
  const w3 = (await call('GET', '/wallet', f2)).data;
  check('balance 600 after withdraw', w3.balance === 600 && w3.withdrawnTotal === 300);

  // topup + analytics + history
  const tu = await call('POST', '/wallet/topup', poster, { amount: 200 });
  check('top up', tu.status === 201);
  const an = (await call('GET', '/wallet/analytics', f2)).data;
  check('analytics has 14 / 8 / 6 buckets', an.day.length === 14 && an.week.length === 8 && an.month.length === 6);
  check('today bucket shows 400 earned', an.day[13].earned === 400, JSON.stringify(an.day[13]));
  const hist = (await call('GET', '/history', f2)).data;
  check('history shows the completed gig', hist.items.length === 1 && hist.items[0].amount === 400 && hist.summary.earned === 400);

  // worker leaves -> refund
  const g2 = (await call('POST', '/gigs', poster, { title: 'Refund path gig', description: 'Freelancer will back out', category: 'Other', budget: 150 })).data.gig;
  const bb = await call('POST', `/gigs/${g2.id}/bids`, f1, { amount: 120 });
  await call('POST', `/bids/${bb.data.bid.id}/accept`, poster);
  const before = (await call('GET', '/wallet', poster)).data.balance;
  const leave = await call('POST', `/gigs/${g2.id}/leave`, f1);
  check('freelancer leaves', leave.status === 200);
  const after = (await call('GET', '/wallet', poster)).data.balance;
  check('poster refunded 120', after === before + 120);
  const reopened = (await call('GET', `/gigs/${g2.id}`, poster)).data.gig;
  check('gig reopened', reopened.status === 'open');

  // insufficient funds
  const g3 = (await call('POST', '/gigs', f1, { title: 'Too expensive gig', description: 'More than the poster wallet', category: 'Other', budget: 5000 })).data.gig;
  const rb = await call('POST', `/gigs/${g3.id}/bids`, poster, { amount: 4000 });
  const poor = await call('POST', `/bids/${rb.data.bid.id}/accept`, f1);
  check('insufficient GigCoins blocked', poor.status === 402, JSON.stringify(poor.data));

  const cancel = await call('DELETE', `/gigs/${g3.id}`, f1);
  check('cancel open gig', cancel.status === 200);

  console.log(`\nAll ${passed} checks passed.`);
})().catch((e) => { console.error(e); process.exit(1); });
