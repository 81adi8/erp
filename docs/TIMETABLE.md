# Timetable System

## Overview

The Timetable system manages the weekly schedule for classes and teachers. It supports multi-term sessions, automatic slot generation, and conflict detection.

---

## Core Concepts

### 1. Timetable Template
A template defines the "skeleton" of a school day:
- When the school starts and ends.
- How many periods (slots) are in a day.
- Duration of each period.
- Fixed break times (Recess, Lunch).

### 2. Timetable Slots
These are the actual occurrences of a subject in a specific section:
- **Regular Slot**: A standard teaching period.
- **Break Slot**: Non-teaching intervals.
- **Special Slot**: Assemblies, Library, PE.

---

## Data Model

```
TimetableTemplate (Global pattern)
    │
    └── TimetableSlot (Instance)
          ├── Section (Where)
          ├── Subject (What)
          ├── Teacher (Who)
          └── Day/Time (When)
```

---

## Conflict Resolution

The system prevents "Double Booking" at two levels:
1. **Teacher Conflict**: A teacher cannot be in two different classes at the same time.
2. **Room Conflict**: A specific room/lab cannot host two different sections at once.

When creating a slot, the `TimetableService` validates availability across the entire institution schema.

---

## Academic Session Integration

Timetables are strictly bound to the **Academic Session**. When a user switches the session in the header, the timetable views (Section View / Teacher View) update to show the schedule for that specific year.

---

## UI Components

### `TimetableGrid`
A high-performance grid component that renders the full week. 
- **Section View**: Used by Admins to manage class schedules.
- **Teacher View**: Used by Teachers to see their personal "My Schedule".
- **Student View**: Read-only view for students in their portal.

---

## Code Example: Generating Automatic Slots

```typescript
// server/src/modules/school/academic/services/timetable/timetable.service.ts

async generateFromTemplate(sectionId: string, templateId: string) {
    const template = await Template.findByPk(templateId);
    
    // Logic to create empty slots based on template duration 
    // and day-of-week configuration...
    
    const slots = [];
    for (let day = 1; day <= 6; day++) { // Mon-Sat
        // Calculate start/end times for each slot number
        // and bulk create records
    }
}
```
