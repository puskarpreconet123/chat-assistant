import mongoose from 'mongoose';

const AgentSchema = new mongoose.Schema({
  _id: { type: String }, // agency_unq_id or email
  emailId: { type: String, required: true },
  name: { type: String, default: '' },
  mob: { type: String, default: '' },
  password: { type: String, default: '' },
  img: { type: String, default: '' },
  type: { type: String, default: 'AGENCY' },
  show_status: { type: String, default: 'ACTIVE' },
  date: { type: String },
  time: { type: String }
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true }
});

AgentSchema.virtual('avatar').get(function() {
  return (this.img && this.img !== 'null' && this.img !== 'undefined') ? this.img : '';
});

AgentSchema.virtual('status').get(function() {
  return this.show_status && this.show_status.toUpperCase() === 'ACTIVE' ? 'active' : 'inactive';
}).set(function(val) {
  this.show_status = String(val).toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
});

// Implement custom queries/helpers to keep compatibility with existing codebase
AgentSchema.statics.findByIdAndUpdate = async function(id, updateData, options = {}) {
  const email = updateData.emailId || id;
  if (updateData.status) {
    updateData.show_status = String(updateData.status).toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
  }
  
  if (options.upsert) {
    return await this.findOneAndUpdate({ _id: id }, { $set: { ...updateData, emailId: email } }, { new: true, upsert: true });
  } else {
    return await this.findOneAndUpdate({ _id: id }, { $set: updateData }, { new: true });
  }
};

export const Agent = mongoose.model('Agent', AgentSchema);
