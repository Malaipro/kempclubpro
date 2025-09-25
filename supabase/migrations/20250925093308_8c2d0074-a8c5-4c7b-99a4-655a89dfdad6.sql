-- Создаем супер-админа с email kemp.club@yandex.com
-- Сначала проверим, есть ли уже такой пользователь в user_roles
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Найдем пользователя по email в auth.users
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'kemp.club@yandex.com' 
    LIMIT 1;
    
    -- Если пользователь найден, добавим ему роль super_admin
    IF target_user_id IS NOT NULL THEN
        -- Удалим существующие роли пользователя
        DELETE FROM public.user_roles WHERE user_id = target_user_id;
        
        -- Добавим роль super_admin
        INSERT INTO public.user_roles (user_id, role, assigned_by)
        VALUES (target_user_id, 'super_admin', target_user_id)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Super admin role assigned to existing user %', target_user_id;
    ELSE
        RAISE NOTICE 'User with email kemp.club@yandex.com not found. Please create the user first through the authentication system.';
    END IF;
END $$;