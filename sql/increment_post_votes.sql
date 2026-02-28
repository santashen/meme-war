create or replace function public.increment_post_votes(p_post_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  update public.posts
  set votes = votes + 1
  where id = p_post_id;
end;
$$;

grant execute on function public.increment_post_votes(uuid) to authenticated;
