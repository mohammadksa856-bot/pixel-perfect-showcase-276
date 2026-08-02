-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'user');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_content_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'editor')
  );
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_write" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- shared helpers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- sectors
CREATE TABLE public.sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  tagline jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  description jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  icon text NOT NULL DEFAULT 'Sparkles',
  tone text NOT NULL DEFAULT 'emerald',
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  ticker text NOT NULL DEFAULT '',
  exchange text NOT NULL DEFAULT '',
  sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  name jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  country jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  price text NOT NULL DEFAULT '',
  change text NOT NULL DEFAULT '',
  market_cap text NOT NULL DEFAULT '',
  short jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  description jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  financials jsonb NOT NULL DEFAULT '[]'::jsonb,
  valuation jsonb NOT NULL DEFAULT '[]'::jsonb,
  news jsonb NOT NULL DEFAULT '[]'::jsonb,
  how_to_buy jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  author jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  author_role jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  reading_time integer NOT NULL DEFAULT 5,
  published_at date NOT NULL DEFAULT current_date,
  image text NOT NULL DEFAULT '',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  category jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  icon text NOT NULL DEFAULT 'BookOpen',
  level jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  reading_time integer NOT NULL DEFAULT 5,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  videos jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  question jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  answer jsonb NOT NULL DEFAULT '{"ar":"","en":""}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sectors, public.companies, public.research, public.knowledge_articles, public.faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sectors, public.companies, public.research, public.knowledge_articles, public.faqs TO authenticated;
GRANT ALL ON public.sectors, public.companies, public.research, public.knowledge_articles, public.faqs TO service_role;

ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sectors_public_read" ON public.sectors FOR SELECT TO anon, authenticated USING (published OR public.is_content_manager(auth.uid()));
CREATE POLICY "sectors_manage" ON public.sectors FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

CREATE POLICY "companies_public_read" ON public.companies FOR SELECT TO anon, authenticated USING (published OR public.is_content_manager(auth.uid()));
CREATE POLICY "companies_manage" ON public.companies FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

CREATE POLICY "research_public_read" ON public.research FOR SELECT TO anon, authenticated USING (published OR public.is_content_manager(auth.uid()));
CREATE POLICY "research_manage" ON public.research FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

CREATE POLICY "knowledge_public_read" ON public.knowledge_articles FOR SELECT TO anon, authenticated USING (published OR public.is_content_manager(auth.uid()));
CREATE POLICY "knowledge_manage" ON public.knowledge_articles FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

CREATE POLICY "faqs_public_read" ON public.faqs FOR SELECT TO anon, authenticated USING (published OR public.is_content_manager(auth.uid()));
CREATE POLICY "faqs_manage" ON public.faqs FOR ALL TO authenticated USING (public.is_content_manager(auth.uid())) WITH CHECK (public.is_content_manager(auth.uid()));

CREATE TRIGGER sectors_updated_at BEFORE UPDATE ON public.sectors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER research_updated_at BEFORE UPDATE ON public.research FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER knowledge_updated_at BEFORE UPDATE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER faqs_updated_at BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
