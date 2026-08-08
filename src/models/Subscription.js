import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  user_id: { type: String, required: true }, // will map to the user's emailId
  book_id: { type: String, required: true },
  emp_id: { type: String, default: '1' },
  username: { type: String, default: '' },
  password: { type: String, default: '' },
  stage_status: { type: String, default: 'PENDING' },
  read_status: { type: String, default: 'PENDING' },
  show_status: { type: String, default: 'ACTIVE' },
  user_under: { type: String, default: 'ADMIN' },
  date_ts: { type: String, default: () => Math.floor(Date.now() / 1000).toString() }
}, {
  timestamps: true
});

export const Subscription = mongoose.model('Subscription', SubscriptionSchema);
