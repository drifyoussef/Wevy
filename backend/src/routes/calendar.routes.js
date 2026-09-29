const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');
const { authenticateUser } = require('../middleware/auth.middleware');

// Household calendar, shared by every member. Each event remembers who added it.
// { householdId, title, date: "YYYY-MM-DD", time?: "HH:mm", location?, type, color, createdBy, createdByName }

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const TYPES = ['rendezvous', 'reunion', 'anniversaire', 'loisir', 'autre'];
const MAX_IMPORT = 500;

// All routes require authentication
router.use(authenticateUser);

// Only members of the household in the URL get in (same rule as shopping / schedules)
router.use('/:householdId', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.householdId)) {
      return res.status(400).json({ error: 'Invalid household id' });
    }

    const user = await getDB().collection('users').findOne({ _id: new ObjectId(req.user.uid) });
    if (!user || !user.householdId || user.householdId.toString() !== req.params.householdId) {
      return res.status(403).json({ error: 'Access to this household is not allowed' });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    console.error('Household authorization error:', error);
    res.status(500).json({ error: error.message });
  }
});

/** Validates the client fields of an event; returns the clean fields or an error message. */
function readEvent(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 120) return { error: 'Donne un titre à cet événement (120 caractères max)' };
  if (!DATE_PATTERN.test(body.date || '')) return { error: 'Date invalide' };
  if (body.time && !TIME_PATTERN.test(body.time)) return { error: 'Heure invalide' };

  const location = typeof body.location === 'string' ? body.location.trim().slice(0, 200) : '';
  return {
    event: {
      title,
      date: body.date,
      ...(body.time ? { time: body.time } : {}),
      ...(location ? { location } : {}),
      type: TYPES.includes(body.type) ? body.type : 'autre',
      color: COLOR_PATTERN.test(body.color || '') ? body.color : '#8B5CF6'
    }
  };
}

function toClient(doc) {
  const { _id, householdId, ...rest } = doc;
  return { ...rest, id: _id.toString(), householdId: householdId.toString() };
}

function authorFields(req) {
  return {
    createdBy: req.user.uid,
    createdByName: req.currentUser.displayName || req.currentUser.email || 'Membre'
  };
}

// Every event of the household
router.get('/:householdId', async (req, res) => {
  try {
    const events = await getDB().collection('calendar_events')
      .find({ householdId: new ObjectId(req.params.householdId) })
      .sort({ date: 1, time: 1 })
      .toArray();
    res.json({ events: events.map(toClient) });
  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add an event (the author is the authenticated user)
router.post('/:householdId', async (req, res) => {
  try {
    const { event, error } = readEvent(req.body);
    if (error) return res.status(400).json({ error });

    const doc = {
      ...event,
      householdId: new ObjectId(req.params.householdId),
      ...authorFields(req),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const result = await getDB().collection('calendar_events').insertOne(doc);
    doc._id = result.insertedId;

    res.status(201).json({ event: toClient(doc) });
  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// One-time upload of the events that used to live only on the phone (before the calendar was shared)
router.post('/:householdId/import', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.events) ? req.body.events.slice(0, MAX_IMPORT) : [];
    const docs = items
      .map(item => readEvent(item).event)
      .filter(Boolean)
      .map(event => ({
        ...event,
        householdId: new ObjectId(req.params.householdId),
        ...authorFields(req),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

    if (docs.length > 0) {
      const result = await getDB().collection('calendar_events').insertMany(docs);
      docs.forEach((doc, index) => { doc._id = result.insertedIds[index]; });
    }

    res.status(201).json({ events: docs.map(toClient) });
  } catch (error) {
    console.error('Import calendar events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Edit an event: only its author can
router.put('/:householdId/:eventId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.eventId)) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { event, error } = readEvent(req.body);
    if (error) return res.status(400).json({ error });

    const filter = { _id: new ObjectId(req.params.eventId), householdId: new ObjectId(req.params.householdId) };
    const existing = await getDB().collection('calendar_events').findOne(filter);
    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (existing.createdBy !== req.user.uid) {
      return res.status(403).json({ error: 'Tu ne peux modifier que les événements que tu as ajoutés' });
    }

    // time / location removed in the form must disappear, not keep their old value
    const unset = {};
    if (!event.time) unset.time = '';
    if (!event.location) unset.location = '';

    const result = await getDB().collection('calendar_events').findOneAndUpdate(
      filter,
      { $set: { ...event, updatedAt: new Date() }, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { returnDocument: 'after' }
    );

    res.json({ event: toClient(result) });
  } catch (error) {
    console.error('Update calendar event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an event (any member of the household can, like the shopping list)
router.delete('/:householdId/:eventId', async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.eventId)) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const result = await getDB().collection('calendar_events').deleteOne({
      _id: new ObjectId(req.params.eventId),
      householdId: new ObjectId(req.params.householdId)
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Delete calendar event error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
