const env = require('../config/env');
const { levelInfo } = require('./levels');

const trustId = (id) => `CG-${String(id).padStart(5, '0')}`;
const domainOf = (email = '') => email.split('@')[1]?.toLowerCase();

/** Fields everyone may see. */
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    trustId: trustId(u.id),
    name: u.name,
    avatar: u.avatar || null,
    headline: u.headline || '',
    bio: u.bio || '',
    department: u.department || '',
    yearOfStudy: u.year_of_study || '',
    skills: u.skills || [],
    portfolioUrl: u.portfolio_url || '',
    verified: env.allowedDomains.includes(domainOf(u.email)),
    createdAt: u.created_at,
    ...levelInfo(u.xp),
  };
}

/** Owner-only fields on top of the public ones. */
function privateUser(u) {
  return { ...publicUser(u), email: u.email, upiId: u.upi_id || '', balance: u.balance };
}

/** Small card used inside gig lists. */
function miniUser(prefix, row) {
  return {
    id: row[`${prefix}_id`],
    name: row[`${prefix}_name`],
    avatar: row[`${prefix}_avatar`] || null,
    ...levelInfo(row[`${prefix}_xp`]),
  };
}

function mapGig(g, extra = {}) {
  return {
    id: g.id,
    title: g.title,
    description: g.description,
    category: g.category,
    budget: g.budget,
    imageUrl: g.image_url || null,
    deadline: g.deadline ? new Date(g.deadline).toISOString().slice(0, 10) : null,
    status: g.status,
    posterId: g.poster_id,
    assignedTo: g.assigned_to,
    acceptedBidId: g.accepted_bid_id,
    escrowAmount: g.escrow_amount,
    feeAmount: g.fee_amount,
    deliveryNote: g.delivery_note,
    revisionNote: g.revision_note,
    deliveredAt: g.delivered_at,
    completedAt: g.completed_at,
    createdAt: g.created_at,
    ...extra,
  };
}

function mapBid(b, extra = {}) {
  return {
    id: b.id,
    gigId: b.gig_id,
    bidderId: b.bidder_id,
    amount: b.amount,
    message: b.message || '',
    deliveryDays: b.delivery_days,
    status: b.status,
    createdAt: b.created_at,
    ...extra,
  };
}

module.exports = { publicUser, privateUser, miniUser, mapGig, mapBid, trustId, domainOf };
