import { Schema, model } from "mongoose";

const ticketSchema = new Schema({
  hour: {
    type: String,
    required: true,
  },
  availableTickets: {
    type: Number,
    required: true,
  },
});

const markerSchema = new Schema({
  markerType: {
    type: String,
    required: true,
  },
  placeName: {
    type: String,
    required: true,
  },
  latitude: {
    type: String,
    required: true,
  },
  longitude: {
    type: String,
    required: true,
  },
  partyTime: {
    type: String,
    enum: ['day', 'noon', 'evening', 'night'],
    required: true,
  },
  website: {
    type: String,
  },
  partyDescription: {
    type: String,
  },
  partyIcon: {
    type: String,
  },
  placeImage: {
    type: String,
  },
  partyImage: {
    type: String,
  },
  tickets: {
    type: [ticketSchema],
  },
  markerLabel: {
    type: String, // New field for marker label
    required: true,
  },
});

const Marker = model("Marker", markerSchema);

export default Marker;
