-- Создаем супер-админа напрямую (если пользователь не существует)
DO $$
DECLARE
    admin_user_id uuid;
    existing_user_count integer;
BEGIN
    -- Проверяем, существует ли уже пользователь с таким email
    SELECT COUNT(*) INTO existing_user_count
    FROM auth.users 
    WHERE email = 'kemp.club@yandex.com';
    
    IF existing_user_count = 0 THEN
        -- Генерируем UUID для нового пользователя
        admin_user_id := gen_random_uuid();
        
        -- Создаем запись в auth.users (только если есть права)
        -- ВАЖНО: Это может не работать, так как auth.users управляется Supabase
        RAISE NOTICE 'Пользователь kemp.club@yandex.com не найден. Необходимо создать его через интерфейс регистрации.';
    ELSE
        -- Если пользователь существует, получаем его ID и назначаем роль
        SELECT id INTO admin_user_id
        FROM auth.users 
        WHERE email = 'kemp.club@yandex.com'
        LIMIT 1;
        
        -- Удаляем существующие роли
        DELETE FROM public.user_roles WHERE user_id = admin_user_id;
        
        -- Назначаем роль super_admin
        INSERT INTO public.user_roles (user_id, role, assigned_by)
        VALUES (admin_user_id, 'super_admin', admin_user_id);
        
        RAISE NOTICE 'Роль super_admin назначена пользователю: %', admin_user_id;
    END IF;
END $$;