-- =====================================================================
-- PS MUSIC STREAM – Hörproben (Version 2, abgesichert)
-- Rein additiv: bestehende Songs, Konten und Dateien bleiben unverändert.
-- Hörproben erzeugt ausschließlich die Edge Function "psms-preview"
-- (Service-Rolle). Browser dürfen die Felder nicht setzen und nicht in
-- den Hörproben-Speicher schreiben.
-- =====================================================================

-- 1) Zwei neue, optionale Felder
alter table public.psms_artist_songs add column if not exists preview_url text;
alter table public.psms_artist_songs add column if not exists preview_start integer;

alter table public.psms_artist_songs drop constraint if exists psms_preview_start_range;
alter table public.psms_artist_songs add constraint psms_preview_start_range
  check (preview_start is null or (preview_start >= 0 and preview_start < 7200));

alter table public.psms_artist_songs drop constraint if exists psms_preview_url_bucket;
alter table public.psms_artist_songs add constraint psms_preview_url_bucket
  check (preview_url is null or preview_url like 'https://idzooeltxxbnepzkqrbg.supabase.co/storage/v1/object/public/ps-music-previews/%');

-- 2) Wächter: Nur der Server (Service-Rolle / Admin) darf die Hörproben-Felder ändern.
--    Normale Anfragen aus dem Browser behalten die alten Werte (Insert: leer).
create or replace function public.psms_guard_preview_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    if tg_op = 'INSERT' then
      new.preview_url := null;
      new.preview_start := null;
    else
      new.preview_url := old.preview_url;
      new.preview_start := old.preview_start;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists psms_guard_preview on public.psms_artist_songs;
create trigger psms_guard_preview
  before insert or update on public.psms_artist_songs
  for each row execute function public.psms_guard_preview_fields();

-- 3) Öffentlicher Speicher nur für Hörproben (max. 1,3 MB, nur MP3)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ps-music-previews', 'ps-music-previews', true, 1363148, array['audio/mpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 4) Lesen für alle. KEINE Schreibregeln für Browser –
--    die Service-Rolle der Edge Function umgeht RLS ohnehin.
drop policy if exists psms_preview_public_read on storage.objects;
create policy psms_preview_public_read on storage.objects
  for select to public
  using (bucket_id = 'ps-music-previews');

-- Falls eine frühere Version Schreibregeln angelegt hat: entfernen
drop policy if exists psms_preview_artist_insert on storage.objects;
drop policy if exists psms_preview_artist_update on storage.objects;
drop policy if exists psms_preview_artist_delete on storage.objects;
