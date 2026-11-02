/**
 * Demo data. Everything goes through the real services so wallets, XP and the
 * escrow ledger are perfectly consistent. Login: aarav@ves.ac.in / demo1234
 */
const { query, withTx } = require('../src/config/db');
const { createUser } = require('../src/services/userService');
const { applyTx, addXp } = require('../src/services/walletService');
const { XP_REWARDS } = require('../src/utils/levels');
const escrow = require('../src/services/escrowService');

const PASSWORD = 'demo1234';

async function mkUser(name, email, profile) {
  const u = await withTx((c) => createUser(c, { name, email, password: PASSWORD }));
  await query(
    `UPDATE users SET headline=$2, bio=$3, department=$4, year_of_study=$5, skills=$6 WHERE id=$1`,
    [u.id, profile.headline, profile.bio, profile.department, profile.year, profile.skills]
  );
  return u.id;
}

const topup = (userId, amount) =>
  withTx((c) => applyTx(c, { userId, amount, type: 'topup', label: 'Added via UPI (demo)', reference: 'UPISEED' }));

async function mkGig(posterId, g) {
  return withTx(async (c) => {
    const { rows } = await c.query(
      `INSERT INTO gigs (poster_id,title,description,category,budget,deadline)
       VALUES ($1,$2,$3,$4,$5, current_date + $6::int) RETURNING id`,
      [posterId, g.title, g.description, g.category, g.budget, g.inDays ?? 7]
    );
    await addXp(c, posterId, XP_REWARDS.postGig);
    return rows[0].id;
  });
}

async function bid(gigId, bidderId, amount, message, days) {
  const { rows } = await query(
    `INSERT INTO bids (gig_id,bidder_id,amount,message,delivery_days) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [gigId, bidderId, amount, message, days]
  );
  return rows[0].id;
}

const backdate = async (gigId, daysAgo) => {
  await query(
    `UPDATE gigs SET created_at = now() - make_interval(days => $2 + 1),
            completed_at = CASE WHEN completed_at IS NULL THEN NULL ELSE now() - make_interval(days => $2) END,
            delivered_at = CASE WHEN delivered_at IS NULL THEN NULL ELSE now() - make_interval(days => $2) END
      WHERE id=$1`,
    [gigId, daysAgo]
  );
  await query(`UPDATE transactions SET created_at = now() - make_interval(days => $2) WHERE gig_id=$1`, [gigId, daysAgo]);
};

async function runCompleted(posterId, workerId, gig, amount, daysAgo) {
  const id = await mkGig(posterId, gig);
  const bidId = await bid(id, workerId, amount, 'Happy to help, can start right away!', 3);
  await escrow.acceptBid(posterId, bidId);
  await escrow.deliver(workerId, id, 'All done. Files shared on the drive link in our chat.');
  await escrow.confirm(posterId, id);
  if (daysAgo > 0) await backdate(id, daysAgo);
  return id;
}

module.exports = async function seed() {
  const aarav = await mkUser('Aarav Sharma', 'aarav@ves.ac.in', {
    headline: 'Full-stack tinkerer · React + Node',
    bio: 'Third-year Computer Engineering student who loves shipping small web apps. Happy to help with websites, bug fixes and DSA basics.',
    department: 'Computer Engineering', year: 'Third year', skills: ['React', 'Node.js', 'PostgreSQL', 'DSA'],
  });
  const meera = await mkUser('Meera Iyer', 'meera@ves.ac.in', {
    headline: 'UI designer · Figma · branding',
    bio: 'I design posters, logos and clean app screens for college fests and clubs.',
    department: 'Information Technology', year: 'Second year', skills: ['Figma', 'Illustration', 'Branding'],
  });
  const rohan = await mkUser('Rohan Patil', 'rohan@ves.ac.in', {
    headline: 'Writer & researcher',
    bio: 'Technical writing, report editing and slide decks that actually make sense.',
    department: 'Electronics & Telecom', year: 'Final year', skills: ['Writing', 'Research', 'PowerPoint'],
  });
  const sana = await mkUser('Sana Khan', 'sana@ves.ac.in', {
    headline: 'Video editor · reels & event recaps',
    bio: 'Premiere Pro, After Effects and a good eye for pacing.',
    department: 'Computer Engineering', year: 'Second year', skills: ['Premiere Pro', 'After Effects', 'Photography'],
  });

  await topup(rohan, 300);
  await topup(meera, 500);

  // History: finished work spread across the last weeks
  await runCompleted(aarav, sana, { title: 'Logo for the college fest', description: 'Need a bold, colourful logo for our tech fest. Two concepts and final files in PNG + SVG.', category: 'Design', budget: 500 }, 400, 6);
  await runCompleted(meera, aarav, { title: 'Resume review and cleanup', description: 'Tidy up my resume layout and tighten the wording for internships.', category: 'Writing', budget: 200 }, 180, 3);
  await runCompleted(rohan, aarav, { title: 'Slide deck for project review', description: 'Turn my report into a clean 12-slide deck with a consistent theme.', category: 'Design', budget: 350 }, 300, 0);

  // Live escrow examples
  const proof = await mkGig(rohan, { title: 'Proofread my research paper', description: 'A 6-page paper needs grammar and flow fixes. Track changes please.', category: 'Writing', budget: 300, inDays: 4 });
  await escrow.acceptBid(rohan, await bid(proof, aarav, 250, 'I can finish this by tomorrow evening.', 2));

  const reel = await mkGig(sana, { title: 'Edit a 60-second hostel reel', description: 'Raw clips ready. Need cuts, music sync and subtitles.', category: 'Video & Photo', budget: 400, inDays: 5 });
  await escrow.acceptBid(sana, await bid(reel, aarav, 350, 'Done this kind of edit before, quick turnaround.', 3));
  await escrow.deliver(aarav, reel, 'Final cut uploaded: drive.example/hostel-reel-final. Subtitles included.');

  // Open gigs with competing bids (the 500 -> 450 vs 400 story)
  const page = await mkGig(meera, { title: 'Landing page in React for a club', description: 'Single landing page with sections for events, team and contact. Mobile friendly.', category: 'Development', budget: 800, inDays: 10 });
  await bid(page, aarav, 700, 'I can build this with Vite + React, clean and responsive.', 5);
  await bid(page, rohan, 650, 'I can handle the content and the page build.', 6);

  await mkGig(aarav, { title: 'DSA basics tutor (arrays and recursion)', description: 'Need two one-hour sessions to get comfortable with arrays, recursion and complexity.', category: 'Tutoring', budget: 600, inDays: 9 });
  const poster = await mkGig(meera, { title: 'Poster design for hackathon', description: 'A3 poster, bold typography, our brand colours are lilac and mint.', category: 'Design', budget: 250, inDays: 6 });
  await bid(poster, sana, 220, 'I love poster work! Two drafts included.', 2);

  const old = await mkGig(rohan, { title: 'Translate notes to Marathi', description: 'Plans changed, no longer needed.', category: 'Writing', budget: 150 });
  await escrow.cancelOpenGig(rohan, old);

  // a payout so the wallet history shows a withdrawal
  await withTx((c) => applyTx(c, { userId: sana, amount: -200, type: 'withdrawal', label: 'Withdrawn to sana@okaxis', reference: 'PAYSEED' }));
  await query(`UPDATE transactions SET created_at = now() - interval '4 days' WHERE reference='PAYSEED'`);
};
