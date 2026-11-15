-- Run with psql or the Supabase SQL editor; creates and deletes its own test users.
create temp table if not exists rls_results(n serial, test text, expected text, got text, ok boolean);
create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $f$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $f$;
create or replace function pg_temp.r(t text, e text, g text) returns void language plpgsql as $f$
begin
  perform set_config('role', 'postgres', true);
  insert into pg_temp.rls_results(test, expected, got, ok) values (t, e, g, e = g);
end $f$;
grant all on pg_temp.rls_results to authenticated;
grant usage, select on all sequences in schema pg_temp to authenticated;
do $$
declare
  ua uuid := '00000000-0000-4000-a000-00000000000a'; -- owner
  ub uuid := '00000000-0000-4000-a000-00000000000b'; -- stranger
  uc uuid := '00000000-0000-4000-a000-00000000000c'; -- joins via link
  ud uuid := '00000000-0000-4000-a000-00000000000d'; -- email invited, existing confirmed
  ue uuid := '00000000-0000-4000-a000-00000000000e'; -- email invited before signup
  uf uuid := '00000000-0000-4000-a000-00000000000f'; -- unconfirmed with invited email
  test_item uuid; l uuid; l2 uuid; tok text; tok2 text; n int; v uuid; msg text;
begin
  insert into auth.users(id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
   (ua,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-a@minder.test',now(),'{}','{}',now(),now()),
   (ub,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-b@minder.test',now(),'{}','{}',now(),now()),
   (uc,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-c@minder.test',now(),'{}','{}',now(),now()),
   (ud,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-d@minder.test',now(),'{}','{}',now(),now()),
   (uf,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-f@minder.test',null,'{}','{}',now(),now());

  -- no default list at signup
  perform pg_temp.as_user(ub); select count(*) into n from public.lists; perform pg_temp.r('new user B: no default list','0',n::text);
  perform pg_temp.as_user(ua); select count(*) into n from public.lists; perform pg_temp.r('new user A: no default list','0',n::text);

  -- A creates lists (unlimited)
  perform pg_temp.as_user(ua);
  insert into public.lists(title) values ('Déménagement') returning id into l;
  perform pg_temp.as_user(ua);
  insert into public.lists(title) select 'Événement '||g from generate_series(1,50) g;
  perform pg_temp.as_user(ua); select count(*) into n from public.lists; perform pg_temp.r('A created 51 lists, sees 51','51',n::text);
  perform pg_temp.as_user(ua); select id into l2 from public.lists where title='Événement 1';

  -- share link
  perform pg_temp.as_user(ua); select token into tok from public.rotate_share_link(l);
  perform pg_temp.as_user(ua); select count(*) into n from public.invites where list_id=l and revoked_at is null and expires_at is null; perform pg_temp.r('one active link, no expiry','1',n::text);

  -- stranger
  perform pg_temp.as_user(ub); select count(*) into n from public.lists; perform pg_temp.r('B stranger sees 0 lists','0',n::text);
  perform pg_temp.as_user(ub); select count(*) into n from public.list_members where list_id=l; perform pg_temp.r('B sees 0 members of L','0',n::text);
  perform pg_temp.as_user(ub); select count(*) into n from public.invites; perform pg_temp.r('B sees 0 invites (tokens)','0',n::text);
  perform pg_temp.as_user(ub); select count(*) into n from public.items; perform pg_temp.r('B sees 0 items','0',n::text);
  begin perform pg_temp.as_user(ub); perform public.rotate_share_link(l); msg:='allowed'; exception when others then msg:='denied'; end;
  perform pg_temp.r('B cannot rotate L link','denied',msg);
  begin perform pg_temp.as_user(ub); insert into public.list_email_invites(list_id,email) values (l,'rls-b@minder.test'); msg:='allowed'; exception when others then msg:='denied'; end;
  perform pg_temp.r('B cannot self-invite by email','denied',msg);
  begin perform pg_temp.as_user(ub); insert into public.list_members(list_id,user_id,role) values (l,ub,'guest'); msg:='allowed'; exception when others then msg:='denied'; end;
  perform pg_temp.r('B cannot insert membership directly','denied',msg);

  -- C joins via link
  perform pg_temp.as_user(uc); select count(*) into n from public.lists; perform pg_temp.r('C before link sees 0','0',n::text);
  perform pg_temp.as_user(uc); select public.accept_invite(tok) into v; perform pg_temp.r('C accept_invite returns L', l::text, v::text);
  perform pg_temp.as_user(uc); select count(*) into n from public.lists; perform pg_temp.r('C via link sees 1 list','1',n::text);
  perform pg_temp.as_user(uc); select count(*) into n from public.lists where id=l2; perform pg_temp.r('C does not see other lists of A','0',n::text);
  perform pg_temp.as_user(uc); select public.accept_invite(tok) into v; perform pg_temp.r('accept_invite idempotent', l::text, v::text);

  -- email invites by A
  perform pg_temp.as_user(ua); insert into public.list_email_invites(list_id,email) values (l,'rls-d@minder.test'),(l,'rls-e@minder.test'),(l,'rls-f@minder.test');
  perform pg_temp.as_user(ud); select count(*) into n from public.lists; perform pg_temp.r('D (existing confirmed, invited) sees 1','1',n::text);
  perform pg_temp.as_user(uf); select count(*) into n from public.lists; perform pg_temp.r('F (unconfirmed, invited) sees 0','0',n::text);
  perform pg_temp.as_user(uf); select public.claim_email_invites() into n; perform pg_temp.r('F claim returns 0','0',n::text);
  perform pg_temp.as_user(ud); select count(*) into n from public.list_email_invites; perform pg_temp.r('D (guest) cannot read email invites','0',n::text);
  -- E signs up later with confirmed email (trigger)
  perform set_config('role','postgres',true);
  insert into auth.users(id, instance_id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
   (ue,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','rls-e@minder.test',now(),'{}','{}',now(),now());
  perform pg_temp.as_user(ue); select count(*) into n from public.lists; perform pg_temp.r('E (signed up after invite) sees 1','1',n::text);
  -- F confirms email (update trigger)
  perform set_config('role','postgres',true); update auth.users set email_confirmed_at=now() where id=uf;
  perform pg_temp.as_user(uf); select count(*) into n from public.lists; perform pg_temp.r('F after confirming sees 1','1',n::text);
  perform pg_temp.as_user(ua); select count(*) into n from public.list_email_invites where list_id=l and accepted_at is not null; perform pg_temp.r('A sees 3 accepted email invites','3',n::text);

  -- rotation
  perform pg_temp.as_user(ua); select token into tok2 from public.rotate_share_link(l);
  begin perform pg_temp.as_user(ub); perform public.accept_invite(tok); msg:='allowed'; exception when others then msg:='denied'; end;
  perform pg_temp.r('old token refused after rotation','denied',msg);
  perform pg_temp.as_user(ua); select count(*) into n from public.invites where list_id=l and revoked_at is null; perform pg_temp.r('still one active link after rotation','1',n::text);
  perform pg_temp.as_user(ub); select public.accept_invite(tok2) into v; perform pg_temp.r('B joins with new token', l::text, v::text);
  perform pg_temp.as_user(ub); select count(*) into n from public.lists; perform pg_temp.r('B now sees 1','1',n::text);
  -- revoke
  perform pg_temp.as_user(ua); update public.invites set revoked_at=now() where list_id=l and revoked_at is null;
  begin perform pg_temp.as_user(uc); perform public.accept_invite(tok2); msg:='allowed'; exception when others then msg:='denied'; end;
  perform pg_temp.r('revoked token refused','denied',msg);
  begin perform pg_temp.as_user(ub); update public.invites set revoked_at=null where list_id=l; get diagnostics n = row_count; msg:=n::text; exception when others then msg:='denied'; end;
  perform pg_temp.r('guest B cannot un-revoke (0 rows)','0',msg);
  -- anon
  perform set_config('role','postgres',true); perform set_config('request.jwt.claims','{"role":"anon"}',true); perform set_config('role','anon',true);
  begin select count(*) into n from public.lists; msg:=n::text; exception when others then msg:='denied'; end;
  perform pg_temp.r('anon sees no list','denied',case when msg in ('0','denied') then 'denied' else msg end);


  -- An owner of another list cannot use it to reference L's private photo.
  perform pg_temp.as_user(ub);
  insert into public.lists(title) values ('Photo isolation') returning id into v;
  begin
    insert into public.items(list_id,photo_path,title) values(v,l::text||'/test.jpg','Foreign photo');
    msg:='allowed';
  exception when check_violation then msg:='denied'; end;
  perform pg_temp.r('foreign-list photo_path denied','denied',msg);

  -- Lot 2 drafts, author publication, votes, immutable fields and cascade.
  perform pg_temp.as_user(ua);
  insert into public.items(list_id,photo_path,title,status) values(l,l::text||'/test.jpg','Test','published') returning id into test_item;
  select count(*) into n from public.items where id=test_item and status='draft';
  perform pg_temp.r('direct published insert forced to draft','1',n::text);
  perform pg_temp.as_user(ua); select count(*) into n from public.items where id=test_item;
  perform pg_temp.r('owner sees draft','1',n::text);
  perform set_config('role','postgres',true);
  insert into storage.objects(bucket_id,name,owner) values
    ('item-photos',l::text||'/test.jpg',ua),
    ('item-photos','not-a-uuid/rls-test.jpg',ua);
  perform pg_temp.as_user(ub);
  select count(*) into n from storage.objects where bucket_id='item-photos' and name=l::text||'/test.jpg';
  perform pg_temp.r('guest cannot select draft photo','0',n::text);
  perform pg_temp.as_user(ub);
  select count(*) into n from storage.objects where bucket_id='item-photos' and name='not-a-uuid/rls-test.jpg';
  perform pg_temp.r('malformed folder denied without cast error','0',n::text);
  perform pg_temp.as_user(ub); select count(*) into n from public.items where id=test_item;
  perform pg_temp.r('guest cannot see draft','0',n::text);
  perform pg_temp.as_user(ub); select count(*) into n from public.items_to_swipe(l,100) where id=test_item;
  perform pg_temp.r('swipe hides draft','0',n::text);
  begin perform pg_temp.as_user(ub); insert into public.votes(item_id,list_id,choice) values(test_item,l,'yes'); msg:='allowed'; exception when others then msg:='denied'; end;
  perform pg_temp.r('guest cannot vote on draft','denied',msg);
  perform pg_temp.as_user(ub); update public.items set status='published',title='stolen' where id=test_item; get diagnostics n=row_count;
  perform pg_temp.r('guest cannot edit or publish draft','0',n::text);
  perform pg_temp.as_user(ua); update public.items set status='published' where id=test_item;
  perform pg_temp.as_user(ub); select count(*) into n from public.items where id=test_item and status='published' and published_at is not null;
  perform pg_temp.r('guest sees author publication','1',n::text);
  perform pg_temp.as_user(ub);
  select count(*) into n from storage.objects where bucket_id='item-photos' and name=l::text||'/test.jpg';
  perform pg_temp.r('guest selects published photo','1',n::text);
  perform pg_temp.as_user('00000000-0000-4000-a000-000000000099'::uuid);
  select count(*) into n from storage.objects where bucket_id='item-photos' and name=l::text||'/test.jpg';
  perform pg_temp.r('non-member cannot select published photo','0',n::text);
  perform pg_temp.as_user(ub); insert into public.votes(item_id,list_id,choice) values(test_item,l,'yes');
  perform pg_temp.as_user(uc); select count(*) into n from public.votes where votes.item_id=test_item;
  perform pg_temp.r('guest likes cannot read other guest votes','0',n::text);
  perform pg_temp.as_user(ub); update public.items set created_by=ub,list_id=l2 where id=test_item; get diagnostics n=row_count;
  perform pg_temp.r('guest cannot change item author or list','0',n::text);
  begin perform pg_temp.as_user(ua); update public.items set created_by=ub where id=test_item; msg:='allowed'; exception when others then msg:='denied'; end;
  perform pg_temp.r('owner cannot change immutable author','denied',msg);
  perform pg_temp.as_user(ub); delete from public.votes where votes.item_id=test_item; get diagnostics n=row_count;
  perform pg_temp.r('guest removes own like','1',n::text);
  perform pg_temp.as_user(ua); select count(*) into n from public.votes where votes.item_id=test_item;
  perform pg_temp.r('removed like no longer in recap','0',n::text);
  perform pg_temp.as_user(ub); update public.profiles set display_name='Other' where id=ua; get diagnostics n=row_count;
  perform pg_temp.r('profile update only own row','0',n::text);
  perform pg_temp.as_user(ub); update public.profiles set display_name='Bob',onboarded_at=now() where id=ub; get diagnostics n=row_count;
  perform pg_temp.r('profile update own row allowed','1',n::text);
  perform pg_temp.as_user(ub); delete from public.lists where id=l; get diagnostics n=row_count;
  perform pg_temp.r('guest cannot delete list','0',n::text);
  perform pg_temp.as_user(ub); insert into public.votes(item_id,list_id,choice) values(test_item,l,'yes');
  perform pg_temp.as_user(ua); delete from public.lists where id=l; get diagnostics n=row_count;
  perform pg_temp.r('owner deletes list','1',n::text);
  perform set_config('role','postgres',true);
  select count(*) into n from public.items where id=test_item;
  perform pg_temp.r('list cascades items','0',n::text);
  select count(*) into n from public.votes where list_id=l;
  perform pg_temp.r('list cascades votes','0',n::text);
  select count(*) into n from public.list_members where list_id=l;
  perform pg_temp.r('list cascades memberships','0',n::text);

  -- cleanup
  perform set_config('role','postgres',true);
  delete from storage.objects where bucket_id='item-photos' and name in (l::text||'/test.jpg','not-a-uuid/rls-test.jpg');
  delete from public.lists where owner_id in (ua,ub,uc,ud,ue,uf);
  delete from auth.users where id in (ua,ub,uc,ud,ue,uf);
end $$;
select n, test, expected, got, ok from pg_temp.rls_results order by n;
