const express  = require('express');
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ─── CONNECT TO MONGODB ATLAS ────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas connected'))
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });

const JWT_SECRET = process.env.JWT_SECRET || 'finvault_secret_change_me';

// ─── SCHEMAS ─────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  name:     { type: String, required: true },
  role:     { type: String, enum: ['admin','user'], default: 'user' },
}, { timestamps: true });

const TransactionSchema = new mongoose.Schema({
  type:        { type: String, enum: ['income','expense'], required: true },
  date:        { type: String, required: true },
  description: { type: String, required: true },
  amount:      { type: Number, required: true },
  category:    String,
  note:        String,
  addedBy:     String,
}, { timestamps: true });

const LoanGivenSchema = new mongoose.Schema({
  friendName: { type: String, required: true },
  date:       { type: String, required: true },
  amount:     { type: Number, required: true },
  purpose:    String,
  note:       String,
  returned:   { type: Boolean, default: false },
  returnedOn: { type: String, default: null },
  addedBy:    String,
}, { timestamps: true });

const BankLoanSchema = new mongoose.Schema({
  bankName:     { type: String, required: true },
  startDate:    { type: String, required: true },
  principal:    { type: Number, required: true },
  interestRate: { type: Number, required: true },
  emi:          { type: Number, default: 0 },
  loanType:     String,
  note:         String,
  active:       { type: Boolean, default: true },
  addedBy:      String,
}, { timestamps: true });

const InterestPaymentSchema = new mongoose.Schema({
  loanId:      { type: mongoose.Schema.Types.ObjectId, ref: 'BankLoan' },
  date:        { type: String, required: true },
  amount:      { type: Number, required: true },
  paymentType: String,
  note:        String,
  addedBy:     String,
}, { timestamps: true });

const User            = mongoose.model('User',            UserSchema);
const Transaction     = mongoose.model('Transaction',     TransactionSchema);
const LoanGiven       = mongoose.model('LoanGiven',       LoanGivenSchema);
const BankLoan        = mongoose.model('BankLoan',        BankLoanSchema);
const InterestPayment = mongoose.model('InterestPayment', InterestPaymentSchema);

// ─── SEED ADMIN ───────────────────────────────────────────
async function seedAdmin() {
  const exists = await User.findOne({ username: 'dabas.sachin.sachin@gmail.com' });
  if (!exists) {
    const hash = await bcrypt.hash('9873796929@Sd', 10);
    await User.create({ username: 'dabas.sachin.sachin@gmail.com', password: hash, name: 'Sachin Dabas', role: 'admin' });
    console.log('✅ Admin user seeded');
  }
}
mongoose.connection.once('open', seedAdmin);

// ─── AUTH MIDDLEWARE ──────────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(header.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
  next();
}

// ─── AUTH ─────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { username: user.username, name: user.name, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── USERS ────────────────────────────────────────────────
app.get('/api/users', auth, adminOnly, async (req, res) => {
  try { res.json(await User.find({}, '-password').sort({ createdAt: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/users', auth, adminOnly, async (req, res) => {
  try {
    const { username, password, name, role } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'All fields required' });
    if (await User.findOne({ username })) return res.status(400).json({ error: 'Username already taken' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash, name, role: role || 'user' });
    res.json({ username: user.username, name: user.name, role: user.role });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/users/:username', auth, adminOnly, async (req, res) => {
  try {
    if (req.params.username === req.user.username) return res.status(400).json({ error: 'Cannot delete yourself' });
    await User.deleteOne({ username: req.params.username });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── TRANSACTIONS ─────────────────────────────────────────
app.get('/api/transactions', auth, async (req, res) => {
  try { res.json(await Transaction.find({}).sort({ date: -1, createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/transactions', auth, async (req, res) => {
  try { res.json(await Transaction.create({ ...req.body, addedBy: req.user.username })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/transactions/:id', auth, async (req, res) => {
  try { await Transaction.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── LOANS GIVEN ──────────────────────────────────────────
app.get('/api/loans-given', auth, async (req, res) => {
  try { res.json(await LoanGiven.find({}).sort({ date: -1, createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/loans-given', auth, async (req, res) => {
  try { res.json(await LoanGiven.create({ ...req.body, addedBy: req.user.username })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/loans-given/:id/return', auth, async (req, res) => {
  try {
    res.json(await LoanGiven.findByIdAndUpdate(req.params.id,
      { returned: true, returnedOn: new Date().toISOString().split('T')[0] }, { new: true }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/loans-given/:id', auth, async (req, res) => {
  try { await LoanGiven.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── BANK LOANS ───────────────────────────────────────────
app.get('/api/bank-loans', auth, async (req, res) => {
  try { res.json(await BankLoan.find({}).sort({ startDate: -1, createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/bank-loans', auth, async (req, res) => {
  try { res.json(await BankLoan.create({ ...req.body, addedBy: req.user.username })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.patch('/api/bank-loans/:id/close', auth, async (req, res) => {
  try { res.json(await BankLoan.findByIdAndUpdate(req.params.id, { active: false }, { new: true })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/bank-loans/:id', auth, async (req, res) => {
  try { await BankLoan.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── INTEREST PAYMENTS ────────────────────────────────────
app.get('/api/interest-payments', auth, async (req, res) => {
  try { res.json(await InterestPayment.find({}).sort({ date: -1, createdAt: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/interest-payments', auth, async (req, res) => {
  try { res.json(await InterestPayment.create({ ...req.body, addedBy: req.user.username })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/interest-payments/:id', auth, async (req, res) => {
  try { await InterestPayment.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SPA FALLBACK ─────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 FinVault running on port ${PORT}`));
