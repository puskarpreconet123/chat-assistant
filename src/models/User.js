import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  _id: { type: String }, // will be the email/emailId
  id: { type: Number },
  emailId: { type: String, required: true },
  name: { type: String, default: '' },
  mob: { type: String, default: '' },
  password: { type: String, default: '' },
  img: { type: String, default: '' },
  agency_id: { type: String, default: '' },
  agency_unq_id: { type: String, default: '' },
  agentId: {
    type: String,
    default: '',
    get: function(val) {
      return this.agency_unq_id || (this.agency_id ? `AGENCY-${this.agency_id}` : '') || val || '';
    },
    set: function(val) {
      this.agency_unq_id = val || '';
      if (val && val.includes('-')) {
        const parts = val.split('-');
        const lastPart = parts[parts.length - 1];
        if (!isNaN(lastPart)) {
          this.agency_id = lastPart;
        }
      }
      return val || '';
    }
  },
  read_status: { type: String, default: 'READ' },
  verification: { type: String, default: 'DONE' },
  type: { type: String, default: 'USER' },
  show_status: { type: String, default: 'ACTIVE' },
  date: { type: String },
  time: { type: String }
}, {
  timestamps: true,
  toObject: { virtuals: true, getters: true },
  toJSON: { virtuals: true, getters: true }
});

UserSchema.virtual('avatar').get(function() {
  return (this.img && this.img !== 'null' && this.img !== 'undefined') ? this.img : '';
});

UserSchema.virtual('status').get(function() {
  return this.show_status && this.show_status.toUpperCase() === 'ACTIVE' ? 'active' : 'inactive';
}).set(function(val) {
  this.show_status = String(val).toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
});

// Implement custom queries/helpers to keep compatibility with existing codebase

UserSchema.statics.findByIdAndUpdate = async function(id, updateData, options = {}) {
  const email = updateData.emailId || updateData.email || id;
  // If updateData contains agentId, map it to agency_unq_id / agency_id
  if (updateData.agentId) {
    updateData.agency_unq_id = updateData.agentId;
    if (updateData.agentId.includes('-')) {
      const parts = updateData.agentId.split('-');
      const lastPart = parts[parts.length - 1];
      if (!isNaN(lastPart)) {
        updateData.agency_id = lastPart;
      }
    }
  } else if (updateData.agency_unq_id) {
    // If agency_unq_id is present but agentId is missing, populate agentId
    updateData.agentId = updateData.agency_unq_id;
  }
  
  if (updateData.status) {
    updateData.show_status = String(updateData.status).toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
  }
  
  if (options.upsert) {
    return await this.findOneAndUpdate({ _id: email }, { $set: { ...updateData, emailId: email } }, { new: true, upsert: true });
  } else {
    return await this.findOneAndUpdate({ _id: email }, { $set: updateData }, { new: true });
  }
};

export const User = mongoose.model('User', UserSchema);
