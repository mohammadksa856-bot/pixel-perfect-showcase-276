REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_content_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_content_manager(uuid) TO authenticated;

DROP POLICY "sectors_public_read" ON public.sectors;
DROP POLICY "companies_public_read" ON public.companies;
DROP POLICY "research_public_read" ON public.research;
DROP POLICY "knowledge_public_read" ON public.knowledge_articles;
DROP POLICY "faqs_public_read" ON public.faqs;

CREATE POLICY "sectors_anon_read" ON public.sectors FOR SELECT TO anon USING (published);
CREATE POLICY "sectors_auth_read" ON public.sectors FOR SELECT TO authenticated USING (published OR public.is_content_manager(auth.uid()));
CREATE POLICY "companies_anon_read" ON public.companies FOR SELECT TO anon USING (published);
CREATE POLICY "companies_auth_read" ON public.companies FOR SELECT TO authenticated USING (published OR public.is_content_manager(auth.uid()));
CREATE POLICY "research_anon_read" ON public.research FOR SELECT TO anon USING (published);
CREATE POLICY "research_auth_read" ON public.research FOR SELECT TO authenticated USING (published OR public.is_content_manager(auth.uid()));
CREATE POLICY "knowledge_anon_read" ON public.knowledge_articles FOR SELECT TO anon USING (published);
CREATE POLICY "knowledge_auth_read" ON public.knowledge_articles FOR SELECT TO authenticated USING (published OR public.is_content_manager(auth.uid()));
CREATE POLICY "faqs_anon_read" ON public.faqs FOR SELECT TO anon USING (published);
CREATE POLICY "faqs_auth_read" ON public.faqs FOR SELECT TO authenticated USING (published OR public.is_content_manager(auth.uid()));