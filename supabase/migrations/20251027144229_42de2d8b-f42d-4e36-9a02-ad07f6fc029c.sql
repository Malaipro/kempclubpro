-- Обновление названий дисциплин тотемов
-- 1. Звезда - Пирамида КЭМП
UPDATE totems 
SET discipline = 'Пирамида КЭМП' 
WHERE name = 'Звезда' AND id = 'abae716c-690c-4e9d-b8ec-f2a9294c46a3';

-- 2. Маяк - Вклад в клуб
UPDATE totems 
SET discipline = 'Вклад в клуб' 
WHERE name = 'Маяк' AND id = '55496c8c-cd4b-4edc-8166-fdaacde56102';

-- 3. Медведь - Особые заслуги
UPDATE totems 
SET discipline = 'Особые заслуги' 
WHERE name = 'Медведь' AND id = '6c8a1840-7a98-4b53-9112-32728897dff7';

-- 4. Росток - Нутрициология
UPDATE totems 
SET discipline = 'Нутрициология' 
WHERE name = 'Росток' AND id = '5f3fa88f-c2c5-4a6f-941e-a5d3313cb3ea';