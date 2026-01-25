-- medHist v1.3.1: High Integrity Schema Initialization
-- Target: PostgreSQL (Supabase)

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- Families: The tenant root
create table families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  join_code text unique not null,
  created_at timestamp with time zone default now()
);

-- Profiles: Links Supabase Auth to Families
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  family_id uuid references families(id) on delete set null,
  full_name text,
  updated_at timestamp with time zone default now()
);

-- Family Members: Patient Folders
create table family_members (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  relationship text not null,
  dob date,
  linked_user_id uuid references profiles(id) on delete set null,
  created_at timestamp with time zone default now()
);

-- Timeline Entries: Clinical Events
create table timeline_entries (
  id uuid primary key default uuid_generate_v4(),
  family_member_id uuid not null references family_members(id) on delete cascade,
  uploaded_by_user_id uuid references profiles(id) on delete set null,
  date date not null,
  report_type text not null,
  summary text,
  doctor_name text,
  facility_name text,
  patient_name text,
  follow_up_date date,
  mismatch_ignored boolean default false,
  pending_medications jsonb,
  created_at timestamp with time zone default now()
);

-- Files: Metadata for Storage
create table files (
  id uuid primary key default uuid_generate_v4(),
  timeline_entry_id uuid not null references timeline_entries(id) on delete cascade,
  name text not null,
  type text not null,
  file_path text not null,
  password text,
  created_at timestamp with time zone default now()
);

-- Medications: The Pharmacy Registry
create table medications (
  id uuid primary key default uuid_generate_v4(),
  family_member_id uuid not null references family_members(id) on delete cascade,
  timeline_entry_id uuid references timeline_entries(id) on delete set null,
  name text not null,
  dosage text,
  frequency text,
  purpose text,
  start_date date,
  end_date date,
  active boolean default true,
  stopped_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 3. ROW LEVEL SECURITY (RLS) Logic

-- Enable RLS on all tables
alter table families enable row level security;
alter table profiles enable row level security;
alter table family_members enable row level security;
alter table timeline_entries enable row level security;
alter table files enable row level security;
alter table medications enable row level security;

-- Policies for Profiles (Users can only see their own profile)
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Logic: To see family data, your profile must have the same family_id
create policy "Users can view their family" on families
  for select using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.family_id = families.id
    )
  );

-- Policies for Family Members
create policy "Users can view family members" on family_members
  for select using (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.family_id = family_members.family_id
    )
  );

create policy "Users can insert family members" on family_members
  for insert with check (
    exists (
      select 1 from profiles 
      where profiles.id = auth.uid() 
      and profiles.family_id = family_members.family_id
    )
  );

-- Policies for Timeline Entries
create policy "Users can view family timeline" on timeline_entries
  for select using (
    exists (
      select 1 from family_members
      join profiles on profiles.family_id = family_members.family_id
      where profiles.id = auth.uid()
      and family_members.id = timeline_entries.family_member_id
    )
  );

create policy "Users can manage family timeline" on timeline_entries
  for all using (
    exists (
      select 1 from family_members
      join profiles on profiles.family_id = family_members.family_id
      where profiles.id = auth.uid()
      and family_members.id = timeline_entries.family_member_id
    )
  );

-- Policies for Medications
create policy "Users can view family medications" on medications
  for select using (
    exists (
      select 1 from family_members
      join profiles on profiles.family_id = family_members.family_id
      where profiles.id = auth.uid()
      and family_members.id = medications.family_member_id
    )
  );

create policy "Users can manage family medications" on medications
  for all using (
    exists (
      select 1 from family_members
      join profiles on profiles.family_id = family_members.family_id
      where profiles.id = auth.uid()
      and family_members.id = medications.family_member_id
    )
  );

-- 4. INDEXES for Performance
create index idx_profiles_family on profiles(family_id);
create index idx_members_family on family_members(family_id);
create index idx_timeline_member on timeline_entries(family_member_id);
create index idx_meds_member on medications(family_member_id);
create index idx_files_entry on files(timeline_entry_id);
