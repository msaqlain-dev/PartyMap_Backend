import { Schema, model } from "mongoose";
import { hash, compare } from "bcryptjs";

const userSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: {
    addressLine1: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
  },
  phone: { type: String },
  instagram: { type: String },
  facebook: { type: String },
  twitter: { type: String },
  snap: { type: String },
  role: { type: String, enum: ["user"], default: "user" },
});

// Hash the password before saving the user
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await hash(this.password, 10);
  }
  next();
});

// Method to compare password for login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await compare(candidatePassword, this.password);
};

const User = model("User", userSchema);

export default User;
