# Global Holiday Management

## Overview

The **Global Holiday System** provides a centralized way to manage official, religious, and national holidays across the entire platform. These holidays are managed by the **Super Admin** and are automatically synchronized to all tenant institutions.

This system ensures:
- Consistency of holiday data across schools.
- Automation of holiday setup for new institutions.
- Seamless year-wise scheduling without manual intervention by school admins.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   SUPER ADMIN PORTAL                     │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Global Holiday Management Page                  │    │
│  │  (Fetch, Sync from Cloud, Upsert, Delete)        │    │
│  └──────────────────────────────────────────────────┘    │
└───────────────┬──────────────────────────────────────────┘
                │
    ┌───────────▼───────────┐
    │  Backend (Public)      │  GlobalHolidayService (public schema)
    │  GlobalHoliday Model   │
    └───────────┬───────────┘
                │
    ┌───────────▼───────────┐      ┌──────────────────────────┐
    │  Cloud API Sync        │ <───┤ Calendarific API         │
    │  (CalendarificService) │      │ (National/Gazetted/Rel)  │
    └───────────┬───────────┘      └──────────────────────────┘
                │
    ┌───────────▼───────────┐      ┌──────────────────────────┐
    │  Sync to Tenants       │ ───> │ Institution Database     │
    │  (Lazy Initialization) │      │ (SessionHoliday records)  │
    └───────────────────────┘      └──────────────────────────┘
```

---

## Features

### 1. Cloud-Powered Synchronization
Super Admins can sync holidays directly from the **Calendarific API** for any country and year. 
- Integrated with deep logic to generate unique `holiday_key` identifiers.
- Prevents duplication during re-syncs.
- Categorizes holidays into: National/Gazetted, Regional/Restricted, Religious, and Observances.

### 2. Manual Management
Super Admins have full CRUD capability:
- **Create**: Add custom holidays (e.g., custom state holidays).
- **Edit**: Modify names, descriptions, or gazetted statuses of synced holidays.
- **Delete**: Remove irrelevant holidays before they sync to tenants.

### 3. Smart Recurrence
Holidays are stored as **Master Holidays**. These are date-based (Month/Day) rules that the system uses to automatically generate specific session events every year.

---

## Data Flow & Sync Logic

### Lazy Initialization (Auto-Sync)
When a school administrator first visits their **Academic Calendar**, the system automatically triggers a sync:
1. Checks if the institution is already "initialized".
2. Fetches all active holidays from the `public.global_holidays` table for the current academic year.
3. Inserts them into the tenant's `session_holidays` table.
4. Marks the institution as `calendar_initialized` to prevent redundant syncs.

### Unique Keys
Every global holiday has a `holiday_key` (e.g., `IN-2026-REPUBLIC-DAY`). This key is used during synchronization to ensure that updates to a global holiday are reflected in the tenant's calendar without creating duplicates.

---

## Integration in Academic Calendar

The tenant-side **Academic Calendar** leverages these holidays to:
- Auto-fill the calendar with official dates.
- Mark "Gazetted" holidays with visual indicators (e.g., pulses).
- Lock dates that are globally recognized as non-working days.

---

## Permissions

| Action | Required Permission | Portal |
|--------|---------------------|--------|
| View/Sync Global Holidays | `manage_plans` | Super Admin |
| Sync Master Holidays | `manage_academics` | School Admin |
