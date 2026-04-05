
INSERT INTO public.admin_profiles (user_id, full_name, email, phone, city, state, is_super_admin)
VALUES (
  'be2855b8-b36c-4c65-a1fd-17a5c33bb413',
  'Admin Principal',
  (SELECT email FROM auth.users WHERE id = 'be2855b8-b36c-4c65-a1fd-17a5c33bb413'),
  '00000000000',
  'N/A',
  'N/A',
  true
);
