-- Таблица для хранения паспортных данных участника
CREATE TABLE public.contract_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  -- Паспортные данные
  passport_series VARCHAR(4),
  passport_number VARCHAR(6),
  passport_issued_by TEXT,
  passport_issued_date DATE,
  passport_department_code VARCHAR(7),
  -- Адрес регистрации
  registration_address TEXT,
  -- ИНН (опционально)
  inn VARCHAR(12),
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Таблица для хранения договоров и их статусов
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES public.streams(id),
  -- Данные Podpislon
  podpislon_document_id TEXT,
  -- Статусы: draft, sent, viewed, signed, cancelled
  status VARCHAR(20) DEFAULT 'draft' NOT NULL,
  -- Файлы
  pdf_url TEXT,
  signed_pdf_url TEXT,
  -- Даты
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX idx_contract_data_user_id ON public.contract_data(user_id);
CREATE INDEX idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX idx_contracts_stream_id ON public.contracts(stream_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);

-- Включаем RLS
ALTER TABLE public.contract_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS политики для contract_data

-- Участник может видеть и редактировать только свои данные
CREATE POLICY "Users can view own contract data"
  ON public.contract_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contract data"
  ON public.contract_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contract data"
  ON public.contract_data FOR UPDATE
  USING (auth.uid() = user_id);

-- Админы и тренеры могут видеть все данные
CREATE POLICY "Admins can view all contract data"
  ON public.contract_data FOR SELECT
  USING (public.is_admin(auth.uid()));

-- RLS политики для contracts

-- Участник может видеть только свои договоры
CREATE POLICY "Users can view own contracts"
  ON public.contracts FOR SELECT
  USING (auth.uid() = user_id);

-- Только система (service role) может создавать/обновлять договоры
CREATE POLICY "Service role can manage contracts"
  ON public.contracts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Админы могут видеть все договоры
CREATE POLICY "Admins can view all contracts"
  ON public.contracts FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Триггер для обновления updated_at
CREATE TRIGGER update_contract_data_updated_at
  BEFORE UPDATE ON public.contract_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();